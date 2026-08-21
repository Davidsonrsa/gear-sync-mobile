import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, ChevronRight, Plus, Gauge, ShieldCheck, Trash2, Edit2, Check, X } from "lucide-react";
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

// Componente Completo de Gerenciamento de Seguros
function BotaoSeguro() {
  const [open, setOpen] = useState(false);
  const [aba, setAba] = useState<"lista" | "novo">("lista");
  const [loading, setLoading] = useState(false);
  const [seguros, setSeguros] = useState<Seguro[]>([]);
  const [filtro, setFiltro] = useState("");

  // Formulário Cadastro/Edição
  const [editingId, setEditingId] = useState<string | null>(null);
  const [veiculo, setVeiculo] = useState("");
  const [seguradora, setSeguradora] = useState("");
  const [dataVencimento, setDataVencimento] = useState("");

  const carregarSeguros = async () => {
    const { data, error } = await supabase
      .from("seguros")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setSeguros(data as Seguro[]);
    }
  };

  useEffect(() => {
    if (open) {
      carregarSeguros();
    }
  }, [open]);

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
      // Atualizar Seguro Existente
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
        toast.success("Seguro atualizado com sucesso!");
        resetForm();
        setAba("lista");
        carregarSeguros();
      }
    } else {
      // Inserir Novo Seguro
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
        toast.success("Seguro cadastrado com sucesso!");
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
    if (!confirm("Tem certeza que deseja excluir este seguro?")) return;

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
      <Button variant="outline" size="sm" className="h-9" onClick={() => setOpen(true)}>
        <ShieldCheck className="w-4 h-4 mr-1.5" /> Seguro
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md bg-background text-foreground border border-border shadow-2xl p-0 overflow-hidden">
          <DialogHeader className="p-4 pb-2 border-b">
            <DialogTitle className="flex justify-between items-center pr-6">
              <span>Gerenciar Seguros</span>
            </DialogTitle>

            {/* Navegação entre Lista e Novo Cadastro */}
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
                {editingId ? "Editar Seguro" : "+ Novo Seguro"}
              </Button>
            </div>
          </DialogHeader>

          <div className="p-4 max-h-[70vh] overflow-y-auto">
            {aba === "lista" && (
              <div className="space-y-3">
                {/* Campo de Filtro/Busca */}
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Filtrar por equipamento ou seguradora..."
                    value={filtro}
                    onChange={(e) => setFiltro(e.target.value)}
                    className="pl-8 h-8 text-xs"
                  />
                </div>

                {segurosFiltrados.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-6 text-center">
                    {filtro ? "Nenhum seguro encontrado para a busca." : "Nenhum seguro cadastrado."}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {segurosFiltrados.map((item) => (
                      <div
                        key={item.id}
                        className="p-3 rounded-lg bg-card border border-border text-xs flex justify-between items-center shadow-sm"
                      >
                        <div className="space-y-0.5">
                          <p className="font-semibold text-sm">{item.veiculo_equipamento}</p>
                          <p className="text-muted-foreground">{item.seguradora}</p>
                          <p className="text-[11px] font-mono text-primary font-medium mt-1">
                            Vencimento:{" "}
                            {item.data_vencimento
                              ? new Date(item.data_vencimento + "T00:00:00").toLocaleDateString("pt-BR")
                              : "-"}
                          </p>
                        </div>

                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            title="Editar"
                            onClick={() => handleIniciarEdicao(item)}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:bg-destructive/10"
                            title="Excluir"
                            onClick={() => handleExcluir(item.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {aba === "novo" && (
              <form onSubmit={handleSalvar} className="space-y-3">
                <div>
                  <Label className="text-xs">Veículo / Equipamento</Label>
                  <Input
                    required
                    placeholder="Ex: CB-01 ou Escavadeira"
                    value={veiculo}
                    onChange={(e) => setVeiculo(e.target.value)}
                  />
                </div>

                <div>
                  <Label className="text-xs">Seguradora</Label>
                  <Input
                    required
                    placeholder="Ex: Porto Seguro"
                    value={seguradora}
                    onChange={(e) => setSeguradora(e.target.value)}
                  />
                </div>

                <div>
                  <Label className="text-xs">Data de Vencimento</Label>
                  <Input
                    type="date"
                    required
                    value={dataVencimento}
                    onChange={(e) => setDataVencimento(e.target.value)}
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  {editingId && (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-1/2"
                      onClick={() => {
                        resetForm();
                        setAba("lista");
                      }}
                    >
                      Cancelar
                    </Button>
                  )}
                  <Button type="submit" className={editingId ? "w-1/2" : "w-full"} disabled={loading}>
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
    <div className="px-3 py-3 md:px-6 md:py-6 max-w-md md:max-w-7xl mx-auto w-full">
      <div className="sticky top-[60px] md:top-[76px] z-20 -mx-3 px-3 md:-mx-6 md:px-6 py-2 bg-background/85 backdrop-blur space-y-2 md:space-y-0 md:flex md:items-center md:gap-3">
        <div className="relative md:flex-1 md:max-w-lg">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar nº, placa, local, operador..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-9 h-11"
          />
        </div>
        <Notificacoes />
        <div className="flex gap-2 md:shrink-0 flex-wrap">
          <Select value={cl} onValueChange={setCl}>
            <SelectTrigger className="h-9 flex-1 md:w-40">
              <SelectValue placeholder="Classe (CL)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">Todas as CL</SelectItem>
              {clOptions.map((c) => (
                <SelectItem key={c} value={c}>
                  CL {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            size="sm"
            variant={onlyOverdue ? "destructive" : "outline"}
            onClick={() => setOnlyOverdue((v) => !v)}
            className="h-9"
          >
            {onlyOverdue ? "Só vencidos ✓" : "Vencidos"}
          </Button>

          {/* Botão de Seguro */}
          <BotaoSeguro />
        </div>
        <p className="text-xs text-muted-foreground px-1 md:ml-auto md:whitespace-nowrap">
          {isLoading
            ? "Carregando..."
            : `${filtered.length} equipamento${filtered.length === 1 ? "" : "s"}`}
        </p>
      </div>

      {!isLoading && filtered.length === 0 && (
        <Card className="p-8 text-center mt-4">
          <Gauge className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Nenhum equipamento encontrado.</p>
        </Card>
      )}

      <ul className="space-y-2 mt-2 md:space-y-0 md:grid md:grid-cols-2 xl:grid-cols-3 md:gap-3 md:mt-4">
        {filtered.map((e) => {
          const horaPct =
            e.horimetro_atual && e.proxima_revisao_horimetro
              ? Math.min(
                  100,
                  (Number(e.horimetro_atual) / Number(e.proxima_revisao_horimetro)) * 100
                )
              : 0;
          const hrRodado =
            e.horimetro_atual != null && e.h_revisao != null
              ? Math.max(0, Number(e.horimetro_atual) - Number(e.h_revisao))
              : null;
          const overdue = hrRodado != null && hrRodado > Number(e.limite_revisao ?? 500);
          const coverUrl = e.cover_storage_path ? covers[e.cover_storage_path] : null;
          return (
            <li key={e.id}>
              <Link to="/equipamentos/$id" params={{ id: e.id }} className="block">
                <Card
                  className={`p-3 transition-colors ${
                    overdue
                      ? "border-2 border-destructive bg-destructive/10 ring-2 ring-destructive/40 shadow-md"
                      : "hover:bg-accent/5 active:bg-accent/10"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {coverUrl ? (
                      <img
                        src={coverUrl}
                        alt=""
                        className="w-14 h-14 rounded-md object-cover border border-border shrink-0"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-md bg-muted flex items-center justify-center shrink-0">
                        <Gauge className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-base text-primary">{e.numero}</span>
                        {e.cl && (
                          <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                            CL {e.cl}
                          </Badge>
                        )}
                        {e.status && (
                          <Badge className="text-[10px] h-4 px-1.5 bg-warning text-warning-foreground">
                            {e.status}
                          </Badge>
                        )}
                        {overdue && (
                          <Badge
                            variant="destructive"
                            className="text-[10px] h-4 px-1.5 blink-overdue"
                          >
                            Revisão vencida
                          </Badge>
                        )}
                      </div>
                      {e.identificacao && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {e.identificacao}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground flex-wrap">
                        {e.placa && <span className="font-mono">{e.placa}</span>}
                        {e.localizacao && <span>· {e.localizacao}</span>}
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              overdue ? "bg-destructive blink-overdue" : "bg-accent"
                            }`}
                            style={{ width: `${horaPct}%` }}
                          />
                        </div>
                        <span
                          className={`text-[11px] font-medium tabular-nums ${
                            overdue ? "text-destructive blink-overdue" : ""
                          }`}
                        >
                          {e.horimetro_atual ?? 0}h
                        </span>
                      </div>
                      {hrRodado != null && (
                        <div
                          className={`mt-1 text-[11px] ${
                            overdue
                              ? "text-destructive font-semibold blink-overdue"
                              : "text-muted-foreground"
                          }`}
                        >
                          Hr rodado: <span className="tabular-nums">{hrRodado}h</span>
                          {overdue && (
                            <span className="ml-1">⚠ &gt; {Number(e.limite_revisao ?? 500)}h</span>
                          )}
                        </div>
                      )}
                    </div>

                    <ChevronRight className="w-4 h-4 text-muted-foreground mt-1" />
                  </div>
                </Card>
              </Link>
            </li>
          );
        })}
      </ul>

      {isAdmin && (
        <Link to="/admin">
          <Button
            size="icon"
            className="fixed bottom-24 right-4 h-14 w-14 rounded-full shadow-lg bg-accent text-accent-foreground hover:bg-accent/90 z-30"
          >
            <Plus className="w-6 h-6" />
          </Button>
        </Link>
      )}
    </div>
  );
}
