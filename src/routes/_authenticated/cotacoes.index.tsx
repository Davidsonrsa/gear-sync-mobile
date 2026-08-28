import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search,
  PlusCircle,
  Filter,
  RefreshCw,
  Eye,
  FileText,
  Clock3,
  CheckCircle2,
  Send,
  XCircle,
  Loader2,
  CalendarDays,
  PackageSearch,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/cotacoes/")({
  component: CotacoesPage,
});

type Cotacao = {
  id: string;
  [key: string]: any;
};

const STATUS_OPTIONS = [
  "Todos",
  "Rascunho",
  "Aberta",
  "Enviada",
  "Aguardando Resposta",
  "Respondida",
  "Em Análise",
  "Aprovada",
  "Reprovada",
  "Cancelada",
  "Finalizada",
];

function CotacoesPage() {
  const navigate = useNavigate();

  const [cotacoes, setCotacoes] = useState<Cotacao[]>([]);
  const [loading, setLoading] = useState(true);

  const [busca, setBusca] = useState("");
  const [statusFiltro, setStatusFiltro] = useState("Todos");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");

  const [fornecedoresPorCotacao, setFornecedoresPorCotacao] =
    useState<Record<string, number>>({});

  const carregarCotacoes = async () => {
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("cotacoes")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      const lista = (data || []) as Cotacao[];
      setCotacoes(lista);

      // Quantidade de fornecedores vinculados a cada cotação.
      const { data: fornecedores, error: fornecedoresError } =
        await supabase
          .from("cotacao_fornecedores")
          .select("cotacao_id");

      if (!fornecedoresError && fornecedores) {
        const contagem: Record<string, number> = {};

        fornecedores.forEach((item: any) => {
          if (!item.cotacao_id) return;

          contagem[item.cotacao_id] =
            (contagem[item.cotacao_id] || 0) + 1;
        });

        setFornecedoresPorCotacao(contagem);
      }
    } catch (error: any) {
      console.error("Erro ao carregar cotações:", error);

      toast.error(
        "Não foi possível carregar as cotações.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarCotacoes();
  }, []);

  const obterValor = (cotacao: Cotacao, campos: string[]) => {
    for (const campo of campos) {
      if (
        cotacao[campo] !== undefined &&
        cotacao[campo] !== null &&
        cotacao[campo] !== ""
      ) {
        return cotacao[campo];
      }
    }

    return null;
  };

  const obterNumero = (cotacao: Cotacao) => {
    const valor = obterValor(cotacao, [
      "numero",
      "numero_cotacao",
      "codigo",
      "codigo_cotacao",
      "cotacao",
    ]);

    if (valor) {
      return String(valor);
    }

    return `COT-${String(cotacao.id).slice(0, 8).toUpperCase()}`;
  };

  const obterData = (cotacao: Cotacao) => {
    return obterValor(cotacao, [
      "data",
      "data_solicitacao",
      "data_cotacao",
      "created_at",
    ]);
  };

  const obterDescricao = (cotacao: Cotacao) => {
    return (
      obterValor(cotacao, [
        "descricao",
        "descricao_cotacao",
        "finalidade",
        "observacao",
        "observacoes",
      ]) || "Sem descrição"
    );
  };

  const obterStatus = (cotacao: Cotacao) => {
    const status = obterValor(cotacao, [
      "status",
      "situacao",
      "estado",
    ]);

    if (!status) {
      return "Rascunho";
    }

    return String(status);
  };

  const obterEquipamento = (cotacao: Cotacao) => {
    return (
      obterValor(cotacao, [
        "equipamento",
        "equipamento_nome",
        "identificacao",
        "equipamento_identificacao",
      ]) || cotacao.equipamento_id
        ? String(
            obterValor(cotacao, [
              "equipamento",
              "equipamento_nome",
              "identificacao",
            ]) || cotacao.equipamento_id
          )
        : "—"
    );
  };

  const obterSolicitante = (cotacao: Cotacao) => {
    return (
      obterValor(cotacao, [
        "solicitante",
        "solicitante_nome",
        "usuario",
        "usuario_nome",
      ]) || cotacao.solicitante_id
        ? String(
            obterValor(cotacao, [
              "solicitante",
              "solicitante_nome",
              "usuario",
              "usuario_nome",
            ]) || cotacao.solicitante_id
          )
        : "—"
    );
  };

  const obterValorTotal = (cotacao: Cotacao) => {
    const valor = obterValor(cotacao, [
      "valor_total",
      "total",
      "valor",
      "valor_estimado",
    ]);

    const numero = Number(valor);

    return Number.isFinite(numero) ? numero : 0;
  };

  const formatarData = (valor: any) => {
    if (!valor) return "—";

    const data = String(valor).split("T")[0];

    const partes = data.split("-");

    if (partes.length === 3) {
      return `${partes[2]}/${partes[1]}/${partes[0]}`;
    }

    return String(valor);
  };

  const formatarBRL = (valor: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(valor);
  };

  const statusNormalizado = (status: string) => {
    return status
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  };

  const statusClasse = (status: string) => {
    const normalizado = statusNormalizado(status);

    if (
      normalizado.includes("aprov") ||
      normalizado.includes("finaliz")
    ) {
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    }

    if (
      normalizado.includes("reprov") ||
      normalizado.includes("cancel")
    ) {
      return "bg-red-50 text-red-700 border-red-200";
    }

    if (
      normalizado.includes("envi") ||
      normalizado.includes("respost") ||
      normalizado.includes("analise")
    ) {
      return "bg-blue-50 text-blue-700 border-blue-200";
    }

    if (
      normalizado.includes("aberta") ||
      normalizado.includes("aguard")
    ) {
      return "bg-amber-50 text-amber-700 border-amber-200";
    }

    return "bg-slate-100 text-slate-700 border-slate-200";
  };

  const cotacoesFiltradas = useMemo(() => {
    return cotacoes.filter((cotacao) => {
      const termo = busca.toLowerCase().trim();

      const numero = obterNumero(cotacao).toLowerCase();
      const descricao = String(obterDescricao(cotacao)).toLowerCase();
      const equipamento = String(obterEquipamento(cotacao)).toLowerCase();
      const solicitante = String(obterSolicitante(cotacao)).toLowerCase();

      const correspondeBusca =
        !termo ||
        numero.includes(termo) ||
        descricao.includes(termo) ||
        equipamento.includes(termo) ||
        solicitante.includes(termo);

      const status = obterStatus(cotacao);

      const correspondeStatus =
        statusFiltro === "Todos" ||
        statusNormalizado(status) ===
          statusNormalizado(statusFiltro);

      const dataRaw = obterData(cotacao);

      const data = dataRaw
        ? String(dataRaw).split("T")[0]
        : "";

      const correspondeDataInicio =
        !dataInicio || (data && data >= dataInicio);

      const correspondeDataFim =
        !dataFim || (data && data <= dataFim);

      return (
        correspondeBusca &&
        correspondeStatus &&
        correspondeDataInicio &&
        correspondeDataFim
      );
    });
  }, [
    cotacoes,
    busca,
    statusFiltro,
    dataInicio,
    dataFim,
  ]);

  const indicadores = useMemo(() => {
    let abertas = 0;
    let aguardando = 0;
    let aprovadas = 0;
    let valorTotal = 0;

    cotacoesFiltradas.forEach((cotacao) => {
      const status = statusNormalizado(obterStatus(cotacao));

      if (
        status.includes("aberta") ||
        status.includes("rascunho")
      ) {
        abertas++;
      }

      if (status.includes("aguard")) {
        aguardando++;
      }

      if (status.includes("aprov")) {
        aprovadas++;
      }

      valorTotal += obterValorTotal(cotacao);
    });

    return {
      abertas,
      aguardando,
      aprovadas,
      valorTotal,
    };
  }, [cotacoesFiltradas]);

  const limparFiltros = () => {
    setBusca("");
    setStatusFiltro("Todos");
    setDataInicio("");
    setDataFim("");
  };

  const abrirCotacao = (id: string) => {
    navigate({
      to: "/_authenticated/cotacoes/$id",
      params: {
        id,
      },
    });
  };

  return (
    <div className="p-2 md:p-4 w-full max-w-full space-y-4">
      {/* CABEÇALHO */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Controle de Cotações
          </h1>

          <p className="text-xs text-slate-500 mt-0.5">
            Solicite, acompanhe e compare cotações de peças,
            materiais e serviços.
          </p>
        </div>

        <Button
          onClick={() =>
            navigate({
              to: "/_authenticated/cotacoes/nova",
            })
          }
          className="rounded-full bg-blue-600 hover:bg-blue-700 text-white font-medium px-4"
        >
          <PlusCircle className="w-4 h-4 mr-1.5" />
          Nova Cotação
        </Button>
      </div>

      {/* INDICADORES */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-slate-300 p-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-50 text-amber-700">
              <Clock3 className="w-5 h-5" />
            </div>

            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                Cotações Abertas
              </p>

              <p className="text-2xl font-bold text-slate-900">
                {indicadores.abertas}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-300 p-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-700">
              <Send className="w-5 h-5" />
            </div>

            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                Aguardando Respostas
              </p>

              <p className="text-2xl font-bold text-slate-900">
                {indicadores.aguardando}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-300 p-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700">
              <CheckCircle2 className="w-5 h-5" />
            </div>

            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                Aprovadas
              </p>

              <p className="text-2xl font-bold text-slate-900">
                {indicadores.aprovadas}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-300 p-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-slate-100 text-slate-700">
              <FileText className="w-5 h-5" />
            </div>

            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                Valor Total
              </p>

              <p className="text-lg font-bold text-slate-900">
                {formatarBRL(indicadores.valorTotal)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* FILTROS */}
      <div className="bg-white rounded-xl border border-slate-300 p-3 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />

            <Input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por número, descrição, equipamento ou solicitante..."
              className="pl-9 text-sm"
            />
          </div>

          <Button
            variant="outline"
            onClick={carregarCotacoes}
            disabled={loading}
            className="border-slate-300"
          >
            <RefreshCw
              className={`w-4 h-4 mr-1.5 ${
                loading ? "animate-spin" : ""
              }`}
            />
            Atualizar
          </Button>
        </div>

        <div className="flex flex-col md:flex-row md:items-end gap-2">
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">
              Status
            </label>

            <select
              value={statusFiltro}
              onChange={(e) => setStatusFiltro(e.target.value)}
              className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">
              Data inicial
            </label>

            <div className="relative">
              <CalendarDays className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-400" />

              <Input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="pl-9 text-sm"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">
              Data final
            </label>

            <div className="relative">
              <CalendarDays className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-400" />

              <Input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                className="pl-9 text-sm"
              />
            </div>
          </div>

          <Button
            variant="outline"
            onClick={() => {
              toast.success("Filtros aplicados.");
            }}
            className="border-slate-300"
          >
            <Filter className="w-4 h-4 mr-1.5" />
            Filtrar
          </Button>

          <Button
            variant="ghost"
            onClick={limparFiltros}
            className="text-slate-600"
          >
            Limpar
          </Button>
        </div>
      </div>

      {/* RESUMO */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <PackageSearch className="w-4 h-4" />

          <span>
            {cotacoesFiltradas.length} cotação(ões) encontrada(s)
          </span>
        </div>
      </div>

      {/* TABELA */}
      <div className="bg-white rounded-xl border border-slate-300 overflow-hidden shadow-xs w-full">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="border-b border-slate-300 text-slate-800 font-bold bg-slate-50">
              <tr>
                <th className="py-3 px-3 whitespace-nowrap">
                  Nº Cotação
                </th>

                <th className="py-3 px-3 whitespace-nowrap">
                  Data
                </th>

                <th className="py-3 px-3 min-w-[220px]">
                  Descrição
                </th>

                <th className="py-3 px-3 min-w-[150px]">
                  Equipamento
                </th>

                <th className="py-3 px-3 min-w-[130px]">
                  Solicitante
                </th>

                <th className="py-3 px-3 text-center whitespace-nowrap">
                  Fornecedores
                </th>

                <th className="py-3 px-3 whitespace-nowrap">
                  Valor
                </th>

                <th className="py-3 px-3 whitespace-nowrap">
                  Status
                </th>

                <th className="py-3 px-3 text-center">
                  Ação
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td
                    colSpan={9}
                    className="py-10 text-center text-slate-500"
                  >
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />

                    Carregando cotações...
                  </td>
                </tr>
              ) : cotacoesFiltradas.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="py-12 text-center"
                  >
                    <FileText className="w-8 h-8 mx-auto mb-2 text-slate-300" />

                    <p className="font-medium text-slate-600">
                      Nenhuma cotação encontrada
                    </p>

                    <p className="text-xs text-slate-400 mt-1">
                      Crie uma nova cotação ou altere os filtros.
                    </p>

                    <Button
                      onClick={() =>
                        navigate({
                          to: "/_authenticated/cotacoes/nova",
                        })
                      }
                      className="mt-4 bg-blue-600 hover:bg-blue-700"
                    >
                      <PlusCircle className="w-4 h-4 mr-1.5" />
                      Nova Cotação
                    </Button>
                  </td>
                </tr>
              ) : (
                cotacoesFiltradas.map((cotacao) => {
                  const numero = obterNumero(cotacao);
                  const data = obterData(cotacao);
                  const descricao = obterDescricao(cotacao);
                  const equipamento = obterEquipamento(cotacao);
                  const solicitante = obterSolicitante(cotacao);
                  const status = obterStatus(cotacao);
                  const valor = obterValorTotal(cotacao);

                  const qtdFornecedores =
                    fornecedoresPorCotacao[cotacao.id] || 0;

                  return (
                    <tr
                      key={cotacao.id}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="py-3 px-3">
                        <span className="font-bold text-slate-900">
                          {numero}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-slate-600 whitespace-nowrap">
                        {formatarData(data)}
                      </td>

                      <td className="py-3 px-3">
                        <div
                          className="font-medium text-slate-800 truncate max-w-[260px]"
                          title={String(descricao)}
                        >
                          {descricao}
                        </div>
                      </td>

                      <td className="py-3 px-3 text-slate-600">
                        <div
                          className="truncate max-w-[180px]"
                          title={String(equipamento)}
                        >
                          {equipamento}
                        </div>
                      </td>

                      <td className="py-3 px-3 text-slate-600">
                        <div
                          className="truncate max-w-[150px]"
                          title={String(solicitante)}
                        >
                          {solicitante}
                        </div>
                      </td>

                      <td className="py-3 px-3 text-center">
                        <span className="inline-flex items-center justify-center min-w-8 px-2 py-1 rounded-full bg-slate-100 text-slate-700 font-semibold">
                          {qtdFornecedores}
                        </span>
                      </td>

                      <td className="py-3 px-3 font-semibold text-slate-800 whitespace-nowrap">
                        {valor > 0
                          ? formatarBRL(valor)
                          : "—"}
                      </td>

                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full border text-[10px] font-bold whitespace-nowrap ${statusClasse(
                            status,
                          )}`}
                        >
                          {status}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            abrirCotacao(cotacao.id)
                          }
                          className="text-slate-700 hover:text-blue-700"
                        >
                          <Eye className="w-3.5 h-3.5 mr-1" />
                          Ver
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* RODAPÉ */}
      {!loading && cotacoesFiltradas.length > 0 && (
        <div className="flex items-center justify-between text-xs text-slate-500 px-1">
          <span>
            Exibindo {cotacoesFiltradas.length} de{" "}
            {cotacoes.length} cotação(ões)
          </span>

          {statusFiltro !== "Todos" && (
            <span>
              Filtro:{" "}
              <strong className="text-slate-700">
                {statusFiltro}
              </strong>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
