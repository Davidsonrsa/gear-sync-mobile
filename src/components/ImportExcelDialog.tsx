import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Upload, X, FileSpreadsheet } from "lucide-react";

/*
 * ============================================================
 * COLUNAS DA PLANILHA
 * ============================================================
 */

const EXPECTED_COLUMNS = [
  "nf",
  "data",
  "fornecedor",
  "identificacao",
  "valor",
  "observacao",
  "venc01",
  "venc02",
  "venc03",
  "venc04",
  "venc05",
];

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

/*
 * ============================================================
 * NORMALIZAÃ‡ÃƒO DAS COLUNAS
 * ============================================================
 */

function normalizeColumnName(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, "");
}

/*
 * ============================================================
 * VALIDAÃ‡ÃƒO REAL DA DATA
 * ============================================================
 */

function isValidDate(year: number, month: number, day: number): boolean {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return false;
  }
  if (year < 1900 || year > 2200) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;

  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

/*
 * ============================================================
 * DATAS
 * ============================================================
 */

function parseExcelDate(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;

  if (value instanceof Date) {
    if (isNaN(value.getTime())) return null;
    const year = value.getFullYear();
    const month = value.getMonth() + 1;
    const day = value.getDate();
    if (!isValidDate(year, month, day)) return null;
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  if (typeof value === "number") {
    try {
      const date = XLSX.SSF.parse_date_code(value);
      if (!date) return null;
      const year = Number(date.y);
      const month = Number(date.m);
      const day = Number(date.d);
      if (!isValidDate(year, month, day)) return null;
      return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    } catch {
      return null;
    }
  }

  if (typeof value !== "string") return null;

  const text = value.trim();
  if (!text) return null;

  let match = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    if (!isValidDate(year, month, day)) return null;
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
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
    if (!isValidDate(yearNumber, month, day)) return null;
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  match = text.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (match) {
    const day = Number(match[1]);
    const month = Number(match[2]);
    const year = Number(match[3]);
    if (!isValidDate(year, month, day)) return null;
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  const months: Record<string, number> = {
    jan: 1, janeiro: 1,
    fev: 2, fevereiro: 2,
    mar: 3, marco: 3, marÃ§o: 3,
    abr: 4, abril: 4,
    mai: 5, maio: 5,
    jun: 6, junho: 6,
    jul: 7, julho: 7,
    ago: 8, agosto: 8,
    set: 9, setembro: 9,
    out: 10, outubro: 10,
    nov: 11, novembro: 11,
    dez: 12, dezembro: 12,
  };

  const normalizedText = text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  match = normalizedText.match(/^(\d{1,2})[-\/\s]([a-z]+)[-\/\s](\d{2}|\d{4})$/);
  if (match) {
    const day = Number(match[1]);
    const month = months[match[2]];
    if (!month) return null;
    let year = match[3];
    if (year.length === 2) {
      year = Number(year) >= 50 ? `19${year}` : `20${year}`;
    }
    const yearNumber = Number(year);
    if (!isValidDate(yearNumber, month, day)) return null;
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  return null;
}

/*
 * ============================================================
 * VALORES
 * ============================================================
 */

function parseExcelValue(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;

  let text = String(value).trim();
  if (!text) return null;

  text = text.replace(/R\$/gi, "").replace(/\s/g, "").replace(/\u00A0/g, "");

  if (text.includes(",")) {
    text = text.replace(/\./g, "").replace(",", ".");
  }

  const number = Number(text);
  return Number.isFinite(number) ? number : null;
}

/*
 * ============================================================
 * NORMALIZAÃ‡ÃƒO DAS LINHAS
 * ============================================================
 */

function normalizeData(data: Record<string, unknown>[]): ImportData[] {
  return data
    .map((row) => {
      const normalizedRow: Record<string, unknown> = {};
      Object.entries(row).forEach(([key, value]) => {
        normalizedRow[normalizeColumnName(key)] = value;
      });

      return {
        nf: String(normalizedRow.nf ?? "").trim(),
        data: parseExcelDate(normalizedRow.data),
        fornecedor:
          normalizedRow.fornecedor !== null &&
          normalizedRow.fornecedor !== undefined &&
          String(normalizedRow.fornecedor).trim() !== ""
            ? String(normalizedRow.fornecedor).trim()
            : null,
        identificacao:
          normalizedRow.identificacao !== null &&
          normalizedRow.identificacao !== undefined &&
          String(normalizedRow.identificacao).trim() !== ""
            ? String(normalizedRow.identificacao).trim()
            : null,
        valor: parseExcelValue(normalizedRow.valor),
        observacao:
          normalizedRow.observacao !== null &&
          normalizedRow.observacao !== undefined &&
          String(normalizedRow.observacao).trim() !== ""
            ? String(normalizedRow.observacao).trim()
            : null,
        venc01: parseExcelDate(normalizedRow.venc01),
        venc02: parseExcelDate(normalizedRow.venc02),
        venc03: parseExcelDate(normalizedRow.venc03),
        venc04: parseExcelDate(normalizedRow.venc04),
        venc05: parseExcelDate(normalizedRow.venc05),
      };
    })
    .filter((row) => row.nf.length > 0);
}

/*
 * ============================================================
 * FORMATAÃ‡ÃƒO DE VALOR
 * ============================================================
 */

function formatCurrency(value: number | null): string {
  if (value === null) return "â€”";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

/*
 * ============================================================
 * COMPONENTE
 * ============================================================
 */

export function ImportExcelDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  // Ã‚ncora "invisÃ­vel" sÃ³ para descobrir a raiz real do DOM
  // (document normal OU um ShadowRoot, caso o app rode isolado
  // em Shadow DOM, comum em ambientes de preview tipo Lovable).
  const anchorRef = useRef<HTMLDivElement>(null);
  const qc = useQueryClient();

  const [previewData, setPreviewData] = useState<ImportData[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);

  /*
   * ==========================================================
   * DESCOBRE O CONTAINER CORRETO PARA O PORTAL
   *
   * Se apenas usarmos document.body, e o app estiver isolado
   * dentro de um Shadow DOM (ou de um container com estilos
   * escopados), o modal perde todo o CSS do app ao ser
   * portado â€” Ã© isso que causava o efeito "sem estilo /
   * transparente" na tela anterior.
   *
   * Aqui subimos a Ã¡rvore a partir do prÃ³prio componente
   * (getRootNode) para achar a raiz real: se for um
   * ShadowRoot, criamos/reaproveitamos um <div> dentro dele;
   * caso contrÃ¡rio, usamos document.body normalmente.
   * ==========================================================
   */

  useEffect(() => {
    const node = anchorRef.current;
    if (!node) return;

    const root = node.getRootNode();
    const PORTAL_ID = "import-excel-portal-root";

    let hostParent: Document | ShadowRoot | HTMLElement;

    if (root instanceof ShadowRoot) {
      hostParent = root;
    } else {
      hostParent = document.body;
    }

    let container = (hostParent as Document | ShadowRoot).querySelector?.(
      `#${PORTAL_ID}`
    ) as HTMLElement | null;

    if (!container) {
      container = document.createElement("div");
      container.id = PORTAL_ID;
      hostParent.appendChild(container);
    }

    setPortalContainer(container);

    return () => {
      // NÃ£o remove o container entre re-renders â€” apenas
      // quando o app inteiro desmonta seria necessÃ¡rio limpar,
      // e isso nÃ£o costuma acontecer em SPA.
    };
  }, []);

  /*
   * ==========================================================
   * IMPORTAÃ‡ÃƒO
   * ==========================================================
   */

  const importMutation = useMutation({
    mutationFn: async (data: ImportData[]) => {
      if (data.length === 0) {
        throw new Error("Nenhum dado vÃ¡lido para importar.");
      }

      let imported = 0;

      for (let i = 0; i < data.length; i += BATCH_SIZE) {
        const batch = data.slice(i, i + BATCH_SIZE);

        const safeBatch = batch.map((row) => ({
          ...row,
          data: parseExcelDate(row.data),
          venc01: parseExcelDate(row.venc01),
          venc02: parseExcelDate(row.venc02),
          venc03: parseExcelDate(row.venc03),
          venc04: parseExcelDate(row.venc04),
          venc05: parseExcelDate(row.venc05),
        }));

        const { error } = await supabase.from("notas_fiscais").insert(safeBatch);

        if (error) {
          console.error("Erro Supabase:", error);
          throw new Error(
            `Erro ao importar o lote iniciado no registro ${i + 1}: ${error.message}`
          );
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
      console.error("Erro ao importar notas fiscais:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao importar dados.");
      setImportProgress(0);
    },
  });

  /*
   * ==========================================================
   * LEITURA DO EXCEL
   * ==========================================================
   */

  function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    toast.info("Lendo a planilha...");

    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) {
          toast.error("NÃ£o foi possÃ­vel ler o arquivo.");
          return;
        }

        const workbook = XLSX.read(data, { type: "binary", cellDates: true });

        if (workbook.SheetNames.length === 0) {
          toast.error("Planilha vazia.");
          return;
        }

        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        if (!worksheet) {
          toast.error("Planilha vazia.");
          return;
        }

        const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
          defval: null,
        });

        if (json.length === 0) {
          toast.error("Nenhum registro encontrado na planilha.");
          return;
        }

        const columns = Object.keys(json[0]).map(normalizeColumnName);
        console.log("Colunas encontradas:", columns);

        const missingColumns = EXPECTED_COLUMNS.filter((column) => !columns.includes(column));

        if (missingColumns.length > 0) {
          toast.error(`Colunas faltando: ${missingColumns.join(", ")}`);
          return;
        }

        const normalized = normalizeData(json);

        if (normalized.length === 0) {
          toast.error("Nenhuma linha com NF vÃ¡lida encontrada.");
          return;
        }

        setPreviewData(normalized);
        setShowPreview(true);

        toast.success(`${normalized.length.toLocaleString("pt-BR")} linha(s) encontrada(s) na planilha.`);
      } catch (error) {
        console.error("Erro ao processar Excel:", error);
        toast.error(error instanceof Error ? error.message : "Erro ao ler arquivo Excel.");
      }
    };

    reader.onerror = () => {
      toast.error("Erro ao ler o arquivo.");
    };

    reader.readAsBinaryString(file);

    if (fileInput.current) {
      fileInput.current.value = "";
    }
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

    setTimeout(() => {
      fileInput.current?.click();
    }, 100);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      if (!importMutation.isPending) {
        closePreview();
      }
    }
  }

  /*
   * ==========================================================
   * CONTEÃšDO DO MODAL
   *
   * Isolado em uma variÃ¡vel para poder ser
   * renderizado via portal, fora de qualquer
   * ancestral que possa aplicar transform/opacity/
   * backdrop-filter (ex.: outro Dialog/Sheet do Radix
   * jÃ¡ aberto). Ã‰ essa heranÃ§a que causava o efeito
   * de "tela transparente/borrada".
   * ==========================================================
   */

  const modalContent =
    open && showPreview && previewData.length > 0 ? (
      <div
        className="fixed inset-0 z-[99999] isolate"
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-excel-title"
        onKeyDown={handleKeyDown}
        tabIndex={-1}
      >
        {/* FUNDO DO MODAL â€” opaco o suficiente e sem depender de var herdada */}
        <div
          className="absolute inset-0 bg-black/80"
          style={{ backdropFilter: "none" }}
          aria-hidden="true"
        />

        <div className="absolute inset-0 flex items-center justify-center p-3 sm:p-6">
          <div
            className="relative flex h-[92vh] w-full max-w-[1400px] flex-col overflow-hidden rounded-xl border border-border bg-background text-foreground shadow-2xl"
            style={{ opacity: 1 }}
            onClick={(event) => event.stopPropagation()}
          >
            {/* CABEÃ‡ALHO */}
            <div className="flex shrink-0 items-center justify-between gap-4 border-b bg-background px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <FileSpreadsheet className="h-5 w-5" />
                </div>
                <div>
                  <h2 id="import-excel-title" className="text-lg font-semibold leading-tight">
                    Confirmar ImportaÃ§Ã£o de Notas Fiscais
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    <strong className="text-foreground">
                      {previewData.length.toLocaleString("pt-BR")}
                    </strong>{" "}
                    nota(s) fiscal(is) encontrada(s).
                  </p>
                </div>
              </div>

              <button
                type="button"
                aria-label="Fechar"
                disabled={importMutation.isPending}
                onClick={closePreview}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-transparent text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* PROGRESSO */}
            {importMutation.isPending && (
              <div className="shrink-0 border-b bg-muted/30 px-5 py-3">
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="font-medium">Importando notas fiscais...</span>
                  <span>
                    {importProgress.toLocaleString("pt-BR")} /{" "}
                    {previewData.length.toLocaleString("pt-BR")}
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-300"
                    style={{
                      width: `${
                        previewData.length > 0
                          ? Math.min(100, (importProgress / previewData.length) * 100)
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>
            )}

            {!importMutation.isPending && (
              <div className="shrink-0 border-b bg-background px-5 py-3 text-sm text-muted-foreground">
                Confira os dados abaixo antes de importar.
              </div>
            )}

            {/* TABELA */}
            <div className="min-h-0 flex-1 overflow-auto bg-background">
              <table className="w-full min-w-[1100px] border-collapse text-sm">
                <thead>
                  <tr className="sticky top-0 z-20 border-b bg-muted">
                    <th className="whitespace-nowrap px-3 py-3 text-left font-semibold">#</th>
                    <th className="whitespace-nowrap px-3 py-3 text-left font-semibold">Data</th>
                    <th className="whitespace-nowrap px-3 py-3 text-left font-semibold">NF</th>
                    <th className="whitespace-nowrap px-3 py-3 text-left font-semibold">Fornecedor</th>
                    <th className="px-3 py-3 text-left font-semibold">ObservaÃ§Ã£o</th>
                    <th className="whitespace-nowrap px-3 py-3 text-left font-semibold">IdentificaÃ§Ã£o</th>
                    <th className="whitespace-nowrap px-3 py-3 text-right font-semibold">Valor</th>
                    <th className="whitespace-nowrap px-3 py-3 text-left font-semibold">Venc. 01</th>
                    <th className="whitespace-nowrap px-3 py-3 text-left font-semibold">Venc. 02</th>
                  </tr>
                </thead>
                <tbody>
                  {previewData.slice(0, 50).map((row, idx) => (
                    <tr
                      key={`${row.nf}-${idx}`}
                      className="border-b border-border/60 bg-background transition-colors hover:bg-muted/40"
                    >
                      <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">{idx + 1}</td>
                      <td className="whitespace-nowrap px-3 py-2">{row.data ?? "â€”"}</td>
                      <td className="whitespace-nowrap px-3 py-2 font-medium">{row.nf}</td>
                      <td className="px-3 py-2">{row.fornecedor ?? "â€”"}</td>
                      <td className="max-w-[320px] px-3 py-2">
                        <div className="truncate" title={row.observacao ?? undefined}>
                          {row.observacao ?? "â€”"}
                        </div>
                      </td>
                      <td className="px-3 py-2">{row.identificacao ?? "â€”"}</td>
                      <td className="whitespace-nowrap px-3 py-2 text-right">
                        {formatCurrency(row.valor)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2">{row.venc01 ?? "â€”"}</td>
                      <td className="whitespace-nowrap px-3 py-2">{row.venc02 ?? "â€”"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {previewData.length > 50 && (
              <div className="shrink-0 border-t bg-muted/30 px-5 py-3 text-sm text-muted-foreground">
                Mostrando os primeiros <strong className="text-foreground">50</strong> registros.
                <br />
                Os{" "}
                <strong className="text-foreground">
                  {previewData.length.toLocaleString("pt-BR")}
                </strong>{" "}
                registros serÃ£o importados.
              </div>
            )}

            {/* RODAPÃ‰ */}
            <div className="flex shrink-0 flex-col-reverse gap-3 border-t bg-background px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                disabled={importMutation.isPending}
                onClick={closePreview}
                className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-5 text-sm font-medium transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
              >
                Cancelar
              </button>

              <button
                type="button"
                disabled={importMutation.isPending || previewData.length === 0}
                onClick={() => {
                  if (!importMutation.isPending) {
                    importMutation.mutate(previewData);
                  }
                }}
                className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
              >
                {importMutation.isPending
                  ? `Importando ${importProgress.toLocaleString("pt-BR")} / ${previewData.length.toLocaleString("pt-BR")}...`
                  : `Importar ${previewData.length.toLocaleString("pt-BR")} notas`}
              </button>
            </div>
          </div>
        </div>
      </div>
    ) : null;

  return (
    <>
      {/* Elemento Ã¢ncora, invisÃ­vel, sÃ³ para localizar a raiz
          real do DOM (document ou ShadowRoot) via getRootNode(). */}
      <span ref={anchorRef} style={{ display: "none" }} aria-hidden="true" />

      <input
        ref={fileInput}
        type="file"
        accept=".xlsx,.xls,.csv"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Renderizado via portal dentro da raiz correta de estilos
          (document.body ou o ShadowRoot do app), escapando apenas
          de ancestrais problemÃ¡ticos (Dialog/Sheet abertos, transform,
          opacity em transiÃ§Ã£o), sem perder o CSS do app. */}
      {portalContainer && modalContent
        ? createPortal(modalContent, portalContainer)
        : null}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={openFileSelector}
        disabled={importMutation.isPending}
        className="gap-2"
      >
        <Upload className="h-4 w-4" />
        Importar Excel
      </Button>
    </>
  );
}

