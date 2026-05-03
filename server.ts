import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { VertexAI, HarmCategory, HarmBlockThreshold } from "@google-cloud/vertexai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route for Vertex AI
  app.post("/api/parse-cmsp", async (req, res) => {
    try {
      const { text } = req.body;
      if (!text) {
        return res.status(400).json({ error: "Texto é obrigatório" });
      }

      const projectId = process.env.VERTEX_AI_PROJECT_ID || "gen-lang-client-0087218759";
      const location = process.env.VERTEX_AI_LOCATION || "us-central1";

      // Initialize Vertex AI
      // Note: In this environment, we rely on the environment's credentials or provide them if needed.
      // The user specifically mentioned an "API Key", which for Vertex AI is often used via the REST interface
      // or specific auth providers. Here we use the project-based initialization.
      const vertexAI = new VertexAI({ project: projectId, location: location });

      const model = vertexAI.getGenerativeModel({
        model: "gemini-1.5-flash",
        generationConfig: {
          responseMimeType: "application/json",
        },
        safetySettings: [{
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        }],
      });

      const prompt = `
        Você é um assistente especializado em Educação da Secretaria da Educação de SP (SEDUC).
        O professor forneceu um documento de "Escopo e Sequência" ou "Guia Priorizado" do bimestre.
        Sua tarefa é extrair estruturadamente as informações para preencher o Guia de Aprendizagem oficial do Programa Ensino Integral (PEI).

        Documento do Professor:
        """
        ${text}
        """

        ORIENTAÇÕES DE EXTRAÇÃO (CRÍTICO):
        1. Identifique o Componente Curricular e a Série (pode ser do 6º ano EF até a 3ª série EM).
        2. ESTRUTURA DE GRUPOS: O material digital do CMSP organiza o conteúdo em "Grupo 1", "Grupo 2" e "Grupo 3". Você DEVE extrair esses grupos separadamente para cada habilidade.
        3. NO CAMPO 'CONTEUDOS': Formate a resposta exatamente assim para cada item:
           G1: [detalhes do grupo 1]
           G2: [detalhes do grupo 2]
           G3: [detalhes do grupo 3]
           Aulas: [números das aulas]
        4. Para cada conjunto de grupos, identifique a Aprendizagem Essencial (Habilidade-foco) correspondente.
        5. Resuma um Objetivo Geral para o bimestre.
        6. Estime datas (YYYY-MM-DD) seguindo o calendário SP 2026: 
           1ºB: 02/02-20/04 | 2ºB: 22/04-26/06 | 3ºB: 13/07-18/09 | 4ºB: 21/09-23/12.
        7. Verifique se Unidade Regional e Escola estão no texto.

        Retorne APENAS um objeto JSON válido seguindo esta estrutura:
        {
          "componenteCurricular": "string",
          "anoTurma": "string",
          "unidadeRegional": "string",
          "escola": "string",
          "objetivo": "string",
          "aes": [
            {
              "aprendizagem": "string",
              "inicio": "YYYY-MM-DD",
              "termino": "YYYY-MM-DD",
              "conteudos": "string"
            }
          ],
          "materialDidatico": "string",
          "bimestre": "string"
        }
      `;

      const result = await model.generateContent(prompt);
      const response = result.response;
      const responseText = response.candidates?.[0]?.content.parts[0].text;

      if (!responseText) {
        throw new Error("Resposta da IA vazia");
      }

      res.json(JSON.parse(responseText.trim()));
    } catch (error: any) {
      console.error("Erro no processamento da Vertex AI:", error);
      res.status(500).json({ error: error.message || "Falha ao processar conteúdo com Vertex AI" });
    }
  });

  // Health check route
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
