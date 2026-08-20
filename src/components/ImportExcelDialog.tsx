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
 * Normaliza nomes de colunas:
 * - remove acentos
 * - remove espaços
 * - remove pontuação
 * - converte para minúsculas
 */
function normalizeColumnName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

/**
 * Converte datas do Excel para YYYY-MM-DD.
 */
function parseExcelDate(value: any): string | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  // Data JavaScript
  if (value instanceof Date && !isNaN(value.getTime())) {
    return value.toISOString().split("T")[0];
  }

  // Número serial do Excel
  if (typeof value === "number") {
    const date = XLSX.SSF.parse_date_code(value);

    if (date) {
      return `${date.y}-${String(date.m).padStart(2, "0")}-${String(
        date.d
      ).padStart(2, "0")}`;
    }

    return null;
  }

  const text = String(value).trim();

  if (!text) return null;

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return text;
  }

  // DD/MM/YYYY ou DD/MM/YY
  let match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);

  if (match) {
    let [, day, month, year] = match;

    if (year.length === 2) {
      const yearNumber = Number(year);
      year = yearNumber >= 50 ? `19${year}` : `20${year}`;
    }

    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(
      2,
      "0"
    )}`;
  }

  // DD-MM-YYYY ou DD-MM-YY
  match = text.match(/^(\d{1,2})-(\d{1,2})-(\d{2,4})$/);

  if (match) {
    let [, day, month, year] = match;

    if (year.length === 2) {
      const yearNumber = Number(year);
      year = yearNumber >= 50 ? `19${year}` : `20${year}`;
    }

    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(
      2,
      "0"
    )}`;
  }

  // Datas como 25-ago-20
  const months: Record<string, string> = {
    jan: "01",
    fev: "02",
    mar: "03",
    abr: "04",
    mai: "05",
    jun: "06",
    jul: "07",
    ago: "08",
    set: "09",
    out: "10",
    nov: "11",
    dez: "12",
  };

  match = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .match(/^(\d{1,2})-([a-z]{3})-(\d{2,4})$/);

  if (match) {
    let [, day, monthText, year] = match;
    const month = months[monthText];

    if (!month) return null;

    if (year.length === 2) {
      const yearNumber = Number(year);
      year = yearNumber >= 50 ? `19${year}` : `20${year}`;
    }

    return `${year}-${month}-${String(day).padStart(2, "0")}`;
  }

  return null;
}

/**
 * Converte valores brasileiros:
 * R$ 1.011,00
 * 1.011,00
 * 608,00
 * 608.00
 */
function parseExcelValue(value: any): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  let text = String(value)
    .trim()
    .replace(/\s/g, "")
    .replace(/R\$/gi, "");

  if (!text) return null;

  // Formato brasileiro: 1.011,00
  if (text.includes(",")) {
    text = text.replace(/\./g, "").replace(",", ",");
    text = text.replace(",", ".");
  }

  const number = Number(text);

  return Number.isFinite(number) ? number : null;
}

function normalizeData(data: any[]): ImportData[] {
  return data
    .map((row) => ({
      nf: String(row.nf ?? "").trim(),

      data: parseExcelDate(row.data),

      fornecedor: row.fornecedor
        ? String(row.fornecedor).trim()
        : null,

      identificacao:
        row.identificacao !== null &&
        row.identificacao !== undefined &&
        row.identificacao !== ""
          ? String(row.identificacao).trim()
          : null,

      valor: parseExcelValue(row.valor),

      observacao: row.observacao
        ? String(row.observacao).trim()
        : null,

      venc01: parseExcelDate(row.venc01),
      venc02: parseExcelDate(row.venc02),
      venc03: parseExcelDate(row.venc03),
      venc04: parseExcelDate(row.venc04),
      venc05: parseExcelDate(row.venc05),
    }))
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

      if (error) throw error;
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

    if (!file) return;

    try {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = e.target?.result;

          const workbook = XLSX.read(data, {
            type: "binary",
            cellDates: true,
          });

          const worksheet =
            workbook.Sheets[workbook.SheetNames[0]];

          if (!worksheet) {
            toast.error("Planilha vazia");
            return;
          }

          /*
           * raw: false faz o XLSX respeitar a forma como
           * os valores aparecem no Excel.
           */
          const json = XLSX.utils.sheet_to_json(worksheet, {
            defval: "",
            raw: false,
          });

          if (json.length === 0) {
            toast.error("Planilha vazia");
            return;
          }

          /*
           * Cria um mapa de colunas:
           *
           * Identificação -> identificacao
           * OBSERVAÇÃO   -> observacao
           * VALOR        -> valor
           * VENC01       -> venc01
           */
          const firstRow = json[0] as Record<string, unknown>;

          const columnMap: Record<string, string> = {};

          Object.keys(firstRow).forEach((originalColumn) => {
            const normalized = normalizeColumnName(originalColumn);

            if (normalized === "nf") {
              columnMap[originalColumn] = "nf";
            } else if (normalized === "data") {
              columnMap[originalColumn] = "data";
            } else if (normalized === "fornecedor") {
              columnMap[originalColumn] = "fornecedor";
            } else if (normalized === "identificacao") {
              columnMap[originalColumn] = "identificacao";
            } else if (normalized === "valor") {
              columnMap[originalColumn] = "valor";
            } else if (
              normalized === "observacao" &&
              !Object.values(columnMap).includes("observacao")
            ) {
              /*
               * Sua planilha possui duas colunas OBSERVAÇÃO.
               * Usamos somente a primeira.
               */
              columnMap[originalColumn] = "observacao";
            } else if (normalized === "venc01") {
              columnMap[originalColumn] = "venc01";
            } else if (normalized === "venc02") {
              columnMap[originalColumn] = "venc02";
            } else if (normalized === "venc03") {
              columnMap[originalColumn] = "venc03";
            } else if (normalized === "venc04") {
              columnMap[originalColumn] = "venc04";
            } else if (normalized === "venc05") {
              columnMap[originalColumn] = "venc05";
            }
          });

          const foundColumns = Object.values(columnMap);

          const missingColumns = EXPECTED_COLUMNS.filter(
            (column) => !foundColumns.includes(column)
          );

          if (missingColumns.length > 0) {
            toast.error(
              `Colunas faltando: ${missingColumns.join(", ")}`
            );
            return;
          }

          /*
           * Converte todas as linhas para os nomes esperados
           * pelo banco de dados.
           */
          const normalizedRows = json.map((row: any) => {
            const normalizedRow: Record<string, any> = {};

            Object.keys(row).forEach((originalColumn) => {
              const targetColumn = columnMap[originalColumn];

              if (targetColumn) {
                normalizedRow[targetColumn] = row[originalColumn];
              }
            });

            return normalizedRow;
          });

          const normalized = normalizeData(normalizedRows);

          if (normalized.length === 0) {
            toast.error(
              "Nenhuma linha com NF válida encontrada"
            );
            return;
          }

          setPreviewData(normalized);
        } catch (error) {
          toast.error(
            error instanceof Error
              ? error.message
              : "Erro ao processar a planilha"
          );
        }
      };

      reader.readAsBinaryString(file);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Erro ao ler arquivo"
      );
    }

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
        onOpenChange={onOpenChange}
      >
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>
              Confirmar Importação
            </AlertDialogTitle>

            <AlertDialogDescription>
              {previewData.length} nota(s) fiscal(is) será(ão)
              importada(s).
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="max-h-96 overflow-y-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">NF</th>
                  <th className="text-left p-2">
                    Fornecedor
                  </th>
                  <th className="text-left p-2">Valor</th>
                </tr>
              </thead>

              <tbody>
                {previewData.slice(0, 10).map((row, idx) => (
                  <tr key={idx} className="border-b">
                    <td className="p-2">{row.nf}</td>

                    <td className="p-2 text-muted-foreground">
                      {row.fornecedor ?? "—"}
                    </td>

                    <td className="p-2 text-muted-foreground">
                      {row.valor !== null
                        ? new Intl.NumberFormat("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          }).format(row.valor)
                        : "—"}
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
              Importar
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
