import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, ChevronRight, Plus, Gauge, ShieldCheck, AlertTriangle, Calendar } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Notificacoes } from "@/components/Notificacoes";
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
// COMPONENTE: TACOGRAFO
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

  const tacografosVencidos = useMemo(() => {
    if (!tacografos) return [];
    return tacografos.filter((item: any) => {
      const dataVal = item.data_vencimento || item.vencimento_tacografo || item.vencimento;
      if (!dataVal) return false;
      const dias = calcularDiasVencimento(dataVal);
      return dias !== null && dias < 0;
    });
  }, [tacografos]);

  const tacografosComAlerta = useMemo(() => {
    if (!tacografos) return [];
    return tacografos.filter((item: any) => {
      const dataVal = item.data_vencimento || item.vencimento_tacografo || item.vencimento;
      if (!dataVal) return false;
      const dias = calcularDiasVencimento(dataVal);
      return dias !== null && dias <= 30;
    });
  }, [tacografos]);

  const todosComStatus = useMemo(() => {
    if (!tacografos) return [];
    return tacografos
      .map((item: any) => {
        const dataVal = item.data_vencimento || item.vencimento_tacografo || item.vencimento;
        const diasRestantes = dataVal ? calcularDiasVencimento(dataVal) : null;
        
        const isVencido = diasRestantes !== null && diasRestantes < 0;
        const isVencendoEmBreve = diasRestantes !== null && diasRestantes >= 0 && diasRestantes <= 30;

        return {
          ...item,
          dataVal,
          diasRestantes,
          isVencido,
          isVencendoEmBreve,
        };
      })
      .sort((a, b) => {
        const pA = a.isVencido ? 0 : a.isVencendoEmBreve ? 1 : 2;
        const pB = b.isVencido ? 0 : b.isVencendoEmBreve ? 1 : 2;
        return pA - pB;
      });
  }, [tacografos]);

  const listaFiltrada = useMemo(() => {
    const f = filtro.toLowerCase().trim();
    if (!f) return todosComStatus;
    return todosComStatus.filter((item: any) =>
      Object.values(item).some((val) =>
        String(val ?? "").toLowerCase().includes(f)
      )
    );
  }, [todosComStatus, filtro]);

  return (
    <>
      <Button variant="outline" size="sm" className="h-9 relative bg-white gap-1.5" onClick={() => setOpen(true)}>
        <Calendar className="w-4 h-4 text-slate-500" />
        <span>Tacógrafo</span>
        {tacografosVencidos.length > 0 ? (
          <span
            className="font-bold text-[10px] h-5 min-w-[20px] px-1.5 flex items-center justify-center rounded-full border-none"
            style={{ backgroundColor: "#dc2626", color: "#ffffff" }}
          >
            {tacografosVencidos.length}
          </span>
        ) : null}
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
                Nenhum equipamento encontrado.
              </p>
            ) : (
              <div className="space-y-2">
                {listaFiltrada.map((item: any, idx: number) => {
                  let bgCard = "bg-slate-50 border-slate-200";
                  let badgeStyle = { backgroundColor: "#e2e8f0", color: "#334155" };
                  let badgeText = "Em dia";

                  if (item.isVencido) {
                    bgCard = "bg-red-50 border-red-200";
                    badgeStyle = { backgroundColor: "#dc2626", color: "#ffffff" };
                    badgeText = "Vencido";
                  } else if (item.isVencendoEmBreve) {
                    bgCard = "bg-amber-50 border-amber-200";
                    badgeStyle = { backgroundColor: "#f59e0b", color: "#ffffff" };
                    badgeText = item.diasRestantes === 0 ? "Hoje" : `Vence em ${item.diasRestantes}d`;
                  }

                  return (
                    <div
                      key={item.id || idx}
                      className={`p-3 rounded-lg border text-xs flex justify-between items-center shadow-sm ${bgCard}`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-slate-900">
                            {item.numero || item.veiculo_equipamento || item.equipamento || "Equipamento"}
                          </p>
                          <span
                            className="text-[10px] px-1.5 py-0.5 rounded-full font-bold shadow-sm inline-block"
                            style={badgeStyle}
                          >
                            {badgeText}
                          </span>
                        </div>
                        {item.placa && <p className="text-slate-500 font-mono mt-0.5">{item.placa}</p>}
                      </div>

                      <div className="text-right">
                        <p className="text-slate-500 font-medium text-[10px]">Vencimento:</p>
                        <p className="font-bold font-mono text-slate-900">
                          {item.dataVal
                            ? new Date(item.dataVal + "T00:00:00").toLocaleDateString("pt-BR")
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
  const [filtro, setFiltro] = useState("");

  const { data: seguros, isLoading } = useQuery({
    queryKey: ["seguros-vencimentos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("seguros")
        .select("*");

      if (error) {
        console.error("Erro ao carregar seguros:", error);
        return [];
      }
      return data ?? [];
    },
  });

  const segurosVencidos = useMemo(() => {
    if (!seguros) return [];
    return seguros.filter((item: any) => {
      const dataVal = item.vencimento || item.data_vencimento || item.vencimento_seguro;
      if (!dataVal) return false;
      const dias = calcularDiasVencimento(dataVal);
      return dias !== null && dias < 0;
    });
  }, [seguros]);

  const segurosComAlerta = useMemo(() => {
    if (!seguros) return [];
    return seguros.filter((item: any) => {
      const dataVal = item.vencimento || item.data_vencimento || item.vencimento_seguro;
      if (!dataVal) return false;
      const dias = calcularDiasVencimento(dataVal);
      return dias !== null && dias <= 30;
    });
  }, [seguros]);

  const todosComStatus = useMemo(() => {
    if (!seguros) return [];
    return seguros
      .map((item: any) => {
        const dataVal = item.vencimento || item.data_vencimento || item.vencimento_seguro;
        const diasRestantes = dataVal ? calcularDiasVencimento(dataVal) : null;
        
        const isVencido = diasRestantes !== null && diasRestantes < 0;
        const isVencendoEmBreve = diasRestantes !== null && diasRestantes >= 0 && diasRestantes <= 30;

        return {
          ...item,
          dataVal,
          diasRestantes,
          isVencido,
          isVencendoEmBreve,
        };
      })
      .sort((a, b) => {
        const pA = a.isVencido ? 0 : a.isVencendoEmBreve ? 1 : 2;
        const pB = b.isVencido ? 0 : b.isVencendoEmBreve ? 1 : 2;
        return pA - pB;
      });
  }, [seguros]);

  const listaFiltrada = useMemo(() => {
    const f = filtro.toLowerCase().trim();
    if (!f) return todosComStatus;
    return todosComStatus.filter((item: any) =>
      Object.values(item).some((val) =>
        String(val ?? "").toLowerCase().includes(f)
      )
    );
  }, [todosComStatus, filtro]);

  return (
    <>
      <Button variant="outline" size="sm" className="h-9 relative bg-white gap-1.5" onClick={() => setOpen(true)}>
        <ShieldCheck className="w-4 h-4 text-slate-500" />
        <span>Seguro</span>
        {segurosVencidos.length > 0 ? (
          <span
            className="font-bold text-[10px] h-5 min-w-[20px] px-1.5 flex items-center justify-center rounded-full border-none"
            style={{ backgroundColor: "#dc2626", color: "#ffffff" }}
          >
            {segurosVencidos.length}
          </span>
        ) : null}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          style={{ backgroundColor: "#ffffff", opacity: 1 }}
          className="sm:max-w-md text-slate-900 border border-slate-300 shadow-2xl p-0 overflow-hidden"
        >
          <DialogHeader className="p-4 pb-3 border-b border-slate-200 bg-slate-50">
            <DialogTitle className="text-slate-900 font-bold text-base">
              Gerenciar Seguros
            </DialogTitle>
          </DialogHeader>

          <div className="p-4 max-h-[70vh] overflow-y-auto space-y-3 bg-white">
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

            {isLoading ? (
              <p className="text-xs text-slate-500 text-center py-4">Carregando dados...</p>
            ) : listaFiltrada.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-4">
                Nenhum seguro encontrado.
              </p>
            ) : (
              <div className="space-y-2">
                {listaFiltrada.map((item: any, idx: number) => {
                  let bgCard = "bg-slate-50 border-slate-200";
                  let badgeStyle = { backgroundColor: "#e2e8f0", color: "#334155" };
                  let badgeText = "Em dia";

                  if (item.isVencido) {
                    bgCard = "bg-red-50 border-red-200";
                    badgeStyle = { backgroundColor: "#dc2626", color: "#ffffff" };
                    badgeText = "Vencido";
                  } else if (item.isVencendoEmBreve) {
                    bgCard = "bg-amber-50 border-amber-200";
                    badgeStyle = { backgroundColor: "#f59e0b", color: "#ffffff" };
                    badgeText = item.diasRestantes === 0 ? "Hoje" : `Vence em ${item.diasRestantes}d`;
                  }

                  return (
                    <div
                      key={item.id || idx}
                      className={`p-3 rounded-lg border text-xs flex justify-between items-center shadow-sm ${bgCard}`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-slate-900">
                            {item.equipamento || item.numero || item.veiculo_equipamento || "Equipamento"}
                          </p>
                          <span
                            className="text-[10px] px-1.5 py-0.5 rounded-full font-bold shadow-sm inline-block"
                            style={badgeStyle}
                          >
                            {badgeText}
                          </span>
                        </div>
                        <p className="text-slate-500 font-medium mt-0.5">
                          {item.seguradora || item.empresa || "Seguradora não informada"}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-slate-500 font-medium text-[10px]">Vencimento:</p>
                        <p className="font-bold font-mono text-slate-900">
                          {item.dataVal
                            ? new Date(item.dataVal + "T00:00:00").toLocaleDateString("pt-BR")
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

  const totalEquipamentosVencidos = useMemo(() => {
    if (!data) return 0;
    return data.filter((e) => {
      const hrRodado =
        e.horimetro_atual != null && e.h_revisao != null
          ? Math.max(0, Number(e.horimetro_atual) - Number(e.h_revisao))
          : 0;
      const limite = Number(e.limite_revisao ?? 500);
      return hrRodado > limite;
    }).length;
  }, [data]);

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
            className="h-9 text-xs border-slate-200 gap-1.5"
          >
            <span>{onlyOverdue ? "Apenas Vencidos" : "Vencidos"}</span>
            {totalEquipamentosVencidos > 0 ? (
              <span
                className="font-bold text-[10px] h-5 min-w-[20px] px-1.5 flex items-center justify-center rounded-full border-none"
                style={{ backgroundColor: "#dc2626", color: "#ffffff" }}
              >
                {totalEquipamentosVencidos}
              </span>
            ) : null}
          </Button>

          <Notificacoes />
        </div>
      </div>

      {/* Contador de Equipamentos */}
      <div className="flex justify-between items-center px-1">
        <p className="text-xs font-semibold text-black uppercase tracking-wider">
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
                className={`p-4 rounded-2xl transition-all border relative ${
                  overdue
                    ? "bg-red-50/90 border-red-300 shadow-sm"
                    : "bg-white border-slate-200 hover:border-slate-300 shadow-sm"
                }`}
              >
                {/* Topo do Card: Foto, Título, Badge e Seta */}
                <div className="flex gap-3 items-start">
                  {coverUrl ? (
                    <img
                      src={coverUrl}
                      alt={e.numero}
                      className="w-14 h-14 rounded-xl object-cover border border-slate-200 shrink-0 bg-white"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 text-slate-400">
                      <Gauge className="w-6 h-6" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-sm text-slate-900">
                          {e.numero}
                        </span>
                        {e.cl && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                            CL {e.cl}
                          </span>
                        )}
                        {overdue && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500 text-white shadow-sm">
                            Revisão vencida
                          </span>
                        )}
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                    </div>

                    {e.identificacao && (
                      <p className="text-xs text-slate-500 mt-0.5 truncate font-medium">
                        {e.identificacao}
                      </p>
                    )}

                    <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500 font-mono">
                      {e.placa && <span>{e.placa}</span>}
                      {e.localizacao && <span>• {e.localizacao}</span>}
                    </div>
                  </div>
                </div>

                {/* Rodapé do Card: Status, Barra de Progresso e Horímetro */}
                <div className="mt-3.5 space-y-2">
                  {!overdue && (
                    <div className="flex items-center">
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                          e.status === "Em manutenção" || e.status === "Manutenção"
                            ? "bg-amber-50 text-amber-700 border-amber-300"
                            : "bg-white text-slate-700 border-slate-300"
                        }`}
                      >
                        {e.status || "Operacional"}
                      </span>
                    </div>
                  )}

                  {/* Barra de Progresso e Horímetro Total */}
                  <div className="flex items-center gap-2 pt-0.5">
                    <div className="flex-1 bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200/50">
                      <div
                        className="h-full transition-all duration-300"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: overdue ? "#ef4444" : "#f59e0b",
                        }}
                      />
                    </div>
                    <span className="text-xs font-bold font-mono text-slate-900 shrink-0">
                      {e.horimetro_atual ?? 0}h
                    </span>
                  </div>

                  {/* Informações de Horas Rodadas e Limite */}
                  <div className="flex justify-between items-center text-[10px] text-slate-500 font-medium pt-0.5">
                    <span>Hr rodado: {hrRodado}h</span>
                    <span>limite: {limite}h</span>
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
