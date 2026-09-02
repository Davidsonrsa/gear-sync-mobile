import { useState, useMemo, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Printer, Save, Plus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/custos/")({
  component: MedicoesCustosPage,
});

interface MedicaoDiaRow {
  dia: number;
  data: string;
  diaSemana: string;
  manhaInicio: string;
  manhaFinal: string;
  tardeInicio: string;
  tardeFinal: string;
  observacao: string;
}

function MedicoesCustosPage() {
  const [contratos, setContratos] = useState<any[]>([]);
  const [contratoSelecionado, setContratoSelecionado] = useState<string>("");
  const [equipamentoSelecionado, setEquipamentoSelecionado] = useState<string>("RE 21");
  const [novoEquipamento, setNovoEquipamento] = useState<string>("");
  const [listaEquipamentos, setListaEquipamentos] = useState<string[]>(["RE 21", "RE 53", "TA 02", "TE", "CB 03", "RC 07"]);
  
  const [mesSelecionado, setMesSelecionado] = useState<string>("2026-08");
  const [operador, setOperador] = useState<string>("LUIZ");
  const [contratante, setContratante] = useState<string>("PREFEITURA MUNICIPAL DE NOVA SERRANA");
  const [valorHora, setValorHora] = useState<number>(193.62);

  const [diasMedicao, setDiasMedicao] = useState<MedicaoDiaRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [mensagem, setMensagem] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetchContratos();
  }, []);

  useEffect(() => {
    if (!mesSelecionado) return;
    const [ano, mes] = mesSelecionado.split("-").map(Number);
    const totalDias = new Date(ano, mes, 0).getDate();
    
    const diasArray: MedicaoDiaRow[] = [];
    const nomesDias = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];

    for (let d = 1; d <= totalDias; d++) {
      const dataObj = new Date(ano, mes - 1, d);
      const dataStr = dataObj.toISOString().split("T")[0];
      diasArray.push({
        dia: d,
        data: dataStr,
        diaSemana: nomesDias[dataObj.getDay()],
        manhaInicio: "",
        manhaFinal: "",
        tardeInicio: "",
        tardeFinal: "",
        observacao: "",
      });
    }
    setDiasMedicao(diasArray);
    carregarMedicoesSalvas(contratoSelecionado, equipamentoSelecionado, mesSelecionado);
  }, [mesSelecionado, equipamentoSelecionado, contratoSelecionado]);

  async function fetchContratos() {
    try {
      const { data, error } = await supabase.from("contratos").select("*");
      if (error) throw error;
      if (data && data.length > 0) {
        setContratos(data);
        setContratoSelecionado(data[0].nome_contrato || data[0].nome || "");
      }
    } catch (err) {
      console.error("Erro ao buscar contratos:", err);
    }
  }

  async function carregarMedicoesSalvas(contrato: string, equipamento: string, mes: string) {
    if (!contrato || !equipamento || !mes) return;
    try {
      const { data, error } = await supabase
        .from("medicoes_diarias")
        .select("*")
        .eq("contrato", contrato)
        .eq("equipamento", equipamento)
        .gte("data", `${mes}-01`)
        .lte("data", `${mes}-31`);

      if (error) throw error;

      if (data && data.length > 0) {
        setDiasMedicao((prev) =>
          prev.map((item) => {
            const encontrado = data.find((d: any) => d.data === item.data);
            if (encontrado) {
              return {
                ...item,
                manhaInicio: encontrado.manha_inicio || "",
                manhaFinal: encontrado.manha_final || "",
                tardeInicio: encontrado.tarde_inicio || "",
                tardeFinal: encontrado.tarde_final || "",
                observacao: encontrado.observacao || "",
              };
            }
            return item;
          })
        );
        if (data[0].operador) setOperador(data[0].operador);
        if (data[0].valor_hora) setValorHora(Number(data[0].valor_hora));
      }
    } catch (err) {
      console.error("Erro ao carregar medições salvas:", err);
    }
  }

  const calcularHoras = (inicio: string, fim: string) => {
    if (!inicio || !fim) return 0;
    const [hi, mi] = inicio.split(":").map(Number);
    const [hf, mf] = fim.split(":").map(Number);
    const totalMinutos = (hf * 60 + mf) - (hi * 60 + mi);
    return totalMinutos > 0 ? totalMinutos / 60 : 0;
  };

  const diasComCalculos = useMemo(() => {
    return diasMedicao.map((item) => {
      const subManha = calcularHoras(item.manhaInicio, item.manhaFinal);
      const subTarde = calcularHoras(item.tardeInicio, item.tardeFinal);
      const totalHorasDia = subManha + subTarde;
      const valorDia = totalHorasDia * valorHora;
      return {
        ...item,
        subManha,
        subTarde,
        totalHorasDia,
        valorDia,
      };
    });
  }, [diasMedicao, valorHora]);

  const totalGeralHoras = useMemo(() => {
    return diasComCalculos.reduce((acc, curr) => acc + curr.totalHorasDia, 0);
  }, [diasComCalculos]);

  const totalGeralValor = useMemo(() => {
    return totalGeralHoras * valorHora;
  }, [totalGeralHoras, valorHora]);

  async function handleSalvarMedicoes() {
    setSaving(true);
    setMensagem(null);
    try {
      await supabase
        .from("medicoes_diarias")
        .delete()
        .eq("contrato", contratoSelecionado)
        .eq("equipamento", equipamentoSelecionado)
        .gte("data", `${mesSelecionado}-01`)
        .lte("data", `${mesSelecionado}-31`);

      const payload = diasComCalculos
        .filter((d) => d.manhaInicio || d.manhaFinal || d.tardeInicio || d.tardeFinal || d.observacao)
        .map((d) => ({
          contrato: contratoSelecionado,
          equipamento: equipamentoSelecionado,
          operador: operador,
          data: d.data,
          manha_inicio: d.manhaInicio || null,
          manha_final: d.manhaFinal || null,
          tarde_inicio: d.tardeInicio || null,
          tarde_final: d.tardeFinal || null,
          valor_hora: valorHora,
          observacao: d.observacao || null,
        }));

      if (payload.length > 0) {
        const { error } = await supabase.from("medicoes_diarias").insert(payload);
        if (error) throw error;
      }

      setMensagem({ type: "success", text: "Medições salvas com sucesso!" });
    } catch (err: any) {
      console.error("Erro ao salvar medições:", err);
      setMensagem({ type: "error", text: "Erro ao salvar no banco de dados." });
    } finally {
      setSaving(false);
    }
  }

  const handleImprimir = () => {
    window.print();
  };

  const atualizarDia = (index: number, campo: keyof MedicaoDiaRow, valor: string) => {
    setDiasMedicao((prev) => {
      const copia = [...prev];
      copia[index] = { ...copia[index], [campo]: valor };
      return copia;
    });
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Resumo de Medição Diária</h1>
          <p className="text-sm text-muted-foreground">
            Controle mensal por equipamento, cálculo automático de horas e valores.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={handleImprimir} variant="outline" className="flex items-center gap-2">
            <Printer className="w-4 h-4" /> Imprimir Relatório
          </Button>
          <Button onClick={handleSalvarMedicoes} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2">
            <Save className="w-4 h-4" /> {saving ? "Salvando..." : "Salvar Medição"}
          </Button>
        </div>
      </div>

      {mensagem && (
        <div className={`p-3 rounded-md text-sm print:hidden ${mensagem.type === "success" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
          {mensagem.text}
        </div>
      )}

      <Card className="bg-white shadow-sm print:hidden">
        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-1">
            <Label className="text-xs font-semibold">Contrato</Label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={contratoSelecionado}
              onChange={(e) => setContratoSelecionado(e.target.value)}
            >
              {contratos.map((c, idx) => (
                <option key={idx} value={c.nome_contrato || c.nome}>
                  {c.nome_contrato || c.nome}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-semibold">Mês de Referência</Label>
            <Input
              type="month"
              value={mesSelecionado}
              onChange={(e) => setMesSelecionado(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-semibold">Equipamento</Label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={equipamentoSelecionado}
              onChange={(e) => setEquipamentoSelecionado(e.target.value)}
            >
              {listaEquipamentos.map((eq, i) => (
                <option key={i} value={eq}>{eq}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-semibold">Novo Equipamento</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Ex: PC 03"
                value={novoEquipamento}
                onChange={(e) => setNovoEquipamento(e.target.value)}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (novoEquipamento.trim() && !listaEquipamentos.includes(novoEquipamento.trim())) {
                    setListaEquipamentos([...listaEquipamentos, novoEquipamento.trim()]);
                    setEquipamentoSelecionado(novoEquipamento.trim());
                    setNovoEquipamento("");
                  }
                }}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="bg-white p-6 rounded-lg shadow-sm border text-slate-900 print:shadow-none print:border-none print:p-0">
        <div className="border-2 border-slate-800 p-4 mb-4 space-y-3">
          <div className="flex justify-between items-center border-b border-slate-800 pb-2">
            <span className="font-extrabold text-lg tracking-wider">SPH - GESTÃO INTEGRADA</span>
            <span className="font-bold text-sm uppercase">RESUMO DA MEDIÇÃO</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
            <div>
              <span className="font-semibold">CONTRATANTE:</span>{" "}
              <input
                className="border-b border-dashed border-slate-400 bg-transparent px-1 w-full md:w-auto"
                value={contratante}
                onChange={(e) => setContratante(e.target.value)}
              />
            </div>
            <div>
              <span className="font-semibold">CONTRATO:</span> {contratoSelecionado}
            </div>
            <div>
              <span className="font-semibold">EQUIPAMENTO:</span>{" "}
              <span className="font-bold text-emerald-700">{equipamentoSelecionado}</span>
            </div>
            <div className="md:col-span-2">
              <span className="font-semibold">OPERADOR:</span>{" "}
              <input
                className="border-b border-dashed border-slate-400 bg-transparent px-1 w-48 uppercase font-medium"
                value={operador}
                onChange={(e) => setOperador(e.target.value)}
              />
            </div>
            <div>
              <span className="font-semibold">VALOR HORA (R$):</span>{" "}
              <input
                type="number"
                step="0.01"
                className="border rounded px-2 py-1 w-32 font-semibold text-emerald-700"
                value={valorHora}
                onChange={(e) => setValorHora(parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-slate-400 text-xs text-center">
            <thead>
              <tr className="bg-slate-200 text-slate-900 font-bold">
                <th className="border border-slate-400 p-2" rowSpan={2}>Data</th>
                <th className="border border-slate-400 p-2" rowSpan={2}>Dia</th>
                <th className="border border-slate-400 p-2" colSpan={3}>MANHÃ</th>
                <th className="border border-slate-400 p-2" colSpan={3}>TARDE</th>
                <th className="border border-slate-400 p-2" rowSpan={2}>TOTAL HORAS</th>
                <th className="border border-slate-400 p-2" rowSpan={2}>VALOR TOTAL (R$)</th>
                <th className="border border-slate-400 p-2" rowSpan={2}>OBSERVAÇÃO</th>
              </tr>
              <tr className="bg-slate-100 text-slate-800 font-semibold">
                <th className="border border-slate-400 p-1">Início</th>
                <th className="border border-slate-400 p-1">Final</th>
                <th className="border border-slate-400 p-1">Sub Total</th>
                <th className="border border-slate-400 p-1">Início</th>
                <th className="border border-slate-400 p-1">Final</th>
                <th className="border border-slate-400 p-1">Sub Total</th>
              </tr>
            </thead>
            <tbody>
              {diasComCalculos.map((row, index) => (
                <tr key={index} className="hover:bg-slate-50">
                  <td className="border border-slate-400 p-1 font-medium whitespace-nowrap">
                    {row.data.split("-").reverse().join("/")}
                  </td>
                  <td className="border border-slate-400 p-1 capitalize text-slate-600">{row.diaSemana}</td>
                  
                  <td className="border border-slate-400 p-1">
                    <input
                      type="time"
                      className="w-full text-center bg-transparent print:border-none"
                      value={row.manhaInicio}
                      onChange={(e) => atualizarDia(index, "manhaInicio", e.target.value)}
                    />
                  </td>
                  <td className="border border-slate-400 p-1">
                    <input
                      type="time"
                      className="w-full text-center bg-transparent print:border-none"
                      value={row.manhaFinal}
                      onChange={(e) => atualizarDia(index, "manhaFinal", e.target.value)}
                    />
                  </td>
                  <td className="border border-slate-400 p-1 font-mono">
                    {row.subManha > 0 ? row.subManha.toFixed(2) : "0"}
                  </td>

                  <td className="border border-slate-400 p-1">
                    <input
                      type="time"
                      className="w-full text-center bg-transparent print:border-none"
                      value={row.tardeInicio}
                      onChange={(e) => atualizarDia(index, "tardeInicio", e.target.value)}
                    />
                  </td>
                  <td className="border border-slate-400 p-1">
                    <input
                      type="time"
                      className="w-full text-center bg-transparent print:border-none"
                      value={row.tardeFinal}
                      onChange={(e) => atualizarDia(index, "tardeFinal", e.target.value)}
                    />
                  </td>
                  <td className="border border-slate-400 p-1 font-mono">
                    {row.subTarde > 0 ? row.subTarde.toFixed(2) : "0"}
                  </td>

                  <td className="border border-slate-400 p-1 font-bold font-mono bg-slate-50">
                    {row.totalHorasDia > 0 ? row.totalHorasDia.toFixed(2) : "0"}
                  </td>

                  <td className="border border-slate-400 p-1 font-semibold font-mono text-emerald-700 bg-slate-50">
                    {row.valorDia > 0 ? row.valorDia.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "R$ 0,00"}
                  </td>

                  <td className="border border-slate-400 p-1">
                    <input
                      type="text"
                      className="w-full bg-transparent px-1 print:border-none"
                      placeholder="Ex: Em manutenção"
                      value={row.observacao}
                      onChange={(e) => atualizarDia(index, "observacao", e.target.value)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-800 text-white font-bold text-sm">
                <td colSpan={8} className="border border-slate-700 p-2 text-right">TOTAL GERAL DO MÊS:</td>
                <td className="border border-slate-700 p-2 font-mono">{totalGeralHoras.toFixed(2)} hrs</td>
                <td className="border border-slate-700 p-2 font-mono text-emerald-300" colSpan={2}>
                  {totalGeralValor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
