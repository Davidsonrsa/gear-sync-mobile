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
  Loader2,
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

const IMPORT_BATCH_SIZE = 200;

/* ============================================================================
    HELPERS
============================================================================ */

function normalizeHeader(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

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

function parseExcelDate(value: unknown): string | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

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

  text = text.split(" ")[0];

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

function parseText(value: unknown): string {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  return String(value).trim();
}

function parseNumeroNF(value: unknown): string {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "";
  }

  if (value instanceof Date) {
    return "";
  }

  if (typeof value === "number") {
    if (Number.isInteger(value)) {
      return String(value);
    }

    return String(value).replace(/\.0+$/, "");
  }

  const str = String(value).trim();
  if (
    str.includes("GMT") ||
    str.includes("Sun ") ||
    str.includes("Mon ") ||
    str.includes("Tue ") ||
    str.includes("Wed ") ||
    str.includes("Thu ") ||
    str.includes("Fri ") ||
    str.includes("Sat ")
  ) {
    return "";
  }

  return str;
}

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

function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value || 0);
}

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
  const [openModalCadastro, setOpenModalCadastro] = useState(false);
  const [openModalDetalhes, setOpenModalDetalhes] = useState(false);
  const [notaSelecionada, setNotaSelecionada] = useState<NotaFiscalItem | null>(null);
  const [notasList, setNotasList] = useState<NotaFiscalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importTotal, setImportTotal] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [busca, setBusca] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");

  const [numeroNf, setNumeroNf] = useState("");
  const [fornecedor, setFornecedor] = useState("");
  const [equipamento, setEquipamento] = useState("");
  const [cl, setCl] = useState("");
  const [emissao, setEmissao] = useState("");
  const [valorTotal, setValorTotal] = useState("");
  const [descricaoProduto, setDescricaoProduto] = useState("");
  const [venc01, setVenc01] = useState("");
  const [venc02, setVenc02] = useState("");
  const [venc03, setVenc03] = useState("");
  const [venc04, setVenc04] = useState("");
  const [venc05, setVenc05] = useState("");
  const [observacao, setObservacao] = useState("");

  const fetchNotas = async () => {
    setLoading(true);

    try {
      const { data, error } = await supabase
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

      const mapped: NotaFiscalItem[] = (data ?? []).map((item: any) => ({
        id: String(item.id ?? ""),
        nf: String(item.nf ?? "—"),
        fornecedor: String(item.fornecedor ?? "—"),
        identificacao: String(item.identificacao ?? "—"),
        cl: String(item.cl ?? "—"),
        data: String(item.data ?? "—"),
        valor: Number(item.valor ?? 0),
        descricao_produto: String(item.descricao_produto ?? "—"),
        observacao: String(item.observacao ?? "—"),
        venc01: item.venc01 ?? null,
        venc02: item.venc02 ?? null,
        venc03: item.venc03 ?? null,
        venc04: item.venc04 ?? null,
        venc05: item.venc05 ?? null,
      }));

      setNotasList(mapped);
    } catch (error: any) {
      console.error("Erro ao carregar notas:", error);
      toast.error("Erro ao carregar notas fiscais.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotas();
  }, []);

  const handleDeletarNota = async (id: string, numeroNF: string) => {
    if (!window.confirm(`Tem certeza que deseja excluir a nota fiscal #${numeroNF}?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from("notas_fiscais")
        .delete()
        .eq("id", id);

      if (error) {
        throw error;
      }

      toast.success("Nota fiscal excluída com sucesso!");
      setOpenModalDetalhes(false);
      await fetchNotas();
    } catch (error: any) {
      console.error("Erro ao excluir:", error);
      toast.error("Erro ao excluir nota: " + (error?.message || "Erro desconhecido"));
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportProgress(0);
    setImportTotal(0);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { cellDates: true });

      if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
        throw new Error("Nenhuma planilha encontrada no arquivo.");
      }

      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];

      if (!worksheet) {
        throw new Error("Não foi possível abrir a primeira planilha.");
      }

      const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
        defval: null,
        raw: true,
      });

      if (!jsonData || jsonData.length === 0) {
        throw new Error("O arquivo está vazio ou a primeira planilha não possui registros.");
      }

      const headers = Object.keys(jsonData[0] ?? {});
      const normalizedHeaders = headers.map(normalizeHeader);

      const hasNF = normalizedHeaders.some((header) =>
        ["numeronf", "numerodanota", "nf", "numeronota", "notafiscal"].includes(header),
      );

      if (!hasNF) {
        throw new Error(`A coluna "Número NF" não foi encontrada.`);
      }

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

      for (let index = 0; index < jsonData.length; index++) {
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

        if (!nf) {
          linhasIgnoradas++;
          continue;
        }

        const dataEmissao = parseExcelDate(
          getExcelValue(row, ["Emissão", "Data de Emissão", "Data Emissão", "Data", "data", "emissao"]),
        );

        const fornecedorValue = getExcelValue(row, ["Fornecedor", "fornecedor"]);
        const identificacaoValue = getExcelValue(row, ["Equipamento", "Equipamento / Identificação", "Identificação", "Identificacao", "identificacao"]);
        const clValue = getExcelValue(row, ["CL", "Centro de Custo", "Centro de Lucro", "Localidade", "cl"]);
        const valorValue = getExcelValue(row, ["Valor Total", "Valor", "valor_total", "valor"]);
        const descricaoValue = getExcelValue(row, ["Descrição do Produto", "Descricao do Produto", "Descrição Produto", "Descricao Produto", "Produto", "Descrição", "descricao_produto", "descricao"]);
        const observacaoValue = getExcelValue(row, ["Observação", "Observacao", "Observações", "Observacoes", "observacao", "obs"]);
        const venc01Value = getExcelValue(row, ["Venc. 01", "Venc01", "Venc 01", "Vencimento 01", "Vencimento 1", "1ª Parcela", "1 Parcela", "venc01", "venc_01", "venc1"]);
        const venc02Value = getExcelValue(row, ["Venc. 02", "Venc02", "Venc 02", "Vencimento 02", "Vencimento 2", "2ª Parcela", "2 Parcela", "venc02", "venc_02", "venc2"]);
        const venc03Value = getExcelValue(row, ["Venc. 03", "Venc03", "Venc 03", "Vencimento 03", "Vencimento 3", "3ª Parcela", "3 Parcela", "venc03", "venc_03", "venc3"]);
        const venc04Value = getExcelValue(row, ["Venc. 04", "Venc04", "Venc 04", "Vencimento 04", "Vencimento 4", "4ª Parcela", "4 Parcela", "venc04", "venc_04", "venc4"]);
        const venc05Value = getExcelValue(row, ["Venc. 05", "Venc05", "Venc 05", "Vencimento 05", "Vencimento 5", "5ª Parcela", "5 Parcela", "venc05", "venc_05", "venc5"]);

        formattedData.push({
          nf,
          fornecedor: parseText(fornecedorValue) || null,
          identificacao: parseText(identificacaoValue) || null,
          cl: parseText(clValue) || null,
          data: dataEmissao,
          valor: parseExcelValue(valorValue),
          descricao_produto: parseText(descricaoValue) || null,
          observacao: parseText(observacaoValue) || null,
          venc01: parseExcelDate(venc01Value),
          venc02: parseExcelDate(venc02Value),
          venc03: parseExcelDate(venc03Value),
          venc04: parseExcelDate(venc04Value),
          venc05: parseExcelDate(venc05Value),
        });
      }

      if (formattedData.length === 0) {
        throw new Error("Nenhuma linha com Número NF válido foi encontrada.");
      }

      setImportTotal(formattedData.length);
      let importedCount = 0;

      for (let start = 0; start < formattedData.length; start += IMPORT_BATCH_SIZE) {
        const batch = formattedData.slice(start, start + IMPORT_BATCH_SIZE);
        const { error } = await supabase.from("notas_fiscais").insert(batch);

        if (error) {
          throw new Error(`Erro no lote iniciado no registro ${start + 1}: ${error.message}`);
        }

        importedCount += batch.length;
        setImportProgress(importedCount);
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
      }

      toast.success(`${importedCount} notas fiscais importadas com sucesso!`);
      if (linhasIgnoradas > 0) {
        toast.info(`${linhasIgnoradas} linha(s) sem Número NF foram ignoradas.`);
      }

      await fetchNotas();
    } catch (error: any) {
      console.error("Erro completo na importação:", error);
      toast.error("Erro ao importar Excel: " + (error?.message || "Erro desconhecido"));
    } finally {
      setImporting(false);
      setImportProgress(0);
      setImportTotal(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleSalvarNota = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const payload = {
        nf: numeroNf.trim(),
        fornecedor: fornecedor.trim() || null,
        identificacao: equipamento.trim() || null,
        cl: cl.trim() || null,
        data: emissao || null,
        valor: parseExcelValue(valorTotal),
        descricao_produto: descricaoProduto.trim() || null,
        venc01: venc01 || null,
        venc02: venc02 || null,
        venc03: venc03 || null,
        venc04: venc04 || null,
        venc05: venc05 || null,
        observacao: observacao.trim() || null,
      };

      const { error } = await supabase.from("notas_fiscais").insert([payload]);

      if (error) throw error;

      toast.success("Nota fiscal cadastrada com sucesso!");
      await fetchNotas();
      setOpenModalCadastro(false);

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
      console.error("Erro ao salvar nota:", error);
      toast.error("Erro ao salvar nota: " + (error?.message || "Verifique a conexão"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleAbrirDetalhes = (nota: NotaFiscalItem) => {
    setNotaSelecionada(nota);
    setOpenModalDetalhes(true);
  };

  const notasFiltradas = notasList.filter((nota) => {
    const termo = busca.trim().toLowerCase();
    const matchBusca =
      !termo ||
      nota.nf.toLowerCase().includes(termo) ||
      nota.fornecedor.toLowerCase().includes(termo) ||
      nota.identificacao.toLowerCase().includes(termo) ||
      nota.cl.toLowerCase().includes(termo) ||
      nota.descricao_produto.toLowerCase().includes(termo) ||
      nota.observacao.toLowerCase().includes(termo);

    let matchData = true;
    if (dataInicio && nota.data !== "—") {
      matchData = matchData && nota.data.split("T")[0] >= dataInicio;
    }
    if (dataFim && nota.data !== "—") {
      matchData = matchData && nota.data.split("T")[0] <= dataFim;
    }

    return matchBusca && matchData;
  });

  const totalAcumulado = notasFiltradas.reduce((acc, item) => acc + item.valor, 0);
  const mediaPorNota = notasFiltradas.length > 0 ? totalAcumulado / notasFiltradas.length : 0;

  return (
    <div className="p-2 md:p-4 w-full max-w-full space-y-3">
      <div className="flex flex-row items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Controle de Notas Fiscais
          </h1>
          <p className="text-xs text-slate-500">
            Consulte, gerencie e acompanhe os vencimentos fiscais registrados.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".xlsx, .xls, .csv"
            className="hidden"
          />

          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="rounded-full border-slate-300 text-slate-800 font-medium hover:bg-slate-50 px-3 py-1.5 text-xs flex items-center gap-1.5 shadow-xs"
          >
            {importing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            )}
            {importing ? `Importando (${importProgress}/${importTotal})` : "Importar Excel"}
          </Button>

          <Dialog open={openModalCadastro} onOpenChange={setOpenModalCadastro}>
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

              <form onSubmit={handleSalvarNota} className="space-y-4 pt-2">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="numNf">Número da NF</Label>
                    <Input
                      id="numNf"
                      placeholder="Ex: 54582"
                      value={numeroNf}
                      onChange={(e) => setNumeroNf(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="fornecedor">Fornecedor</Label>
                    <Input
                      id="fornecedor"
                      placeholder="Ex: ENGEPEÇAS"
                      value={fornecedor}
                      onChange={(e) => setFornecedor(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="equipamento">Equipamento</Label>
                    <Input
                      id="equipamento"
                      placeholder="Ex: Escavadeira"
                      value={equipamento}
                      onChange={(e) => setEquipamento(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="cl">CL</Label>
                    <Input
                      id="cl"
                      placeholder="Ex: CL-01"
                      value={cl}
                      onChange={(e) => setCl(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="emissao">Data de Emissão</Label>
                    <Input
                      id="emissao"
                      type="date"
                      value={emissao}
                      onChange={(e) => setEmissao(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="valorTotal">Valor Total</Label>
                    <Input
                      id="valorTotal"
                      placeholder="Ex: 1500.00"
                      value={valorTotal}
                      onChange={(e) => setValorTotal(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="descricaoProduto">Descrição do Produto</Label>
                  <Textarea
                    id="descricaoProduto"
                    placeholder="Detalhes dos itens..."
                    value={descricaoProduto}
                    onChange={(e) => setDescricaoProduto(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Venc 01</Label>
                    <Input type="date" value={venc01} onChange={(e) => setVenc01(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Venc 02</Label>
                    <Input type="date" value={venc02} onChange={(e) => setVenc02(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Venc 03</Label>
                    <Input type="date" value={venc03} onChange={(e) => setVenc03(e.target.value)} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Venc 04</Label>
                    <Input type="date" value={venc04} onChange={(e) => setVenc04(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Venc 05</Label>
                    <Input type="date" value={venc05} onChange={(e) => setVenc05(e.target.value)} />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="observacao">Observação</Label>
                  <Textarea
                    id="observacao"
                    placeholder="Observações adicionais..."
                    value={observacao}
                    onChange={(e) => setObservacao(e.target.value)}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setOpenModalCadastro(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Salvar Nota
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* FILTROS E BUSCA */}
      <div className="flex flex-col md:flex-row gap-2 items-center justify-between bg-white p-3 rounded-lg border border-slate-200 shadow-xs">
        <div className="relative w-full md:w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Buscar por NF, fornecedor..."
            className="pl-8 text-xs h-9"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Input
            type="date"
            className="text-xs h-9"
            value={dataInicio}
            onChange={(e) => setDataInicio(e.target.value)}
          />
          <span className="text-xs text-slate-400">até</span>
          <Input
            type="date"
            className="text-xs h-9"
            value={dataFim}
            onChange={(e) => setDataFim(e.target.value)}
          />
        </div>
      </div>

      {/* TABELA DE DADOS */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
              <tr>
                <th className="p-3">NF</th>
                <th className="p-3">Fornecedor</th>
                <th className="p-3">Equipamento</th>
                <th className="p-3">CL</th>
                <th className="p-3">Emissão</th>
                <th className="p-3 text-right">Valor</th>
                <th className="p-3 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-slate-500">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-slate-400" />
                    Carregando notas fiscais...
                  </td>
                </tr>
              ) : notasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-slate-500">
                    Nenhuma nota fiscal encontrada.
                  </td>
                </tr>
              ) : (
                notasFiltradas.map((nota) => (
                  <tr key={nota.id} className="hover:bg-slate-50/50">
                    <td className="p-3 font-medium text-slate-900">{nota.nf}</td>
                    <td className="p-3 text-slate-700">{nota.fornecedor}</td>
                    <td className="p-3 text-slate-700">{nota.identificacao}</td>
                    <td className="p-3 text-slate-700">{nota.cl}</td>
                    <td className="p-3 text-slate-700">{formatDate(nota.data)}</td>
                    <td className="p-3 text-right font-medium text-slate-900">
                      {formatBRL(nota.valor)}
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-slate-600 hover:text-slate-900"
                          onClick={() => handleAbrirDetalhes(nota)}
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleDeletarNota(nota.id, nota.nf)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DE DETALHES */}
      <Dialog open={openModalDetalhes} onOpenChange={setOpenModalDetalhes}>
        <DialogContent className="sm:max-w-lg rounded-2xl bg-white shadow-xl border border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              Detalhes da Nota Fiscal #{notaSelecionada?.nf}
            </DialogTitle>
          </DialogHeader>
          {notaSelecionada && (
            <div className="space-y-3 text-xs text-slate-700 pt-2">
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                <div>
                  <span className="font-semibold text-slate-500 block">Fornecedor:</span>
                  {notaSelecionada.fornecedor}
                </div>
                <div>
                  <span className="font-semibold text-slate-500 block">Valor Total:</span>
                  <span className="font-bold text-slate-900">{formatBRL(notaSelecionada.valor)}</span>
                </div>
                <div>
                  <span className="font-semibold text-slate-500 block">Equipamento:</span>
                  {notaSelecionada.identificacao}
                </div>
                <div>
                  <span className="font-semibold text-slate-500 block">Centro de Custo (CL):</span>
                  {notaSelecionada.cl}
                </div>
                <div>
                  <span className="font-semibold text-slate-500 block">Data de Emissão:</span>
                  {formatDate(notaSelecionada.data)}
                </div>
              </div>

              <div>
                <span className="font-semibold text-slate-500 block mb-1">Descrição do Produto:</span>
                <p className="bg-slate-50 p-2 rounded-lg border border-slate-100 whitespace-pre-wrap">
                  {notaSelecionada.descricao_produto}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                  <span className="font-semibold text-slate-500 block text-[10px]">Venc 01</span>
                  {formatDate(notaSelecionada.venc01) || "—"}
                </div>
                <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                  <span className="font-semibold text-slate-500 block text-[10px]">Venc 02</span>
                  {formatDate(notaSelecionada.venc02) || "—"}
                </div>
                <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                  <span className="font-semibold text-slate-500 block text-[10px]">Venc 03</span>
                  {formatDate(notaSelecionada.venc03) || "—"}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                  <span className="font-semibold text-slate-500 block text-[10px]">Venc 04</span>
                  {formatDate(notaSelecionada.venc04) || "—"}
                </div>
                <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                  <span className="font-semibold text-slate-500 block text-[10px]">Venc 05</span>
                  {formatDate(notaSelecionada.venc05) || "—"}
                </div>
              </div>

              <div>
                <span className="font-semibold text-slate-500 block mb-1">Observações:</span>
                <p className="bg-slate-50 p-2 rounded-lg border border-slate-100 whitespace-pre-wrap">
                  {notaSelecionada.observacao}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
