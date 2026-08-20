import {
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Upload } from "lucide-react";

/*
 * ============================================================
 * CONFIGURAÇÃO
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

/*
 * ============================================================
 * TIPO DOS DADOS
 * ============================================================
 */

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
 * NORMALIZAÇÃO DAS COLUNAS
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
 * DATAS
 * ============================================================
 */

function parseExcelDate(value: unknown): string | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const year = value.getFullYear();
    const month = value.getMonth() + 1;
    const day = value.getDate();

    if (
      year < 1900 ||
      month < 1 ||
      month > 12 ||
      day < 1 ||
      day > 31
    ) {
      return null;
    }

    return `${year}-${String(month).padStart(2, "0")}-${String(
      day
    ).padStart(2, "0")}`;
  }

  if (typeof value === "number") {
    try {
      const date = XLSX.SSF.parse_date_code(value);

      if (
        date &&
        date.y &&
        date.m >= 1 &&
        date.m <= 12 &&
        date.d >= 1 &&
        date.d <= 31
      ) {
        return `${date.y}-${String(date.m).padStart(
          2,
          "0"
        )}-${String(date.d).padStart(2, "0")}`;
      }
    } catch {
      return null;
    }

    return null;
  }

  if (typeof value !== "string") {
    return null;
  }

  const text = value.trim();

  if (!text) {
    return null;
  }

  /*
   * YYYY-MM-DD
   */
  let match = text.match(
    /^(\d{4})-(\d{1,2})-(\d{1,2})$/
  );

  if (match) {
    const [, year, month, day] = match;

    const monthNumber = Number(month);
    const dayNumber = Number(day);

    if (
      monthNumber < 1 ||
      monthNumber > 12 ||
      dayNumber < 1 ||
      dayNumber > 31
    ) {
      return null;
    }

    return `${year}-${String(monthNumber).padStart(
      2,
      "0"
    )}-${String(dayNumber).padStart(2, "0")}`;
  }

  /*
   * DD/MM/YYYY ou DD/MM/YY
   */
  match = text.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/
  );

  if (match) {
    let [, day, month, year] = match;

    const dayNumber = Number(day);
    const monthNumber = Number(month);

    if (
      monthNumber < 1 ||
      monthNumber > 12 ||
      dayNumber < 1 ||
      dayNumber > 31
    ) {
      return null;
    }

    if (year.length === 2) {
      year =
        Number(year) >= 50
          ? `19${year}`
          : `20${year}`;
    }

    return `${year}-${String(monthNumber).padStart(
      2,
      "0"
    )}-${String(dayNumber).padStart(2, "0")}`;
  }

  /*
   * DD-MM-YYYY
   */
  match = text.match(
    /^(\d{1,2})-(\d{1,2})-(\d{4})$/
  );

  if (match) {
    const [, day, month, year] = match;

    const dayNumber = Number(day);
    const monthNumber = Number(month);

    if (
      monthNumber < 1 ||
      monthNumber > 12 ||
      dayNumber < 1 ||
      dayNumber > 31
    ) {
      return null;
    }

    return `${year}-${String(monthNumber).padStart(
      2,
      "0"
    )}-${String(dayNumber).padStart(2, "0")}`;
  }

  /*
   * MESES EM PORTUGUÊS
   */
  const months: Record<string, string> = {
    jan: "01",
    janeiro: "01",
    fev: "02",
    fevereiro: "02",
    mar: "03",
    marco: "03",
    abr: "04",
    abril: "04",
    mai: "05",
    maio: "05",
    jun: "06",
    junho: "06",
    jul: "07",
    julho: "07",
    ago: "08",
    agosto: "08",
    set: "09",
    setembro: "09",
    out: "10",
    outubro: "10",
    nov: "11",
    novembro: "11",
    dez: "12",
    dezembro: "12",
  };

  const normalizedText = text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  match = normalizedText.match(
    /^(\d{1,2})[-\/\s]([a-z]+)[-\/\s](\d{2}|\d{4})$/
  );

  if (match) {
    const [, day, monthText, yearText] = match;

    const month = months[monthText];

    if (!month) {
      return null;
    }

    const dayNumber = Number(day);

    if (dayNumber < 1 || dayNumber > 31) {
      return null;
    }

    const year =
      yearText.length === 2
        ? Number(yearText) >= 50
          ? `19${yearText}`
          : `20${yearText}`
        : yearText;

    return `${year}-${month}-${String(dayNumber).padStart(
      2,
      "0"
    )}`;
  }

  return null;
}

/*
 * ============================================================
 * VALORES
 * ============================================================
 */

function parseExcelValue(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  let text = String(value).trim();

  if (!text) {
    return null;
  }

  text = text
    .replace(/R\$/gi, "")
    .replace(/\s/g, "")
    .replace(/\u00A0/g, "");

  if (text.includes(",")) {
    text = text
      .replace(/\./g, "")
      .replace(",", ".");
  }

  const number = Number(text);

  return Number.isFinite(number) ? number : null;
}

/*
 * ============================================================
 * NORMALIZAÇÃO DOS DADOS
 * ============================================================
 */

function normalizeData(
  data: Record<string, unknown>[]
): ImportData[] {
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
    .filter((row) => row.nf);
}

/*
 * ============================================================
 * FORMATAÇÃO
 * ============================================================
 */

function formatCurrency(value: number | null): string {
  if (value === null) {
    return "—";
  }

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

  const queryClient = useQueryClient();

  const [previewData, setPreviewData] = useState<ImportData[]>([]);

  const [showPreview, setShowPreview] = useState(false);

  const [importProgress, setImportProgress] = useState(0);

  /*
   * ==========================================================
   * IMPORTAÇÃO
   * ==========================================================
   */

  const importMutation = useMutation({
    mutationFn: async (data: ImportData[]) => {
      if (data.length === 0) {
        throw new Error(
          "Nenhum dado válido para importar."
        );
      }

      let imported = 0;

      for (
        let i = 0;
        i < data.length;
        i += BATCH_SIZE
      ) {
        const batch = data.slice(
          i,
          i + BATCH_SIZE
        );

        const { error } = await supabase
          .from("notas_fiscais")
          .insert(batch);

        if (error) {
          console.error(
            "Erro Supabase:",
            error
          );

          throw new Error(
            `Erro ao importar o lote iniciado no registro ${
              i + 1
            }: ${error.message}`
          );
        }

        imported += batch.length;

        setImportProgress(imported);
      }

      return imported;
    },

    onSuccess: (total) => {
      toast.success(
        `${total.toLocaleString(
          "pt-BR"
        )} nota(s) fiscal(is) importada(s) com sucesso!`
      );

      queryClient.invalidateQueries({
        queryKey: ["notas-fiscais"],
      });

      setPreviewData([]);
      setShowPreview(false);
      setImportProgress(0);

      onOpenChange(false);
    },

    onError: (error) => {
      console.error(
        "Erro ao importar notas fiscais:",
        error
      );

      toast.error(
        error instanceof Error
          ? error.message
          : "Erro ao importar dados."
      );

      setImportProgress(0);
    },
  });

  /*
   * ==========================================================
   * SELEÇÃO DO EXCEL
   * ==========================================================
   */

  function handleFileSelect(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    toast.info("Lendo a planilha...");

    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const data = event.target?.result;

        if (!data) {
          toast.error(
            "Não foi possível ler o arquivo."
          );
          return;
        }

        const workbook = XLSX.read(data, {
          type: "binary",
          cellDates: true,
        });

        if (workbook.SheetNames.length === 0) {
          toast.error("Planilha vazia.");
          return;
        }

        const worksheet =
          workbook.Sheets[workbook.SheetNames[0]];

        if (!worksheet) {
          toast.error("Planilha vazia.");
          return;
        }

        const json =
          XLSX.utils.sheet_to_json<
            Record<string, unknown>
          >(worksheet, {
            defval: null,
          });

        if (json.length === 0) {
          toast.error(
            "Nenhum registro encontrado na planilha."
          );
          return;
        }

        /*
         * Verificação das colunas
         */

        const columns = Object.keys(json[0]).map(
          normalizeColumnName
        );

        console.log(
          "Colunas encontradas:",
          columns
        );

        const missingColumns =
          EXPECTED_COLUMNS.filter(
            (column) =>
              !columns.includes(column)
          );

        if (missingColumns.length > 0) {
          toast.error(
            `Colunas faltando: ${missingColumns.join(
              ", "
            )}`
          );

          return;
        }

        /*
         * Normalização
         */

        const normalized = normalizeData(json);

        if (normalized.length === 0) {
          toast.error(
            "Nenhuma linha com NF válida encontrada."
          );

          return;
        }

        setPreviewData(normalized);
        setShowPreview(true);

        toast.success(
          `${normalized.length.toLocaleString(
            "pt-BR"
          )} linha(s) encontrada(s) na planilha.`
        );
      } catch (error) {
        console.error(
          "Erro ao processar Excel:",
          error
        );

        toast.error(
          error instanceof Error
            ? error.message
            : "Erro ao ler arquivo Excel."
        );
      }
    };

    reader.onerror = () => {
      toast.error(
        "Erro ao ler o arquivo."
      );
    };

    reader.readAsBinaryString(file);

    /*
     * Permite selecionar novamente o mesmo arquivo.
     */

    if (fileInput.current) {
      fileInput.current.value = "";
    }
  }

  /*
   * ==========================================================
   * CANCELAR
   * ==========================================================
   */

  function handleCancel() {
    if (importMutation.isPending) {
      return;
    }

    setPreviewData([]);
    setShowPreview(false);
    setImportProgress(0);
    onOpenChange(false);
  }

  /*
   * ==========================================================
   * ABRIR SELETOR DO EXCEL
   * ==========================================================
   */

  function handleOpenImport() {
    if (importMutation.isPending) {
      return;
    }

    setPreviewData([]);
    setShowPreview(false);
    setImportProgress(0);

    onOpenChange(true);

    window.setTimeout(() => {
      fileInput.current?.click();
    }, 100);
  }

  /*
   * ============================================================
   * INTERFACE
   *
   * IMPORTANTE:
   * Não utilizamos Dialog/Portal/Overlay do projeto aqui.
   * A janela é criada em uma única camada.
   * ============================================================
   */

  return (
    <>
      <input
        ref={fileInput}
        type="file"
        accept=".xlsx,.xls,.csv"
        onChange={handleFileSelect}
        className="hidden"
      />

      {open &&
        showPreview &&
        previewData.length > 0 && (
          <div
            className="fixed inset-0 flex items-center justify-center p-3 sm:p-6"
            style={{
              zIndex: 999999,
              backgroundColor: "rgba(0, 0, 0, 0.75)",
            }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="import-excel-title"
          >
            <div
              className="flex h-[94vh] w-full max-w-[1400px] flex-col overflow-hidden rounded-xl border border-gray-300 bg-white text-gray-900 shadow-2xl"
              style={{
                isolation: "isolate",
              }}
              onClick={(event) => {
                event.stopPropagation();
              }}
            >
              {/* =================================================
                  CABEÇALHO
                  ================================================= */}

              <div className="flex shrink-0 items-center justify-between border-b border-gray-200 bg-white px-5 py-4">
                <div>
                  <h2
                    id="import-excel-title"
                    className="text-xl font-bold text-gray-900"
                  >
                    Confirmar Importação de
                    Notas Fiscais
                  </h2>

                  <p className="mt-1 text-sm text-gray-600">
                    <strong className="text-gray-900">
                      {previewData.length.toLocaleString(
                        "pt-BR"
                      )}
                    </strong>{" "}
                    nota(s) fiscal(is)
                    encontrada(s).
                  </p>

                  <p className="text-sm text-gray-600">
                    Confira os dados abaixo antes
                    de importar.
                  </p>
                </div>

                <button
                  type="button"
                  disabled={
                    importMutation.isPending
                  }
                  onClick={handleCancel}
                  className="flex h-9 w-9 items-center justify-center rounded-md border border-gray-300 bg-white text-xl text-gray-600 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Fechar"
                  title="Fechar"
                >
                  ×
                </button>
              </div>

              {/* =================================================
                  PROGRESSO
                  ================================================= */}

              {importMutation.isPending && (
                <div className="shrink-0 border-b border-gray-200 bg-gray-50 px-5 py-4">
                  <div className="mb-2 flex items-center justify-between text-sm text-gray-700">
                    <span>
                      Importando notas fiscais...
                    </span>

                    <strong>
                      {importProgress.toLocaleString(
                        "pt-BR"
                      )}{" "}
                      /{" "}
                      {previewData.length.toLocaleString(
                        "pt-BR"
                      )}
                    </strong>
                  </div>

                  <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                    <div
                      className="h-full rounded-full bg-blue-600 transition-all duration-300"
                      style={{
                        width: `${
                          previewData.length > 0
                            ? Math.min(
                                100,
                                (importProgress /
                                  previewData.length) *
                                  100
                              )
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>
              )}

              {/* =================================================
                  TABELA
                  ================================================= */}

              <div className="min-h-0 flex-1 overflow-auto bg-white">
                <table className="w-full min-w-[1150px] border-collapse text-sm">
                  <thead className="sticky top-0 bg-gray-100">
                    <tr className="border-b border-gray-300">
                      <th className="whitespace-nowrap px-3 py-3 text-left font-semibold text-gray-800">
                        #
                      </th>

                      <th className="whitespace-nowrap px-3 py-3 text-left font-semibold text-gray-800">
                        Data
                      </th>

                      <th className="whitespace-nowrap px-3 py-3 text-left font-semibold text-gray-800">
                        NF
                      </th>

                      <th className="whitespace-nowrap px-3 py-3 text-left font-semibold text-gray-800">
                        Fornecedor
                      </th>

                      <th className="whitespace-nowrap px-3 py-3 text-left font-semibold text-gray-800">
                        Observação
                      </th>

                      <th className="whitespace-nowrap px-3 py-3 text-left font-semibold text-gray-800">
                        Identificação
                      </th>

                      <th className="whitespace-nowrap px-3 py-3 text-right font-semibold text-gray-800">
                        Valor
                      </th>

                      <th className="whitespace-nowrap px-3 py-3 text-left font-semibold text-gray-800">
                        Venc. 01
                      </th>

                      <th className="whitespace-nowrap px-3 py-3 text-left font-semibold text-gray-800">
                        Venc. 02
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {previewData
                      .slice(0, 50)
                      .map((row, index) => (
                        <tr
                          key={`${row.nf}-${index}`}
                          className="border-b border-gray-200 hover:bg-gray-50"
                        >
                          <td className="whitespace-nowrap px-3 py-2 text-gray-500">
                            {index + 1}
                          </td>

                          <td className="whitespace-nowrap px-3 py-2 text-gray-800">
                            {row.data ?? "—"}
                          </td>

                          <td className="whitespace-nowrap px-3 py-2 font-medium text-gray-900">
                            {row.nf}
                          </td>

                          <td className="px-3 py-2 text-gray-800">
                            {row.fornecedor ?? "—"}
                          </td>

                          <td
                            className="max-w-[300px] truncate px-3 py-2 text-gray-800"
                            title={
                              row.observacao ?? ""
                            }
                          >
                            {row.observacao ?? "—"}
                          </td>

                          <td className="px-3 py-2 text-gray-800">
                            {row.identificacao ?? "—"}
                          </td>

                          <td className="whitespace-nowrap px-3 py-2 text-right font-medium text-gray-900">
                            {formatCurrency(row.valor)}
                          </td>

                          <td className="whitespace-nowrap px-3 py-2 text-gray-800">
                            {row.venc01 ?? "—"}
                          </td>

                          <td className="whitespace-nowrap px-3 py-2 text-gray-800">
                            {row.venc02 ?? "—"}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              {/* =================================================
                  AVISO DOS REGISTROS
                  ================================================= */}

              {previewData.length > 50 && (
                <div className="shrink-0 border-t border-gray-200 bg-gray-50 px-5 py-3 text-sm text-gray-600">
                  Mostrando os primeiros{" "}
                  <strong className="text-gray-900">
                    50
                  </strong>{" "}
                  registros.
                  <br />
                  Os{" "}
                  <strong className="text-gray-900">
                    {previewData.length.toLocaleString(
                      "pt-BR"
                    )}
                  </strong>{" "}
                  registros serão importados.
                </div>
              )}

              {/* =================================================
                  RODAPÉ
                  ================================================= */}

              <div className="flex shrink-0 items-center justify-between gap-3 border-t border-gray-200 bg-white px-5 py-4">
                <button
                  type="button"
                  disabled={
                    importMutation.isPending
                  }
                  onClick={handleCancel}
                  className="inline-flex h-10 items-center justify-center rounded-md border border-gray-300 bg-white px-5 text-sm font-medium text-gray-800 hover:bg-gray-100 disabled:pointer-events-none disabled:opacity-50"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  disabled={
                    importMutation.isPending ||
                    previewData.length === 0
                  }
                  onClick={() => {
                    if (
                      !importMutation.isPending &&
                      previewData.length > 0
                    ) {
                      importMutation.mutate(
                        previewData
                      );
                    }
                  }}
                  className="inline-flex h-10 items-center justify-center rounded-md bg-blue-600 px-6 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:pointer-events-none disabled:opacity-50"
                >
                  {importMutation.isPending
                    ? `Importando ${importProgress.toLocaleString(
                        "pt-BR"
                      )} / ${previewData.length.toLocaleString(
                        "pt-BR"
                      )}...`
                    : `Importar ${previewData.length.toLocaleString(
                        "pt-BR"
                      )} notas`}
                </button>
              </div>
            </div>
          </div>
        )}

      {/* ========================================================
          BOTÃO IMPORTAR EXCEL
          ======================================================== */}

      <Button
        variant="outline"
        size="sm"
        onClick={handleOpenImport}
        disabled={importMutation.isPending}
        className="gap-2"
      >
        <Upload className="h-4 w-4" />
        Importar Excel
      </Button>
    </>
  );
}
