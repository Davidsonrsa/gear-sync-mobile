import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client"; // ajuste o caminho do cliente se necessário

export default function CotacoesIndex() {
  const [cotacoes, setCotacoes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCotacoes();
  }, []);

  async function fetchCotacoes() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("cotacoes")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      setCotacoes(data || []);
    } catch (error) {
      console.error("Erro ao buscar cotações:", error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Gerenciamento de Cotações</h1>
        <button className="bg-primary text-white px-4 py-2 rounded-lg font-semibold hover:opacity-90">
          Nova Cotação
        </button>
      </div>

      {loading ? (
        <p className="text-slate-600">Carregando cotações...</p>
      ) : cotacoes.length === 0 ? (
        <div className="bg-white p-8 rounded-xl shadow-sm text-center border border-slate-200">
          <p className="text-slate-500">Nenhuma cotação cadastrada até o momento.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-200">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 text-sm">
                <th className="p-4">Número</th>
                <th className="p-4">Data</th>
                <th className="p-4">Equipamento / Patrimônio</th>
                <th className="p-4">Setor</th>
                <th className="p-4">Ações</th>
              </tr>
            </thead>
            <tbody>
              {cotacoes.map((cotacao) => (
                <tr key={cotacao.id} className="border-b border-slate-100 hover:bg-slate-50 text-sm">
                  <td className="p-4 font-medium text-slate-800">{cotacao.numero || "N/A"}</td>
                  <td className="p-4 text-slate-600">{cotacao.data_cotacao || "N/A"}</td>
                  <td className="p-4 text-slate-600">{cotacao.patrimonio || cotacao.equipamento_id || "N/A"}</td>
                  <td className="p-4 text-slate-600">{cotacao.setor || "N/A"}</td>
                  <td className="p-4">
                    <button className="text-blue-600 hover:underline font-medium">Ver Detalhes</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
