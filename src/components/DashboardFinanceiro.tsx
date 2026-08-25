import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Filter, TrendingUp, TrendingDown, DollarSign, PieChart as PieChartIcon } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

export interface ItemFinanceiro {
  id: string;
  contrato: string;
  contrato_id?: string;
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
  // ... mantem as regras e calculos ...

  return (
    <div className="space-y-6 text-slate-100">
      {/* Selector de Contrato */}
      <div className="flex items-center gap-3 p-3 rounded-lg border border-slate-700 bg-slate-800/80">
        <Filter className="w-4 h-4 text-emerald-400" />
        <label htmlFor="modal-select-contrato" className="text-sm font-medium text-slate-200 whitespace-nowrap">
          Filtrar por Contrato:
        </label>
        <select
          id="modal-select-contrato"
          className="flex h-9 w-full md:w-80 rounded-md border border-slate-600 bg-slate-950 px-3 py-1 text-sm text-slate-100 shadow-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
          value={contratoSelecionado}
          onChange={(e) => setContratoSelecionado(e.target.value)}
        >
          <option value="TODOS" style={{ backgroundColor: "#020617", color: "#ffffff" }}>
            Todos os Contratos
          </option>
          {listaContratos.map((c) => (
            <option key={c} value={c} style={{ backgroundColor: "#020617", color: "#ffffff" }}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {/* Grid KPI + Rosca */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:col-span-2">
          <Card className="border-slate-700 bg-slate-800/90 text-slate-100 shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold text-slate-300 uppercase">Receita Bruta</CardTitle>
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-400">{formatBRL(resumos.receita)}</div>
              <p className="text-xs text-slate-400 mt-1">Entradas acumuladas</p>
            </CardContent>
          </Card>

          <Card className="border-slate-700 bg-slate-800/90 text-slate-100 shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold text-slate-300 uppercase">Custos / Despesas</CardTitle>
              <TrendingDown className="w-4 h-4 text-rose-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-rose-400">{formatBRL(resumos.despesasTotais)}</div>
              <p className="text-xs text-slate-400 mt-1">Total de saídas</p>
            </CardContent>
          </Card>

          <Card className="border-slate-700 bg-slate-800/90 text-slate-100 shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold text-slate-300 uppercase">Resultado Final</CardTitle>
              <DollarSign className={`w-4 h-4 ${resumos.resultadoFinal >= 0 ? "text-blue-400" : "text-rose-400"}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${resumos.resultadoFinal >= 0 ? "text-blue-400" : "text-rose-400"}`}>
                {formatBRL(resumos.resultadoFinal)}
              </div>
              <p className="text-xs text-slate-400 mt-1">Saldo líquido</p>
            </CardContent>
          </Card>

          <Card className="border-slate-700 bg-slate-800/90 text-slate-100 shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold text-slate-300 uppercase">Margem Líquida</CardTitle>
              <PieChartIcon className="w-4 h-4 text-purple-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-400">{resumos.margemLucro.toFixed(1)}%</div>
              <p className="text-xs text-slate-400 mt-1">Representatividade líquida</p>
            </CardContent>
          </Card>
        </div>

        {/* Gráfico de Rosca */}
        <Card className="border-slate-700 bg-slate-800/90 text-slate-100 shadow-md flex flex-col justify-between">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-slate-300 uppercase">
              Distribuição por Tipo de Custo
            </CardTitle>
          </CardHeader>
          <CardContent className="h-64 flex items-center justify-center p-0">
            {pieData.length === 0 ? (
              <span className="text-xs text-slate-400">Sem despesas registradas</span>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => formatBRL(value)}
                    contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", color: "#F8FAFC" }}
                  />
                  <Legend wrapperStyle={{ fontSize: "12px", color: "#F8FAFC" }} />
                </PieChart>
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
              <span className="text-sm font-bold text-slate-100">{formatBRL(resumos.maoDeObra)}</span>
            </div>
            <div className="p-3 rounded-lg border border-slate-700 bg-slate-900/90">
              <span className="text-xs text-slate-400 block">Manutenção</span>
              <span className="text-sm font-bold text-slate-100">{formatBRL(resumos.manutencao)}</span>
            </div>
            <div className="p-3 rounded-lg border border-slate-700 bg-slate-900/90">
              <span className="text-xs text-slate-400 block">Encargos</span>
              <span className="text-sm font-bold text-slate-100">{formatBRL(resumos.encargos)}</span>
            </div>
            <div className="p-3 rounded-lg border border-slate-700 bg-slate-900/90">
              <span className="text-xs text-slate-400 block">Transporte</span>
              <span className="text-sm font-bold text-slate-100">{formatBRL(resumos.transporte)}</span>
            </div>
            <div className="p-3 rounded-lg border border-slate-700 bg-slate-900/90 col-span-2 sm:col-span-1">
              <span className="text-xs text-slate-400 block">Impostos (Deduções)</span>
              <span className="text-sm font-bold text-slate-100">{formatBRL(resumos.impostos)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
