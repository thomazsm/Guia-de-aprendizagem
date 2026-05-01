import { Handler } from "@netlify/functions";
import { GoogleGenAI } from "@google/genai";

const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { text } = JSON.parse(event.body || "{}");
    if (!text) {
      return { statusCode: 400, body: JSON.stringify({ error: "Texto é obrigatório" }) };
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return { statusCode: 500, body: JSON.stringify({ error: "API Key ausente no servidor" }) };
    }

    const ai = new GoogleGenAI(apiKey);
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
    
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[0] : responseText;

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: jsonStr,
    };
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Falha no processamento" }),
    };
  }
};

export { handler };
