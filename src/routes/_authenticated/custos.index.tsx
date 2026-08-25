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

export interface ContratoItem {
  id: string;
  nome: string;
}

export interface ItemFinanceiro {
  id: string;
  contrato: string;
  contrato_id?: string;
  tipo: TipoLancamento;
  descricao: string;
  valor: number;
  data: string;
}

function CustosPage() {
  const [lancamentos, setLancamentos] = useState<ItemFinanceiro[]>([]);
  const [contratos, setContratos] = useState<ContratoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Form states
  const [contratoSelecionado, setContratoSelecionado] = useState<string>("Contrato Padrão - Frota");
  const [novoContratoNome, setNovoContratoNome] = useState<string>("");
  const [isCriandoContrato, setIsCriandoContrato] = useState<boolean>(false);
  
  const [tipo, setTipo] = useState<TipoLancamento>("Despesas de Manutenção");
  const [description, setDescription] = useState("");
  const [value, setValue] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);

  // Filter states
  const [filtroMes, setFiltroMes] = useState<string>("TODOS");
  const [filtroContrato, setFiltroContrato] = useState<string>("TODOS");

  const formatBRL = (val: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(val);
  };

  useEffect(() => {
    fetchContratos();
    fetchData();
  }, []);

  async function fetchContratos() {
    try {
      const { data, error } = await supabase
        .from("contratos")
        .select("id, nome_contrato")
        .order("nome_contrato");

      if (!error && data && data.length > 0) {
        setContratos(data.map((c: any) => ({ id: c.id, nome: c.nome_contrato })));
      } else {
        setContratos([{ id: "default", nome: "Contrato Padrão - Frota" }]);
      }
    } catch (err) {
      setContratos([{ id: "default", nome: "Contrato Padrão - Frota" }]);
    }
  }

  async function fetchData() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("custos")
        .select("*")
        .order("data", { ascending: false });

      if (!error && data) {
        const mappedData: ItemFinanceiro[] = data.map((item: any) => ({
          id: item.id?.toString() || Math.random().toString(),
          contrato: item.contrato || "Contrato Padrão - Frota",
          contrato_id: item.contrato_id,
          tipo: (item.categoria || item.tipo || "Despesas de Manutenção") as TipoLancamento,
          descricao: item.descricao || "",
          valor: Number(item.valor) || 0,
          data: item.data || new Date().toISOString().split("T")[0],
        }));
        setLancamentos(mappedData);
      }
    } catch (err) {
      console.error("Erro ao carregar lançamentos:", err);
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

    let nomeContratoFinal = contratoSelecionado;

    if (isCriandoContrato && novoContratoNome.trim() !== "") {
      nomeContratoFinal = novoContratoNome.trim();
      try {
        const { data: newContract, error: contractErr } = await supabase
          .from("contratos")
          .insert([{ nome_contrato: nomeContratoFinal }])
          .select()
          .single();

        if (!contractErr && newContract) {
          setContratos((prev) => [...prev, { id: newContract.id, nome: newContract.nome_contrato }]);
        }
      } catch (err) {
        console.warn("Não foi possível salvar novo contrato no banco:", err);
      }
    }

    const itemContratoObj = contratos.find((c) => c.nome === nomeContratoFinal);

    try {
      const { data, error } = await supabase
        .from("custos")
        .insert([
          {
            contrato: nomeContratoFinal,
            contrato_id: itemContratoObj?.id !== "default" ? itemContratoObj?.id : null,
            categoria: tipo,
            descricao: description,
            valor: numValue,
            data: date,
          },
        ])
        .select()
        .single();

      const idGerado = data?.id?.toString() || Date.now().toString();

      const novoItem: ItemFinanceiro = {
        id: idGerado,
        contrato: nomeContratoFinal,
        tipo,
        descricao: description,
        valor: numValue,
        data: date,
      };

      setLancamentos((prev) => [novoItem, ...prev]);
      setMessage({ type: "success", text: "Lançamento registrado com sucesso!" });
      
      setDescription("");
      setValue("");
      setNovoContratoNome("");
      setIsCriandoContrato(false);
      setContratoSelecionado(nomeContratoFinal);
    } catch (err: any) {
      setMessage({ type: "error", text: "Erro ao salvar lançamento." });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeletar(id: string) {
    try {
      await supabase.from("custos").delete().eq("id", id);
      setLancamentos((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      console.error("Erro ao deletar registro:", err);
    }
  }

  const lancamentosFiltrados = useMemo(() => {
    return lancamentos.filter((item) => {
      const mesItem = item.data.substring(0, 7);
      const matchMes = filtroMes === "TODOS" || mesItem === filtroMes;
      const matchContrato = filtroContrato === "TODOS" || item.contrato === filtroContrato;
      return matchMes && matchContrato;
    });
  }, [lancamentos, filtroMes, filtroContrato]);

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

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gestão Financeira de Contratos</h1>
          <p className="text-sm text-muted-foreground">
            Acompanhamento de receitas, impostos, custos operacionais e resultado líquido.
          </p>
        </div>
      </div>

      {/* Filtros */}
      <Card className="bg-white border shadow-sm">
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
              {contratos.map((c) => (
                <option key={c.id} value={c.nome}>
                  {c.nome}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white border-l-4 border-l-emerald-500 shadow-sm">
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

        <Card className="bg-white border-l-4 border-l-amber-500 shadow-sm">
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

        <Card className="bg-white border-l-4 border-l-rose-500 shadow-sm">
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

        <Card
          className={`bg-white border-l-4 shadow-sm ${
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

      {/* Detalhamento de Custos Operacionais */}
      <Card className="bg-white shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold uppercase text-muted-foreground">
            Detalhamento de Custos Operacionais
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 text-center">
            <div className="p-3 bg-white rounded-lg border">
              <span className="text-xs text-muted-foreground block">Mão de Obra</span>
              <span className="text-sm font-bold">{formatBRL(resumos.maoDeObra)}</span>
            </div>
            <div className="p-3 bg-white rounded-lg border">
              <span className="text-xs text-muted-foreground block">Encargos</span>
              <span className="text-sm font-bold">{formatBRL(resumos.encargos)}</span>
            </div>
            <div className="p-3 bg-white rounded-lg border">
              <span className="text-xs text-muted-foreground block">Manutenção</span>
              <span className="text-sm font-bold">{formatBRL(resumos.manutencao)}</span>
            </div>
            <div className="p-3 bg-white rounded-lg border">
              <span className="text-xs text-muted-foreground block">Transporte</span>
              <span className="text-sm font-bold">{formatBRL(resumos.transporte)}</span>
            </div>
            <div className="p-3 bg-white rounded-lg border col-span-2 sm:col-span-1">
              <span className="text-xs text-muted-foreground block">Administrativas</span>
              <span className="text-sm font-bold">{formatBRL(resumos.administrativas)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Formulário */}
      <Card className="bg-white shadow-sm">
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
                <div className="flex justify-between items-center">
                  <Label htmlFor="contrato" className="flex items-center gap-1">
                    <Briefcase className="w-3.5 h-3.5 text-muted-foreground" /> Contrato
                  </Label>
                  <button
                    type="button"
                    onClick={() => setIsCriandoContrato(!isCriandoContrato)}
                    className="text-xs text-primary underline focus:outline-none"
                  >
                    {isCriandoContrato ? "Selecionar Existente" : "+ Criar Novo"}
                  </button>
                </div>

                {isCriandoContrato ? (
                  <Input
                    type="text"
                    placeholder="Ex: Contrato Obra 02"
                    value={novoContratoNome}
                    onChange={(e) => setNovoContratoNome(e.target.value)}
                    required
                  />
                ) : (
                  <select
                    id="contrato"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={contratoSelecionado}
                    onChange={(e) => setContratoSelecionado(e.target.value)}
                  >
                    {contratos.map((c) => (
                      <option key={c.id} value={c.nome}>
                        {c.nome}
                      </option>
                    ))}
                  </select>
                )}
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

      {/* Tabela de Lançamentos */}
      <Card className="bg-white shadow-sm">
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
                <th className="p-3 text-right">Valor</th>
                <th className="p-3 text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-4 text-center">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto text-primary" />
                  </td>
                </tr>
              ) : lancamentosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-4 text-center text-muted-foreground">
                    Nenhum lançamento encontrado.
                  </td>
                </tr>
              ) : (
                lancamentosFiltrados.map((item) => (
                  <tr key={item.id} className="border-b hover:bg-muted/30">
                    <td className="p-3 whitespace-nowrap">{item.data}</td>
                    <td className="p-3 font-medium">{item.contrato}</td>
                    <td className="p-3">{item.tipo}</td>
                    <td className="p-3">{item.descricao}</td>
                    <td
                      className={`p-3 text-right font-semibold ${
                        item.tipo === "Receita" ? "text-emerald-600" : "text-rose-600"
                      }`}
                    >
                      {item.tipo === "Receita" ? "+" : "-"} {formatBRL(item.valor)}
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
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
