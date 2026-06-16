import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, ChevronRight, Plus, Gauge } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

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
  proxima_revisao_horimetro: number | null;
  data_horimetro_atual: string | null;
  status: string | null;
  cl: string | null;
};

function EquipamentosList() {
  const { isAdmin } = useAuth();
  const [q, setQ] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["equipamentos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("equipamentos")
        .select("id, numero, identificacao, placa, localizacao, operador_contato, horimetro_atual, proxima_revisao_horimetro, data_horimetro_atual, status, cl")
        .order("numero", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Equip[];
    },
  });

  const filtered = useMemo(() => {
    if (!data) return [];
    const s = q.trim().toLowerCase();
    if (!s) return data;
    return data.filter((e) =>
      [e.numero, e.identificacao, e.placa, e.localizacao, e.operador_contato, e.status]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(s)),
    );
  }, [data, q]);

  return (
    <div className="px-3 py-3 max-w-md mx-auto w-full">
      <div className="sticky top-[60px] z-20 -mx-3 px-3 py-2 bg-background/95 backdrop-blur">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar nº, placa, local, operador..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-9 h-11"
          />
        </div>
        <p className="text-xs text-muted-foreground mt-1.5 px-1">
          {isLoading ? "Carregando..." : `${filtered.length} equipamento${filtered.length === 1 ? "" : "s"}`}
        </p>
      </div>

      {!isLoading && filtered.length === 0 && (
        <Card className="p-8 text-center mt-4">
          <Gauge className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Nenhum equipamento cadastrado ainda.</p>
          {isAdmin && (
            <Link to="/admin">
              <Button className="mt-4" size="sm">Cadastrar primeiro equipamento</Button>
            </Link>
          )}
        </Card>
      )}

      <ul className="space-y-2 mt-2">
        {filtered.map((e) => {
          const horaPct = e.horimetro_atual && e.proxima_revisao_horimetro
            ? Math.min(100, (Number(e.horimetro_atual) / Number(e.proxima_revisao_horimetro)) * 100)
            : 0;
          const overdue = e.horimetro_atual && e.proxima_revisao_horimetro
            ? Number(e.horimetro_atual) >= Number(e.proxima_revisao_horimetro)
            : false;
          return (
            <li key={e.id}>
              <Link
                to="/equipamentos/$id"
                params={{ id: e.id }}
                className="block"
              >
                <Card className="p-3 hover:bg-accent/5 active:bg-accent/10 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-base text-primary">{e.numero}</span>
                        {e.cl && <Badge variant="secondary" className="text-[10px] h-4 px-1.5">CL {e.cl}</Badge>}
                        {e.status && <Badge className="text-[10px] h-4 px-1.5 bg-warning text-warning-foreground">{e.status}</Badge>}
                        {overdue && <Badge variant="destructive" className="text-[10px] h-4 px-1.5">Revisão vencida</Badge>}
                      </div>
                      {e.identificacao && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">{e.identificacao}</p>
                      )}
                      <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground flex-wrap">
                        {e.placa && <span className="font-mono">{e.placa}</span>}
                        {e.localizacao && <span>· {e.localizacao}</span>}
                        {e.operador_contato && <span>· {e.operador_contato}</span>}
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${overdue ? "bg-destructive" : "bg-accent"}`}
                            style={{ width: `${horaPct}%` }}
                          />
                        </div>
                        <span className="text-[11px] font-medium tabular-nums">
                          {e.horimetro_atual ?? 0}h
                        </span>
                      </div>
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
