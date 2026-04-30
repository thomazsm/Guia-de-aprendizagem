/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Plus, 
  Trash2, 
  Printer, 
  FileText, 
  Sparkles, 
  Loader2, 
  ChevronDown, 
  ChevronUp,
  Save,
  Info,
  RefreshCw,
  Upload,
  CalendarDays,
  Download,
  Moon,
  Sun,
  FileSpreadsheet as TableIcon
} from "lucide-react";
import { GuiaData, INITIAL_DATA, parseCMSPContent } from "./services/guiaService";
import { extractTextFromPdf } from "./lib/pdfUtils";
import { CALENDARIO_2026, BimestreKey } from "./constants";
import { exportToExcel, exportToWord, exportToPdf } from "./lib/exportUtils";

export default function App() {
  const [data, setData] = useState<GuiaData>(() => {
    const saved = localStorage.getItem("guia-data");
    return saved ? JSON.parse(saved) : INITIAL_DATA;
  });
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [cmspText, setCmspText] = useState("");
  const [showAiModal, setShowAiModal] = useState(false);
  const [showConfirmReset, setShowConfirmReset] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "error" | "success" | "info" } | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [isPdfProcessing, setIsPdfProcessing] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem("guia-theme");
    return saved === "dark" || (!saved && window.matchMedia("(prefers-color-scheme: dark)").matches);
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem("guia-data", JSON.stringify(data));
  }, [data]);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("guia-theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("guia-theme", "light");
    }
  }, [isDarkMode]);

  const resetForm = () => {
    setShowConfirmReset(true);
  };

  const confirmReset = () => {
    setData(INITIAL_DATA);
    setShowConfirmReset(false);
    showToast("Formulário limpo com sucesso!", "info");
  };

  const showToast = (message: string, type: "error" | "success" | "info" = "info") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  const updateField = (field: keyof GuiaData, value: any) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  const updateAesField = (index: number, field: keyof GuiaData["aes"][0], value: string) => {
    const newAes = [...data.aes];
    newAes[index] = { ...newAes[index], [field]: value };
    updateField("aes", newAes);
  };

  const addAesRow = () => {
    updateField("aes", [...data.aes, { aprendizagem: "", inicio: "", termino: "", conteudos: "" }]);
  };

  const removeAesRow = (index: number) => {
    if (data.aes.length > 1) {
      const newAes = data.aes.filter((_, i) => i !== index);
      updateField("aes", newAes);
    }
  };

  const handleAiSmartFill = async () => {
    if (!cmspText.trim()) return;
    setIsAiLoading(true);
    try {
      const parsed = await parseCMSPContent(cmspText);
      if (parsed && typeof parsed === 'object') {
        setData((prev) => ({
          ...prev,
          ...parsed,
          aes: parsed.aes && Array.isArray(parsed.aes) && parsed.aes.length > 0 ? [...parsed.aes] : prev.aes,
        }));
        setShowAiModal(false);
        setCmspText("");
      } else {
        throw new Error("Resposta inválida da IA");
      }
    } catch (error) {
      showToast("Houve um erro ao processar o conteúdo. Verifique sua chave de API ou tente colar o texto novamente.", "error");
    } finally {
      setIsAiLoading(false);
    }
  };

  const handlePdfUpload = async (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      showToast("Por favor, selecione um arquivo PDF.", "error");
      return;
    }

    setIsPdfProcessing(true);
    try {
      const text = await extractTextFromPdf(file);
      setCmspText(text);
    } catch (error) {
      console.error("Erro ao ler PDF:", error);
      showToast("Não foi possível ler o arquivo PDF. Tente copiar e colar o texto manualmente.", "error");
    } finally {
      setIsPdfProcessing(false);
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handlePrint = () => {
    // Focus the window to ensure print works in all environments
    window.focus();
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const handleExportWord = async () => {
    try {
      await exportToWord(data);
    } catch (error) {
      console.error("Erro ao exportar Word:", error);
      showToast("Falha ao exportar para Word.", "error");
    }
  };

  const handleExportExcel = async () => {
    try {
      await exportToExcel(data);
    } catch (error) {
      console.error("Erro ao exportar Excel:", error);
      showToast("Falha ao exportar para Excel.", "error");
    }
  };

  const handleExportPdf = async () => {
    try {
      await exportToPdf('print-document', `Guia_${data.componenteCurricular}_${data.anoTurma}.pdf`);
    } catch (error) {
      console.error("Erro ao exportar PDF:", error);
      showToast("Falha ao exportar para PDF. Verifique se há bloqueios no navegador.", "error");
    }
  };

  return (
    <div className="min-h-screen bg-natural-bg dark:bg-stone-950 font-sans text-stone-900 dark:text-stone-100 pb-20 transition-colors duration-300">
      {/* Header / Nav */}
      <header className="sticky top-0 z-10 bg-white/40 dark:bg-stone-900/40 backdrop-blur-md border-b border-stone-200 dark:border-stone-800 px-6 py-4 flex items-center justify-between no-print">
        <div className="flex items-center gap-3">
          <div className="bg-natural-primary p-2 text-white rounded-xl shadow-lg shadow-natural-primary/20">
            <FileText size={24} />
          </div>
          <div>
            <h1 className="text-xl font-serif italic font-bold tracking-tight text-natural-primary leading-none">Monte seu Guia</h1>
            <p className="text-[10px] text-stone-400 dark:text-stone-500 font-bold uppercase tracking-[0.2em] mt-1">Horizonte Pedagógico</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-2 text-stone-400 hover:text-natural-primary hover:bg-natural-primary/10 rounded-full transition-all no-print"
            title={isDarkMode ? "Ativar Modo Claro" : "Ativar Modo Escuro"}
          >
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <button
            onClick={resetForm}
            className="p-2 text-stone-300 dark:text-stone-600 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-full transition-all no-print"
            title="Limpar formulário"
          >
            <RefreshCw size={20} />
          </button>
          <button
            onClick={() => setShowAiModal(true)}
            className="flex items-center gap-2 bg-white/50 dark:bg-stone-800/50 text-natural-primary hover:bg-white dark:hover:bg-stone-800 px-4 py-2 rounded-full text-sm font-semibold transition-all border border-natural-primary/30 shadow-sm"
          >
            <Sparkles size={16} />
            Importar do CMSP
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 bg-natural-primary text-white hover:opacity-90 px-6 py-2 rounded-full text-sm font-semibold transition-all shadow-xl shadow-natural-primary/20"
          >
            <Printer size={16} />
            Imprimir Guia
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 mt-8 space-y-8 no-print">
        {/* Basic Info Section */}
        <section className="bg-white/80 dark:bg-stone-900/80 rounded-[32px] p-8 border border-stone-200 dark:border-stone-800 shadow-sm space-y-6 transition-colors">
          <div className="flex items-center gap-2 mb-2 text-stone-300 dark:text-stone-700">
            <Info size={16} />
            <h2 className="text-[10px] font-bold uppercase tracking-[0.2em]">Identificação Principal</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="space-y-2 lg:col-span-2">
              <label className="text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase ml-1">Professor(a)</label>
              <input
                type="text"
                value={data.professor}
                onChange={(e) => updateField("professor", e.target.value)}
                placeholder="Nome do Professor"
                className="w-full bg-stone-50 dark:bg-stone-800/50 border border-stone-100 dark:border-stone-800 rounded-2xl px-4 py-3 focus:ring-2 focus:ring-natural-primary/10 focus:border-natural-primary/50 outline-none transition-all dark:text-stone-200"
              />
            </div>
            <div className="space-y-2 lg:col-span-2">
              <label className="text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase ml-1">Componente Curricular</label>
              <input
                type="text"
                value={data.componenteCurricular}
                onChange={(e) => updateField("componenteCurricular", e.target.value)}
                placeholder="Digite a disciplina..."
                className="w-full bg-stone-50 dark:bg-stone-800/50 border border-stone-100 dark:border-stone-800 rounded-2xl px-4 py-3 focus:ring-2 focus:ring-natural-primary/10 focus:border-natural-primary/50 outline-none transition-all dark:text-stone-200"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase ml-1">Série / Turma</label>
              <select
                value={data.anoTurma}
                onChange={(e) => updateField("anoTurma", e.target.value)}
                className="w-full bg-stone-50 dark:bg-stone-800/50 border border-stone-100 dark:border-stone-800 rounded-2xl px-4 py-3 focus:ring-2 focus:ring-natural-primary/10 focus:border-natural-primary/50 outline-none transition-all appearance-none cursor-pointer dark:text-stone-200"
              >
                <option value="" className="dark:bg-stone-900">Selecione a série...</option>
                <optgroup label="Ensino Fundamental" className="dark:bg-stone-900">
                  <option>6º Ano EF</option>
                  <option>7º Ano EF</option>
                  <option>8º Ano EF</option>
                  <option>9º Ano EF</option>
                </optgroup>
                <optgroup label="Ensino Médio" className="dark:bg-stone-900">
                  <option>1ª Série EM</option>
                  <option>2ª Série EM</option>
                  <option>3ª Série EM</option>
                </optgroup>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase ml-1">Bimestre</label>
              <select
                value={data.bimestre}
                onChange={(e) => updateField("bimestre", e.target.value)}
                className="w-full bg-stone-50 dark:bg-stone-800/50 border border-stone-100 dark:border-stone-800 rounded-2xl px-4 py-3 focus:ring-2 focus:ring-natural-primary/10 focus:border-natural-primary/50 outline-none transition-all appearance-none cursor-pointer dark:text-stone-200"
              >
                <option className="dark:bg-stone-900">1º Bimestre</option>
                <option className="dark:bg-stone-900">2º Bimestre</option>
                <option className="dark:bg-stone-900">3º Bimestre</option>
                <option className="dark:bg-stone-900">4º Bimestre</option>
              </select>
              <div className="flex items-center gap-1.5 mt-1 px-1">
                <CalendarDays size={10} className="text-natural-primary" />
                <span className="text-[10px] font-bold text-natural-primary">
                  {new Date(CALENDARIO_2026[data.bimestre as BimestreKey].inicio + 'T00:00:00').toLocaleDateString('pt-BR')} a {new Date(CALENDARIO_2026[data.bimestre as BimestreKey].termino + 'T00:00:00').toLocaleDateString('pt-BR')}
                </span>
              </div>
            </div>
            <div className="space-y-2 lg:col-span-2">
              <label className="text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase ml-1">Unidade Escolar</label>
              <input
                type="text"
                value={data.escola}
                onChange={(e) => updateField("escola", e.target.value)}
                className="w-full bg-stone-50 dark:bg-stone-800/50 border border-stone-100 dark:border-stone-800 rounded-2xl px-4 py-3 focus:ring-2 focus:ring-natural-primary/10 focus:border-natural-primary/50 outline-none transition-all text-sm dark:text-stone-200"
              />
            </div>
          </div>
        </section>

        {/* Objective */}
        <section className="bg-white/80 dark:bg-stone-900/80 rounded-[32px] p-8 border border-stone-200 dark:border-stone-800 shadow-sm space-y-4 transition-colors">
          <label className="text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase flex items-center gap-2">
            Objetivo do Bimestre
          </label>
          <textarea
            value={data.objetivo}
            onChange={(e) => updateField("objetivo", e.target.value)}
            rows={3}
            placeholder="Descreva o propósito pedagógico central..."
            className="w-full bg-stone-50 dark:bg-stone-800/50 border border-stone-100 dark:border-stone-800 rounded-2xl px-4 py-3 focus:ring-2 focus:ring-natural-primary/10 focus:border-natural-primary/50 outline-none transition-all resize-none text-stone-700 dark:text-stone-200 font-serif italic text-lg"
          />
        </section>

        {/* AES Items */}
        <section className="bg-white/80 dark:bg-stone-900/80 rounded-[32px] p-8 border border-stone-200 dark:border-stone-800 shadow-sm space-y-6 transition-colors">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase">Eixo de Aprendizagem</label>
            <button
              onClick={addAesRow}
              className="flex items-center gap-1 text-[10px] font-bold text-natural-primary bg-natural-primary/10 px-4 py-2 rounded-full hover:bg-natural-primary hover:text-white transition-all shadow-sm"
            >
              <Plus size={14} /> Adicionar Dimensão
            </button>
          </div>

          <div className="space-y-6">
            {data.aes.map((item, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-8 bg-stone-50 dark:bg-stone-800/30 rounded-[28px] border border-stone-200 dark:border-stone-800 relative group transition-colors hover:border-natural-primary/30"
              >
                <button
                  onClick={() => removeAesRow(idx)}
                  className="absolute top-6 right-6 text-stone-300 dark:text-stone-600 hover:text-rose-500 transition-colors"
                >
                  <Trash2 size={18} />
                </button>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-stone-400 dark:text-stone-500 uppercase tracking-widest flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-natural-primary/40" />
                      Aprendizagens Essenciais
                    </label>
                    <textarea
                      value={item.aprendizagem}
                      onChange={(e) => updateAesField(idx, "aprendizagem", e.target.value)}
                      placeholder="Habilidades e competências finais..."
                      rows={3}
                      className="w-full bg-white dark:bg-stone-800 border border-stone-100 dark:border-stone-700 rounded-2xl px-4 py-3 text-sm outline-none focus:border-natural-primary transition-all resize-none shadow-sm dark:text-stone-200"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-stone-400 dark:text-stone-500 uppercase tracking-widest flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-natural-primary/40" />
                      Sequência de Aulas / Conteúdo
                    </label>
                    <textarea
                      value={item.conteudos}
                      onChange={(e) => updateAesField(idx, "conteudos", e.target.value)}
                      placeholder="Ex: Aulas 01 a 03 - Título do Tema"
                      rows={3}
                      className="w-full bg-white dark:bg-stone-800 border border-stone-100 dark:border-stone-700 rounded-2xl px-4 py-3 text-sm outline-none focus:border-natural-primary transition-all resize-none shadow-sm font-medium dark:text-stone-200"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4 col-span-1 md:col-span-2 max-w-sm">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-stone-400 dark:text-stone-500 uppercase">Período Início</label>
                      <input
                        type="date"
                        value={item.inicio}
                        min={CALENDARIO_2026[data.bimestre as BimestreKey].inicio}
                        max={CALENDARIO_2026[data.bimestre as BimestreKey].termino}
                        onChange={(e) => updateAesField(idx, "inicio", e.target.value)}
                        className="w-full bg-white dark:bg-stone-800 border border-stone-100 dark:border-stone-700 rounded-xl px-4 py-2 text-sm outline-none focus:border-natural-primary transition-all shadow-sm dark:text-stone-200 dark:[color-scheme:dark]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-stone-400 dark:text-stone-500 uppercase">Período Término</label>
                      <input
                        type="date"
                        value={item.termino}
                        min={CALENDARIO_2026[data.bimestre as BimestreKey].inicio}
                        max={CALENDARIO_2026[data.bimestre as BimestreKey].termino}
                        onChange={(e) => updateAesField(idx, "termino", e.target.value)}
                        className="w-full bg-white dark:bg-stone-800 border border-stone-100 dark:border-stone-700 rounded-xl px-4 py-2 text-sm outline-none focus:border-natural-primary transition-all shadow-sm dark:text-stone-200 dark:[color-scheme:dark]"
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Footer Sections */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <section className="bg-white/80 dark:bg-stone-900/80 rounded-[32px] p-8 border border-stone-200 dark:border-stone-800 shadow-sm space-y-4 transition-colors">
            <label className="text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase">Recursos e Materiais</label>
            <textarea
              value={data.materialDidatico}
              onChange={(e) => updateField("materialDidatico", e.target.value)}
              rows={4}
              placeholder="Livros, simuladores, laboratórios..."
              className="w-full bg-stone-50 dark:bg-stone-800/50 border border-stone-100 dark:border-stone-800 rounded-2xl px-4 py-3 outline-none focus:border-natural-primary transition-all resize-none text-sm text-stone-600 dark:text-stone-300"
            />
          </section>
          <section className="bg-[#5A5A40] dark:bg-[#404030] rounded-[32px] p-8 shadow-xl space-y-4 transition-colors">
            <label className="text-[10px] font-bold text-white/60 dark:text-white/40 uppercase">Recomposição de Aprendizagem</label>
            <textarea
              value={data.recuperacao}
              onChange={(e) => updateField("recuperacao", e.target.value)}
              rows={4}
              placeholder="Estratégias de acompanhamento contínuo..."
              className="w-full bg-white/10 dark:bg-black/20 border border-white/20 dark:border-white/10 rounded-2xl px-4 py-3 outline-none focus:border-white/40 transition-all resize-none text-sm text-white placeholder-white/30"
            />
          </section>
        </div>

        <section className="bg-white/80 dark:bg-stone-900/80 rounded-[32px] p-8 border border-stone-200 dark:border-stone-800 shadow-sm space-y-4 transition-colors">
          <label className="text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase italic">Referenciais e Critérios de Avaliação</label>
          <textarea
            value={data.criteriosAvaliacao}
            onChange={(e) => updateField("criteriosAvaliacao", e.target.value)}
            rows={5}
            className="w-full bg-stone-50 dark:bg-stone-800/50 border border-stone-100 dark:border-stone-800 rounded-2xl px-4 py-3 text-sm outline-none focus:border-natural-primary transition-all resize-none font-mono text-stone-500 dark:text-stone-400"
          />
        </section>

        <div className="flex gap-4 flex-wrap pb-12">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 px-8 py-4 rounded-3xl hover:bg-stone-800 dark:hover:bg-white transition-all font-bold text-sm shadow-xl hover:-translate-y-1 active:translate-y-0"
          >
            <Printer size={20} />
            Imprimir Guia (Padrão)
          </button>
          
          <button
            onClick={handleExportWord}
            className="flex items-center gap-2 bg-blue-600 text-white px-8 py-4 rounded-3xl hover:bg-blue-700 transition-all font-bold text-sm shadow-xl hover:-translate-y-1 active:translate-y-0"
          >
            <FileText size={20} />
            Baixar Word (.docx)
          </button>

          <button
            onClick={handleExportPdf}
            className="flex items-center gap-2 bg-red-600 text-white px-8 py-4 rounded-3xl hover:bg-red-700 transition-all font-bold text-sm shadow-xl hover:-translate-y-1 active:translate-y-0"
          >
            <Download size={20} />
            Baixar PDF Direto
          </button>
        </div>
      </main>

      {/* DOCUMENT PRINT PREVIEW (Hidden in UI, visible in Print) */}
      <div id="print-document" style={{ backgroundColor: '#ffffff', color: '#000000', fontFamily: 'Arial, sans-serif' }} className="print-only hidden p-10 min-h-screen text-[11pt]">
        {/* Header matching the PDF exactly */}
        <div style={{ borderColor: '#000000', borderStyle: 'solid', borderWidth: '1px' }} className="mb-0 flex text-center min-h-[80px]">
            <div style={{ borderColor: '#000000', borderRightWidth: '1px', borderRightStyle: 'solid' }} className="w-[15%] p-2 flex flex-col justify-center items-center">
                <img 
                  src="https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Bras%C3%A3o_do_estado_de_S%C3%A3o_Paulo.svg/200px-Bras%C3%A3o_do_estado_de_S%C3%A3o_Paulo.svg.png" 
                  style={{ width: '48px', height: 'auto' }} 
                  className="mb-1" 
                  crossOrigin="anonymous" 
                />
                <span style={{ color: '#000000' }} className="font-bold text-[8pt] leading-tight text-center uppercase">Programa Ensino Integral</span>
            </div>
            <div style={{ borderColor: '#000000', borderRightWidth: '1px', borderRightStyle: 'solid' }} className="w-[70%] p-2 flex flex-col justify-center items-center">
                <div style={{ color: '#000000' }} className="font-bold text-[11pt] mb-0.5 uppercase tracking-wider">{data.unidadeRegional}</div>
                <div style={{ color: '#000000' }} className="font-bold text-[11pt] mb-0.5 uppercase">{data.escola}</div>
                <div style={{ color: '#000000' }} className="font-medium text-[10pt]">{data.endereco}</div>
            </div>
            <div className="w-[15%] p-2 flex flex-col justify-center items-center gap-1">
                 <img 
                  src="https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Bandeira_do_estado_de_S%C3%A3o_Paulo.svg/200px-Bandeira_do_estado_de_S%C3%A3o_Paulo.svg.png" 
                  style={{ width: '48px', height: '32px' }} 
                  crossOrigin="anonymous" 
                />
                 <span style={{ color: '#000000' }} className="font-bold text-[8pt] uppercase leading-none">Secretaria da Educação</span>
            </div>
        </div>

        <div style={{ backgroundColor: '#fafaf9', borderColor: '#000000', borderLeftWidth: '1px', borderRightWidth: '1px', borderBottomWidth: '1px', borderStyle: 'solid', color: '#000000' }} className="text-center font-bold text-lg py-1.5 uppercase tracking-widest">
            Guia de Aprendizagem
        </div>

        <div style={{ borderColor: '#000000', borderLeftWidth: '1px', borderRightWidth: '1px', borderBottomWidth: '1px', borderStyle: 'solid' }} className="grid grid-cols-4 text-center uppercase font-bold text-[7px]">
            <div style={{ backgroundColor: '#f0fdfa', borderColor: '#000000', borderRightWidth: '1px', borderRightStyle: 'solid' }} className="py-0.5">Professor</div>
            <div style={{ backgroundColor: '#f0fdfa', borderColor: '#000000', borderRightWidth: '1px', borderRightStyle: 'solid' }} className="py-0.5">Componente Curricular</div>
            <div style={{ backgroundColor: '#f0fdfa', borderColor: '#000000', borderRightWidth: '1px', borderRightStyle: 'solid' }} className="py-0.5">Ano/Turma</div>
            <div style={{ backgroundColor: '#f0fdfa' }} className="py-0.5">Bimestre</div>
        </div>
        <div style={{ borderColor: '#000000', borderLeftWidth: '1px', borderRightWidth: '1px', borderBottomWidth: '1px', borderStyle: 'solid' }} className="grid grid-cols-4 text-center h-8">
            <div style={{ borderColor: '#000000', borderRightWidth: '1px', borderRightStyle: 'solid', color: '#000000' }} className="p-1 flex items-center justify-center font-bold text-[11px] uppercase">{data.professor}</div>
            <div style={{ borderColor: '#000000', borderRightWidth: '1px', borderRightStyle: 'solid', color: '#000000' }} className="p-1 flex items-center justify-center font-bold text-[11px] uppercase">{data.componenteCurricular}</div>
            <div style={{ borderColor: '#000000', borderRightWidth: '1px', borderRightStyle: 'solid', color: '#000000' }} className="p-1 flex items-center justify-center font-bold text-[11px] uppercase">{data.anoTurma}</div>
            <div style={{ color: '#000000' }} className="p-1 flex items-center justify-center font-bold text-[11px] uppercase">{data.bimestre}</div>
        </div>

        <div style={{ backgroundColor: '#f0fdfa', borderColor: '#000000', borderLeftWidth: '1px', borderRightWidth: '1px', borderBottomWidth: '1px', borderStyle: 'solid', color: '#000000' }} className="text-center font-bold py-0.5 uppercase text-[7px]">Objetivo</div>
        <div style={{ borderColor: '#000000', borderLeftWidth: '1px', borderRightWidth: '1px', borderBottomWidth: '1px', borderStyle: 'solid', color: '#000000' }} className="p-2 min-h-[40px] text-[10px] leading-tight text-justify">
            {data.objetivo}
        </div>

        <div style={{ backgroundColor: '#f0fdfa', borderColor: '#000000', borderLeftWidth: '1px', borderRightWidth: '1px', borderBottomWidth: '1px', borderStyle: 'solid', color: '#000000' }} className="grid grid-cols-[1fr_50px_50px_1fr] text-[7px] font-bold text-center uppercase">
            <div style={{ borderColor: '#000000', borderRightWidth: '1px', borderRightStyle: 'solid', color: '#000000' }} className="py-0.5 flex items-center justify-center px-1">AES - Aprendizagens Essenciais (Objetivos Finais)</div>
            <div style={{ borderColor: '#000000', borderRightWidth: '1px', borderRightStyle: 'solid', color: '#000000' }} className="py-0.5 flex items-center justify-center">Início</div>
            <div style={{ borderColor: '#000000', borderRightWidth: '1px', borderRightStyle: 'solid', color: '#000000' }} className="py-0.5 flex items-center justify-center">TÉRMINO</div>
            <div style={{ color: '#000000' }} className="py-0.5 flex items-center justify-center px-1 text-center">Conteúdos do Bimestre (Caminho Formativo) / Material Digital</div>
        </div>

        {data.aes.map((item, idx) => (
            <div key={idx} style={{ borderColor: '#000000', borderLeftWidth: '1px', borderRightWidth: '1px', borderBottomWidth: '1px', borderStyle: 'solid', color: '#000000' }} className="grid grid-cols-[1fr_50px_50px_1fr] min-h-[30px] text-[10px]">
                <div style={{ borderColor: '#000000', borderRightWidth: '1px', borderRightStyle: 'solid', color: '#000000' }} className="p-1.5 whitespace-pre-wrap leading-tight">{item.aprendizagem}</div>
                <div style={{ borderColor: '#000000', borderRightWidth: '1px', borderRightStyle: 'solid', color: '#000000' }} className="p-1 flex items-center justify-center text-center text-[9px]">
                  {item.inicio ? new Date(item.inicio + 'T00:00:00').toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'}) : '-'}
                </div>
                <div style={{ borderColor: '#000000', borderRightWidth: '1px', borderRightStyle: 'solid', color: '#000000' }} className="p-1 flex items-center justify-center text-center text-[9px]">
                  {item.termino ? new Date(item.termino + 'T00:00:00').toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'}) : '-'}
                </div>
                <div style={{ color: '#000000' }} className="p-1.5 whitespace-pre-wrap font-medium text-[9px] leading-tight">
                  {item.conteudos.split('\n').map((line, lIdx) => {
                    if (line.trim().startsWith('G1:') || line.trim().startsWith('G2:') || line.trim().startsWith('G3:')) {
                      const [label, ...rest] = line.split(':');
                      return (
                        <div key={lIdx} className="mb-0.5">
                          <span style={{ textDecorationColor: '#000000' }} className="font-bold underline">{label}:</span>{rest.join(':')}
                        </div>
                      );
                    }
                    if (line.trim().startsWith('Aulas:')) {
                      return <div key={lIdx} style={{ color: '#115e59' }} className="font-bold mt-1">{line}</div>;
                    }
                    return <div key={lIdx}>{line}</div>;
                  })}
                </div>
            </div>
        ))}

        <div style={{ backgroundColor: '#f0fdfa', borderColor: '#000000', borderLeftWidth: '1px', borderRightWidth: '1px', borderBottomWidth: '1px', borderStyle: 'solid', color: '#000000' }} className="text-center font-bold py-0.5 uppercase text-[7px]">Material Didático</div>
        <div style={{ borderColor: '#000000', borderLeftWidth: '1px', borderRightWidth: '1px', borderBottomWidth: '1px', borderStyle: 'solid', color: '#000000' }} className="p-1.5 text-[9px] h-12 overflow-hidden whitespace-pre-wrap italic">
            {data.materialDidatico}
        </div>

        <div style={{ backgroundColor: '#f0fdfa', borderColor: '#000000', borderLeftWidth: '1px', borderRightWidth: '1px', borderBottomWidth: '1px', borderStyle: 'solid', color: '#000000' }} className="grid grid-cols-2 text-[7px] font-bold text-center uppercase">
            <div style={{ borderColor: '#000000', borderRightWidth: '1px', borderRightStyle: 'solid', color: '#000000' }} className="py-0.5">Critérios de Avaliação</div>
            <div style={{ color: '#000000' }} className="py-0.5">Recuperação e Recomposição de Aprendizagem</div>
        </div>
        <div style={{ borderColor: '#000000', borderLeftWidth: '1px', borderRightWidth: '1px', borderBottomWidth: '1px', borderStyle: 'solid', color: '#000000' }} className="grid grid-cols-2 min-h-[80px]">
            <div style={{ borderColor: '#000000', borderRightWidth: '1px', borderRightStyle: 'solid', color: '#000000' }} className="p-2 text-[8px] leading-relaxed whitespace-pre-wrap font-medium">{data.criteriosAvaliacao}</div>
            <div style={{ color: '#000000' }} className="p-2 text-[8px] leading-relaxed whitespace-pre-wrap">{data.recuperacao}</div>
        </div>

        <div style={{ backgroundColor: '#f0fdfa', borderColor: '#000000', borderLeftWidth: '1px', borderRightWidth: '1px', borderBottomWidth: '1px', borderStyle: 'solid', color: '#000000' }} className="grid grid-cols-2 text-[7px] font-bold text-center uppercase">
            <div style={{ borderColor: '#000000', borderRightWidth: '1px', borderRightStyle: 'solid', color: '#000000' }} className="py-0.5">Assinatura do Professor</div>
            <div style={{ color: '#000000' }} className="py-0.5">Visto do(a) CGPG</div>
        </div>
        <div style={{ borderColor: '#000000', borderLeftWidth: '1px', borderRightWidth: '1px', borderBottomWidth: '1px', borderStyle: 'solid', color: '#000000' }} className="grid grid-cols-2 h-10">
            <div style={{ borderColor: '#000000', borderRightWidth: '1px', borderRightStyle: 'solid', color: '#000000' }} className="p-1"></div>
            <div style={{ color: '#000000' }} className="p-1"></div>
        </div>
      </div>

      {/* AI Modal */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border ${
              toast.type === 'error' ? 'bg-rose-50 border-rose-200 text-rose-600' : 
              toast.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-600' :
              'bg-blue-50 border-blue-200 text-blue-600'
            }`}
          >
            {toast.type === 'error' ? <Trash2 size={18} /> : <Info size={18} />}
            <span className="font-semibold text-sm">{toast.message}</span>
          </motion.div>
        )}

        {showConfirmReset && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowConfirmReset(false)}
              className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-white dark:bg-stone-900 p-8 rounded-[32px] shadow-2xl border border-stone-200 dark:border-stone-800 max-w-sm w-full text-center space-y-6"
            >
              <div className="mx-auto w-16 h-16 bg-rose-50 dark:bg-rose-500/10 rounded-full flex items-center justify-center text-rose-500">
                <RefreshCw size={32} />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold dark:text-white">Limpar Tudo?</h3>
                <p className="text-sm text-stone-500">Essa ação não pode ser desfeita. Todos os campos serão apagados.</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirmReset(false)}
                  className="flex-1 px-6 py-3 rounded-xl border border-stone-200 dark:border-stone-800 font-semibold text-stone-500 hover:bg-stone-50 dark:hover:bg-stone-800 transition-all font-sans"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmReset}
                  className="flex-1 px-6 py-3 rounded-xl bg-rose-500 text-white font-semibold hover:bg-rose-600 transition-all font-sans"
                >
                  Confirmar
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {showAiModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAiModal(false)}
              className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-natural-bg dark:bg-stone-900 rounded-[40px] shadow-2xl overflow-hidden border border-white/20 dark:border-stone-800"
            >
              <div className="p-10 space-y-6">
                <div className="flex items-center gap-4">
                  <div className="bg-white dark:bg-stone-800 p-4 rounded-[24px] text-natural-primary shadow-sm border border-stone-100 dark:border-stone-700">
                    <FileText size={24} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-serif italic font-bold text-stone-800 dark:text-stone-100 leading-tight">Escopo e Sequência</h2>
                    <p className="text-sm text-stone-500 dark:text-stone-400">Cole o documento do bimestre para gerar a estrutura completa do guia.</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase">Texto do Documento</label>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isPdfProcessing}
                      className="flex items-center gap-2 text-xs font-bold text-natural-primary bg-natural-primary/5 dark:bg-natural-primary/10 px-3 py-1.5 rounded-lg hover:bg-natural-primary/10 dark:hover:bg-natural-primary/20 transition-all border border-natural-primary/10"
                    >
                      {isPdfProcessing ? (
                        <Loader2 className="animate-spin" size={14} />
                      ) : (
                        <Upload size={14} />
                      )}
                      {isPdfProcessing ? "Lendo PDF..." : "Selecionar PDF do Material"}
                    </button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handlePdfUpload}
                      accept=".pdf"
                      className="hidden"
                    />
                  </div>
                  
                  <textarea
                    value={cmspText}
                    onChange={(e) => setCmspText(e.target.value)}
                    rows={10}
                    placeholder="Cole aqui o texto do Escopo e Sequência, Guia Priorizado ou roteiro do bimestre... Ou clique em 'Selecionar PDF' acima."
                    className="w-full bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-[24px] px-6 py-6 outline-none focus:ring-4 focus:ring-natural-primary/5 focus:border-natural-primary/30 resize-none font-sans text-sm text-stone-600 dark:text-stone-300 transition-all shadow-inner"
                  />
                  
                  <div className="flex gap-4">
                    <button
                      onClick={() => setShowAiModal(false)}
                      className="flex-1 px-6 py-4 rounded-2xl border border-stone-200 dark:border-stone-700 text-stone-500 dark:text-stone-400 font-semibold hover:bg-stone-50 dark:hover:bg-stone-800 transition-all font-sans"
                    >
                      Voltar
                    </button>
                    <button
                      onClick={handleAiSmartFill}
                      disabled={isAiLoading || !cmspText.trim()}
                      className="flex-[2] flex items-center justify-center gap-2 bg-natural-primary px-6 py-4 rounded-2xl text-white font-semibold hover:opacity-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-natural-primary/20 font-sans"
                    >
                      {isAiLoading ? (
                        <Loader2 className="animate-spin" size={18} />
                      ) : (
                        <>
                          <Sparkles size={18} />
                          Gerar Guia do Documento
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-only { 
            display: block !important; 
            background: white;
            color: black;
          }
          body { 
            background: white !important; 
            padding: 0 !important;
            margin: 0 !important;
          }
          @page {
            margin: 1cm;
            size: A4 portrait;
          }
           * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          #print-document {
            display: block !important;
            visibility: visible !important;
          }
        }
      `}</style>
    </div>
  );
}
