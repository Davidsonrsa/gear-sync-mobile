import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { Plus, Edit, Trash2, Save, Calendar, ArrowLeft, Clock, Printer } from 'lucide-react';

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
  ano: number;
  mesIndex: number; // 0 a 11
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
  dias: DiaMedicao[];
}

export function MedicoesPage() {
  const [visao, setVisao] = useState<'contratos' | 'meses' | 'maquina'>('contratos');
  
  const [contratos, setContratos] = useState<Contrato[]>([
    { id: '1', numero: '48/2022', contratante: 'Prefeitura Municipal de Nova Serrana', objeto: 'Locação de Maquinário Pesado' },
  ]);

  const [meses, setMeses] = useState<MesAno[]>([
    { id: 'm1', contratoId: '1', nome: 'Agosto', ano: 2026, mesIndex: 7 }
  ]);

  const gerarDiasDoMes = (ano: number, mesIndex: number) => {
    const quantidadeDias = new Date(ano, mesIndex + 1, 0).getDate();
    const diasSemanaNomes = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
    const mesesCurtos = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

    return Array.from({ length: quantidadeDias }, (_, i) => {
      const diaNum = i + 1;
      const dataObj = new Date(ano, mesIndex, diaNum);
      const diaSemana = diasSemanaNomes[dataObj.getDay()];
      const dataStr = `${diaNum}-${mesesCurtos[mesIndex]}-${String(ano).slice(2)}`;
      const isFDS = dataObj.getDay() === 0 || dataObj.getDay() === 6;

      return {
        dia: diaNum,
        dataStr,
        diaSemana,
        manhaInicio: isFDS ? '' : '07:00',
        manhaFim: isFDS ? '' : '11:00',
        tardeInicio: isFDS ? '' : '12:00',
        tardeFim: isFDS ? '' : '17:00',
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
      operador: 'Jeferson Pascoal Rocha',
      valorHora: 193.62,
      dias: gerarDiasDoMes(2026, 7)
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
      setContratos(contratos.map(c => c.id === contratoEditando.id ? { ...c, numero: formNumero, contratante: formContratante, objeto: formObjeto } : c));
    } else {
      setContratos([...contratos, { id: String(Date.now()), numero: formNumero, contratante: formContratante, objeto: formObjeto }]);
    }
    setModalContratoAberto(false);
  };

  const calcularSubtotal = (inicio: string, fim: string) => {
    if (!inicio || !fim || !inicio.includes(':') || !fim.includes(':')) return 0;
    const [hIn, mIn] = inicio.split(':').map(Number);
    const [hFim, mFim] = fim.split(':').map(Number);
    const totalMin = (hFim * 60 + mFim) - (hIn * 60 + mIn);
    return totalMin > 0 ? totalMin / 60 : 0;
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6 print:p-0 print:space-y-2">
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

      {visao === 'contratos' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {contratos.map(c => (
            <div key={c.id} onClick={() => { setContratoSelecionado(c); setVisao('meses'); }} className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 hover:border-orange-500 cursor-pointer transition">
              <span className="bg-orange-100 text-orange-700 text-xs font-semibold px-2 py-0.5 rounded">Contrato nº {c.numero}</span>
              <h3 className="font-bold text-gray-800 mt-2">{c.contratante}</h3>
              <p className="text-gray-500 text-xs mt-1">{c.objeto}</p>
            </div>
          ))}
        </div>
      )}

      {visao === 'meses' && contratoSelecionado && (
        <div className="space-y-4">
          <div className="bg-orange-50 border border-orange-200 p-4 rounded-xl flex justify-between items-center">
            <div>
              <span className="text-xs font-bold text-orange-600 uppercase">Contrato Ativo</span>
              <h2 className="text-md font-bold text-gray-800">{contratoSelecionado.contratante} (Nº {contratoSelecionado.numero})</h2>
            </div>
            <button onClick={() => {
              const nomeMes = prompt('Nome do Mês (Ex: Setembro):');
              const anoStr = prompt('Ano (Ex: 2026):', '2026');
              const mesIdxStr = prompt('Número do Mês de 1 a 12 (Ex: 9 para Setembro):', '9');
              if (nomeMes && anoStr && mesIdxStr) {
                const ano = Number(anoStr);
                const mesIndex = Number(mesIdxStr) - 1;
                const novoMesId = String(Date.now());
                setMeses([...meses, { id: novoMesId, contratoId: contratoSelecionado.id, nome: nomeMes, ano, mesIndex }]);
                setMaquinas([...maquinas, {
                  id: 'eq_' + novoMesId,
                  mesId: novoMesId,
                  codigo: 'RE01',
                  tipo: 'Retroescavadeira',
                  operador: 'Não informado',
                  valorHora: 193.62,
                  dias: gerarDiasDoMes(ano, mesIndex)
                }]);
              }
            }} className="bg-orange-600 text-white px-3 py-1.5 rounded-lg text-sm flex items-center gap-1">
              <Calendar size={16} /> Adicionar Mês
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {meses.filter(m => m.contratoId === contratoSelecionado.id).map(m => (
              <div key={m.id} onClick={() => { setMesSelecionado(m); setVisao('maquina'); }} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 hover:border-orange-500 cursor-pointer flex items-center justify-between group">
                <div className="flex items-center gap-2">
                  <Calendar className="text-orange-500" size={20} />
                  <div>
                    <h4 className="font-bold text-gray-800 text-sm">{m.nome} / {m.ano}</h4>
                  </div>
                </div>
                <button onClick={(e) => { e.stopPropagation(); if(confirm('Excluir mês?')) { setMeses(meses.filter(x => x.id !== m.id)); } }} className="text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {visao === 'maquina' && mesSelecionado && contratoSelecionado && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 space-y-4 print:border-none print:p-0">
          <div className="flex justify-between items-center border-b pb-3 print:hidden">
            <h2 className="text-lg font-bold text-gray-800">Apontamento - {mesSelecionado.nome} de {mesSelecionado.ano}</h2>
            <div className="flex gap-2">
              <button onClick={() => window.print()} className="flex items-center gap-1 bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm">
                <Printer size={16} /> Imprimir A4
              </button>
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 print:hidden">
            {maquinas.filter(eq => eq.mesId === mesSelecionado.id).map((eq, index) => (
              <button key={eq.id} onClick={() => setMaquinaSelecionada(eq)} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${ (maquinaSelecionada?.id === eq.id) || (!maquinaSelecionada && index === 0) ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-700'}`}>
                {eq.codigo} - {eq.tipo}
              </button>
            ))}
          </div>

          {(() => {
            const maqAtiva = maquinaSelecionada || maquinas.find(eq => eq.mesId === mesSelecionado.id);
            if (!maqAtiva) return <p className="text-gray-500 text-center py-4">Nenhuma máquina cadastrada.</p>;

            let totalGeralHoras = 0;
            let totalGeralValor = 0;

            return (
              <div className="space-y-3 print:space-y-1">
                {/* Cabeçalho compacto para caber perfeitamente em 1 folha A4 */}
                <div className="border border-gray-800 text-[10px] print:text-[9px]">
                  <div className="bg-gray-200 text-center font-bold py-1 border-b border-gray-800 uppercase">
                    CONTROLE DE MEDIÇÃO DE HORAS - {mesSelecionado.nome.toUpperCase()} / {mesSelecionado.ano}
                  </div>
                  <div className="grid grid-cols-2 border-b border-gray-800 p-1 font-semibold">
                    <div>CONTRATANTE: {contratoSelecionado.contratante.toUpperCase()}</div>
                    <div>CONTRATO Nº: {contratoSelecionado.numero}</div>
                  </div>
                  <div className="grid grid-cols-3 p-1 font-semibold items-center">
                    <div>EQUIPAMENTO: {maqAtiva.tipo.toUpperCase()} ({maqAtiva.codigo})</div>
                    <div>OPERADOR: {maqAtiva.operador.toUpperCase()}</div>
                    <div className="flex items-center gap-1 justify-end print:block">
                      <span>VALOR HORA (R$):</span>
                      <input 
                        type="number" 
                        step="0.01" 
                        value={maqAtiva.valorHora} 
                        onChange={e => {
                          const val = Number(e.target.value);
                          setMaquinas(maquinas.map(m => m.id === maqAtiva.id ? { ...m, valorHora: val } : m));
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
                        <th className="p-1 border-r border-gray-800" colSpan={3}>MANHÃ</th>
                        <th className="p-1 border-r border-gray-800" colSpan={3}>TARDE</th>
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
                        <th className="p-0.5 border-r border-gray-800">R$ {maqAtiva.valorHora.toFixed(2)}</th>
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

                        const isFDS = d.diaSemana === 'sábado' || d.diaSemana === 'domingo';

                        return (
                          <tr key={i} className={`border-b border-gray-300 text-center ${isFDS ? 'bg-gray-100' : ''}`}>
                            <td className="p-0.5 border-r border-gray-300">{d.dataStr}</td>
                            <td className="p-0.5 border-r border-gray-300">{d.diaSemana}</td>
                            <td className="p-0.5 border-r border-gray-300">
                              <input type="text" value={d.manhaInicio} onChange={e => {
                                const val = e.target.value;
                                setMaquinas(maquinas.map(m => m.id === maqAtiva.id ? { ...m, dias: m.dias.map((di, idx) => idx === i ? { ...di, manhaInicio: val } : di) } : m));
                              }} className="w-12 p-0.5 text-center border rounded bg-white text-[10px] print:border-none" />
                            </td>
                            <td className="p-0.5 border-r border-gray-300">
                              <input type="text" value={d.manhaFim} onChange={e => {
                                const val = e.target.value;
                                setMaquinas(maquinas.map(m => m.id === maqAtiva.id ? { ...m, dias: m.dias.map((di, idx) => idx === i ? { ...di, manhaFim: val } : di) } : m));
                              }} className="w-12 p-0.5 text-center border rounded bg-white text-[10px] print:border-none" />
                            </td>
                            <td className="p-0.5 border-r border-gray-300">{subManha > 0 ? subManha.toFixed(2) : ''}</td>
                            <td className="p-0.5 border-r border-gray-300">
                              <input type="text" value={d.tardeInicio} onChange={e => {
                                const val = e.target.value;
                                setMaquinas(maquinas.map(m => m.id === maqAtiva.id ? { ...m, dias: m.dias.map((di, idx) => idx === i ? { ...di, tardeInicio: val } : di) } : m));
                              }} className="w-12 p-0.5 text-center border rounded bg-white text-[10px] print:border-none" />
                            </td>
                            <td className="p-0.5 border-r border-gray-300">
                              <input type="text" value={d.tardeFim} onChange={e => {
                                const val = e.target.value;
                                setMaquinas(maquinas.map(m => m.id === maqAtiva.id ? { ...m, dias: m.dias.map((di, idx) => idx === i ? { ...di, tardeFim: val } : di) } : m));
                              }} className="w-12 p-0.5 text-center border rounded bg-white text-[10px] print:border-none" />
                            </td>
                            <td className="p-0.5 border-r border-gray-300">{subTarde > 0 ? subTarde.toFixed(2) : ''}</td>
                            <td className="p-0.5 border-r border-gray-300 font-bold">{totalHorasDia > 0 ? totalHorasDia.toFixed(2) : ''}</td>
                            <td className="p-0.5 border-r border-gray-300 text-green-700">{valorTotalDia > 0 ? valorTotalDia.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : ''}</td>
                            <td className="p-0.5">
                              <input type="text" value={d.observacao} onChange={e => {
                                const val = e.target.value;
                                setMaquinas(maquinas.map(m => m.id === maqAtiva.id ? { ...m, dias: m.dias.map((di, idx) => idx === i ? { ...di, observacao: val } : di) } : m));
                              }} className="w-full p-0.5 border rounded text-[10px] bg-white print:border-none" />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gray-200 font-bold text-center border-t border-gray-800 text-[10px]">
                        <td className="p-1 border-r border-gray-800" colSpan={4}>TOTAL GERAL</td>
                        <td className="p-1 border-r border-gray-800"></td>
                        <td className="p-1 border-r border-gray-800" colSpan={2}></td>
                        <td className="p-1 border-r border-gray-800"></td>
                        <td className="p-1 border-r border-gray-800">{totalGeralHoras.toFixed(2)}</td>
                        <td className="p-1 border-r border-gray-800 text-green-800">R$ {totalGeralValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
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
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-800">Novo Contrato</h3>
            <form onSubmit={handleSalvarContrato} className="space-y-3">
              <input type="text" value={formNumero} onChange={e => setFormNumero(e.target.value)} required className="w-full p-2 border rounded text-sm" placeholder="Número do Contrato (Ex: 48/2022)" />
              <input type="text" value={formContratante} onChange={e => setFormContratante(e.target.value)} required className="w-full p-2 border rounded text-sm" placeholder="Contratante (Ex: Prefeitura)" />
              <input type="text" value={formObjeto} onChange={e => setFormObjeto(e.target.value)} className="w-full p-2 border rounded text-sm" placeholder="Objeto" />
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setModalContratoAberto(false)} className="px-3 py-1.5 bg-gray-100 rounded text-sm">Cancelar</button>
                <button type="submit" className="px-3 py-1.5 bg-orange-600 text-white rounded text-sm">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
