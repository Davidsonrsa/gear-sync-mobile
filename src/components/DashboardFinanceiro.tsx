import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  PieChart as PieChartIcon,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface ItemFinanceiro {
  id: string;
  contrato: string;
  contrato_id?: string | null;
  tipo: string;
  descricao: string;
  valor: number;
  data: string;
}

interface DashboardFinanceiroProps {
  lancamentos: ItemFinanceiro[];
}

const COLORS = ["#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#3B82F6", "#EC4899", "#6366F1"];

export function DashboardFinanceiro({ lancamentos }: DashboardFinanceiroProps) {
  const listaContratos = useMemo(() => {
    const set = new Set<string>();
    lancamentos.forEach((l) => {
      if (l.contrato) set.add(l.contrato);
    });
    return Array.from(set).sort();
  }, [lancamentos]);

  const lancamentosFiltrados = lancamentos;

  function formatBRL(valor: number) {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(valor);
  }

  function classificarCategoria(tipo: string, descricao: string) {
    const t = (tipo ?? "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    const d = (descricao ?? "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

    if (t === "receita" || d.includes("receita") || d.includes("faturamento")) return "receita";
    if (
      t.includes("mao") ||
      t.includes("obra") ||
      d.includes("mao de obra") ||
      d.includes("salario")
    )
      return "maoDeObra";
    if (
      t.includes("manutencao") ||
      d.includes("manutencao") ||
      d.includes("peca") ||
      d.includes("servico")
    )
      return "manutencao";
    if (t.includes("encargo") || d.includes("encargo") || d.includes("inss") || d.includes("fgts"))
      return "encargos";
    if (
      t.includes("transporte") ||
      d.includes("transporte") ||
      d.includes("frete") ||
      d.includes("combustivel")
    )
      return "transporte";
    if (
      t.includes("imposto") ||
      d.includes("imposto") ||
      d.includes("taxa") ||
      d.includes("deducao")
    )
      return "impostos";
    return "outros";
  }

  const resumos = useMemo(() => {
    const totais = {
      receita: 0,
      maoDeObra: 0,
      manutencao: 0,
      encargos: 0,
      transporte: 0,
      impostos: 0,
      outros: 0,
    };

    lancamentosFiltrados.forEach((l) => {
      const cat = classificarCategoria(l.tipo, l.descricao);
      const valor = Number(l.valor) || 0;
      if (cat === "receita") {
        totais.receita += valor;
      } else {
        totais[cat] += valor;
      }
    });

    const despesasTotais =
      totais.maoDeObra +
      totais.manutencao +
      totais.encargos +
      totais.transporte +
      totais.impostos +
      totais.outros;
    const resultadoFinal = totais.receita - despesasTotais;
    const margemLucro = totais.receita > 0 ? (resultadoFinal / totais.receita) * 100 : 0;

    return {
      receita: totais.receita,
      despesasTotais,
      resultadoFinal,
      margemLucro,
      maoDeObra: totais.maoDeObra,
      manutencao: totais.manutencao,
      encargos: totais.encargos,
      transporte: totais.transporte,
      impostos: totais.impostos,
      outros: totais.outros,
    };
  }, [lancamentosFiltrados]);

  const pieData = useMemo(() => {
    const porMes = new Map<string, Record<string, number | string>>();
    lancamentosFiltrados.forEach((lancamento) => {
      const mes = lancamento.data.substring(0, 7);
      const contrato = lancamento.contrato || "Sem contrato";
      const linha = porMes.get(mes) ?? { mes };
      const valor = Number(lancamento.valor) || 0;
      const categoria = classificarCategoria(lancamento.tipo, lancamento.descricao);
      linha[contrato] = Number(linha[contrato] || 0) + (categoria === "receita" ? valor : -valor);
      porMes.set(mes, linha);
    });

    return Array.from(porMes.values())
      .sort((a, b) => String(a.mes).localeCompare(String(b.mes)))
      .map((linha) => ({
        ...linha,
        mesLabel: new Intl.DateTimeFormat("pt-BR", {
          month: "short",
          year: "2-digit",
          timeZone: "UTC",
        }).format(new Date(`${linha.mes}-01T00:00:00Z`)),
      }));
  }, [lancamentosFiltrados]);

  const contratosComparativo = useMemo(
    () => listaContratos.filter((contrato) => pieData.some((linha) => contrato in linha)),
    [listaContratos, pieData],
  );

  return (
    <div className="space-y-6 text-slate-100">
      {/* Grid KPI + Rosca */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:col-span-2">
          <Card className="border-slate-700 bg-slate-800/90 text-slate-100 shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold text-slate-300 uppercase">
                Receita Bruta
              </CardTitle>
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-400">
                {formatBRL(resumos.receita)}
              </div>
              <p className="text-xs text-slate-400 mt-1">Entradas acumuladas</p>
            </CardContent>
          </Card>

          <Card className="border-slate-700 bg-slate-800/90 text-slate-100 shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold text-slate-300 uppercase">
                Custos / Despesas
              </CardTitle>
              <TrendingDown className="w-4 h-4 text-rose-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-rose-400">
                {formatBRL(resumos.despesasTotais)}
              </div>
              <p className="text-xs text-slate-400 mt-1">Total de saídas</p>
            </CardContent>
          </Card>

          <Card className="border-slate-700 bg-slate-800/90 text-slate-100 shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold text-slate-300 uppercase">
                Resultado Final
              </CardTitle>
              <DollarSign
                className={`w-4 h-4 ${resumos.resultadoFinal >= 0 ? "text-blue-400" : "text-rose-400"}`}
              />
            </CardHeader>
            <CardContent>
              <div
                className={`text-2xl font-bold ${resumos.resultadoFinal >= 0 ? "text-blue-400" : "text-rose-400"}`}
              >
                {formatBRL(resumos.resultadoFinal)}
              </div>
              <p className="text-xs text-slate-400 mt-1">Saldo líquido</p>
            </CardContent>
          </Card>

          <Card className="border-slate-700 bg-slate-800/90 text-slate-100 shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold text-slate-300 uppercase">
                Margem Líquida
              </CardTitle>
              <PieChartIcon className="w-4 h-4 text-purple-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-400">
                {resumos.margemLucro.toFixed(1)}%
              </div>
              <p className="text-xs text-slate-400 mt-1">Representatividade líquida</p>
            </CardContent>
          </Card>
        </div>

        {/* Comparativo mensal por contrato */}
        <Card className="border-slate-700 bg-slate-800/90 text-slate-100 shadow-md flex flex-col justify-between">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-slate-300 uppercase">
              Comparativo mensal por contrato
            </CardTitle>
          </CardHeader>
          <CardContent className="h-72 p-0 pr-4">
            {pieData.length === 0 || contratosComparativo.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Sem lançamentos para comparar
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pieData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="mesLabel" tick={{ fill: "#94A3B8", fontSize: 11 }} />
                  <YAxis
                    tick={{ fill: "#94A3B8", fontSize: 10 }}
                    tickFormatter={(value) => `${value / 1000}k`}
                  />
                  <Tooltip
                    formatter={(value: number) => formatBRL(value)}
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      borderColor: "#334155",
                      color: "#F8FAFC",
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: "11px", color: "#F8FAFC" }} />
                  {contratosComparativo.map((contrato, index) => (
                    <Bar
                      key={contrato}
                      dataKey={contrato}
                      name={contrato}
                      fill={COLORS[index % COLORS.length]}
                      radius={[3, 3, 0, 0]}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detalhamento */}
      <Card className="border-slate-700 bg-slate-800/90 text-slate-100 shadow-md">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold uppercase text-slate-300">
            Detalhamento de Custos Operacionais
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 text-center">
            <div className="p-3 rounded-lg border border-slate-700 bg-slate-900/90">
              <span className="text-xs text-slate-400 block">Mão de Obra</span>
              <span className="text-sm font-bold text-slate-100">
                {formatBRL(resumos.maoDeObra)}
              </span>
            </div>
            <div className="p-3 rounded-lg border border-slate-700 bg-slate-900/90">
              <span className="text-xs text-slate-400 block">Manutenção</span>
              <span className="text-sm font-bold text-slate-100">
                {formatBRL(resumos.manutencao)}
              </span>
            </div>
            <div className="p-3 rounded-lg border border-slate-700 bg-slate-900/90">
              <span className="text-xs text-slate-400 block">Encargos</span>
              <span className="text-sm font-bold text-slate-100">
                {formatBRL(resumos.encargos)}
              </span>
            </div>
            <div className="p-3 rounded-lg border border-slate-700 bg-slate-900/90">
              <span className="text-xs text-slate-400 block">Transporte</span>
              <span className="text-sm font-bold text-slate-100">
                {formatBRL(resumos.transporte)}
              </span>
            </div>
            <div className="p-3 rounded-lg border border-slate-700 bg-slate-900/90 col-span-2 sm:col-span-1">
              <span className="text-xs text-slate-400 block">Impostos (Deduções)</span>
              <span className="text-sm font-bold text-slate-100">
                {formatBRL(resumos.impostos)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
