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

/*
 * ============================================================
 * COLUNAS DA PLANILHA
 * ============================================================
 *
 * A planilha deve possuir estas colunas:
 *
 * DATA
 * NF
 * FORNECEDOR
 * OBSERVAÇÃO
 * IDENTIFICAÇÃO
 * VALOR
 * VENC01
 * VENC02
 * VENC03
 * VENC04
 * VENC05
 *
 * Os nomes podem estar em maiúsculas, minúsculas,
 * com acentos ou espaços.
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

/*
 * Quantidade de registros enviados ao Supabase por vez.
 */
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
 * NORMALIZAÇÃO DOS NOMES DAS COLUNAS
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
 * CONVERSÃO DE DATAS
 * ============================================================
 *
 * Aceita:
 *
 * 10/08/20
 * 10/08/2020
 * 25-ago-20
 * 25-ago-2020
 * 03-set-20
 * 02/10/2020
 * 2020-08-10
 *
 * Também aceita datas convertidas pelo XLSX
 * para Date ou número serial do Excel.
 */

function parseExcelDate(value: unknown): string | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  /*
   * Objeto Date
   */
  if (value instanceof Date && !isNaN(value.getTime())) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  /*
   * Número serial do Excel
   */
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

  const text = value.trim();

  if (!text) {
    return null;
  }

  /*
   * YYYY-MM-DD
   */
  let match = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);

  if (match) {
    const [, year, month, day] = match;

    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(
      2,
      "0"
    )}`;
  }

  /*
   * DD/MM/YYYY ou DD/MM/YY
   */
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

  /*
   * DD-MM-YYYY
   */
  match = text.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);

  if (match) {
    const [, day, month, year] = match;

    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(
      2,
      "0"
    )}`;
  }

  /*
   * Meses em português
   */
  const months: Record<string, string> = {
    jan: "01",
    janeiro: "01",

    fev: "02",
    fevereiro: "02",

    mar: "03",
    marco: "03",
    março: "03",

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

/*
 * ============================================================
 * CONVERSÃO DE VALORES
 * ============================================================
 *
 * Aceita:
 *
 * R$ 608,00
 * R$ 417,51
 * 1.011,00
 * 608,00
 * 608.00
 * 608
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
    .replace(/\u00A0/g, "")
    .trim();

  /*
   * Exemplo:
   *
   * 1.011,00
   *
   * vira:
   *
   * 1011.00
   */
  if (text.includes(",")) {
    text = text.replace(/\./g, "").replace(",", ".");
  }

  const number = Number(text);

  return Number.isFinite(number) ? number : null;
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

  const qc = useQueryClient();

  const [previewData, setPreviewData] = useState<ImportData[]>([]);

  /*
   * Controla separadamente a janela de confirmação.
   *
   * Isso corrige o problema em que o Excel era lido,
   * aparecia "linhas encontradas", mas a janela não abria.
   */
  const [showPreview, setShowPreview] = useState(false);

  /*
   * Quantidade de registros já importados.
   */
  const [importProgress, setImportProgress] = useState(0);

  /*
   * ==========================================================
   * IMPORTAÇÃO PARA O SUPABASE
   * ==========================================================
   */

  const importMutation = useMutation({
    mutationFn: async (data: ImportData[]) => {
      if (data.length === 0) {
        throw new Error("Nenhum dado válido para importar.");
      }

      let imported = 0;

      /*
       * Divide os 13.267 registros em lotes.
       *
       * Exemplo:
       *
       * lote 1 = 500
       * lote 2 = 500
       * ...
       */
      for (let i = 0; i < data.length; i += BATCH_SIZE) {
        const batch = data.slice(i, i + BATCH_SIZE);

        const { error } = await supabase
          .from("notas_fiscais")
          .insert(batch);

        if (error) {
          console.error("Erro Supabase:", error);

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

      /*
       * Atualiza a lista da tela.
       */
      qc.invalidateQueries({
        queryKey: ["notas-fiscais"],
      });

      setPreviewData([]);
      setShowPreview(false);
      setImportProgress(0);

      onOpenChange(false);
    },

    onError: (error) => {
      console.error("Erro ao importar notas fiscais:", error);

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
   * LEITURA DO ARQUIVO
   * ==========================================================
   */

  function handleFileSelect(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    /*
     * Mostra imediatamente que estamos processando.
     */
    toast.info("Lendo a planilha...");

    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;

        if (!data) {
          toast.error("Não foi possível ler o arquivo.");
          return;
        }

        /*
         * Lê XLSX, XLS ou CSV.
         */
        const workbook = XLSX.read(data, {
          type: "binary",
          cellDates: true,
        });

        if (!workbook.SheetNames.length) {
          toast.error("Planilha vazia.");
          return;
        }

        /*
         * Primeira aba.
         */
        const worksheet =
          workbook.Sheets[workbook.SheetNames[0]];

        if (!worksheet) {
          toast.error("Planilha vazia.");
          return;
        }

        /*
         * Converte para objetos.
         *
         * defval: null
         * mantém células vazias.
         */
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
         * ======================================================
         * VERIFICA COLUNAS
         * ======================================================
         */

        const firstRow = json[0];

        const columns = Object.keys(firstRow).map(
          normalizeColumnName
        );

        console.log(
          "Colunas encontradas na planilha:",
          columns
        );

        const missingColumns =
          EXPECTED_COLUMNS.filter(
            (column) => !columns.includes(column)
          );

        if (missingColumns.length > 0) {
          console.error(
            "Colunas encontradas:",
            columns
          );

          console.error(
            "Colunas faltando:",
            missingColumns
          );

          toast.error(
            `Colunas faltando: ${missingColumns.join(
              ", "
            )}`
          );

          return;
        }

        /*
         * ======================================================
         * NORMALIZA OS DADOS
         * ======================================================
         */

        const normalized = normalizeData(json);

        if (normalized.length === 0) {
          toast.error(
            "Nenhuma linha com NF válida encontrada."
          );

          return;
        }

        /*
         * Guarda os dados para confirmação.
         */
        setPreviewData(normalized);

        /*
         * ABRE A JANELA DE CONFIRMAÇÃO.
         *
         * Esta é a correção principal.
         */
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
      toast.error("Erro ao ler o arquivo.");
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
   * CANCELAR PREVIEW
   * ==========================================================
   */

  function handleCancelPreview() {
    setPreviewData([]);
    setShowPreview(false);
    setImportProgress(0);
  }

  /*
   * ==========================================================
   * INTERFACE
   * ==========================================================
   */

  return (
    <>
      {/* Campo oculto para selecionar o Excel */}
      <input
        ref={fileInput}
        type="file"
        accept=".xlsx,.xls,.csv"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* ======================================================
          JANELA DE CONFIRMAÇÃO
          ====================================================== */}

      <AlertDialog
        open={open && showPreview && previewData.length > 0}
        onOpenChange={(value) => {
          if (!value && !importMutation.isPending) {
            handleCancelPreview();
          }

          if (!value) {
            onOpenChange(false);
          }
        }}
      >
        <AlertDialogContent className="max-w-6xl">
          <AlertDialogHeader>
            <AlertDialogTitle>
              Confirmar Importação de Notas Fiscais
            </AlertDialogTitle>

            <AlertDialogDescription>
              <strong>
                {previewData.length.toLocaleString(
                  "pt-BR"
                )}
              </strong>{" "}
              nota(s) fiscal(is) encontrada(s).
              <br />
              Confira os dados abaixo antes de importar.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {/* ==================================================
              PROGRESSO DA IMPORTAÇÃO
              ================================================== */}

          {importMutation.isPending && (
            <div className="rounded-md border p-4 bg-muted/30">
              <div className="flex justify-between text-sm mb-2">
                <span>
                  Importando notas fiscais...
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

              <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{
                    width: `${
                      previewData.length > 0
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

          {/* ==================================================
              PRÉ-VISUALIZAÇÃO
              ================================================== */}

          <div className="max-h-[450px] overflow-auto border rounded-md">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-background border-b">
                <tr>
                  <th className="text-left p-2">
                    #
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
                    Observação
                  </th>

                  <th className="text-left p-2">
                    Identificação
                  </th>

                  <th className="text-right p-2">
                    Valor
                  </th>

                  <th className="text-left p-2">
                    Venc. 01
                  </th>

                  <th className="text-left p-2">
                    Venc. 02
                  </th>
                </tr>
              </thead>

              <tbody>
                {previewData
                  .slice(0, 50)
                  .map((row, idx) => (
                    <tr
                      key={idx}
                      className="border-b hover:bg-muted/40"
                    >
                      <td className="p-2 text-muted-foreground">
                        {idx + 1}
                      </td>

                      <td className="p-2">
                        {row.data ?? "—"}
                      </td>

                      <td className="p-2 font-medium">
                        {row.nf}
                      </td>

                      <td className="p-2">
                        {row.fornecedor ?? "—"}
                      </td>

                      <td className="p-2 max-w-[250px] truncate">
                        {row.observacao ?? "—"}
                      </td>

                      <td className="p-2">
                        {row.identificacao ?? "—"}
                      </td>

                      <td className="p-2 text-right">
                        {row.valor !== null
                          ? new Intl.NumberFormat(
                              "pt-BR",
                              {
                                style:
                                  "currency",
                                currency:
                                  "BRL",
                              }
                            ).format(row.valor)
                          : "—"}
                      </td>

                      <td className="p-2">
                        {row.venc01 ?? "—"}
                      </td>

                      <td className="p-2">
                        {row.venc02 ?? "—"}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {/* ==================================================
              AVISO DE MAIS REGISTROS
              ================================================== */}

          {previewData.length > 50 && (
            <div className="text-sm text-muted-foreground">
              Mostrando os primeiros{" "}
              <strong>50</strong> registros.
              <br />
              Os{" "}
              <strong>
                {previewData.length.toLocaleString(
                  "pt-BR"
                )}
              </strong>{" "}
              registros serão importados.
            </div>
          )}

          {/* ==================================================
              BOTÕES
              ================================================== */}

          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={importMutation.isPending}
              onClick={handleCancelPreview}
            >
              Cancelar
            </AlertDialogCancel>

            <AlertDialogAction
              disabled={
                importMutation.isPending ||
                previewData.length === 0
              }
              onClick={(event) => {
                /*
                 * Evita o AlertDialog fechar
                 * imediatamente quando começa a importação.
                 */
                event.preventDefault();

                if (!importMutation.isPending) {
                  importMutation.mutate(previewData);
                }
              }}
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
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ======================================================
          BOTÃO IMPORTAR EXCEL
          ====================================================== */}

      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          /*
           * Garante que a janela esteja aberta
           * antes de selecionar o arquivo.
           */
          onOpenChange(true);

          setShowPreview(false);
          setPreviewData([]);

          fileInput.current?.click();
        }}
        className="gap-2"
        disabled={importMutation.isPending}
      >
        <Upload className="w-4 h-4" />
        Importar Excel
      </Button>
    </>
  );
}
