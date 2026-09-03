import { useEffect, useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { Plus, Edit, Trash2, Save, Calendar, ArrowLeft, Clock, Printer } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { requireAdmin } from '@/lib/route-guards';

export const Route = createFileRoute('/_authenticated/medicoes')({
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

const MEDICOES_RASCUNHO_KEY = 'gear-sync-medicoes-rascunho';

function lerRascunho<T>(valorPadrao: T): T {
  if (typeof window === 'undefined') return valorPadrao;
  try {
    const salvo = window.localStorage.getItem(MEDICOES_RASCUNHO_KEY);
    return salvo ? (JSON.parse(salvo) as T) : valorPadrao;
  } catch {
    return valorPadrao;
  }
}

export function MedicoesPage() {
  const [visao, setVisao] = useState<'contratos' | 'meses' | 'maquina'>('contratos');
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [meses, setMeses] = useState<MesAno[]>([
    { id: 'm1', contratoId: '1', nome: 'Setembro', ano: 2026, mesIndex: 8 }
  ]);

  const gerarDiasDoMesEmBranco = (ano: number, mesIndex: number): DiaMedicao[] => {
    const quantidadeDias = new Date(ano, mesIndex + 1, 0).getDate();
    const diasSemanaNomes = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
    const mesesCurtos = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

    return Array.from({ length: quantidadeDias }, (_, i) => {
      const diaNum = i + 1;
      const dataObj = new Date(ano, mesIndex, diaNum);
      const diaSemana = diasSemanaNomes[dataObj.getDay()];
      const dataStr = `${diaNum}-${mesesCurtos[mesIndex]}-${String(ano).slice(2)}`;

      return {
        dia: diaNum,
        dataStr,
        diaSemana,
        manhaInicio: '',
        manhaFim: '',
        tardeInicio: '',
        tardeFim: '',
        observacao: '',
      };
    });
  };

  const [maquinas, setMaquinas] = useState<MaquinaMedicao[]>([
    {
      id: 'eq1',
      mesId: 'm1',
      codigo: 'RE23',
      tipo: 'Retroescavadeira',
      operador: 'Pedro',
      valorHora: 193.62,
      dataAprovacao: '2026-09-30',
      assinaturaResponsavel: 'Responsável Técnico',
      assinaturaContratante: 'Fiscal da Prefeitura',
      dias: gerarDiasDoMesEmBranco(2026, 8)
    }
  ]);

  const [contratoSelecionado, setContratoSelecionado] = useState<Contrato | null>(null);
  const [mesSelecionado, setMesSelecionado] = useState<MesAno | null>(null);
  const [maquinaSelecionadaId, setMaquinaSelecionadaId] = useState<string | null>(null);
  const [mensagemSucesso, setMensagemSucesso] = useState('');
  const [salvandoMedicao, setSalvandoMedicao] = useState(false);

  const [modalContratoAberto, setModalContratoAberto] = useState(false);
  const [contratoEditando, setContratoEditando] = useState<Contrato | null>(null);
  const [formNumero, setFormNumero] = useState('');
  const [formContratante, setFormContratante] = useState('');
  const [formObjeto, setFormObjeto] = useState('');

  const [modalMaquinaAberto, setModalMaquinaAberto] = useState(false);
  const [maquinaEditando, setMaquinaEditando] = useState<MaquinaMedicao | null>(null);
  const [formCodigo, setFormCodigo] = useState('');
  const [formTipo, setFormTipo] = useState('');
  const [formOperador, setFormOperador] = useState('');
  const [formValorHora, setFormValorHora] = useState('193.62');
  const [rascunhoCarregado, setRascunhoCarregado] = useState(false);

  // Carregar rascunho do localStorage
  useEffect(() => {
    const rascunho = lerRascunho<MaquinaMedicao[] | null>(null);
    if (rascunho) setMaquinas(rascunho);
    setRascunhoCarregado(true);
  }, []);

  // Salvar rascunho
  useEffect(() => {
    if (!rascunhoCarregado) return;
    try {
      window.localStorage.setItem(MEDICOES_RASCUNHO_KEY, JSON.stringify(maquinas));
    } catch (error) {
      console.error('Erro ao salvar rascunho das medições:', error);
    }
  }, [maquinas]);

  // Carregar Contratos e Medições do Supabase ao iniciar
  useEffect(() => {
    async function carregarDadosIniciais() {
      // 1. Carregar Contratos do Supabase
      const { data: dadosContratos, error: errContratos } = await supabase.from('contratos').select('*');
      if (errContratos) {
        console.error('Erro ao carregar contratos:', errContratos);
      } else if (dadosContratos && dadosContratos.length > 0) {
        const formatados: Contrato[] = dadosContratos.map(c => ({
          id: String(c.id),
          numero: c.numero || '',
          contratante: c.contratante || '',
          objeto: c.objeto || ''
        }));
        setContratos(formatados);
      } else {
        // Contrato padrão se a tabela estiver vazia
        setContratos([
          { id: '1', numero: '48/2022', contratante: 'Prefeitura Municipal de Nova Serrana', objeto: 'Locação de Maquinário Pesado' }
        ]);
      }

      // 2. Carregar Medições
      const { data, error } = await supabase.from('medicoes_diarias').select('*');
      if (error) {
        console.error('Erro ao carregar medições:', error);
        return;
      }

      if (!data?.length) return;

      setMaquinas((atuais) => {
        const maquinasPersistidas = new Map<string, MaquinaMedicao>();

        data.forEach((item) => {
          const mes = meses.find((mesItem) => mesItem.nome === new Date(`${item.data}T00:00:00`).toLocaleString('pt-BR', { month: 'long' }));
          const mesId = mes?.id || meses[0]?.id;
          if (!mesId) return;

          const chave = `${mesId}:${item.equipamento}:${item.operador}:${item.valor_hora}`;
          let maquina = maquinasPersistidas.get(chave);
          if (!maquina) {
            const maquinaAtual = atuais.find((atual) => atual.codigo === item.equipamento && atual.mesId === mesId);
            maquina = maquinaAtual ? { ...maquinaAtual, dias: maquinaAtual.dias.map((dia) => ({ ...dia })) } : {
              id: `persistida-${item.equipamento}-${mesId}`,
              mesId,
              codigo: item.equipamento,
              tipo: item.equipamento,
              operador: item.operador,
              valorHora: item.valor_hora,
              dataAprovacao: '',
              assinaturaResponsavel: '',
              assinaturaContratante: '',
              dias: gerarDiasDoMesEmBranco(mes?.ano || new Date(item.data).getFullYear(), mes?.mesIndex ?? new Date(item.data).getMonth()),
            };
            maquinasPersistidas.set(chave, maquina);
          }

          const dia = new Date(`${item.data}T00:00:00`).getDate();
          const diaPersistido = maquina.dias[dia - 1];
          if (diaPersistido) {
            diaPersistido.manhaInicio = item.manha_inicio == null ? '' : `${String(Math.floor(item.manha_inicio)).padStart(2, '0')}:${String(Math.round((item.manha_inicio % 1) * 60)).padStart(2, '0')}`;
            diaPersistido.manhaFim = item.manha_final == null ? '' : `${String(Math.floor(item.manha_final)).padStart(2, '0')}:${String(Math.round((item.manha_final % 1) * 60)).padStart(2, '0')}`;
            diaPersistido.tardeInicio = item.tarde_inicio == null ? '' : `${String(Math.floor(item.tarde_inicio)).padStart(2, '0')}:${String(Math.round((item.tarde_inicio % 1) * 60)).padStart(2, '0')}`;
            diaPersistido.tardeFim = item.tarde_final == null ? '' : `${String(Math.floor(item.tarde_final)).padStart(2, '0')}:${String(Math.round((item.tarde_final % 1) * 60)).padStart(2, '0')}`;
            diaPersistido.observacao = item.observacao || '';
          }
        });

        return [...atuais.filter((maquina) => ![...maquinasPersistidas.values()].some((persistida) => persistida.id === maquina.id)), ...maquinasPersistidas.values()];
      });
    }

    void carregarDadosIniciais();
  }, []);

  const handleSalvarContrato = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      numero: formNumero,
      contratante: formContratante,
      objeto: formObjeto,
    };

    if (contratoEditando) {
      const { error } = await supabase
        .from('contratos')
        .update(payload)
        .eq('id', contratoEditando.id);

      if (error) {
        console.error('Erro ao atualizar contrato:', error);
        return;
      }

      setContratos(contratos.map(c => c.id === contratoEditando.id ? { ...c, ...payload } : c));
    } else {
      const { data, error } = await supabase
        .from('contratos')
        .insert([payload])
        .select();

      if (error) {
        console.error('Erro ao inserir contrato:', error);
        return;
      }

      if (data && data[0]) {
        const novo: Contrato = {
          id: String(data[0].id),
          numero: data[0].numero,
          contratante: data[0].contratante,
          objeto: data[0].objeto,
        };
        setContratos([...contratos, novo]);
      }
    }
    setModalContratoAberto(false);
  };

  const handleExcluirContrato = async (id: string, numero: string) => {
    if (confirm(`Deseja excluir o contrato nº ${numero}?`)) {
      const { error } = await supabase.from('contratos').delete().eq('id', id);
      if (error) {
        console.error('Erro ao excluir contrato:', error);
        return;
      }
      setContratos(contratos.filter(item => item.id !== id));
    }
  };

  const handleSalvarMaquina = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mesSelecionado) return;

    if (maquinaEditando) {
      setMaquinas(maquinas.map(m => m.id === maquinaEditando.id ? {
        ...m,
        codigo: formCodigo,
        tipo: formTipo,
        operador: formOperador,
        valorHora: Number(formValorHora)
      } : m));
    } else {
      const novoId = String(Date.now());
      const nova: MaquinaMedicao = {
        id: novoId,
        mesId: mesSelecionado.id,
        codigo: formCodigo,
        tipo: formTipo,
        operador: formOperador || 'Não informado',
        valorHora: Number(formValorHora) || 0,
        dataAprovacao: new Date().toISOString().split('T')[0],
        assinaturaResponsavel: 'Responsável Técnico',
        assinaturaContratante: 'Fiscal',
        dias: gerarDiasDoMesEmBranco(mesSelecionado.ano, mesSelecionado.mesIndex)
      };
      setMaquinas([...maquinas, nova]);
      setMaquinaSelecionadaId(novoId);
    }
    setModalMaquinaAberto(false);
  };

  const calcularSubtotal = (inicio: string, fim: string) => {
    if (!inicio || !fim) return 0;
    const partesIn = inicio.split(':');
    const partesFim = fim.split(':');
    if (partesIn.length < 2 || partesFim.length < 2) return 0;
    
    const hIn = Number(partesIn[0]) || 0;
    const mIn = Number(partesIn[1]) || 0;
    const hFim = Number(partesFim[0]) || 0;
    const mFim = Number(partesFim[1]) || 0;

    const totalMin = (hFim * 60 + mFim) - (hIn * 60 + mIn);
    return totalMin > 0 ? totalMin / 60 : 0;
  };

  const formatarHoraInput = (valor: string): string => {
    const limpo = valor.replace(/\D/g, '');
    if (!limpo) return '';
    
    if (limpo.length <= 2) {
      const hora = limpo.padStart(2, '0');
      return `${hora}:00`;
    } else if (limpo.length === 3) {
      const hora = limpo.slice(0, 1).padStart(2, '0');
      const min = limpo.slice(1, 3);
      return `${hora}:${min}`;
    } else {
      const hora = limpo.slice(0, 2);
      const min = limpo.slice(2, 4);
      return `${hora}:${min}`;
    }
  };

  const calcularTotalMes = (mesId: string) => {
    const maquinasDoMes = maquinas.filter(m => m.mesId === mesId);
    let totalMes = 0;

    maquinasDoMes.forEach(maq => {
      maq.dias.forEach(d => {
        const subM = calcularSubtotal(d.manhaInicio, d.manhaFim);
        const subT = calcularSubtotal(d.tardeInicio, d.tardeFim);
        totalMes += (subM + subT) * maq.valorHora;
      });
    });

    return totalMes;
  };

  const horarioParaDecimal = (horario: string) => {
    if (!horario) return null;
    const [hora, minuto] = horario.split(':').map(Number);
    return Number.isFinite(hora) && Number.isFinite(minuto) ? hora + minuto / 60 : null;
  };

  const handleSalvarMedicao = async () => {
    if (!mesSelecionado || salvandoMedicao) return;
    const maquinasDoMes = maquinas.filter((maquina) => maquina.mesId === mesSelecionado.id);
    setSalvandoMedicao(true);

    try {
      for (const maquina of maquinasDoMes) {
        for (const dia of maquina.dias) {
          const data = `${mesSelecionado.ano}-${String(mesSelecionado.mesIndex + 1).padStart(2, '0')}-${String(dia.dia).padStart(2, '0')}`;
          const { error } = await supabase.from('medicoes_diarias').upsert({
            contrato: contratoSelecionado?.numero || contratoSelecionado?.contratante || '',
            equipamento: maquina.codigo,
            operador: maquina.operador,
            data,
            manha_inicio: horarioParaDecimal(dia.manhaInicio),
            manha_final: horarioParaDecimal(dia.manhaFim),
            tarde_inicio: horarioParaDecimal(dia.tardeInicio),
            tarde_final: horarioParaDecimal(dia.tardeFim),
            valor_hora: maquina.valorHora,
            observacao: dia.observacao || null,
          }, { onConflict: 'contrato,equipamento,data' });
          if (error) throw error;
        }
      }
      setMensagemSucesso('Medição salva com sucesso!');
      setTimeout(() => setMensagemSucesso(''), 3000);
    } catch (error) {
      console.error('Erro ao salvar medição:', error);
      setMensagemSucesso('Não foi possível salvar a medição.');
    } finally {
      setSalvandoMedicao(false);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6 print:p-0 print:m-0 print:max-w-none">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100 print:hidden">
        <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <Clock className="text-orange-500" /> Medições e Contratos
        </h1>
        <div className="flex gap-2">
          {visao === 'meses' && (
            <button onClick={() => setVisao('contratos')} className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm">
              <ArrowLeft size={16} /> Voltar
            </button>
          )}
          {visao === 'maquina' && (
            <button onClick={() => setVisao('meses')} className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm">
              <ArrowLeft size={16} /> Voltar
            </button>
          )}
          {visao === 'contratos' && (
            <button onClick={() => { setContratoEditando(null); setFormNumero(''); setFormContratante(''); setFormObjeto(''); setModalContratoAberto(true); }} className="flex items-center gap-1 bg-orange-600 hover:bg-orange-700 text-white px-3 py-1.5 rounded-lg text-sm">
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

      {visao === 'contratos' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {contratos.map(c => (
            <div key={c.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 hover:border-orange-500 transition flex flex-col justify-between gap-4">
              <div className="flex justify-between items-start">
                <span className="bg-orange-100 text-orange-700 text-xs font-semibold px-2 py-0.5 rounded">Contrato nº {c.numero}</span>
                <div className="flex items-center gap-1">
                  <button onClick={() => {
                    setContratoEditando(c);
                    setFormNumero(c.numero);
                    setFormContratante(c.contratante);
                    setFormObjeto(c.objeto);
                    setModalContratoAberto(true);
                  }} className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-gray-100 rounded-lg transition" title="Editar Contrato">
                    <Edit size={16} />
                  </button>
                  <button onClick={() => handleExcluirContrato(c.id, c.numero)} className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-gray-100 rounded-lg transition" title="Excluir Contrato">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <div onClick={() => { setContratoSelecionado(c); setVisao('meses'); }} className="cursor-pointer">
                <h3 className="font-bold text-gray-800">{c.contratante}</h3>
                <p className="text-gray-500 text-xs mt-1">{c.objeto}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal para Adicionar / Editar Contratos */}
      {modalContratoAberto && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-xl max-w-md w-full space-y-4">
            <h2 className="text-lg font-bold text-gray-800">{contratoEditando ? 'Editar Contrato' : 'Novo Contrato'}</h2>
            <form onSubmit={handleSalvarContrato} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-600">Número do Contrato</label>
                <input type="text" value={formNumero} onChange={e => setFormNumero(e.target.value)} required className="w-full p-2 border rounded-lg text-sm" placeholder="Ex: 48/2022" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600">Contratante</label>
                <input type="text" value={formContratante} onChange={e => setFormContratante(e.target.value)} required className="w-full p-2 border rounded-lg text-sm" placeholder="Nome da Prefeitura ou Empresa" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600">Objeto</label>
                <textarea value={formObjeto} onChange={e => setFormObjeto(e.target.value)} required className="w-full p-2 border rounded-lg text-sm" placeholder="Descrição do objeto" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setModalContratoAberto(false)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-semibold">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
