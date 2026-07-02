import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Save, Printer, Camera, Trash2, ImagePlus, Paperclip, FileIcon, Download } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { MANUTENCAO_TEMPLATE, type ManutencaoItem, STATUS_LABELS } from "@/lib/manutencao-template";
import logo from "@/assets/logo-sph.jpg.asset.json";

export const Route = createFileRoute("/_authenticated/equipamentos/$id/historico/$histId")({
  component: ManutencaoFormPage,
});

function ManutencaoFormPage() {
  const { id, histId } = Route.useParams();
  const qc = useQueryClient();
  const { userId, isAdmin } = useAuth();
  const fileInput = useRef<HTMLInputElement>(null);

  const { data: equip } = useQuery({
    queryKey: ["equipamento", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("equipamentos").select("*").eq("id", id).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: registro, isLoading } = useQuery({
    queryKey: ["manutencao_historico_item", histId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("manutencao_historico")
        .select("*")
        .eq("id", histId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: fotos } = useQuery({
    queryKey: ["hist_fotos", histId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("equipamento_fotos")
        .select("id, storage_path, uploaded_by, caption, created_at")
        .eq("manutencao_historico_id", histId)
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

  async function handleUpload(files: FileList | null) {
    if (!files?.length || !userId) return;
    const file = files[0];
    const caption = window.prompt("Observação da foto (opcional):", "") ?? "";
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${id}/hist-${histId}/${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("equipamento-fotos")
      .upload(path, file, { contentType: file.type, upsert: false });
    if (upErr) return toast.error(upErr.message);
    const { error: insErr } = await supabase.from("equipamento_fotos").insert({
      equipamento_id: id,
      manutencao_historico_id: histId,
      storage_path: path,
      uploaded_by: userId,
      caption: caption || null,
    });
    if (insErr) return toast.error(insErr.message);
    toast.success("Foto anexada");
    qc.invalidateQueries({ queryKey: ["hist_fotos", histId] });
  }

  async function deletePhoto(photoId: string, path: string, uploadedBy: string | null) {
    if (!isAdmin && uploadedBy !== userId)
      return toast.error("Você só pode excluir suas próprias fotos");
    await supabase.storage.from("equipamento-fotos").remove([path]);
    const { error } = await supabase.from("equipamento_fotos").delete().eq("id", photoId);
    if (error) return toast.error(error.message);
    toast.success("Foto removida");
    qc.invalidateQueries({ queryKey: ["hist_fotos", histId] });
  }

  const [data, setData] = useState("");
  const [horimetro, setHorimetro] = useState<string>("");
  const [tipoRevisao, setTipoRevisao] = useState("");
  const [executante, setExecutante] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [itens, setItens] = useState<ManutencaoItem[]>(MANUTENCAO_TEMPLATE);

  useEffect(() => {
    if (!registro) return;
    setData(registro.data ?? "");
    setHorimetro(registro.horimetro != null ? String(registro.horimetro) : "");
    setTipoRevisao(registro.tipo_revisao ?? "");
    setExecutante(registro.executante ?? "");
    setObservacoes(registro.observacoes ?? "");
    const arr = Array.isArray(registro.itens)
      ? (registro.itens as unknown as ManutencaoItem[])
      : [];
    setItens(arr.length ? arr : MANUTENCAO_TEMPLATE);
  }, [registro]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("manutencao_historico")
        .update({
          data: data || new Date().toISOString().slice(0, 10),
          horimetro: horimetro === "" ? null : Number(horimetro),
          tipo_revisao: tipoRevisao || null,
          executante: executante || null,
          observacoes: observacoes || null,
          itens: JSON.parse(JSON.stringify(itens)),
        })
        .eq("id", histId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Manutenção salva");
      qc.invalidateQueries({ queryKey: ["manutencao_historico", id] });
      qc.invalidateQueries({ queryKey: ["manutencao_historico_item", histId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function updateItem(idx: number, patch: Partial<ManutencaoItem>) {
    setItens((arr) => arr.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }

  if (isLoading || !registro) {
    return <div className="p-6 text-center text-muted-foreground">Carregando...</div>;
  }

  return (
    <div className="bg-background min-h-screen">
      <div className="no-print sticky top-0 z-30 bg-background border-b px-3 py-2 flex items-center justify-between">
        <Link to="/equipamentos/$id/historico" params={{ id }}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
          </Button>
        </Link>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => window.print()}>
            <Printer className="w-4 h-4 mr-1" /> Imprimir
          </Button>
          <Button size="sm" onClick={() => save.mutate()} disabled={save.isPending}>
            <Save className="w-4 h-4 mr-1" /> {save.isPending ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </div>

      <div className="max-w-[210mm] mx-auto p-4 print:p-4 print:text-black print:bg-white">
        <div className="flex items-center gap-4 border-b-2 border-foreground print:border-black pb-3 mb-4">
          <img src={logo.url} alt="" className="w-16 h-16 object-contain" />
          <div className="flex-1">
            <h1 className="text-lg font-bold">PLANO DE MANUTENÇÃO PREVENTIVA</h1>
            <p className="text-[11px] text-muted-foreground print:text-black">
              SPH JHM Mafra — Registro de manutenção
            </p>
          </div>
        </div>

        {/* Cabeçalho editável */}
        <Card className="p-3 mb-3 print:shadow-none print:border-black">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-[11px]">Equipamento</Label>
              <Input value={`${equip?.numero ?? ""} — ${equip?.identificacao ?? ""}`} readOnly />
            </div>
            <div>
              <Label className="text-[11px]">Tipo de revisão (ex: 250h, 500h, 1000h)</Label>
              <Input value={tipoRevisao} onChange={(e) => setTipoRevisao(e.target.value)} />
            </div>
            <div>
              <Label className="text-[11px]">Data</Label>
              <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
            </div>
            <div>
              <Label className="text-[11px]">Horímetro</Label>
              <Input
                type="number"
                inputMode="decimal"
                value={horimetro}
                onChange={(e) => setHorimetro(e.target.value)}
              />
            </div>
            <div className="col-span-2">
              <Label className="text-[11px]">Executante</Label>
              <Input value={executante} onChange={(e) => setExecutante(e.target.value)} />
            </div>
          </div>
        </Card>

        {/* Checklist */}
        <Card className="p-0 overflow-hidden mb-3 print:shadow-none print:border-black">
          <div className="px-3 py-2 bg-muted print:bg-gray-200 text-[11px] font-semibold flex justify-between">
            <span>Atividades de Manutenção Preventiva</span>
            <span>P = Peças · M = Mão de obra</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px] border-collapse">
              <thead>
                <tr className="bg-muted/50 print:bg-gray-100">
                  <th className="border px-2 py-1 text-left">Sistema</th>
                  <th className="border px-2 py-1 text-left">Item</th>
                  <th className="border px-2 py-1 text-left">Ação</th>
                  <th className="border px-2 py-1 w-8">P/M</th>
                  <th className="border px-2 py-1 w-24">Código</th>
                  <th className="border px-2 py-1 w-14">Qtd</th>
                  <th className="border px-2 py-1 w-28">Status</th>
                </tr>
              </thead>
              <tbody>
                {itens.map((it, i) => (
                  <tr key={i}>
                    <td className="border px-2 py-1">{it.sistema}</td>
                    <td className="border px-2 py-1">{it.item}</td>
                    <td className="border px-2 py-1">{it.acao}</td>
                    <td className="border px-2 py-1 text-center">{it.pm}</td>
                    <td className="border px-1 py-0.5">
                      <input
                        className="w-full bg-transparent outline-none px-1 py-0.5 text-[11px]"
                        value={it.codigo ?? ""}
                        onChange={(e) => updateItem(i, { codigo: e.target.value })}
                      />
                    </td>
                    <td className="border px-1 py-0.5">
                      <input
                        className="w-full bg-transparent outline-none px-1 py-0.5 text-[11px]"
                        value={it.quantidade ?? ""}
                        onChange={(e) => updateItem(i, { quantidade: e.target.value })}
                      />
                    </td>
                    <td className="border px-1 py-0.5">
                      <select
                        className="w-full bg-transparent outline-none text-[11px] py-0.5"
                        value={it.status ?? ""}
                        onChange={(e) =>
                          updateItem(i, { status: e.target.value as ManutencaoItem["status"] })
                        }
                      >
                        {Object.entries(STATUS_LABELS).map(([k, v]) => (
                          <option key={k} value={k}>
                            {v}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="p-3 print:shadow-none print:border-black">
          <Label className="text-[11px]">Observações</Label>
          <Textarea rows={4} value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
        </Card>

        <Card className="p-3 mt-3 print:shadow-none print:border-black no-print">
          <div className="flex items-center justify-between mb-2">
            <Label className="text-[11px] font-semibold">
              Fotos deste registro ({fotos?.length ?? 0})
            </Label>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => fileInput.current?.click()}
            >
              <Camera className="w-4 h-4 mr-1.5" /> Anexar foto
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
              type="button"
              onClick={() => fileInput.current?.click()}
              className="w-full border-2 border-dashed border-border rounded-lg p-4 flex flex-col items-center gap-1 text-muted-foreground hover:bg-muted/50"
            >
              <ImagePlus className="w-6 h-6" />
              <span className="text-xs">Anexar fotos ao registro</span>
            </button>
          ) : (
            <div className="grid grid-cols-3 gap-2">
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
                  {(isAdmin || f.uploaded_by === userId) && (
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm("Excluir foto?"))
                          deletePhoto(f.id, f.storage_path, f.uploaded_by);
                      }}
                      className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 shadow"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                  {f.caption && (
                    <p className="text-[10px] px-1.5 py-0.5 bg-card border-t border-border line-clamp-2">
                      {f.caption}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>

        <div className="grid grid-cols-2 gap-6 mt-10 print:mt-16 text-[11px]">
          <div className="text-center">
            <div className="border-t border-foreground print:border-black pt-1">
              <b>Mecânico responsável</b>
            </div>
          </div>
          <div className="text-center">
            <div className="border-t border-foreground print:border-black pt-1">
              <b>Supervisor</b>
            </div>
          </div>
        </div>

        <div className="no-print mt-4">
          <Button onClick={() => save.mutate()} disabled={save.isPending} className="w-full h-11">
            <Save className="w-4 h-4 mr-2" /> {save.isPending ? "Salvando..." : "Salvar manutenção"}
          </Button>
        </div>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          @page { size: A4; margin: 10mm; }
          body { background: white !important; color: black !important; }
          select { -webkit-appearance: none; appearance: none; }
        }
      `}</style>
    </div>
  );
}
