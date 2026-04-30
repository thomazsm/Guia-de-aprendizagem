/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { saveAs } from 'file-saver';
import * as xlsx from 'xlsx';
import { 
  Document, 
  Packer, 
  Paragraph, 
  TextRun, 
  Table, 
  TableRow, 
  TableCell, 
  WidthType, 
  BorderStyle,
  AlignmentType,
  HeadingLevel
} from 'docx';
import { GuiaData } from '../services/guiaService';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';

async function imageToBase64(url: string): Promise<string> {
  if (!url || !url.startsWith('http')) return url;
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    // Only log if it's not a common fetch/abort error to reduce noise
    if (!(error instanceof Error && (error.name === 'AbortError' || error.message === 'Failed to fetch'))) {
      console.warn('Silent fallback for image:', url, error);
    }
    // Return a transparent 1x1 pixel instead of the original URL to prevent html-to-image from failing entirely due to CORS
    return 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
  }
}

export async function exportToPdf(elementId: string, filename: string) {
  const element = document.getElementById(elementId);
  if (!element) return;

  try {
    // Show the hidden print element temporarily for capture
    element.classList.remove('hidden');
    
    // Pre-process images to base64 if possible
    const images = element.getElementsByTagName('img');
    const imagePromises = Array.from(images).map(async (img) => {
      if (img.src && img.src.startsWith('http')) {
        const base64 = await imageToBase64(img.src);
        img.src = base64;
      }
    });
    await Promise.all(imagePromises);

    // Use toPng with options to handle cross-origin images and avoid oklch issues
    const dataUrl = await toPng(element, {
      backgroundColor: '#ffffff',
      pixelRatio: 2,
      cacheBust: false, // Don't cache bust base64
      skipFonts: true,
      imagePlaceholder: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
      style: {
        colorScheme: 'light'
      }
    });
    
    element.classList.add('hidden');

    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgProps = pdf.getImageProperties(dataUrl);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;
    
    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(dataUrl, 'PNG', 0, position, pdfWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(dataUrl, 'PNG', 0, position, pdfWidth, imgHeight);
      heightLeft -= pageHeight;
    }
    
    pdf.save(filename);
  } catch (error: any) {
    console.error('Erro ao exportar PDF:', error);
    element.classList.add('hidden');
    throw error;
  }
}

export async function exportToExcel(data: GuiaData) {
  const wb = xlsx.utils.book_new();
  
  // Sheet 1: General Info
  const generalData = [
    ["GUIA DE APRENDIZAGEM - PEI"],
    [""],
    ["Professor", data.professor],
    ["Componente Curricular", data.componenteCurricular],
    ["Ano/Turma", data.anoTurma],
    ["Bimestre", data.bimestre],
    [""],
    ["Objetivo do Bimestre"],
    [data.objetivo],
    [""],
    ["Materiais Didáticos"],
    [data.materialDidatico],
    [""],
    ["Critérios de Avaliação"],
    [data.criteriosAvaliacao],
    [""],
    ["Recuperação e Recomposição"],
    [data.recuperacao],
  ];
  const wsGeneral = xlsx.utils.aoa_to_sheet(generalData);
  xlsx.utils.book_append_sheet(wb, wsGeneral, "Informações Gerais");

  // Sheet 2: AES (Aulas)
  const aesHeader = ["AES - Aprendizagens Essenciais", "Início", "Término", "Sequência de Aulas / Conteúdo"];
  const aesRows = data.aes.map(item => [
    item.aprendizagem, 
    item.inicio, 
    item.termino, 
    item.conteudos
  ]);
  const wsAes = xlsx.utils.aoa_to_sheet([aesHeader, ...aesRows]);
  xlsx.utils.book_append_sheet(wb, wsAes, "Cronograma Aulas");

  const wbout = xlsx.write(wb, { bookType: 'xlsx', type: 'array' });
  saveAs(new Blob([wbout], { type: "application/octet-stream" }), `Guia_${data.componenteCurricular}_${data.anoTurma}.xlsx`);
}

export async function exportToWord(data: GuiaData) {
  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: "Arial",
            size: 22,
          }
        }
      }
    },
    sections: [{
      properties: {
        page: {
          margin: {
            top: 720, // 1.27cm
            right: 720,
            bottom: 720,
            left: 720,
          }
        }
      },
      children: [
        // Top Header
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  width: { size: 70, type: WidthType.PERCENTAGE },
                  children: [
                    new Paragraph({
                      children: [new TextRun({ text: data.unidadeRegional, bold: true, size: 22 })],
                      alignment: AlignmentType.CENTER,
                    }),
                    new Paragraph({
                      children: [new TextRun({ text: data.escola, bold: true, size: 22 })],
                      alignment: AlignmentType.CENTER,
                    }),
                    new Paragraph({
                      children: [new TextRun({ text: data.endereco, size: 18 })],
                      alignment: AlignmentType.CENTER,
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),

        new Paragraph({
          children: [new TextRun({ text: "Guia de Aprendizagem", bold: true, size: 28 })],
          alignment: AlignmentType.CENTER,
          spacing: { before: 200, after: 200 },
        }),

        // Info Table
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "PROFESSOR", bold: true, size: 22 })] })], shading: { fill: "E0F2F1" } }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "COMPONENTE CURRICULAR", bold: true, size: 22 })] })], shading: { fill: "E0F2F1" } }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "ANO/TURMA", bold: true, size: 22 })] })], shading: { fill: "E0F2F1" } }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "BIMESTRE", bold: true, size: 22 })] })], shading: { fill: "E0F2F1" } }),
              ],
            }),
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph(data.professor)] }),
                new TableCell({ children: [new Paragraph(data.componenteCurricular)] }),
                new TableCell({ children: [new Paragraph(data.anoTurma)] }),
                new TableCell({ children: [new Paragraph(data.bimestre)] }),
              ],
            }),
          ],
        }),

        new Paragraph({ spacing: { before: 100, after: 100 } }),

        // Objective
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "OBJETIVO", bold: true, size: 22 })] })], shading: { fill: "E0F2F1" } }),
              ],
            }),
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph(data.objetivo)] }),
              ],
            }),
          ],
        }),

        new Paragraph({ spacing: { before: 100, after: 100 } }),

        // AES Table
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "AES - APRENDIZAGENS ESSENCIAIS", bold: true, size: 22 })] })], shading: { fill: "E0F2F1" } }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "INÍCIO", bold: true, size: 22 })] })], shading: { fill: "E0F2F1" } }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "TÉRMINO", bold: true, size: 22 })] })], shading: { fill: "E0F2F1" } }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "CONTEÚDOS / CAMINHO FORMATIVO", bold: true, size: 22 })] })], shading: { fill: "E0F2F1" } }),
              ],
            }),
            ...data.aes.map(item => new TableRow({
              children: [
                new TableCell({ children: [new Paragraph(item.aprendizagem)] }),
                new TableCell({ children: [new Paragraph(item.inicio ? new Date(item.inicio + 'T00:00:00').toLocaleDateString('pt-BR') : "-")] }),
                new TableCell({ children: [new Paragraph(item.termino ? new Date(item.termino + 'T00:00:00').toLocaleDateString('pt-BR') : "-")] }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: item.conteudos, bold: true, size: 22 })] })] }),
              ],
            })),
          ],
        }),

        new Paragraph({ spacing: { before: 100, after: 100 } }),

        // Material Didatico
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "MATERIAL DIDÁTICO", bold: true, size: 22 })] })], shading: { fill: "E0F2F1" } }),
              ],
            }),
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph(data.materialDidatico)] }),
              ],
            }),
          ],
        }),

        new Paragraph({ spacing: { before: 100, after: 100 } }),

        // Criteria and Recuperation
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "CRITÉRIOS DE AVALIAÇÃO", bold: true, size: 22 })] })], shading: { fill: "E0F2F1" } }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "RECUPERAÇÃO E RECOMPOSIÇÃO", bold: true, size: 22 })] })], shading: { fill: "E0F2F1" } }),
              ],
            }),
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph(data.criteriosAvaliacao)] }),
                new TableCell({ children: [new Paragraph(data.recuperacao)] }),
              ],
            }),
          ],
        }),

        new Paragraph({ spacing: { before: 100, after: 100 } }),

        // Signatures
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "ASSINATURA DO PROFESSOR", bold: true, size: 22 })] })], shading: { fill: "E0F2F1" } }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "VISTO DO(A) CGPG", bold: true, size: 22 })] })], shading: { fill: "E0F2F1" } }),
              ],
            }),
            new TableRow({
              height: { value: 600, rule: "exact" },
              children: [
                new TableCell({ children: [new Paragraph("")] }),
                new TableCell({ children: [new Paragraph("")] }),
              ],
            }),
          ],
        }),

      ],
    }],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `Guia_${data.componenteCurricular}_${data.anoTurma}.docx`);
}
