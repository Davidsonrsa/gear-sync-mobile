
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, ChevronRight, Plus, Gauge, ShieldCheck, Trash2, Edit2, AlertTriangle, Calendar } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Notificacoes } from "@/components/Notificacoes";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/equipamentos/")({
  component: EquipamentosList,
});

type Equip = {
  id: string;
  numero: string;
  identificacao: string | null;
  placa: string | null;
  localizacao: string | null;
  operador_contato: string | null;
  horimetro_atual: number | null;
  h_revisao: number | null;
  limite_revisao: number | null;
  proxima_revisao_horimetro: number | null;
  data_horimetro_atual: string | null;
  status: string | null;
  cl: string | null;
  cover_storage_path: string | null;
};

type Seguro = {
  id: string;
  veiculo_equipamento: string;
  seguradora: string;
  data_vencimento: string;
};

function calcularDiasVencimento(dataVencimentoStr: string): number | null {
  if (!dataVencimentoStr) return null;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const [ano, mes, dia] = dataVencimentoStr.split("-").map(Number);
  const dataVenc = new Date(ano, mes - 1, dia);
  dataVenc.setHours(0, 0, 0, 0);

  const diffTempo = dataVenc.getTime() - hoje.getTime();
  return Math.ceil(diffTempo / (1000 * 60 * 60 * 24));
}

// ----------------------------------------------------
// COMPONENTE: TACOGRAFO (Lendo da VIEW)
// ----------------------------------------------------
function BotaoTacografo() {
  const [open, setOpen] = useState(false);
  const [filtro, setFiltro] = useState("");

  const { data: tacografos, isLoading } = useQuery({
    queryKey: ["tacografos-vencimentos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tacografos_vencimentos")
        .select("*");

      if (error) {
        console.error("Erro ao carregar tacógrafos:", error);
        return [];
      }
      return data ?? [];
    },
  });

  // 1. Filtra apenas registros com data válida
  const tacografosComData = useMemo(() => {
    if (!tacografos) return [];
    return tacografos.filter((item: any) => {
      const dataVal = item.data_vencimento || item.vencimento_tacografo || item.vencimento;
      return Boolean(dataVal);
    });
  }, [tacografos]);

  // 2. Identifica registros com 30 dias ou menos para vencer (ou já vencidos)
  const tacografosComAlerta = useMemo(() => {
    return tacografosComData.filter((item: any) => {
      const dataVal = item.data_vencimento || item.vencimento_tacografo || item.vencimento;
      const dias = calcularDiasVencimento(dataVal);
      return dias !== null && dias <= 30;
    });
  }, [tacografosComData]);

  // 3. Aplica o filtro de busca de texto
  const listaFiltrada = useMemo(() => {
    const f = filtro.toLowerCase().trim();
    if (!f) return tacografosComData;
    return tacografosComData.filter((item: any) =>
      Object.values(item).some((val) =>
        String(val ?? "").toLowerCase().includes(f)
      )
    );
  }, [tacografosComData, filtro]);

  return (
    <>
      <Button variant="outline" size="sm" className="h-9 relative" onClick={() => setOpen(true)}>
        <Calendar className="w-4 h-4 mr-1.5" />
        Tacógrafo
        {tacografosComAlerta.length > 0 && (
          <Badge
            variant="destructive"
            className="ml-1.5 px-1.5 py-0 text-[10px] h-4 rounded-full font-bold bg-amber-500 hover:bg-amber-600 text-white"
          >
            {tacografosComAlerta.length}
          </Badge>
        )}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          style={{ backgroundColor: "#ffffff", opacity: 1 }}
          className="sm:max-w-md text-slate-900 border border-slate-300 shadow-2xl p-0 overflow-hidden"
        >
          <DialogHeader className="p-4 pb-3 border-b border-slate-200 bg-slate-50">
            <DialogTitle className="text-slate-900 font-bold text-base">
              Vencimentos de Tacógrafo
            </DialogTitle>
          </DialogHeader>

          <div className="p-4 max-h-[70vh] overflow-y-auto space-y-3 bg-white">
            {/* Mensagem de Alerta para vencimentos em 30 dias */}
            {tacografosComAlerta.length > 0 && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2 text-amber-900 text-xs">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Atenção aos Vencimentos!</p>
                  <p className="text-[11px] text-amber-800">
                    Existe(m) <strong>{tacografosComAlerta.length}</strong> tacógrafo(s) vencido(s) ou que vence(m) nos próximos 30 dias.
                  </p>
                </div>
              </div>
            )}

            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <Input
                placeholder="Filtrar por equipamento, placa..."
                value={filtro}
                onChange={(e) => setFiltro(e.target.value)}
                className="pl-8 h-8 text-xs bg-white border-slate-300 text-slate-900"
              />
            </div>

            {isLoading ? (
              <p className="text-xs text-slate-500 text-center py-4">Carregando dados...</p>
            ) : listaFiltrada.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-4">
                {filtro
                  ? "Nenhum registro encontrado."
                  : "Nenhum equipamento com data de tacógrafo cadastrada."}
              </p>
            ) : (
              <div className="space-y-2">
                {listaFiltrada.map((item: any, idx: number) => {
                  const dataVal =
                    item.data_vencimento || item.vencimento_tacografo || item.vencimento;
                  const diasRestantes = calcularDiasVencimento(dataVal);
                  const isVencido = diasRestantes !== null && diasRestantes < 0;
                  const isVencendoEmBreve =
                    diasRestantes !== null && diasRestantes >= 0 && diasRestantes <= 30;

                  return (
                    <div
                      key={item.id || idx}
                      className={`p-3 rounded-lg border text-xs flex justify-between items-center shadow-sm ${
                        isVencido
                          ? "bg-red-50 border-red-200"
                          : isVencendoEmBreve
                          ? "bg-amber-50 border-amber-200"
                          : "bg-slate-50 border-slate-200"
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-slate-900">
                            {item.numero ||
                              item.veiculo_equipamento ||
                              item.equipamento ||
                              "Equipamento"}
                          </p>
                          {isVencido && (
                            <Badge className="bg-red-600 text-white text-[10px] px-1.5 py-0">
                              Vencido
                            </Badge>
                          )}
                          {isVencendoEmBreve && (
                            <Badge className="bg-amber-500 text-white text-[10px] px-1.5 py-0">
                              Vence em {diasRestantes === 0 ? "Hoje" : `${diasRestantes}d`}
                            </Badge>
                          )}
                        </div>
                        {item.placa && <p className="text-slate-500 font-mono mt-0.5">{item.placa}</p>}
                      </div>
                      <div className="text-right">
                        <p className="text-slate-500 font-medium">Vencimento:</p>
                        <p className="font-bold text-slate-900">
                          {dataVal
                            ? new Date(dataVal + "T00:00:00").toLocaleDateString("pt-BR")
                            : "-"}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ----------------------------------------------------
// COMPONENTE: SEGURO
// ----------------------------------------------------
function BotaoSeguro() {
  const [open, setOpen] = useState(false);
  const [aba, setAba] = useState<"lista" | "novo">("lista");
  const [loading, setLoading] = useState(false);
  const [seguros, setSeguros] = useState<Seguro[]>([]);
  const [filtro, setFiltro] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [veiculo, setVeiculo] = useState("");
  const [seguradora, setSeguradora] = useState("");
  const [dataVencimento, setDataVencimento] = useState("");

  const carregarSeguros = async () => {
    const { data, error } = await supabase
      .from("seguros")
      .select("*")
      .order("data_vencimento", { ascending: true });

    if (!error && data) {
      setSeguros(data as Seguro[]);
    }
  };

  useEffect(() => {
    carregarSeguros();
  }, []);

  useEffect(() => {
    if (open) {
      carregarSeguros();
      setAba("lista");
    }
  }, [open]);

  const segurosComAlerta = useMemo(() => {
    return seguros.filter((s) => {
      const dias = calcularDiasVencimento(s.data_vencimento);
      return dias !== null && dias <= 30;
    });
  }, [seguros]);

  const resetForm = () => {
    setEditingId(null);
    setVeiculo("");
    setSeguradora("");
    setDataVencimento("");
  };

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (editingId) {
      const { error } = await supabase
        .from("seguros")
        .update({
          veiculo_equipamento: veiculo,
          seguradora: seguradora,
          data_vencimento: dataVencimento,
        })
        .eq("id", editingId);

      setLoading(false);

      if (error) {
        toast.error("Erro ao atualizar seguro: " + error.message);
      } else {
        toast.success("Seguro atualizado!");
        resetForm();
        setAba("lista");
        carregarSeguros();
      }
    } else {
      const { error } = await supabase.from("seguros").insert([
        {
          veiculo_equipamento: veiculo,
          seguradora: seguradora,
          data_vencimento: dataVencimento,
        },
      ]);

      setLoading(false);

      if (error) {
        toast.error("Erro ao cadastrar seguro: " + error.message);
      } else {
        toast.success("Seguro cadastrado!");
        resetForm();
        setAba("lista");
        carregarSeguros();
      }
    }
  };

  const handleIniciarEdicao = (seguro: Seguro) => {
    setEditingId(seguro.id);
    setVeiculo(seguro.veiculo_equipamento);
    setSeguradora(seguro.seguradora);
    setDataVencimento(seguro.data_vencimento);
    setAba("novo");
  };

  const handleExcluir = async (id: string) => {
    if (!confirm("Deseja realmente excluir este seguro?")) return;

    const { error } = await supabase.from("seguros").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao remover seguro.");
    } else {
      toast.success("Seguro removido!");
      carregarSeguros();
    }
  };

  const segurosFiltrados = useMemo(() => {
    const f = filtro.toLowerCase().trim();
    if (!f) return seguros;
    return seguros.filter(
      (s) =>
        s.veiculo_equipamento.toLowerCase().includes(f) ||
        s.seguradora.toLowerCase().includes(f)
    );
  }, [seguros, filtro]);

  return (
    <>
      <Button variant="outline" size="sm" className="h-9 relative" onClick={() => setOpen(true)}>
        <ShieldCheck className="w-4 h-4 mr-1.5" />
        Seguro
        {segurosComAlerta.length > 0 && (
          <Badge
            variant="destructive"
            className="ml-1.5 px-1.5 py-0 text-[10px] h-4 rounded-full font-bold bg-red-600 text-white"
          >
            {segurosComAlerta.length}
          </Badge>
        )}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          style={{ backgroundColor: "#ffffff", opacity: 1 }}
          className="sm:max-w-md text-slate-900 border border-slate-300 shadow-2xl p-0 overflow-hidden"
        >
          <DialogHeader className="p-4 pb-3 border-b border-slate-200 bg-slate-50">
            <DialogTitle className="text-slate-900 font-bold text-base flex items-center justify-between pr-6">
              <span>Gerenciar Seguros</span>
            </DialogTitle>

            <div className="flex gap-2 mt-3">
              <Button
                type="button"
                size="sm"
                variant={aba === "lista" ? "default" : "outline"}
                className="flex-1 text-xs h-8"
                onClick={() => {
                  resetForm();
                  setAba("lista");
                }}
              >
                Seguros Cadastrados ({seguros.length})
              </Button>
              <Button
                type="button"
                size="sm"
                variant={aba === "novo" ? "default" : "outline"}
                className="flex-1 text-xs h-8"
                onClick={() => {
                  resetForm();
                  setAba("novo");
                }}
              >
                {editingId ? "Editar Seguro" : "+ Cadastrar Novo"}
              </Button>
            </div>
          </DialogHeader>

          <div className="p-4 max-h-[70vh] overflow-y-auto bg-white">
            {aba === "lista" && (
              <div className="space-y-3">
                {segurosComAlerta.length > 0 && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2 text-amber-900 text-xs">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">Atenção aos Vencimentos!</p>
                      <p className="text-[11px] text-amber-800">
                        Existe(m) <strong>{segurosComAlerta.length}</strong> seguro(s) vencido(s) ou que vence(m) nos próximos 30 dias.
                      </p>
                    </div>
                  </div>
                )}

                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <Input
                    placeholder="Filtrar equipamento ou seguradora..."
                    value={filtro}
                    onChange={(e) => setFiltro(e.target.value)}
                    className="pl-8 h-8 text-xs bg-white border-slate-300 text-slate-900"
                  />
                </div>

                {segurosFiltrados.length === 0 ? (
                  <p className="text-xs text-slate-500 py-6 text-center">
                    {filtro ? "Nenhum seguro encontrado." : "Nenhum seguro cadastrado ainda."}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {segurosFiltrados.map((item) => {
                      const diasRestantes = calcularDiasVencimento(item.data_vencimento);
                      const isVencido = diasRestantes !== null && diasRestantes < 0;
                      const isVencendoEmBreve =
                        diasRestantes !== null && diasRestantes >= 0 && diasRestantes <= 30;

                      return (
                        <div
                          key={item.id}
                          className={`p-3 rounded-lg border text-xs flex justify-between items-center shadow-sm ${
                            isVencido
                              ? "bg-red-50 border-red-200"
                              : isVencendoEmBreve
                              ? "bg-amber-50 border-amber-200"
                              : "bg-slate-50 border-slate-200"
                          }`}
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-slate-900 text-sm">
                                {item.veiculo_equipamento}
                              </p>

                              {isVencido && (
                                <Badge className="bg-red-600 text-white text-[10px] px-1.5 py-0">
                                  Vencido
                                </Badge>
                              )}
                              {isVencendoEmBreve && (
                                <Badge className="bg-amber-500 text-white text-[10px] px-1.5 py-0">
                                  Vence em {diasRestantes === 0 ? "Hoje" : `${diasRestantes}d`}
                                </Badge>
                              )}
                            </div>

                            <p className="text-slate-600 font-medium">{item.seguradora}</p>
                            <p className="text-[11px] font-mono text-slate-700 font-medium">
                              Vencimento:{" "}
                              <span className="font-bold">
                                {item.data_vencimento
                                  ? new Date(item.data_vencimento + "T00:00:00").toLocaleDateString(
                                      "pt-BR"
                                    )
                                  : "-"}
                              </span>
                            </p>
                          </div>

                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-slate-600 hover:text-slate-900 hover:bg-slate-200"
                              title="Editar"
                              onClick={() => handleIniciarEdicao(item)}
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-600 hover:bg-red-50"
                              title="Excluir"
                              onClick={() => handleExcluir(item.id)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {aba === "novo" && (
              <form onSubmit={handleSalvar} className="space-y-3">
                <div>
                  <Label className="text-xs font-semibold text-slate-700">Veículo / Equipamento</Label>
                  <Input
                    required
                    placeholder="Ex: CB-01 ou Escavadeira"
                    value={veiculo}
                    onChange={(e) => setVeiculo(e.target.value)}
                    className="bg-white border-slate-300 text-slate-900"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold text-slate-700">Seguradora</Label>
                  <Input
                    required
                    placeholder="Ex: Porto Seguro"
                    value={seguradora}
                    onChange={(e) => setSeguradora(e.target.value)}
                    className="bg-white border-slate-300 text-slate-900"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold text-slate-700">Data de Vencimento</Label>
                  <Input
                    type="date"
                    required
                    value={dataVencimento}
                    onChange={(e) => setDataVencimento(e.target.value)}
                    className="bg-white border-slate-300 text-slate-900"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-1/2"
                    onClick={() => {
                      resetForm();
                      setAba("lista");
                    }}
                  >
                    Voltar / Cancelar
                  </Button>
                  <Button type="submit" className="w-1/2 bg-blue-600 hover:bg-blue-700 text-white" disabled={loading}>
                    {loading ? "Salvando..." : editingId ? "Atualizar" : "Salvar Seguro"}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ----------------------------------------------------
// TELA PRINCIPAL
// ----------------------------------------------------
function EquipamentosList() {
  const { isAdmin } = useAuth();
  const [q, setQ] = useState("");
  const [cl, setCl] = useState<string>("__all");
  const [onlyOverdue, setOnlyOverdue] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["equipamentos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("equipamentos")
        .select(
          "id, numero, identificacao, placa, localizacao, operador_contato, horimetro_atual, h_revisao, limite_revisao, proxima_revisao_horimetro, data_horimetro_atual, status, cl, cover_storage_path"
        )
        .order("numero", { ascending: true });

      if (error) throw error;
      return (data ?? []) as Equip[];
    },
  });

  const [covers, setCovers] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!data) return;
    const paths = data.filter((e) => e.cover_storage_path).map((e) => e.cover_storage_path!);
    if (!paths.length) return;
    (async () => {
      const { data: signed } = await supabase.storage
        .from("equipamento-fotos")
        .createSignedUrls(paths, 60 * 60);
      const map: Record<string, string> = {};
      (signed ?? []).forEach((s) => {
        if (s.path && s.signedUrl) map[s.path] = s.signedUrl;
      });
      setCovers(map);
    })();
  }, [data]);

  const clOptions = useMemo(() => {
    const s = new Set<string>();
    (data ?? []).forEach((e) => e.cl && s.add(e.cl));
    return Array.from(s).sort();
  }, [data]);

  const filtered = useMemo(() => {
    if (!data) return [];
    const s = q.trim().toLowerCase();
    return data.filter((e) => {
      if (cl !== "__all" && (e.cl ?? "") !== cl) return false;
      const hrRodado =
        e.horimetro_atual != null && e.h_revisao != null
          ? Math.max(0, Number(e.horimetro_atual) - Number(e.h_revisao))
          : null;
      const overdue = hrRodado != null && hrRodado > Number(e.limite_revisao ?? 500);
      if (onlyOverdue && !overdue) return false;
      if (
        s &&
        ![e.numero, e.identificacao, e.placa, e.localizacao, e.operador_contato, e.status]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(s))
      )
        return false;
      return true;
    });
  }, [data, q, cl, onlyOverdue]);

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto w-full space-y-4">
      {/* Header & Filtros */}
      <div className="sticky top-[60px] md:top-[76px] z-20 p-3 bg-white/90 backdrop-blur-md rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Buscar veículo, placa, local..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-9 h-9 text-xs border-slate-200 bg-slate-50/50 focus:bg-white transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <BotaoTacografo />
          <BotaoSeguro />

          <Select value={cl} onValueChange={setCl}>
            <SelectTrigger className="h-9 text-xs w-[130px] bg-white border-slate-200">
              <SelectValue placeholder="Classe (CL)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">Todas as CL</SelectItem>
              {clOptions.map((c) => (
                <SelectItem key={c} value={c}>CL {c}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            type="button"
            size="sm"
            variant={onlyOverdue ? "destructive" : "outline"}
            onClick={() => setOnlyOverdue((v) => !v)}
            className="h-9 text-xs border-slate-200"
          >
            {onlyOverdue ? "Apenas Vencidos" : "Vencidos"}
          </Button>

          <Notificacoes />
        </div>
      </div>

      {/* Contador de Equipamentos */}
      <div className="flex justify-between items-center px-1">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          {isLoading ? "Carregando..." : `Frota Cadastrada (${filtered.length})`}
        </p>
      </div>

      {/* Lista/Grid de Cards de Frota */}
      {!isLoading && filtered.length === 0 && (
        <Card className="p-12 text-center border-dashed border-slate-200 bg-slate-50">
          <Gauge className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <p className="text-xs font-medium text-slate-600">Nenhum equipamento localizado.</p>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

{filtered.map((e) => {
  const hrRodado =
    e.horimetro_atual != null && e.h_revisao != null
      ? Math.max(0, Number(e.horimetro_atual) - Number(e.h_revisao))
      : 0;
  const limite = Number(e.limite_revisao ?? 500);
  const overdue = hrRodado > limite;
  const pct = Math.min(100, Math.round((hrRodado / limite) * 100));
  const coverUrl = e.cover_storage_path ? covers[e.cover_storage_path] : null;

  return (
    <Link key={e.id} to="/equipamentos/$id" params={{ id: e.id }} className="group block">
      <Card
        className={`p-3.5 rounded-2xl transition-all border-2 relative ${
          overdue
            ? "border-red-500 bg-red-50 animate-pulse"
            : "border-slate-200 bg-white hover:border-slate-300"
        }`}
        style={
          overdue
            ? {
                backgroundColor: "#fef2f2",
                borderColor: "#ef4444",
              }
            : undefined
        }
      >
        <div className="flex gap-3 items-start">
          {/* Foto / Ícone */}
          {coverUrl ? (
            <img
              src={coverUrl}
              alt={e.numero}
              className="w-14 h-14 rounded-xl object-cover border border-slate-200 shrink-0"
            />
          ) : (
            <div className="w-14 h-14 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 text-slate-400">
              <Gauge className="w-6 h-6" />
            </div>
          )}

          {/* Informações Principais */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className={`font-bold text-sm ${overdue ? "text-red-900" : "text-slate-800"}`}>
                  {e.numero}
                </span>
                {e.cl && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200/70 text-slate-700">
                    CL {e.cl}
                  </span>
                )}
                {overdue && (
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white shadow-sm"
                    style={{ backgroundColor: "#ef4444", color: "#ffffff" }}
                  >
                    Revisão vencida
                  </span>
                )}
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
            </div>

            {e.identificacao && (
              <p className={`text-xs mt-0.5 truncate ${overdue ? "text-red-800" : "text-slate-500"}`}>
                {e.identificacao}
              </p>
            )}

            <div className={`flex items-center gap-2 mt-1 text-[11px] font-mono ${overdue ? "text-red-700" : "text-slate-500"}`}>
              {e.placa && <span>{e.placa}</span>}
              {e.localizacao && <span>• {e.localizacao}</span>}
            </div>
          </div>
        </div>

        {/* Barra de Progresso e Horímetro */}
        <div className="mt-3 space-y-1">
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-slate-200 h-2 rounded-full overflow-hidden">
              <div
                className="h-full transition-all duration-300"
                style={{
                  width: `${pct}%`,
                  backgroundColor: overdue ? "#ef4444" : "#f59e0b",
                }}
              />
            </div>
            <span className={`text-xs font-bold font-mono ${overdue ? "text-red-800" : "text-slate-700"}`}>
              {e.horimetro_atual ?? 0}h
            </span>
          </div>

          <div className="flex justify-between items-center text-[10px]">
            <span className={overdue ? "text-red-700 font-semibold" : "text-slate-400"}>
              Hr rodado: {hrRodado}h
            </span>
            <span className={overdue ? "text-red-700 font-semibold" : "text-slate-400"}>
              limite: {limite}h
            </span>
          </div>
        </div>
      </Card>
    </Link>
  );
})}
      </div>

      {isAdmin && (
        <Link to="/admin">
          <Button
            size="icon"
            className="fixed bottom-6 right-6 h-12 w-12 rounded-full shadow-lg bg-blue-600 hover:bg-blue-700 text-white z-30"
          >
            <Plus className="w-5 h-5" />
          </Button>
        </Link>
      )}
    </div>
  );
}
