import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer } from "lucide-react";
import logo from "@/assets/logo-sph.jpg.asset.json";

export const Route = createFileRoute("/_authenticated/equipamentos/$id/manutencao")({
  component: ManutencaoPage,
});

type Atividade = { sistema: string; item: string; acao: string; pm: "P" | "M" };
const ATIVIDADES: Atividade[] = [
  { sistema: "Motor", item: "Óleo Motor", acao: "Substituir", pm: "P" },
  { sistema: "Motor", item: "Filtro Lubrificante", acao: "Substituir", pm: "P" },
  { sistema: "Motor", item: "Filtro de Ar primário", acao: "Substituir", pm: "P" },
  { sistema: "Motor", item: "Filtro de Ar secundário", acao: "Substituir", pm: "P" },
  { sistema: "Motor", item: "Indicador de Restrição", acao: "Inspecionar", pm: "M" },
  { sistema: "Motor", item: "Radiador", acao: "Limpar", pm: "M" },
  { sistema: "Motor", item: "Filtro Separador de água", acao: "Substituir", pm: "P" },
  { sistema: "Motor", item: "Correias", acao: "Inspecionar", pm: "M" },
  { sistema: "Motor", item: "Vazamentos", acao: "Inspecionar", pm: "M" },
  { sistema: "Motor", item: "Sistema de Escape", acao: "Inspecionar", pm: "M" },
  { sistema: "Motor", item: "Fixação e Coxins", acao: "Inspecionar", pm: "M" },
  { sistema: "Combustível", item: "Filtros primário", acao: "Substituir", pm: "P" },
  { sistema: "Combustível", item: "Tubulação", acao: "Inspecionar", pm: "M" },
  { sistema: "Combustível", item: "Aceleração e Parada", acao: "Inspecionar", pm: "M" },
  { sistema: "Combustível", item: "Rotação", acao: "Inspecionar", pm: "M" },
  { sistema: "Transmissão", item: "Óleo", acao: "Substituir", pm: "P" },
  { sistema: "Transmissão", item: "Filtro", acao: "Substituir", pm: "P" },
  { sistema: "Transmissão", item: "Respiro", acao: "Substituir", pm: "P" },
  { sistema: "Hidráulico", item: "Óleo", acao: "Substituir", pm: "P" },
  { sistema: "Hidráulico", item: "Filtro", acao: "Substituir", pm: "P" },
  { sistema: "Hidráulico", item: "Pressões", acao: "Ajustar", pm: "M" },
  { sistema: "Vazamentos", item: "Bomba", acao: "Inspecionar", pm: "M" },
  { sistema: "Vazamentos", item: "Comandos", acao: "Inspecionar", pm: "M" },
  { sistema: "Vazamentos", item: "Mangueiras", acao: "Inspecionar", pm: "M" },
  { sistema: "Eletricidade", item: "Faróis", acao: "Inspecionar", pm: "M" },
  { sistema: "Eletricidade", item: "Bateria", acao: "Inspecionar", pm: "M" },
  { sistema: "Eletricidade", item: "Painel", acao: "Inspecionar", pm: "M" },
  { sistema: "Estrutura", item: "Pneus / Rodas", acao: "Inspecionar", pm: "M" },
  { sistema: "Estrutura", item: "Parafusos / Fixações", acao: "Apertar", pm: "M" },
  { sistema: "Estrutura", item: "Lubrificação geral (graxa)", acao: "Lubrificar", pm: "P" },
];

function ManutencaoPage() {
  const { id } = Route.useParams();
  const { data: e } = useQuery({
    queryKey: ["equipamento", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("equipamentos").select("*").eq("id", id).single();
      if (error) throw error;
      return data;
    },
  });

  if (!e) return <div className="p-6 text-center text-muted-foreground">Carregando...</div>;

  return (
    <div className="bg-white text-black min-h-screen">
      <div className="no-print sticky top-0 z-30 bg-background border-b px-3 py-2 flex items-center justify-between">
        <Link to="/equipamentos/$id" params={{ id }}>
          <Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4 mr-1" /> Voltar</Button>
        </Link>
        <Button onClick={() => window.print()} size="sm">
          <Printer className="w-4 h-4 mr-2" /> Imprimir
        </Button>
      </div>

      <div className="max-w-[210mm] mx-auto p-6 print:p-4 text-[12px]">
        <div className="flex items-center gap-4 border-b-2 border-black pb-3 mb-4">
          <img src={logo.url} alt="" className="w-16 h-16 object-contain" />
          <div className="flex-1">
            <h1 className="text-lg font-bold">PLANO DE MANUTENÇÃO PREVENTIVA</h1>
            <p className="text-[11px]">SPH JHM Mafra — Relatório de manutenção</p>
          </div>
          <div className="text-right text-[11px]">
            <p><b>Data:</b> ____/____/______</p>
            <p><b>Revisão:</b> ______ horas</p>
          </div>
        </div>

        <table className="w-full text-[11px] border border-black mb-3">
          <tbody>
            <tr>
              <td className="border border-black px-2 py-1 w-1/4 bg-gray-100"><b>Equipamento</b></td>
              <td className="border border-black px-2 py-1">{e.numero} — {e.identificacao ?? ""}</td>
              <td className="border border-black px-2 py-1 w-1/4 bg-gray-100"><b>Modelo</b></td>
              <td className="border border-black px-2 py-1">{e.modelo ?? ""}</td>
            </tr>
            <tr>
              <td className="border border-black px-2 py-1 bg-gray-100"><b>Placa</b></td>
              <td className="border border-black px-2 py-1">{e.placa ?? ""}</td>
              <td className="border border-black px-2 py-1 bg-gray-100"><b>Ano</b></td>
              <td className="border border-black px-2 py-1">{e.ano ?? ""}</td>
            </tr>
            <tr>
              <td className="border border-black px-2 py-1 bg-gray-100"><b>Horímetro atual</b></td>
              <td className="border border-black px-2 py-1">{e.horimetro_atual ?? ""} h</td>
              <td className="border border-black px-2 py-1 bg-gray-100"><b>Última revisão</b></td>
              <td className="border border-black px-2 py-1">{e.h_revisao ?? ""} h</td>
            </tr>
            <tr>
              <td className="border border-black px-2 py-1 bg-gray-100"><b>Localização</b></td>
              <td className="border border-black px-2 py-1">{e.localizacao ?? ""}</td>
              <td className="border border-black px-2 py-1 bg-gray-100"><b>Operador</b></td>
              <td className="border border-black px-2 py-1">{e.operador_contato ?? ""}</td>
            </tr>
          </tbody>
        </table>

        <h2 className="font-bold text-sm mb-1">Filtros e Lubrificantes</h2>
        <table className="w-full text-[11px] border border-black mb-3">
          <tbody>
            {[
              ["Óleo motor", e.motor_oleo, "Óleo hidráulico", e.hidraulico_oleo],
              ["Óleo transmissão", e.transmissao_oleo, "Óleo eixo", e.eixo_oleo],
              ["Óleo tandem", e.tandem_oleo, "Filtro lubrificante", e.filtro_lub],
              ["Diesel primário", e.filtro_diesel_p, "Diesel secundário", e.filtro_diesel_s],
              ["Separador água", e.filtro_sep_agua, "Ar externo", e.filtro_ar_ext],
              ["Ar interno", e.filtro_ar_int, "Filtro transmissão", e.filtro_trans],
              ["Filtro hidráulico", e.filtro_hidr, "Respiro", e.filtro_respiro],
              ["Ar cond. 1", e.filtro_ar_cond1, "Ar cond. 2", e.filtro_ar_cond2],
            ].map((row, i) => (
              <tr key={i}>
                <td className="border border-black px-2 py-1 bg-gray-100 w-1/4"><b>{row[0]}</b></td>
                <td className="border border-black px-2 py-1">{row[1] ?? ""}</td>
                <td className="border border-black px-2 py-1 bg-gray-100 w-1/4"><b>{row[2]}</b></td>
                <td className="border border-black px-2 py-1">{row[3] ?? ""}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h2 className="font-bold text-sm mb-1">Atividades de Manutenção Preventiva</h2>
        <p className="text-[10px] mb-1">P = Peças · M = Mão de obra</p>
        <table className="w-full text-[11px] border border-black mb-4">
          <thead>
            <tr className="bg-gray-200">
              <th className="border border-black px-2 py-1 text-left">Sistema</th>
              <th className="border border-black px-2 py-1 text-left">Item</th>
              <th className="border border-black px-2 py-1 text-left">Ação</th>
              <th className="border border-black px-2 py-1 w-10">P/M</th>
              <th className="border border-black px-2 py-1 w-12">Qtd</th>
              <th className="border border-black px-2 py-1 w-20">Status</th>
            </tr>
          </thead>
          <tbody>
            {ATIVIDADES.map((a, i) => (
              <tr key={i}>
                <td className="border border-black px-2 py-1">{a.sistema}</td>
                <td className="border border-black px-2 py-1">{a.item}</td>
                <td className="border border-black px-2 py-1">{a.acao}</td>
                <td className="border border-black px-2 py-1 text-center">{a.pm}</td>
                <td className="border border-black px-2 py-1"></td>
                <td className="border border-black px-2 py-1"></td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mb-4">
          <p className="font-bold text-sm mb-1">Observações:</p>
          <div className="border border-black h-20"></div>
        </div>

        <div className="grid grid-cols-2 gap-6 mt-10">
          <div className="text-center">
            <div className="border-t border-black pt-1"><b>Mecânico responsável</b></div>
          </div>
          <div className="text-center">
            <div className="border-t border-black pt-1"><b>Supervisor</b></div>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          @page { size: A4; margin: 10mm; }
          body { background: white !important; }
        }
      `}</style>
    </div>
  );
}
