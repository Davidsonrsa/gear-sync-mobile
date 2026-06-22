import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import {
  ArrowLeft,
  Camera,
  Save,
  Trash2,
  ImagePlus,
  Printer,
  Wrench,
  FileText,
} from "lucide-react";
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

export const Route = createFileRoute("/_authenticated/equipamentos/$id")({
  component: EquipamentoDetail,
});

type Equip = {
  id: string;
  item: number | null;
  cl: string | null;
  numero: string;
  cartao_ticket: string | null;
  identificacao: string | null;
  afericao_taco: string | null;
  placa: string | null;
  ano: string | null;
  localizacao: string | null;
  operador_contato: string | null;
  telefone: string | null;
  cnh: string | null;
  data_ultima_revisao: string | null;
  u_revisao: number | null;
  h_revisao: number | null;
  data_horimetro_atual: string | null;
  horimetro_atual: number | null;
  proxima_revisao_horimetro: number | null;
  hr_rodado: number | null;
  observacoes: string | null;
  status: string | null;
  modelo: string | null;
  motor_oleo: string | null;
  hidraulico_oleo: string | null;
  transmissao_oleo: string | null;
  eixo_oleo: string | null;
  tandem_oleo: string | null;
  filtro_lub: string | null;
  filtro_diesel_p: string | null;
  filtro_diesel_s: string | null;
  filtro_sep_agua: string | null;
  filtro_ar_ext: string | null;
  filtro_ar_int: string | null;
  filtro_trans: string | null;
  filtro_hidr: string | null;
  filtro_respiro: string | null;
  filtro_ar_cond1: string | null;
  filtro_ar_cond2: string | null;
};

function EquipamentoDetail() {
  const { id } = Route.useParams();
  const { isAdmin, userId } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const fileInput = useRef<HTMLInputElement>(null);

  const { data: equip, isLoading } = useQuery({
    queryKey: ["equipamento", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("equipamentos").select("*").eq("id", id).single();
      if (error) throw error;
      return data as Equip;
    },
  });

  const { data: fotos } = useQuery({
    queryKey: ["fotos", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("equipamento_fotos")
        .select("id, storage_path, uploaded_by, caption, created_at")
        .eq("equipamento_id", id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const withUrl = await Promise.all(
        (data ?? []).map(async (f) => {
          const { data: signed } = await supabase.storage
            .from("equipamento-fotos")
            .createSignedUrl(f.storage_path, 60 * 60);
          return { ...f, url: signed?.signedUrl ?? "" };
        }),
      );
      return withUrl;
    },
  });

  const [form, setForm] = useState<Partial<Equip>>({});
  useEffect(() => {
    if (equip) setForm(equip);
  }, [equip]);

  const save = useMutation({
    mutationFn: async (payload: Partial<Equip>) => {
      // Para colaborador, enviar apenas campos permitidos
      const allowed = isAdmin
        ? payload
        : {
            horimetro_atual: payload.horimetro_atual,
            data_horimetro_atual: payload.data_horimetro_atual,
            observacoes: payload.observacoes,
          };
      const { error } = await supabase.from("equipamentos").update(allowed).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Alterações salvas");
      qc.invalidateQueries({ queryKey: ["equipamento", id] });
      qc.invalidateQueries({ queryKey: ["equipamentos"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("equipamentos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Equipamento excluído");
      qc.invalidateQueries({ queryKey: ["equipamentos"] });
      navigate({ to: "/equipamentos" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function handleUpload(files: FileList | null) {
    if (!files?.length || !userId) return;
    const file = files[0];
    const caption = window.prompt("Observação da foto (opcional):", "") ?? "";
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${id}/${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("equipamento-fotos")
      .upload(path, file, { contentType: file.type, upsert: false });
    if (upErr) return toast.error(upErr.message);
    const { error: insErr } = await supabase.from("equipamento_fotos").insert({
      equipamento_id: id,
      storage_path: path,
      uploaded_by: userId,
      caption: caption || null,
    });
    if (insErr) return toast.error(insErr.message);
    toast.success("Foto enviada");
    qc.invalidateQueries({ queryKey: ["fotos", id] });
  }

  async function deletePhoto(photoId: string, path: string) {
    if (!isAdmin) return toast.error("Somente administrador pode excluir fotos");
    await supabase.storage.from("equipamento-fotos").remove([path]);
    const { error } = await supabase.from("equipamento_fotos").delete().eq("id", photoId);
    if (error) return toast.error(error.message);
    toast.success("Foto removida");
    qc.invalidateQueries({ queryKey: ["fotos", id] });
  }

  if (isLoading || !equip) {
    return <div className="p-6 text-center text-muted-foreground">Carregando...</div>;
  }

  const ro = !isAdmin; // colaborador: campos readonly exceto os 3 permitidos
  const hrRodadoCalc =
    form.horimetro_atual != null && form.h_revisao != null
      ? Math.max(0, Number(form.horimetro_atual) - Number(form.h_revisao))
      : null;
  const overdue = hrRodadoCalc != null && hrRodadoCalc > 500;

  return (
    <div className="px-3 py-3 max-w-md mx-auto w-full space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <Link
          to="/equipamentos"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Link>
        <div className="flex items-center gap-3">
          <Link
            to="/equipamentos/$id/historico"
            params={{ id }}
            className="inline-flex items-center gap-1 text-xs text-primary font-medium"
          >
            <FileText className="w-3.5 h-3.5" /> Histórico
          </Link>
          <Link
            to="/equipamentos/$id/manutencao"
            params={{ id }}
            className="inline-flex items-center gap-1 text-xs text-primary font-medium"
          >
            <Wrench className="w-3.5 h-3.5" /> Plano
          </Link>
        </div>
      </div>

      <Card className={`p-4 ${overdue ? "border-destructive ring-1 ring-destructive/40" : ""}`}>
        <div className="flex items-start justify-between gap-2 mb-1 flex-wrap">
          <h2 className="text-xl font-bold text-primary">{equip.numero}</h2>
          <div className="flex items-center gap-1.5 flex-wrap">
            {equip.cl && <Badge variant="secondary">CL {equip.cl}</Badge>}
            {overdue && (
              <Badge variant="destructive" className="blink-overdue">
                Revisão vencida
              </Badge>
            )}
          </div>
        </div>
        {equip.identificacao && (
          <p className="text-xs text-muted-foreground">{equip.identificacao}</p>
        )}
        {hrRodadoCalc != null && (
          <p
            className={`text-xs mt-2 ${overdue ? "text-destructive font-semibold blink-overdue" : "text-muted-foreground"}`}
          >
            Hr rodado: <span className="tabular-nums">{hrRodadoCalc}h</span>
            <span className="opacity-70">
              {" "}
              (atual {form.horimetro_atual} − últ. revisão {form.h_revisao})
            </span>
          </p>
        )}
      </Card>

      {/* Editáveis por TODOS */}
      <Card className="p-4 space-y-3 border-accent/40">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-accent" />
          Atualização do colaborador
        </h3>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Horímetro atual">
            <Input
              type="number"
              inputMode="decimal"
              value={form.horimetro_atual ?? ""}
              onChange={(e) =>
                setForm({
                  ...form,
                  horimetro_atual: e.target.value === "" ? null : Number(e.target.value),
                })
              }
            />
          </Field>
          <Field label="Data">
            <Input
              type="date"
              value={form.data_horimetro_atual ?? ""}
              onChange={(e) => setForm({ ...form, data_horimetro_atual: e.target.value || null })}
            />
          </Field>
        </div>

        <Field label="Observações">
          <Textarea
            rows={3}
            value={form.observacoes ?? ""}
            onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
          />
        </Field>

        <Button onClick={() => save.mutate(form)} disabled={save.isPending} className="w-full h-11">
          <Save className="w-4 h-4 mr-2" /> {save.isPending ? "Salvando..." : "Salvar"}
        </Button>
      </Card>

      {/* Fotos */}
      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm">Fotos ({fotos?.length ?? 0})</h3>
          <Button size="sm" variant="outline" onClick={() => fileInput.current?.click()}>
            <Camera className="w-4 h-4 mr-1.5" /> Adicionar
          </Button>
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              handleUpload(e.target.files);
              e.target.value = "";
            }}
          />
        </div>
        {!fotos || fotos.length === 0 ? (
          <button
            onClick={() => fileInput.current?.click()}
            className="w-full border-2 border-dashed border-border rounded-lg p-6 flex flex-col items-center gap-2 text-muted-foreground hover:bg-muted/50"
          >
            <ImagePlus className="w-8 h-8" />
            <span className="text-xs">Toque para adicionar a primeira foto</span>
          </button>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {fotos.map((f) => (
              <div
                key={f.id}
                className="relative rounded-md overflow-hidden bg-muted border border-border"
              >
                <div className="aspect-square">
                  <img
                    src={f.url}
                    alt={f.caption ?? ""}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
                {isAdmin && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1.5 shadow">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Excluir foto?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deletePhoto(f.id, f.storage_path)}>
                          Excluir
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
                {f.caption && (
                  <p className="text-[11px] px-2 py-1 bg-card text-foreground border-t border-border line-clamp-2">
                    {f.caption}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Dados gerais (admin edita; colaborador só lê) */}
      <Card className="p-4 space-y-3">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-primary" />
          Dados do equipamento{" "}
          {ro && (
            <span className="text-[11px] font-normal text-muted-foreground">(somente leitura)</span>
          )}
        </h3>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Nº">
            <Input
              value={form.numero ?? ""}
              readOnly={ro}
              onChange={(e) => setForm({ ...form, numero: e.target.value })}
            />
          </Field>
          <Field label="Classe">
            <Input
              value={form.cl ?? ""}
              readOnly={ro}
              onChange={(e) => setForm({ ...form, cl: e.target.value })}
            />
          </Field>
          <Field label="Placa">
            <Input
              value={form.placa ?? ""}
              readOnly={ro}
              onChange={(e) => setForm({ ...form, placa: e.target.value })}
            />
          </Field>
          <Field label="Ano">
            <Input
              value={form.ano ?? ""}
              readOnly={ro}
              onChange={(e) => setForm({ ...form, ano: e.target.value })}
            />
          </Field>
        </div>

        <Field label="Identificação">
          <Input
            value={form.identificacao ?? ""}
            readOnly={ro}
            onChange={(e) => setForm({ ...form, identificacao: e.target.value })}
          />
        </Field>

        <Field label="Cartão / Ticket">
          <Input
            value={form.cartao_ticket ?? ""}
            readOnly={ro}
            onChange={(e) => setForm({ ...form, cartao_ticket: e.target.value })}
          />
        </Field>

        <Field label="Localização">
          <Input
            value={form.localizacao ?? ""}
            readOnly={ro}
            onChange={(e) => setForm({ ...form, localizacao: e.target.value })}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Operador / contato">
            <Input
              value={form.operador_contato ?? ""}
              readOnly={ro}
              onChange={(e) => setForm({ ...form, operador_contato: e.target.value })}
            />
          </Field>
          <Field label="Telefone">
            <Input
              value={form.telefone ?? ""}
              readOnly={ro}
              onChange={(e) => setForm({ ...form, telefone: e.target.value })}
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="CNH">
            <Input
              value={form.cnh ?? ""}
              readOnly={ro}
              onChange={(e) => setForm({ ...form, cnh: e.target.value })}
            />
          </Field>
          <Field label="Aferição taco">
            <Input
              value={form.afericao_taco ?? ""}
              readOnly={ro}
              onChange={(e) => setForm({ ...form, afericao_taco: e.target.value })}
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Data últ. revisão">
            <Input
              type="date"
              value={form.data_ultima_revisao ?? ""}
              readOnly={ro}
              onChange={(e) => setForm({ ...form, data_ultima_revisao: e.target.value || null })}
            />
          </Field>
          <Field label="U. revisão">
            <Input
              type="number"
              value={form.u_revisao ?? ""}
              readOnly={ro}
              onChange={(e) =>
                setForm({
                  ...form,
                  u_revisao: e.target.value === "" ? null : Number(e.target.value),
                })
              }
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="H. revisão">
            <Input
              type="number"
              value={form.h_revisao ?? ""}
              readOnly={ro}
              onChange={(e) =>
                setForm({
                  ...form,
                  h_revisao: e.target.value === "" ? null : Number(e.target.value),
                })
              }
            />
          </Field>
          <Field label="Próx. revisão (h)">
            <Input
              type="number"
              value={form.proxima_revisao_horimetro ?? ""}
              readOnly={ro}
              onChange={(e) =>
                setForm({
                  ...form,
                  proxima_revisao_horimetro: e.target.value === "" ? null : Number(e.target.value),
                })
              }
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Hr rodado (calculado)">
            <Input
              type="number"
              value={hrRodadoCalc ?? ""}
              readOnly
              className={
                overdue ? "blink-overdue border-destructive text-destructive font-semibold" : ""
              }
            />
          </Field>
          <Field label="Status">
            <Input
              value={form.status ?? ""}
              readOnly={ro}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            />
          </Field>
        </div>

        {isAdmin && (
          <div className="flex gap-2 pt-2">
            <Button onClick={() => save.mutate(form)} disabled={save.isPending} className="flex-1">
              <Save className="w-4 h-4 mr-2" /> Salvar tudo
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="icon">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir equipamento?</AlertDialogTitle>
                  <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={() => remove.mutate()}>Excluir</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </Card>

      {/* Filtros e Lubrificantes */}
      <Card className="p-4 space-y-3">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-warning" />
          Filtros e Lubrificantes{" "}
          {ro && (
            <span className="text-[11px] font-normal text-muted-foreground">(somente leitura)</span>
          )}
        </h3>

        <Field label="Modelo">
          <Input
            value={form.modelo ?? ""}
            readOnly={ro}
            onChange={(e) => setForm({ ...form, modelo: e.target.value })}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Óleo motor">
            <Input
              value={form.motor_oleo ?? ""}
              readOnly={ro}
              onChange={(e) => setForm({ ...form, motor_oleo: e.target.value })}
            />
          </Field>
          <Field label="Óleo hidráulico">
            <Input
              value={form.hidraulico_oleo ?? ""}
              readOnly={ro}
              onChange={(e) => setForm({ ...form, hidraulico_oleo: e.target.value })}
            />
          </Field>
          <Field label="Óleo transmissão">
            <Input
              value={form.transmissao_oleo ?? ""}
              readOnly={ro}
              onChange={(e) => setForm({ ...form, transmissao_oleo: e.target.value })}
            />
          </Field>
          <Field label="Óleo eixo">
            <Input
              value={form.eixo_oleo ?? ""}
              readOnly={ro}
              onChange={(e) => setForm({ ...form, eixo_oleo: e.target.value })}
            />
          </Field>
          <Field label="Óleo tandem">
            <Input
              value={form.tandem_oleo ?? ""}
              readOnly={ro}
              onChange={(e) => setForm({ ...form, tandem_oleo: e.target.value })}
            />
          </Field>
          <Field label="Filtro lubrificante">
            <Input
              value={form.filtro_lub ?? ""}
              readOnly={ro}
              onChange={(e) => setForm({ ...form, filtro_lub: e.target.value })}
            />
          </Field>
          <Field label="Diesel primário">
            <Input
              value={form.filtro_diesel_p ?? ""}
              readOnly={ro}
              onChange={(e) => setForm({ ...form, filtro_diesel_p: e.target.value })}
            />
          </Field>
          <Field label="Diesel secundário">
            <Input
              value={form.filtro_diesel_s ?? ""}
              readOnly={ro}
              onChange={(e) => setForm({ ...form, filtro_diesel_s: e.target.value })}
            />
          </Field>
          <Field label="Sep. água">
            <Input
              value={form.filtro_sep_agua ?? ""}
              readOnly={ro}
              onChange={(e) => setForm({ ...form, filtro_sep_agua: e.target.value })}
            />
          </Field>
          <Field label="Ar externo">
            <Input
              value={form.filtro_ar_ext ?? ""}
              readOnly={ro}
              onChange={(e) => setForm({ ...form, filtro_ar_ext: e.target.value })}
            />
          </Field>
          <Field label="Ar interno">
            <Input
              value={form.filtro_ar_int ?? ""}
              readOnly={ro}
              onChange={(e) => setForm({ ...form, filtro_ar_int: e.target.value })}
            />
          </Field>
          <Field label="Transmissão">
            <Input
              value={form.filtro_trans ?? ""}
              readOnly={ro}
              onChange={(e) => setForm({ ...form, filtro_trans: e.target.value })}
            />
          </Field>
          <Field label="Hidráulico">
            <Input
              value={form.filtro_hidr ?? ""}
              readOnly={ro}
              onChange={(e) => setForm({ ...form, filtro_hidr: e.target.value })}
            />
          </Field>
          <Field label="Respiro">
            <Input
              value={form.filtro_respiro ?? ""}
              readOnly={ro}
              onChange={(e) => setForm({ ...form, filtro_respiro: e.target.value })}
            />
          </Field>
          <Field label="Ar cond. 1">
            <Input
              value={form.filtro_ar_cond1 ?? ""}
              readOnly={ro}
              onChange={(e) => setForm({ ...form, filtro_ar_cond1: e.target.value })}
            />
          </Field>
          <Field label="Ar cond. 2">
            <Input
              value={form.filtro_ar_cond2 ?? ""}
              readOnly={ro}
              onChange={(e) => setForm({ ...form, filtro_ar_cond2: e.target.value })}
            />
          </Field>
        </div>

        {isAdmin && (
          <Button
            onClick={() => save.mutate(form)}
            disabled={save.isPending}
            className="w-full"
            variant="secondary"
          >
            <Save className="w-4 h-4 mr-2" /> Salvar filtros
          </Button>
        )}
      </Card>

      <Link to="/equipamentos/$id/manutencao" params={{ id }}>
        <Button variant="outline" className="w-full h-12">
          <Printer className="w-4 h-4 mr-2" /> Formulário de manutenção (imprimir)
        </Button>
      </Link>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
