import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ArrowLeft, Plus, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/cotacoes/$id/")({
  component: CotacaoDetalhesPage,
});

export default function CotacaoDetalhesPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();

  const [cotacao, setCotacao] = useState<any>(null);
  const [itens, setItens] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Estados do formulário de novo item
  const [descricao, setDescricao] = useState("");
  const [quantidade, setQuantidade] = useState("1");
  const [valorUnitario, setValorUnitario] = useState("");
  const [fornecedor, setFornecedor] = useState("");

  useEffect(() => {
    fetchDadosCotacao();
  }, [id]);

  async function fetchDadosCotacao() {
    try {
      setLoading(true);

      // Busca a cotação principal
      const { data: cotacaoData, error: cotacaoError } = await supabase
        .from("cotacoes")
        .select("*")
        .eq("id", id)
        .single();

      if (cotacaoError) throw cotacaoError;
      setCotacao(cotacaoData);

      // Busca os itens vinculados a esta cotação
      const { data: itensData, error: itensError } = await supabase
        .from("cotacao_itens")
        .select("*")
        .eq("cotacao_id", id)
        .order("created_at", { ascending: true });

      if (itensError) throw itensError;
      setItens(itensData || []);
    } catch (error) {
      console.error("Erro ao buscar detalhes da cotação:", error);
      toast.error("Erro ao carregar os dados da cotação.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateItem(e: React.FormEvent) {
    e.preventDefault();
    if (!descricao.trim()) {
      toast.error("Informe a descrição do item/peça.");
      return;
    }

    try {
      setSaving(true);
      const { error } = await supabase.from("cotacao_itens").insert([
        {
          cotacao_id: id,
          descricao,
          quantidade: Number(quantidade) || 1,
          observacoes: [
            valorUnitario ? `Valor unitário: R$ ${Number(valorUnitario).toFixed(2)}` : null,
            fornecedor ? `Fornecedor: ${fornecedor}` : null,
          ]
            .filter(Boolean)
            .join(" | ") || null,
        },
      ]);

      if (error) throw error;

      toast.success("Item adicionado com sucesso!");
      setIsModalOpen(false);

      // Limpa os campos
      setDescricao("");
      setQuantidade("1");
      setValorUnitario("");
      setFornecedor("");

      // Recarrega os itens
      fetchDadosCotacao();
    } catch (error: any) {
      console.error("Erro ao adicionar item:", error);
      toast.error(error.message || "Erro ao adicionar item.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteItem(itemId: string) {
    if (!confirm("Deseja realmente excluir este item?")) return;

    try {
      const { error } = await supabase.from("cotacao_itens").delete().eq("id", itemId);
      if (error) throw error;

      toast.success("Item removido com sucesso!");
      fetchDadosCotacao();
    } catch (error) {
      console.error("Erro ao excluir item:", error);
      toast.error("Erro ao remover o item.");
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!cotacao) {
    return (
      <div className="p-6 max-w-7xl mx-auto text-center">
        <p className="text-slate-600 mb-4">Cotação não encontrada.</p>
        <Button onClick={() => navigate({ to: "/cotacoes" })} variant="outline">
          Voltar para Cotações
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate({ to: "/cotacoes" })}
          className="gap-2"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Cotação: {cotacao.numero}</h1>
          <p className="text-sm text-slate-500">
            Setor: {cotacao.setor || "N/A"} | Patrimônio: {cotacao.patrimonio || "N/A"} | Data: {cotacao.data_cotacao || "N/A"}
          </p>
        </div>
      </div>

      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-slate-800">Itens / Peças Solicitadas</h2>
        <Button
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white gap-2 font-semibold"
        >
          <Plus className="w-4 h-4" /> Adicionar Item
        </Button>
      </div>

      {itens.length === 0 ? (
        <div className="bg-white p-10 rounded-xl shadow-sm text-center border border-slate-200">
          <p className="text-slate-500 font-medium">Nenhum item adicionado a esta cotação ainda.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-200">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 text-xs uppercase tracking-wider">
                <th className="p-4">Descrição do Item</th>
                <th className="p-4">Qtd</th>
                <th className="p-4">Valor Unitário</th>
                <th className="p-4">Fornecedor</th>
                <th className="p-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {itens.map((item) => (
                <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50 text-sm">
                  <td className="p-4 font-semibold text-slate-800">{item.descricao}</td>
                  <td className="p-4 text-slate-600">{item.quantidade}</td>
                  <td className="p-4 text-slate-600">
                    {item.valor_unitario ? `R$ ${Number(item.valor_unitario).toFixed(2)}` : "—"}
                  </td>
                  <td className="p-4 text-slate-600">{item.fornecedor || "—"}</td>
                  <td className="p-4 text-right">
                    <Button
                      size="sm"
                      onClick={() => handleDeleteItem(item.id)}
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal para Adicionar Item */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-800">Adicionar Item à Cotação</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateItem} className="space-y-4 mt-2">
            <div>
              <Label htmlFor="descricao" className="text-xs font-semibold text-slate-700">Descrição da Peça / Serviço *</Label>
              <Input
                id="descricao"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Ex: Filtro de óleo, Rolamento..."
                required
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="quantidade" className="text-xs font-semibold text-slate-700">Quantidade</Label>
                <Input
                  id="quantidade"
                  type="number"
                  min="1"
                  value={quantidade}
                  onChange={(e) => setQuantidade(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="valor" className="text-xs font-semibold text-slate-700">Valor Unitário (R$)</Label>
                <Input
                  id="valor"
                  type="number"
                  step="0.01"
                  value={valorUnitario}
                  onChange={(e) => setValorUnitario(e.target.value)}
                  placeholder="0.00"
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="fornecedor" className="text-xs font-semibold text-slate-700">Fornecedor</Label>
              <Input
                id="fornecedor"
                value={fornecedor}
                onChange={(e) => setFornecedor(e.target.value)}
                placeholder="Nome do fornecedor..."
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
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
              >
                {saving ? "Salvando..." : "Adicionar Item"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
