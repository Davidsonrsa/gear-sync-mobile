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

function parseExcelDate(excelDate: any): string | null {
  if (!excelDate) return null;
  
  // Se é um número (data do Excel)
  if (typeof excelDate === "number") {
    const date = new Date((excelDate - 25569) * 86400 * 1000);
    return date.toISOString().split("T")[0];
  }
  
  // Se é string, tenta parsear
  if (typeof excelDate === "string") {
    // Tenta formato DD/MM/YYYY
    const match = excelDate.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (match) {
      const [, day, month, year] = match;
      return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
    
    // Tenta formato YYYY-MM-DD
    if (excelDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return excelDate;
    }
  }
  
  return null;
}

function normalizeData(data: any[]): ImportData[] {
  return data
    .map((row) => ({
      nf: String(row.nf ?? "").trim(),
      data: parseExcelDate(row.data),
      fornecedor: row.fornecedor ? String(row.fornecedor).trim() : null,
      identificacao: row.identificacao
        ? String(row.identificacao).trim()
        : null,
      valor: row.valor ? parseFloat(row.valor) : null,
      observacao: row.observacao ? String(row.observacao).trim() : null,
      venc01: parseExcelDate(row.venc01),
      venc02: parseExcelDate(row.venc02),
      venc03: parseExcelDate(row.venc03),
      venc04: parseExcelDate(row.venc04),
      venc05: parseExcelDate(row.venc05),
    }))
    .filter((row) => row.nf); // Filtra linhas sem NF
}

export function ImportExcelDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
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
      toast.success(`${data.length} nota(s) fiscal(is) importada(s) com sucesso!`);
      qc.invalidateQueries({ queryKey: ["notas-fiscais"] });
      setPreviewData([]);
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Erro ao importar dados"
      );
    },
  });

  function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: "binary" });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];

        if (!worksheet) {
          toast.error("Planilha vazia");
          return;
        }

        const json = XLSX.utils.sheet_to_json(worksheet);

        // Validar colunas
        if (json.length === 0) {
          toast.error("Planilha vazia");
          return;
        }

        const firstRow = json[0] as Record<string, unknown>;
        const columns = Object.keys(firstRow).map((c) => c.toLowerCase());
        const missingColumns = EXPECTED_COLUMNS.filter(
          (col) => !columns.includes(col)
        );

        if (missingColumns.length > 0) {
          toast.error(
            `Colunas faltando: ${missingColumns.join(", ")}`
          );
          return;
        }

        const normalized = normalizeData(
          json.map((row: any) => {
            const normalized: Record<string, any> = {};
            Object.keys(row).forEach((key) => {
              normalized[key.toLowerCase()] = row[key];
            });
            return normalized;
          })
        );

        if (normalized.length === 0) {
          toast.error("Nenhuma linha com NF válida encontrada");
          return;
        }

        setPreviewData(normalized);
      };
      reader.readAsBinaryString(file);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao ler arquivo"
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

      <AlertDialog open={open && previewData.length > 0} onOpenChange={onOpenChange}>
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Importação</AlertDialogTitle>
            <AlertDialogDescription>
              {previewData.length} nota(s) fiscal(is) será(ão) importada(s).
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="max-h-96 overflow-y-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">NF</th>
                  <th className="text-left p-2">Fornecedor</th>
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
                      {row.valor
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
