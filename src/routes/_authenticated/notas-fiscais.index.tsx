import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Search,
  PlusCircle,
  FileSpreadsheet,
  Eye,
  Filter,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/notas-fiscais/")({
  component: NotasFiscaisPage,
});

export interface NotaFiscalItem {
  id: string;
  numero_nf: string;
  fornecedor: string;
  equipamento: string;
  emissao: string;
  valor_total: number;
  parcelas: string;
}

const mockNotas: NotaFiscalItem[] = [
  {
    id: "1",
    numero_nf: "NF 54582",
    fornecedor: "APAIL DIESEL",
    equipamento: "CB 03",
    emissao: "—",
    valor_total: 377.0,
    parcelas: "1ª: 14/09/2026",
  },
  {
    id: "2",
    numero_nf: "NF 181",
    fornecedor: "CENTRAL DOS RADIADRES",
    equipamento: "RE 62",
    emissao: "—",
    valor_total: 240.0,
    parcelas: "1ª: 07/09/2026",
  },
  {
    id: "3",
    numero_nf: "NF 152",
    fornecedor: "LESSA",
    equipamento: "—",
    emissao: "—",
    valor_total: 215.0,
    parcelas: "1ª: 20/09/2020",
  },
  {
    id: "4",
    numero_nf: "NF 5605",
    fornecedor: "—",
    equipamento: "—",
    emissao: "—",
    valor_total: 0.0,
    parcelas: "—",
  },
  {
    id: "5",
    numero_nf: "NF 44768",
    fornecedor: "SOS DOS RADIADORES",
    equipamento: "—",
    emissao: "—",
    valor_total: 470.0,
    parcelas: "1ª: 25/08/2022",
  },
];

function NotasFiscaisPage() {
  const [openModal, setOpenModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notasList, setNotasList] = useState<NotaFiscalItem[]>(mockNotas);

  // Form states
  const [numeroNf, setNumeroNf] = useState("");
  const [fornecedor, setFornecedor] = useState("");
  const [equipamento, setEquipamento] = useState("");
  const [emissao, setEmissao] = useState("");
  const [valorTotal, setValorTotal] = useState("");
  const [vencimento, setVencimento] = useState("");

  const formatBRL = (val: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(val);
  };

  const handleSalvarNota = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const novaNota: NotaFiscalItem = {
      id: Date.now().toString(),
      numero_nf: numeroNf.startsWith("NF") ? numeroNf : `NF ${numeroNf}`,
      fornecedor: fornecedor || "—",
      equipamento: equipamento || "—",
      emissao: emissao
        ? new Date(emissao + "T00:00:00").toLocaleDateString("pt-BR")
        : "—",
      valor_total: parseFloat(valorTotal) || 0,
      parcelas: vencimento
        ? `1ª: ${new Date(vencimento + "T00:00:00").toLocaleDateString("pt-BR")}`
        : "—",
    };

    try {
      await supabase.from("notas_fiscais").insert([
        {
          numero_nf: novaNota.numero_nf,
          fornecedor: novaNota.fornecedor,
          equipamento: novaNota.equipamento,
          emissao: emissao,
          valor_total: novaNota.valor_total,
          vencimento: vencimento,
        },
      ]);
    } catch (err) {
      console.log("Salvo em modo de exibição local:", err);
    } finally {
      setNotasList((prev) => [novaNota, ...prev]);
      setLoading(false);
      setOpenModal(false);
      setNumeroNf("");
      setFornecedor("");
      setEquipamento("");
      setEmissao("");
      setValorTotal("");
      setVencimento("");
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-5">
      {/* Cabeçalho exatamente igual ao da imagem */}
      <div className="flex flex-row items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Controle de Notas Fiscais
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Consulte, gerencie e acompanhe os vencimentos fiscais registrados.
          </p>
        </div>

        {/* Botão de Nova Nota Fiscal */}
        <Dialog open={openModal} onOpenChange={setOpenModal}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              className="rounded-full border-slate-300 text-slate-800 font-medium hover:bg-slate-50 px-4 py-2 flex items-center gap-2 shadow-sm"
            >
              <PlusCircle className="w-4 h-4 text-slate-700" />
              Nova Nota Fiscal
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold">
                Cadastrar Nova Nota Fiscal
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSalvarNota} className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="numNf">Número da NF</Label>
                  <Input
                    id="numNf"
                    placeholder="Ex: 54582"
                    value={numeroNf}
                    onChange={(e) => setNumeroNf(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="fornecedor">Fornecedor</Label>
                  <Input
                    id="fornecedor"
                    placeholder="Ex: APAIL DIESEL"
                    value={fornecedor}
                    onChange={(e) => setFornecedor(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="equipamento">Equipamento</Label>
                  <Input
                    id="equipamento"
                    placeholder="Ex: CB 03"
                    value={equipamento}
                    onChange={(e) => setEquipamento(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="emissao">Data Emissão</Label>
                  <Input
                    id="emissao"
                    type="date"
                    value={emissao}
                    onChange={(e) => setEmissao(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="valor">Valor Total (R$)</Label>
                  <Input
                    id="valor"
                    type="number"
                    step="0.01"
                    placeholder="0,00"
                    value={valorTotal}
                    onChange={(e) => setValueTotal(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="vencimento">Vencimento 1ª Parcela</Label>
                  <Input
                    id="vencimento"
                    type="date"
                    value={vencimento}
                    onChange={(e) => setVencimento(e.target.value)}
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpenModal(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? "Salvando..." : "Salvar NF"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Cards KPI com os contornos arredondados da imagem */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1 */}
        <div className="bg-white rounded-2xl border border-slate-900/80 p-4 flex items-center gap-4 shadow-xs">
          <div className="text-xl font-serif font-bold text-slate-800 pl-2">
            $
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wide">
              VALOR TOTAL ACUMULADO
            </p>
            <p className="text-2xl font-bold text-slate-900 mt-0.5">
              R$ 1.384.134,88
            </p>
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-white rounded-2xl border border-slate-900/80 p-4 flex items-center gap-4 shadow-xs">
          <div className="p-1 pl-2 text-slate-800">
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.8"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wide">
              NOTAS EXIBIDAS
            </p>
            <p className="text-2xl font-bold text-slate-900 mt-0.5">
              1000{" "}
              <span className="text-xs font-normal text-slate-500">
                registro(s)
              </span>
            </p>
          </div>
        </div>

        {/* Card 3 */}
        <div className="bg-white rounded-2xl border border-slate-900/80 p-4 flex items-center gap-4 shadow-xs">
          <div className="p-1 pl-2 text-slate-800">
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.8"
                d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
              />
            </svg>
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wide">
              MÉDIA POR NOTA
            </p>
            <p className="text-2xl font-bold text-slate-900 mt-0.5">
              R$ 1.384,13
            </p>
          </div>
        </div>
      </div>

      {/* Caixa de Busca e Filtros estilo Pílula da imagem */}
      <div className="bg-white rounded-2xl border border-slate-900/80 p-3 flex flex-wrap items-center gap-3 shadow-xs">
        <div className="relative flex-1 min-w-[280px]">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por NF, fornecedor, equipamento ou descrição..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-transparent rounded-lg border-0 focus:outline-none focus:ring-0 text-slate-700 placeholder:text-slate-400"
          />
        </div>

        <div className="flex items-center gap-2 text-sm text-slate-600">
          <span>Emissão:</span>
          <div className="relative">
            <input
              type="text"
              placeholder="dd/mm/aaaa"
              className="w-32 px-3 py-1.5 text-xs text-center border border-slate-800 rounded-lg focus:outline-none"
            />
          </div>
          <span>até</span>
          <div className="relative">
            <input
              type="text"
              placeholder="dd/mm/aaaa"
              className="w-32 px-3 py-1.5 text-xs text-center border border-slate-800 rounded-lg focus:outline-none"
            />
          </div>
        </div>

        <button className="px-3 py-1.5 rounded-lg border border-slate-800 text-xs font-medium text-slate-800 flex items-center gap-1.5 hover:bg-slate-50">
          <Filter className="w-3.5 h-3.5" />
          Filtrar
        </button>

        <button className="px-2 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900">
          Limpar
        </button>

        <button className="px-3 py-1.5 rounded-lg border border-slate-800 text-xs font-medium text-slate-800 flex items-center gap-1.5 hover:bg-slate-50 ml-auto">
          <FileSpreadsheet className="w-3.5 h-3.5" />
          Importar Excel
        </button>
      </div>

      {/* Tabela idêntica à foto */}
      <div className="bg-white rounded-2xl border border-slate-900/80 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="border-b border-slate-900/80 text-slate-800 font-bold bg-white">
              <tr>
                <th className="py-3 px-4">Número NF</th>
                <th className="py-3 px-4">Fornecedor</th>
                <th className="py-3 px-4">Equipamento</th>
                <th className="py-3 px-4">Emissão</th>
                <th className="py-3 px-4">Valor Total</th>
                <th className="py-3 px-4">Parcelas / Vencimentos</th>
                <th className="py-3 px-4 text-center">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-800">
              {notasList.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/50">
                  <td className="py-3 px-4 font-semibold whitespace-nowrap">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="border border-slate-700 rounded px-1 py-0.5 text-[10px] font-mono">
                        $
                      </span>
                      {item.numero_nf}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-semibold whitespace-nowrap">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="border border-slate-700 rounded px-1 py-0.5 text-[10px]">
                        🏢
                      </span>
                      {item.fornecedor}
                    </span>
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    {item.equipamento !== "—" ? (
                      <span className="inline-flex items-center gap-1 border border-slate-700 rounded-full px-2 py-0.5 text-[11px] font-medium">
                        🚗 {item.equipamento}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1">
                      📅 {item.emissao}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-bold whitespace-nowrap">
                    {formatBRL(item.valor_total)}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    {item.parcelas !== "—" ? (
                      <span className="border border-slate-700 rounded px-2 py-0.5 text-[11px]">
                        {item.parcelas}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="py-3 px-4 text-center whitespace-nowrap">
                    <button className="inline-flex items-center gap-1 text-slate-800 font-medium hover:underline text-xs">
                      <Eye className="w-3.5 h-3.5" /> Detalhes
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default NotasFiscaisPage;
