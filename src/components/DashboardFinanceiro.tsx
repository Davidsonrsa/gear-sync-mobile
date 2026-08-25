import { useState, useMemo } from "react";
import { ItemFinanceiro } from "@/routes/_authenticated/custos/index"; // Ajuste a importação da interface conforme seu projeto
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Filter, TrendingUp, TrendingDown, DollarSign, PieChart as PieChartIcon } from "lucide-react";

interface DashboardFinanceiroProps {
  lancamentos: ItemFinanceiro[];
}

export function DashboardFinanceiro({ lancamentos }: DashboardFinanceiroProps) {
  const [contratoSelecionado, setContratoSelecionado] = useState<string>("TODOS");

  // Extrai a lista única de contratos disponíveis nos lançamentos
  const listaContratos = useMemo(() => {
    const mapa = new Set<string>();
    lancamentos.forEach((item) => {
      if (item.contrato && item.contrato.trim()) {
        mapa.add(item.contrato.trim());
      }
    });
    return Array.from(mapa).sort((a, b) => a.localeCompare(b));
  }, [lancamentos]);

  // Filtra os lançamentos com base no contrato selecionado no Modal
  const lancamentosFiltrados = useMemo(() => {
    if (contratoSelecionado === "TODOS") return lancamentos;
    return lancamentos.filter(
      (item) => item.contrato.trim().toLowerCase() === contratoSelecionado.trim().toLowerCase()
    );
  }, [lancamentos, contratoSelecionado]);

  // Recalcula os totais para os cards e lista de custos
  const resumos = useMemo(() => {
    let receita = 0;
    let impostos = 0;
    let maoDeObra = 0;
    let encargos = 0;
    let manutencao = 0;
    let transporte = 0;
    let administrativas = 0;

    lancamentosFiltrados.forEach((item) => {
      switch (item.tipo) {
        case "Receita":
          receita += item.valor;
          break;
        case "Impostos":
          impostos += item.valor;
          break;
        case "Mão de Obra":
          maoDeObra += item.valor;
          break;
        case "Encargos":
          encargos += item.valor;
          break;
        case "Despesas de Manutenção":
          manutencao += item.valor;
          break;
        case "Despesas de Transporte":
          transporte += item.valor;
          break;
        case "Despesas Administrativas":
          administrativas += item.valor;
          break;
      }
    });

    const despesasTotais = impostos + maoDeObra + encargos + manutencao + transporte + administrativas;
    const resultadoFinal = receita - despesasTotais;
    const margemLucro = receita > 0 ? (resultadoFinal / receita) * 100 : 0;

    return {
      receita,
      impostos,
      maoDeObra,
      encargos,
      manutencao,
      transporte,
      administrativas,
      despesasTotais,
      resultadoFinal,
      margemLucro,
    };
  }, [lancamentosFiltrados]);

  const formatBRL = (val: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(val);
  };

  return (
    <div className="space-y-6 pt-2">
      {/* Selector de Contrato dentro do Dashboard */}
      <div className="flex items-center gap-3 bg-slate-800 p-3 rounded-lg border border-slate-700">
        <Filter className="w-4 h-4 text-emerald-400" />
        <label htmlFor="select-contrato-dashboard" className="text-sm font-medium text-slate-200 whitespace-nowrap">
          Filtrar por Contrato:
        </label>
        <select
          id="select-contrato-dashboard"
          className="flex h-9 w-full md:w-72 rounded-md border border-slate-700 bg-slate-900 px-3 py-1 text-sm text-white shadow-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
          value={contratoSelecionado}
          onChange={(e) => setContratoSelecionado(e.target.value)}
        >
          <option value="TODOS">Todos os Contratos</option>
          {listaContratos.map((contrato) => (
            <option key={contrato} value={contrato}>
              {contrato}
            </option>
          ))}
        </select>
      </div>

      {/* Cards de Métricas Principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-slate-800 border-slate-700 text-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-slate-400 uppercase">Receita Bruta</CardTitle>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-400">{formatBRL(resumos.receita)}</div>
            <p className="text-xs text-slate-400 mt-1">Entradas acumuladas</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700 text-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-slate-400 uppercase">Custos / Despesas</CardTitle>
            <TrendingDown className="w-4 h-4 text-rose-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-400">{formatBRL(resumos.despesasTotais)}</div>
            <p className="text-xs text-slate-400 mt-1">Total de saídas</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700 text-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-slate-400 uppercase">Resultado Final</CardTitle>
            <DollarSign className={`w-4 h-4 ${resumos.resultadoFinal >= 0 ? "text-blue-400" : "text-rose-400"}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${resumos.resultadoFinal >= 0 ? "text-blue-400" : "text-rose-400"}`}>
              {formatBRL(resumos.resultadoFinal)}
            </div>
            <p className="text-xs text-slate-400 mt-1">Saldo líquido</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700 text-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-slate-400 uppercase">Margem Líquida</CardTitle>
            <PieChartIcon className="w-4 h-4 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-400">{resumos.margemLucro.toFixed(1)}%</div>
            <p className="text-xs text-slate-400 mt-1">Representatividade líquida</p>
          </CardContent>
        </Card>
      </div>

      {/* Detalhamento dos Tipos de Custos */}
      <Card className="bg-slate-800 border-slate-700 text-white">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold uppercase text-slate-400">
            Detalhamento de Custos Operacionais
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 text-center">
            <div className="p-3 bg-slate-900 rounded-lg border border-slate-700">
              <span className="text-xs text-slate-400 block">Mão de Obra</span>
              <span className="text-sm font-bold text-white">{formatBRL(resumos.maoDeObra)}</span>
            </div>
            <div className="p-3 bg-slate-900 rounded-lg border border-slate-700">
              <span className="text-xs text-slate-400 block">Manutenção</span>
              <span className="text-sm font-bold text-white">{formatBRL(resumos.manutencao)}</span>
            </div>
            <div className="p-3 bg-slate-900 rounded-lg border border-slate-700">
              <span className="text-xs text-slate-400 block">Encargos</span>
              <span className="text-sm font-bold text-white">{formatBRL(resumos.encargos)}</span>
            </div>
            <div className="p-3 bg-slate-900 rounded-lg border border-slate-700">
              <span className="text-xs text-slate-400 block">Transporte</span>
              <span className="text-sm font-bold text-white">{formatBRL(resumos.transporte)}</span>
            </div>
            <div className="p-3 bg-slate-900 rounded-lg border border-slate-700 col-span-2 sm:col-span-1">
              <span className="text-xs text-slate-400 block">Impostos (Deduções)</span>
              <span className="text-sm font-bold text-white">{formatBRL(resumos.impostos)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
