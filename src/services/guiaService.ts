/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface GuiaData {
  professor: string;
  componenteCurricular: string;
  anoTurma: string;
  bimestre: string;
  objetivo: string;
  aes: Array<{
    aprendizagem: string;
    inicio: string;
    termino: string;
    conteudos: string;
  }>;
  materialDidatico: string;
  criteriosAvaliacao: string;
  recuperacao: string;
  unidadeRegional: string;
  escola: string;
  endereco: string;
}

export const INITIAL_DATA: GuiaData = {
  professor: "",
  componenteCurricular: "",
  anoTurma: "",
  bimestre: "1º Bimestre",
  objetivo: "",
  aes: [{ aprendizagem: "", inicio: "", termino: "", conteudos: "" }],
  materialDidatico: "",
  criteriosAvaliacao: "Prova Paulista – 30% (Avaliação externa objetiva.) 5.0\nAtividade Avaliativa – 30% (Avaliação escrita alinhada às Avaliações Externas) 3.0\nTrabalho Avaliativo – 30% (Trabalhos do dia-a-dia E Tarefas) 1.0\nEngajamento Global – 10%(1.0)",
  recuperacao: "Atividades de reforço e retomada de conteúdos não consolidados durante as aulas regulares, através de material digital e exercícios específicos.",
  unidadeRegional: "UNIDADE REGIONAL DE ENSINO DE LINS",
  escola: "EE_PROFESSOR ORLANDO DONDA",
  endereco: "(AV. RIO GRANDE 1294)",
};

export async function parseCMSPContent(text: string): Promise<Partial<GuiaData>> {
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
          "conteudos": "G1: ...\nG2: ...\nG3: ...\nAulas: ..."
        }
      ],
      "materialDidatico": "lista de materiais",
      "bimestre": "1º Bimestre | 2º Bimestre | 3º Bimestre | 4º Bimestre"
    }

    Importante: Mantenha a ordem cronológica das aulas.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });
    
    const responseText = response.text;
    if (!responseText) throw new Error("Sem resposta do modelo");
    
    // Clean potential markdown or extra text to get only JSON
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[0] : responseText;
    
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error("Erro ao analisar conteúdo:", error);
    throw error;
  }
}
