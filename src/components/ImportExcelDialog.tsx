import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Upload } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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

interface InvalidRow {
  line: number;
  nf: string;
  reason: string;
}

function normalizeColumnName(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, "");
}

/**
 * Valida se a data realmente existe.
 *
 * Evita problemas como:
 * 2024-00-29
 * 2024-02-31
 * 2024-13-10
 */
function createValidDate(
  year: number,
  month: number,
  day: number
): string | null {
  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day)
  ) {
    return null;
  }

  if (month < 1 || month > 12) {
    return null;
  }

  if (day < 1 || day > 31) {
    return null;
  }

  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(
    2,
    "0"
  )}`;
}

/**
 * Converte datas do Excel.
 */
function parseExcelDate(value: unknown): string | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  /**
   * Excel já entregou como Date
   */
  if (value instanceof Date) {
    if (isNaN(value.getTime())) {
      return null;
    }

    return createValidDate(
      value.getFullYear(),
      value.getMonth() + 1,
      value.getDate()
    );
  }

  /**
   * Número serial do Excel
   */
  if (typeof value === "number") {
    try {
      const parsed = XLSX.SSF.parse_date_code(value);

      if (!parsed) {
        return null;
      }

      return createValidDate(
        parsed.y,
        parsed.m,
        parsed.d
      );
    } catch {
      return null;
    }
  }

  if (typeof value !== "string") {
    return null;
  }

  const text = value.trim();

  if (!text) {
    return null;
  }

  /**
   * YYYY-MM-DD
   */
  let match = text.match(
    /^(\d{4})-(\d{1,2})-(\d{1,2})$/
  );

  if (match) {
    const [, year, month, day] = match;

    return createValidDate(
      Number(year),
      Number(month),
      Number(day)
    );
  }

  /**
   * DD/MM/YYYY ou DD/MM/YY
   */
  match = text.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/
  );

  if (match) {
    let [, day, month, year] = match;

    let numericYear = Number(year);

    if (year.length === 2) {
      numericYear =
        numericYear >= 50
          ? 1900 + numericYear
          : 2000 + numericYear;
    }

    return createValidDate(
      numericYear,
      Number(month),
      Number(day)
    );
  }

  /**
   * DD-MM-YYYY
   */
  match = text.match(
    /^(\d{1,2})-(\d{1,2})-(\d{2}|\d{4})$/
  );

  if (match) {
    let [, day, month, year] = match;

    let numericYear = Number(year);

    if (year.length === 2) {
      numericYear =
        numericYear >= 50
          ? 1900 + numericYear
          : 2000 + numericYear;
    }

    return createValidDate(
      numericYear,
      Number(month),
      Number(day)
    );
  }

  /**
   * Meses em português.
   */
  const months: Record<string, number> = {
    jan: 1,
    janeiro: 1,
    fev: 2,
    fevereiro: 2,
    mar: 3,
    marco: 3,
    março: 3,
    abr: 4,
    abril: 4,
    mai: 5,
    maio: 5,
    jun: 6,
    junho: 6,
    jul: 7,
    julho: 7,
    ago: 8,
    agosto: 8,
    set: 9,
    setembro: 9,
    out: 10,
    outubro: 10,
    nov: 11,
    novembro: 11,
    dez: 12,
    dezembro: 12,
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

    let year = Number(yearText);

    if (yearText.length === 2) {
      year =
        year >= 50
          ? 1900 + year
          : 2000 + year;
    }

    return createValidDate(
      year,
      month,
      Number(day)
    );
  }

  return null;
}

/**
 * Converte valores monetários brasileiros.
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

  let text = String(value)
    .replace(/R\$/gi, "")
    .replace(/\u00A0/g, "")
    .replace(/\s/g, "")
    .trim();

  if (!text) {
    return null;
  }

  /**
   * Brasileiro:
   * 1.011,00 -> 1011.00
   */
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

/**
 * Normaliza as linhas da planilha.
 */
function normalizeData(
  data: Record<string, unknown>[]
): {
  valid: ImportData[];
  invalid: InvalidRow[];
} {
  const valid: ImportData[] = [];
  const invalid: InvalidRow[] = [];

  data.forEach((row, index) => {
    const normalizedRow: Record<string, unknown> = {};

    Object.entries(row).forEach(
      ([key, value]) => {
        normalizedRow[
          normalizeColumnName(key)
        ] = value;
      }
    );

    const nf = String(
      normalizedRow.nf ?? ""
    ).trim();

    if (!nf) {
      return;
    }

    const rawData = normalizedRow.data;
    const parsedData = parseExcelDate(rawData);

    /**
     * Se existe uma data na planilha, mas ela
     * não pôde ser convertida, marca a linha como inválida.
     */
    if (
      rawData !== null &&
      rawData !== undefined &&
      rawData !== "" &&
      parsedData === null
    ) {
      invalid.push({
        line: index + 2,
        nf,
        reason: `Data de emissão inválida: ${String(
          rawData
        )}`,
      });

      return;
    }

    const venc01 = parseExcelDate(
      normalizedRow.venc01
    );

    const venc02 = parseExcelDate(
      normalizedRow.venc02
    );

    const venc03 = parseExcelDate(
      normalizedRow.venc03
    );

    const venc04 = parseExcelDate(
      normalizedRow.venc04
    );

    const venc05 = parseExcelDate(
      normalizedRow.venc05
    );

    valid.push({
      nf,
      data: parsedData,

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

      venc01,
      venc02,
      venc03,
      venc04,
      venc05,
    });
  });

  return {
    valid,
    invalid,
  };
}

/**
 * Cria uma chave para detectar duplicidade.
 */
function createDuplicateKey(
  row: ImportData
): string {
  return [
    row.nf.trim().toLowerCase(),
    (row.fornecedor ?? "")
      .trim()
      .toLowerCase(),
    row.valor ?? "",
    row.data ?? "",
  ].join("|");
}

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

  const [invalidRows, setInvalidRows] =
    useState<InvalidRow[]>([]);

  const [duplicateCount, setDuplicateCount] =
    useState(0);

  const [importProgress, setImportProgress] =
    useState(0);

  /**
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
            `Erro no lote iniciado no registro ${
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
      setInvalidRows([]);
      setDuplicateCount(0);
      setImportProgress(0);

      onOpenChange(false);
    },

    onError: (error) => {
      console.error(
        "Erro ao importar:",
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

  /**
   * ==========================================================
   * LEITURA DO EXCEL
   * ==========================================================
   */
  function handleFileSelect(
    event: React.ChangeEvent<HTMLInputElement>
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

    reader.onload = async (e) => {
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
            "Nenhum registro encontrado."
          );
          return;
        }

        /**
         * Verifica colunas.
         */
        const columns =
          Object.keys(json[0]).map(
            normalizeColumnName
          );

        const missingColumns =
          EXPECTED_COLUMNS.filter(
            (column) =>
              !columns.includes(column)
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

        /**
         * Normaliza.
         */
        const result =
          normalizeData(json);

        /**
         * Remove duplicidades dentro
         * da própria planilha.
         */
        const uniqueData: ImportData[] =
          [];

        const keys =
          new Set<string>();

        let duplicates = 0;

        result.valid.forEach(
          (row) => {
            const key =
              createDuplicateKey(row);

            if (keys.has(key)) {
              duplicates++;
              return;
            }

            keys.add(key);
            uniqueData.push(row);
          }
        );

        /**
         * Verifica duplicidades no banco.
         *
         * Como a tabela pode ter muitas notas,
         * fazemos consultas por NF.
         */
        const nfs = Array.from(
          new Set(
            uniqueData.map(
              (row) => row.nf
            )
          )
        );

        const existingKeys =
          new Set<string>();

        for (
          let i = 0;
          i < nfs.length;
          i += 500
        ) {
          const nfBatch =
            nfs.slice(i, i + 500);

          const { data: existing, error } =
            await supabase
              .from("notas_fiscais")
              .select(
                "nf, fornecedor, valor, data"
              )
              .in("nf", nfBatch);

          if (error) {
            console.error(
              "Erro consultando duplicidades:",
              error
            );

            throw new Error(
              `Erro ao verificar notas existentes: ${error.message}`
            );
          }

          (existing ?? []).forEach(
            (row) => {
              const key =
                [
                  String(
                    row.nf ?? ""
                  )
                    .trim()
                    .toLowerCase(),

                  String(
                    row.fornecedor ??
                      ""
                  )
                    .trim()
                    .toLowerCase(),

                  row.valor ?? "",

                  row.data ?? "",
                ].join("|");

              existingKeys.add(key);
            }
          );
        }

        /**
         * Remove notas que já existem.
         */
        const finalData =
          uniqueData.filter(
            (row) => {
              const key =
                createDuplicateKey(
                  row
                );

              if (
                existingKeys.has(
                  key
                )
              ) {
                duplicates++;
                return false;
              }

              return true;
            }
          );

        setPreviewData(
          finalData
        );

        setInvalidRows(
          result.invalid
        );

        setDuplicateCount(
          duplicates
        );

        if (
          finalData.length === 0
        ) {
          toast.warning(
            "Nenhuma nota nova para importar. As notas já existem ou possuem problemas."
          );
          return;
        }

        setShowPreview(true);

        toast.success(
          `${finalData.length.toLocaleString(
            "pt-BR"
          )} nota(s) pronta(s) para importação.`
        );
      } catch (error) {
        console.error(
          "Erro ao processar Excel:",
          error
        );

        toast.error(
          error instanceof Error
            ? error.message
            : "Erro ao ler a planilha."
        );
      }
    };

    reader.onerror = () => {
      toast.error(
        "Erro ao ler o arquivo."
      );
    };

    reader.readAsBinaryString(file);

    if (fileInput.current) {
      fileInput.current.value =
        "";
    }
  }

  /**
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
    setInvalidRows([]);
    setDuplicateCount(0);
    setImportProgress(0);
  }

  return (
    <>
      <input
        ref={fileInput}
        type="file"
        accept=".xlsx,.xls,.csv"
        onChange={handleFileSelect}
        className="hidden"
      />

      <AlertDialog
        open={
          open &&
          showPreview &&
          previewData.length > 0
        }
        onOpenChange={(value) => {
          if (!value) {
            handleCancel();
            onOpenChange(false);
          }
        }}
      >
        <AlertDialogContent className="max-w-6xl">
          <AlertDialogHeader>
            <AlertDialogTitle>
              Confirmar Importação
            </AlertDialogTitle>

            <AlertDialogDescription>
              <strong>
                {previewData.length.toLocaleString(
                  "pt-BR"
                )}
              </strong>{" "}
              nota(s) nova(s) serão
              importadas.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-md border p-3">
              <div className="text-sm text-muted-foreground">
                Prontas
              </div>

              <div className="text-xl font-bold">
                {previewData.length.toLocaleString(
                  "pt-BR"
                )}
              </div>
            </div>

            <div className="rounded-md border p-3">
              <div className="text-sm text-muted-foreground">
                Duplicadas
              </div>

              <div className="text-xl font-bold">
                {duplicateCount.toLocaleString(
                  "pt-BR"
                )}
              </div>
            </div>

            <div className="rounded-md border p-3">
              <div className="text-sm text-muted-foreground">
                Com erro
              </div>

              <div className="text-xl font-bold">
                {invalidRows.length.toLocaleString(
                  "pt-BR"
                )}
              </div>
            </div>
          </div>

          {invalidRows.length > 0 && (
            <div className="rounded-md border border-destructive p-3">
              <div className="font-medium">
                Linhas com problemas
              </div>

              <div className="max-h-32 overflow-auto text-sm mt-2">
                {invalidRows
                  .slice(0, 20)
                  .map(
                    (
                      item
                    ) => (
                      <div
                        key={`${item.line}-${item.nf}`}
                      >
                        Linha{" "}
                        {
                          item.line
                        }{" "}
                        — NF{" "}
                        {
                          item.nf
                        }{" "}
                        —{" "}
                        {
                          item.reason
                        }
                      </div>
                    )
                  )}

                {invalidRows.length >
                  20 && (
                  <div className="mt-1">
                    ... e mais{" "}
                    {(
                      invalidRows.length -
                      20
                    ).toLocaleString(
                      "pt-BR"
                    )}{" "}
                    linhas.
                  </div>
                )}
              </div>
            </div>
          )}

          {importMutation.isPending && (
            <div className="rounded-md border p-4">
              <div className="flex justify-between text-sm mb-2">
                <span>
                  Importando...
                </span>

                <span>
                  {importProgress.toLocaleString(
                    "pt-BR"
                  )}{" "}
                  /{" "}
                  {previewData.length.toLocaleString(
                    "pt-BR"
                  )}
                </span>
              </div>

              <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{
                    width: `${
                      previewData.length
                        ? (importProgress /
                            previewData.length) *
                          100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>
          )}

          <div className="max-h-[400px] overflow-auto border rounded-md">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-background border-b">
                <tr>
                  <th className="p-2 text-left">
                    #
                  </th>

                  <th className="p-2 text-left">
                    Data
                  </th>

                  <th className="p-2 text-left">
                    NF
                  </th>

                  <th className="p-2 text-left">
                    Fornecedor
                  </th>

                  <th className="p-2 text-left">
                    Observação
                  </th>

                  <th className="p-2 text-right">
                    Valor
                  </th>

                  <th className="p-2 text-left">
                    Venc. 01
                  </th>

                  <th className="p-2 text-left">
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
                      index
                    ) => (
                      <tr
                        key={`${row.nf}-${index}`}
                        className="border-b"
                      >
                        <td className="p-2">
                          {index +
                            1}
                        </td>

                        <td className="p-2">
                          {row.data ??
                            "—"}
                        </td>

                        <td className="p-2 font-medium">
                          {row.nf}
                        </td>

                        <td className="p-2">
                          {row.fornecedor ??
                            "—"}
                        </td>

                        <td className="p-2 max-w-[250px] truncate">
                          {row.observacao ??
                            "—"}
                        </td>

                        <td className="p-2 text-right">
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

                        <td className="p-2">
                          {row.venc01 ??
                            "—"}
                        </td>

                        <td className="p-2">
                          {row.venc02 ??
                            "—"}
                        </td>
                      </tr>
                    )
                  )}
              </tbody>
            </table>
          </div>

          {previewData.length >
            50 && (
            <div className="text-sm text-muted-foreground">
              Mostrando os primeiros{" "}
              <strong>
                50
              </strong>{" "}
              registros de{" "}
              <strong>
                {previewData.length.toLocaleString(
                  "pt-BR"
                )}
              </strong>
              .
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={
                importMutation.isPending
              }
              onClick={
                handleCancel
              }
            >
              Cancelar
            </AlertDialogCancel>

            <AlertDialogAction
              disabled={
                importMutation.isPending ||
                previewData.length ===
                  0
              }
              onClick={(
                event
              ) => {
                event.preventDefault();

                if (
                  !importMutation.isPending
                ) {
                  importMutation.mutate(
                    previewData
                  );
                }
              }}
            >
              {importMutation.isPending
                ? `Importando ${importProgress.toLocaleString(
                    "pt-BR"
                  )} / ${previewData.length.toLocaleString(
                    "pt-BR"
                  )}`
                : `Importar ${previewData.length.toLocaleString(
                    "pt-BR"
                  )} notas`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          onOpenChange(true);

          setPreviewData([]);
          setShowPreview(false);
          setInvalidRows([]);
          setDuplicateCount(0);
          setImportProgress(0);

          fileInput.current?.click();
        }}
        className="gap-2"
        disabled={
          importMutation.isPending
        }
      >
        <Upload className="w-4 h-4" />
        Importar Excel
      </Button>
    </>
  );
}
