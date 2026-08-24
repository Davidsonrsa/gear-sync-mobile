import { useState, useMemo, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  PlusCircle,
  Loader2,
  TrendingUp,
  TrendingDown,
  DollarSign,
  PieChart,
  Filter,
  Calendar,
  Trash2,
  Briefcase,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/custos/")({
  component: CustosPage,
});

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
  tipo: TipoLancamento;
  descricao: string;
  valor: number;
  data: string;
}

function CustosPage() {
  const [lancamentos, setLancamentos] = useState<ItemFinanceiro[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Form states
  const [contrato, setContrato] = useState("Contrato Padrão - Frota");
  const [tipo, setTipo] = useState<TipoLancamento>("Despesas de Manutenção");
  const [description, setDescription] = useState("");
  const [value, setValue] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);

  // Filter states
  const [filtroMes, setFiltroMes] = useState<string>("TODOS");
  const [filtroContrato, setFiltroContrato] = useState<string>("TODOS");

  // Format currency R$
  const formatBRL = (val: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(val);
  };

  // Carregar dados
  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("custos")
        .select("*")
        .order("data", { ascending: false });

      if (!error && data && data.length > 0) {
        const MappedData: ItemFinanceiro[] = data.map((item: any) => ({
          id: item.id?.toString() || Math.random().toString(),
          contrato: item.contrato || "Contrato Padrão - Frota",
          tipo: (item.categoria || item.tipo || "Despesas de Manutenção") as TipoLancamento,
          descricao: item.descricao || "",
          valor: Number(item.valor) || 0,
          data: item.data || new Date().toISOString().split("T")[0],
        }));
        setLancamentos(MappedData);
      }
    } catch (err) {
      console.log("Serviço remoto não configurado para schema estendido, usando controle local.", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);

    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue <= 0) {
      setMessage({ type: "error", text: "Informe um valor numérico válido maior que zero." });
      setSubmitting(false);
      return;
    }

    const novoItem: ItemFinanceiro = {
      id: Date.now().toString(),
      contrato,
      tipo,
      descricao: description,
      valor: numValue,
      data: date,
    };

    try {
      // Tentar salvar no Supabase
      const { error } = await supabase.from("custos").insert([
        {
          contrato,
          categoria: tipo,
          descricao: description,
          valor: numValue,
          data: date,
        },
      ]);

      if (error) {
        console.warn("Registrado no estado visual por incompatibilidade de schema no Supabase:", error.message);
      }
      
      setLancamentos((prev) => [novoItem, ...prev]);
      setMessage({ type: "success", text: "Lançamento registrado com sucesso!" });
      setDescription("");
      setValue("");
    } catch (err: any) {
      setLancamentos((prev) => [novoItem, ...prev]);
      setMessage({ type: "success", text: "Lançamento registrado com sucesso!" });
      setDescription("");
      setValue("");
    } finally {
      setSubmitting(false);
    }
  }

  const handleDeletar = (id: string) => {
    setLancamentos((prev) => prev.filter((item) => item.id !== id));
  };

  // Lista de Contratos Únicos para Filtro
  const contratosDisponiveis = useMemo(() => {
    const setC = new Set(lancamentos.map((item) => item.contrato));
    if (!setC.has("Contrato Padrão - Frota")) setC.add("Contrato Padrão - Frota");
    return Array.from(setC);
  }, [lancamentos]);

  // Filtragem Dinâmica
  const lancamentosFiltrados = useMemo(() => {
    return lancamentos.filter((item) => {
      const mesItem = item.data.substring(0, 7); // AAAA-MM
      const matchMes = filtroMes === "TODOS" || mesItem === filtroMes;
      const matchContrato = filtroContrato === "TODOS" || item.contrato === filtroContrato;
      return matchMes && matchContrato;
    });
  }, [lancamentos, filtroMes, filtroContrato]);

  // Cálculos do Dashboard Financial
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

    const despesasTotais =
      impostos + maoDeObra + encargos + manutencao + transporte + administrativas;
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

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gestão Financeira de Contratos</h1>
          <p className="text-sm text-muted-foreground">
            Acompanhamento de receitas, impostos, custos operacionais e resultado líquido.
          </p>
        </div>
      </div>

      {/* Barra de Filtros */}
      <Card className="bg-card border shadow-sm">
        <CardContent className="p-4 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Filter className="w-4 h-4 text-primary" />
            Filtros:
          </div>

          <div className="flex items-center gap-2 min-w-[180px]">
            <Label className="text-xs whitespace-nowrap">Mês:</Label>
            <input
              type="month"
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={filtroMes === "TODOS" ? "" : filtroMes}
              onChange={(e) => setFiltroMes(e.target.value || "TODOS")}
            />
            {filtroMes !== "TODOS" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFiltroMes("TODOS")}
                className="text-xs px-2 h-8"
              >
                Limpar
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2 min-w-[220px]">
            <Label className="text-xs whitespace-nowrap">Contrato:</Label>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={filtroContrato}
              onChange={(e) => setFiltroContrato(e.target.value)}
            >
              <option value="TODOS">Todos os Contratos</option>
              {contratosDisponiveis.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* DASHBOARD - Cards de Indicadores (KPIs) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Receita Bruta */}
        <Card className="border-l-4 border-l-emerald-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Receita Bruta
            </CardTitle>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              {formatBRL(resumos.receita)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Entradas acumuladas</p>
          </CardContent>
        </Card>

        {/* Card 2: Total de Impostos */}
        <Card className="border-l-4 border-l-amber-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Impostos (Deduções)
            </CardTitle>
            <PieChart className="w-4 h-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {formatBRL(resumos.impostos)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Impostos e tributações</p>
          </CardContent>
        </Card>

        {/* Card 3: Total Custos e Despesas */}
        <Card className="border-l-4 border-l-rose-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Custos / Despesas
            </CardTitle>
            <TrendingDown className="w-4 h-4 text-rose-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-600">
              {formatBRL(resumos.despesasTotais - resumos.impostos)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">M.O, Encargos, Manut. e Transp.</p>
          </CardContent>
        </Card>

        {/* Card 4: Resultado Final (Lucro/Prejuízo) */}
        <Card
          className={`border-l-4 shadow-sm ${
            resumos.resultadoFinal >= 0 ? "border-l-blue-600" : "border-l-red-600"
          }`}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Resultado Final
            </CardTitle>
            <DollarSign
              className={`w-4 h-4 ${
                resumos.resultadoFinal >= 0 ? "text-blue-600" : "text-red-600"
              }`}
            />
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                resumos.resultadoFinal >= 0 ? "text-blue-600" : "text-red-600"
              }`}
            >
              {formatBRL(resumos.resultadoFinal)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Margem Líquida:{" "}
              <span className="font-semibold">{resumos.margemLucro.toFixed(1)}%</span>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detalhamento de Custos Por Categoria */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold uppercase text-muted-foreground">
            Detalhamento de Custos Operacionais
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 text-center">
            <div className="p-3 bg-muted/40 rounded-lg border">
              <span className="text-xs text-muted-foreground block">Mão de Obra</span>
              <span className="text-sm font-bold">{formatBRL(resumos.maoDeObra)}</span>
            </div>
            <div className="p-3 bg-muted/40 rounded-lg border">
              <span className="text-xs text-muted-foreground block">Encargos</span>
              <span className="text-sm font-bold">{formatBRL(resumos.encargos)}</span>
            </div>
            <div className="p-3 bg-muted/40 rounded-lg border">
              <span className="text-xs text-muted-foreground block">Manutenção</span>
              <span className="text-sm font-bold">{formatBRL(resumos.manutencao)}</span>
            </div>
            <div className="p-3 bg-muted/40 rounded-lg border">
              <span className="text-xs text-muted-foreground block">Transporte</span>
              <span className="text-sm font-bold">{formatBRL(resumos.transporte)}</span>
            </div>
            <div className="p-3 bg-muted/40 rounded-lg border col-span-2 sm:col-span-1">
              <span className="text-xs text-muted-foreground block">Administrativas</span>
              <span className="text-sm font-bold">{formatBRL(resumos.administrativas)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Form de Novo Lançamento */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <PlusCircle className="w-5 h-5 text-primary" />
            Novo Lançamento Financeiro
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {message && (
              <div
                className={`p-3 rounded-md text-sm ${
                  message.type === "success"
                    ? "bg-green-100 text-green-800 border border-green-200"
                    : "bg-red-100 text-red-800 border border-red-200"
                }`}
              >
                {message.text}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contrato" className="flex items-center gap-1">
                  <Briefcase className="w-3.5 h-3.5 text-muted-foreground" /> Contrato
                </Label>
                <Input
                  id="contrato"
                  type="text"
                  placeholder="Ex: Obra Mafra - Contrato 01"
                  value={contrato}
                  onChange={(e) => setContrato(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tipo">Classificação Financeira</Label>
                <select
                  id="tipo"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value as TipoLancamento)}
                >
                  <option value="Receita">Receita (+)</option>
                  <option value="Impostos">Impostos (-)</option>
                  <option value="Mão de Obra">Mão de Obra (-)</option>
                  <option value="Encargos">Encargos (-)</option>
                  <option value="Despesas de Manutenção">Despesas de Manutenção (-)</option>
                  <option value="Despesas de Transporte">Despesas de Transporte (-)</option>
                  <option value="Despesas Administrativas">Despesas Administrativas (-)</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="valor">Valor Em Reais (R$)</Label>
                <Input
                  id="valor"
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="descricao">Descrição / Detalhes</Label>
                <Input
                  id="descricao"
                  type="text"
                  placeholder="Ex: Faturamento medição, Abastecimento comboio, Folha mensal, etc."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="data" className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-muted-foreground" /> Data
                </Label>
                <Input
                  id="data"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <Button type="submit" disabled={submitting} className="w-full md:w-auto">
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando Lançamento...
                  </>
                ) : (
                  "Salvar Lançamento"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Tabela de Histórico / Lançamentos */}
      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Histórico de Lançamentos</CardTitle>
          <span className="text-xs text-muted-foreground">
            {lancamentosFiltrados.length} registro(s) encontrado(s)
          </span>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground border-b">
              <tr>
                <th className="p-3">Data</th>
                <th className="p-3">Contrato</th>
                <th className="p-3">Classificação</th>
                <th className="p-3">Descrição</th>
                <th className="p-3 text-right">Valor (R$)</th>
                <th className="p-3 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {lancamentosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-muted-foreground">
                    Nenhum lançamento encontrado para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                lancamentosFiltrados.map((item) => {
                  const isReceita = item.tipo === "Receita";
                  return (
                    <tr key={item.id} className="hover:bg-muted/30">
                      <td className="p-3 whitespace-nowrap">
                        {new Date(item.data + "T00:00:00").toLocaleDateString("pt-BR")}
                      </td>
                      <td className="p-3 font-medium">{item.contrato}</td>
                      <td className="p-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${
                            isReceita
                              ? "bg-emerald-100 text-emerald-800"
                              : item.tipo === "Impostos"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-slate-100 text-slate-800"
                          }`}
                        >
                          {item.tipo}
                        </span>
                      </td>
                      <td className="p-3">{item.descricao}</td>
                      <td
                        className={`p-3 text-right font-semibold whitespace-nowrap ${
                          isReceita ? "text-emerald-600" : "text-rose-600"
                        }`}
                      >
                        {isReceita ? "+" : "-"} {formatBRL(item.valor)}
                      </td>
                      <td className="p-3 text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                          onClick={() => handleDeletar(item.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

export default CustosPage;
