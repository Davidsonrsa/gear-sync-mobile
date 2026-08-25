import { useState, useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  Pencil,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/notas-fiscais/")({
  component: NotasFiscaisPage,
});

export interface NotaFiscalItem {
  id: string;
  numero_nf: string;
  fornecedor: string;
  equipamento: string;
  emissao: string;
  valor_total: number;
  parcelas: string;
  observacao: string;
}

function NotasFiscaisPage() {
  const navigate = useNavigate();
  const [openModalCadastro, setOpenModalCadastro] = useState(false);
  const [openModalDetalhes, setOpenModalDetalhes] = useState(false);
  const [notaSelecionada, setNotaSelecionada] = useState<NotaFiscalItem | null>(null);

  const [notasList, setNotasList] = useState<NotaFiscalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Filtros
  const [busca, setBusca] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");

  // Formulário
  const [numeroNf, setNumeroNf] = useState("");
  const [fornecedor, setFornecedor] = useState("");
  const [equipamento, setEquipamento] = useState("");
  const [emissao, setEmissao] = useState("");
  const [valorTotal, setValorTotal] = useState("");
  const [venc01, setVenc01] = useState("");
  const [venc02, setVenc02] = useState("");
  const [venc03, setVenc03] = useState("");
  const [venc04, setVenc04] = useState("");
  const [venc05, setVenc05] = useState("");
  const [observacao, setObservacao] = useState("");

  const formatBRL = (val: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(val || 0);
  };

  const formatDate = (dateStr: any) => {
    if (!dateStr || dateStr === "—") return "";
    try {
      const cleanDate = String(dateStr).split("T")[0];
      const [year, month, day] = cleanDate.split("-");
      if (year && month && day) return `${day}/${month}/${year}`;
      return String(dateStr);
    } catch {
      return String(dateStr);
    }
  };

  const extractNumeroNF = (item: any): string => {
    const raw =
      item.numero_nf ??
      item.numero_nota ??
      item.numero ??
      item.num_nf ??
      item.nota_fiscal ??
      item.nota ??
      item.nf ??
      item.num_documento ??
      item.documento;

    if (raw === null || raw === undefined || raw === "") return "—";
    return String(raw).trim();
  };

  const extractFornecedor = (item: any): string => {
    if (typeof item.fornecedor === "object" && item.fornecedor !== null) {
      return item.fornecedor.nome || item.fornecedor.razao_social || "—";
    }
    return (
      item.fornecedor ||
      item.razao_social ||
      item.nome_fornecedor ||
      item.empresa ||
      "—"
    );
  };

  const extractEquipamento = (item: any): string => {
    if (typeof item.equipamentos === "object" && item.equipamentos !== null) {
      return (
        item.equipamentos.identificacao ||
        item.equipamentos.nome ||
        item.equipamentos.descricao ||
        item.equipamentos.tag ||
        item.equipamentos.codigo ||
        item.equipamentos.placa ||
        "—"
      );
    }
    if (typeof item.equipamento === "object" && item.equipamento !== null) {
      return (
        item.equipamento.identificacao ||
        item.equipamento.nome ||
        item.equipamento.descricao ||
        item.equipamento.tag ||
        item.equipamento.codigo ||
        item.equipamento.placa ||
        "—"
      );
    }
    return (
      item.identificacao ||
      item.identificacao_equipamento ||
      item.cod_identificacao ||
      item.equipamento ||
      item.equipamentos ||
      item.cod_equipamento ||
      item.nome_equipamento ||
      item.descricao_equipamento ||
      item.veiculo ||
      item.frota ||
      item.tag ||
      item.maquina ||
      item.placa ||
      "—"
    );
  };

  const extractEmissao = (item: any): string => {
    return (
      item.emissao ||
      item.data_emissao ||
      item.data_nota ||
      item.dt_emissao ||
      item.created_at ||
      "—"
    );
  };

  const extractParcelasEVencimento = (item: any): string => {
    const vencimentosList: string[] = [];

    const possibleVencs = [
      item["venc_01"] || item["venc.01"] || item["venc01"] || item["vencimento_1"] || item["venc1"] || item["data_vencimento_1"],
      item["venc_02"] || item["venc.02"] || item["venc02"] || item["vencimento_2"] || item["venc2"] || item["data_vencimento_2"],
      item["venc_03"] || item["venc.03"] || item["venc03"] || item["vencimento_3"] || item["venc3"] || item["data_vencimento_3"],
      item["venc_04"] || item["venc.04"] || item["venc04"] || item["vencimento_4"] || item["venc4"] || item["data_vencimento_4"],
      item["venc_05"] || item["venc.05"] || item["venc05"] || item["vencimento_5"] || item["venc5"] || item["data_vencimento_5"],
    ];

    possibleVencs.forEach((venc, index) => {
      if (venc) {
        const formatted = formatDate(venc);
        if (formatted) {
          vencimentosList.push(`${index + 1}ª: ${formatted}`);
        }
      }
    });

    if (vencimentosList.length > 0) {
      return vencimentosList.join(" | ");
    }

    const singleVenc =
      item.vencimento ||
      item.data_vencimento ||
      item.dt_vencimento ||
      item.vencimentos;

    const rawParcelas = item.parcelas || item.parcela || item.qtd_parcelas;

    if (singleVenc && rawParcelas) {
      return `${rawParcelas}x (${formatDate(singleVenc)})`;
    }
    if (singleVenc) {
      return `1ª: ${formatDate(singleVenc)}`;
    }
    if (rawParcelas) {
      return `${rawParcelas} Parcela(s)`;
    }

    return "—";
  };

  const extractObservacao = (item: any): string => {
    return (
      item.observacao ||
      item.observacoes ||
      item.obs ||
      item.descricao ||
      item.detalhes ||
      "—"
    );
  };

  const fetchNotas = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("notas_fiscais")
        .select("*, equipamentos(*), fornecedores(*)")
        .order("created_at", { ascending: false });

      let finalData = data;

      if (error) {
        const { data: fallbackData } = await supabase
          .from("notas_fiscais")
          .select("*")
          .order("created_at", { ascending: false });
        finalData = fallbackData;
      }

      if (finalData && finalData.length > 0) {
        const mappedData: NotaFiscalItem[] = finalData.map((item: any) => ({
          id: item.id?.toString() || Math.random().toString(),
          numero_nf: extractNumeroNF(item),
          fornecedor: extractFornecedor(item),
          equipamento: extractEquipamento(item),
          emissao: extractEmissao(item),
          valor_total: Number(
            item.valor_total || item.valor || item.valor_nota || item.val_total || 0
          ),
          parcelas: extractParcelasEVencimento(item),
          observacao: extractObservacao(item),
        }));
        setNotasList(mappedData);
      }
    } catch (err) {
      console.error("Erro ao carregar notas:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotas();
  }, []);

  const handleSalvarNota = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const { error } = await supabase.from("notas_fiscais").insert([
        {
          numero_nf: numeroNf,
          fornecedor: fornecedor,
          identificacao: equipamento || null,
          equipamento: equipamento || null,
          emissao: emissao || null,
          valor_total: parseFloat(valorTotal) || 0,
          venc_01: venc01 || null,
          venc_02: venc02 || null,
          venc_03: venc03 || null,
          venc_04: venc04 || null,
          venc_05: venc05 || null,
          observacao: observacao || null,
        },
      ]);

      if (error) throw error;

      await fetchNotas();
      setOpenModalCadastro(false);
      setNumeroNf("");
      setFornecedor("");
      setEquipamento("");
      setEmissao("");
      setValorTotal("");
      setVenc01("");
      setVenc02("");
      setVenc03("");
      setVenc04("");
      setVenc05("");
      setObservacao("");
    } catch (err: any) {
      alert("Erro ao salvar nota: " + (err.message || "Verifique a conexão"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleAbrirDetalhes = (nota: NotaFiscalItem) => {
    setNotaSelecionada(nota);
    setOpenModalDetalhes(true);
  };

  const notasFiltradas = notasList.filter((nota) => {
    const termo = busca.toLowerCase();
    const matchBusca =
      nota.numero_nf.toLowerCase().includes(termo) ||
      nota.fornecedor.toLowerCase().includes(termo) ||
      nota.equipamento.toLowerCase().includes(termo) ||
      nota.observacao.toLowerCase().includes(termo);

    let matchData = true;
    if (dataInicio && nota.emissao !== "—") {
      matchData = matchData && nota.emissao.split("T")[0] >= dataInicio;
    }
    if (dataFim && nota.emissao !== "—") {
      matchData = matchData && nota.emissao.split("T")[0] <= dataFim;
    }

    return matchBusca && matchData;
  });

  const totalAcumulado = notasFiltradas.reduce(
    (acc, item) => acc + item.valor_total,
    0
  );
  const mediaPorNota =
    notasFiltradas.length > 0 ? totalAcumulado / notasFiltradas.length : 0;

  return (
    <div className="p-2 md:p-4 w-full max-w-full space-y-3">
      {/* Cabeçalho */}
      <div className="flex flex-row items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Controle de Notas Fiscais
          </h1>
          <p className="text-xs text-slate-500">
            Consulte, gerencie e acompanhe os vencimentos fiscais registrados.
          </p>
        </div>

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
                  <Label htmlFor="equipamento">Equipamento / Identificação</Label>
                  <Input
                    id="equipamento"
                    placeholder="Ex: CAT 320 / CAMINHÃO 01"
                    value={equipamento}
                    onChange={(e) => setEquipamento(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="emissao">Data Emissão</Label>
                  <Input
                    id="emissao"
                    type="date"
                    value={emissao}
                    onChange={(e) => setEmissao(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="valor">Valor Total (R$)</Label>
                <Input
                  id="valor"
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={valorTotal}
                  onChange={(e) => setValorTotal(e.target.value)}
                  required
                />
              </div>

              {/* Seção de Vencimentos */}
              <div className="border-t border-slate-200 pt-3 space-y-2">
                <Label className="font-bold text-slate-700 block">Vencimentos das Parcelas</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="venc01" className="text-xs">Vencimento 1ª Parcela</Label>
                    <Input
                      id="venc01"
                      type="date"
                      value={venc01}
                      onChange={(e) => setVenc01(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="venc02" className="text-xs">Vencimento 2ª Parcela</Label>
                    <Input
                      id="venc02"
                      type="date"
                      value={venc02}
                      onChange={(e) => setVenc02(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="venc03" className="text-xs">Vencimento 3ª Parcela</Label>
                    <Input
                      id="venc03"
                      type="date"
                      value={venc03}
                      onChange={(e) => setVenc03(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="venc04" className="text-xs">Vencimento 4ª Parcela</Label>
                    <Input
                      id="venc04"
                      type="date"
                      value={venc04}
                      onChange={(e) => setVenc04(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="venc05" className="text-xs">Vencimento 5ª Parcela</Label>
                    <Input
                      id="venc05"
                      type="date"
                      value={venc05}
                      onChange={(e) => setVenc05(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="observacao">Observações</Label>
                <Textarea
                  id="observacao"
                  placeholder="Descrição das peças, serviços ou detalhes da compra..."
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                  className="resize-none h-20"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpenModalCadastro(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-1" />
                  ) : null}
                  {submitting ? "Salvando..." : "Salvar NF"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Cards KPI */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-slate-300 p-3 flex items-center gap-3 shadow-xs">
          <div className="text-lg font-serif font-bold text-slate-800 pl-1">
            $
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
              VALOR TOTAL ACUMULADO
            </p>
            <p className="text-xl font-bold text-slate-900">
              {formatBRL(totalAcumulado)}
            </p>
          </div>
        </div>

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
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
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
              {formatBRL(mediaPorNota)}
            </p>
          </div>
        </div>
      </div>

      {/* Caixa de Busca e Filtros */}
      <div className="bg-white rounded-xl border border-slate-300 p-2 flex flex-wrap items-center gap-2 shadow-xs">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por NF, fornecedor, equipamento..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full pl-8 pr-2 py-1 text-xs bg-transparent rounded-lg border-0 focus:outline-none text-slate-700 placeholder:text-slate-400"
          />
        </div>

        <div className="flex items-center gap-1.5 text-xs text-slate-600">
          <span>Emissão:</span>
          <input
            type="date"
            value={dataInicio}
            onChange={(e) => setDataInicio(e.target.value)}
            className="px-1.5 py-0.5 text-xs border border-slate-300 rounded focus:outline-none"
          />
          <span>até</span>
          <input
            type="date"
            value={dataFim}
            onChange={(e) => setDataFim(e.target.value)}
            className="px-1.5 py-0.5 text-xs border border-slate-300 rounded focus:outline-none"
          />
        </div>

        <button
          onClick={() => fetchNotas()}
          className="px-2.5 py-1 rounded border border-slate-300 text-xs font-medium text-slate-800 flex items-center gap-1 hover:bg-slate-50"
        >
          <Filter className="w-3 h-3" />
          Filtrar
        </button>

        <button
          onClick={() => {
            setBusca("");
            setDataInicio("");
            setDataFim("");
          }}
          className="px-2 py-1 text-xs font-medium text-slate-600 hover:text-slate-900"
        >
          Limpar
        </button>

        <button className="px-2.5 py-1 rounded border border-slate-300 text-xs font-medium text-slate-800 flex items-center gap-1 hover:bg-slate-50 ml-auto">
          <FileSpreadsheet className="w-3 h-3" />
          Excel
        </button>
      </div>

      {/* Tabela de Notas */}
      <div className="bg-white rounded-xl border border-slate-300 overflow-hidden shadow-xs w-full">
        <table className="w-full text-xs text-left table-fixed">
          <thead className="border-b border-slate-300 text-slate-800 font-bold bg-slate-50">
            <tr>
              <th className="py-2 px-1.5 w-[10%]">Número NF</th>
              <th className="py-2 px-1.5 w-[22%]">Fornecedor</th>
              <th className="py-2 px-1.5 w-[18%]">Equipamento</th>
              <th className="py-2 px-1.5 w-[11%]">Emissão</th>
              <th className="py-2 px-1.5 w-[12%]">Valor Total</th>
              <th className="py-2 px-1.5 w-[17%]">Parcelas / Venc.</th>
              <th className="py-2 px-1.5 w-[10%] text-center">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-slate-800">
            {loading ? (
              <tr>
                <td colSpan={7} className="py-6 text-center text-slate-500">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto mb-1 text-slate-600" />
                  Carregando dados...
                </td>
              </tr>
            ) : notasFiltradas.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-6 text-center text-slate-500">
                  Nenhuma nota fiscal encontrada.
                </td>
              </tr>
            ) : (
              notasFiltradas.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/80">
                  <td className="py-2 px-1.5 font-semibold truncate" title={item.numero_nf}>
                    #{item.numero_nf}
                  </td>
                  <td className="py-2 px-1.5 font-semibold truncate" title={item.fornecedor}>
                    🏢 {item.fornecedor}
                  </td>
                  <td className="py-2 px-1.5 truncate" title={item.equipamento}>
                    {item.equipamento !== "—" ? `🚗 ${item.equipamento}` : "—"}
                  </td>
                  <td className="py-2 px-1.5 truncate">
                    {formatDate(item.emissao)}
                  </td>
                  <td className="py-2 px-1.5 font-bold truncate">
                    {formatBRL(item.valor_total)}
                  </td>
                  <td className="py-2 px-1.5 truncate" title={item.parcelas}>
                    {item.parcelas}
                  </td>
                  <td className="py-2 px-1.5 text-center">
                    <button
                      onClick={() => handleAbrirDetalhes(item)}
                      className="inline-flex items-center gap-1 text-slate-800 font-medium hover:underline text-xs"
                    >
                      <Eye className="w-3 h-3" /> Ver
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal de Detalhes */}
      <Dialog open={openModalDetalhes} onOpenChange={setOpenModalDetalhes}>
        <DialogContent className="sm:max-w-md rounded-2xl bg-white dark:bg-slate-900 shadow-xl border border-slate-200 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-slate-900 dark:text-slate-100">
              <FileText className="w-5 h-5 text-slate-700 dark:text-slate-300" />
              Detalhes da Nota #{notaSelecionada?.numero_nf}
            </DialogTitle>
          </DialogHeader>

          {notaSelecionada && (
            <div className="space-y-3 pt-2 text-sm text-slate-700 dark:text-slate-300">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                <div>
                  <span className="text-xs text-slate-400 block font-medium">
                    Fornecedor
                  </span>
                  <span className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-1 mt-0.5">
                    <Building2 className="w-3.5 h-3.5 text-slate-500" />
                    {notaSelecionada.fornecedor}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block font-medium">
                    Equipamento / Identificação
                  </span>
                  <span className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-1 mt-0.5">
                    <Truck className="w-3.5 h-3.5 text-slate-500" />
                    {notaSelecionada.equipamento}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                <div>
                  <span className="text-xs text-slate-400 block font-medium">
                    Data de Emissão
                  </span>
                  <span className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-1 mt-0.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    {formatDate(notaSelecionada.emissao)}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block font-medium">
                    Valor Total
                  </span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 text-base mt-0.5 block">
                    {formatBRL(notaSelecionada.valor_total)}
                  </span>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="text-xs text-slate-400 block font-medium">
                  Parcelas / Vencimentos
                </span>
                <span className="font-semibold text-slate-800 dark:text-slate-100 mt-0.5 block">
                  {notaSelecionada.parcelas}
                </span>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="text-xs text-slate-400 flex items-center gap-1 font-medium">
                  <FileText className="w-3.5 h-3.5 text-slate-500" />
                  Observações
                </span>
                <p className="text-sm text-slate-800 dark:text-slate-200 mt-1 whitespace-pre-wrap leading-relaxed">
                  {notaSelecionada.observacao}
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setOpenModalDetalhes(false)}
                >
                  Fechar
                </Button>
                <Button
                  onClick={() => {
                    setOpenModalDetalhes(false);
                   navigate({ to: "/notas-fiscais/$id", params: { id: nota.id } });
                  }}
                  className="flex items-center gap-1.5"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Editar / Gerenciar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default NotasFiscaisPage;
