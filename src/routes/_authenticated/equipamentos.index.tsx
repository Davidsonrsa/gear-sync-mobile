import { useState } from "react";
import { 
  Search, 
  Filter, 
  AlertTriangle, 
  Truck, 
  CheckCircle2, 
  ShieldAlert, 
  LayoutGrid, 
  ListFilter 
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function EquipamentosWebPage() {
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [filtroVencidos, setFiltroVencidos] = useState(false);

  // Exemplo de dados mockados
  const equipamentos = [
    { id: "CARRETINHA", cl: "CL 09", desc: "REBOCAR RC04", placa: "X", local: "PM.IPATINGA", horimetro: "0h", status: "ok" },
    { id: "CB-01", cl: "CL 04", desc: "9BM9580708B596504", placa: "DWS6319", local: "PREF.IPATINGA", horimetro: "307012h", status: "ok" },
    { id: "CB-02", cl: "CL 04", desc: "ATEGO 9BM9580706B507121", placa: "AOL8430", local: "PREF.IPATINGA", horimetro: "289820h", status: "vencido", motivo: "Revisão Vencida" },
  ];

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto bg-slate-50/50 min-h-screen">
      
      {/* 1. Resumo em Indicadores (KPIs) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 flex items-center gap-4 border-l-4 border-l-blue-600 shadow-sm">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Frota</p>
            <h3 className="text-2xl font-bold">126</h3>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-4 border-l-4 border-l-emerald-500 shadow-sm">
          <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Em Dia</p>
            <h3 className="text-2xl font-bold">121</h3>
          </div>
        </Card>

        <Card 
          onClick={() => setFiltroVencidos(!filtroVencidos)}
          className={`p-4 flex items-center gap-4 border-l-4 border-l-red-500 shadow-sm cursor-pointer transition-all ${
            filtroVencidos ? "ring-2 ring-red-500 bg-red-50/30" : "hover:bg-slate-50"
          }`}
        >
          <div className="p-3 bg-red-100 text-red-600 rounded-xl">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Revisão Vencida</p>
            <h3 className="text-2xl font-bold text-red-600">5</h3>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-4 border-l-4 border-l-amber-500 shadow-sm">
          <div className="p-3 bg-amber-100 text-amber-600 rounded-xl">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Seguro a Vencer</p>
            <h3 className="text-2xl font-bold">1</h3>
          </div>
        </Card>
      </div>

      {/* 2. Barra de Controle, Pesquisa e Filtros */}
      <Card className="p-4 shadow-sm space-y-4 md:space-y-0 md:flex md:items-center md:justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar por código, placa, local ou operador..." 
            className="pl-9 bg-background"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button 
            variant={filtroVencidos ? "destructive" : "outline"}
            size="sm"
            onClick={() => setFiltroVencidos(!filtroVencidos)}
            className="gap-2"
          >
            <AlertTriangle className="w-4 h-4" />
            {filtroVencidos ? "Exibindo Vencidos" : "Filtrar Vencidos"}
          </Button>

          <div className="h-6 w-px bg-border hidden md:block" />

          {/* Seletor de Modo de Visualização */}
          <div className="flex items-center bg-muted p-1 rounded-lg">
            <Button
              variant={viewMode === "table" ? "white" : "ghost"}
              size="sm"
              className="h-7 px-2 shadow-none"
              onClick={() => setViewMode("table")}
            >
              <ListFilter className="w-4 h-4 mr-1" /> Tabela
            </Button>
            <Button
              variant={viewMode === "grid" ? "white" : "ghost"}
              size="sm"
              className="h-7 px-2 shadow-none"
              onClick={() => setViewMode("grid")}
            >
              <LayoutGrid className="w-4 h-4 mr-1" /> Cards
            </Button>
          </div>
        </div>
      </Card>

      {/* 3. Exibição dos Dados (Modo Tabela Profissional) */}
      {viewMode === "table" ? (
        <Card className="overflow-hidden shadow-sm border border-slate-200">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-100/70 text-slate-700 font-semibold border-b">
                <tr>
                  <th className="p-4">Equipamento</th>
                  <th className="p-4">CL</th>
                  <th className="p-4">Descrição / Chassi</th>
                  <th className="p-4">Placa</th>
                  <th className="p-4">Localização</th>
                  <th className="p-4">Horímetro</th>
                  <th className="p-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {equipamentos.map((item) => {
                  const isVencido = item.status === "vencido";
                  return (
                    <tr 
                      key={item.id} 
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isVencido ? "animate-pulse border-l-4 border-l-red-500 bg-red-50/20" : ""
                      }`}
                    >
                      <td className="p-4 font-bold text-slate-900">{item.id}</td>
                      <td className="p-4 text-slate-500">{item.cl}</td>
                      <td className="p-4 font-mono text-xs text-slate-600">{item.desc}</td>
                      <td className="p-4 font-semibold text-slate-700">{item.placa}</td>
                      <td className="p-4 text-slate-600">{item.local}</td>
                      <td className="p-4 font-mono font-bold text-slate-800">{item.horimetro}</td>
                      <td className="p-4">
                        {isVencido ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-200">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            {item.motivo}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Em Dia
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        /* Modo Grid (Cards) Ajustado para Telas Lojas */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {equipamentos.map((item) => {
            const isVencido = item.status === "vencido";
            return (
              <Card 
                key={item.id}
                className={`p-4 transition-all ${
                  isVencido 
                    ? "border-2 border-red-500 animate-pulse shadow-lg shadow-red-100" 
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-bold text-base">{item.id}</h4>
                    <span className="text-xs text-slate-400">{item.cl}</span>
                  </div>
                  {isVencido && (
                    <span className="text-xs px-2 py-0.5 rounded bg-red-100 text-red-600 font-semibold">
                      Vencido
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 font-mono mb-3">{item.desc}</p>
                <div className="flex justify-between items-center text-xs pt-2 border-t text-slate-600">
                  <span>{item.local}</span>
                  <span className="font-bold font-mono text-sm">{item.horimetro}</span>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
