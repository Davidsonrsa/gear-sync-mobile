import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { ArrowLeft, Save, Trash2 } from "lucide-react";
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

export const Route = createFileRoute("/_authenticated/notas-fiscais/$id")({
  component: NotaFiscalDetail,
});

type NotaFiscal = {
  id: string;
  identificacao: string | null;
  data: string | null;
  nf: string;
  fornecedor: string | null;
  descricao_produto: string | null;
  observacao: string | null;
  equipamento_id: string | null;
  valor: number | null;
  venc01: string | null;
  venc02: string | null;
  venc03: string | null;
  venc04: string | null;
  venc05: string | null;
};

function formatDate(value: string | null) {
  if (!value) return "—";
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

function dateToInput(value: string | null) {
  return value ?? "";
}

function inputToDate(value: string) {
  return value || null;
}

function NotaFiscalDetail() {
  const { id } = Route.useParams();
  const { isAdmin, notasFiscais } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const canManage = isAdmin || notasFiscais.gerenciar;

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<NotaFiscal | null>(null);

  const {
    data: nota,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["notas-fiscais", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notas_fiscais")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data as NotaFiscal;
    },
  });

  // Atualiza o estado do formulário sempre que os dados da nota forem carregados
  React.useEffect(() => {
    if (nota) {
      setFormData(nota);
    }
  }, [nota]);

  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<NotaFiscal>) => {
      const { error } = await supabase.from("notas_fiscais").update(updates).eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Nota fiscal atualizada com sucesso!");
      qc.invalidateQueries({ queryKey: ["notas-fiscais"] });
      qc.invalidateQueries({ queryKey: ["notas-fiscais", id] });
      setIsEditing(false);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Erro ao atualizar");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("notas_fiscais").delete().eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Nota fiscal deletada com sucesso!");
      qc.invalidateQueries({ queryKey: ["notas-fiscais"] });
      navigate({ to: "/notas-fiscais" });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Erro ao deletar");
    },
  });

  if (isLoading) {
    return (
      <div className="px-3 py-6 md:px-6 max-w-md md:max-w-7xl mx-auto w-full">
        <Card className="p-8 text-center">
          <p className="text-sm text-muted-foreground">Carregando nota fiscal...</p>
        </Card>
      </div>
    );
  }

  if (error || !nota || !formData) {
    return (
      <div className="px-3 py-6 md:px-6 max-w-md md:max-w-7xl mx-auto w-full">
        <Card className="p-8 text-center border-destructive">
          <p className="text-sm text-destructive">Não foi possível carregar a nota fiscal.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="px-3 py-6 md:px-6 max-w-md md:max-w-7xl mx-auto w-full">
      <div className="flex items-center gap-2 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate({ to: "/notas-fiscais" })}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-2xl font-bold">NF {nota.nf || nota.numero_nf}</h1>
      </div>

      <Card className="p-6">
        <div className="space-y-6">
          {/* Seção Básica */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Informações</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Número da NF</Label>
                <Input
                  value={formData.nf || formData.numero_nf || ""}
                  disabled={!isEditing}
                  onChange={(e) => setFormData({ ...formData, nf: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Fornecedor</Label>
                <Input
                  value={formData.fornecedor ?? ""}
                  disabled={!isEditing}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      fornecedor: e.target.value || null,
                    })
                  }
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Identificação / Equipamento</Label>
                <Input
                  value={formData.identificacao ?? formData.equipamento ?? ""}
                  disabled={!isEditing}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      identificacao: e.target.value || null,
                    })
                  }
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Data de Emissão</Label>
                <Input
                  type="date"
                  value={dateToInput(formData.data || formData.emissao)}
                  disabled={!isEditing}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      data: inputToDate(e.target.value),
                    })
                  }
                  className="mt-1"
                />
              </div>

              <div className="md:col-span-2">
                <Label>Descrição dos Produtos / Observações</Label>
                <Textarea
                  value={formData.descricao_produto ?? formData.observacao ?? ""}
                  disabled={!isEditing}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      descricao_produto: e.target.value || null,
                    })
                  }
                  className="mt-1"
                  rows={3}
                />
              </div>

              <div>
                <Label>Valor Total (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.valor ?? formData.valor_total ?? ""}
                  disabled={!isEditing}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      valor: e.target.value ? parseFloat(e.target.value) : null,
                    })
                  }
                  className="mt-1"
                />
              </div>
            </div>
          </div>

          {/* Vencimentos */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Vencimentos</h2>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {(["venc01", "venc02", "venc03", "venc04", "venc05"] as const).map((field) => (
                <div key={field}>
                  <Label>{field.replace("venc", "Venc. ")}</Label>
                  <Input
                    type="date"
                    value={dateToInput(formData[field])}
                    disabled={!isEditing}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        [field]: inputToDate(e.target.value),
                      })
                    }
                    className="mt-1"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Ações */}
          <div className="flex gap-2 flex-wrap pt-4">
            {!isEditing ? (
              <>
                {canManage && (
                  <Button onClick={() => setIsEditing(true)} className="gap-2">
                    <Save className="w-4 h-4" />
                    Editar
                  </Button>
                )}
                {isAdmin && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" className="gap-2">
                        <Trash2 className="w-4 h-4" />
                        Deletar
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Deletar Nota Fiscal?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tem certeza que deseja deletar a nota fiscal NF {nota.nf || nota.numero_nf}? Esta ação não
                          pode ser desfeita.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteMutation.mutate()}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Deletar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </>
            ) : (
              <>
                <Button
                  onClick={() => {
                    updateMutation.mutate(formData);
                  }}
                  disabled={updateMutation.isPending}
                  className="gap-2"
                >
                  <Save className="w-4 h-4" />
                  Salvar
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setFormData(nota);
                    setIsEditing(false);
                  }}
                  disabled={updateMutation.isPending}
                >
                  Cancelar
                </Button>
              </>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
