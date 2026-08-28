import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/cotacoes")({
  component: CotacoesIndex,
});

export default function CotacoesIndex() {
  const [cotacoes, setCotacoes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Estados do formulário
  const [numero, setNumero] = useState("");
  const [dataCotacao, setDataCotacao] = useState(new Date().toISOString().split("T")[0]);
  const [patrimonio, setPatrimonio] = useState("");
  const [setor, setSetor] = useState("");
  const [observacoes, setObservacoes] = useState("");

  useEffect(() => {
    fetchCotacoes();
  }, []);

  async function fetchCotacoes() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("cotacoes")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCotacoes(data || []);
    } catch (error) {
      console.error("Erro ao buscar cotações:", error);
      toast.error("Erro ao carregar cotações do sistema.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateCotacao(e: React.FormEvent) {
    e.preventDefault();
    if (!numero.trim()) {
      toast.error("Informe o número da cotação.");
      return;
    }

    try {
      setSaving(true);

      // Pega o usuário logado atualmente
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) {
        throw new Error("Usuário não autenticado.");
      }

      const { error } = await supabase.from("cotacoes").insert([
        {
          numero,
          data_cotacao: dataCotacao,
          patrimonio,
          setor,
          observacoes,
          solicitante_id: userData.user.id, // Envia o ID do usuário exigido pelo banco
        },
      ]);

      if (error) throw error;

      toast.success("Cotação cadastrada com sucesso!");
      setIsModalOpen(false);
      
      // Limpa os campos
      setNumero("");
      setPatrimonio("");
      setSetor("");
      setObservacoes("");
      
      // Recarrega a lista
      fetchCotacoes();
    } catch (error: any) {
      console.error("Erro ao salvar cotação:", error);
      toast.error(error.message || "Erro ao salvar cotação.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Gerenciamento de Cotações</h1>
          <p className="text-sm text-slate-500">Acompanhe e registre cotações de peças e serviços da frota</p>
        </div>
        <Button 
          onClick={() => setIsModalOpen(true)}
          className="bg-[#f97316] hover:bg-[#ea580c] text-white gap-2 font-semibold"
        >
          <Plus className="w-4 h-4" /> Nova Cotação
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-[#f97316]" />
        </div>
      ) : cotacoes.length === 0 ? (
        <div className="bg-white p-12 rounded-xl shadow-sm text-center border border-slate-200">
          <p className="text-slate-500 font-medium">Nenhuma cotação cadastrada até o momento.</p>
          <p className="text-xs text-slate-400 mt-1">Clique em "Nova Cotação" para começar.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-200">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 text-xs uppercase tracking-wider">
                <th className="p-4">Número</th>
                <th className="p-4">Data</th>
                <th className="p-4">Equipamento / Patrimônio</th>
                <th className="p-4">Setor</th>
                <th className="p-4">Ações</th>
              </tr>
            </thead>
            <tbody>
              {cotacoes.map((cotacao) => (
                <tr key={cotacao.id} className="border-b border-slate-100 hover:bg-slate-50 text-sm">
                  <td className="p-4 font-semibold text-slate-800">{cotacao.numero || "N/A"}</td>
                  <td className="p-4 text-slate-600">{cotacao.data_cotacao || "N/A"}</td>
                  <td className="p-4 text-slate-600">{cotacao.patrimonio || "N/A"}</td>
                  <td className="p-4 text-slate-600">{cotacao.setor || "N/A"}</td>
                  <td className="p-4">
                   <Button 
  variant="ghost" 
  size="sm" 
  onClick={() => navigate({ to: `/cotacoes/$id`, params: { id: cotacao.id } })}
  className="text-blue-600 hover:underline font-medium p-0 h-auto"
>
  Ver Detalhes
</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de Nova Cotação */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-800">Nova Cotação</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateCotacao} className="space-y-4 mt-2">
            <div>
              <Label htmlFor="numero" className="text-xs font-semibold text-slate-700">Número da Cotação *</Label>
              <Input
                id="numero"
                value={numero}
                onChange={(e) => setNumero(e.target.value)}
                placeholder="Ex: COT-2026/001"
                required
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="data" className="text-xs font-semibold text-slate-700">Data da Cotação</Label>
              <Input
                id="data"
                type="date"
                value={dataCotacao}
                onChange={(e) => setDataCotacao(e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="patrimonio" className="text-xs font-semibold text-slate-700">Equipamento / Patrimônio</Label>
              <Input
                id="patrimonio"
                value={patrimonio}
                onChange={(e) => setPatrimonio(e.target.value)}
                placeholder="Ex: Escavadeira CAT 320 (Patrimônio 123)"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="setor" className="text-xs font-semibold text-slate-700">Setor</Label>
              <Input
                id="setor"
                value={setor}
                onChange={(e) => setSetor(e.target.value)}
                placeholder="Ex: Manutenção, Obras, Oficina"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="observacoes" className="text-xs font-semibold text-slate-700">Observações</Label>
              <Input
                id="observacoes"
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Detalhes adicionais..."
                className="mt-1"
              />
            </div>

            <DialogFooter className="mt-4 flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="bg-[#f97316] hover:bg-[#ea580c] text-white font-semibold"
              >
                {saving ? "Salvando..." : "Salvar Cotação"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
