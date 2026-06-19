import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, FileText, Trash2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { MANUTENCAO_TEMPLATE } from "@/lib/manutencao-template";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/equipamentos/$id/historico")({
  component: HistoricoPage,
});

function HistoricoPage() {
  const { id } = Route.useParams();
  const { userId, isAdmin } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data: equip } = useQuery({
    queryKey: ["equipamento", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("equipamentos")
        .select("numero, identificacao, horimetro_atual")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: registros, isLoading } = useQuery({
    queryKey: ["manutencao_historico", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("manutencao_historico")
        .select("id, data, horimetro, tipo_revisao, executante, observacoes")
        .eq("equipamento_id", id)
        .order("data", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createNew = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("Não autenticado");
      const { data, error } = await supabase
        .from("manutencao_historico")
        .insert({
          equipamento_id: id,
          created_by: userId,
          horimetro: equip?.horimetro_atual ?? null,
          itens: MANUTENCAO_TEMPLATE.map((i) => ({ ...i, codigo: "", quantidade: "", status: "" })),
        })
        .select("id")
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: (histId) => {
      qc.invalidateQueries({ queryKey: ["manutencao_historico", id] });
      navigate({ to: "/equipamentos/$id/historico/$histId", params: { id, histId } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (histId: string) => {
      const { error } = await supabase.from("manutencao_historico").delete().eq("id", histId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Registro excluído");
      qc.invalidateQueries({ queryKey: ["manutencao_historico", id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="px-3 py-3 max-w-md mx-auto w-full space-y-3">
      <div className="flex items-center justify-between">
        <Link
          to="/equipamentos/$id"
          params={{ id }}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Link>
        <Button size="sm" onClick={() => createNew.mutate()} disabled={createNew.isPending}>
          <Plus className="w-4 h-4 mr-1" /> Nova manutenção
        </Button>
      </div>

      <Card className="p-4">
        <h2 className="text-lg font-bold">Histórico de Manutenção</h2>
        {equip && (
          <p className="text-xs text-muted-foreground">
            {equip.numero} — {equip.identificacao ?? ""}
          </p>
        )}
      </Card>

      {isLoading ? (
        <p className="text-center text-sm text-muted-foreground py-4">Carregando...</p>
      ) : !registros?.length ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">
          Nenhuma manutenção registrada. Clique em <b>Nova manutenção</b> para começar.
        </Card>
      ) : (
        registros.map((r) => (
          <Card key={r.id} className="p-3 flex items-center justify-between gap-2">
            <Link
              to="/equipamentos/$id/historico/$histId"
              params={{ id, histId: r.id }}
              className="flex-1 min-w-0"
            >
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary shrink-0" />
                <div className="min-w-0">
                  <p className="font-medium text-sm">
                    {new Date(r.data + "T00:00:00").toLocaleDateString("pt-BR")}
                    {r.tipo_revisao && (
                      <span className="ml-2 text-xs text-muted-foreground">{r.tipo_revisao}</span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {r.horimetro ? `${r.horimetro}h` : "—"} · {r.executante || "sem executante"}
                  </p>
                </div>
              </div>
            </Link>
            {isAdmin && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="icon" variant="ghost" className="text-destructive shrink-0">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir manutenção?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta ação não pode ser desfeita.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={() => remove.mutate(r.id)}>
                      Excluir
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </Card>
        ))
      )}
    </div>
  );
}
