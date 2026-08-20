import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Search, FileText, Plus, SlidersHorizontal } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { ImportExcelDialog } from "@/components/ImportExcelDialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

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
  if (value == null) return "—";

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
    <Card className="mt-4 border-primary/20 p-4 shadow-sm sm:p-6">
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Nova Nota Fiscal</h2>
        <p className="text-sm text-muted-foreground">
          Preencha os dados principais da nota fiscal.
        </p>
      </div>
      <form
        className="grid gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          createMutation.mutate();
        }}
      >
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="nota-nf">Número da NF *</Label>
            <Input
              id="nota-nf"
              required
              value={form.nf}
              onChange={(event) => setForm({ ...form, nf: event.target.value })}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="nota-data">Data de Emissão</Label>
            <Input
              id="nota-data"
              type="date"
              value={form.data}
              onChange={(event) => setForm({ ...form, data: event.target.value })}
            />
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="nota-fornecedor">Fornecedor</Label>
            <Input
              id="nota-fornecedor"
              value={form.fornecedor}
              onChange={(event) => setForm({ ...form, fornecedor: event.target.value })}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="nota-identificacao">Identificação</Label>
            <Input
              id="nota-identificacao"
              value={form.identificacao}
              onChange={(event) => setForm({ ...form, identificacao: event.target.value })}
            />
          </div>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="nota-descricao-produto">Descrição dos Produtos</Label>
          <Textarea
            id="nota-descricao-produto"
            value={form.descricao_produto}
            onChange={(event) => setForm({ ...form, descricao_produto: event.target.value })}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="nota-valor">Valor</Label>
          <Input
            id="nota-valor"
            inputMode="decimal"
            placeholder="0,00"
            value={form.valor}
            onChange={(event) => setForm({ ...form, valor: event.target.value })}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="nota-observacao">Observação</Label>
          <Textarea
            id="nota-observacao"
            value={form.observacao}
            onChange={(event) => setForm({ ...form, observacao: event.target.value })}
          />
        </div>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="submit" disabled={createMutation.isPending}>
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
          "id, identificacao, data, nf, fornecedor, descricao_produto, observacao, equipamento_id, valor, venc01, venc02, venc03, venc04, venc05",
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
        (!appliedDateRange.to || (nota.data && nota.data <= appliedDateRange.to)),
    );
  }, [data, q, appliedDateRange]);

  const totalValue = useMemo(
    () => filtered.reduce((total, nota) => total + (Number(nota.valor) || 0), 0),
    [filtered],
  );

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
      <div className="px-3 py-6 md:px-6 max-w-md md:max-w-7xl mx-auto w-full">
        <Card className="p-8 text-center">
          <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
          <p className="font-medium">Acesso Negado</p>
          <p className="text-sm text-muted-foreground mt-2">
            Você não possui permissão para acessar o módulo de Notas Fiscais.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="px-3 py-3 md:px-6 md:py-6 max-w-md md:max-w-7xl mx-auto w-full">
      <div className="sticky top-[60px] md:top-[76px] z-20 -mx-3 px-3 md:-mx-6 md:px-6 py-2 bg-background/95 backdrop-blur space-y-3 md:grid md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-end md:gap-3">
        <div className="relative min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar NF, fornecedor, identificação ou descrição..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-9 h-11"
          />
        </div>

        <div className="flex flex-wrap items-end gap-2">
          <div className="grid gap-1">
            <Label htmlFor="notas-data-de" className="text-xs">
              Data de Emissão: De
            </Label>
            <Input
              id="notas-data-de"
              type="date"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
              className="h-9 w-full md:w-36"
            />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="notas-data-ate" className="text-xs">
              Até
            </Label>
            <Input
              id="notas-data-ate"
              type="date"
              value={dateTo}
              onChange={(event) => setDateTo(event.target.value)}
              className="h-9 w-full md:w-36"
            />
          </div>
          <Button type="button" className="h-9" onClick={applyDateFilter}>
            <SlidersHorizontal className="mr-2 h-4 w-4" />
            Filtrar
          </Button>
          <Button type="button" variant="outline" className="h-9" onClick={clearFilters}>
            Limpar filtros
          </Button>
        </div>

        <div className="flex gap-2 flex-wrap md:flex-nowrap">
          <ImportExcelDialog open={importOpen} onOpenChange={setImportOpen} />
          <Button
            type="button"
            className="h-9 md:shrink-0"
            disabled={!canManage}
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Nova Nota Fiscal
          </Button>
        </div>
      </div>

      <NewNotaFiscalDialog open={createOpen} onOpenChange={setCreateOpen} />

      <div className="mt-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Controle de Notas Fiscais</h2>
          <p className="text-sm text-muted-foreground">
            Consulte e gerencie as notas fiscais autorizadas.
          </p>
        </div>

        {!isLoading && (
          <Badge variant="secondary">
            {filtered.length} {filtered.length === 1 ? "nota" : "notas"} | Total:{" "}
            {formatCurrency(totalValue)}
          </Badge>
        )}
      </div>

      {isLoading && (
        <Card className="p-8 text-center mt-4">
          <p className="text-sm text-muted-foreground">Carregando notas fiscais...</p>
        </Card>
      )}

      {error && (
        <Card className="p-8 text-center mt-4 border-destructive">
          <p className="text-sm text-destructive">Não foi possível carregar as notas fiscais.</p>
          <p className="text-xs text-muted-foreground mt-2">
            {error instanceof Error ? error.message : "Erro desconhecido"}
          </p>
        </Card>
      )}

      {!isLoading && !error && filtered.length === 0 && (
        <Card className="p-8 text-center mt-4">
          <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-2" />

          <p className="font-medium">Nenhuma nota fiscal encontrada.</p>

          <p className="text-sm text-muted-foreground mt-1">
            {q
              ? "Tente alterar os termos da busca."
              : "Ainda não existem notas fiscais cadastradas."}
          </p>
        </Card>
      )}

      {!isLoading && !error && filtered.length > 0 && (
        <div className="mt-4 space-y-2">
          {filtered.map((nota) => (
            <Card key={nota.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-primary">NF {nota.nf}</span>

                    {nota.fornecedor && <Badge variant="secondary">{nota.fornecedor}</Badge>}
                  </div>

                  {nota.identificacao && (
                    <p className="text-sm mt-1 truncate">Equipamento: {nota.identificacao}</p>
                  )}

                  {nota.descricao_produto && (
                    <p className="text-sm mt-1 truncate">Descrição: {nota.descricao_produto}</p>
                  )}

<div className="mt-3 text-xs text-muted-foreground">

  {/* DATA E VALOR */}
  <div className="grid grid-cols-2 gap-2 mb-3">
    <div>
      <span className="block">Data de Emissão</span>
      <strong className="text-foreground">
        {formatDate(nota.data)}
      </strong>
    </div>

    <div>
      <span className="block">Valor</span>
      <strong className="text-foreground">
        {formatCurrency(nota.valor)}
      </strong>
    </div>
  </div>

  {/* VENCIMENTOS */}
  <div className="border-t pt-3">
    <span className="block mb-2 font-medium text-foreground">
      Vencimentos
    </span>

    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">

      <div>
        <span className="block">Venc. 01</span>
        <strong className="text-foreground">
          {formatDate(nota.venc01)}
        </strong>
      </div>

      <div>
        <span className="block">Venc. 02</span>
        <strong className="text-foreground">
          {formatDate(nota.venc02)}
        </strong>
      </div>

      <div>
        <span className="block">Venc. 03</span>
        <strong className="text-foreground">
          {formatDate(nota.venc03)}
        </strong>
      </div>

      <div>
        <span className="block">Venc. 04</span>
        <strong className="text-foreground">
          {formatDate(nota.venc04)}
        </strong>
      </div>

      <div>
        <span className="block">Venc. 05</span>
        <strong className="text-foreground">
          {formatDate(nota.venc05)}
        </strong>
      </div>

    </div>
  </div>

</div>
                
                  <Link to="/notas-fiscais/$id" params={{ id: nota.id }} className="shrink-0">
                  <Button variant="outline" size="sm">
                    Visualizar
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}

      {isAdmin && (
        <p className="text-xs text-muted-foreground mt-4">
          Administrador: Todas as notas fiscais e gerenciamento estão habilitados.
        </p>
      )}
      {!isAdmin && notasFiscais.autorizado && !canManage && (
        <p className="text-xs text-muted-foreground mt-4">
          Você tem permissão apenas para visualizar notas fiscais.
        </p>
      )}
    </div>
  );
}
