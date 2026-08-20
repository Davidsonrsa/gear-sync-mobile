import {
  useState,
  useRef,
  useEffect,
  type ChangeEvent,
} from "react";
import { createPortal } from "react-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Upload, X } from "lucide-react";

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
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  if (value instanceof Date && !isNaN(value.getTime())) {
    const year = value.getFullYear();
    const month = value.getMonth() + 1;
    const day = value.getDate();

    if (
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

    if (
      dayNumber < 1 ||
      dayNumber > 31
    ) {
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
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  if (typeof value === "number") {
    return Number.isFinite(value)
      ? value
      : null;
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

  return Number.isFinite(number)
    ? number
    : null;
}

/*
 * ============================================================
 * NORMALIZAÇÃO DAS LINHAS
 * ============================================================
 */

function normalizeData(
  data: Record<string, unknown>[]
): ImportData[] {
  return data
    .map((row) => {
      const normalizedRow: Record<
        string,
        unknown
      > = {};

      Object.entries(row).forEach(
        ([key, value]) => {
          normalizedRow[
            normalizeColumnName(key)
          ] = value;
        }
      );

      return {
        nf: String(
          normalizedRow.nf ?? ""
        ).trim(),

        data: parseExcelDate(
          normalizedRow.data
        ),

        fornecedor:
          normalizedRow.fornecedor
            ? String(
                normalizedRow.fornecedor
              ).trim()
            : null,

        identificacao:
          normalizedRow.identificacao
            ? String(
                normalizedRow.identificacao
              ).trim()
            : null,

        valor: parseExcelValue(
          normalizedRow.valor
        ),

        observacao:
          normalizedRow.observacao
            ? String(
                normalizedRow.observacao
              ).trim()
            : null,

        venc01: parseExcelDate(
          normalizedRow.venc01
        ),

        venc02: parseExcelDate(
          normalizedRow.venc02
        ),

        venc03: parseExcelDate(
          normalizedRow.venc03
        ),

        venc04: parseExcelDate(
          normalizedRow.venc04
        ),

        venc05: parseExcelDate(
          normalizedRow.venc05
        ),
      };
    })
    .filter((row) => row.nf);
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
  const fileInput =
    useRef<HTMLInputElement>(null);

  const qc = useQueryClient();

  const [previewData, setPreviewData] =
    useState<ImportData[]>([]);

  const [showPreview, setShowPreview] =
    useState(false);

  const [importProgress, setImportProgress] =
    useState(0);

  /*
   * ==========================================================
   * BLOQUEIA SCROLL DA PÁGINA ENQUANTO O MODAL ESTÁ ABERTO
   * ==========================================================
   */

  useEffect(() => {
    if (!open || !showPreview) {
      return;
    }

    const originalOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    return () => {
      document.body.style.overflow =
        originalOverflow;
    };
  }, [open, showPreview]);

  /*
   * ==========================================================
   * ESC FECHA O MODAL
   * ==========================================================
   */

  useEffect(() => {
    if (!open || !showPreview) {
      return;
    }

    const handleEscape = (
      event: KeyboardEvent
    ) => {
      if (
        event.key === "Escape" &&
        !importMutation.isPending
      ) {
        handleCancel();
        onOpenChange(false);
      }
    };

    window.addEventListener(
      "keydown",
      handleEscape
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleEscape
      );
    };
  }, [
    open,
    showPreview,
    importMutation.isPending,
  ]);

  /*
   * ==========================================================
   * IMPORTAÇÃO
   * ==========================================================
   */

  const importMutation = useMutation({
    mutationFn: async (
      data: ImportData[]
    ) => {
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

        const { error } =
          await supabase
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

      qc.invalidateQueries({
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
   * LEITURA DO EXCEL
   * ==========================================================
   */

  function handleFileSelect(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    toast.info(
      "Lendo a planilha..."
    );

    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data =
          e.target?.result;

        if (!data) {
          toast.error(
            "Não foi possível ler o arquivo."
          );
          return;
        }

        const workbook =
          XLSX.read(data, {
            type: "binary",
            cellDates: true,
          });

        if (
          !workbook.SheetNames.length
        ) {
          toast.error(
            "Planilha vazia."
          );
          return;
        }

        const worksheet =
          workbook.Sheets[
            workbook.SheetNames[0]
          ];

        if (!worksheet) {
          toast.error(
            "Planilha vazia."
          );
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

        const columns =
          Object.keys(
            json[0]
          ).map(
            normalizeColumnName
          );

        console.log(
          "Colunas encontradas:",
          columns
        );

        const missingColumns =
          EXPECTED_COLUMNS.filter(
            (column) =>
              !columns.includes(
                column
              )
          );

        if (
          missingColumns.length > 0
        ) {
          toast.error(
            `Colunas faltando: ${missingColumns.join(
              ", "
            )}`
          );

          return;
        }

        const normalized =
          normalizeData(json);

        if (
          normalized.length === 0
        ) {
          toast.error(
            "Nenhuma linha com NF válida encontrada."
          );

          return;
        }

        setPreviewData(
          normalized
        );

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

    reader.readAsBinaryString(
      file
    );

    if (fileInput.current) {
      fileInput.current.value =
        "";
    }
  }

  /*
   * ==========================================================
   * CANCELAR
   * ==========================================================
   */

  function handleCancel() {
    if (
      importMutation.isPending
    ) {
      return;
    }

    setPreviewData([]);
    setShowPreview(false);
    setImportProgress(0);
  }

  /*
   * ==========================================================
   * MODAL
   *
   * IMPORTANTE:
   * O modal é criado diretamente no BODY usando PORTAL.
   * Isso elimina problemas de:
   *
   * - opacity herdada
   * - transform
   * - z-index
   * - overflow
   * - elementos da página aparecendo por cima
   * - tela duplicada/transparente
   * ==========================================================
   */

  const previewModal =
    open &&
    showPreview &&
    previewData.length > 0
      ? createPortal(
          <div
            className="fixed inset-0"
            style={{
              zIndex: 2147483647,
              isolation: "isolate",
            }}
            role="dialog"
            aria-modal="true"
            aria-label="Confirmar importação de notas fiscais"
          >
            {/* FUNDO TOTALMENTE OPACO */}

            <div
              className="absolute inset-0 bg-black"
              style={{
                opacity: 0.75,
              }}
              onClick={() => {
                if (
                  !importMutation.isPending
                ) {
                  handleCancel();
                  onOpenChange(false);
                }
              }}
            />

            {/* JANELA */}

            <div
              className="
                absolute
                inset-0
                flex
                items-center
                justify-center
                p-3
                sm:p-6
              "
            >
              <div
                className="
                  relative
                  flex
                  h-[92vh]
                  w-full
                  max-w-7xl
                  flex-col
                  overflow-hidden
                  rounded-xl
                  border
                  border-border
                  bg-background
                  text-foreground
                  shadow-2xl
                "
                style={{
                  opacity: 1,
                  isolation: "isolate",
                }}
                onClick={(event) =>
                  event.stopPropagation()
                }
              >
                {/* CABEÇALHO */}

                <div
                  className="
                    flex
                    shrink-0
                    items-start
                    justify-between
                    gap-4
                    border-b
                    bg-background
                    px-5
                    py-4
                    sm:px-6
                    sm:py-5
                  "
                >
                  <div>
                    <h2 className="text-lg font-semibold sm:text-xl">
                      Confirmar Importação de
                      Notas Fiscais
                    </h2>

                    <p className="mt-1 text-sm text-muted-foreground">
                      <strong className="text-foreground">
                        {previewData.length.toLocaleString(
                          "pt-BR"
                        )}
                      </strong>{" "}
                      nota(s) fiscal(is)
                      encontrada(s).
                      <br />
                      Confira os dados abaixo
                      antes de importar.
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={
                      importMutation.isPending
                    }
                    onClick={() => {
                      handleCancel();
                      onOpenChange(false);
                    }}
                    className="
                      inline-flex
                      h-9
                      w-9
                      shrink-0
                      items-center
                      justify-center
                      rounded-md
                      border
                      border-input
                      bg-background
                      text-muted-foreground
                      transition-colors
                      hover:bg-accent
                      hover:text-accent-foreground
                      disabled:pointer-events-none
                      disabled:opacity-50
                    "
                    aria-label="Fechar"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* PROGRESSO */}

                {importMutation.isPending && (
                  <div className="shrink-0 border-b bg-muted/30 px-5 py-4 sm:px-6">
                    <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                      <span>
                        Importando notas
                        fiscais...
                      </span>

                      <span className="font-medium">
                        {importProgress.toLocaleString(
                          "pt-BR"
                        )}{" "}
                        /{" "}
                        {previewData.length.toLocaleString(
                          "pt-BR"
                        )}
                      </span>
                    </div>

                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full bg-primary transition-all duration-300"
                        style={{
                          width: `${
                            previewData.length >
                            0
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

                {/* TABELA */}

                <div
                  className="
                    min-h-0
                    flex-1
                    overflow-auto
                    bg-background
                  "
                >
                  <table className="w-full min-w-[1100px] border-collapse text-sm">
                    <thead className="sticky top-0 z-20 bg-muted">
                      <tr className="border-b">
                        <th className="whitespace-nowrap px-3 py-3 text-left font-semibold">
                          #
                        </th>

                        <th className="whitespace-nowrap px-3 py-3 text-left font-semibold">
                          Data
                        </th>

                        <th className="whitespace-nowrap px-3 py-3 text-left font-semibold">
                          NF
                        </th>

                        <th className="whitespace-nowrap px-3 py-3 text-left font-semibold">
                          Fornecedor
                        </th>

                        <th className="px-3 py-3 text-left font-semibold">
                          Observação
                        </th>

                        <th className="whitespace-nowrap px-3 py-3 text-left font-semibold">
                          Identificação
                        </th>

                        <th className="whitespace-nowrap px-3 py-3 text-right font-semibold">
                          Valor
                        </th>

                        <th className="whitespace-nowrap px-3 py-3 text-left font-semibold">
                          Venc. 01
                        </th>

                        <th className="whitespace-nowrap px-3 py-3 text-left font-semibold">
                          Venc. 02
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {previewData
                        .slice(0, 50)
                        .map(
                          (
                            row,
                            idx
                          ) => (
                            <tr
                              key={`${row.nf}-${idx}`}
                              className="border-b bg-background hover:bg-muted/50"
                            >
                              <td className="px-3 py-2 text-muted-foreground">
                                {idx +
                                  1}
                              </td>

                              <td className="whitespace-nowrap px-3 py-2">
                                {row.data ??
                                  "—"}
                              </td>

                              <td className="px-3 py-2 font-medium">
                                {row.nf}
                              </td>

                              <td className="px-3 py-2">
                                {row.fornecedor ??
                                  "—"}
                              </td>

                              <td className="max-w-[280px] px-3 py-2">
                                <div
                                  className="truncate"
                                  title={
                                    row.observacao ??
                                    ""
                                  }
                                >
                                  {row.observacao ??
                                    "—"}
                                </div>
                              </td>

                              <td className="px-3 py-2">
                                {row.identificacao ??
                                  "—"}
                              </td>

                              <td className="whitespace-nowrap px-3 py-2 text-right">
                                {row.valor !==
                                null
                                  ? new Intl.NumberFormat(
                                      "pt-BR",
                                      {
                                        style:
                                          "currency",
                                        currency:
                                          "BRL",
                                      }
                                    ).format(
                                      row.valor
                                    )
                                  : "—"}
                              </td>

                              <td className="whitespace-nowrap px-3 py-2">
                                {row.venc01 ??
                                  "—"}
                              </td>

                              <td className="whitespace-nowrap px-3 py-2">
                                {row.venc02 ??
                                  "—"}
                              </td>
                            </tr>
                          )
                        )}
                    </tbody>
                  </table>
                </div>

                {/* AVISO */}

                {previewData.length >
                  50 && (
                  <div className="shrink-0 border-t bg-muted/30 px-5 py-3 text-sm text-muted-foreground sm:px-6">
                    Mostrando os primeiros{" "}
                    <strong className="text-foreground">
                      50
                    </strong>{" "}
                    registros.
                    <br />
                    Os{" "}
                    <strong className="text-foreground">
                      {previewData.length.toLocaleString(
                        "pt-BR"
                      )}
                    </strong>{" "}
                    registros serão
                    importados.
                  </div>
                )}

                {/* RODAPÉ */}

                <div
                  className="
                    flex
                    shrink-0
                    flex-col-reverse
                    gap-3
                    border-t
                    bg-background
                    px-5
                    py-4
                    sm:flex-row
                    sm:items-center
                    sm:justify-between
                    sm:px-6
                  "
                >
                  <button
                    type="button"
                    disabled={
                      importMutation.isPending
                    }
                    onClick={
                      handleCancel
                    }
                    className="
                      inline-flex
                      h-10
                      items-center
                      justify-center
                      rounded-md
                      border
                      border-input
                      bg-background
                      px-4
                      text-sm
                      font-medium
                      hover:bg-accent
                      hover:text-accent-foreground
                      disabled:pointer-events-none
                      disabled:opacity-50
                    "
                  >
                    Cancelar
                  </button>

                  <button
                    type="button"
                    disabled={
                      importMutation.isPending ||
                      previewData.length ===
                        0
                    }
                    onClick={() => {
                      if (
                        !importMutation.isPending
                      ) {
                        importMutation.mutate(
                          previewData
                        );
                      }
                    }}
                    className="
                      inline-flex
                      h-10
                      items-center
                      justify-center
                      rounded-md
                      bg-primary
                      px-5
                      text-sm
                      font-medium
                      text-primary-foreground
                      shadow
                      hover:bg-primary/90
                      disabled:pointer-events-none
                      disabled:opacity-50
                    "
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
          </div>,
          document.body
        )
      : null;

  /*
   * ==========================================================
   * INTERFACE
   * ==========================================================
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

      {previewModal}

      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          if (
            importMutation.isPending
          ) {
            return;
          }

          setPreviewData([]);
          setShowPreview(false);

          onOpenChange(true);

          setTimeout(() => {
            fileInput.current?.click();
          }, 50);
        }}
        className="gap-2"
        disabled={
          importMutation.isPending
        }
      >
        <Upload className="h-4 w-4" />

        Importar Excel
      </Button>
    </>
  );
}
