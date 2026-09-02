import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { Plus, Edit, Trash2, Save, Calendar, Truck, ArrowLeft, Clock, Printer, Eye } from 'lucide-react';

export const Route = createFileRoute('/_authenticated/medicoes')({
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
  valorHora: number;
}

interface MaquinaMedicao {
  id: string;
  mesId: string;
  codigo: string; 
  tipo: string; 
  operador: string;
  dias: DiaMedicao[];
}

export function MedicoesPage() {
  const [visao, setVisao] = useState<'contratos' | 'meses' | 'maquina'>('contratos');
  
  const [contratos, setContratos] = useState<Contrato[]>([
    { id: '1', numero: '48/2022', contratante: 'Prefeitura Municipal de Nova Serrana', objeto: 'Locação de Maquinário Pesado' },
    { id: '2', numero: '12/2024', contratante: 'Prefeitura Municipal de Betim', objeto: 'Serviços de Terraplanagem' }
  ]);

  const [meses, setMeses] = useState<MesAno[]>([
    { id: 'm1', contratoId: '1', nome: 'Agosto / 2026' },
    { id: 'm2', contratoId: '1', nome: 'Setembro / 2026' }
  ]);

  const [maquinas, setMaquinas] = useState<MaquinaMedicao[]>([
    {
      id: 'eq1',
      mesId: 'm1',
      codigo: 'RE23',
      tipo: 'Retroescavadeira',
      operador: 'Jeferson Pascoal Rocha',
      dias: Array.from({ length: 31 }, (_, i) => {
        const diaNum = i + 1;
        const dataStr = `${diaNum}-ago-26`;
        const diasSemana = ['sábado', 'domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira'];
        const diaSemana = diasSemana[(i + 6) % 7];
        const isFDS = diaSemana === 'sábado' || diaSemana === 'domingo';

        return {
          dia: diaNum,
          dataStr,
          diaSemana,
          manhaInicio: isFDS ? '' : '07:00',
          manhaFim: isFDS ? '' : '11:00',
          tardeInicio: isFDS ? '' : '12:00',
          tardeFim: isFDS ? '' : '17:00',
          observacao: '',
          valorHora: 193.62
        };
      })
    }
  ]);

  const [contratoSelecionado, setContratoSelecionado] = useState<Contrato | null>(null);
  const [mesSelecionado, setMesSelecionado] = useState<MesAno | null>(null);
  const [maquinaSelecionada, setMaquinaSelecionada] = useState<MaquinaMedicao | null>(null);

  const [modalContratoAberto, setModalContratoAberto] = useState(false);
  const [contratoEditando, setContratoEditando] = useState<Contrato | null>(null);
  const [formNumero, setFormNumero] = useState('');
  const [formContratante, setFormContratante] = useState('');
  const [formObjeto, setFormObjeto] = useState('');

  const handleSalvarContrato = (e: React.FormEvent) => {
    e.preventDefault();
    if (contratoEditando) {
      setContratos(contratos.map(c => c.id === contratoEditando.id ? {
        ...c,
        numero: formNumero,
        contratante: formContratante,
        objeto: formObjeto,
      } : c));
    } else {
      const novo: Contrato = {
        id: String(Date.now()),
        numero: formNumero,
        contratante: formContratante,
        objeto: formObjeto,
      };
      setContratos([...contratos, novo]);
    }
    fecharModalContrato();
  };

  const abrirModalCriar = () => {
    setContratoEditando(null);
    setFormNumero('');
    setFormContratante('');
    setFormObjeto('');
    setModalContratoAberto(true);
  };

  const abrirModalEditar = (c: Contrato, e: React.MouseEvent) => {
    e.stopPropagation();
    setContratoEditando(c);
    setFormNumero(c.numero);
    setFormContratante(c.contratante);
    setFormObjeto(c.objeto);
    setModalContratoAberto(true);
  };

  const deletarContrato = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Deseja realmente excluir este contrato?')) {
      setContratos(contratos.filter(c => c.id !== id));
    }
  };

  const deletarMes = (mesId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Deseja remover este mês e todos os lançamentos vinculados?')) {
      setMeses(meses.filter(m => m.id !== mesId));
      setMaquinas(maquinas.filter(eq => eq.mesId !== mesId));
    }
  };

  const fecharModalContrato = () => {
    setModalContratoAberto(false);
    setContratoEditando(null);
  };

  // Cálculo de Horas Simples (Ex: "07:00" às "11:00" = 4 horas)
  const calcularSubtotal = (inicio: string, fim: string) => {
    if (!inicio || !fim || !inicio.includes(':') || !fim.includes(':')) return 0;
    const [hIn, mIn] = inicio.split(':').map(Number);
    const [hFim, mFim] = fim.split(':').map(Number);
    const totalMin = (hFim * 60 + mFim) - (hIn * 60 + mIn);
    if (totalMin <= 0) return 0;
    return totalMin / 60;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-xl shadow-sm border border-gray-100 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Clock className="text-orange-500" /> Módulo de Medições e Contratos
          </h1>
          <p className="text-gray-500 text-sm">
            Gerencie seus contratos, meses e lançamentos diários de horas das máquinas.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {visao === 'meses' && (
            <button 
              onClick={() => setVisao('contratos')}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition"
            >
              <ArrowLeft size={16} /> Voltar aos Contratos
            </button>
          )}
          {visao === 'maquina' && (
            <button 
              onClick={() => setVisao('meses')}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition"
            >
              <ArrowLeft size={16} /> Voltar aos Meses
            </button>
          )}
          {visao === 'contratos' && (
            <button
              onClick={abrirModalCriar}
              className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition shadow-sm"
            >
              <Plus size={18} /> Novo Contrato
            </button>
          )}
        </div>
      </div>

      {/* TELA 1: CONTRATOS */}
      {visao === 'contratos' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {contratos.map(c => (
            <div 
              key={c.id}
              onClick={() => {
                setContratoSelecionado(c);
                setVisao('meses');
              }}
              className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:border-orange-500 cursor-pointer transition flex flex-col justify-between group"
            >
              <div>
                <div className="flex justify-between items-start mb-3">
                  <span className="bg-orange-100 text-orange-700 text-xs font-semibold px-2.5 py-1 rounded-md">
                    Contrato nº {c.numero}
                  </span>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                    <button onClick={(e) => abrirModalEditar(c, e)} className="p-1.5 text-gray-500 hover:text-blue-600 rounded" title="Editar">
                      <Edit size={16} />
                    </button>
                    <button onClick={(e) => deletarContrato(c.id, e)} className="p-1.5 text-gray-500 hover:text-red-600 rounded" title="Deletar">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <h3 className="font-bold text-gray-800 text-lg mb-1">{c.contratante}</h3>
                <p className="text-gray-500 text-sm mb-4">{c.objeto}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TELA 2: MESES */}
      {visao === 'meses' && contratoSelecionado && (
        <div className="space-y-6">
          <div className="bg-orange-50 border border-orange-200 p-4 rounded-xl flex justify-between items-center">
            <div>
              <span className="text-xs font-bold text-orange-600 uppercase tracking-wider">Contrato Ativo</span>
              <h2 className="text-lg font-bold text-gray-800">{contratoSelecionado.contratante} (Nº {contratoSelecionado.numero})</h2>
            </div>
            <button 
              onClick={() => {
                const nomeMes = prompt('Digite o mês e ano (Ex: Setembro / 2026):');
                if (nomeMes) {
                  setMeses([...meses, { id: String(Date.now()), contratoId: contratoSelecionado.id, nome: nomeMes }]);
                }
              }}
              className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
            >
              <Calendar size={16} /> Adicionar Mês
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {meses.filter(m => m.contratoId === contratoSelecionado.id).map(m => (
              <div 
                key={m.id}
                onClick={() => {
                  setMesSelecionado(m);
                  setVisao('maquina');
                }}
                className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 hover:border-orange-500 cursor-pointer transition flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-orange-100 text-orange-600 rounded-lg">
                    <Calendar size={22} />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-800">{m.nome}</h4>
                    <p className="text-xs text-gray-500">Ver medições das máquinas</p>
                  </div>
                </div>
                <button 
                  onClick={(e) => deletarMes(m.id, e)} 
                  className="p-2 text-gray-400 hover:text-red-600 rounded opacity-0 group-hover:opacity-100 transition"
                  title="Remover Mês"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TELA 3: PLANILHA DE LANÇAMENTO IDÊNTICA AO EXCEL */}
      {visao === 'maquina' && mesSelecionado && contratoSelecionado && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6 print:border-none print:p-0">
          <div className="flex justify-between items-center border-b pb-4 print:hidden">
            <div>
              <span className="text-xs text-orange-600 font-bold">{contratoSelecionado.contratante} | {mesSelecionado.nome}</span>
              <h2 className="text-xl font-bold text-gray-800">Apontamento de Horas das Máquinas</h2>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => window.print()}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm"
              >
                <Printer size={16} /> Imprimir / PDF
              </button>
              <button 
                onClick={() => alert('Alterações salvas com sucesso!')}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm"
              >
                <Save size={16} /> Salvar Alterações
              </button>
            </div>
          </div>

          {/* Abas das Máquinas */}
          <div className="flex gap-2 overflow-x-auto pb-2 print:hidden">
            {maquinas.filter(eq => eq.mesId === mesSelecionado.id).map((eq, index) => (
              <button
                key={eq.id}
                onClick={() => setMaquinaSelecionada(eq)}
                className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition ${
                  (maquinaSelecionada?.id === eq.id) || (!maquinaSelecionada && index === 0)
                    ? 'bg-orange-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {eq.codigo} - {eq.tipo}
              </button>
            ))}
            <button
              onClick={() => {
                const codigo = prompt('Código da Máquina (Ex: RE23):');
                const tipo = prompt('Tipo de Equipamento (Ex: Retroescavadeira):');
                const operador = prompt('Nome do Operador:');
                if (codigo && tipo) {
                  const novaReq: MaquinaMedicao = {
                    id: String(Date.now()),
                    mesId: mesSelecionado.id,
                    codigo,
                    tipo,
                    operador: operador || '',
                    dias: Array.from({ length: 31 }, (_, i) => ({
                      dia: i + 1,
                      dataStr: `${i + 1}-ago-26`,
                      diaSemana: 'segunda-feira',
                      manhaInicio: '', manhaFim: '', tardeInicio: '', tardeFim: '', observacao: '',
                      valorHora: 193.62
                    }))
                  };
                  setMaquinas([...maquinas, novaReq]);
                }
              }}
              className="px-4 py-2 rounded-lg font-medium text-sm bg-gray-100 text-gray-700 hover:bg-gray-200 flex items-center gap-1"
            >
              <Plus size={16} /> Nova Máquina
            </button>
          </div>

          {(() => {
            const maqAtiva = maquinaSelecionada || maquinas.find(eq => eq.mesId === mesSelecionado.id);
            if (!maqAtiva) return <p className="text-gray-500 py-8 text-center">Nenhuma máquina cadastrada neste mês.</p>;

            let totalGeralHoras = 0;
            let totalGeralValor = 0;

            return (
              <div className="space-y-4">
                {/* Cabeçalho padrão igual Excel */}
                <div className="border-2 border-gray-800 text-xs">
                  <div className="bg-gray-300 text-center font-bold py-1.5 border-b-2 border-gray-800 text-sm uppercase">
                    RESUMO DA MEDIÇÃO
                  </div>
                  <div className="grid grid-cols-2 border-b border-gray-800 p-1 font-semibold">
                    <div>CONTRATANTE: {contratoSelecionado.contratante.toUpperCase()}</div>
                    <div>CONTRATO: {contratoSelecionado.numero}</div>
                  </div>
                  <div className="grid grid-cols-2 p-1 font-semibold">
                    <div>EQUIPAMENTO: {maqAtiva.tipo.toUpperCase()} ({maqAtiva.codigo})</div>
                    <div>OPERADOR: {maqAtiva.operador.toUpperCase()}</div>
                  </div>
                </div>

                <div className="overflow-x-auto border-2 border-gray-800">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-gray-300 text-gray-900 border-b-2 border-gray-800 text-center font-bold">
                        <th className="p-2 border-r border-gray-800">Data</th>
                        <th className="p-2 border-r border-gray-800">Dia</th>
                        <th className="p-2 border-r border-gray-800" colSpan={3}>MANHÃ</th>
                        <th className="p-2 border-r border-gray-800" colSpan={3}>TARDE</th>
                        <th className="p-2 border-r border-gray-800">TOTAL DE HORAS</th>
                        <th className="p-2 border-r border-gray-800">VALOR TOTAL (R$)</th>
                        <th className="p-2">OBSERVAÇÃO</th>
                      </tr>
                      <tr className="bg-gray-200 text-gray-800 border-b-2 border-gray-800 text-center font-semibold">
                        <th className="p-1 border-r border-gray-800"></th>
                        <th className="p-1 border-r border-gray-800"></th>
                        <th className="p-1 border-r border-gray-800">INICIO</th>
                        <th className="p-1 border-r border-gray-800">FINAL</th>
                        <th className="p-1 border-r border-gray-800">SUBTOTAL</th>
                        <th className="p-1 border-r border-gray-800">INICIO</th>
                        <th className="p-1 border-r border-gray-800">FINAL</th>
                        <th className="p-1 border-r border-gray-800">SUBTOTAL</th>
                        <th className="p-1 border-r border-gray-800"></th>
                        <th className="p-1 border-r border-gray-800">R$ {maqAtiva.dias[0]?.valorHora.toFixed(2)}</th>
                        <th className="p-1"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {maqAtiva.dias.map((d, i) => {
                        const subManha = calcularSubtotal(d.manhaInicio, d.manhaFim);
                        const subTarde = calcularSubtotal(d.tardeInicio, d.tardeFim);
                        const totalHorasDia = subManha + subTarde;
                        const valorTotalDia = totalHorasDia * d.valorHora;

                        totalGeralHoras += totalHorasDia;
                        totalGeralValor += valorTotalDia;

                        const isFDS = d.diaSemana === 'sábado' || d.diaSemana === 'domingo';

                        return (
                          <tr key={i} className={`border-b border-gray-400 text-center ${isFDS ? 'bg-gray-300 font-medium' : 'hover:bg-gray-50'}`}>
                            <td className="p-1.5 border-r border-gray-400">{d.dataStr}</td>
                            <td className="p-1.5 border-r border-gray-400">{d.diaSemana}</td>
                            <td className="p-1 border-r border-gray-400">
                              <input 
                                type="text" 
                                value={d.manhaInicio} 
                                onChange={e => {
                                  const val = e.target.value;
                                  setMaquinas(maquinas.map(m => m.id === maqAtiva.id ? {
                                    ...m,
                                    dias: m.dias.map((diaItem, idx) => idx === i ? { ...diaItem, manhaInicio: val } : diaItem)
                                  } : m));
                                }}
                                className="w-16 p-1 text-center border rounded bg-white text-xs" 
                                placeholder="--:--" 
                              />
                            </td>
                            <td className="p-1 border-r border-gray-400">
                              <input 
                                type="text" 
                                value={d.manhaFim} 
                                onChange={e => {
                                  const val = e.target.value;
                                  setMaquinas(maquinas.map(m => m.id === maqAtiva.id ? {
                                    ...m,
                                    dias: m.dias.map((diaItem, idx) => idx === i ? { ...diaItem, manhaFim: val } : diaItem)
                                  } : m));
                                }}
                                className="w-16 p-1 text-center border rounded bg-white text-xs" 
                                placeholder="--:--" 
                              />
                            </td>
                            <td className="p-1.5 border-r border-gray-400 font-medium">{subManha.toFixed(2).replace('.', ',')}</td>
                            <td className="p-1 border-r border-gray-400">
                              <input 
                                type="text" 
                                value={d.tardeInicio} 
                                onChange={e => {
                                  const val = e.target.value;
                                  setMaquinas(maquinas.map(m => m.id === maqAtiva.id ? {
                                    ...m,
                                    dias: m.dias.map((diaItem, idx) => idx === i ? { ...diaItem, tardeInicio: val } : diaItem)
                                  } : m));
                                }}
                                className="w-16 p-1 text-center border rounded bg-white text-xs" 
                                placeholder="--:--" 
                              />
                            </td>
                            <td className="p-1 border-r border-gray-400">
                              <input 
                                type="text" 
                                value={d.tardeFim} 
                                onChange={e => {
                                  const val = e.target.value;
                                  setMaquinas(maquinas.map(m => m.id === maqAtiva.id ? {
                                    ...m,
                                    dias: m.dias.map((diaItem, idx) => idx === i ? { ...diaItem, tardeFim: val } : diaItem)
                                  } : m));
                                }}
                                className="w-16 p-1 text-center border rounded bg-white text-xs" 
                                placeholder="--:--" 
                              />
                            </td>
                            <td className="p-1.5 border-r border-gray-400 font-medium">{subTarde.toFixed(2).replace('.', ',')}</td>
                            <td className="p-1.5 border-r border-gray-400 font-bold">{totalHorasDia.toFixed(2).replace('.', ',')}</td>
                            <td className="p-1.5 border-r border-gray-400 font-bold text-green-700">R$ {valorTotalDia.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                            <td className="p-1">
                              <input 
                                type="text" 
                                value={d.observacao} 
                                onChange={e => {
                                  const val = e.target.value;
                                  setMaquinas(maquinas.map(m => m.id === maqAtiva.id ? {
                                    ...m,
                                    dias: m.dias.map((diaItem, idx) => idx === i ? { ...diaItem, observacao: val } : diaItem)
                                  } : m));
                                }}
                                className="w-full p-1 border rounded text-xs bg-white" 
                                placeholder="Ex: Parado Prefeitura" 
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gray-300 font-bold text-center border-t-2 border-gray-800 text-xs">
                        <td className="p-2 border-r border-gray-800" colSpan={4}>TOTAL GERAL</td>
                        <td className="p-2 border-r border-gray-800">{maqAtiva.dias.reduce((acc, d) => acc + calcularSubtotal(d.manhaInicio, d.manhaFim), 0).toFixed(2).replace('.', ',')}</td>
                        <td className="p-2 border-r border-gray-800" colSpan={2}></td>
                        <td className="p-2 border-r border-gray-800">{maqAtiva.dias.reduce((acc, d) => acc + calcularSubtotal(d.tardeInicio, d.tardeFim), 0).toFixed(2).replace('.', ',')}</td>
                        <td className="p-2 border-r border-gray-800">{totalGeralHoras.toFixed(2).replace('.', ',')}</td>
                        <td className="p-2 border-r border-gray-800 text-green-800">R$ {totalGeralValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {modalContratoAberto && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-lg w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-800">
              {contratoEditando ? 'Editar Contrato' : 'Cadastrar Novo Contrato'}
            </h3>
            <form onSubmit={handleSalvarContrato} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Número do Contrato</label>
                <input type="text" value={formNumero} onChange={e => setFormNumero(e.target.value)} required className="w-full p-2 border rounded-lg" placeholder="Ex: 48/2022" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contratante (Cliente / Prefeitura)</label>
                <input type="text" value={formContratante} onChange={e => setFormContratante(e.target.value)} required className="w-full p-2 border rounded-lg" placeholder="Ex: Prefeitura Municipal de Nova Serrana" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Objeto do Contrato</label>
                <input type="text" value={formObjeto} onChange={e => setFormObjeto(e.target.value)} className="w-full p-2 border rounded-lg" placeholder="Ex: Locação de Maquinário Pesado" />
              </div>
              <div className="flex justify-end gap-2 pt-4 border-t">
                <button type="button" onClick={fecharModalContrato} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium">
                  Cancelar
                </button>
                <button type="submit" className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-medium">
                  Salvar Contrato
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
