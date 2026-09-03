import { useState, useMemo, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { DashboardFinanceiro } from "@/components/DashboardFinanceiro";
import { requireAdmin } from "@/lib/route-guards";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  Pencil,
  Settings,
  ClipboardList,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/custos/")({
  beforeLoad: requireAdmin,
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
  contrato_id?: string | null;
  tipo: TipoLancamento;
  descricao: string;
  valor: number;
  data: string;
}

export interface MedicaoDiariaItem {
  id: string;
  contrato: string;
  contrato_id?: string | null;
  equipamento: string;
  operador: string;
  data: string;
  manha_inicio: string;
  manha_final: string;
  tarde_inicio: string;
  tarde_final: string;
  valor_hora: number;
  observacao: string;
}

function CustosPage() {
  const [lancamentos, setLancamentos] = useState<ItemFinanceiro[]>([]);
  const [medicoes, setMedicoes] = useState<MedicaoDiariaItem[]>([]);
  const [contratos, setContratos] = useState<ContratoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submittingMedicao, setSubmittingMedicao] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [msgMedicao, setMsgMedicao] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Form states (Custos)
  const [contratoSelecionado, setContratoSelecionado] = useState<string>("");
  const [novoContratoNome, setNovoContratoNome] = useState<string>("");
  const [isCriandoContrato, setIsCriandoContrato] = useState<boolean>(false);
  const [contratoEditando, setContratoEditando] = useState<ContratoItem | null>(null);
  const [novoNomeEditado, setNovoNomeEditado] = useState("");

  const [tipo, setTipo] = useState<TipoLancamento>("Despesas de Manutenção");
  const [description, setDescription] = useState("");
  const [value, setValue] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);

  // Form states (Medições Diárias)
  const [medContrato, setMedContrato] = useState("");
  const [medEquipamento, setMedEquipamento] = useState("");
  const [medOperador, setMedOperador] = useState("");
  const [medData, setMedData] = useState(new Date().toISOString().split("T")[0]);
  const [medManhaInicio, setMedManhaInicio] = useState("08:00");
  const [medManhaFinal, setMedManhaFinal] = useState("12:00");
  const [medTardeInicio, setMedTardeInicio] = useState("13:00");
  const [medTardeFinal, setMedTardeFinal] = useState("17:00");
  const [medValorHora, setMedValorHora] = useState("");
  const [medObservacao, setMedObservacao] = useState("");

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
    fetchMedicoes();
  }, []);

  async function fetchContratos() {
    try {
      const { data, error } = await supabase.from("contratos").select("*");
      if (error) throw error;
      if (data) {
        const lista: ContratoItem[] = data
          .map((c: any) => ({
            id: String(c.id),
            nome: String(c.nome_contrato || c.nome || c.descricao || c.cliente || "").trim(),
          }))
          .filter((c) => c.nome !== "");

        setContratos(lista);
        if (lista.length > 0) {
          if (!contratoSelecionado) setContratoSelecionado(lista[0].nome);
          if (!medContrato) setMedContrato(lista[0].nome);
        }
      }
    } catch (err) {
      console.error("Erro ao carregar contratos:", err);
    }
  }

  async function fetchData() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("custos")
        .select("*")
        .order("data", { ascending: false });

      if (error) throw error;

      if (data) {
        const mappedData: ItemFinanceiro[] = data.map((item: any) => ({
          id: item.id?.toString() || crypto.randomUUID(),
          contrato: item.contrato || "",
          contrato_id: item.contrato_id ? String(item.contrato_id) : undefined,
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

  async function fetchMedicoes() {
    try {
      const { data, error } = await supabase
        .from("medicoes_diarias")
        .select("*")
        .order("data", { ascending: false });

      if (error) throw error;

      if (data) {
        const mappedMed: MedicaoDiariaItem[] = data.map((item: any) => ({
          id: item.id?.toString() || crypto.randomUUID(),
          contrato: item.contrato || "",
          contrato_id: item.contrato_id ? String(item.contrato_id) : undefined,
          equipamento: item.equipamento || "",
          operador: item.operador || "",
          data: item.data || new Date().toISOString().split("T")[0],
          manha_inicio: item.manha_inicio || "",
          manha_final: item.manha_final || "",
          tarde_inicio: item.tarde_inicio || "",
          tarde_final: item.tarde_final || "",
          valor_hora: Number(item.valor_hora) || 0,
          observacao: item.observacao || "",
        }));
        setMedicoes(mappedMed);
      }
    } catch (err) {
      console.error("Erro ao carregar medições:", err);
    }
  }

  const listaTodosContratos = useMemo(() => {
    const mapaContratos = new Map<string, ContratoItem>();
    contratos.forEach((c) => {
      if (c.nome && c.nome.trim()) {
        mapaContratos.set(c.nome.trim().toLowerCase(), { id: c.id, nome: c.nome.trim() });
      }
    });
    lancamentos.forEach((l) => {
      if (l.contrato && l.contrato.trim()) {
        const chave = l.contrato.trim().toLowerCase();
        if (!mapaContratos.has(chave)) {
          mapaContratos.set(chave, { id: l.contrato_id || `virtual-${l.contrato.trim()}`, nome: l.contrato.trim() });
        }
      }
    });
    return Array.from(mapaContratos.values()).sort((a, b) => a.nome.localeCompare(b.nome));
  }, [contratos, lancamentos]);

  async function handleSalvarMedicao(e: React.FormEvent) {
    e.preventDefault();
    setSubmittingMedicao(true);
    setMsgMedicao(null);

    const valorHoraNum = parseFloat(medValorHora);
    if (isNaN(valorHoraNum) || valorHoraNum < 0) {
      setMsgMedicao({ type: "error", text: "Informe um valor por hora válido." });
      setSubmittingMedicao(false);
      return;
    }

    const contratoObj = contratos.find((c) => c.nome === medContrato);

    try {
      const num = (v: string) => (v === "" || v === null ? null : Number(v));
      const payload = {
        contrato: medContrato,
        contrato_id: contratoObj?.id || null,
        equipamento: medEquipamento,
        operador: medOperador,
        data: medData,
        manha_inicio: medManhaInicio,
        manha_final: medManhaFinal,
        tarde_inicio: medTardeInicio,
        tarde_final: medTardeFinal,
        valor_hora: valorHoraNum,
        observacao: medObservacao,
      };

      const { data, error } = await supabase
        .from("medicoes_diarias")
        .insert([
          {
            ...payload,
            manha_inicio: num(medManhaInicio),
            manha_final: num(medManhaFinal),
            tarde_inicio: num(medTardeInicio),
            tarde_final: num(medTardeFinal),
          },
        ])
        .select()
        .single();

      if (error) throw error;

      const novaMedicao: MedicaoDiariaItem = {
        id: data?.id?.toString() || crypto.randomUUID(),
        ...payload,
      };

      setMedicoes((prev) => [novaMedicao, ...prev]);
      setMsgMedicao({ type: "success", text: "Medição diária salva com sucesso!" });

      // Limpar campos secundários
      setMedEquipamento("");
      setMedOperador("");
      setMedObservacao("");
      setMedValorHora("");
    } catch (err: any) {
      console.error("Erro ao salvar medição:", err);
      setMsgMedicao({ type: "error", text: "Erro ao salvar medição no banco." });
    } finally {
      setSubmittingMedicao(false);
    }
  }

  async function handleDeletarMedicao(id: string) {
    try {
      const { error } = await supabase.from("medicoes_diarias").delete().eq("id", Number(id));
      if (error) throw error;
      setMedicoes((prev) => prev.filter((m) => m.id !== id));
    } catch (err) {
      console.error("Erro ao deletar medição:", err);
    }
  }

  async function handleSubmitCusto(e: React.FormEvent) {
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

        if (contractErr) throw contractErr;
        if (newContract) {
          setContratos((prev) => [...prev, { id: String(newContract.id), nome: nomeContratoFinal }]);
        }
      } catch (err) {
        console.warn("Erro ao salvar novo contrato:", err);
      }
    }

    const itemContratoObj = contratos.find((c) => c.nome === nomeContratoFinal);

    try {
      const { data, error } = await supabase
        .from("custos")
        .insert([
          {
            contrato: nomeContratoFinal,
            contrato_id: itemContratoObj?.id || null,
            categoria: tipo,
            descricao: description,
            valor: numValue,
            data: date,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      const novoItem: ItemFinanceiro = {
        id: data?.id?.toString() || Date.now().toString(),
        contrato: nomeContratoFinal,
        contrato_id: itemContratoObj?.id,
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
    } catch (err) {
      console.error("Erro ao salvar lançamento:", err);
      setMessage({ type: "error", text: "Erro ao salvar lançamento." });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeletarCusto(id: string) {
    try {
      const { error } = await supabase.from("custos").delete().eq("id", id);
      if (error) throw error;
      setLancamentos((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      console.error("Erro ao deletar registro:", err);
    }
  }

  const lancamentosFiltrados = useMemo(() => {
    return lancamentos.filter((item) => {
      const mesItem = item.data.substring(0, 7);
      const matchMes = filtroMes === "TODOS" || mesItem === filtroMes;
      const matchContrato =
        filtroContrato === "TODOS" ||
        item.contrato.trim().toLowerCase() === filtroContrato.trim().toLowerCase();
      return matchMes && matchContrato;
    });
  }, [lancamentos, filtroMes, filtroContrato]);

  const resumos = useMemo(() => {
    let receita = 0, impostos = 0, maoDeObra = 0, encargos = 0, manutencao = 0, transporte = 0, administrativas = 0;
    lancamentosFiltrados.forEach((item) => {
      switch (item.tipo) {
        case "Receita": receita += item.valor; break;
        case "Impostos": impostos += item.valor; break;
        case "Mão de Obra": maoDeObra += item.valor; break;
        case "Encargos": encargos += item.valor; break;
        case "Despesas de Manutenção": manutencao += item.valor; break;
        case "Despesas de Transporte": transporte += item.valor; break;
        case "Despesas Administrativas": administrativas += item.valor; break;
      }
    });
    const despesasTotais = impostos + maoDeObra + encargos + manutencao + transporte + administrativas;
    const resultadoFinal = receita - despesasTotais;
    const margemLucro = receita > 0 ? (resultadoFinal / receita) * 100 : 0;
    return { receita, impostos, maoDeObra, encargos, manutencao, transporte, administrativas, despesasTotais, resultadoFinal, margemLucro };
  }, [lancamentosFiltrados]);

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gestão Financeira e Medições</h1>
          <p className="text-sm text-muted-foreground">
            Acompanhamento de receitas, impostos, custos operacionais e medições diárias.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* BOTÃO DE LANÇAMENTO DE MEDIÇÃO DIÁRIA */}
          <Dialog>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
                <ClipboardList className="w-4 h-4" />
                Lançar Medição Diária
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl bg-white text-slate-900 max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Formulário de Medição Diária</DialogTitle>
              </DialogHeader>

              <form onSubmit={handleSalvarMedicao} className="space-y-4 pt-2">
                {msgMedicao && (
                  <div
                    className={`p-3 rounded-md text-sm ${
                      msgMedicao.type === "success"
                        ? "bg-green-100 text-green-800 border border-green-200"
                        : "bg-red-100 text-red-800 border border-red-200"
                    }`}
                  >
                    {msgMedicao.text}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="med-contrato">Contrato</Label>
                    <select
                      id="med-contrato"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={medContrato}
                      onChange={(e) => setMedContrato(e.target.value)}
                    >
                      {listaTodosContratos.map((c) => (
                        <option key={c.id} value={c.nome}>
                          {c.nome}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="med-data">Data</Label>
                    <Input
                      id="med-data"
                      type="date"
                      value={medData}
                      onChange={(e) => setMedData(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="med-equipamento">Equipamento</Label>
                    <Input
                      id="med-equipamento"
                      type="text"
                      placeholder="Ex: Escavadeira CAT 320"
                      value={medEquipamento}
                      onChange={(e) => setMedEquipamento(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="med-operador">Operador</Label>
                    <Input
                      id="med-operador"
                      type="text"
                      placeholder="Nome do Operador"
                      value={medOperador}
                      onChange={(e) => setMedOperador(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Turno da Manhã (Início - Fim)</Label>
                    <div className="flex gap-2">
                      <Input
                        type="time"
                        value={medManhaInicio}
                        onChange={(e) => setMedManhaInicio(e.target.value)}
                      />
                      <Input
                        type="time"
                        value={medManhaFinal}
                        onChange={(e) => setMedManhaFinal(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Turno da Tarde (Início - Fim)</Label>
                    <div className="flex gap-2">
                      <Input
                        type="time"
                        value={medTardeInicio}
                        onChange={(e) => setMedTardeInicio(e.target.value)}
                      />
                      <Input
                        type="time"
                        value={medTardeFinal}
                        onChange={(e) => setMedTardeFinal(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="med-valor">Valor Hora (R$)</Label>
                    <Input
                      id="med-valor"
                      type="number"
                      step="0.01"
                      placeholder="0,00"
                      value={medValorHora}
                      onChange={(e) => setMedValorHora(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="med-obs">Observações</Label>
                    <Input
                      id="med-obs"
                      type="text"
                      placeholder="Detalhes ou ocorrências do dia"
                      value={medObservacao}
                      onChange={(e) => setMedObservacao(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button type="submit" disabled={submittingMedicao} className="bg-emerald-600 hover:bg-emerald-700">
                    {submittingMedicao ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Salvar Medição Diária
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          {/* DASHBOARD MODAL */}
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2">
                <PieChart className="w-4 h-4 text-primary" />
                Dashboard
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-5xl border-slate-800 text-slate-100 p-0 max-h-[90vh] overflow-hidden shadow-2xl !bg-[#0f172a]">
              <div className="relative w-full h-full p-6 overflow-y-auto bg-[#0f172a]">
                <DialogHeader className="mb-4">
                  <DialogTitle className="text-slate-100">Painel de Desempenho Financeiro</DialogTitle>
                </DialogHeader>
                <DashboardFinanceiro lancamentos={lancamentosFiltrados} />
              </div>
            </DialogContent>
          </Dialog>
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
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
              value={filtroMes === "TODOS" ? "" : filtroMes}
              onChange={(e) => setFiltroMes(e.target.value || "TODOS")}
            />
          </div>
          <div className="flex items-center gap-2 min-w-[220px]">
            <Label className="text-xs whitespace-nowrap">Contrato:</Label>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
              value={filtroContrato}
              onChange={(e) => setFiltroContrato(e.target.value)}
            >
              <option value="TODOS">Todos os Contratos</option>
              {listaTodosContratos.map((c) => (
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
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">Receita Bruta</CardTitle>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{formatBRL(resumos.receita)}</div>
          </CardContent>
        </Card>

        <Card className="bg-white border-l-4 border-l-amber-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">Impostos</CardTitle>
            <PieChart className="w-4 h-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{formatBRL(resumos.impostos)}</div>
          </CardContent>
        </Card>

        <Card className="bg-white border-l-4 border-l-rose-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">Custos / Despesas</CardTitle>
            <TrendingDown className="w-4 h-4 text-rose-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-600">{formatBRL(resumos.despesasTotais - resumos.impostos)}</div>
          </CardContent>
        </Card>

        <Card className={`bg-white border-l-4 shadow-sm ${resumos.resultadoFinal >= 0 ? "border-l-blue-600" : "border-l-red-600"}`}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">Resultado Final</CardTitle>
            <DollarSign className={`w-4 h-4 ${resumos.resultadoFinal >= 0 ? "text-blue-600" : "text-red-600"}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${resumos.resultadoFinal >= 0 ? "text-blue-600" : "text-red-600"}`}>
              {formatBRL(resumos.resultadoFinal)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Formulário de Custos Financeiros */}
      <Card className="bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <PlusCircle className="w-5 h-5 text-primary" />
            Novo Lançamento Financeiro
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmitCusto} className="space-y-4">
            {message && (
              <div className={`p-3 rounded-md text-sm ${message.type === "success" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                {message.text}
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contrato">Contrato</Label>
                <select
                  id="contrato"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={contratoSelecionado}
                  onChange={(e) => setContratoSelecionado(e.target.value)}
                >
                  {listaTodosContratos.map((c) => (
                    <option key={c.id} value={c.nome}>
                      {c.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tipo">Classificação Financeira</Label>
                <select
                  id="tipo"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
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
                <Label htmlFor="valor">Valor (R$)</Label>
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
                <Label htmlFor="descricao">Descrição</Label>
                <Input
                  id="descricao"
                  type="text"
                  placeholder="Detalhes do lançamento"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="data">Data</Label>
                <Input
                  id="data"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar Lançamento
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Histórico de Medições Diárias Cadastradas */}
      <Card className="bg-white shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Medições Diárias Registradas</CardTitle>
          <span className="text-xs text-muted-foreground">{medicoes.length} registro(s)</span>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground border-b">
              <tr>
                <th className="p-3">Data</th>
                <th className="p-3">Contrato</th>
                <th className="p-3">Equipamento</th>
                <th className="p-3">Operador</th>
                <th className="p-3">Manhã</th>
                <th className="p-3">Tarde</th>
                <th className="p-3 text-right">Vlr/Hora</th>
                <th className="p-3 text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              {medicoes.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-4 text-center text-muted-foreground">
                    Nenhuma medição diária registrada.
                  </td>
                </tr>
              ) : (
                medicoes.map((m) => (
                  <tr key={m.id} className="border-b hover:bg-muted/30">
                    <td className="p-3 whitespace-nowrap">{m.data}</td>
                    <td className="p-3 font-medium">{m.contrato}</td>
                    <td className="p-3">{m.equipamento}</td>
                    <td className="p-3">{m.operador}</td>
                    <td className="p-3 text-xs">{m.manha_inicio} às {m.manha_final}</td>
                    <td className="p-3 text-xs">{m.tarde_inicio} às {m.tarde_final}</td>
                    <td className="p-3 text-right font-semibold">{formatBRL(m.valor_hora)}</td>
                    <td className="p-3 text-center">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-rose-600 hover:bg-rose-50"
                        onClick={() => handleDeletarMedicao(m.id)}
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
