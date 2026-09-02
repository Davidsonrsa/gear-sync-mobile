import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { Plus, Edit, Trash2, Save, Calendar, Truck, ArrowLeft, Clock } from 'lucide-react';

// Exemplo de rota para o TanStack Router
export const Route = createFileRoute('/_authenticated/medicoes')({
  component: MedicoesPage,
});

interface Contrato {
  id: string;
  numero: string;
  contratante: string;
  objeto: string;
  valorHoraPadrao: number;
}

interface MesAno {
  id: string;
  contratoId: string;
  nome: string; // Ex: "Agosto/2026"
}

interface MaquinaMedicao {
  id: string;
  mesId: string;
  codigo: string; // Ex: "PC03"
  tipo: string; // Ex: "Pá Carregadeira"
  operador: string;
  dias: {
    dia: number;
    dataStr: string;
    diaSemana: string;
    manhaInicio: string;
    manhaFim: string;
    tardeInicio: string;
    tardeFim: string;
    observacao: string;
  }[];
}

export function MedicoesPage() {
  // Estados de navegação interna ("contratos" | "meses" | "maquina")
  const [visao, setVisao] = useState<'contratos' | 'meses' | 'maquina'>('contratos');
  
  // Estados de Dados (Simulando banco/localStorage)
  const [contratos, setContratos] = useState<Contrato[]>([
    { id: '1', numero: '48/2022', contratante: 'Prefeitura Municipal de Nova Serrana', objeto: 'Locação de Maquinário Pesado', valorHoraPadrao: 202.83 },
    { id: '2', numero: '12/2024', contratante: 'Prefeitura Municipal de Betim', objeto: 'Serviços de Terraplanagem', valorHoraPadrao: 190.00 }
  ]);

  const [meses, setMeses] = useState<MesAno[]>([
    { id: 'm1', contratoId: '1', nome: 'Agosto / 2026' },
    { id: 'm2', contratoId: '1', nome: 'Setembro / 2026' }
  ]);

  const [maquinas, setMaquinas] = useState<MaquinaMedicao[]>([
    {
      id: 'eq1',
      mesId: 'm1',
      codigo: 'PC03',
      tipo: 'Pá Carregadeira',
      operador: 'Vandeir',
      dias: Array.from({ length: 31 }, (_, i) => ({
        dia: i + 1,
        dataStr: `${i + 1}-ago-26`,
        diaSemana: ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'][(i + 6) % 7],
        manhaInicio: i === 2 || i === 3 ? '07:00' : '',
        manhaFim: i === 2 || i === 3 ? '11:00' : '',
        tardeInicio: i === 2 || i === 3 ? '12:00' : '',
        tardeFim: i === 2 || i === 3 ? '16:00' : '',
        observacao: i === 5 ? 'Parado Prefeitura' : ''
      }))
    }
  ]);

  // Contrato Selecionado Atual
  const [contratoSelecionado, setContratoSelecionado] = useState<Contrato | null>(null);
  const [mesSelecionado, setMesSelecionado] = useState<MesAno | null>(null);
  const [maquinaSelecionada, setMaquinaSelecionada] = useState<MaquinaMedicao | null>(null);

  // Estados para Modal / Formulário de Contrato
  const [modalContratoAberto, setModalContratoAberto] = useState(false);
  const [contratoEditando, setContratoEditando] = useState<Contrato | null>(null);
  const [formNumero, setFormNumero] = useState('');
  const [formContratante, setFormContratante] = useState('');
  const [formObjeto, setFormObjeto] = useState('');
  const [formValorHora, setFormValorHora] = useState('');

  // Salvar / Criar / Editar Contrato
  const handleSalvarContrato = (e: React.FormEvent) => {
    e.preventDefault();
    if (contratoEditando) {
      setContratos(contratos.map(c => c.id === contratoEditando.id ? {
        ...c,
        numero: formNumero,
        contratante: formContratante,
        objeto: formObjeto,
        valorHoraPadrao: Number(formValorHora)
      } : c));
    } else {
      const novo: Contrato = {
        id: String(Date.now()),
        numero: formNumero,
        contratante: formContratante,
        objeto: formObjeto,
        valorHoraPadrao: Number(formValorHora)
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
    setFormValorHora('');
    setModalContratoAberto(true);
  };

  const abrirModalEditar = (c: Contrato, e: React.MouseEvent) => {
    e.stopPropagation();
    setContratoEditando(c);
    setFormNumero(c.numero);
    setFormContratante(c.contratante);
    setFormObjeto(c.objeto);
    setFormValorHora(String(c.valorHoraPadrao));
    setModalContratoAberto(true);
  };

  const deletarContrato = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Deseja realmente excluir este contrato?')) {
      setContratos(contratos.filter(c => c.id !== id));
    }
  };

  const fecharModalContrato = () => {
    setModalContratoAberto(false);
    setContratoEditando(null);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Clock className="text-orange-500" /> Módulo de Medições e Contratos
          </h1>
          <p className="text-gray-500 text-sm">
            Gerencie seus contratos, meses e lançamentos diários de horas das máquinas.
          </p>
        </div>

        {/* Breadcrumb / Botão Voltar */}
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

      {/* TELA 1: LISTA DE CONTRATOS */}
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
                    <button 
                      onClick={(e) => abrirModalEditar(c, e)} 
                      className="p-1.5 text-gray-500 hover:text-blue-600 rounded"
                      title="Editar"
                    >
                      <Edit size={16} />
                    </button>
                    <button 
                      onClick={(e) => deletarContrato(c.id, e)} 
                      className="p-1.5 text-gray-500 hover:text-red-600 rounded"
                      title="Deletar"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <h3 className="font-bold text-gray-800 text-lg mb-1">{c.contratante}</h3>
                <p className="text-gray-500 text-sm mb-4">{c.objeto}</p>
              </div>

              <div className="pt-4 border-t border-gray-100 flex justify-between items-center text-sm">
                <span className="text-gray-500">Valor Hora Padrão:</span>
                <span className="font-bold text-gray-800">R$ {c.valorHoraPadrao.toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TELA 2: MESES DO CONTRATO SELECIONADO */}
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
                className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 hover:border-orange-500 cursor-pointer transition flex items-center justify-between"
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
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TELA 3: ABAS DE MÁQUINAS E APONTAMENTOS */}
      {visao === 'maquina' && mesSelecionado && contratoSelecionado && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
          <div className="flex justify-between items-center border-b pb-4">
            <div>
              <span className="text-xs text-orange-600 font-bold">{contratoSelecionado.contratante} | {mesSelecionado.nome}</span>
              <h2 className="text-xl font-bold text-gray-800">Apontamento de Horas das Máquinas</h2>
            </div>
            <button 
              onClick={() => {
                const codigo = prompt('Código da Máquina (Ex: RE21, PC03):');
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
                      manhaInicio: '', manhaFim: '', tardeInicio: '', tardeFim: '', observacao: ''
                    }))
                  };
                  setMaquinas([...maquinas, novaReq]);
                }
              }}
              className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
            >
              <Truck size={16} /> Nova Máquina / Aba
            </button>
          </div>

          {/* Abas das Máquinas */}
          <div className="flex gap-2 overflow-x-auto pb-2">
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
          </div>

          {/* Tabela de Lançamento Diário da Máquina Ativa */}
          {(() => {
            const maqAtiva = maquinaSelecionada || maquinas.find(eq => eq.mesId === mesSelecionado.id);
            if (!maqAtiva) return <p className="text-gray-500 py-8 text-center">Nenhuma máquina cadastrada neste mês.</p>;

            return (
              <div className="space-y-4">
                <div className="flex justify-between items-center bg-gray-50 p-4 rounded-lg">
                  <div>
                    <span className="text-sm font-bold text-gray-700">Equipamento: {maqAtiva.codigo} ({maqAtiva.tipo})</span>
                    <span className="block text-xs text-gray-500">Operador: {maqAtiva.operador || 'Não informado'}</span>
                  </div>
                  <button 
                    onClick={() => alert('Medição salva com sucesso!')}
                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm"
                  >
                    <Save size={16} /> Salvar Alterações
                  </button>
                </div>

                <div className="overflow-x-auto border border-gray-200 rounded-lg">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="bg-gray-100 text-gray-700 border-b">
                        <th className="p-3 border-r">Data</th>
                        <th className="p-3 border-r">Dia da Semana</th>
                        <th className="p-3 border-r text-center" colSpan={3}>Manhã</th>
                        <th className="p-3 border-r text-center" colSpan={3}>Tarde</th>
                        <th className="p-3 border-r text-center">Total Horas</th>
                        <th className="p-3 border-r text-center">Valor Total (R$)</th>
                        <th className="p-3">Observação</th>
                      </tr>
                      <tr className="bg-gray-50 text-xs text-gray-500 border-b">
                        <th className="p-2 border-r"></th>
                        <th className="p-2 border-r"></th>
                        <th className="p-2 border-r text-center">Início</th>
                        <th className="p-2 border-r text-center">Fim</th>
                        <th className="p-2 border-r text-center">Subtotal</th>
                        <th className="p-2 border-r text-center">Início</th>
                        <th className="p-2 border-r text-center">Fim</th>
                        <th className="p-2 border-r text-center">Subtotal</th>
                        <th className="p-2 border-r"></th>
                        <th className="p-2 border-r"></th>
                        <th className="p-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {maqAtiva.dias.map((d, i) => (
                        <tr key={i} className="border-b hover:bg-gray-50">
                          <td className="p-3 border-r font-medium text-gray-800">{d.dataStr}</td>
                          <td className="p-3 border-r text-gray-500">{d.diaSemana}</td>
                          <td className="p-2 border-r text-center"><input type="text" defaultValue={d.manhaInicio} className="w-16 p-1 text-center border rounded" placeholder="--:--" /></td>
                          <td className="p-2 border-r text-center"><input type="text" defaultValue={d.manhaFim} className="w-16 p-1 text-center border rounded" placeholder="--:--" /></td>
                          <td className="p-2 border-r text-center font-medium bg-gray-50">4,00</td>
                          <td className="p-2 border-r text-center"><input type="text" defaultValue={d.tardeInicio} className="w-16 p-1 text-center border rounded" placeholder="--:--" /></td>
                          <td className="p-2 border-r text-center"><input type="text" defaultValue={d.tardeFim} className="w-16 p-1 text-center border rounded" placeholder="--:--" /></td>
                          <td className="p-2 border-r text-center font-medium bg-gray-50">4,00</td>
                          <td className="p-2 border-r text-center font-bold text-gray-800 bg-gray-50">8,00</td>
                          <td className="p-2 border-r text-center font-bold text-green-600 bg-gray-50">R$ 1.622,64</td>
                          <td className="p-2"><input type="text" defaultValue={d.observacao} className="w-full p-1 border rounded text-xs" placeholder="Ex: Parado Prefeitura" /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* MODAL DE CADASTRO/EDIÇÃO DE CONTRATO */}
      {modalContratoAberto && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-lg w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-800">
              {contratoEditando ? 'Editar Contrato' : 'Cadastrar Novo Contrato'}
            </h3>
            <form onSubmit={handleSalvarContrato} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Número do Contrato</label>
                <input 
                  type="text" 
                  value={formNumero} 
                  onChange={e => setFormNumero(e.target.value)} 
                  required 
                  className="w-full p-2 border rounded-lg"
                  placeholder="Ex: 48/2022" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contratante (Cliente / Prefeitura)</label>
                <input 
                  type="text" 
                  value={formContratante} 
                  onChange={e => setFormContratante(e.target.value)} 
                  required 
                  className="w-full p-2 border rounded-lg"
                  placeholder="Ex: Prefeitura Municipal de Nova Serrana" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Objeto do Contrato</label>
                <input 
                  type="text" 
                  value={formObjeto} 
                  onChange={e => setFormObjeto(e.target.value)} 
                  className="w-full p-2 border rounded-lg"
                  placeholder="Ex: Locação de Maquinário Pesado" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Valor Hora Padrão (R$)</label>
                <input 
                  type="number" 
                  step="0.01" 
                  value={formValorHora} 
                  onChange={e => setFormValorHora(e.target.value)} 
                  required 
                  className="w-full p-2 border rounded-lg"
                  placeholder="202.83" 
                />
              </div>
              <div className="flex justify-end gap-2 pt-4 border-t">
                <button 
                  type="button" 
                  onClick={fecharModalContrato}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-medium"
                >
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
