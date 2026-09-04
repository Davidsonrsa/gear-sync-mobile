import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Edit, Trash2, Save, Calendar, ArrowLeft, Clock, Printer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { requireAdmin } from "@/lib/route-guards";

export const Route = createFileRoute("/_authenticated/medicoes")({
  beforeLoad: requireAdmin,
  component: MedicoesPage,
});

interface Contrato {
  id: string;
  numero: string;
  contratante: string;
  objeto: string;
}

interface MesAno {
  id: string;
  contratoId: string;
  nome: string;
  ano: number;
  mesIndex: number;
}

interface DiaMedicao {
  dia: number;
  dataStr: string;
  diaSemana: string;
  manhaInicio: string;
  manhaFim: string;
  tardeInicio: string;
  tardeFim: string;
  observacao: string;
}

interface MaquinaMedicao {
  id: string;
  mesId: string;
  codigo: string;
  tipo: string;
  operador: string;
  valorHora: number;
  dataAprovacao: string;
  assinaturaResponsavel: string;
  assinaturaContratante: string;
  dias: DiaMedicao[];
}

const MEDICOES_RASCUNHO_KEY = "gear-sync-medicoes-rascunho";
const MESES_RASCUNHO_KEY = "gear-sync-meses-rascunho";

function lerRascunho<T>(chave: string, valorPadrao: T): T {
  if (typeof window === "undefined") return valorPadrao;
  try {
    const salvo = window.localStorage.getItem(chave);
    return salvo ? (JSON.parse(salvo) as T) : valorPadrao;
  } catch {
    return valorPadrao;
  }
}

export function MedicoesPage() {
  const [visao, setVisao] = useState<"contratos" | "meses" | "maquina">("contratos");

  const [contratos, setContratos] = useState<Contrato[]>([]);

  const [meses, setMeses] = useState<MesAno[]>(() =>
    lerRascunho<MesAno[]>(MESES_RASCUNHO_KEY, [
      { id: "m1", contratoId: "1", nome: "Setembro", ano: 2026, mesIndex: 8 },
    ]),
  );

  const gerarDiasDoMesEmBranco = (ano: number, mesIndex: number): DiaMedicao[] => {
    const quantidadeDias = new Date(ano, mesIndex + 1, 0).getDate();
    const diasSemanaNomes = [
      "domingo",
      "segunda-feira",
      "terça-feira",
      "quarta-feira",
      "quinta-feira",
      "sexta-feira",
      "sábado",
    ];
    const mesesCurtos = [
      "jan",
      "fev",
      "mar",
      "abr",
      "mai",
      "jun",
      "jul",
      "ago",
      "set",
      "out",
      "nov",
      "dez",
    ];

    return Array.from({ length: quantidadeDias }, (_, i) => {
      const diaNum = i + 1;
      const dataObj = new Date(ano, mesIndex, diaNum);
      const diaSemana = diasSemanaNomes[dataObj.getDay()];
      const dataStr = `${diaNum}-${mesesCurtos[mesIndex]}-${String(ano).slice(2)}`;

      return {
        dia: diaNum,
        dataStr,
        diaSemana,
        manhaInicio: "",
        manhaFim: "",
        tardeInicio: "",
        tardeFim: "",
        observacao: "",
      };
    });
  };

  const [maquinas, setMaquinas] = useState<MaquinaMedicao[]>([
    {
      id: "eq1",
      mesId: "m1",
      codigo: "RE23",
      tipo: "Retroescavadeira",
      operador: "Pedro",
      valorHora: 193.62,
      dataAprovacao: "2026-09-30",
      assinaturaResponsavel: "Responsável Técnico",
      assinaturaContratante: "Fiscal da Prefeitura",
      dias: gerarDiasDoMesEmBranco(2026, 8),
    },
  ]);

  const [contratoSelecionado, setContratoSelecionado] = useState<Contrato | null>(null);
  const [mesSelecionado, setMesSelecionado] = useState<MesAno | null>(null);
  const [maquinaSelecionadaId, setMaquinaSelecionadaId] = useState<string | null>(null);
  const [mensagemSucesso, setMensagemSucesso] = useState("");

  const [modalContratoAberto, setModalContratoAberto] = useState(false);
  const [contratoEditando, setContratoEditando] = useState<Contrato | null>(null);
  const [formNumero, setFormNumero] = useState("");
  const [formContratante, setFormContratante] = useState("");
  const [formObjeto, setFormObjeto] = useState("");

  const [modalMaquinaAberto, setModalMaquinaAberto] = useState(false);
  const [maquinaEditando, setMaquinaEditando] = useState<MaquinaMedicao | null>(null);
  const [formCodigo, setFormCodigo] = useState("");
  const [formTipo, setFormTipo] = useState("");
  const [formOperador, setFormOperador] = useState("");
  const [formValorHora, setFormValorHora] = useState("193.62");
  const [rascunhoCarregado, setRascunhoCarregado] = useState(false);

  useEffect(() => {
    const rascunho = lerRascunho<MaquinaMedicao[] | null>(MEDICOES_RASCUNHO_KEY, null);
    if (rascunho) setMaquinas(rascunho);
    setRascunhoCarregado(true);
  }, []);

  useEffect(() => {
    if (!rascunhoCarregado) return;
    window.localStorage.setItem(MEDICOES_RASCUNHO_KEY, JSON.stringify(maquinas));
  }, [maquinas, rascunhoCarregado]);

  useEffect(() => {
    window.localStorage.setItem(MESES_RASCUNHO_KEY, JSON.stringify(meses));
  }, [meses]);

  useEffect(() => {
    async function carregarDados() {
      const { data: dadosContratos, error: erroContratos } = await supabase
        .from("contratos")
        .select("id, nome_contrato")
        .order("created_at");
      if (erroContratos) return console.error("Erro ao carregar contratos:", erroContratos);

      setContratos(
        (dadosContratos ?? []).map((item) => {
          try {
            const contrato = JSON.parse(item.nome_contrato) as Partial<Contrato>;
            if (contrato.numero && contrato.contratante) {
              return {
                id: String(item.id),
                numero: contrato.numero,
                contratante: contrato.contratante,
                objeto: contrato.objeto ?? "",
              };
            }
          } catch {
            // Mantém compatibilidade com contratos antigos em texto simples.
          }
          return {
            id: String(item.id),
            numero: item.nome_contrato,
            contratante: item.nome_contrato,
            objeto: "",
          };
        }),
      );

      const { data: dadosMedicoes, error: erroMedicoes } = await supabase
        .from("medicoes_diarias")
        .select("*")
        .order("data");
      if (erroMedicoes) {
        console.error("Erro ao carregar medições:", erroMedicoes);
        return;
      }

      setMaquinas((atuais) => {
        const persistidas = new Map<string, MaquinaMedicao>();
        (dadosMedicoes ?? []).forEach((item) => {
          const dataItem = new Date(`${item.data}T00:00:00`);
          const mes = meses.find(
            (itemMes) =>
              itemMes.ano === dataItem.getFullYear() &&
              itemMes.mesIndex === dataItem.getMonth() &&
              (item.contrato_id ? itemMes.contratoId === item.contrato_id : true),
          );
          const mesId = mes?.id;
          if (!mesId) return;

          const chave = `${item.contrato_id ?? item.contrato}:${mesId}:${item.equipamento}:${item.operador}:${item.valor_hora}`;
          let maquina = persistidas.get(chave);
          if (!maquina) {
            const atual = atuais.find(
              (itemAtual) => itemAtual.id === chave ||
                (itemAtual.mesId === mesId && itemAtual.codigo === item.equipamento),
            );
            maquina = atual ?? {
              id: chave,
              mesId,
              codigo: item.equipamento,
              tipo: item.equipamento,
              operador: item.operador,
              valorHora: item.valor_hora,
              dataAprovacao: "",
              assinaturaResponsavel: "",
              assinaturaContratante: "",
              dias: gerarDiasDoMesEmBranco(mes.ano, mes.mesIndex),
            };
            maquina = { ...maquina, dias: maquina.dias.map((dia) => ({ ...dia })) };
            persistidas.set(chave, maquina);
          }

          const dia = maquina.dias[dataItem.getDate() - 1];
          if (!dia) return;
          const formatarHora = (valor: number | null) =>
            valor == null
              ? ""
              : `${String(Math.floor(valor)).padStart(2, "0")}:${String(Math.round((valor % 1) * 60)).padStart(2, "0")}`;
          dia.manhaInicio = formatarHora(item.manha_inicio);
          dia.manhaFim = formatarHora(item.manha_final);
          dia.tardeInicio = formatarHora(item.tarde_inicio);
          dia.tardeFim = formatarHora(item.tarde_final);
          dia.observacao = item.observacao ?? "";
        });

        return [
          ...atuais.filter(
            (atual) => ![...persistidas.values()].some((item) => item.id === atual.id),
          ),
          ...persistidas.values(),
        ];
      });
    }
    void carregarDados();
  }, []);

  const handleSalvarContrato = async (e: React.FormEvent) => {
    e.preventDefault();
    const contrato = {
      numero: formNumero.trim(),
      contratante: formContratante.trim(),
      objeto: formObjeto.trim(),
    };
    const nomeContrato = JSON.stringify(contrato);
    if (contratoEditando) {
      const { error } = await supabase
        .from("contratos")
        .update({ nome_contrato: nomeContrato })
        .eq("id", contratoEditando.id);
      if (error) return console.error("Erro ao atualizar contrato:", error);
      setContratos(
        contratos.map((c) => (c.id === contratoEditando.id ? { ...c, ...contrato } : c)),
      );
    } else {
      const { data, error } = await supabase
        .from("contratos")
        .insert({ nome_contrato: nomeContrato })
        .select("id")
        .single();
      if (error || !data) return console.error("Erro ao inserir contrato:", error);
      setContratos([...contratos, { id: String(data.id), ...contrato }]);
    }
    setModalContratoAberto(false);
  };

  const handleSalvarMaquina = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mesSelecionado) return;

    if (maquinaEditando) {
      setMaquinas(
        maquinas.map((m) =>
          m.id === maquinaEditando.id
            ? {
                ...m,
                codigo: formCodigo,
                tipo: formTipo,
                operador: formOperador,
                valorHora: Number(formValorHora),
              }
            : m,
        ),
      );
    } else {
      const novoId = String(Date.now());
      const nova: MaquinaMedicao = {
        id: novoId,
        mesId: mesSelecionado.id,
        codigo: formCodigo,
        tipo: formTipo,
        operador: formOperador || "Não informado",
        valorHora: Number(formValorHora) || 0,
        dataAprovacao: new Date().toISOString().split("T")[0],
        assinaturaResponsavel: "Responsável Técnico",
        assinaturaContratante: "Fiscal",
        dias: gerarDiasDoMesEmBranco(mesSelecionado.ano, mesSelecionado.mesIndex),
      };
      setMaquinas([...maquinas, nova]);
      setMaquinaSelecionadaId(novoId);
    }
    setModalMaquinaAberto(false);
  };

  const handleExcluirMaquina = async (maquina: MaquinaMedicao) => {
    if (!contratoSelecionado || !mesSelecionado) return;
    if (!confirm(`Deseja excluir o equipamento ${maquina.codigo}?`)) return;

    const dataInicial = `${mesSelecionado.ano}-${String(mesSelecionado.mesIndex + 1).padStart(2, "0")}-01`;
    const ultimoDia = new Date(mesSelecionado.ano, mesSelecionado.mesIndex + 1, 0).getDate();
    const dataFinal = `${mesSelecionado.ano}-${String(mesSelecionado.mesIndex + 1).padStart(2, "0")}-${String(ultimoDia).padStart(2, "0")}`;

    const { error } = await supabase
      .from("medicoes_diarias")
      .delete()
      .eq("contrato_id", contratoSelecionado.id)
      .eq("equipamento", maquina.codigo)
      .gte("data", dataInicial)
      .lte("data", dataFinal);

    if (error) {
      console.error("Erro ao excluir equipamento da medição:", error);
      setMensagemSucesso(`Não foi possível excluir: ${error.message}`);
      return;
    }

    setMaquinas((atuais) => atuais.filter((item) => item.id !== maquina.id));
    setMaquinaSelecionadaId(null);
    setMensagemSucesso("Equipamento excluído com sucesso!");
    setTimeout(() => setMensagemSucesso(""), 3000);
  };

  const calcularSubtotal = (inicio: string, fim: string) => {
    if (!inicio || !fim) return 0;
    const partesIn = inicio.split(":");
    const partesFim = fim.split(":");
    if (partesIn.length < 2 || partesFim.length < 2) return 0;

    const hIn = Number(partesIn[0]) || 0;
    const mIn = Number(partesIn[1]) || 0;
    const hFim = Number(partesFim[0]) || 0;
    const mFim = Number(partesFim[1]) || 0;

    const totalMin = hFim * 60 + mFim - (hIn * 60 + mIn);
    return totalMin > 0 ? totalMin / 60 : 0;
  };

  const formatarHoraInput = (valor: string): string => {
    const limpo = valor.replace(/\D/g, "");
    if (!limpo) return "";

    if (limpo.length <= 2) {
      const hora = limpo.padStart(2, "0");
      return `${hora}:00`;
    } else if (limpo.length === 3) {
      const hora = limpo.slice(0, 1).padStart(2, "0");
      const min = limpo.slice(1, 3);
      return `${hora}:${min}`;
    } else {
      const hora = limpo.slice(0, 2);
      const min = limpo.slice(2, 4);
      return `${hora}:${min}`;
    }
  };

  const calcularTotalMes = (mesId: string) => {
    const maquinasDoMes = maquinas.filter((m) => m.mesId === mesId);
    let totalMes = 0;

    maquinasDoMes.forEach((maq) => {
      maq.dias.forEach((d) => {
        const subM = calcularSubtotal(d.manhaInicio, d.manhaFim);
        const subT = calcularSubtotal(d.tardeInicio, d.tardeFim);
        totalMes += (subM + subT) * maq.valorHora;
      });
    });

    return totalMes;
  };

  const handleSalvarMedicao = async () => {
    if (!contratoSelecionado || !mesSelecionado) return;

    const maquina = maquinas.find((item) => item.id === maquinaSelecionadaId) ??
      maquinas.find((item) => item.mesId === mesSelecionado.id);
    if (!maquina) return;

    const converterHora = (valor: string) => {
      if (!valor) return null;
      const [hora, minuto] = valor.split(":").map(Number);
      return (hora || 0) + (minuto || 0) / 60;
    };

    const lancamentos = maquina.dias.map((dia) => ({
      contrato: contratoSelecionado.numero,
      contrato_id: contratoSelecionado.id,
      equipamento: maquina.codigo,
      operador: maquina.operador || "Não informado",
      valor_hora: maquina.valorHora,
      data: `${mesSelecionado.ano}-${String(mesSelecionado.mesIndex + 1).padStart(2, "0")}-${String(dia.dia).padStart(2, "0")}`,
      manha_inicio: converterHora(dia.manhaInicio),
      manha_final: converterHora(dia.manhaFim),
      tarde_inicio: converterHora(dia.tardeInicio),
      tarde_final: converterHora(dia.tardeFim),
      observacao: dia.observacao || null,
    }));

    const { error } = await supabase
      .from("medicoes_diarias")
      .upsert(lancamentos, { onConflict: "contrato,equipamento,data" });

    if (error?.code === "42P10") {
      for (const lancamento of lancamentos) {
        const { data: existente, error: erroBusca } = await supabase
          .from("medicoes_diarias")
          .select("id")
          .eq("contrato", lancamento.contrato)
          .eq("equipamento", lancamento.equipamento)
          .eq("data", lancamento.data)
          .maybeSingle();

        if (erroBusca) {
          console.error("Erro ao localizar medição:", erroBusca);
          setMensagemSucesso(`Não foi possível salvar: ${erroBusca.message}`);
          return;
        }

        const resultado = existente
          ? await supabase.from("medicoes_diarias").update(lancamento).eq("id", existente.id)
          : await supabase.from("medicoes_diarias").insert(lancamento);

        if (resultado.error) {
          console.error("Erro ao salvar medição:", resultado.error);
          setMensagemSucesso(`Não foi possível salvar: ${resultado.error.message}`);
          return;
        }
      }
    } else if (error) {
      console.error("Erro ao salvar medição:", error);
      setMensagemSucesso(`Não foi possível salvar: ${error.message}`);
      return;
    }

    setMensagemSucesso("Medição salva com sucesso!");
    setTimeout(() => setMensagemSucesso(""), 3000);
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6 print:p-0 print:m-0 print:max-w-none">
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm;
          }
          body {
            background-color: white !important;
            color: black !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          header, nav, footer, .print\\:hidden {
            display: none !important;
          }
          .print\\:block {
            display: block !important;
          }
          .bg-gray-100 {
            background-color: #f3f4f6 !important;
          }
          .bg-gray-200 {
            background-color: #e5e7eb !important;
          }
        }
      `}</style>

      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100 print:hidden">
        <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <Clock className="text-orange-500" /> Medições e Contratos
        </h1>
        <div className="flex gap-2">
          {visao === "meses" && (
            <button
              onClick={() => setVisao("contratos")}
              className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm"
            >
              <ArrowLeft size={16} /> Voltar
            </button>
          )}
          {visao === "maquina" && (
            <button
              onClick={() => setVisao("meses")}
              className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm"
            >
              <ArrowLeft size={16} /> Voltar
            </button>
          )}
          {visao === "contratos" && (
            <button
              onClick={() => {
                setContratoEditando(null);
                setFormNumero("");
                setFormContratante("");
                setFormObjeto("");
                setModalContratoAberto(true);
              }}
              className="flex items-center gap-1 bg-orange-600 hover:bg-orange-700 text-white px-3 py-1.5 rounded-lg text-sm"
            >
              <Plus size={16} /> Novo Contrato
            </button>
          )}
        </div>
      </div>

      {mensagemSucesso && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-xl text-sm flex items-center justify-between print:hidden">
          <span>{mensagemSucesso}</span>
        </div>
      )}

      {visao === "contratos" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {contratos.map((c) => (
            <div
              key={c.id}
              className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 hover:border-orange-500 transition flex flex-col justify-between gap-4"
            >
              <div className="flex justify-between items-start">
                <span className="bg-orange-100 text-orange-700 text-xs font-semibold px-2 py-0.5 rounded">
                  Contrato nº {c.numero}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      setContratoEditando(c);
                      setFormNumero(c.numero);
                      setFormContratante(c.contratante);
                      setFormObjeto(c.objeto);
                      setModalContratoAberto(true);
                    }}
                    className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-gray-100 rounded-lg transition"
                    title="Editar Contrato"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Deseja excluir o contrato nº ${c.numero}?`)) {
                        setContratos(contratos.filter((item) => item.id !== c.id));
                      }
                    }}
                    className="p-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 transition"
                    title="Excluir Contrato"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <div
                onClick={() => {
                  setContratoSelecionado(c);
                  setVisao("meses");
                }}
                className="cursor-pointer"
              >
                <h3 className="font-bold text-gray-800">{c.contratante}</h3>
                <p className="text-gray-500 text-xs mt-1">{c.objeto}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {visao === "meses" && contratoSelecionado && (
        <div className="space-y-4">
          <div className="bg-orange-50 border border-orange-200 p-4 rounded-xl flex justify-between items-center">
            <div>
              <span className="text-xs font-bold text-orange-600 uppercase">Contrato Ativo</span>
              <h2 className="text-md font-bold text-gray-800">
                {contratoSelecionado.contratante} (Nº {contratoSelecionado.numero})
              </h2>
            </div>
            <button
              onClick={() => {
                const nomeMes = prompt("Nome do Mês (Ex: Outubro):");
                const anoStr = prompt("Ano (Ex: 2026):", "2026");
                const mesIdxStr = prompt("Número do Mês de 1 a 12 (Ex: 10 para Outubro):", "10");
                if (nomeMes && anoStr && mesIdxStr) {
                  const ano = Number(anoStr);
                  const mesIndex = Number(mesIdxStr) - 1;
                  const novoMesId = String(Date.now());
                  setMeses([
                    ...meses,
                    {
                      id: novoMesId,
                      contratoId: contratoSelecionado.id,
                      nome: nomeMes,
                      ano,
                      mesIndex,
                    },
                  ]);
                }
              }}
              className="bg-orange-600 text-white px-3 py-1.5 rounded-lg text-sm flex items-center gap-1"
            >
              <Calendar size={16} /> Adicionar Mês
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {meses
              .filter((m) => m.contratoId === contratoSelecionado.id)
              .map((m) => {
                const totalMesValor = calcularTotalMes(m.id);
                return (
                  <div
                    key={m.id}
                    onClick={() => {
                      setMesSelecionado(m);
                      setMaquinaSelecionadaId(null);
                      setVisao("maquina");
                    }}
                    className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 hover:border-orange-500 cursor-pointer flex flex-col justify-between group gap-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Calendar className="text-orange-500" size={20} />
                        <div>
                          <h4 className="font-bold text-gray-800 text-sm">
                            {m.nome} / {m.ano}
                          </h4>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm("Excluir mês?")) {
                            setMeses(meses.filter((x) => x.id !== m.id));
                          }
                        }}
                        className="rounded-md bg-red-600 p-1.5 text-white hover:bg-red-700"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <div className="bg-orange-50/60 p-2.5 rounded-lg border border-orange-100 flex justify-between items-center">
                      <span className="text-xs font-semibold text-gray-600">Total Medição:</span>
                      <span className="text-sm font-bold text-orange-700">
                        R$ {totalMesValor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {visao === "maquina" && mesSelecionado && contratoSelecionado && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 space-y-4 print:border-none print:p-0 print:m-0">
          <div className="flex justify-between items-center border-b pb-3 print:hidden">
            <h2 className="text-lg font-bold text-gray-800">
              Apontamento - {mesSelecionado.nome} de {mesSelecionado.ano}
            </h2>
            <div className="flex gap-2">
              <button
                onClick={handleSalvarMedicao}
                className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-sm font-semibold"
              >
                <Save size={16} /> Salvar Medição
              </button>
              <button
                onClick={() => {
                  setMaquinaEditando(null);
                  setFormCodigo("");
                  setFormTipo("");
                  setFormOperador("");
                  setFormValorHora("193.62");
                  setModalMaquinaAberto(true);
                }}
                className="flex items-center gap-1 bg-orange-600 text-white px-3 py-1.5 rounded-lg text-sm"
              >
                <Plus size={16} /> Novo Equipamento
              </button>
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1 bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm"
              >
                <Printer size={16} /> Imprimir A4
              </button>
            </div>
          </div>

          <div className="print:hidden">
            <div className="flex items-center justify-between gap-3 mb-2">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Equipamentos cadastrados</p>
                <p className="text-xs text-gray-400">Selecione um equipamento para lançar as horas</p>
              </div>
              <span className="shrink-0 rounded-full bg-orange-50 px-2.5 py-1 text-xs font-bold text-orange-700">
                {maquinas.filter((eq) => eq.mesId === mesSelecionado.id).length} cadastrados
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
              {maquinas
                .filter((eq) => eq.mesId === mesSelecionado.id)
                .map((eq, index) => {
                  const ativa = maquinaSelecionadaId ? eq.id === maquinaSelecionadaId : index === 0;
                  return (
                    <div
                      key={eq.id}
                      className={`flex items-stretch gap-1.5 rounded-xl border border-gray-300 bg-transparent p-1.5 text-black transition ${
                        ativa
                          ? "border-gray-700 shadow-sm ring-1 ring-gray-300"
                          : "hover:border-gray-500"
                      }`}
                    >
                      <button
                        onClick={() => setMaquinaSelecionadaId(eq.id)}
                        className="medicao-equipamento min-w-0 flex-1 rounded-lg bg-transparent px-2.5 py-2 text-left text-black"
                      >
                        <span className="block truncate text-sm font-extrabold text-black">
                          {eq.codigo}
                        </span>
                        <span className="block truncate text-[11px] font-medium uppercase text-black">
                          {eq.tipo}
                        </span>
                      </button>
                      <button
                        onClick={() => {
                          setMaquinaEditando(eq);
                          setFormCodigo(eq.codigo);
                          setFormTipo(eq.tipo);
                          setFormOperador(eq.operador);
                          setFormValorHora(String(eq.valorHora));
                          setModalMaquinaAberto(true);
                        }}
                        className="self-center rounded-md p-1.5 text-gray-400 hover:bg-blue-50 hover:text-blue-600"
                        title="Editar Equipamento"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={() => void handleExcluirMaquina(eq)}
                        className="medicao-lixeira self-center rounded-md bg-red-600 p-1.5 text-white hover:bg-red-700"
                        title="Excluir Equipamento"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  );
                })}
            </div>
          </div>

          {(() => {
            const listaMes = maquinas.filter((eq) => eq.mesId === mesSelecionado.id);
            const maqAtiva = listaMes.find((eq) => eq.id === maquinaSelecionadaId) || listaMes[0];
            if (!maqAtiva)
              return (
                <div className="text-center py-8 space-y-3 print:hidden">
                  <p className="text-gray-500">Nenhum equipamento cadastrado neste mês.</p>
                  <button
                    onClick={() => {
                      setMaquinaEditando(null);
                      setFormCodigo("RE01");
                      setFormTipo("Retroescavadeira");
                      setFormOperador("");
                      setFormValorHora("193.62");
                      setModalMaquinaAberto(true);
                    }}
                    className="bg-orange-600 text-white px-4 py-2 rounded-lg text-sm"
                  >
                    Cadastrar Primeiro Equipamento
                  </button>
                </div>
              );

            let totalGeralHoras = 0;
            let totalGeralValor = 0;

            return (
              <div className="space-y-2 print:space-y-1">
                <div className="border border-gray-800 text-[10px] print:text-[8px]">
                  <div className="bg-gray-200 text-center font-bold py-1 border-b border-gray-800 uppercase">
                    CONTROLE DE MEDIÇÃO DE HORAS - {mesSelecionado.nome.toUpperCase()} /{" "}
                    {mesSelecionado.ano}
                  </div>
                  <div className="grid grid-cols-2 border-b border-gray-800 p-1 font-semibold">
                    <div>CONTRATANTE: {contratoSelecionado.contratante.toUpperCase()}</div>
                    <div>CONTRATO Nº: {contratoSelecionado.numero}</div>
                  </div>
                  <div className="grid grid-cols-3 p-1 font-semibold items-center">
                    <div>
                      EQUIPAMENTO: {maqAtiva.tipo.toUpperCase()} ({maqAtiva.codigo})
                    </div>
                    <div>OPERADOR: {maqAtiva.operador.toUpperCase()}</div>
                    <div className="flex items-center gap-1 justify-end print:block">
                      <span>VALOR HORA (R$):</span>
                      <input
                        type="number"
                        step="0.01"
                        value={maqAtiva.valorHora}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setMaquinas(
                            maquinas.map((m) =>
                              m.id === maqAtiva.id ? { ...m, valorHora: val } : m,
                            ),
                          );
                        }}
                        className="w-20 p-0.5 border rounded text-right font-bold bg-white print:border-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto border border-gray-800">
                  <table className="w-full text-left border-collapse text-[10px] print:text-[8px]">
                    <thead>
                      <tr className="bg-gray-200 text-gray-900 border-b border-gray-800 text-center font-bold">
                        <th className="p-1 border-r border-gray-800">Data</th>
                        <th className="p-1 border-r border-gray-800">Dia</th>
                        <th className="p-1 border-r border-gray-800" colSpan={3}>
                          MANHÃ
                        </th>
                        <th className="p-1 border-r border-gray-800" colSpan={3}>
                          TARDE
                        </th>
                        <th className="p-1 border-r border-gray-800">TOTAL</th>
                        <th className="p-1 border-r border-gray-800">VALOR (R$)</th>
                        <th className="p-1">OBS</th>
                      </tr>
                      <tr className="bg-gray-100 text-gray-800 border-b border-gray-800 text-center font-semibold">
                        <th className="p-0.5 border-r border-gray-800"></th>
                        <th className="p-0.5 border-r border-gray-800"></th>
                        <th className="p-0.5 border-r border-gray-800">INI</th>
                        <th className="p-0.5 border-r border-gray-800">FIM</th>
                        <th className="p-0.5 border-r border-gray-800">SUB</th>
                        <th className="p-0.5 border-r border-gray-800">INI</th>
                        <th className="p-0.5 border-r border-gray-800">FIM</th>
                        <th className="p-0.5 border-r border-gray-800">SUB</th>
                        <th className="p-0.5 border-r border-gray-800"></th>
                        <th className="p-0.5 border-r border-gray-800">
                          R$ {maqAtiva.valorHora.toFixed(2)}
                        </th>
                        <th className="p-0.5"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {maqAtiva.dias.map((d, i) => {
                        const subManha = calcularSubtotal(d.manhaInicio, d.manhaFim);
                        const subTarde = calcularSubtotal(d.tardeInicio, d.tardeFim);
                        const totalHorasDia = subManha + subTarde;
                        const valorTotalDia = totalHorasDia * maqAtiva.valorHora;

                        totalGeralHoras += totalHorasDia;
                        totalGeralValor += valorTotalDia;

                        const isFDS = d.diaSemana === "sábado" || d.diaSemana === "domingo";

                        return (
                          <tr
                            key={i}
                            className={`border-b border-gray-300 text-center ${isFDS ? "bg-gray-100" : ""}`}
                          >
                            <td className="p-0.5 border-r border-gray-300">{d.dataStr}</td>
                            <td className="p-0.5 border-r border-gray-300">{d.diaSemana}</td>
                            <td className="p-0.5 border-r border-gray-300">
                              <input
                                type="text"
                                value={d.manhaInicio}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setMaquinas(
                                    maquinas.map((m) =>
                                      m.id === maqAtiva.id
                                        ? {
                                            ...m,
                                            dias: m.dias.map((di, idx) =>
                                              idx === i ? { ...di, manhaInicio: val } : di,
                                            ),
                                          }
                                        : m,
                                    ),
                                  );
                                }}
                                onBlur={(e) => {
                                  const formatado = formatarHoraInput(e.target.value);
                                  setMaquinas(
                                    maquinas.map((m) =>
                                      m.id === maqAtiva.id
                                        ? {
                                            ...m,
                                            dias: m.dias.map((di, idx) =>
                                              idx === i ? { ...di, manhaInicio: formatado } : di,
                                            ),
                                          }
                                        : m,
                                    ),
                                  );
                                }}
                                className="w-12 p-0.5 text-center border rounded bg-white text-[10px] print:border-none print:bg-transparent"
                              />
                            </td>
                            <td className="p-0.5 border-r border-gray-300">
                              <input
                                type="text"
                                value={d.manhaFim}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setMaquinas(
                                    maquinas.map((m) =>
                                      m.id === maqAtiva.id
                                        ? {
                                            ...m,
                                            dias: m.dias.map((di, idx) =>
                                              idx === i ? { ...di, manhaFim: val } : di,
                                            ),
                                          }
                                        : m,
                                    ),
                                  );
                                }}
                                onBlur={(e) => {
                                  const formatado = formatarHoraInput(e.target.value);
                                  setMaquinas(
                                    maquinas.map((m) =>
                                      m.id === maqAtiva.id
                                        ? {
                                            ...m,
                                            dias: m.dias.map((di, idx) =>
                                              idx === i ? { ...di, manhaFim: formatado } : di,
                                            ),
                                          }
                                        : m,
                                    ),
                                  );
                                }}
                                className="w-12 p-0.5 text-center border rounded bg-white text-[10px] print:border-none print:bg-transparent"
                              />
                            </td>
                            <td className="p-0.5 border-r border-gray-300">
                              {subManha > 0 ? subManha.toFixed(2) : ""}
                            </td>
                            <td className="p-0.5 border-r border-gray-300">
                              <input
                                type="text"
                                value={d.tardeInicio}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setMaquinas(
                                    maquinas.map((m) =>
                                      m.id === maqAtiva.id
                                        ? {
                                            ...m,
                                            dias: m.dias.map((di, idx) =>
                                              idx === i ? { ...di, tardeInicio: val } : di,
                                            ),
                                          }
                                        : m,
                                    ),
                                  );
                                }}
                                onBlur={(e) => {
                                  const formatado = formatarHoraInput(e.target.value);
                                  setMaquinas(
                                    maquinas.map((m) =>
                                      m.id === maqAtiva.id
                                        ? {
                                            ...m,
                                            dias: m.dias.map((di, idx) =>
                                              idx === i ? { ...di, tardeInicio: formatado } : di,
                                            ),
                                          }
                                        : m,
                                    ),
                                  );
                                }}
                                className="w-12 p-0.5 text-center border rounded bg-white text-[10px] print:border-none print:bg-transparent"
                              />
                            </td>
                            <td className="p-0.5 border-r border-gray-300">
                              <input
                                type="text"
                                value={d.tardeFim}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setMaquinas(
                                    maquinas.map((m) =>
                                      m.id === maqAtiva.id
                                        ? {
                                            ...m,
                                            dias: m.dias.map((di, idx) =>
                                              idx === i ? { ...di, tardeFim: val } : di,
                                            ),
                                          }
                                        : m,
                                    ),
                                  );
                                }}
                                onBlur={(e) => {
                                  const formatado = formatarHoraInput(e.target.value);
                                  setMaquinas(
                                    maquinas.map((m) =>
                                      m.id === maqAtiva.id
                                        ? {
                                            ...m,
                                            dias: m.dias.map((di, idx) =>
                                              idx === i ? { ...di, tardeFim: formatado } : di,
                                            ),
                                          }
                                        : m,
                                    ),
                                  );
                                }}
                                className="w-12 p-0.5 text-center border rounded bg-white text-[10px] print:border-none print:bg-transparent"
                              />
                            </td>
                            <td className="p-0.5 border-r border-gray-300">
                              {subTarde > 0 ? subTarde.toFixed(2) : ""}
                            </td>
                            <td className="p-0.5 border-r border-gray-300 font-bold">
                              {totalHorasDia > 0 ? totalHorasDia.toFixed(2) : ""}
                            </td>
                            <td className="p-0.5 border-r border-gray-300 text-green-700">
                              {valorTotalDia > 0
                                ? valorTotalDia.toLocaleString("pt-BR", {
                                    minimumFractionDigits: 2,
                                  })
                                : ""}
                            </td>
                            <td className="p-0.5">
                              <input
                                type="text"
                                value={d.observacao}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setMaquinas(
                                    maquinas.map((m) =>
                                      m.id === maqAtiva.id
                                        ? {
                                            ...m,
                                            dias: m.dias.map((di, idx) =>
                                              idx === i ? { ...di, observacao: val } : di,
                                            ),
                                          }
                                        : m,
                                    ),
                                  );
                                }}
                                className="w-full p-0.5 border rounded text-[10px] bg-white print:border-none print:bg-transparent"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gray-200 font-bold text-center border-t border-gray-800 text-[10px]">
                        <td className="p-1 border-r border-gray-800" colSpan={4}>
                          TOTAL GERAL
                        </td>
                        <td className="p-1 border-r border-gray-800"></td>
                        <td className="p-1 border-r border-gray-800" colSpan={2}></td>
                        <td className="p-1 border-r border-gray-800"></td>
                        <td className="p-1 border-r border-gray-800">
                          {totalGeralHoras.toFixed(2)}
                        </td>
                        <td className="p-1 border-r border-gray-800 text-green-800">
                          R$ {totalGeralValor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                <div className="mt-2 pt-2 border border-gray-800 p-2 text-[10px] print:text-[9px] space-y-4 bg-gray-50 print:bg-white">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="font-bold">DATA DE APROVAÇÃO:</span>
                      <input
                        type="date"
                        value={maqAtiva.dataAprovacao}
                        onChange={(e) => {
                          const val = e.target.value;
                          setMaquinas(
                            maquinas.map((m) =>
                              m.id === maqAtiva.id ? { ...m, dataAprovacao: val } : m,
                            ),
                          );
                        }}
                        className="p-0.5 border rounded bg-white print:border-none"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-8 pt-6 text-center">
                    <div className="border-t border-gray-600 pt-1">
                      <input
                        type="text"
                        value={maqAtiva.assinaturaResponsavel}
                        onChange={(e) => {
                          const val = e.target.value;
                          setMaquinas(
                            maquinas.map((m) =>
                              m.id === maqAtiva.id ? { ...m, assinaturaResponsavel: val } : m,
                            ),
                          );
                        }}
                        className="w-full text-center font-bold bg-transparent border-none"
                      />
                      <span className="text-[8px] text-gray-500">
                        Responsável pela Medição / Executante
                      </span>
                    </div>
                    <div className="border-t border-gray-600 pt-1">
                      <input
                        type="text"
                        value={maqAtiva.assinaturaContratante}
                        onChange={(e) => {
                          const val = e.target.value;
                          setMaquinas(
                            maquinas.map((m) =>
                              m.id === maqAtiva.id ? { ...m, assinaturaContratante: val } : m,
                            ),
                          );
                        }}
                        className="w-full text-center font-bold bg-transparent border-none"
                      />
                      <span className="text-[8px] text-gray-500">Fiscal / Gestor do Contrato</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Modal Contrato */}
      {modalContratoAberto && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 print:hidden">
          <div className="bg-white p-6 rounded-xl max-w-md w-full space-y-4">
            <h3 className="text-lg font-bold">
              {contratoEditando ? "Editar Contrato" : "Novo Contrato"}
            </h3>
            <form onSubmit={handleSalvarContrato} className="space-y-3">
              <div>
                <label className="text-xs font-semibold">Número do Contrato</label>
                <input
                  type="text"
                  value={formNumero}
                  onChange={(e) => setFormNumero(e.target.value)}
                  required
                  className="w-full border p-2 rounded text-sm"
                  placeholder="Ex: 48/2022"
                />
              </div>
              <div>
                <label className="text-xs font-semibold">Contratante</label>
                <input
                  type="text"
                  value={formContratante}
                  onChange={(e) => setFormContratante(e.target.value)}
                  required
                  className="w-full border p-2 rounded text-sm"
                  placeholder="Nome da Prefeitura/Órgão"
                />
              </div>
              <div>
                <label className="text-xs font-semibold">Objeto</label>
                <input
                  type="text"
                  value={formObjeto}
                  onChange={(e) => setFormObjeto(e.target.value)}
                  required
                  className="w-full border p-2 rounded text-sm"
                  placeholder="Ex: Locação de Maquinário Pesado"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalContratoAberto(false)}
                  className="px-4 py-2 border rounded text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-orange-600 text-white rounded text-sm"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Máquina */}
      {modalMaquinaAberto && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 print:hidden">
          <div className="bg-white p-6 rounded-xl max-w-md w-full space-y-4">
            <h3 className="text-lg font-bold">
              {maquinaEditando ? "Editar Equipamento" : "Novo Equipamento"}
            </h3>
            <form onSubmit={handleSalvarMaquina} className="space-y-3">
              <div>
                <label className="text-xs font-semibold">Código (Ex: RE23)</label>
                <input
                  type="text"
                  value={formCodigo}
                  onChange={(e) => setFormCodigo(e.target.value)}
                  required
                  className="w-full border p-2 rounded text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold">Tipo (Ex: Retroescavadeira)</label>
                <input
                  type="text"
                  value={formTipo}
                  onChange={(e) => setFormTipo(e.target.value)}
                  required
                  className="w-full border p-2 rounded text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold">Operador</label>
                <input
                  type="text"
                  value={formOperador}
                  onChange={(e) => setFormOperador(e.target.value)}
                  className="w-full border p-2 rounded text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold">Valor da Hora (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formValorHora}
                  onChange={(e) => setFormValorHora(e.target.value)}
                  required
                  className="w-full border p-2 rounded text-sm"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalMaquinaAberto(false)}
                  className="px-4 py-2 border rounded text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-orange-600 text-white rounded text-sm"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
