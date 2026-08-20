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

/**
 * Normaliza o nome da coluna:
 * - remove acentos
 * - transforma em minúsculas
 * - remove espaços
 * - remove caracteres especiais
 */
function normalizeColumnName(value: string): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, "");
}

/**
 * Converte datas do Excel para YYYY-MM-DD.
 */
function parseExcelDate(value: unknown): string | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  // Data já reconhecida pelo XLSX como objeto Date
  if (value instanceof Date && !isNaN(value.getTime())) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  // Número serial de data do Excel
  if (typeof value === "number") {
    try {
      const date = XLSX.SSF.parse_date_code(value);

      if (date) {
        return `${date.y}-${String(date.m).padStart(2, "0")}-${String(
          date.d
        ).padStart(2, "0")}`;
      }
    } catch {
      return null;
    }
  }

  if (typeof value !== "string") {
    return null;
  }

  let text = value.trim();

  if (!text) {
    return null;
  }

  // Formato YYYY-MM-DD
  let match = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);

  if (match) {
    const [, year, month, day] = match;

    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(
      2,
      "0"
    )}`;
  }

  // Formato DD/MM/YYYY ou DD/MM/YY
  match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/);

  if (match) {
    let [, day, month, year] = match;

    if (year.length === 2) {
      year = Number(year) >= 50 ? `19${year}` : `20${year}`;
    }

    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(
      2,
      "0"
    )}`;
  }

  // Formato DD-MM-YYYY
  match = text.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);

  if (match) {
    const [, day, month, year] = match;

    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(
      2,
      "0"
    )}`;
  }

  // Meses abreviados em português:
  // 25-ago-20
  // 25-ago-2020
  const months: Record<string, string> = {
    jan: "01",
    janeiro: "01",
    fev: "02",
    fevereiro: "02",
    mar: "03",
    marco: "03",
    abril: "04",
    abr: "04",
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

  match = normalizedText.match(/^(\d{1,2})[-\/\s]([a-z]+)[-\/\s](\d{2}|\d{4})$/);

  if (match) {
    const [, day, monthText, yearText] = match;
    const month = months[monthText];

    if (month) {
      const year =
        yearText.length === 2
          ? Number(yearText) >= 50
            ? `19${yearText}`
            : `20${yearText}`
          : yearText;

      return `${year}-${month}-${String(day).padStart(2, "0")}`;
    }
  }

  return null;
}

/**
 * Converte valores monetários brasileiros:
 * R$ 608,00
 * 1.011,00
 * 608,00
 * 608.00
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
    .trim();

  // Número brasileiro: 1.011,00
  if (text.includes(",")) {
    text = text.replace(/\./g, "").replace(",", ".");
  }

  const number = Number(text);

  return Number.isFinite(number) ? number : null;
}

/**
 * Normaliza os dados da planilha.
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

        fornecedor: normalizedRow.fornecedor
          ? String(normalizedRow.fornecedor).trim()
          : null,

        identificacao: normalizedRow.identificacao
          ? String(normalizedRow.identificacao).trim()
          : null,

        valor: parseExcelValue(normalizedRow.valor),

        observacao: normalizedRow.observacao
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

  const importMutation = useMutation({
    mutationFn: async (data: ImportData[]) => {
      if (data.length === 0) {
        throw new Error("Nenhum dado válido para importar");
      }

      const { error } = await supabase
        .from("notas_fiscais")
        .insert(data);

      if (error) {
        throw error;
      }
    },

    onSuccess: (_, data) => {
      toast.success(
        `${data.length} nota(s) fiscal(is) importada(s) com sucesso!`
      );

      qc.invalidateQueries({
        queryKey: ["notas-fiscais"],
      });

      setPreviewData([]);

      onOpenChange(false);
    },

    onError: (error) => {
      console.error("Erro ao importar notas fiscais:", error);

      toast.error(
        error instanceof Error
          ? error.message
          : "Erro ao importar dados"
      );
    },
  });

  function handleFileSelect(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;

        if (!data) {
          toast.error("Não foi possível ler o arquivo");
          return;
        }

        const workbook = XLSX.read(data, {
          type: "binary",
          cellDates: true,
        });

        if (!workbook.SheetNames.length) {
          toast.error("Planilha vazia");
          return;
        }

        const worksheet =
          workbook.Sheets[workbook.SheetNames[0]];

        if (!worksheet) {
          toast.error("Planilha vazia");
          return;
        }

        const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(
          worksheet,
          {
            defval: null,
          }
        );

        if (json.length === 0) {
          toast.error("Planilha vazia");
          return;
        }

        /**
         * Normaliza os nomes das colunas antes da validação.
         *
         * Exemplo:
         * "Identificação" -> "identificacao"
         * "OBSERVAÇÃO"   -> "observacao"
         * "VENC01"       -> "venc01"
         * " VALOR "      -> "valor"
         */
        const firstRow = json[0];

        const columns = Object.keys(firstRow).map(
          normalizeColumnName
        );

        const missingColumns = EXPECTED_COLUMNS.filter(
          (column) => !columns.includes(column)
        );

        if (missingColumns.length > 0) {
          toast.error(
            `Colunas faltando: ${missingColumns.join(", ")}`
          );

          console.error("Colunas encontradas:", columns);
          console.error("Colunas faltando:", missingColumns);

          return;
        }

        const normalized = normalizeData(json);

        if (normalized.length === 0) {
          toast.error(
            "Nenhuma linha com NF válida encontrada"
          );

          return;
        }

        setPreviewData(normalized);

        toast.success(
          `${normalized.length} linha(s) encontrada(s) na planilha`
        );
      } catch (error) {
        console.error("Erro ao processar Excel:", error);

        toast.error(
          error instanceof Error
            ? error.message
            : "Erro ao ler arquivo Excel"
        );
      }
    };

    reader.onerror = () => {
      toast.error("Erro ao ler o arquivo");
    };

    reader.readAsBinaryString(file);

    if (fileInput.current) {
      fileInput.current.value = "";
    }
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
        open={open && previewData.length > 0}
        onOpenChange={(value) => {
          if (!value) {
            setPreviewData([]);
          }

          onOpenChange(value);
        }}
      >
        <AlertDialogContent className="max-w-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>
              Confirmar Importação
            </AlertDialogTitle>

            <AlertDialogDescription>
              {previewData.length} nota(s) fiscal(is)
              será(ão) importada(s).
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="max-h-96 overflow-y-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">
                    Identificação
                  </th>

                  <th className="text-left p-2">
                    Data
                  </th>

                  <th className="text-left p-2">
                    NF
                  </th>

                  <th className="text-left p-2">
                    Fornecedor
                  </th>

                  <th className="text-left p-2">
                    Valor
                  </th>

                  <th className="text-left p-2">
                    Venc. 01
                  </th>
                </tr>
              </thead>

              <tbody>
                {previewData
                  .slice(0, 10)
                  .map((row, idx) => (
                    <tr
                      key={idx}
                      className="border-b"
                    >
                      <td className="p-2">
                        {row.identificacao ?? "—"}
                      </td>

                      <td className="p-2">
                        {row.data ?? "—"}
                      </td>

                      <td className="p-2">
                        {row.nf}
                      </td>

                      <td className="p-2 text-muted-foreground">
                        {row.fornecedor ?? "—"}
                      </td>

                      <td className="p-2 text-muted-foreground">
                        {row.valor !== null
                          ? new Intl.NumberFormat(
                              "pt-BR",
                              {
                                style: "currency",
                                currency: "BRL",
                              }
                            ).format(row.valor)
                          : "—"}
                      </td>

                      <td className="p-2">
                        {row.venc01 ?? "—"}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>

            {previewData.length > 10 && (
              <p className="text-xs text-muted-foreground p-2">
                ... e mais {previewData.length - 10} linhas
              </p>
            )}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setPreviewData([]);
              }}
            >
              Cancelar
            </AlertDialogCancel>

            <AlertDialogAction
              onClick={() => {
                importMutation.mutate(previewData);
              }}
              disabled={importMutation.isPending}
            >
              {importMutation.isPending
                ? "Importando..."
                : "Importar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Button
        variant="outline"
        size="sm"
        onClick={() => fileInput.current?.click()}
        className="gap-2"
      >
        <Upload className="w-4 h-4" />
        Importar Excel
      </Button>
    </>
  );
}
