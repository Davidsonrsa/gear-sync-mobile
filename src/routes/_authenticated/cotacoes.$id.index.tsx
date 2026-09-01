import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Plus,
  Loader2,
  Trash2,
  FileText,
  Copy,
  Send,
  DollarSign,
  Trophy,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/cotacoes/$id/")({
  component: CotacaoDetalhesPage,
});

type Item = {
  id: string;
  ordem: number;
  codigo: string | null;
  descricao: string;
  marca: string | null;
  quantidade: number;
  unidade: string;
  aplicacao: string | null;
  observacoes: string | null;
};

type Participante = {
  id: string;
  fornecedor_id: string;
  status: string;
  data_envio: string | null;
  data_resposta: string | null;
  fornecedores: { razao_social: string; nome_fantasia: string | null; whatsapp: string | null; email: string | null } | null;
};

type Resposta = {
  id: string;
  cotacao_item_id: string;
  fornecedor_id: string;
  preco_unitario: number;
  quantidade: number;
  desconto: number;
  frete: number;
  impostos: number;
  total_item: number;
  prazo_entrega: number | null;
  marca: string | null;
  observacoes: string | null;
  escolhido: boolean;
};

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function CotacaoDetalhesPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();

  const [cotacao, setCotacao] = useState<any>(null);
  const [itens, setItens] = useState<Item[]>([]);
  const [participantes, setParticipantes] = useState<Participante[]>([]);
  const [respostas, setRespostas] = useState<Resposta[]>([]);
  const [fornecedores, setFornecedores] = useState<any[]>([]);
  const [historico, setHistorico] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // modais
  const [isItemOpen, setIsItemOpen] = useState(false);
  const [isResumoOpen, setIsResumoOpen] = useState(false);
  const [isFornOpen, setIsFornOpen] = useState(false);
  const [respostaFornId, setRespostaFornId] = useState<string | null>(null);

  // form item
  const [codigo, setCodigo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [marca, setMarca] = useState("");
  const [quantidade, setQuantidade] = useState("1");
  const [unidade, setUnidade] = useState("UN");
  const [aplicacao, setAplicacao] = useState("");

  // form participante
  const [novoFornecedorId, setNovoFornecedorId] = useState("");

  // form respostas (item_id -> campos)
  const [draft, setDraft] = useState<
    Record<string, { preco: string; prazo: string; marca: string; obs: string }>
  >({});

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const [c, i, f, r, forn, h] = await Promise.all([
        supabase.from("cotacoes").select("*").eq("id", id).single(),
        supabase.from("cotacao_itens").select("*").eq("cotacao_id", id).order("ordem"),
        supabase
          .from("cotacao_fornecedores")
          .select("*, fornecedores(razao_social, nome_fantasia, whatsapp, email)")
          .eq("cotacao_id", id)
          .order("created_at"),
        supabase.from("cotacao_respostas").select("*").eq("cotacao_id", id),
        supabase.from("fornecedores").select("id, razao_social, nome_fantasia").eq("ativo", true).order("razao_social"),
        supabase.from("cotacao_historico").select("*").eq("cotacao_id", id).order("created_at", { ascending: false }).limit(20),
      ]);

      if (c.error) throw c.error;
      setCotacao(c.data);
      setItens((i.data as Item[]) || []);
      setParticipantes((f.data as unknown as Participante[]) || []);
      setRespostas((r.data as Resposta[]) || []);
      setFornecedores(forn.data || []);
      setHistorico(h.data || []);
    } catch (error) {
      console.error("Erro ao buscar detalhes da cotação:", error);
      toast.error("Erro ao carregar os dados da cotação.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  async function logHistorico(acao: string, descricao: string) {
    const { data: userData } = await supabase.auth.getUser();
    await supabase.from("cotacao_historico").insert([
      { cotacao_id: id, acao, descricao, usuario_id: userData?.user?.id ?? null },
    ]);
  }

  /* ---------------- ITENS ---------------- */
  async function handleCreateItem(e: React.FormEvent) {
    e.preventDefault();
    if (!descricao.trim()) return toast.error("Informe a descrição do item.");
    try {
      setSaving(true);
      const { error } = await supabase.from("cotacao_itens").insert([
        {
          cotacao_id: id,
          ordem: itens.length + 1,
          codigo: codigo || null,
          descricao,
          marca: marca || null,
          quantidade: Number(quantidade) || 1,
          unidade: unidade || "UN",
          aplicacao: aplicacao || null,
        },
      ]);
      if (error) throw error;
      await logHistorico("ITEM_ADICIONADO", `Item adicionado: ${descricao}`);
      toast.success("Item adicionado com sucesso!");
      setIsItemOpen(false);
      setCodigo("");
      setDescricao("");
      setMarca("");
      setQuantidade("1");
      setUnidade("UN");
      setAplicacao("");
      fetchAll();
    } catch (error: any) {
      toast.error(error.message || "Erro ao adicionar item.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteItem(itemId: string) {
    if (!confirm("Deseja realmente excluir este item?")) return;
    const { error } = await supabase.from("cotacao_itens").delete().eq("id", itemId);
    if (error) return toast.error("Erro ao remover o item.");
    await logHistorico("ITEM_REMOVIDO", "Item removido da cotação");
    toast.success("Item removido!");
    fetchAll();
  }

  /* ---------------- FORNECEDORES ---------------- */
  async function handleAddFornecedor() {
    if (!novoFornecedorId) return toast.error("Selecione um fornecedor.");
    try {
      setSaving(true);
      const { error } = await supabase.from("cotacao_fornecedores").insert([
        { cotacao_id: id, fornecedor_id: novoFornecedorId, status: "convidado", data_envio: new Date().toISOString() },
      ]);
      if (error) throw error;
      await logHistorico("FORNECEDOR_CONVIDADO", "Fornecedor incluído na cotação");
      toast.success("Fornecedor incluído na cotação!");
      setIsFornOpen(false);
      setNovoFornecedorId("");
      fetchAll();
    } catch (error: any) {
      toast.error(error.message || "Erro ao incluir fornecedor.");
    } finally {
      setSaving(false);
    }
  }

  async function handleRemoveFornecedor(participanteId: string, fornecedorId: string) {
    if (!confirm("Remover este fornecedor e suas respostas desta cotação?")) return;
    await supabase.from("cotacao_respostas").delete().eq("cotacao_id", id).eq("fornecedor_id", fornecedorId);
    const { error } = await supabase.from("cotacao_fornecedores").delete().eq("id", participanteId);
    if (error) return toast.error("Erro ao remover fornecedor.");
    toast.success("Fornecedor removido.");
    fetchAll();
  }

  /* ---------------- RESUMO ---------------- */
  const resumoTexto = useMemo(() => {
    if (!cotacao) return "";
    const linhas = [
      `*SOLICITAÇÃO DE COTAÇÃO ${cotacao.numero}*`,
      `Data: ${cotacao.data_cotacao ?? "-"}`,
      cotacao.patrimonio ? `Equipamento/Patrimônio: ${cotacao.patrimonio}` : null,
      cotacao.placa ? `Placa: ${cotacao.placa}` : null,
      cotacao.setor ? `Setor: ${cotacao.setor}` : null,
      "",
      "*ITENS SOLICITADOS:*",
      ...itens.map(
        (it, idx) =>
          `${idx + 1}. ${it.descricao}${it.codigo ? ` (cód. ${it.codigo})` : ""}${it.marca ? ` - ${it.marca}` : ""} — ${it.quantidade} ${it.unidade}${it.aplicacao ? ` | Aplicação: ${it.aplicacao}` : ""}`,
      ),
      "",
      cotacao.observacoes ? `Observações: ${cotacao.observacoes}` : null,
      "Favor informar preço unitário, prazo de entrega, condição de pagamento e validade da proposta.",
    ].filter(Boolean);
    return linhas.join("\n");
  }, [cotacao, itens]);

  /* ---------------- RESPOSTAS ---------------- */
  function abrirRespostas(fornecedorId: string) {
    const d: Record<string, { preco: string; prazo: string; marca: string; obs: string }> = {};
    itens.forEach((it) => {
      const r = respostas.find((x) => x.cotacao_item_id === it.id && x.fornecedor_id === fornecedorId);
      d[it.id] = {
        preco: r ? String(r.preco_unitario) : "",
        prazo: r?.prazo_entrega != null ? String(r.prazo_entrega) : "",
        marca: r?.marca ?? "",
        obs: r?.observacoes ?? "",
      };
    });
    setDraft(d);
    setRespostaFornId(fornecedorId);
  }

  async function salvarRespostas() {
    if (!respostaFornId) return;
    try {
      setSaving(true);
      const preenchidos = itens.filter((it) => draft[it.id]?.preco !== "" && draft[it.id]?.preco != null);
      if (preenchidos.length === 0) return toast.error("Informe ao menos um preço.");

      for (const it of preenchidos) {
        const d = draft[it.id];
        const preco = Number(d.preco) || 0;
        const total = preco * Number(it.quantidade || 0);
        const existente = respostas.find(
          (x) => x.cotacao_item_id === it.id && x.fornecedor_id === respostaFornId,
        );
        const payload = {
          cotacao_id: id,
          cotacao_item_id: it.id,
          fornecedor_id: respostaFornId,
          preco_unitario: preco,
          quantidade: Number(it.quantidade || 0),
          total_item: total,
          prazo_entrega: d.prazo ? Number(d.prazo) : null,
          marca: d.marca || null,
          observacoes: d.obs || null,
        };
        const { error } = existente
          ? await supabase.from("cotacao_respostas").update(payload).eq("id", existente.id)
          : await supabase.from("cotacao_respostas").insert([payload]);
        if (error) throw error;
      }

      await supabase
        .from("cotacao_fornecedores")
        .update({ status: "respondido", data_resposta: new Date().toISOString() })
        .eq("cotacao_id", id)
        .eq("fornecedor_id", respostaFornId);

      await logHistorico("RESPOSTA_REGISTRADA", "Valores do fornecedor lançados na cotação");
      toast.success("Valores registrados!");
      setRespostaFornId(null);
      fetchAll();
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar valores.");
    } finally {
      setSaving(false);
    }
  }

  /* ---------------- COMPARATIVO ---------------- */
  const comparativo = useMemo(() => {
    const melhorPorItem: Record<string, { fornecedorId: string; total: number } | null> = {};
    itens.forEach((it) => {
      const rs = respostas.filter((r) => r.cotacao_item_id === it.id && r.preco_unitario > 0);
      if (rs.length === 0) {
        melhorPorItem[it.id] = null;
      } else {
        const best = rs.reduce((min, r) => (Number(r.total_item) < Number(min.total_item) ? r : min), rs[0]);
        melhorPorItem[it.id] = { fornecedorId: best.fornecedor_id, total: Number(best.total_item) };
      }
    });

    const totaisPorFornecedor = participantes.map((p) => {
      const rs = respostas.filter((r) => r.fornecedor_id === p.fornecedor_id);
      const total = rs.reduce((s, r) => s + Number(r.total_item || 0), 0);
      const itensRespondidos = rs.filter((r) => r.preco_unitario > 0).length;
      return { fornecedorId: p.fornecedor_id, total, itensRespondidos, completo: itensRespondidos === itens.length && itens.length > 0 };
    });

    const completos = totaisPorFornecedor.filter((t) => t.completo && t.total > 0);
    const melhorTotal = completos.length
      ? completos.reduce((min, t) => (t.total < min.total ? t : min), completos[0])
      : null;

    return { melhorPorItem, totaisPorFornecedor, melhorTotal };
  }, [itens, respostas, participantes]);

  const nomeFornecedor = useCallback(
    (fid: string) => {
      const p = participantes.find((x) => x.fornecedor_id === fid);
      return p?.fornecedores?.nome_fantasia || p?.fornecedores?.razao_social || "Fornecedor";
    },
    [participantes],
  );

  async function definirVencedor(fornecedorId: string) {
    if (!confirm(`Definir ${nomeFornecedor(fornecedorId)} como fornecedor escolhido?`)) return;
    const total = comparativo.totaisPorFornecedor.find((t) => t.fornecedorId === fornecedorId)?.total ?? 0;
    await supabase.from("cotacao_respostas").update({ escolhido: false }).eq("cotacao_id", id);
    await supabase.from("cotacao_respostas").update({ escolhido: true }).eq("cotacao_id", id).eq("fornecedor_id", fornecedorId);
    const { error } = await supabase
      .from("cotacoes")
      .update({ fornecedor_escolhido_id: fornecedorId, total, subtotal: total, status: "finalizada", finalizada_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return toast.error("Erro ao definir vencedor.");
    await logHistorico("FORNECEDOR_ESCOLHIDO", `Fornecedor escolhido: ${nomeFornecedor(fornecedorId)} — ${brl(total)}`);
    toast.success("Fornecedor escolhido definido!");
    fetchAll();
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
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-center gap-3">
        <Button
          size="sm"
          onClick={() => navigate({ to: "/cotacoes" })}
          className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Button>
        <div className="flex-1 min-w-[200px]">
          <h1 className="text-2xl font-bold text-black">Cotação {cotacao.numero}</h1>
          <p className="text-sm text-slate-600">
            Setor: {cotacao.setor || "N/A"} | Patrimônio: {cotacao.patrimonio || "N/A"} | Data:{" "}
            {cotacao.data_cotacao || "N/A"} | Status: <strong>{cotacao.status}</strong>
          </p>
        </div>
        <Button onClick={() => setIsResumoOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
          <FileText className="w-4 h-4" /> Resumo para fornecedores
        </Button>
      </div>

      {/* ITENS */}
      <section className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="flex justify-between items-center p-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-black">Itens / Peças Solicitadas</h2>
          <Button onClick={() => setIsItemOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
            <Plus className="w-4 h-4" /> Adicionar Item
          </Button>
        </div>
        {itens.length === 0 ? (
          <p className="p-8 text-center text-slate-500">Nenhum item adicionado ainda.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100 text-slate-700 text-xs uppercase">
                <tr>
                  <th className="p-3">#</th>
                  <th className="p-3">Código</th>
                  <th className="p-3">Descrição</th>
                  <th className="p-3">Marca</th>
                  <th className="p-3">Qtd</th>
                  <th className="p-3">Un.</th>
                  <th className="p-3">Aplicação</th>
                  <th className="p-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {itens.map((item, idx) => (
                  <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="p-3 text-slate-500">{idx + 1}</td>
                    <td className="p-3 text-slate-600">{item.codigo || "—"}</td>
                    <td className="p-3 font-semibold text-slate-800">{item.descricao}</td>
                    <td className="p-3 text-slate-600">{item.marca || "—"}</td>
                    <td className="p-3 text-slate-600">{item.quantidade}</td>
                    <td className="p-3 text-slate-600">{item.unidade}</td>
                    <td className="p-3 text-slate-600">{item.aplicacao || "—"}</td>
                    <td className="p-3 text-right">
                      <Button size="sm" onClick={() => handleDeleteItem(item.id)} className="bg-red-600 hover:bg-red-700 text-white">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* FORNECEDORES */}
      <section className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="flex justify-between items-center p-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-black">Fornecedores Participantes</h2>
          <Button onClick={() => setIsFornOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
            <Plus className="w-4 h-4" /> Incluir Fornecedor
          </Button>
        </div>
        {participantes.length === 0 ? (
          <p className="p-8 text-center text-slate-500">Nenhum fornecedor convidado para esta cotação.</p>
        ) : (
          <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
            {participantes.map((p) => {
              const t = comparativo.totaisPorFornecedor.find((x) => x.fornecedorId === p.fornecedor_id);
              const vencedor = comparativo.melhorTotal?.fornecedorId === p.fornecedor_id;
              return (
                <div
                  key={p.id}
                  className={`rounded-lg border p-4 ${vencedor ? "border-green-500 bg-green-50" : "border-slate-200 bg-slate-50"}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-slate-800">{nomeFornecedor(p.fornecedor_id)}</p>
                      <p className="text-xs text-slate-500 capitalize">{p.status}</p>
                    </div>
                    {vencedor && <Trophy className="w-5 h-5 text-green-600" />}
                  </div>
                  <p className="mt-2 text-sm text-slate-600">
                    {t?.itensRespondidos ?? 0}/{itens.length} itens • Total{" "}
                    <strong className={vencedor ? "text-green-700" : ""}>{brl(t?.total ?? 0)}</strong>
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      onClick={() => abrirRespostas(p.fornecedor_id)}
                      className="bg-blue-600 hover:bg-blue-700 text-white gap-1"
                      disabled={itens.length === 0}
                    >
                      <DollarSign className="w-4 h-4" /> Lançar valores
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleRemoveFornecedor(p.id, p.fornecedor_id)}
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* COMPARATIVO */}
      {itens.length > 0 && participantes.length > 0 && (
        <section className="bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="p-4 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-black">Comparativo de Preços</h2>
            <p className="text-xs text-slate-500">
              As melhores ofertas por item e o menor total geral aparecem destacados em verde.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100 text-slate-700 text-xs uppercase">
                <tr>
                  <th className="p-3">Item</th>
                  <th className="p-3">Qtd</th>
                  {participantes.map((p) => (
                    <th key={p.id} className="p-3">{nomeFornecedor(p.fornecedor_id)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {itens.map((it) => (
                  <tr key={it.id} className="border-b border-slate-100">
                    <td className="p-3 font-medium text-slate-800">{it.descricao}</td>
                    <td className="p-3 text-slate-600">{it.quantidade} {it.unidade}</td>
                    {participantes.map((p) => {
                      const r = respostas.find(
                        (x) => x.cotacao_item_id === it.id && x.fornecedor_id === p.fornecedor_id,
                      );
                      const melhor = comparativo.melhorPorItem[it.id];
                      const isMelhor = !!r && melhor?.fornecedorId === p.fornecedor_id && r.preco_unitario > 0;
                      return (
                        <td
                          key={p.id}
                          className={`p-3 ${isMelhor ? "bg-green-100 font-bold text-green-800" : "text-slate-600"}`}
                        >
                          {r && r.preco_unitario > 0 ? (
                            <>
                              {brl(Number(r.total_item))}
                              <span className="block text-xs font-normal opacity-70">
                                {brl(Number(r.preco_unitario))}/un
                                {r.prazo_entrega ? ` • ${r.prazo_entrega}d` : ""}
                              </span>
                            </>
                          ) : (
                            "—"
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
                <tr className="bg-slate-50 font-semibold">
                  <td className="p-3" colSpan={2}>TOTAL</td>
                  {participantes.map((p) => {
                    const t = comparativo.totaisPorFornecedor.find((x) => x.fornecedorId === p.fornecedor_id);
                    const vencedor = comparativo.melhorTotal?.fornecedorId === p.fornecedor_id;
                    return (
                      <td key={p.id} className={`p-3 ${vencedor ? "bg-green-200 text-green-900" : "text-slate-700"}`}>
                        {brl(t?.total ?? 0)}
                        {vencedor && <span className="block text-xs">Melhor oferta</span>}
                      </td>
                    );
                  })}
                </tr>
                <tr>
                  <td className="p-3" colSpan={2}></td>
                  {participantes.map((p) => (
                    <td key={p.id} className="p-3">
                      <Button
                        size="sm"
                        onClick={() => definirVencedor(p.fornecedor_id)}
                        className={`gap-1 text-white ${
                          cotacao.fornecedor_escolhido_id === p.fornecedor_id
                            ? "bg-green-600 hover:bg-green-700"
                            : "bg-blue-600 hover:bg-blue-700"
                        }`}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        {cotacao.fornecedor_escolhido_id === p.fornecedor_id ? "Escolhido" : "Escolher"}
                      </Button>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* HISTÓRICO */}
      {historico.length > 0 && (
        <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <h2 className="text-lg font-semibold text-black mb-3">Histórico da Cotação</h2>
          <ul className="space-y-2 text-sm">
            {historico.map((h) => (
              <li key={h.id} className="flex gap-3 border-b border-slate-100 pb-2">
                <span className="text-xs text-slate-400 whitespace-nowrap">
                  {new Date(h.created_at).toLocaleString("pt-BR")}
                </span>
                <span className="text-slate-700">{h.descricao || h.acao}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* MODAL ITEM */}
      <Dialog open={isItemOpen} onOpenChange={setIsItemOpen}>
        <DialogContent className="sm:max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-800">Adicionar Item à Cotação</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateItem} className="space-y-4 mt-2">
            <div>
              <Label className="text-xs font-semibold text-slate-700">Descrição da Peça / Serviço *</Label>
              <Input value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Ex: Filtro de óleo" required className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-semibold text-slate-700">Código</Label>
                <Input value={codigo} onChange={(e) => setCodigo(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-700">Marca</Label>
                <Input value={marca} onChange={(e) => setMarca(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-700">Quantidade</Label>
                <Input type="number" min="1" step="0.01" value={quantidade} onChange={(e) => setQuantidade(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-700">Unidade</Label>
                <Input value={unidade} onChange={(e) => setUnidade(e.target.value)} placeholder="UN, PC, L" className="mt-1" />
              </div>
            </div>
            <div>
              <Label className="text-xs font-semibold text-slate-700">Aplicação</Label>
              <Input value={aplicacao} onChange={(e) => setAplicacao(e.target.value)} placeholder="Ex: Escavadeira CAT 320" className="mt-1" />
            </div>
            <DialogFooter className="mt-4 flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setIsItemOpen(false)} disabled={saving}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold">
                {saving ? "Salvando..." : "Adicionar Item"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL FORNECEDOR */}
      <Dialog open={isFornOpen} onOpenChange={setIsFornOpen}>
        <DialogContent className="sm:max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-800">Incluir Fornecedor</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <Label className="text-xs font-semibold text-slate-700">Fornecedor</Label>
            <Select value={novoFornecedorId} onValueChange={setNovoFornecedorId}>
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="Selecione um fornecedor" />
              </SelectTrigger>
              <SelectContent className="bg-white">
                {fornecedores
                  .filter((f) => !participantes.some((p) => p.fornecedor_id === f.id))
                  .map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.nome_fantasia || f.razao_social}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            {fornecedores.length === 0 && (
              <p className="text-xs text-slate-500">Nenhum fornecedor ativo cadastrado.</p>
            )}
          </div>
          <DialogFooter className="mt-4 flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => setIsFornOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleAddFornecedor} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold">
              {saving ? "Salvando..." : "Incluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL RESUMO */}
      <Dialog open={isResumoOpen} onOpenChange={setIsResumoOpen}>
        <DialogContent className="sm:max-w-lg bg-white">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-800">Resumo para Fornecedores</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Copie ou envie este texto pronto para solicitar os preços.
            </DialogDescription>
          </DialogHeader>
          <Textarea readOnly value={resumoTexto} className="h-72 font-mono text-xs bg-slate-50" />
          <DialogFooter className="mt-4 flex gap-2 justify-end">
            <Button
              onClick={() => {
                navigator.clipboard.writeText(resumoTexto);
                toast.success("Resumo copiado!");
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
            >
              <Copy className="w-4 h-4" /> Copiar
            </Button>
            <Button
              onClick={() =>
                window.open(`https://wa.me/?text=${encodeURIComponent(resumoTexto)}`, "_blank")
              }
              className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
            >
              <Send className="w-4 h-4" /> Enviar no WhatsApp
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL RESPOSTAS */}
      <Dialog open={!!respostaFornId} onOpenChange={(o) => !o && setRespostaFornId(null)}>
        <DialogContent className="sm:max-w-3xl bg-white max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-800">
              Lançar valores — {respostaFornId ? nomeFornecedor(respostaFornId) : ""}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Informe o preço unitário retornado pelo fornecedor para cada item.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            {itens.map((it) => {
              const d = draft[it.id] || { preco: "", prazo: "", marca: "", obs: "" };
              const total = (Number(d.preco) || 0) * Number(it.quantidade || 0);
              return (
                <div key={it.id} className="p-3 border border-slate-200 rounded-lg bg-slate-50 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-slate-800 text-sm">{it.descricao}</p>
                      <p className="text-xs text-slate-500">
                        Qtd: {it.quantidade} {it.unidade} {it.codigo ? `| Cód: ${it.codigo}` : ""}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-slate-500 block">Total do item</span>
                      <span className="font-bold text-slate-800 text-sm">{brl(total)}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div>
                      <Label className="text-xs text-slate-600">Preço Unitário (R$)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={d.preco}
                        onChange={(e) =>
                          setDraft({ ...draft, [it.id]: { ...d, preco: e.target.value } })
                        }
                        placeholder="0,00"
                        className="mt-1 bg-white"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-slate-600">Prazo (dias)</Label>
                      <Input
                        type="number"
                        value={d.prazo}
                        onChange={(e) =>
                          setDraft({ ...draft, [it.id]: { ...d, prazo: e.target.value } })
                        }
                        placeholder="Ex: 5"
                        className="mt-1 bg-white"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-slate-600">Marca da Oferta</Label>
                      <Input
                        value={d.marca}
                        onChange={(e) =>
                          setDraft({ ...draft, [it.id]: { ...d, marca: e.target.value } })
                        }
                        placeholder="Marca"
                        className="mt-1 bg-white"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-slate-600">Observações</Label>
                      <Input
                        value={d.obs}
                        onChange={(e) =>
                          setDraft({ ...draft, [it.id]: { ...d, obs: e.target.value } })
                        }
                        placeholder="Obs"
                        className="mt-1 bg-white"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <DialogFooter className="mt-4 flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => setRespostaFornId(null)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={salvarRespostas} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold">
              {saving ? "Salvando..." : "Salvar Valores"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
