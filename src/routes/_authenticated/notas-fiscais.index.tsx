import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, FileText, Plus } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { ImportExcelDialog } from "@/components/ImportExcelDialog";

export const Route = createFileRoute("/_authenticated/notas-fiscais/")({
  component: NotasFiscaisList,
});

type NotaFiscal = {
  id: string;
  identificacao: string | null;
  data: string | null;
  nf: string;
  fornecedor: string | null;
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

function NotasFiscaisList() {
  const { isAdmin, notasFiscais } = useAuth();
  const [q, setQ] = useState("");
  const [importOpen, setImportOpen] = useState(false);

  // Verificar autorização
  const canAccess = isAdmin || notasFiscais.autorizado;
  const canManage = isAdmin || notasFiscais.gerenciar;

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

  const { data, isLoading, error } = useQuery({
    queryKey: ["notas-fiscais"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notas_fiscais")
        .select(
          "id, identificacao, data, nf, fornecedor, observacao, equipamento_id, valor, venc01, venc02, venc03, venc04, venc05",
        )
        .order("data", { ascending: false });

      if (error) throw error;

      return (data ?? []) as NotaFiscal[];
    },
  });

  const filtered = useMemo(() => {
    const search = q.trim().toLowerCase();

    if (!data) return [];

    if (!search) return data;

    return data.filter((nota) =>
      [
        nota.nf,
        nota.identificacao,
        nota.fornecedor,
        nota.observacao,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(search)),
    );
  }, [data, q]);

  return (
    <div className="px-3 py-3 md:px-6 md:py-6 max-w-md md:max-w-7xl mx-auto w-full">
      <div className="sticky top-[60px] md:top-[76px] z-20 -mx-3 px-3 md:-mx-6 md:px-6 py-2 bg-background/85 backdrop-blur space-y-2 md:space-y-0 md:flex md:items-center md:gap-3">
        <div className="relative md:flex-1 md:max-w-lg">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar NF, fornecedor, identificação..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-9 h-11"
          />
        </div>

        <div className="flex gap-2 flex-wrap md:flex-nowrap">
          <ImportExcelDialog open={importOpen} onOpenChange={setImportOpen} />
          <Button type="button" className="h-9 md:shrink-0" disabled={!canManage}>
            <Plus className="w-4 h-4 mr-2" />
            Nova Nota Fiscal
          </Button>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Controle de Notas Fiscais</h2>
          <p className="text-sm text-muted-foreground">
            Consulte e gerencie as notas fiscais autorizadas.
          </p>
        </div>

        {!isLoading && (
          <Badge variant="secondary">
            {filtered.length} {filtered.length === 1 ? "nota" : "notas"}
          </Badge>
        )}
      </div>

      {isLoading && (
        <Card className="p-8 text-center mt-4">
          <p className="text-sm text-muted-foreground">
            Carregando notas fiscais...
          </p>
        </Card>
      )}

      {error && (
        <Card className="p-8 text-center mt-4 border-destructive">
          <p className="text-sm text-destructive">
            Não foi possível carregar as notas fiscais.
          </p>
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
                    <span className="font-bold text-primary">
                      NF {nota.nf}
                    </span>

                    {nota.fornecedor && (
                      <Badge variant="secondary">
                        {nota.fornecedor}
                      </Badge>
                    )}
                  </div>

                  {nota.identificacao && (
                    <p className="text-sm mt-1 truncate">
                      {nota.identificacao}
                    </p>
                  )}

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3 text-xs text-muted-foreground">
                    <div>
                      <span className="block">Data</span>
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
                  </div>
                </div>

                <Link to={`/notas-fiscais/${nota.id}`} className="shrink-0">
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
