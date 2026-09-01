import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useCallback, useMemo } from "react";
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
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Printer,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/cotacoes/$id")({
  component: DetalheCotacaoPage,
});

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

interface Cotacao {
  id: string | number;
  numero: string | number;
  patrimonio?: string;
  setor?: string;
  data_cotacao?: string;
  observacoes?: string;
}

interface ItemCotacao {
  id: string | number;
  cotacao_id: string | number;
  descricao: string;
  quantidade: number;
  unidade: string;
}

interface Fornecedor {
  id: string | number;
  razao_social: string;
  nome_fantasia?: string;
  cnpj?: string;
  telefone?: string;
}

interface CotacaoFornecedor {
  cotacao_id: string | number;
  fornecedor_id: string | number;
  fornecedores?: Fornecedor;
}

interface RespostaPreco {
  id: string | number;
  cotacao_id: string | number;
  fornecedor_id: string | number;
  item_id: string | number;
  preco: number;
  marca?: string;
}

export default function DetalheCotacaoPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();

  const [cotacao, setCotacao] = useState<Cotacao | null>(null);
  const [itens, setItens] = useState<ItemCotacao[]>([]);
  const [fornecedoresCotacao, setFornecedoresCotacao] = useState<CotacaoFornecedor[]>([]);
  const [respostas, setRespostas] = useState<RespostaPreco[]>([]);
  const [todosFornecedores, setTodosFornecedores] = useState<Fornecedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Modais
  const [isNovoItemOpen, setIsNovoItemOpen] = useState(false);
  const [isVincularFornecedorOpen, setIsVincularFornecedorOpen] = useState(false);
  const [isPrecosOpen, setIsPrecosOpen] = useState(false);
  const [isOrcamentoFornecedorOpen, setIsOrcamentoFornecedorOpen] = useState(false);

  // Form Item
  const [descricaoItem, setDescricaoItem] = useState("");
  const [quantidadeItem, setQuantidadeItem] = useState("1");
  const [unidadeItem, setUnidadeItem] = useState("UN");

  // Vinculação de Fornecedor
  const [fornecedorIdSelecionado, setFornecedorIdSelecionado] = useState("");

  // Inserção/Edição de Preços por Fornecedor
  const [fornecedorPrecoAtivo, setFornecedorPrecoAtivo] = useState<CotacaoFornecedor | null>(null);
  const [precosTemp, setPrecosTemp] = useState<{ [itemId: string]: { preco: string; marca: string } }>({});

  // Orçamento Individual do Fornecedor para Impressão
  const [fornecedorImprimir, setFornecedorImprimir] = useState<CotacaoFornecedor | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      
      const { data: cotData, error: cotErr } = await supabase
        .from("cotacoes")
        .select("*")
        .eq("id", id)
        .single();
      if (cotErr) throw cotErr;
      setCotacao(cotData);

      const { data: itensData, error: itensErr } = await supabase
        .from("cotacao_itens")
        .select("*")
        .eq("cotacao_id", id)
        .order("created_at", { ascending: true });
      if (itensErr) throw itensErr;
      setItens(itensData || []);

      const { data: fornCotData, error: fornCotErr } = await supabase
        .from("cotacao_fornecedores")
        .select("*, fornecedores(*)")
        .eq("cotacao_id", id);
      if (fornCotErr) throw fornCotErr;
      setFornecedoresCotacao(fornCotData || []);

      const { data: respData, error: respErr } = await supabase
        .from("cotacao_respostas")
        .select("*")
        .eq("cotacao_id", id);
      if (respErr) throw respErr;
      setRespostas(respData || []);

      const { data: allForn, error: allFornErr } = await supabase
        .from("fornecedores")
        .select("*")
        .order("razao_social", { ascending: true });
      if (allFornErr) throw allFornErr;
      setTodosFornecedores(allForn || []);
    } catch (error: unknown) {
      const err = error as Error;
      toast.error(`Erro ao carregar dados da cotação: ${err.message || "Erro desconhecido"}`);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Adicionar Item
  async function handleAddItem(e: React.FormEvent) {
    e.preventDefault();
    if (!descricaoItem.trim()) return toast.error("Informe a descrição do item.");
    try {
      setSaving(true);
      const { error } = await supabase.from("cotacao_itens").insert([
        {
          cotacao_id: id,
          descricao: descricaoItem,
          quantidade: parseFloat(quantidadeItem) || 1,
          unidade: unidadeItem,
        },
      ]);
      if (error) throw error;
      toast.success("Item adicionado!");
      setIsNovoItemOpen(false);
      setDescricaoItem("");
      setQuantidadeItem("1");
      fetchData();
    } catch (error: unknown) {
      const err = error as Error;
      toast.error("Erro ao adicionar item: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  // Deletar Item
  async function handleDeleteItem(itemId: string | number) {
    if (!confirm("Deseja excluir este item?")) return;
    try {
      await supabase.from("cotacao_itens").delete().eq("id", itemId);
      await supabase.from("cotacao_respostas").delete().eq("item_id", itemId);
      toast.success("Item excluído.");
      fetchData();
    } catch (error: unknown) {
      const err = error as Error;
      toast.error("Erro ao excluir item: " + err.message);
    }
  }

  // Vincular Fornecedor à Cotação
  async function handleVincularFornecedor(e: React.FormEvent) {
    e.preventDefault();
    if (!fornecedorIdSelecionado) return toast.error("Selecione um fornecedor.");
    try {
      setSaving(true);
      const { error } = await supabase.from("cotacao_fornecedores").insert([
        {
          cotacao_id: id,
          fornecedor_id: fornecedorIdSelecionado,
        },
      ]);
      if (error) throw error;
      toast.success("Fornecedor vinculado!");
      setIsVincularFornecedorOpen(false);
      setFornecedorIdSelecionado("");
      fetchData();
    } catch (error: unknown) {
      const err = error as Error;
      toast.error("Erro ao vincular (Fornecedor já vinculado?): " + err.message);
    } finally {
      setSaving(false);
    }
  }

  // Remover Fornecedor da Cotação
  async function handleRemoverFornecedor(fornecedorId: string | number) {
    if (!confirm("Remover fornecedor desta cotação e seus preços informados?")) return;
    try {
      await supabase.from("cotacao_respostas").delete().eq("cotacao_id", id).eq("fornecedor_id", fornecedorId);
      await supabase.from("cotacao_fornecedores").delete().eq("cotacao_id", id).eq("fornecedor_id", fornecedorId);
      toast.success("Fornecedor removido.");
      fetchData();
    } catch (error: unknown) {
      const err = error as Error;
      toast.error("Erro ao remover fornecedor: " + err.message);
    }
  }

  // Abrir Modal de Inserir Preços do Fornecedor
  function abrirModalPrecos(fc: CotacaoFornecedor) {
    setFornecedorPrecoAtivo(fc);
    const map: { [itemId: string]: { preco: string; marca: string } } = {};
    
    itens.forEach((item) => {
      const resp = respostas.find(
        (r) => String(r.fornecedor_id).trim() === String(fc.fornecedor_id).trim() && 
               String(r.item_id).trim() === String(item.id).trim()
      );
      map[item.id] = {
        preco: resp && resp.preco !== null && resp.preco !== undefined ? resp.preco.toString() : "",
        marca: resp ? resp.marca || "" : "",
      };
    });
    setPrecosTemp(map);
    setIsPrecosOpen(true);
  }

  // Salvar Preços do Fornecedor
  async function handleSalvarPrecos(e: React.FormEvent) {
    e.preventDefault();
    if (!fornecedorPrecoAtivo) return;
    try {
      setSaving(true);
      const fornecedorIdReal = fornecedorPrecoAtivo.fornecedor_id;

      for (const item of itens) {
        const dados = precosTemp[item.id];
        const precoStr = dados && dados.preco ? dados.preco.toString().replace(",", ".") : "";
        const precoNum = precoStr ? parseFloat(precoStr) : NaN;
        const marcaStr = dados ? dados.marca : null;

        const existente = respostas.find(
          (r) => String(r.fornecedor_id).trim() === String(fornecedorIdReal).trim() && 
                 String(r.item_id).trim() === String(item.id).trim()
        );

        if (existente) {
          if (!isNaN(precoNum) && precoNum > 0) {
            const { error: errUpd } = await supabase
              .from("cotacao_respostas")
              .update({ preco: precoNum, marca: marcaStr })
              .eq("id", existente.id);
            if (errUpd) console.error("Erro update:", errUpd);
          } else {
            await supabase.from("cotacao_respostas").delete().eq("id", existente.id);
          }
        } else if (!isNaN(precoNum) && precoNum > 0) {
          const { error: errIns } = await supabase.from("cotacao_respostas").insert([
            {
              cotacao_id: id,
              fornecedor_id: fornecedorIdReal,
              item_id: item.id,
              preco: precoNum,
              marca: marcaStr,
            },
          ]);
          if (errIns) console.error("Erro insert:", errIns);
        }
      }

      toast.success("Preços salvos com sucesso!");
      setIsPrecosOpen(false);
      await fetchData();
    } catch (error: unknown) {
      const err = error as Error;
      toast.error("Erro ao salvar preços: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  // ---- CÁLCULOS DOS MENORES PREÇOS POR ITEM ----
  const { menoresPrecosPorItem, valorTotalOtimo } = useMemo(() => {
    const menoresMap: { [itemId: string]: { menorPreco: number; fornecedorNome: string; marca: string } } = {};
    let totalOtimo = 0;

    itens.forEach((item) => {
      let menor: number | null = null;
      let fornNome = "—";
      let marcaStr = "—";

      fornecedoresCotacao.forEach((fc) => {
        const resp = respostas.find(
          (r) => String(r.fornecedor_id).trim() === String(fc.fornecedor_id).trim() && 
                 String(r.item_id).trim() === String(item.id).trim()
        );
        
        if (resp && typeof resp.preco === 'number' && resp.preco > 0) {
          if (menor === null || resp.preco < menor) {
            menor = resp.preco;
            fornNome = fc.fornecedores?.nome_fantasia || fc.fornecedores?.razao_social || "Fornecedor";
            marcaStr = resp.marca || "—";
          }
        }
      });

      if (menor !== null) {
        const subtotalItem = menor * (item.quantidade || 1);
        menoresMap[item.id] = { menorPreco: menor, fornecedorNome: fornNome, marca: marcaStr };
        totalOtimo += subtotalItem;
      }
    });

    return { menoresPrecosPorItem: menoresMap, valorTotalOtimo: totalOtimo };
  }, [itens, fornecedoresCotacao, respostas]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!cotacao) return <div className="p-6 text-center">Cotação não encontrada.</div>;

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6 print:p-0">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Button variant="outline" onClick={() => navigate({ to: "/cotacoes" })} className="gap-2">
          <ArrowLeft className="w-4 h-4" /> Voltar às Cotações
        </Button>
        <div className="flex gap-2">
          <Button onClick={() => window.print()} className="bg-slate-800 hover:bg-slate-900 text-white gap-2">
            <Printer className="w-4 h-4" /> Imprimir Comparativo
          </Button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 print:border-none print:shadow-none">
        <div className="flex justify-between items-start">
          <div>
            <span className="text-xs uppercase bg-blue-100 text-blue-800 font-bold px-2 py-1 rounded">
              Cotação Nº {cotacao.numero}
            </span>
            <h1 className="text-2xl font-bold text-slate-800 mt-2">
              Patrimônio / Equipamento: {cotacao.patrimonio || "Não informado"}
            </h1>
            <p className="text-sm text-slate-600 mt-1">Setor: {cotacao.setor || "—"} | Data: {cotacao.data_cotacao}</p>
            {cotacao.observacoes && <p className="text-xs text-slate-500 mt-2">Obs: {cotacao.observacoes}</p>}
          </div>
          <div className="text-right print:hidden">
            <span className="block text-xs text-slate-500">Valor Total Otimizado (Menores Preços):</span>
            <span className="text-2xl font-extrabold text-green-600">{brl(valorTotalOtimo)}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 print:hidden">
        <Button onClick={() => setIsNovoItemOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
          <Plus className="w-4 h-4" /> Adicionar Item / Peça
        </Button>
        <Button onClick={() => setIsVincularFornecedorOpen(true)} variant="outline" className="border-blue-600 text-blue-600 hover:bg-blue-50 gap-2">
          <Plus className="w-4 h-4" /> Vincular Fornecedor
        </Button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
          <h2 className="font-bold text-slate-800 text-base">Quadro Comparativo de Preços</h2>
          <span className="text-xs text-slate-500">Valores em Reais (R$)</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-slate-100 text-slate-700 text-xs uppercase">
              <tr>
                <th className="p-3 border-b">Item</th>
                <th className="p-3 border-b text-center">Qtd</th>
                <th className="p-3 border-b text-center">Un</th>
                {fornecedoresCotacao.map((fc) => (
                  <th key={fc.fornecedor_id} className="p-3 border-b text-right">
                    <div className="font-bold">{fc.fornecedores?.nome_fantasia || fc.fornecedores?.razao_social}</div>
                    <div className="text-[10px] text-slate-500 print:hidden flex justify-end gap-1 mt-1">
                      <button type="button" onClick={() => abrirModalPrecos(fc)} className="text-blue-600 hover:underline">
                        Editar Preços
                      </button>
                      <span>|</span>
                      <button type="button" onClick={() => { setFornecedorImprimir(fc); setIsOrcamentoFornecedorOpen(true); }} className="text-emerald-600 hover:underline">
                        Orçamento
                      </button>
                      <span>|</span>
                      <button type="button" onClick={() => handleRemoverFornecedor(fc.fornecedor_id)} className="text-red-600 hover:underline">
                        Excluir
                      </button>
                    </div>
                  </th>
                ))}
                <th className="p-3 border-b text-right bg-emerald-50 text-emerald-900 font-bold">
                  Menor Preço por Item
                </th>
                <th className="p-3 border-b text-center print:hidden">Ações Item</th>
              </tr>
            </thead>
            <tbody>
              {itens.length === 0 ? (
                <tr>
                  <td colSpan={5 + fornecedoresCotacao.length} className="p-6 text-center text-slate-500">
                    Nenhum item cadastrado nesta cotação.
                  </td>
                </tr>
              ) : (
                itens.map((item) => {
                  const menorInfo = menoresPrecosPorItem[item.id];
                  return (
                    <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="p-3 text-slate-800 font-medium">{item.descricao}</td>
                      <td className="p-3 text-center text-slate-600">{item.quantidade}</td>
                      <td className="p-3 text-center text-slate-600">{item.unidade}</td>

                      {fornecedoresCotacao.map((fc) => {
                        const resp = respostas.find(
                          (r) => String(r.fornecedor_id).trim() === String(fc.fornecedor_id).trim() && 
                                 String(r.item_id).trim() === String(item.id).trim()
                        );
                        const isMenor = menorInfo && resp && resp.preco === menorInfo.menorPreco;

                        return (
                          <td
                            key={fc.fornecedor_id}
                            className={`p-3 text-right ${isMenor ? "bg-green-50 font-bold text-green-700" : "text-slate-700"}`}
                          >
                            {resp && resp.preco > 0 ? (
                              <div>
                                <div>{brl(resp.preco)}</div>
                                {resp.marca && <div className="text-[10px] text-slate-500 font-normal">Marca: {resp.marca}</div>}
                              </div>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>
                        );
                      })}

                      <td className="p-3 text-right bg-emerald-50/60 font-semibold text-emerald-800">
                        {menorInfo ? (
                          <div>
                            <div className="flex items-center justify-end gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              {brl(menorInfo.menorPreco)}
                            </div>
                            <div className="text-[10px] text-slate-600 font-normal">
                              {menorInfo.fornecedorNome} {menorInfo.marca !== "—" ? `(${menorInfo.marca})` : ""}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 font-normal">Sem cotação</span>
                        )}
                      </td>

                      <td className="p-3 text-center print:hidden">
                        <Button size="sm" variant="ghost" onClick={() => handleDeleteItem(item.id)} className="text-red-600 h-8 w-8 p-0">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            <tfoot className="bg-slate-100 font-bold text-slate-800">
              <tr>
                <td colSpan={3} className="p-3 text-right">VALOR TOTAL:</td>
                {fornecedoresCotacao.map((fc) => {
                  let totalForn = 0;
                  itens.forEach((item) => {
                    const resp = respostas.find(
                      (r) => String(r.fornecedor_id).trim() === String(fc.fornecedor_id).trim() && 
                             String(r.item_id).trim() === String(item.id).trim()
                    );
                    if (resp && resp.preco > 0) {
                      totalForn += resp.preco * (item.quantidade || 1);
                    }
                  });
                  return (
                    <td key={fc.fornecedor_id} className="p-3 text-right">
                      {totalForn > 0 ? brl(totalForn) : "—"}
                    </td>
                  );
                })}
                <td className="p-3 text-right bg-emerald-100 text-emerald-900 text-base">
                  {brl(valorTotalOtimo)}
                </td>
                <td className="print:hidden"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <Dialog open={isNovoItemOpen} onOpenChange={setIsNovoItemOpen}>
        <DialogContent className="sm:max-w-md bg-white">
          <DialogHeader>
            <DialogTitle>Adicionar Item / Peça</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddItem} className="space-y-4 mt-2">
            <div>
              <Label className="text-xs font-semibold text-slate-700">Descrição da Peça / Serviço *</Label>
              <Input value={descricaoItem} onChange={(e) => setDescricaoItem(e.target.value)} placeholder="Ex: Filtro de Óleo" required className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs font-semibold text-slate-700">Quantidade</Label>
                <Input type="number" step="any" value={quantidadeItem} onChange={(e) => setQuantidadeItem(e.target.value)} required className="mt-1" />
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-700">Unidade</Label>
                <Input value={unidadeItem} onChange={(e) => setUnidadeItem(e.target.value)} placeholder="UN, PC, LT" required className="mt-1" />
              </div>
            </div>
            <DialogFooter className="mt-4 flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setIsNovoItemOpen(false)} disabled={saving}>Cancelar</Button>
              <Button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white">Salvar Item</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isVincularFornecedorOpen} onOpenChange={setIsVincularFornecedorOpen}>
        <DialogContent className="sm:max-w-md bg-white">
          <DialogHeader>
            <DialogTitle>Vincular Fornecedor à Cotação</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleVincularFornecedor} className="space-y-4 mt-2">
            <div>
              <Label className="text-xs font-semibold text-slate-700">Selecione o Fornecedor *</Label>
              <select
                className="w-full mt-1 border border-slate-300 rounded-md p-2 text-sm bg-white"
                value={fornecedorIdSelecionado}
                onChange={(e) => setFornecedorIdSelecionado(e.target.value)}
                required
              >
                <option value="">Selecione...</option>
                {todosFornecedores.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.nome_fantasia || f.razao_social} {f.cnpj ? `(CNPJ: ${f.cnpj})` : ""}
                  </option>
                ))}
              </select>
            </div>
            <DialogFooter className="mt-4 flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setIsVincularFornecedorOpen(false)} disabled={saving}>Cancelar</Button>
              <Button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white">Vincular</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isPrecosOpen} onOpenChange={setIsPrecosOpen}>
        <DialogContent className="sm:max-w-2xl bg-white max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Informar Preços: {fornecedorPrecoAtivo?.fornecedores?.nome_fantasia || fornecedorPrecoAtivo?.fornecedores?.razao_social}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSalvarPrecos} className="space-y-4 mt-2">
            <div className="space-y-3">
              {itens.map((item) => (
                <div key={item.id} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <div className="md:col-span-6 text-sm">
                    <span className="font-semibold text-slate-800">{item.descricao}</span>
                    <span className="block text-xs text-slate-500">Qtd: {item.quantidade} {item.unidade}</span>
                  </div>
                  <div className="md:col-span-3">
                    <Label className="text-[10px] text-slate-500">Preço Unitário (R$)</Label>
                    <Input
                      type="text"
                      placeholder="0,00"
                      value={precosTemp[item.id]?.preco || ""}
                      onChange={(e) =>
                        setPrecosTemp({
                          ...precosTemp,
                          [item.id]: { ...precosTemp[item.id], preco: e.target.value },
                        })
                      }
                    />
                  </div>
                  <div className="md:col-span-3">
                    <Label className="text-[10px] text-slate-500">Marca / Obs</Label>
                    <Input
                      type="text"
                      placeholder="Marca..."
                      value={precosTemp[item.id]?.marca || ""}
                      onChange={(e) =>
                        setPrecosTemp({
                          ...precosTemp,
                          [item.id]: { ...precosTemp[item.id], marca: e.target.value },
                        })
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
            <DialogFooter className="mt-4 flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setIsPrecosOpen(false)} disabled={saving}>Cancelar</Button>
              <Button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white">Salvar Preços</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isOrcamentoFornecedorOpen} onOpenChange={setIsOrcamentoFornecedorOpen}>
        <DialogContent className="sm:max-w-3xl bg-white max-h-[90vh] overflow-y-auto print:shadow-none print:border-none">
          {fornecedorImprimir && (
            <div className="space-y-4">
              <div className="border-b pb-4 flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Orçamento de Fornecedor</h2>
                  <p className="text-sm font-semibold text-blue-700 mt-1">
                    {fornecedorImprimir.fornecedores?.razao_social}
                  </p>
                  <p className="text-xs text-slate-600">
                    CNPJ: {fornecedorImprimir.fornecedores?.cnpj || "—"} | Tel: {fornecedorImprimir.fornecedores?.telefone || "—"}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold bg-slate-100 text-slate-800 px-2 py-1 rounded">
                    Cotação Nº {cotacao.numero}
                  </span>
                  <p className="text-xs text-slate-500 mt-1">Equipamento: {cotacao.patrimonio}</p>
                </div>
              </div>

              <table className="w-full text-left text-sm border-collapse mt-4">
                <thead>
                  <tr className="bg-slate-100 text-xs uppercase text-slate-700">
                    <th className="p-2 border">Item</th>
                    <th className="p-2 border text-center">Qtd</th>
                    <th className="p-2 border text-center">Un</th>
                    <th className="p-2 border text-right">Preço Unit.</th>
                    <th className="p-2 border">Marca</th>
                    <th className="p-2 border text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {itens.map((item) => {
                    const resp = respostas.find(
                      (r) => String(r.fornecedor_id).trim() === String(fornecedorImprimir.fornecedor_id).trim() && 
                             String(r.item_id).trim() === String(item.id).trim()
                    );
                    const preco = resp ? resp.preco : 0;
                    const subtotal = preco * (item.quantidade || 1);
                    return (
                      <tr key={item.id} className="border-b">
                        <td className="p-2 border">{item.descricao}</td>
                        <td className="p-2 border text-center">{item.quantidade}</td>
                        <td className="p-2 border text-center">{item.unidade}</td>
                        <td className="p-2 border text-right">{preco > 0 ? brl(preco) : "—"}</td>
                        <td className="p-2 border text-slate-600">{resp?.marca || "—"}</td>
                        <td className="p-2 border text-right font-semibold">{subtotal > 0 ? brl(subtotal) : "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100 font-bold">
                    <td colSpan={5} className="p-2 border text-right">TOTAL DO FORNECEDOR:</td>
                    <td className="p-2 border text-right text-base text-blue-700">
                      {brl(
                        itens.reduce((acc, item) => {
                          const resp = respostas.find(
                            (r) => String(r.fornecedor_id).trim() === String(fornecedorImprimir.fornecedor_id).trim() && 
                                   String(r.item_id).trim() === String(item.id).trim()
                          );
                          return acc + (resp ? resp.preco * (item.quantidade || 1) : 0);
                        }, 0)
                      )}
                    </td>
                  </tr>
                </tfoot>
              </table>

              <div className="pt-6 flex justify-end gap-2 print:hidden">
                <Button type="button" variant="outline" onClick={() => setIsOrcamentoFornecedorOpen(false)}>Fechar</Button>
                <Button type="button" onClick={() => window.print()} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
                  <Printer className="w-4 h-4" /> Imprimir Orçamento
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
