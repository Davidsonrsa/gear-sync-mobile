import React, { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import { Wallet, Percent, ArrowUpCircle, ArrowDownCircle } from "lucide-react";

export type TipoLancamento =
  | "Receita"
  | "Impostos"
  | "Mão de Obra"
  | "Encargos"
  | "Despesas de Manutenção"
  | "Despesas de Transporte"
  | "Despesas Administrativas";

export interface ItemFinanceiro {
  id: string;
  contrato: string;
  contrato_id?: string;
  tipo: TipoLancamento;
  descricao: string;
  valor: number;
  data: string;
}

interface DashboardFinanceiroProps {
  lancamentos?: ItemFinanceiro[];
}

export function DashboardFinanceiro({ lancamentos = [] }: DashboardFinanceiroProps) {
  const dados = useMemo(() => {
    let receitaBruta = 0;
    let impostos = 0;
    let maoDeObra = 0;
    let manutencao = 0;
    let encargos = 0;
    let transporte = 0;
    let administrativas = 0;

    lancamentos.forEach((item) => {
      const val = item.valor || 0;
      switch (item.tipo) {
        case "Receita":
          receitaBruta += val;
          break;
        case "Impostos":
          impostos += val;
          break;
        case "Mão de Obra":
          maoDeObra += val;
          break;
        case "Despesas de Manutenção":
          manutencao += val;
          break;
        case "Encargos":
          encargos += val;
          break;
        case "Despesas de Transporte":
          transporte += val;
          break;
        case "Despesas Administrativas":
          administrativas += val;
          break;
      }
    });

    return {
      receitaBruta,
      impostos,
      maoDeObra,
      manutencao,
      encargos,
      transporte,
      administrativas,
    };
  }, [lancamentos]);

  // Cálculos consolidados
  const custosTotais =
    dados.maoDeObra +
    dados.manutencao +
    dados.encargos +
    dados.transporte +
    dados.administrativas;

  const resultadoFinal = dados.receitaBruta - dados.impostos - custosTotais;
  const margemLiquida =
    dados.receitaBruta > 0 ? (resultadoFinal / dados.receitaBruta) * 100 : 0;

  // Montagem do gráfico dinâmico
  const dadosCustos = [
    { name: "Mão de Obra", value: dados.maoDeObra, color: "#3b82f6" },
    { name: "Manutenção", value: dados.manutencao, color: "#f59e0b" },
    { name: "Encargos", value: dados.encargos, color: "#10b981" },
    { name: "Transporte", value: dados.transporte, color: "#8b5cf6" },
    { name: "Administrativas", value: dados.administrativas, color: "#ec4899" },
  ].filter((item) => item.value > 0);

  const formatarMoeda = (val: number) =>
    val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="p-4 bg-slate-900 text-slate-100 rounded-2xl border border-slate-800 space-y-4">
      {/* Cabeçalho */}
      <div className="flex justify-between items-center border-b border-slate-800 pb-3">
        <div>
          <h2 className="text-lg font-bold text-white tracking-wide">
            PAINEL DE DESEMPENHO FINANCEIRO
          </h2>
          <p className="text-xs text-slate-400">
            Acompanhamento consolidado de Receitas x Despesas da Frota
          </p>
        </div>
        <span className="text-xs bg-slate-800 text-blue-400 px-3 py-1 rounded-full font-mono border border-slate-700">
          2026
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Lateral Esquerda: Indicadores Principais */}
        <div className="space-y-3 lg:col-span-1">
          <Card className="p-4 bg-gradient-to-br from-blue-700 to-blue-900 border-none text-white shadow-lg">
            <div className="flex justify-between items-center opacity-80 mb-1">
              <span className="text-xs font-semibold uppercase">Receita Bruta</span>
              <ArrowUpCircle className="w-5 h-5 text-emerald-400" />
            </div>
            <p className="text-xl font-extrabold font-mono">
              {formatarMoeda(dados.receitaBruta)}
            </p>
            <p className="text-[10px] text-blue-200 mt-1">Entradas acumuladas</p>
          </Card>

          <Card className="p-4 bg-slate-800/90 border-slate-700 text-white shadow-md">
            <div className="flex justify-between items-center opacity-80 mb-1">
              <span className="text-xs font-semibold uppercase text-slate-400">
                Custos / Despesas
              </span>
              <ArrowDownCircle className="w-5 h-5 text-red-400" />
            </div>
            <p className="text-xl font-extrabold font-mono text-red-400">
              {formatarMoeda(custosTotais)}
            </p>
            <p className="text-[10px] text-slate-400 mt-1">
              M.O, Manutenção e outros
            </p>
          </Card>

          <Card className="p-4 bg-slate-800/90 border-slate-700 text-white shadow-md">
            <div className="flex justify-between items-center opacity-80 mb-1">
              <span className="text-xs font-semibold uppercase text-slate-400">
                Resultado Final
              </span>
              <Wallet className="w-5 h-5 text-emerald-400" />
            </div>
            <p
              className={`text-xl font-extrabold font-mono ${
                resultadoFinal >= 0 ? "text-emerald-400" : "text-red-400"
              }`}
            >
              {formatarMoeda(resultadoFinal)}
            </p>
            <p className="text-[10px] text-slate-400 mt-1">Saldo Líquido</p>
          </Card>

          <Card className="p-4 bg-slate-800/90 border-slate-700 text-white shadow-md">
            <div className="flex justify-between items-center opacity-80 mb-1">
              <span className="text-xs font-semibold uppercase text-slate-400">
                Margem Líquida
              </span>
              <Percent className="w-5 h-5 text-blue-400" />
            </div>
            <p className="text-xl font-extrabold font-mono text-blue-400">
              {margemLiquida.toFixed(1)}%
            </p>
            <p className="text-[10px] text-slate-400 mt-1">Representatividade líquida</p>
          </Card>
        </div>

        {/* Área Central: Detalhamento Operacional */}
        <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Gráfico de Rosca */}
          <Card className="p-4 bg-slate-800/50 border-slate-700 text-white flex flex-col justify-between">
            <h3 className="text-xs font-bold text-slate-300 uppercase mb-2">
              Distribuição por Tipo de Custo
            </h3>
            <div className="h-48 w-full">
              {dadosCustos.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={dadosCustos}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {dadosCustos.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => formatarMoeda(value)}
                      contentStyle={{
                        backgroundColor: "#1e293b",
                        borderColor: "#334155",
                        borderRadius: "8px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-500">
                  Nenhum custo lançado no período
                </div>
              )}
            </div>
            <div className="flex flex-wrap justify-center gap-3 text-xs mt-2">
              {dadosCustos.map((item) => (
                <div key={item.name} className="flex items-center gap-1.5">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-slate-300">{item.name}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Tabela Analítica dos Custos */}
          <Card className="p-4 bg-slate-800/50 border-slate-700 text-white">
            <h3 className="text-xs font-bold text-slate-300 uppercase mb-3">
              Detalhamento de Custos Operacionais
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between p-2 rounded bg-slate-800/80 border border-slate-700">
                <span className="text-slate-300">Mão de Obra</span>
                <span className="font-bold font-mono text-white">
                  {formatarMoeda(dados.maoDeObra)}
                </span>
              </div>
              <div className="flex justify-between p-2 rounded bg-slate-800/80 border border-slate-700">
                <span className="text-slate-300">Manutenção</span>
                <span className="font-bold font-mono text-white">
                  {formatarMoeda(dados.manutencao)}
                </span>
              </div>
              <div className="flex justify-between p-2 rounded bg-slate-800/80 border border-slate-700">
                <span className="text-slate-300">Encargos</span>
                <span className="font-mono text-slate-300">
                  {formatarMoeda(dados.encargos)}
                </span>
              </div>
              <div className="flex justify-between p-2 rounded bg-slate-800/80 border border-slate-700">
                <span className="text-slate-300">Transporte</span>
                <span className="font-mono text-slate-300">
                  {formatarMoeda(dados.transporte)}
                </span>
              </div>
              <div className="flex justify-between p-2 rounded bg-slate-800/80 border border-slate-700 opacity-70">
                <span className="text-slate-400">Impostos (Deduções)</span>
                <span className="font-mono text-slate-400">
                  {formatarMoeda(dados.impostos)}
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
