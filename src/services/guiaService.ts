/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

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
  try {
      // 1. Tenta o caminho das funções do Netlify primeiro (Serverless)
      // 2. Se falhar, tenta o caminho padrão (Desenvolvimento local)
      const tryPaths = [
        "/.netlify/functions/parse-cmsp",
        "/api/parse-cmsp"
      ];

      let lastError = "";
      for (const apiPath of tryPaths) {
        try {
          console.log(`Tentando API: ${apiPath}`);
          const response = await fetch(apiPath, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text }),
          });

          if (response.ok) {
            const data = await response.json();
            return data;
          }
          
          const errorText = await response.text();
          lastError = `Status ${response.status}: ${errorText}`;
          console.warn(`Falha na rota ${apiPath}:`, lastError);
        } catch (e) {
          lastError = e instanceof Error ? e.message : String(e);
          console.warn(`Erro ao conectar com ${apiPath}:`, lastError);
        }
      }

      throw new Error(`Não foi possível processar o documento. ${lastError}`);
  } catch (error) {
    console.error("Erro ao analisar conteúdo:", error);
    throw error;
  }
}
