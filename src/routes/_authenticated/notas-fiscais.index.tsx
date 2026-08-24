import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Search,
  FileText,
  Plus,
  SlidersHorizontal,
  DollarSign,
  Receipt,
  TrendingUp,
  Eye,
  Calendar,
  Building2,
  HardDrive,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { ImportExcelDialog } from "@/components/ImportExcelDialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/notas-fiscais/")({
  component: NotasFiscaisList,
});

type NotaFiscal = {
  id: string;
  identificacao: string | null;
  data: string | null;
  nf: string;
  fornecedor: string | null;
  descricao_produto: string | null;
  observacao: string | null;
  equipamento_id: string | null;
  valor: number | null;
  venc01: string | null;
  venc02: string | null;
  venc03: string | null;
  venc04: string | null;
  venc05: string | null;
};

function formatDate(value: string | null) {
  if (!value) return "—";
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

function formatCurrency(value: number | null) {
  if (value == null) return "R$ 0,00";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value));
}

type NewNotaFiscal = {
  nf: string;
  data: string;
  fornecedor: string;
  identificacao: string;
  descricao_produto: string;
  valor: string;
  observacao: string;
};

const emptyNotaFiscal: NewNotaFiscal = {
  nf: "",
  data: "",
  fornecedor: "",
  identificacao: "",
  descricao_produto: "",
  valor: "",
  observacao: "",
};

function NewNotaFiscalDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<NewNotaFiscal>(emptyNotaFiscal);

  const createMutation = useMutation({
    mutationFn: async () => {
      const nf = form.nf.trim();
      if (!nf) throw new Error("O número da NF é obrigatório.");

      const parsedValue = form.valor.trim() ? Number(form.valor.replace(",", ".")) : null;
      if (parsedValue !== null && !Number.isFinite(parsedValue)) {
        throw new Error("Informe um valor válido.");
      }

      const { error } = await supabase.from("notas_fiscais").insert({
        nf,
        data: form.data || null,
        fornecedor: form.fornecedor.trim() || null,
        identificacao: form.identificacao.trim() || null,
        descricao_produto: form.descricao_produto.trim() || null,
        valor: parsedValue,
        observacao: form.observacao.trim() || null,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Nota fiscal cadastrada com sucesso!");
      setForm(emptyNotaFiscal);
      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: ["notas-fiscais"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Erro ao cadastrar nota fiscal.");
    },
  });

  if (!open) return null;

  return (
    <Card className="mt-4 border-slate-200 p-4 shadow-md sm:p-6 bg-white">
      <div className="mb-4">
        <h2 className="text-lg font-bold text-slate-900">Nova Nota Fiscal</h2>
        <p className="text-xs text-slate-500">Preencha os dados principais da nota fiscal.</p>
      </div>
      <form
        className="grid gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          createMutation.mutate();
        }}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor="nota-nf" className="text-xs font-semibold">Número da NF *</Label>
            <Input
              id="nota-nf"
              required
              value={form.nf}
              onChange={(event) => setForm({ ...form, nf: event.target.value })}
              className="h-9 text-xs"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="nota-data" className="text-xs font-semibold">Data de Emissão</Label>
            <Input
              id="nota-data"
              type="date"
              value={form.data}
              onChange={(event) => setForm({ ...form, data: event.target.value })}
              className="h-9 text-xs"
            />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor="nota-fornecedor" className="text-xs font-semibold">Fornecedor</Label>
            <Input
              id="nota-fornecedor"
              value={form.fornecedor}
              onChange={(event) => setForm({ ...form, fornecedor: event.target.value })}
              className="h-9 text-xs"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="nota-identificacao" className="text-xs font-semibold">Identificação (Equipamento)</Label>
            <Input
              id="nota-identificacao"
              value={form.identificacao}
              onChange={(event) => setForm({ ...form, identificacao: event.target.value })}
              className="h-9 text-xs"
            />
          </div>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="nota-descricao-produto" className="text-xs font-semibold">Descrição dos Produtos</Label>
          <Textarea
            id="nota-descricao-produto"
            rows={2}
            value={form.descricao_produto}
            onChange={(event) => setForm({ ...form, descricao_produto: event.target.value })}
            className="text-xs"
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="nota-valor" className="text-xs font-semibold">Valor (R$)</Label>
          <Input
            id="nota-valor"
            inputMode="decimal"
            placeholder="0,00"
            value={form.valor}
            onChange={(event) => setForm({ ...form, valor: event.target.value })}
            className="h-9 text-xs"
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="nota-observacao" className="text-xs font-semibold">Observação</Label>
          <Textarea
            id="nota-observacao"
            rows={2}
            value={form.observacao}
            onChange={(event) => setForm({ ...form, observacao: event.target.value })}
            className="text-xs"
          />
        </div>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end pt-2">
          <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="submit" size="sm" disabled={createMutation.isPending}>
            {createMutation.isPending ? "Salvando..." : "Cadastrar nota"}
          </Button>
        </div>
      </form>
    </Card>
  );
}

function NotasFiscaisList() {
  const { isAdmin, notasFiscais } = useAuth();
  const [q, setQ] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [appliedDateRange, setAppliedDateRange] = useState({ from: "", to: "" });
  const [importOpen, setImportOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const canAccess = isAdmin || notasFiscais.autorizado;
  const canManage = isAdmin || notasFiscais.gerenciar;

  const { data, isLoading, error } = useQuery({
    queryKey: ["notas-fiscais"],
    enabled: canAccess,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notas_fiscais")
        .select(
          "id, identificacao, data, nf, fornecedor, descricao_produto, observacao, equipamento_id, valor, venc01, venc02, venc03, venc04, venc05"
        )
        .order("data", { ascending: false });

      if (error) throw error;
      return (data ?? []) as NotaFiscal[];
    },
  });

  const filtered = useMemo(() => {
    const search = q.trim().toLowerCase();
    if (!data) return [];

    return data.filter(
      (nota) =>
        (!search ||
          [nota.nf, nota.identificacao, nota.fornecedor, nota.descricao_produto, nota.observacao]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(search))) &&
        (!appliedDateRange.from || (nota.data && nota.data >= appliedDateRange.from)) &&
        (!appliedDateRange.to || (nota.data && nota.data <= appliedDateRange.to))
    );
  }, [data, q, appliedDateRange]);

  const totalValue = useMemo(
    () => filtered.reduce((total, nota) => total + (Number(nota.valor) || 0), 0),
    [filtered]
  );

  const averageValue = useMemo(() => {
    if (filtered.length === 0) return 0;
    return totalValue / filtered.length;
  }, [filtered, totalValue]);

  function applyDateFilter() {
    setAppliedDateRange({ from: dateFrom, to: dateTo });
  }

  function clearFilters() {
    setQ("");
    setDateFrom("");
    setDateTo("");
    setAppliedDateRange({ from: "", to: "" });
  }

  if (!canAccess) {
    return (
      <div className="px-3 py-6 md:px-6 max-w-7xl mx-auto w-full">
        <Card className="p-8 text-center bg-white border-slate-200">
          <FileText className="w-10 h-10 text-slate-400 mx-auto mb-2" />
          <p className="font-bold text-slate-800">Acesso Negado</p>
          <p className="text-xs text-slate-500 mt-1">
            Você não possui permissão para acessar o módulo de Notas Fiscais.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="px-3 py-4 md:px-6 md:py-6 max-w-7xl mx-auto w-full space-y-4">
      {/* CABEÇALHO DA PÁGINA */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Controle de Notas Fiscais
          </h1>
          <p className="text-xs text-slate-500">
            Consulte, gerencie e acompanhe os vencimentos fiscais registrados.
          </p>
        </div>
      </div>

      {/* CARDS DE RESUMO (KPIs) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="p-3.5 bg-white border-slate-200 flex items-center gap-3 shadow-sm">
          <div className="p-2.5 bg-slate-100 rounded-lg text-slate-700">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Valor Total Acumulado
            </p>
            <p className="text-lg font-bold text-slate-900">
              {formatCurrency(totalValue)}
            </p>
          </div>
        </Card>

        <Card className="p-3.5 bg-white border-slate-200 flex items-center gap-3 shadow-sm">
          <div className="p-2.5 bg-blue-50 rounded-lg text-blue-600">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Notas Exibidas
            </p>
            <p className="text-lg font-bold text-slate-900">
              {filtered.length} <span className="text-xs font-normal text-slate-500">registro(s)</span>
            </p>
          </div>
        </Card>

        <Card className="p-3.5 bg-white border-slate-200 flex items-center gap-3 shadow-sm">
          <div className="p-2.5 bg-emerald-50 rounded-lg text-emerald-600">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Média por Nota
            </p>
            <p className="text-lg font-bold text-slate-900">
              {formatCurrency(averageValue)}
            </p>
          </div>
        </Card>
      </div>

      {/* BARRA DE FILTROS E AÇÕES */}
      <Card className="p-3 bg-white border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Busca por texto */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Buscar por NF, fornecedor, equipamento ou descrição..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-8 h-9 text-xs bg-slate-50 border-slate-200"
            />
          </div>

          {/* Filtros por Data */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-500 whitespace-nowrap">Emissão:</span>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="h-9 text-xs w-32 bg-slate-50 border-slate-200"
              />
              <span className="text-xs text-slate-400">até</span>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="h-9 text-xs w-32 bg-slate-50 border-slate-200"
              />
            </div>

            <Button type="button" size="sm" className="h-9 text-xs px-3" onClick={applyDateFilter}>
              <SlidersHorizontal className="mr-1.5 h-3.5 w-3.5" />
              Filtrar
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-9 text-xs text-slate-500 hover:bg-slate-100"
              onClick={clearFilters}
            >
              Limpar
            </Button>
          </div>

          {/* Botões do lado direito */}
          <div className="flex items-center gap-2 border-t lg:border-t-0 pt-2 lg:pt-0 border-slate-100">
            <ImportExcelDialog open={importOpen} onOpenChange={setImportOpen} />
            <Button
              type="button"
              size="sm"
              className="h-9 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white"
              disabled={!canManage}
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Nova Nota
            </Button>
          </div>
        </div>
      </Card>

      <NewNotaFiscalDialog open={createOpen} onOpenChange={setCreateOpen} />

      {/* ESTADOS DE CARREGAMENTO / ERRO / VAZIO */}
      {isLoading && (
        <Card className="p-8 text-center bg-white border-slate-200">
          <p className="text-xs text-slate-500">Carregando notas fiscais...</p>
        </Card>
      )}

      {error && (
        <Card className="p-8 text-center bg-white border-red-200">
          <p className="text-xs font-bold text-red-600">Não foi possível carregar as notas fiscais.</p>
          <p className="text-[11px] text-slate-400 mt-1">
            {error instanceof Error ? error.message : "Erro desconhecido"}
          </p>
        </Card>
      )}

      {!isLoading && !error && filtered.length === 0 && (
        <Card className="p-8 text-center bg-white border-slate-200">
          <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="font-bold text-slate-700 text-sm">Nenhuma nota fiscal encontrada</p>
          <p className="text-xs text-slate-500 mt-0.5">
            {q ? "Tente ajustar os termos da sua pesquisa ou datas." : "Nenhum registro encontrado no banco de dados."}
          </p>
        </Card>
      )}

      {/* TABELA CORPORATIVA DE NOTAS FISCAIS */}
      {!isLoading && !error && filtered.length > 0 && (
        <Card className="bg-white border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/80 border-b border-slate-200">
                <TableRow>
                  <TableHead className="text-xs font-bold text-slate-700 py-3">Número NF</TableHead>
                  <TableHead className="text-xs font-bold text-slate-700 py-3">Fornecedor</TableHead>
                  <TableHead className="text-xs font-bold text-slate-700 py-3">Equipamento</TableHead>
                  <TableHead className="text-xs font-bold text-slate-700 py-3">Emissão</TableHead>
                  <TableHead className="text-xs font-bold text-slate-700 py-3">Valor Total</TableHead>
                  <TableHead className="text-xs font-bold text-slate-700 py-3">Parcelas / Vencimentos</TableHead>
                  <TableHead className="text-xs font-bold text-slate-700 py-3 text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((nota) => {
                  const vencimentos = [
                    nota.venc01,
                    nota.venc02,
                    nota.venc03,
                    nota.venc04,
                    nota.venc05,
                  ].filter(Boolean);

                  return (
                    <TableRow key={nota.id} className="hover:bg-slate-50/60 transition-colors border-b border-slate-100">
                      <TableCell className="py-2.5">
                        <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                          <Receipt className="w-3.5 h-3.5 text-slate-400" />
                          NF {nota.nf}
                        </div>
                        {nota.descricao_produto && (
                          <p className="text-[11px] text-slate-500 truncate max-w-[180px] mt-0.5" title={nota.descricao_produto}>
                            {nota.descricao_produto}
                          </p>
                        )}
                      </TableCell>

                      <TableCell className="py-2.5">
                        <div className="text-xs font-medium text-slate-800 flex items-center gap-1">
                          <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate max-w-[150px]">{nota.fornecedor || "—"}</span>
                        </div>
                      </TableCell>

                      <TableCell className="py-2.5">
                        {nota.identificacao ? (
                          <Badge variant="outline" className="bg-slate-50 border-slate-200 text-[10px] font-semibold text-slate-700">
                            <HardDrive className="w-2.5 h-2.5 mr-1 text-slate-400" />
                            {nota.identificacao}
                          </Badge>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </TableCell>

                      <TableCell className="py-2.5 text-xs text-slate-600 font-mono">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          {formatDate(nota.data)}
                        </div>
                      </TableCell>

                      <TableCell className="py-2.5">
                        <span className="font-bold text-xs text-slate-900 font-mono">
                          {formatCurrency(nota.valor)}
                        </span>
                      </TableCell>

                      <TableCell className="py-2.5">
                        {vencimentos.length > 0 ? (
                          <div className="flex items-center gap-1 flex-wrap">
                            {vencimentos.map((venc, idx) => (
                              <span
                                key={idx}
                                className="inline-block text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 rounded font-mono"
                                title={`Parcela ${idx + 1}`}
                              >
                                {formatDate(venc)}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </TableCell>

                      <TableCell className="py-2.5 text-right">
                        <Link to="/notas-fiscais/$id" params={{ id: nota.id }}>
                          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs hover:bg-slate-200/60 text-slate-700">
                            <Eye className="w-3.5 h-3.5 mr-1 text-slate-500" />
                            Detalhes
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* RODAPÉ DE PERMISSÕES */}
      <div className="pt-1">
        {isAdmin && (
          <p className="text-[11px] text-slate-400">
            Sua conta possui acesso administrativo completo para criação, edição e exclusão.
          </p>
        )}
        {!isAdmin && notasFiscais.autorizado && !canManage && (
          <p className="text-[11px] text-slate-400">
            Você está no modo de apenas leitura.
          </p>
        )}
      </div>
    </div>
  );
}
