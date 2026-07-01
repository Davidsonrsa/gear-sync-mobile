import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, ChevronRight, Plus, Gauge } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  proxima_revisao_horimetro: number | null;
  data_horimetro_atual: string | null;
  status: string | null;
  cl: string | null;
  cover_storage_path: string | null;
};

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
          "id, numero, identificacao, placa, localizacao, operador_contato, horimetro_atual, h_revisao, proxima_revisao_horimetro, data_horimetro_atual, status, cl, cover_storage_path",
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
      const overdue = hrRodado != null && hrRodado > 500;
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
    <div className="px-3 py-3 max-w-md mx-auto w-full">
      <div className="sticky top-[60px] z-20 -mx-3 px-3 py-2 bg-background/85 backdrop-blur space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar nº, placa, local, operador..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-9 h-11"
          />
        </div>
        <div className="flex gap-2">
          <Select value={cl} onValueChange={setCl}>
            <SelectTrigger className="h-9 flex-1">
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
        </div>
        <p className="text-xs text-muted-foreground px-1">
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

      <ul className="space-y-2 mt-2">
        {filtered.map((e) => {
          const horaPct =
            e.horimetro_atual && e.proxima_revisao_horimetro
              ? Math.min(
                  100,
                  (Number(e.horimetro_atual) / Number(e.proxima_revisao_horimetro)) * 100,
                )
              : 0;
          const hrRodado =
            e.horimetro_atual != null && e.h_revisao != null
              ? Math.max(0, Number(e.horimetro_atual) - Number(e.h_revisao))
              : null;
          const overdue = hrRodado != null && hrRodado > 500;
          const coverUrl = e.cover_storage_path ? covers[e.cover_storage_path] : null;
          return (
            <li key={e.id}>
              <Link to="/equipamentos/$id" params={{ id: e.id }} className="block">
                <Card
                  className={`p-3 hover:bg-accent/5 active:bg-accent/10 transition-colors ${overdue ? "border-destructive ring-1 ring-destructive/40" : ""}`}
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
                            className={`h-full rounded-full ${overdue ? "bg-destructive blink-overdue" : "bg-accent"}`}
                            style={{ width: `${horaPct}%` }}
                          />
                        </div>
                        <span
                          className={`text-[11px] font-medium tabular-nums ${overdue ? "text-destructive blink-overdue" : ""}`}
                        >
                          {e.horimetro_atual ?? 0}h
                        </span>
                      </div>
                      {hrRodado != null && (
                        <div
                          className={`mt-1 text-[11px] ${overdue ? "text-destructive font-semibold blink-overdue" : "text-muted-foreground"}`}
                        >
                          Hr rodado: <span className="tabular-nums">{hrRodado}h</span>
                          {overdue && <span className="ml-1">⚠ &gt; 500h</span>}
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
