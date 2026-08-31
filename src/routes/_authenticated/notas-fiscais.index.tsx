import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import {
  Search,
  PlusCircle,
  FileSpreadsheet,
  Eye,
  Filter,
  Loader2,
  Calendar,
  Building2,
  Truck,
  FileText,
  MapPin,
  Trash2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/notas-fiscais/")({
  component: NotasFiscaisPage,
});

/* ============================================================================
   TIPOS
============================================================================ */

interface NotaFiscalItem {
  id: string;
  nf: string;
  fornecedor: string;
  identificacao: string;
  cl: string;
  data: string;
  valor: number;
  descricao_produto: string;
  observacao: string;
  venc01: string | null;
  venc02: string | null;
  venc03: string | null;
  venc04: string | null;
  venc05: string | null;
}

/* ============================================================================
   CONSTANTES
============================================================================ */

/*
 * Importação em lotes.
 *
 * 200 é propositalmente conservador para evitar:
 * - travamento do navegador;
 * - requisições muito grandes;
 * - timeout no Supabase;
 * - erro ao importar milhares de registros de uma vez.
 */
const IMPORT_BATCH_SIZE = 200;

/* ============================================================================
   HELPERS
============================================================================ */

/**
 * Normaliza nomes de colunas do Excel.
 *
 * Exemplo:
 * "Número NF"       -> "numeronf"
 * "NÚMERO NF"       -> "numeronf"
 * "Número da NF"    -> "numerodanF" normalizado
 * "Data de Emissão" -> "datadeemissao"
 */
function normalizeHeader(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

/**
 * Verifica se uma data é válida.
 */
function isValidDate(
  year: number,
  month: number,
  day: number,
): boolean {
  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day)
  ) {
    return false;
  }

  if (
    year < 1900 ||
    year > 2200 ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return false;
  }

  const date = new Date(year, month - 1, day);

  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

/**
 * Converte valores de data vindos do Excel para YYYY-MM-DD.
 *
 * Aceita:
 * - Date
 * - número serial do Excel
 * - YYYY-MM-DD
 * - DD/MM/YYYY
 * - DD/MM/YY
 * - textos com horário
 */
function parseExcelDate(value: unknown): string | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  /* Date */
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      return null;
    }

    const year = value.getFullYear();
    const month = value.getMonth() + 1;
    const day = value.getDate();

    return isValidDate(year, month, day)
      ? `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(
          2,
          "0",
        )}`
      : null;
  }

  /* Número serial do Excel */
  if (typeof value === "number" && Number.isFinite(value)) {
    const excelEpoch = new Date(1899, 11, 30);

    const jsDate = new Date(
      excelEpoch.getTime() +
        value * 24 * 60 * 60 * 1000,
    );

    const year = jsDate.getFullYear();
    const month = jsDate.getMonth() + 1;
    const day = jsDate.getDate();

    return isValidDate(year, month, day)
      ? `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(
          2,
          "0",
        )}`
      : null;
  }

  if (typeof value !== "string") {
    return null;
  }

  let text = value.trim();

  if (!text) {
    return null;
  }

  /*
   * Remove horário quando vier algo como:
   * 31/08/2026 00:00:00
   */
  text = text.split(" ")[0];

  /* Número serial armazenado como texto */
  if (/^\d+$/.test(text)) {
    const number = Number(text);

    const excelEpoch = new Date(1899, 11, 30);

    const jsDate = new Date(
      excelEpoch.getTime() +
        number * 24 * 60 * 60 * 1000,
    );

    const year = jsDate.getFullYear();
    const month = jsDate.getMonth() + 1;
    const day = jsDate.getDate();

    return isValidDate(year, month, day)
      ? `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(
          2,
          "0",
        )}`
      : null;
  }

  /* YYYY-MM-DD */
  let match = text.match(
    /^(\d{4})-(\d{1,2})-(\d{1,2})$/,
  );

  if (match) {
    const [, y, m, d] = match;

    const year = Number(y);
    const month = Number(m);
    const day = Number(d);

    return isValidDate(year, month, day)
      ? `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(
          2,
          "0",
        )}`
      : null;
  }

  /* DD/MM/YYYY ou DD/MM/YY */
  match = text.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/,
  );

  if (match) {
    const day = Number(match[1]);
    const month = Number(match[2]);

    let year = match[3];

    if (year.length === 2) {
      year =
        Number(year) >= 50
          ? `19${year}`
          : `20${year}`;
    }

    const yearNumber = Number(year);

    return isValidDate(
      yearNumber,
      month,
      day,
    )
      ? `${yearNumber}-${String(month).padStart(
          2,
          "0",
        )}-${String(day).padStart(2, "0")}`
      : null;
  }

  return null;
}

/**
 * Converte valores monetários.
 *
 * Aceita:
 * 1234.56
 * "1234.56"
 * "1.234,56"
 * "R$ 1.234,56"
 * "R$ 500,00"
 */
function parseExcelValue(value: unknown): number {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return 0;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  let text = String(value)
    .trim()
    .replace(/R\$/gi, "")
    .replace(/\s/g, "")
    .replace(/\u00a0/g, "");

  if (!text) {
    return 0;
  }

  /*
   * Formato brasileiro:
   * 1.234,56
   */
  if (text.includes(",") && text.includes(".")) {
    text = text
      .replace(/\./g, "")
      .replace(",", ".");
  } else if (text.includes(",")) {
    text = text.replace(",", ".");
  }

  const number = Number(text);

  return Number.isFinite(number) ? number : 0;
}

/**
 * Converte qualquer valor para texto.
 */
function parseText(value: unknown): string {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  return String(value).trim();
}

/**
 * Converte NF sem transformar valores numéricos em "123.00".
 */
function parseNumeroNF(value: unknown): string {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "";
  }

  if (typeof value === "number") {
    if (Number.isInteger(value)) {
      return String(value);
    }

    return String(value).replace(/\.0+$/, "");
  }

  return String(value).trim();
}

/**
 * Procura um valor em uma linha do Excel usando vários nomes possíveis.
 */
function getExcelValue(
  row: Record<string, unknown>,
  aliases: string[],
): unknown {
  const normalizedAliases = aliases.map(normalizeHeader);

  for (const key of Object.keys(row)) {
    const normalizedKey = normalizeHeader(key);

    if (normalizedAliases.includes(normalizedKey)) {
      return row[key];
    }
  }

  return null;
}

/**
 * Formata moeda.
 */
function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value || 0);
}

/**
 * Formata data YYYY-MM-DD para DD/MM/YYYY.
 */
function formatDate(dateStr: unknown): string {
  if (
    !dateStr ||
    dateStr === "—"
  ) {
    return "";
  }

  try {
    const cleanDate = String(dateStr).split("T")[0];

    const parts = cleanDate.split("-");

    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }

    return String(dateStr);
  } catch {
    return String(dateStr);
  }
}

/* ============================================================================
   COMPONENTE
============================================================================ */

function NotasFiscaisPage() {
  /* --------------------------------------------------------------------------
     MODAIS
  -------------------------------------------------------------------------- */

  const [openModalCadastro, setOpenModalCadastro] =
    useState(false);

  const [openModalDetalhes, setOpenModalDetalhes] =
    useState(false);

  const [notaSelecionada, setNotaSelecionada] =
    useState<NotaFiscalItem | null>(null);

  /* --------------------------------------------------------------------------
     DADOS
  -------------------------------------------------------------------------- */

  const [notasList, setNotasList] =
    useState<NotaFiscalItem[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [submitting, setSubmitting] =
    useState(false);

  /* --------------------------------------------------------------------------
     IMPORTAÇÃO
  -------------------------------------------------------------------------- */

  const [importing, setImporting] =
    useState(false);

  const [importProgress, setImportProgress] =
    useState(0);

  const [importTotal, setImportTotal] =
    useState(0);

  const fileInputRef =
    useRef<HTMLInputElement>(null);

  /* --------------------------------------------------------------------------
     FILTROS
  -------------------------------------------------------------------------- */

  const [busca, setBusca] =
    useState("");

  const [dataInicio, setDataInicio] =
    useState("");

  const [dataFim, setDataFim] =
    useState("");

  /* --------------------------------------------------------------------------
     FORMULÁRIO
  -------------------------------------------------------------------------- */

  const [numeroNf, setNumeroNf] =
    useState("");

  const [fornecedor, setFornecedor] =
    useState("");

  const [equipamento, setEquipamento] =
    useState("");

  const [cl, setCl] =
    useState("");

  const [emissao, setEmissao] =
    useState("");

  const [valorTotal, setValorTotal] =
    useState("");

  const [descricaoProduto, setDescricaoProduto] =
    useState("");

  const [venc01, setVenc01] =
    useState("");

  const [venc02, setVenc02] =
    useState("");

  const [venc03, setVenc03] =
    useState("");

  const [venc04, setVenc04] =
    useState("");

  const [venc05, setVenc05] =
    useState("");

  const [observacao, setObservacao] =
    useState("");

  /* ==========================================================================
     BUSCAR NOTAS
  ========================================================================== */

  const fetchNotas = async () => {
    setLoading(true);

    try {
      const { data, error } =
        await supabase
          .from("notas_fiscais")
          .select(
            `
              id,
              nf,
              fornecedor,
              identificacao,
              cl,
              data,
              valor,
              descricao_produto,
              observacao,
              venc01,
              venc02,
              venc03,
              venc04,
              venc05
            `,
          )
          .order("created_at", {
            ascending: false,
          });

      if (error) {
        throw error;
      }

      const mapped: NotaFiscalItem[] =
        (data ?? []).map((item: any) => ({
          id: String(item.id ?? ""),
          nf: String(item.nf ?? "—"),
          fornecedor: String(
            item.fornecedor ?? "—",
          ),
          identificacao: String(
            item.identificacao ?? "—",
          ),
          cl: String(item.cl ?? "—"),
          data: String(item.data ?? "—"),
          valor: Number(item.valor ?? 0),
          descricao_produto: String(
            item.descricao_produto ?? "—",
          ),
          observacao: String(
            item.observacao ?? "—",
          ),
          venc01: item.venc01 ?? null,
          venc02: item.venc02 ?? null,
          venc03: item.venc03 ?? null,
          venc04: item.venc04 ?? null,
          venc05: item.venc05 ?? null,
        }));

      setNotasList(mapped);
    } catch (error: any) {
      console.error(
        "Erro ao carregar notas:",
        error,
      );

      toast.error(
        "Erro ao carregar notas fiscais.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotas();
  }, []);

  /* ==========================================================================
     EXCLUIR NOTA
  ========================================================================== */

  const handleDeletarNota = async (
    id: string,
    numeroNF: string,
  ) => {
    if (
      !window.confirm(
        `Tem certeza que deseja excluir a nota fiscal #${numeroNF}?`,
      )
    ) {
      return;
    }

    try {
      const { error } =
        await supabase
          .from("notas_fiscais")
          .delete()
          .eq("id", id);

      if (error) {
        throw error;
      }

      toast.success(
        "Nota fiscal excluída com sucesso!",
      );

      setOpenModalDetalhes(false);

      await fetchNotas();
    } catch (error: any) {
      console.error(
        "Erro ao excluir:",
        error,
      );

      toast.error(
        "Erro ao excluir nota: " +
          (error?.message ||
            "Erro desconhecido"),
      );
    }
  };

  /* ==========================================================================
     IMPORTAÇÃO DO EXCEL
  ========================================================================== */

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];

    if (!file) {
      return;
    }

    setImporting(true);
    setImportProgress(0);
    setImportTotal(0);

    try {
      /* ----------------------------------------------------------------------
         1. Ler arquivo
      ---------------------------------------------------------------------- */

      const data = await file.arrayBuffer();

      /*
       * cellDates=true:
       * quando possível, o XLSX entrega datas como Date.
       */
      const workbook = XLSX.read(data, {
        cellDates: true,
      });

      if (
        !workbook.SheetNames ||
        workbook.SheetNames.length === 0
      ) {
        throw new Error(
          "Nenhuma planilha encontrada no arquivo.",
        );
      }

      const firstSheetName =
        workbook.SheetNames[0];

      const worksheet =
        workbook.Sheets[firstSheetName];

      if (!worksheet) {
        throw new Error(
          "Não foi possível abrir a primeira planilha.",
        );
      }

      /* ----------------------------------------------------------------------
         2. Transformar planilha em JSON
      ---------------------------------------------------------------------- */

      const jsonData =
        XLSX.utils.sheet_to_json<
          Record<string, unknown>
        >(worksheet, {
          defval: null,
          raw: true,
        });

      if (
        !jsonData ||
        jsonData.length === 0
      ) {
        throw new Error(
          "O arquivo está vazio ou a primeira planilha não possui registros.",
        );
      }

      /* ----------------------------------------------------------------------
         3. Identificar colunas
      ---------------------------------------------------------------------- */

      const headers =
        Object.keys(jsonData[0] ?? {});

      const normalizedHeaders =
        headers.map(normalizeHeader);

      const hasNF =
        normalizedHeaders.some(
          (header) =>
            [
              "numeronf",
              "numerodanota",
              "nf",
              "numeronota",
              "notafiscal",
            ].includes(header),
        );

      if (!hasNF) {
        throw new Error(
          `A coluna "Número NF" não foi encontrada.

Colunas encontradas:
${headers.join(", ")}

A planilha precisa possuir uma coluna de NF.`,
        );
      }

      /* ----------------------------------------------------------------------
         4. Transformar linhas
      ---------------------------------------------------------------------- */

      const formattedData: Array<{
        nf: string;
        fornecedor: string | null;
        identificacao: string | null;
        cl: string | null;
        data: string | null;
        valor: number;
        descricao_produto: string | null;
        observacao: string | null;
        venc01: string | null;
        venc02: string | null;
        venc03: string | null;
        venc04: string | null;
        venc05: string | null;
      }> = [];

      let linhasIgnoradas = 0;

      for (
        let index = 0;
        index < jsonData.length;
        index++
      ) {
        const row = jsonData[index];

        const nf = parseNumeroNF(
          getExcelValue(row, [
            "Número NF",
            "Numero NF",
            "Número da NF",
            "Numero da NF",
            "NF",
            "numero_nf",
            "numero_nota",
            "numero_nota_fiscal",
          ]),
        );

        /*
         * Linhas sem NF são consideradas linhas vazias,
         * rodapés ou informações fora da tabela.
         */
        if (!nf) {
          linhasIgnoradas++;
          continue;
        }

        const dataEmissao =
          parseExcelDate(
            getExcelValue(row, [
              "Emissão",
              "Data de Emissão",
              "Data Emissão",
              "Data",
              "data",
              "emissao",
            ]),
          );

        const fornecedorValue =
          getExcelValue(row, [
            "Fornecedor",
            "fornecedor",
          ]);

        const identificacaoValue =
          getExcelValue(row, [
            "Equipamento",
            "Equipamento / Identificação",
            "Identificação",
            "Identificacao",
            "identificacao",
          ]);

        const clValue =
          getExcelValue(row, [
            "CL",
            "Centro de Custo",
            "Centro de Lucro",
            "Localidade",
            "cl",
          ]);

        const valorValue =
          getExcelValue(row, [
            "Valor Total",
            "Valor",
            "valor_total",
            "valor",
          ]);

        const descricaoValue =
          getExcelValue(row, [
            "Descrição do Produto",
            "Descricao do Produto",
            "Descrição Produto",
            "Descricao Produto",
            "Produto",
            "Descrição",
            "descricao_produto",
          ]);

        const observacaoValue =
          getExcelValue(row, [
            "Observação",
            "Observacao",
            "Observações",
            "Observacoes",
            "observacao",
          ]);

        const venc01Value =
          getExcelValue(row, [
            "Venc01",
            "Venc 01",
            "Vencimento 01",
            "Vencimento 1",
            "1ª Parcela",
            "1 Parcela",
            "venc01",
            "venc_01",
          ]);

        const venc02Value =
          getExcelValue(row, [
            "Venc02",
            "Venc 02",
            "Vencimento 02",
            "Vencimento 2",
            "2ª Parcela",
            "2 Parcela",
            "venc02",
            "venc_02",
          ]);

        const venc03Value =
          getExcelValue(row, [
            "Venc03",
            "Venc 03",
            "Vencimento 03",
            "Vencimento 3",
            "3ª Parcela",
            "3 Parcela",
            "venc03",
            "venc_03",
          ]);

        const venc04Value =
          getExcelValue(row, [
            "Venc04",
            "Venc 04",
            "Vencimento 04",
            "Vencimento 4",
            "4ª Parcela",
            "4 Parcela",
            "venc04",
            "venc_04",
          ]);

        const venc05Value =
          getExcelValue(row, [
            "Venc05",
            "Venc 05",
            "Vencimento 05",
            "Vencimento 5",
            "5ª Parcela",
            "5 Parcela",
            "venc05",
            "venc_05",
          ]);

        formattedData.push({
          nf,

          fornecedor:
            parseText(fornecedorValue) ||
            null,

          identificacao:
            parseText(identificacaoValue) ||
            null,

          cl:
            parseText(clValue) ||
            null,

          data: dataEmissao,

          valor:
            parseExcelValue(valorValue),

          descricao_produto:
            parseText(descricaoValue) ||
            null,

          observacao:
            parseText(observacaoValue) ||
            null,

          venc01:
            parseExcelDate(venc01Value),

          venc02:
            parseExcelDate(venc02Value),

          venc03:
            parseExcelDate(venc03Value),

          venc04:
            parseExcelDate(venc04Value),

          venc05:
            parseExcelDate(venc05Value),
        });
      }

      /* ----------------------------------------------------------------------
         5. Validar resultado
      ---------------------------------------------------------------------- */

      if (
        formattedData.length === 0
      ) {
        throw new Error(
          "Nenhuma linha com Número NF válido foi encontrada.",
        );
      }

      setImportTotal(
        formattedData.length,
      );

      /*
       * Informação útil no console para conferência.
       */
      console.log(
        "Importação preparada:",
        {
          arquivo: file.name,
          planilha: firstSheetName,
          linhasLidas: jsonData.length,
          registrosValidos:
            formattedData.length,
          linhasIgnoradas,
          colunas: headers,
        },
      );

      /* ----------------------------------------------------------------------
         6. IMPORTAÇÃO EM LOTES
      ---------------------------------------------------------------------- */

      let importedCount = 0;

      for (
        let start = 0;
        start < formattedData.length;
        start += IMPORT_BATCH_SIZE
      ) {
        const batch =
          formattedData.slice(
            start,
            start + IMPORT_BATCH_SIZE,
          );

        /*
         * IMPORTANTE:
         *
         * Somente usamos colunas que existem na tabela
         * public.notas_fiscais.
         *
         * Não usamos:
         * numero_nf
         * equipamento
         * emissao
         * valor_total
         * venc_01
         * venc_02
         * venc_03
         * venc_04
         * venc_05
         */

        const { error } =
          await supabase
            .from("notas_fiscais")
            .insert(batch);

        if (error) {
          throw new Error(
            `Erro no lote iniciado no registro ${
              start + 1
            }.

Registros deste lote: ${
              batch.length
            }

Registros já importados antes do erro: ${
              importedCount
            }

Mensagem do Supabase:
${error.message}`,
          );
        }

        importedCount += batch.length;

        setImportProgress(
          importedCount,
        );

        /*
         * Libera o ciclo de renderização do navegador
         * antes de continuar com o próximo lote.
         */
        await new Promise<void>(
          (resolve) =>
            setTimeout(resolve, 0),
        );
      }

      /* ----------------------------------------------------------------------
         7. FINALIZAÇÃO
      ---------------------------------------------------------------------- */

      toast.success(
        `${importedCount} notas fiscais importadas com sucesso!`,
      );

      if (linhasIgnoradas > 0) {
        toast.info(
          `${linhasIgnoradas} linha(s) sem Número NF foram ignoradas.`,
        );
      }

      await fetchNotas();
    } catch (error: any) {
      console.error(
        "Erro completo na importação:",
        error,
      );

      toast.error(
        "Erro ao importar Excel: " +
          (error?.message ||
            "Erro desconhecido"),
        {
          duration: 10000,
        },
      );
    } finally {
      setImporting(false);

      setImportProgress(0);
      setImportTotal(0);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  /* ==========================================================================
     SALVAR NOTA MANUAL
  ========================================================================== */

  const handleSalvarNota = async (
    e: React.FormEvent,
  ) => {
    e.preventDefault();

    setSubmitting(true);

    try {
      const payload = {
        nf: numeroNf.trim(),

        fornecedor:
          fornecedor.trim() || null,

        identificacao:
          equipamento.trim() || null,

        cl: cl.trim() || null,

        data: emissao || null,

        valor:
          parseExcelValue(valorTotal),

        descricao_produto:
          descricaoProduto.trim() ||
          null,

        venc01:
          venc01 || null,

        venc02:
          venc02 || null,

        venc03:
          venc03 || null,

        venc04:
          venc04 || null,

        venc05:
          venc05 || null,

        observacao:
          observacao.trim() ||
          null,
      };

      const { error } =
        await supabase
          .from("notas_fiscais")
          .insert([payload]);

      if (error) {
        throw error;
      }

      toast.success(
        "Nota fiscal cadastrada com sucesso!",
      );

      await fetchNotas();

      setOpenModalCadastro(false);

      /* Limpar formulário */
      setNumeroNf("");
      setFornecedor("");
      setEquipamento("");
      setCl("");
      setEmissao("");
      setValorTotal("");
      setDescricaoProduto("");
      setVenc01("");
      setVenc02("");
      setVenc03("");
      setVenc04("");
      setVenc05("");
      setObservacao("");
    } catch (error: any) {
      console.error(
        "Erro ao salvar nota:",
        error,
      );

      toast.error(
        "Erro ao salvar nota: " +
          (error?.message ||
            "Verifique a conexão"),
      );
    } finally {
      setSubmitting(false);
    }
  };

  /* ==========================================================================
     DETALHES
  ========================================================================== */

  const handleAbrirDetalhes = (
    nota: NotaFiscalItem,
  ) => {
    setNotaSelecionada(nota);
    setOpenModalDetalhes(true);
  };

  /* ==========================================================================
     FILTROS
  ========================================================================== */

  const notasFiltradas =
    notasList.filter((nota) => {
      const termo =
        busca.trim().toLowerCase();

      const matchBusca =
        !termo ||
        nota.nf
          .toLowerCase()
          .includes(termo) ||
        nota.fornecedor
          .toLowerCase()
          .includes(termo) ||
        nota.identificacao
          .toLowerCase()
          .includes(termo) ||
        nota.cl
          .toLowerCase()
          .includes(termo) ||
        nota.descricao_produto
          .toLowerCase()
          .includes(termo) ||
        nota.observacao
          .toLowerCase()
          .includes(termo);

      let matchData = true;

      if (
        dataInicio &&
        nota.data !== "—"
      ) {
        matchData =
          matchData &&
          nota.data.split("T")[0] >=
            dataInicio;
      }

      if (
        dataFim &&
        nota.data !== "—"
      ) {
        matchData =
          matchData &&
          nota.data.split("T")[0] <=
            dataFim;
      }

      return (
        matchBusca &&
        matchData
      );
    });

  /* ==========================================================================
     KPIs
  ========================================================================== */

  const totalAcumulado =
    notasFiltradas.reduce(
      (acc, item) =>
        acc + item.valor,
      0,
    );

  const mediaPorNota =
    notasFiltradas.length > 0
      ? totalAcumulado /
        notasFiltradas.length
      : 0;

  /* ==========================================================================
     RENDER
  ========================================================================== */

  return (
    <div className="p-2 md:p-4 w-full max-w-full space-y-3">
      {/* =====================================================================
          CABEÇALHO
      ====================================================================== */}

      <div className="flex flex-row items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Controle de Notas Fiscais
          </h1>

          <p className="text-xs text-slate-500">
            Consulte, gerencie e acompanhe os
            vencimentos fiscais registrados.
          </p>
        </div>

        <Dialog
          open={openModalCadastro}
          onOpenChange={
            setOpenModalCadastro
          }
        >
          <DialogTrigger asChild>
            <Button
              variant="outline"
              className="rounded-full border-slate-300 text-slate-800 font-medium hover:bg-slate-50 px-3 py-1.5 text-xs flex items-center gap-1.5 shadow-xs"
            >
              <PlusCircle className="w-3.5 h-3.5 text-slate-700" />

              Nova Nota Fiscal
            </Button>
          </DialogTrigger>

          <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-slate-900 shadow-xl border border-slate-200 dark:border-slate-800">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold">
                Cadastrar Nova Nota Fiscal
              </DialogTitle>
            </DialogHeader>

            <form
              onSubmit={handleSalvarNota}
              className="space-y-4 pt-2"
            >
              {/* NF / FORNECEDOR */}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="numNf">
                    Número da NF
                  </Label>

                  <Input
                    id="numNf"
                    placeholder="Ex: 54582"
                    value={numeroNf}
                    onChange={(e) =>
                      setNumeroNf(
                        e.target.value,
                      )
                    }
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="fornecedor">
                    Fornecedor
                  </Label>

                  <Input
                    id="fornecedor"
                    placeholder="Ex: ENGEPEÇAS"
                    value={fornecedor}
                    onChange={(e) =>
                      setFornecedor(
                        e.target.value,
                      )
                    }
                    required
                  />
                </div>
              </div>

              {/* EQUIPAMENTO / CL */}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="equipamento">
                    Equipamento / Identificação
                  </Label>

                  <Input
                    id="equipamento"
                    placeholder="Ex: CAT 320 / CAMINHÃO 01"
                    value={equipamento}
                    onChange={(e) =>
                      setEquipamento(
                        e.target.value,
                      )
                    }
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="cl">
                    CL (Centro de Custo / Localidade)
                  </Label>

                  <Input
                    id="cl"
                    placeholder="Ex: CL-01 / BH"
                    value={cl}
                    onChange={(e) =>
                      setCl(
                        e.target.value,
                      )
                    }
                  />
                </div>
              </div>

              {/* DATA / VALOR */}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="emissao">
                    Data de Emissão
                  </Label>

                  <Input
                    id="emissao"
                    type="date"
                    value={emissao}
                    onChange={(e) =>
                      setEmissao(
                        e.target.value,
                      )
                    }
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="valor">
                    Valor Total (R$)
                  </Label>

                  <Input
                    id="valor"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0,00"
                    value={valorTotal}
                    onChange={(e) =>
                      setValorTotal(
                        e.target.value,
                      )
                    }
                    required
                  />
                </div>
              </div>

              {/* DESCRIÇÃO DO PRODUTO */}

              <div className="space-y-1">
                <Label htmlFor="descricaoProduto">
                  Descrição do Produto / Serviço
                </Label>

                <Textarea
                  id="descricaoProduto"
                  placeholder="Ex: Filtro hidráulico, óleo, peça, serviço de manutenção..."
                  value={descricaoProduto}
                  onChange={(e) =>
                    setDescricaoProduto(
                      e.target.value,
                    )
                  }
                  className="resize-none h-16"
                />
              </div>

              {/* VENCIMENTOS */}

              <div className="border-t border-slate-200 pt-3 space-y-2">
                <Label className="font-bold text-slate-700 block">
                  Vencimentos das Parcelas
                </Label>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label
                      htmlFor="venc01"
                      className="text-xs"
                    >
                      Vencimento 1ª Parcela
                    </Label>

                    <Input
                      id="venc01"
                      type="date"
                      value={venc01}
                      onChange={(e) =>
                        setVenc01(
                          e.target.value,
                        )
                      }
                    />
                  </div>

                  <div className="space-y-1">
                    <Label
                      htmlFor="venc02"
                      className="text-xs"
                    >
                      Vencimento 2ª Parcela
                    </Label>

                    <Input
                      id="venc02"
                      type="date"
                      value={venc02}
                      onChange={(e) =>
                        setVenc02(
                          e.target.value,
                        )
                      }
                    />
                  </div>

                  <div className="space-y-1">
                    <Label
                      htmlFor="venc03"
                      className="text-xs"
                    >
                      Vencimento 3ª Parcela
                    </Label>

                    <Input
                      id="venc03"
                      type="date"
                      value={venc03}
                      onChange={(e) =>
                        setVenc03(
                          e.target.value,
                        )
                      }
                    />
                  </div>

                  <div className="space-y-1">
                    <Label
                      htmlFor="venc04"
                      className="text-xs"
                    >
                      Vencimento 4ª Parcela
                    </Label>

                    <Input
                      id="venc04"
                      type="date"
                      value={venc04}
                      onChange={(e) =>
                        setVenc04(
                          e.target.value,
                        )
                      }
                    />
                  </div>

                  <div className="space-y-1">
                    <Label
                      htmlFor="venc05"
                      className="text-xs"
                    >
                      Vencimento 5ª Parcela
                    </Label>

                    <Input
                      id="venc05"
                      type="date"
                      value={venc05}
                      onChange={(e) =>
                        setVenc05(
                          e.target.value,
                        )
                      }
                    />
                  </div>
                </div>
              </div>

              {/* OBSERVAÇÃO */}

              <div className="space-y-1">
                <Label htmlFor="observacao">
                  Observações
                </Label>

                <Textarea
                  id="observacao"
                  placeholder="Observações adicionais..."
                  value={observacao}
                  onChange={(e) =>
                    setObservacao(
                      e.target.value,
                    )
                  }
                  className="resize-none h-20"
                />
              </div>

              {/* BOTÕES */}

              <div className="pt-3 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setOpenModalCadastro(
                      false,
                    )
                  }
                >
                  Cancelar
                </Button>

                <Button
                  type="submit"
                  disabled={submitting}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium"
                >
                  {submitting && (
                    <Loader2 className="w-4 h-4 animate-spin mr-1" />
                  )}

                  {submitting
                    ? "Salvando..."
                    : "Salvar NF"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* =====================================================================
          KPIs
      ====================================================================== */}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* TOTAL */}

        <div className="bg-white rounded-xl border border-slate-300 p-3 flex items-center gap-3 shadow-xs">
          <div className="text-lg font-serif font-bold text-slate-800 pl-1">
            $
          </div>

          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
              VALOR TOTAL ACUMULADO
            </p>

            <p className="text-xl font-bold text-slate-900">
              {formatBRL(
                totalAcumulado,
              )}
            </p>
          </div>
        </div>

        {/* REGISTROS */}

        <div className="bg-white rounded-xl border border-slate-300 p-3 flex items-center gap-3 shadow-xs">
          <div className="p-1 text-slate-800">
            <FileText className="w-5 h-5" />
          </div>

          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
              NOTAS EXIBIDAS
            </p>

            <p className="text-xl font-bold text-slate-900">
              {notasFiltradas.length}{" "}
              <span className="text-xs font-normal text-slate-500">
                registro(s)
              </span>
            </p>
          </div>
        </div>

        {/* MÉDIA */}

        <div className="bg-white rounded-xl border border-slate-300 p-3 flex items-center gap-3 shadow-xs">
          <div className="p-1 text-slate-800">
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.8"
                d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
              />
            </svg>
          </div>

          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
              MÉDIA POR NOTA
            </p>

            <p className="text-xl font-bold text-slate-900">
              {formatBRL(
                mediaPorNota,
              )}
            </p>
          </div>
        </div>
      </div>

      {/* =====================================================================
          BUSCA / FILTROS / EXCEL
      ====================================================================== */}

      <div className="bg-white rounded-xl border border-slate-300 p-2 flex flex-wrap items-center gap-2 shadow-xs">
        {/* BUSCA */}

        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />

          <input
            type="text"
            placeholder="Buscar por NF, fornecedor, equipamento, CL..."
            value={busca}
            onChange={(e) =>
              setBusca(e.target.value)
            }
            className="w-full pl-8 pr-2 py-1 text-xs bg-transparent rounded-lg border-0 focus:outline-none text-slate-700 placeholder:text-slate-400"
          />
        </div>

        {/* DATA INICIAL */}

        <div className="flex items-center gap-1.5 text-xs text-slate-600">
          <span>Emissão:</span>

          <input
            type="date"
            value={dataInicio}
            onChange={(e) =>
              setDataInicio(
                e.target.value,
              )
            }
            className="px-1.5 py-0.5 text-xs border border-slate-300 rounded focus:outline-none"
          />

          <span>até</span>

          {/* DATA FINAL */}

          <input
            type="date"
            value={dataFim}
            onChange={(e) =>
              setDataFim(
                e.target.value,
              )
            }
            className="px-1.5 py-0.5 text-xs border border-slate-300 rounded focus:outline-none"
          />
        </div>

        {/* FILTRAR */}

        <button
          type="button"
          onClick={() =>
            fetchNotas()
          }
          className="px-2.5 py-1 rounded border border-slate-300 text-xs font-medium text-slate-800 flex items-center gap-1 hover:bg-slate-50"
        >
          <Filter className="w-3 h-3" />

          Filtrar
        </button>

        {/* LIMPAR */}

        <button
          type="button"
          onClick={() => {
            setBusca("");
            setDataInicio("");
            setDataFim("");
          }}
          className="px-2 py-1 text-xs font-medium text-slate-600 hover:text-slate-900"
        >
          Limpar
        </button>

        {/* INPUT REAL DO ARQUIVO */}

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          accept=".xlsx,.xls,.csv"
          className="hidden"
        />

        {/* BOTÃO EXCEL */}

        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            fileInputRef.current?.click()
          }
          disabled={importing}
          className="rounded-lg border-slate-300 text-xs font-medium text-slate-800 flex items-center gap-1.5 hover:bg-slate-50 ml-auto"
        >
          {importing ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
          )}

          {importing
            ? importTotal > 0
              ? `Importando ${importProgress} / ${importTotal}`
              : "Lendo Excel..."
            : "Excel"}
        </Button>
      </div>

      {/* =====================================================================
          PROGRESSO DA IMPORTAÇÃO
      ====================================================================== */}

      {importing && (
        <div className="bg-white rounded-xl border border-slate-300 p-3 shadow-xs">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-slate-700">
              Importação em andamento
            </span>

            <span className="text-xs text-slate-500">
              {importTotal > 0
                ? `${importProgress} de ${importTotal}`
                : "Preparando..."}
            </span>
          </div>

          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all duration-300"
              style={{
                width:
                  importTotal > 0
                    ? `${Math.min(
                        100,
                        (importProgress /
                          importTotal) *
                          100,
                      )}%`
                    : "5%",
              }}
            />
          </div>

          <p className="text-[11px] text-slate-500 mt-1.5">
            Aguarde. Os registros estão sendo
            enviados ao banco em lotes de{" "}
            {IMPORT_BATCH_SIZE}.
          </p>
        </div>
      )}

      {/* =====================================================================
          TABELA
      ====================================================================== */}

      <div className="bg-white rounded-xl border border-slate-300 overflow-hidden shadow-xs w-full overflow-x-auto">
        <table className="w-full text-xs text-left min-w-[1050px]">
          <thead className="border-b border-slate-300 text-slate-800 font-bold bg-slate-50">
            <tr>
              <th className="py-2 px-1.5 w-[8%]">
                Número NF
              </th>

              <th className="py-2 px-1.5 w-[17%]">
                Fornecedor
              </th>

              <th className="py-2 px-1.5 w-[14%]">
                Equipamento
              </th>

              <th className="py-2 px-1.5 w-[8%]">
                CL
              </th>

              <th className="py-2 px-1.5 w-[9%]">
                Emissão
              </th>

              <th className="py-2 px-1.5 w-[11%]">
                Valor Total
              </th>

              <th className="py-2 px-1.5 w-[17%]">
                Descrição
              </th>

              <th className="py-2 px-1.5 w-[11%]">
                Parcelas / Venc.
              </th>

              <th className="py-2 px-1.5 w-[5%] text-center">
                Ação
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200 text-slate-800">
            {loading ? (
              <tr>
                <td
                  colSpan={9}
                  className="py-6 text-center text-slate-500"
                >
                  <Loader2 className="w-5 h-5 animate-spin mx-auto mb-1 text-slate-600" />

                  Carregando dados...
                </td>
              </tr>
            ) : notasFiltradas.length ===
              0 ? (
              <tr>
                <td
                  colSpan={9}
                  className="py-6 text-center text-slate-500"
                >
                  Nenhuma nota fiscal
                  encontrada.
                </td>
              </tr>
            ) : (
              notasFiltradas.map(
                (item) => {
                  const vencimentos = [
                    item.venc01,
                    item.venc02,
                    item.venc03,
                    item.venc04,
                    item.venc05,
                  ].filter(Boolean);

                  const parcelas =
                    vencimentos.length >
                    0
                      ? vencimentos
                          .map(
                            (
                              venc,
                              index,
                            ) =>
                              `${index + 1}ª: ${formatDate(
                                venc,
                              )}`,
                          )
                          .join(" | ")
                      : "—";

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/80"
                    >
                      {/* NF */}

                      <td
                        className="py-2 px-1.5 font-semibold truncate"
                        title={item.nf}
                      >
                        #{item.nf}
                      </td>

                      {/* FORNECEDOR */}

                      <td
                        className="py-2 px-1.5 font-semibold truncate"
                        title={
                          item.fornecedor
                        }
                      >
                        <span className="mr-1">
                          🏢
                        </span>

                        {item.fornecedor}
                      </td>

                      {/* EQUIPAMENTO */}

                      <td
                        className="py-2 px-1.5 truncate"
                        title={
                          item.identificacao
                        }
                      >
                        {item.identificacao !==
                        "—"
                          ? `🚗 ${item.identificacao}`
                          : "—"}
                      </td>

                      {/* CL */}

                      <td
                        className="py-2 px-1.5 font-medium text-slate-600 truncate"
                        title={item.cl}
                      >
                        {item.cl}
                      </td>

                      {/* DATA */}

                      <td className="py-2 px-1.5 truncate">
                        {formatDate(
                          item.data,
                        )}
                      </td>

                      {/* VALOR */}

                      <td className="py-2 px-1.5 font-bold truncate">
                        {formatBRL(
                          item.valor,
                        )}
                      </td>

                      {/* DESCRIÇÃO */}

                      <td
                        className="py-2 px-1.5 truncate"
                        title={
                          item.descricao_produto
                        }
                      >
                        {item.descricao_produto !==
                        "—"
                          ? item.descricao_produto
                          : "—"}
                      </td>

                      {/* VENCIMENTOS */}

                      <td
                        className="py-2 px-1.5 truncate"
                        title={parcelas}
                      >
                        {parcelas}
                      </td>

                      {/* AÇÃO */}

                      <td className="py-2 px-1.5 text-center">
                        <button
                          type="button"
                          onClick={() =>
                            handleAbrirDetalhes(
                              item,
                            )
                          }
                          className="inline-flex items-center gap-1 text-slate-800 font-medium hover:underline text-xs"
                        >
                          <Eye className="w-3 h-3" />

                          Ver
                        </button>
                      </td>
                    </tr>
                  );
                },
              )
            )}
          </tbody>
        </table>
      </div>

      {/* =====================================================================
          MODAL DE DETALHES
      ====================================================================== */}

      <Dialog
        open={openModalDetalhes}
        onOpenChange={
          setOpenModalDetalhes
        }
      >
        <DialogContent className="sm:max-w-md rounded-2xl bg-white dark:bg-slate-900 shadow-xl border border-slate-200 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-slate-900 dark:text-slate-100">
              <FileText className="w-5 h-5 text-slate-700 dark:text-slate-300" />

              Detalhes da Nota #
              {notaSelecionada?.nf}
            </DialogTitle>
          </DialogHeader>

          {notaSelecionada && (
            <div className="space-y-3 pt-2 text-sm text-slate-700 dark:text-slate-300">
              {/* FORNECEDOR / EQUIPAMENTO */}

              <div className="grid grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                <div>
                  <span className="text-xs text-slate-400 block font-medium">
                    Fornecedor
                  </span>

                  <span className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-1 mt-0.5">
                    <Building2 className="w-3.5 h-3.5 text-slate-500" />

                    {
                      notaSelecionada.fornecedor
                    }
                  </span>
                </div>

                <div>
                  <span className="text-xs text-slate-400 block font-medium">
                    Equipamento / Identificação
                  </span>

                  <span className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-1 mt-0.5">
                    <Truck className="w-3.5 h-3.5 text-slate-500" />

                    {
                      notaSelecionada.identificacao
                    }
                  </span>
                </div>
              </div>

              {/* CL / DATA */}

              <div className="grid grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                <div>
                  <span className="text-xs text-slate-400 block font-medium">
                    CL (Centro de Custo / Localidade)
                  </span>

                  <span className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-500" />

                    {notaSelecionada.cl}
                  </span>
                </div>

                <div>
                  <span className="text-xs text-slate-400 block font-medium">
                    Data de Emissão
                  </span>

                  <span className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-1 mt-0.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />

                    {formatDate(
                      notaSelecionada.data,
                    )}
                  </span>
                </div>
              </div>

              {/* VALOR */}

              <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="text-xs text-slate-400 block font-medium">
                  Valor Total
                </span>

                <span className="font-bold text-emerald-600 dark:text-emerald-400 text-base mt-0.5 block">
                  {formatBRL(
                    notaSelecionada.valor,
                  )}
                </span>
              </div>

              {/* DESCRIÇÃO */}

              <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="text-xs text-slate-400 block font-medium">
                  Descrição do Produto / Serviço
                </span>

                <span className="font-normal text-slate-800 dark:text-slate-100 mt-0.5 block whitespace-pre-wrap">
                  {
                    notaSelecionada.descricao_produto
                  }
                </span>
              </div>

              {/* VENCIMENTOS */}

              <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="text-xs text-slate-400 block font-medium">
                  Parcelas e Vencimentos
                </span>

                <div className="font-semibold text-slate-800 dark:text-slate-100 mt-1 space-y-1">
                  {[
                    notaSelecionada.venc01,
                    notaSelecionada.venc02,
                    notaSelecionada.venc03,
                    notaSelecionada.venc04,
                    notaSelecionada.venc05,
                  ].map(
                    (
                      vencimento,
                      index,
                    ) =>
                      vencimento ? (
                        <div
                          key={index}
                        >
                          {index + 1}ª parcela:{" "}
                          {formatDate(
                            vencimento,
                          )}
                        </div>
                      ) : null,
                  )}

                  {![
                    notaSelecionada.venc01,
                    notaSelecionada.venc02,
                    notaSelecionada.venc03,
                    notaSelecionada.venc04,
                    notaSelecionada.venc05,
                  ].some(Boolean) && (
                    <div>—</div>
                  )}
                </div>
              </div>

              {/* OBSERVAÇÕES */}

              <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="text-xs text-slate-400 block font-medium">
                  Observações
                </span>

                <span className="font-normal text-slate-800 dark:text-slate-100 mt-0.5 block whitespace-pre-wrap">
                  {
                    notaSelecionada.observacao
                  }
                </span>
              </div>

              {/* BOTÕES */}

              <div className="pt-2 flex justify-between items-center">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() =>
                    handleDeletarNota(
                      notaSelecionada.id,
                      notaSelecionada.nf,
                    )
                  }
                  className="flex items-center gap-1.5"
                >
                  <Trash2 className="w-4 h-4" />

                  Excluir Nota
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setOpenModalDetalhes(
                      false,
                    )
                  }
                >
                  Fechar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
