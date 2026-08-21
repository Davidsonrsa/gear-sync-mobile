import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Check, AlertTriangle, X } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Notificacao = {
  id: string;
  tipo: string;
  titulo: string;
  mensagem: string;
  equipamento_id: string | null;
  data_vencimento: string | null;
  dias: number | null;
  lida: boolean;
  created_at: string;
};

export function Notificacoes() {
  const [aberto, setAberto] = useState(false);
  const queryClient = useQueryClient();

  const { data: notificacoes = [], isLoading } = useQuery({
    queryKey: ["notificacoes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notificacoes")
        .select(
          "id, tipo, titulo, mensagem, equipamento_id, data_vencimento, dias, lida, created_at",
        )
        .eq("lida", false)
        .order("dias", { ascending: true });

      if (error) throw error;

      return (data ?? []) as Notificacao[];
    },
  });

  const marcarComoLida = async (id: string) => {
    const { error } = await supabase
      .from("notificacoes")
      .update({ lida: true })
      .eq("id", id);

    if (error) {
      console.error("Erro ao marcar notificação:", error);
      return;
    }

    queryClient.invalidateQueries({ queryKey: ["notificacoes"] });
  };

  const marcarTodasComoLidas = async () => {
    if (!notificacoes.length) return;

    const ids = notificacoes.map((n) => n.id);

    const { error } = await supabase
      .from("notificacoes")
      .update({ lida: true })
      .in("id", ids);

    if (error) {
      console.error("Erro ao marcar notificações:", error);
      return;
    }

    queryClient.invalidateQueries({ queryKey: ["notificacoes"] });
  };

  const quantidade = notificacoes.length;

  return (
    <div className="relative">
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="relative h-9 w-9"
        onClick={() => setAberto((v) => !v)}
        aria-label="Notificações"
      >
        <Bell className="w-4 h-4" />

        {quantidade > 0 && (
          <span className="absolute -right-1 -top-1 flex min-w-5 h-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white">
            {quantidade > 99 ? "99+" : quantidade}
          </span>
        )}
      </Button>

      {aberto && (
        <div className="fixed inset-0 z-40" onClick={() => setAberto(false)}>
          <div
            className="absolute right-3 top-[110px] w-[calc(100vw-24px)] max-w-md md:right-6 md:w-96"
            onClick={(e) => e.stopPropagation()}
          >
            <Card className="overflow-hidden shadow-xl border">
              <div className="flex items-center justify-between border-b px-4 py-3">
                <div>
                  <h3 className="font-semibold">Notificações</h3>
                  <p className="text-xs text-muted-foreground">
                    {quantidade === 0
                      ? "Nenhuma pendência"
                      : `${quantidade} pendência${quantidade === 1 ? "" : "s"}`}
                  </p>
                </div>

                <div className="flex items-center gap-1">
                  {quantidade > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={marcarTodasComoLidas}
                    >
                      <Check className="w-4 h-4 mr-1" />
                      Ler todas
                    </Button>
                  )}

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setAberto(false)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="max-h-[60vh] overflow-y-auto">
                {isLoading && (
                  <div className="p-6 text-center text-sm text-muted-foreground">
                    Carregando notificações...
                  </div>
                )}

                {!isLoading && notificacoes.length === 0 && (
                  <div className="p-8 text-center">
                    <Check className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                    <p className="text-sm font-medium">
                      Tudo em dia!
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Não existem notificações pendentes.
                    </p>
                  </div>
                )}

                {notificacoes.map((n) => {
                  const vencido = Number(n.dias ?? 0) < 0;

                  return (
                    <div
                      key={n.id}
                      className="border-b last:border-b-0 p-4"
                    >
                      <div className="flex gap-3">
                        <div
                          className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                            vencido
                              ? "bg-destructive/10 text-destructive"
                              : "bg-warning/10 text-warning"
                          }`}
                        >
                          <AlertTriangle className="h-4 w-4" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-semibold">
                              {n.titulo}
                            </p>

                            {n.dias != null && (
                              <Badge
                                variant={
                                  vencido ? "destructive" : "secondary"
                                }
                                className="shrink-0 text-[10px]"
                              >
                                {vencido
                                  ? `${Math.abs(n.dias)}d vencido`
                                  : `${n.dias}d`}
                              </Badge>
                            )}
                          </div>

                          <p className="mt-1 text-xs text-muted-foreground">
                            {n.mensagem}
                          </p>

                          <Button
                            variant="ghost"
                            size="sm"
                            className="mt-2 h-7 px-2 text-xs"
                            onClick={() => marcarComoLida(n.id)}
                          >
                            <Check className="mr-1 h-3 w-3" />
                            Marcar como lida
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
