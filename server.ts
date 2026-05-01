import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { GoogleGenAI } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route for Gemini
  app.post("/api/parse-cmsp", async (req, res) => {
    try {
      const { text } = req.body;
      if (!text) {
        return res.status(400).json({ error: "Texto é obrigatório" });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "Configuração do servidor incompleta (API Key ausente)" });
      }

      const ai = new GoogleGenAI({ apiKey });
      const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });

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

        Retorne APENAS um objeto JSON válido (sem markdown), com esta estrutura:
        {
          "componenteCurricular": "string",
          "anoTurma": "série identificada (ex: 9º Ano EF)",
          "unidadeRegional": "string",
          "escola": "string",
          "objetivo": "string",
          "aes": [
            {
              "aprendizagem": "descrição da habilidade",
              "inicio": "YYYY-MM-DD",
              "termino": "YYYY-MM-DD",
              "conteudos": "G1: ...\\nG2: ...\\nG3: ...\\nAulas: ..."
            }
          ],
          "materialDidatico": "lista de materiais",
          "bimestre": "1º Bimestre | 2º Bimestre | 3º Bimestre | 4º Bimestre"
        }

        Importante: Mantenha a ordem cronológica das aulas.
      `;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      
      // Clean potential markdown or extra text to get only JSON
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : responseText;
      
      res.json(JSON.parse(jsonStr));
    } catch (error) {
      console.error("Erro no processamento da IA:", error);
      res.status(500).json({ error: "Falha ao processar conteúdo com IA" });
    }
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
