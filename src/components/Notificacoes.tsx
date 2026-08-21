import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Check, AlertTriangle, X } from "lucide-react";
import { useState } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
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

  // Conteúdo do painel/overlay — será montado via portal, fora da árvore
  // do header/toolbar (que pode ter transform/filter/overflow aplicado
  // e "prender" o position:fixed dentro daquele contexto de empilhamento,
  // causando o efeito de sobreposição/transparência visto no bug).
  const painel = aberto && (
    <div
      className="fixed inset-0 z-[9999] bg-black/30"
      onClick={() => setAberto(false)}
    >
      <div
        className="absolute right-3 top-[110px] z-[10000] w-[calc(100vw-24px)] max-w-md md:right-6 md:w-96"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-full overflow-hidden rounded-xl border border-gray-300 bg-white text-gray-900 shadow-2xl dark:border-gray-700 dark:bg-gray-900 dark:text-white">
          {/* CABEÇALHO */}
          <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-900">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Notificações
              </h3>

              <p className="text-xs text-gray-500 dark:text-gray-400">
                {quantidade === 0
                  ? "Nenhuma pendência"
                  : `${quantidade} pendência${quantidade === 1 ? "" : "s"}`}
              </p>
            </div>

            <div className="flex items-center gap-1">
              {quantidade > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={marcarTodasComoLidas}
                >
                  <Check className="mr-1 h-4 w-4" />
                  Ler todas
                </Button>
              )}

              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setAberto(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* LISTA */}
          <div className="max-h-[60vh] overflow-y-auto bg-white dark:bg-gray-900">
            {isLoading && (
              <div className="bg-white p-6 text-center text-sm text-gray-500 dark:bg-gray-900 dark:text-gray-400">
                Carregando notificações...
              </div>
            )}

            {!isLoading && notificacoes.length === 0 && (
              <div className="bg-white p-8 text-center dark:bg-gray-900">
                <Check className="mx-auto mb-2 h-8 w-8 text-gray-400" />

                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  Tudo em dia!
                </p>

                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Não existem notificações pendentes.
                </p>
              </div>
            )}

            {notificacoes.map((n) => {
              const vencido = Number(n.dias ?? 0) < 0;

              return (
                <div
                  key={n.id}
                  className="border-b border-gray-200 bg-white p-4 last:border-b-0 dark:border-gray-700 dark:bg-gray-900"
                >
                  <div className="flex gap-3">
                    <div
                      className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                        vencido
                          ? "bg-red-100 text-red-600"
                          : "bg-yellow-100 text-yellow-600"
                      }`}
                    >
                      <AlertTriangle className="h-4 w-4" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                          {n.titulo}
                        </p>

                        {n.dias != null && (
                          <Badge
                            variant={vencido ? "destructive" : "secondary"}
                            className="shrink-0 text-[10px]"
                          >
                            {vencido
                              ? `${Math.abs(n.dias)}d vencido`
                              : `${n.dias}d`}
                          </Badge>
                        )}
                      </div>

                      <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">
                        {n.mensagem}
                      </p>

                      <Button
                        type="button"
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
        </div>
      </div>
    </div>
  );

  return (
    <div className="relative">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="relative h-9 gap-2 px-3 bg-background"
        onClick={() => setAberto((v) => !v)}
        aria-label="Notificações de Tacógrafo"
      >
        <Bell className="w-4 h-4" />
        <span className="text-xs font-medium">Tacógrafo</span>

        {quantidade > 0 && (
          <span className="absolute -right-1 -top-1 flex min-w-5 h-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white">
            {quantidade > 99 ? "99+" : quantidade}
          </span>
        )}
      </Button>

      {/* Monta o overlay direto no <body> via portal, escapando de
          qualquer contexto de empilhamento (transform/filter/overflow)
          criado por ancestrais como o header/toolbar. */}
      {typeof document !== "undefined" &&
        painel &&
        createPortal(painel, document.body)}
    </div>
  );
}

