import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Plus,
  Loader2,
  Trash2,
  Edit,
  Eye,
  Building2,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/cotacoes/")({
  component: CotacoesPage,
});

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function CotacoesPage() {
  const navigate = useNavigate();
  const [cotacoes, setCotacoes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Modais
  const [isNovaCotacaoOpen, setIsNovaCotacaoOpen] = useState(false);
  const [isNovoFornecedorOpen, setIsNovoFornecedorOpen] = useState(false);
  const [isEditarCotacaoOpen, setIsEditarCotacaoOpen] = useState(false);
  const [cotacaoEditando, setCotacaoEditando] = useState<any>(null);

  // Form Nova Cotação
  const [numero, setNumero] = useState("");
  const [patrimonio, setPatrimonio] = useState("");
  const [setor, setSetor] = useState("MANUTENÇÃO");
  const [observacoes, setObservacoes] = useState("");

  // Form Novo Fornecedor
  const [razaoSocial, setRazaoSocial] = useState("");
  const [nomeFantasia, setNomeFantasia] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [banco, setBanco] = useState("");
  const [agencia, setAgencia] = useState("");
  const [conta, setConta] = useState("");
  const [pix, setPix] = useState("");

  const fetchCotacoes = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("cotacoes")
        .select("*, fornecedores(razao_social, nome_fantasia)")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCotacoes(data || []);
    } catch (error: any) {
      console.error("Erro ao buscar cotações:", error);
      toast.error(error.message || "Erro ao carregar cotações.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCotacoes();
  }, [fetchCotacoes]);

  // Função para gerar o próximo número automático ao abrir o modal
  async function abrirModalNovaCotacao() {
    try {
      const { data, error } = await supabase
        .from("cotacoes")
        .select("numero")
        .order("created_at", { ascending: false })
        .limit(1);

      let proximoNum = 1;
      if (data && data.length > 0) {
        const ultimo = parseInt(String(data[0].numero).replace(/\D/g, ""), 10);
        if (!isNaN(ultimo)) {
          proximoNum = ultimo + 1;
        }
      }
      setNumero(String(proximoNum).padStart(4, "0"));
    } catch (e) {
      setNumero("0001");
    }
    setIsNovaCotacaoOpen(true);
  }

  // Criar Cotação
  async function handleCreateCotacao(e: React.FormEvent) {
    e.preventDefault();
    if (!numero.trim()) return toast.error("Informe o número da cotação.");
    
    try {
      setSaving(true);
      const { error } = await supabase.from("cotacoes").insert([
        {
          numero: numero.trim(),
          patrimonio: patrimonio.trim() || null,
          setor: setor.trim() || null,
          observacoes: observacoes.trim() || null,
          status: "RASCUNHO",
          valor_total: 0,
          data_cotacao: new Date().toISOString().split("T")[0],
        },
      ]);
      
      if (error) throw error;
      
      toast.success("Cotação criada com sucesso!");
      setIsNovaCotacaoOpen(false);
      setPatrimonio("");
      setSetor("MANUTENÇÃO");
      setObservacoes("");
      fetchCotacoes();
    } catch (error: any) {
      console.error("Erro detalhado ao criar cotação:", error);
      toast.error(error.message || "Erro ao criar cotação.");
    } finally {
      setSaving(false);
    }
  }

  // Cadastrar Fornecedor
  async function handleCadastrarFornecedor(e: React.FormEvent) {
    e.preventDefault();
    if (!razaoSocial.trim()) return toast.error("Informe a Razão Social.");
    
    try {
      setSaving(true);
      const { error } = await supabase.from("fornecedores").insert([
        {
          razao_social: razaoSocial.trim(),
          nome_fantasia: nomeFantasia.trim() || razaoSocial.trim(),
          cnpj: cnpj.trim() || null,
          telefone: telefone.trim() || null,
          email: email.trim() || null,
          banco: banco.trim() || null,
          agencia: agencia.trim() || null,
          conta: conta.trim() || null,
          pix: pix.trim() || null,
          ativo: true,
        },
      ]);
      
      if (error) throw error;
      
      toast.success("Fornecedor cadastrado com sucesso!");
      setIsNovoFornecedorOpen(false);
      setRazaoSocial("");
      setNomeFantasia("");
      setCnpj("");
      setTelefone("");
      setEmail("");
      setBanco("");
      setAgencia("");
      setConta("");
      setPix("");
    } catch (error: any) {
      console.error("Erro detalhado ao cadastrar fornecedor:", error);
      toast.error(error.message || "Erro ao cadastrar fornecedor.");
    } finally {
      setSaving(false);
    }
  }

  // Deletar Cotação
  async function handleDeleteCotacao(id: string) {
    if (!confirm("Tem certeza que deseja excluir esta cotação? Todos os itens e respostas vinculadas serão removidos.")) return;
    try {
      await supabase.from("cotacao_respostas").delete().eq("cotacao_id", id);
      await supabase.from("cotacao_itens").delete().eq("cotacao_id", id);
      await supabase.from("cotacao_fornecedores").delete().eq("cotacao_id", id);
      const { error } = await supabase.from("cotacoes").delete().eq("id", id);

      if (error) throw error;
      toast.success("Cotação excluída com sucesso!");
      fetchCotacoes();
    } catch (error: any) {
      toast.error("Erro ao excluir cotação: " + error.message);
    }
  }

  // Atualizar Cotação
  async function handleUpdateCotacao(e: React.FormEvent) {
    e.preventDefault();
    if (!cotacaoEditando) return;
    
    try {
      setSaving(true);
      const { error } = await supabase
        .from("cotacoes")
        .update({
          numero: cotacaoEditando.numero,
          patrimonio: cotacaoEditando.patrimonio,
          setor: cotacaoEditando.setor,
          observacoes: cotacaoEditando.observacoes,
        })
        .eq("id", cotacaoEditando.id);

      if (error) throw error;
      
      toast.success("Cotação atualizada!");
      setIsEditarCotacaoOpen(false);
      setCotacaoEditando(null);
      fetchCotacoes();
    } catch (error: any) {
      toast.error(error.message || "Erro ao atualizar cotação.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-black">Gerenciamento de Cotações</h1>
          <p className="text-sm text-slate-600">Acompanhe e registre cotações de peças e serviços da frota</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setIsNovoFornecedorOpen(true)}
            variant="outline"
            className="border-blue-600 text-blue-600 hover:bg-blue-50 gap-2"
          >
            <Building2 className="w-4 h-4" /> Cadastrar Fornecedor
          </Button>
          <Button
            onClick={abrirModalNovaCotacao}
            className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
          >
            <Plus className="w-4 h-4" /> Nova Cotação
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : cotacoes.length === 0 ? (
          <p className="p-8 text-center text-slate-500">Nenhuma cotação cadastrada.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100 text-slate-700 text-xs uppercase">
                <tr>
                  <th className="p-3">Número</th>
                  <th className="p-3">Data</th>
                  <th className="p-3">Patrimônio / Equipamento</th>
                  <th className="p-3">Setor</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Total / Vencedor</th>
                  <th className="p-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {cotacoes.map((c) => {
                  // Lê valor_total ou total dependendo de como está no banco
                  const valorTotal = c.valor_total ?? c.total ?? 0;
                  return (
                    <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="p-3 font-semibold text-slate-800">{c.numero}</td>
                      <td className="p-3 text-slate-600">{c.data_cotacao || "—"}</td>
                      <td className="p-3 text-slate-600">{c.patrimonio || "—"}</td>
                      <td className="p-3 text-slate-600">{c.setor || "—"}</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded text-xs uppercase font-medium ${
                          String(c.status).toUpperCase() === 'FINALIZADA' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {c.status}
                        </span>
                      </td>
                      <td className="p-3 text-slate-700">
                        {valorTotal > 0 ? brl(valorTotal) : "Pendente"}
                        {c.fornecedores && (
                          <span className="block text-xs text-slate-500">
                            Fornecedor: {c.fornecedores.nome_fantasia || c.fornecedores.razao_social}
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-right space-x-2 whitespace-nowrap">
                        <Button
                          size="sm"
                          onClick={() => navigate({ to: `/cotacoes/${c.id}` })}
                          className="bg-blue-600 hover:bg-blue-700 text-white gap-1"
                        >
                          <Eye className="w-4 h-4" /> Detalhes
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setCotacaoEditando(c);
                            setIsEditarCotacaoOpen(true);
                          }}
                          className="gap-1 text-slate-700"
                        >
                          <Edit className="w-4 h-4" /> Editar
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleDeleteCotacao(c.id)}
                          className="bg-red-600 hover:bg-red-700 text-white"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: NOVA COTAÇÃO */}
      <Dialog open={isNovaCotacaoOpen} onOpenChange={setIsNovaCotacaoOpen}>
        <DialogContent className="sm:max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-800">Criar Nova Cotação</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateCotacao} className="space-y-4 mt-2">
            <div>
              <Label className="text-xs font-semibold text-slate-700">Número da Cotação *</Label>
              <Input value={numero} onChange={(e) => setNumero(e.target.value)} placeholder="Ex: 0006" required className="mt-1" />
            </div>
            <div>
              <Label className="text-xs font-semibold text-slate-700">Equipamento / Patrimônio</Label>
              <Input value={patrimonio} onChange={(e) => setPatrimonio(e.target.value)} placeholder="Ex: RE20" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs font-semibold text-slate-700">Setor</Label>
              <Input value={setor} onChange={(e) => setSetor(e.target.value)} placeholder="MANUTENÇÃO" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs font-semibold text-slate-700">Observações Gerais</Label>
              <Input value={observacoes} onChange={(e) => setObservacoes(e.target.value)} placeholder="Condições de pagamento, etc." className="mt-1" />
            </div>
            <DialogFooter className="mt-4 flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setIsNovaCotacaoOpen(false)} disabled={saving}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold">
                {saving ? "Salvando..." : "Criar Cotação"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL: CADASTRAR FORNECEDOR */}
      <Dialog open={isNovoFornecedorOpen} onOpenChange={setIsNovoFornecedorOpen}>
        <DialogContent className="sm:max-w-lg bg-white max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-800">Cadastrar Novo Fornecedor</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Cadastre o fornecedor e seus dados de pagamento para incluí-lo nas cotações.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCadastrarFornecedor} className="space-y-3 mt-2">
            <div>
              <Label className="text-xs font-semibold text-slate-700">Razão Social *</Label>
              <Input value={razaoSocial} onChange={(e) => setRazaoSocial(e.target.value)} placeholder="Ex: Comércio de Peças LTDA" required className="mt-1" />
            </div>
            <div>
              <Label className="text-xs font-semibold text-slate-700">Nome Fantasia</Label>
              <Input value={nomeFantasia} onChange={(e) => setNomeFantasia(e.target.value)} placeholder="Ex: Peças Brasil" className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs font-semibold text-slate-700">CNPJ</Label>
                <Input value={cnpj} onChange={(e) => setCnpj(e.target.value)} placeholder="00.000.000/0001-00" className="mt-1" />
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-700">Telefone / WhatsApp</Label>
                <Input value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="(31) 99999-9999" className="mt-1" />
              </div>
            </div>
            <div>
              <Label className="text-xs font-semibold text-slate-700">E-mail</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="contato@fornecedor.com" className="mt-1" />
            </div>
            <div className="border-t border-slate-200 pt-3 mt-3">
              <p className="text-xs font-bold text-slate-700 mb-2">Dados para Pagamento</p>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div>
                  <Label className="text-xs font-semibold text-slate-700">Banco</Label>
                  <Input value={banco} onChange={(e) => setBanco(e.target.value)} placeholder="Ex: 001 - Banco do Brasil" className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-slate-700">Agência</Label>
                  <Input value={agencia} onChange={(e) => setAgencia(e.target.value)} placeholder="Ex: 1234-5" className="mt-1" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs font-semibold text-slate-700">Conta</Label>
                  <Input value={conta} onChange={(e) => setConta(e.target.value)} placeholder="Ex: 12345-6" className="mt-1" />
                </div>
              </div>
              <div className="mt-2">
                <Label className="text-xs font-semibold text-slate-700">Chave Pix</Label>
                <Input value={pix} onChange={(e) => setPix(e.target.value)} placeholder="CNPJ, E-mail, Telefone ou Chave Aleatória" className="mt-1" />
              </div>
            </div>
            <DialogFooter className="mt-4 flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setIsNovoFornecedorOpen(false)} disabled={saving}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold">
                {saving ? "Salvando..." : "Salvar Fornecedor"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL: EDITAR COTAÇÃO */}
      <Dialog open={isEditarCotacaoOpen} onOpenChange={setIsEditarCotacaoOpen}>
        <DialogContent className="sm:max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-800">Editar Cotação</DialogTitle>
          </DialogHeader>
          {cotacaoEditando && (
            <form onSubmit={handleUpdateCotacao} className="space-y-4 mt-2">
              <div>
                <Label className="text-xs font-semibold text-slate-700">Número da Cotação *</Label>
                <Input 
                  value={cotacaoEditando.numero} 
                  onChange={(e) => setCotacaoEditando({ ...cotacaoEditando, numero: e.target.value })} 
                  required 
                  className="mt-1" 
                />
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-700">Equipamento / Patrimônio</Label>
                <Input 
                  value={cotacaoEditando.patrimonio || ""} 
                  onChange={(e) => setCotacaoEditando({ ...cotacaoEditando, patrimonio: e.target.value })} 
                  className="mt-1" 
                />
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-700">Setor</Label>
                <Input 
                  value={cotacaoEditando.setor || ""} 
                  onChange={(e) => setCotacaoEditando({ ...cotacaoEditando, setor: e.target.value })} 
                  className="mt-1" 
                />
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-700">Observações Gerais</Label>
                <Input 
                  value={cotacaoEditando.observacoes || ""} 
                  onChange={(e) => setCotacaoEditando({ ...cotacaoEditando, observacoes: e.target.value })} 
                  className="mt-1" 
                />
              </div>
              <DialogFooter className="mt-4 flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setIsEditarCotacaoOpen(false)} disabled={saving}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold">
                  {saving ? "Salvando..." : "Salvar Alterações"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
