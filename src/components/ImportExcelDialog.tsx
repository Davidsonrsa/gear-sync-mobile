import { useState, useRef } from "react";
import { createPortal } from "react-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Upload, X, FileSpreadsheet } from "lucide-react";

// Mapeamento tolerante de colunas (incluindo variações e o erro de digitação do Excel "obersvaçao")
// Atualize o COLUMN_ALIASES com mais variações comuns de cabeçalhos
const COLUMN_ALIASES: Record<string, string> = {
  nf: "nf",
  numeronf: "nf",
  notafiscal: "nf",
  nnf: "nf",
  documento: "nf",
  data: "data",
  emissao: "data",
  dataemissao: "data",
  fornecedor: "fornecedor",
  empresa: "fornecedor",
  identificacao: "identificacao",
  cl: "identificacao",
  equipamento: "identificacao",
  valor: "valor",
  valortotal: "valor",
  valorgeral: "valor",
  observacao: "observacao",
  obersvacao: "observacao",
  observacoes: "observacao",
  venc01: "venc01",
  vencimento1: "venc01",
  venc02: "venc02",
  vencimento2: "venc02",
  venc03: "venc03",
  vencimento3: "venc03",
  venc04: "venc04",
  vencimento4: "venc04",
  venc05: "venc05",
  vencimento5: "venc05",
};
const BATCH_SIZE = 500;

interface ImportData {
  nf: string;
  data: string | null;
  fornecedor: string | null;
  identificacao: string | null;
  valor: number | null;
  observacao: string | null;
  venc01: string | null;
  venc02: string | null;
  venc03: string | null;
  venc04: string | null;
  venc05: string | null;
}

function normalizeColumnName(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, "");
}

function isValidDate(year: number, month: number, day: number): boolean {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return false;
  if (year < 1900 || year > 2200 || month < 1 || month > 12 || day < 1 || day > 31) return false;
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

function parseExcelDate(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;

  if (value instanceof Date) {
    if (isNaN(value.getTime())) return null;
    const year = value.getFullYear();
    const month = value.getMonth() + 1;
    const day = value.getDate();
    return isValidDate(year, month, day) ? `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}` : null;
  }

  if (typeof value === "number") {
    try {
      const date = XLSX.SSF.parse_date_code(value);
      if (!date) return null;
      const year = Number(date.y);
      const month = Number(date.m);
      const day = Number(date.d);
      return isValidDate(year, month, day) ? `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}` : null;
    } catch {
      return null;
    }
  }

  if (typeof value !== "string") return null;
  const text = value.trim();
  if (!text) return null;

  let match = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (match) {
    const [_, y, m, d] = match;
    return isValidDate(Number(y), Number(m), Number(d)) ? `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}` : null;
  }

  match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/);
  if (match) {
    const day = Number(match[1]);
    const month = Number(match[2]);
    let year = match[3];
    if (year.length === 2) {
      year = Number(year) >= 50 ? `19${year}` : `20${year}`;
    }
    const yearNumber = Number(year);
    return isValidDate(yearNumber, month, day) ? `${yearNumber}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}` : null;
  }

  return null;
}

function parseExcelValue(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;

  let text = String(value).trim().replace(/R\$/gi, "").replace(/\s/g, "").replace(/\u00A0/g, "");
  if (!text) return null;

  if (text.includes(",")) {
    text = text.replace(/\./g, "").replace(",", ".");
  }

  const number = Number(text);
  return Number.isFinite(number) ? number : null;
}

function parseNfValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") {
    return Number.isFinite(value) ? String(Math.trunc(value)) : "";
  }
  const text = String(value).trim();
  if (!text || text.toLowerCase() === "nan" || text.toLowerCase() === "undefined") return "";
  return text;
}

function normalizeData(data: Record<string, unknown>[]): ImportData[] {
  return data
    .map((row) => {
      const mappedRow: Record<string, unknown> = {};

      Object.entries(row).forEach(([key, value]) => {
        const normalizedKey = normalizeColumnName(key);
        const mappedKey = COLUMN_ALIASES[normalizedKey];
        if (mappedKey && value !== null && value !== undefined && value !== "") {
          mappedRow[mappedKey] = value;
        }
      });

      return {
        nf: parseNfValue(mappedRow.nf),
        data: parseExcelDate(mappedRow.data),
        fornecedor: mappedRow.fornecedor ? String(mappedRow.fornecedor).trim() : null,
        identificacao: mappedRow.identificacao ? String(mappedRow.identificacao).trim() : null,
        valor: parseExcelValue(mappedRow.valor),
        observacao: mappedRow.observacao ? String(mappedRow.observacao).trim() : null,
        venc01: parseExcelDate(mappedRow.venc01),
        venc02: parseExcelDate(mappedRow.venc02),
        venc03: parseExcelDate(mappedRow.venc03),
        venc04: parseExcelDate(mappedRow.venc04),
        venc05: parseExcelDate(mappedRow.venc05),
      };
    })
    .filter((row) => row.nf.length > 0);
}

function formatCurrency(value: number | null): string {
  if (value === null) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export function ImportExcelDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();
  const [previewData, setPreviewData] = useState<ImportData[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [importProgress, setImportProgress] = useState(0);

  const importMutation = useMutation({
    mutationFn: async (data: ImportData[]) => {
      if (data.length === 0) throw new Error("Nenhum dado válido para importar.");
      let imported = 0;

      for (let i = 0; i < data.length; i += BATCH_SIZE) {
        const batch = data.slice(i, i + BATCH_SIZE);
        const { error } = await supabase.from("notas_fiscais").insert(batch);

        if (error) {
          throw new Error(`Erro ao importar o lote iniciado no registro ${i + 1}: ${error.message}`);
        }

        imported += batch.length;
        setImportProgress(imported);
      }
      return imported;
    },
    onSuccess: (total) => {
      toast.success(`${total.toLocaleString("pt-BR")} nota(s) fiscal(is) importada(s) com sucesso!`);
      qc.invalidateQueries({ queryKey: ["notas-fiscais"] });
      setPreviewData([]);
      setShowPreview(false);
      setImportProgress(0);
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Erro ao importar dados.");
      setImportProgress(0);
    },
  });

  function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    toast.info("Lendo a planilha...");
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const buffer = e.target?.result;
        if (!buffer) {
          toast.error("Não foi possível ler o arquivo.");
          return;
        }

        const data = new Uint8Array(buffer as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array", cellDates: true });

        if (workbook.SheetNames.length === 0) {
          toast.error("Planilha vazia.");
          return;
        }

        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: null });

        if (json.length === 0) {
          toast.error("Nenhum registro encontrado na planilha.");
          return;
        }

        const normalized = normalizeData(json);
        if (normalized.length === 0) {
          toast.error("Nenhuma linha com NF válida encontrada.");
          return;
        }

        setPreviewData(normalized);
        setShowPreview(true);
        toast.success(`${normalized.length.toLocaleString("pt-BR")} linha(s) encontrada(s) na planilha.`);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Erro ao ler arquivo Excel.");
      }
    };

    reader.onerror = () => toast.error("Erro ao ler o arquivo.");
    reader.readAsArrayBuffer(file);

    if (fileInput.current) fileInput.current.value = "";
  }

  function closePreview() {
    if (importMutation.isPending) return;
    setShowPreview(false);
    setPreviewData([]);
    setImportProgress(0);
    onOpenChange(false);
  }

  function openFileSelector() {
    if (importMutation.isPending) return;
    setPreviewData([]);
    setShowPreview(false);
    onOpenChange(true);
    setTimeout(() => fileInput.current?.click(), 100);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape" && !importMutation.isPending) {
      event.preventDefault();
      closePreview();
    }
  }

  const previewModal =
    open && showPreview && previewData.length > 0 ? (
      <div className="fixed inset-0 z-[999999] isolate" role="dialog" aria-modal="true" onKeyDown={handleKeyDown} tabIndex={-1}>
        <div className="fixed inset-0 bg-black/75" aria-hidden="true" />
        <div className="fixed inset-0 z-[1000000] flex items-center justify-center p-3 sm:p-6">
          <div className="relative flex h-[92vh] w-full max-w-[1400px] flex-col overflow-hidden rounded-xl border border-gray-200 bg-white text-gray-900 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            
            {/* Cabeçalho */}
            <div className="flex shrink-0 items-center justify-between gap-4 border-b border-gray-200 bg-white px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <FileSpreadsheet className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold leading-tight text-gray-900">Confirmar Importação de Notas Fiscais</h2>
                  <p className="mt-1 text-sm text-gray-500">
                    <strong className="text-gray-900">{previewData.length.toLocaleString("pt-BR")}</strong> nota(s) fiscal(is) encontrada(s).
                  </p>
                </div>
              </div>
              <button type="button" aria-label="Fechar" disabled={importMutation.isPending} onClick={closePreview} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 disabled:opacity-50">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Barra de Progresso */}
            {importMutation.isPending && (
              <div className="shrink-0 border-b border-gray-200 bg-gray-50 px-5 py-3">
                <div className="mb-2 flex items-center justify-between text-sm text-gray-700">
                  <span className="font-medium">Importando notas fiscais...</span>
                  <span>{importProgress.toLocaleString("pt-BR")} / {previewData.length.toLocaleString("pt-BR")}</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                  <div className="h-full rounded-full bg-blue-600 transition-all duration-300" style={{ width: `${Math.min(100, (importProgress / previewData.length) * 100)}%` }} />
                </div>
              </div>
            )}

            {/* Tabela de Previsão */}
            <div className="min-h-0 flex-1 overflow-auto bg-white">
              <table className="w-full min-w-[1100px] border-collapse text-sm">
                <thead>
                  <tr className="sticky top-0 z-20 border-b border-gray-200 bg-gray-100 text-gray-800">
                    <th className="whitespace-nowrap px-3 py-3 text-left font-semibold">#</th>
                    <th className="whitespace-nowrap px-3 py-3 text-left font-semibold">Data</th>
                    <th className="whitespace-nowrap px-3 py-3 text-left font-semibold">NF</th>
                    <th className="whitespace-nowrap px-3 py-3 text-left font-semibold">Fornecedor</th>
                    <th className="px-3 py-3 text-left font-semibold">Observação</th>
                    <th className="whitespace-nowrap px-3 py-3 text-left font-semibold">Identificação</th>
                    <th className="whitespace-nowrap px-3 py-3 text-right font-semibold">Valor</th>
                    <th className="whitespace-nowrap px-3 py-3 text-left font-semibold">Venc. 01</th>
                    <th className="whitespace-nowrap px-3 py-3 text-left font-semibold">Venc. 02</th>
                  </tr>
                </thead>
                <tbody>
                  {previewData.slice(0, 50).map((row, idx) => (
                    <tr key={`${row.nf}-${idx}`} className="border-b border-gray-200 bg-white text-gray-800 hover:bg-gray-50">
                      <td className="whitespace-nowrap px-3 py-2 text-gray-500">{idx + 1}</td>
                      <td className="whitespace-nowrap px-3 py-2">{row.data ?? "—"}</td>
                      <td className="whitespace-nowrap px-3 py-2 font-medium">{row.nf}</td>
                      <td className="px-3 py-2">{row.fornecedor ?? "—"}</td>
                      <td className="max-w-[320px] px-3 py-2"><div className="truncate">{row.observacao ?? "—"}</div></td>
                      <td className="px-3 py-2">{row.identificacao ?? "—"}</td>
                      <td className="whitespace-nowrap px-3 py-2 text-right">{formatCurrency(row.valor)}</td>
                      <td className="whitespace-nowrap px-3 py-2">{row.venc01 ?? "—"}</td>
                      <td className="whitespace-nowrap px-3 py-2">{row.venc02 ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Rodapé de Ações */}
            <div className="flex min-h-[72px] shrink-0 items-center justify-between gap-4 border-t border-gray-200 bg-white px-5 py-4">
              <button type="button" disabled={importMutation.isPending} onClick={closePreview} className="inline-flex h-11 min-w-[110px] items-center justify-center rounded-md border border-gray-300 bg-white px-5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-100 disabled:opacity-50">
                Cancelar
              </button>
              <button type="button" disabled={importMutation.isPending || previewData.length === 0} onClick={() => importMutation.mutate(previewData)} className="inline-flex h-11 min-w-[190px] items-center justify-center rounded-md bg-blue-600 px-6 text-sm font-bold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50">
                {importMutation.isPending ? `Importando...` : `Importar ${previewData.length.toLocaleString("pt-BR")} notas`}
              </button>
            </div>

          </div>
        </div>
      </div>
    ) : null;

  return (
    <>
      <input ref={fileInput} type="file" accept=".xlsx,.xls,.csv" onChange={handleFileSelect} className="hidden" />
      {typeof document !== "undefined" && previewModal && createPortal(previewModal, document.body)}
      <Button type="button" variant="default" size="sm" onClick={openFileSelector} disabled={importMutation.isPending} className="gap-2">
        <Upload className="h-4 w-4" />
        Importar Excel
      </Button>
    </>
  );
}
