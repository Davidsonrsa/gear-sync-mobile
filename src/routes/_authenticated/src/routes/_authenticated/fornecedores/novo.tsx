import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/cotacoes/nova")({
  component: NovaCotacaoPage,
});

export default function NovaCotacaoPage() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [loadingNumero, setLoadingNumero] = useState(true);

  const [numero, setNumero] = useState("");
  const [patrimonio, setPatrimonio] = useState("");
  const [setor, setSetor] = useState("");
  const [dataCotacao, setDataCotacao] = useState("");
  const [observacoes, setObservacoes] = useState("");

  useEffect(() => {
    gerarProximoNumero();
  }, []);

  async function gerarProximoNumero() {
    try {
      setLoadingNumero(true);
      const { data, error } = await supabase
        .from("cotacoes")
        .select("numero")
        .order("created_at", { ascending: false })
        .limit(1);

      if (error) throw error;

      let proximo = 1;
      if (data && data.length > 0 && data[0].numero) {
        const ultimoNumero = parseInt(String(data[0].numero).replace(/\D/g, ""), 10);
        if (!isNaN(ultimoNumero)) {
          proximo = ultimoNumero + 1;
        }
      }

      setNumero(proximo.toString().padStart(4, "0"));
    } catch (error: any) {
      toast.error("Erro ao gerar número automático: " + error.message);
    } finally {
      setLoadingNumero(false);
    }
  }

  async function handleAvancar(e: React.FormEvent) {
    e.preventDefault();
    if (!numero.trim()) return toast.error("Informe o número da cotação.");

    try {
      setSaving(true);
      const { data, error } = await supabase
        .from("cotacoes")
        .insert([
          {
            numero: numero.trim(),
            patrimonio: patrimonio.trim() || null,
            setor: setor.trim() || null,
            data_cotacao: dataCotacao || null,
            observacoes: observacoes.trim() || null,
            status: "RASCUNHO",
          },
        ])
        .select()
        .single();

      if (error) throw error;

      toast.success("Cotação criada com sucesso!");
      navigate({ to: `/cotacoes/${data.id}` });
    } catch (error: any) {
      toast.error("Erro ao salvar cotação: " + error.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => navigate({ to: "/cotacoes" })} className="gap-2">
          <ArrowLeft className="w-4 h-4" /> Voltar às Cotações
        </Button>
        <h1 className="text-xl font-bold text-slate-800">Nova Cotação</h1>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <form onSubmit={handleAvancar} className="space-y-4">
          <div>
            <Label className="text-xs font-semibold text-slate-700">Número da Cotação *</Label>
            <div className="relative mt-1">
              <Input
                value={numero}
                onChange={(e) => setNumero(e.target.value)}
                placeholder="Ex: 0005"
                required
                readOnly
                className="bg-slate-50 font-medium"
              />
              {loadingNumero && (
                <Loader2 className="w-4 h-4 animate-spin absolute right-3 top-3 text-slate-400" />
              )}
            </div>
          </div>

          <div>
            <Label className="text-xs font-semibold text-slate-700">Patrimônio / Equipamento</Label>
            <Input
              placeholder="Ex: RE50- VIDRO"
              value={patrimonio}
              onChange={(e) => setPatrimonio(e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <Label className="text-xs font-semibold text-slate-700">Setor</Label>
            <Input
              placeholder="Ex: MANUTENÇÃO"
              value={setor}
              onChange={(e) => setSetor(e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <Label className="text-xs font-semibold text-slate-700">Data da Cotação</Label>
            <Input
              type="date"
              value={dataCotacao}
              onChange={(e) => setDataCotacao(e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <Label className="text-xs font-semibold text-slate-700">Observações</Label>
            <Input
              placeholder="Observações adicionais..."
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              className="mt-1"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => navigate({ to: "/cotacoes" })}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving || loadingNumero} className="bg-blue-600 hover:bg-blue-700 text-white">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Avançar para Adicionar Itens
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
