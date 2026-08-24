import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PlusCircle, Search, Filter, FileSpreadsheet, Eye, DollarSign, FileText, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/_authenticated/notas-fiscais/")({
  component: NotasFiscaisPage,
});

function NotasFiscaisPage() {
  const [openModal, setOpenModal] = useState(false);
  const [loading, setLoading] = useState(false);

  // Campos do formulário de Nota Fiscal
  const [numeroNf, setNumeroNf] = useState("");
  const [fornecedor, setFornecedor] = useState("");
  const [equipamento, setEquipamento] = useState("");
  const [emissao, setEmissao] = useState("");
  const [valorTotal, setValorTotal] = useState("");
  const [parcelas, setParcelas] = useState("1");
  const [vencimento, setVencimento] = useState("");

  const handleSalvarNota = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.from("notas_fiscais").insert([
        {
          numero_nf: numeroNf,
          fornecedor,
          equipamento,
          emissao,
          valor_total: parseFloat(valorTotal),
          parcelas: parseInt(parcelas),
          vencimento,
        },
      ]);

      if (error) throw error;

      alert("Nota Fiscal cadastrada com sucesso!");
      setOpenModal(false);
      
      // Limpar formulário
      setNumeroNf("");
      setFornecedor("");
      setEquipamento("");
      setEmissao("");
      setValorTotal("");
      setVencimento("");
    } catch (err: any) {
      alert("Erro ao cadastrar nota: " + (err.message || "Erro desconhecido"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Cabeçalho com botão de cadastro */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Controle de Notas Fiscais</h1>
          <p className="text-sm text-muted-foreground">
            Consulte, gerencie e acompanhe os vencimentos fiscais registrados.
          </p>
        </div>

        {/* BOTÃO QUE REAPARECE NO TOPO */}
        <Dialog open={openModal} onOpenChange={setOpenModal}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2 bg-primary hover:bg-primary/90">
              <PlusCircle className="w-4 h-4" />
              Nova Nota Fiscal
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Cadastrar Nova Nota Fiscal</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSalvarNota} className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="numNf">Número da NF</Label>
                  <Input
                    id="numNf"
                    placeholder="Ex: NF 54582"
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
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="valor">Valor Total (R$)</Label>
                  <Input
                    id="valor"
                    type="number"
                    step="0.01"
                    placeholder="0,00"
                    value={valorTotal}
                    onChange={(e) => setValorTotal(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="parcelas">Nº Parcelas</Label>
                  <Input
                    id="parcelas"
                    type="number"
                    min="1"
                    value={parcelas}
                    onChange={(e) => setParcelas(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="vencimento">Vencimento 1ª</Label>
                  <Input
                    id="vencimento"
                    type="date"
                    value={vencimento}
                    onChange={(e) => setVencimento(e.target.value)}
                    required
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

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-muted rounded-lg">
              <DollarSign className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase">
                Valor Total Acumulado
              </p>
              <p className="text-2xl font-bold">R$ 1.384.134,88</p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-muted rounded-lg">
              <FileText className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase">
                Notas Exibidas
              </p>
              <p className="text-2xl font-bold">1000 <span className="text-sm font-normal text-muted-foreground">registro(s)</span></p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-muted rounded-lg">
              <TrendingUp className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase">
                Média Por Nota
              </p>
              <p className="text-2xl font-bold">R$ 1.384,13</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Barra de Busca, Filtros e Importação */}
      <Card className="shadow-sm">
        <CardContent className="p-4 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Buscar por NF, fornecedor, equipamento ou descrição..."
            />
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Emissão:</span>
            <Input type="date" className="w-auto" />
            <span>até</span>
            <Input type="date" className="w-auto" />
          </div>

          <Button variant="outline" className="flex items-center gap-1 text-sm">
            <Filter className="w-4 h-4" />
            Filtrar
          </Button>

          <Button variant="ghost" className="text-sm">
            Limpar
          </Button>

          <Button variant="outline" className="flex items-center gap-1 text-sm ml-auto">
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            Importar Excel
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default NotasFiscaisPage;
