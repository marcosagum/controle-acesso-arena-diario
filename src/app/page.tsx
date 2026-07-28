'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect, useTransition } from 'react';
import { 
  getColaboradoresComStatus, 
  realizarCheckIn, 
  realizarCheckOut, 
  ColaboradorComStatus 
} from './actions';
import ModalCheckIn from '@/components/ModalCheckIn';
import ModalCheckOut from '@/components/ModalCheckOut';

export default function CcoConsoleLive() {
  const router = useRouter();
  const [colaboradores, setColaboradores] = useState<ColaboradorComStatus[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedColab, setSelectedColab] = useState<ColaboradorComStatus | null>(null);
  const [isCheckInOpen, setIsCheckInOpen] = useState(false);
  const [isCheckOutOpen, setIsCheckOutOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const loadData = () => {
    startTransition(async () => {
      try {
        const data = await getColaboradoresComStatus(searchQuery);
        setColaboradores(data);
      } catch (err) {
        console.error(err);
      }
    });
  };

  // Carregar dados iniciais e quando a busca mudar
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      loadData();
    }, 300); // Debounce de 300ms na busca para otimização de consultas

    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  // Ações de confirmação
  const handleConfirmCheckIn = async (operadorEntrada: string, descricaoServico: string) => {
    if (!selectedColab) return;
    await realizarCheckIn(selectedColab.id, operadorEntrada, descricaoServico);
    loadData(); // Recarregar lista
  };

  const handleConfirmCheckOut = async (operadorSaida: string, servicosExtras: string) => {
    if (!selectedColab) return;
    await realizarCheckOut(selectedColab.id, operadorSaida, servicosExtras);
    loadData(); // Recarregar lista
  };

  // Agrupar colaboradores por Empresa
  const colaboradoresPorEmpresa = colaboradores.reduce((acc, colab) => {
    const empresaNome = colab.empresa.nome;
    if (!acc[empresaNome]) {
      acc[empresaNome] = [];
    }
    acc[empresaNome].push(colab);
    return acc;
  }, {} as Record<string, ColaboradorComStatus[]>);

  // Estatísticas do dia
  const totalPresentes = colaboradores.filter(c => c.status === 'DENTRO').length;
  
  // Vamos inferir os check-ins hoje: pessoas que estão DENTRO ou pessoas que saíram hoje.
  // Como simplificação, mostramos o número de pessoas ativas neste momento + saídas simuladas.
  const totalCheckInsHoje = colaboradores.filter(c => c.status === 'DENTRO').length;

  return (
    <div className="flex flex-col gap-8 animate-[fadeIn_0.4s_ease-out]">
      {/* Grid de Estatísticas Rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card Presentes na Arena (Interativo, Glow Vermelho Glassmorphism, Sem Bolinha Pulsante, Degradê sob o número) */}
        <div 
          onClick={() => router.push('/auditoria?status=DENTRO')}
          className="glass-card p-6 flex items-center justify-between shadow-[0_8px_32px_rgba(255,26,60,0.08)] border-[rgba(255,26,60,0.15)] hover:border-[rgba(255,26,60,0.35)] hover:shadow-[0_8px_32px_rgba(255,26,60,0.18)] transition-all duration-300 cursor-pointer hover:scale-[1.01]"
        >
          <div className="flex flex-col gap-1">
            <span className="text-[12px] font-bold uppercase tracking-[1px] text-slate-400">Presentes na Arena</span>
            <div className="flex flex-col mt-1">
              <span className="text-[32px] font-black text-white leading-none">
                {totalPresentes}
              </span>
              {/* Degradê vermelho suave debaixo do número */}
              <div className="w-12 h-[3px] bg-gradient-to-r from-[#ff1a3c] via-[rgba(255,26,60,0.4)] to-transparent rounded-full mt-2 filter blur-[0.5px]"></div>
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[rgba(255,26,60,0.1)] border border-[rgba(255,26,60,0.15)] flex items-center justify-center">
            <span className="material-symbols-outlined text-[var(--accent-red)] text-[24px]">group</span>
          </div>
        </div>

        {/* Card Acessos Ativos Hoje (Interativo, redireciona para histórico completo) */}
        <div 
          onClick={() => router.push('/auditoria?status=TODOS')}
          className="glass-card p-6 flex items-center justify-between shadow-[0_8px_32px_rgba(6,182,212,0.02)] border-[rgba(255,255,255,0.04)] hover:border-cyan-500/20 hover:shadow-[0_8px_32px_rgba(6,182,212,0.08)] transition-all duration-300 cursor-pointer hover:scale-[1.01]"
        >
          <div className="flex flex-col gap-1">
            <span className="text-[12px] font-bold uppercase tracking-[1px] text-slate-400">Acessos Ativos Hoje</span>
            <span className="text-[32px] font-black text-cyan-400 leading-none mt-1">
              {totalCheckInsHoje}
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-cyan-950/40 border border-cyan-800/30 flex items-center justify-center">
            <span className="material-symbols-outlined text-cyan-400 text-[24px]">login</span>
          </div>
        </div>

        {/* Card Status Geral Arena (Não interativo) */}
        <div className="glass-card p-6 flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <span className="text-[12px] font-bold uppercase tracking-[1px] text-slate-400">Status Geral Arena</span>
            <span className="text-[16px] font-bold text-[var(--status-active)] leading-none mt-2 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px]">verified</span>
              Operação Normal
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-950/40 border border-emerald-800/30 flex items-center justify-center">
            <span className="material-symbols-outlined text-[var(--status-active)] text-[24px]">security</span>
          </div>
        </div>
      </div>

      {/* Seção de Filtros e Busca Rápida */}
      <div className="w-full flex flex-col md:flex-row gap-4 items-center justify-between glass-card p-5 bg-[rgba(12,18,43,0.5)] border-[rgba(255,255,255,0.02)]">
        <div className="relative w-full md:max-w-md">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-[20px]">search</span>
          <input
            type="text"
            placeholder="Buscar por nome, CPF ou empresa..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(5,8,18,0.7)] text-white text-[14px] placeholder-slate-500 focus:border-[var(--accent-red)] focus:ring-1 focus:ring-[var(--accent-red)] transition-all"
          />
        </div>

        <div className="flex gap-3 shrink-0">
          <button 
            onClick={loadData}
            className="flex items-center gap-2 px-4 py-3 rounded-2xl border border-[rgba(255,255,255,0.06)] bg-transparent text-slate-400 hover:text-white hover:border-slate-600 transition-all text-[13px] font-bold"
          >
            <span className={`material-symbols-outlined text-[18px] ${isPending ? 'animate-spin' : ''}`}>sync</span>
            Atualizar Grade
          </button>
        </div>
      </div>

      {/* Grid Central de Colaboradores Agrupados por Empresa */}
      {Object.keys(colaboradoresPorEmpresa).length === 0 ? (
        <div className="glass-card p-12 text-center flex flex-col items-center gap-4 max-w-lg mx-auto shadow-[0_10px_35px_rgba(255,26,60,0.05)] border-[rgba(255,26,60,0.1)]">
          <span className="material-symbols-outlined text-[48px] text-[var(--accent-red)] animate-pulse">person_search</span>
          <div>
            <h3 className="text-[16px] font-bold text-white">Pessoa não cadastrada no sistema</h3>
            <p className="text-[13px] text-slate-400 mt-1.5 leading-relaxed">
              O termo <strong className="text-white">"{searchQuery || 'digitado'}"</strong> não corresponde a nenhum colaborador ou CPF cadastrado.
            </p>
          </div>
          <button
            onClick={() => {
              const isCpf = /^\d+$/.test(searchQuery.replace(/\D/g, ''));
              if (isCpf) {
                router.push(`/colaboradores?cpf=${encodeURIComponent(searchQuery)}`);
              } else {
                router.push(`/colaboradores?nome=${encodeURIComponent(searchQuery)}`);
              }
            }}
            className="mt-2 px-6 py-3 rounded-2xl text-[13px] font-bold bg-[var(--accent-red)] hover:bg-[var(--accent-red-hover)] text-white shadow-[0_0_20px_rgba(255,26,60,0.2)] flex items-center gap-2 cursor-pointer transition-all hover:scale-[1.02]"
          >
            <span className="material-symbols-outlined text-[18px]">person_add</span>
            Cadastrar "{searchQuery || 'Novo Colaborador'}"
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {Object.entries(colaboradoresPorEmpresa).map(([empresaNome, colabs]) => (
            <div key={empresaNome} className="flex flex-col gap-4">
              {/* Nome da Empresa */}
              <div className="flex items-center gap-2 border-b border-[rgba(255,255,255,0.03)] pb-2">
                <span className="material-symbols-outlined text-slate-400 text-[18px]">business</span>
                <h3 className="text-[14px] font-black uppercase tracking-[1.5px] text-slate-300">{empresaNome}</h3>
                <span className="px-2 py-0.5 rounded-md bg-[rgba(255,255,255,0.04)] text-[10px] font-bold text-slate-400">
                  {colabs.length} {colabs.length === 1 ? 'membro' : 'membros'}
                </span>
              </div>

              {/* Grid de Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {colabs.map((colab) => {
                  const isInside = colab.status === 'DENTRO';
                  return (
                    <div
                      key={colab.id}
                      onClick={() => {
                        setSelectedColab(colab);
                        if (isInside) {
                          setIsCheckOutOpen(true);
                        } else {
                          setIsCheckInOpen(true);
                        }
                      }}
                      className={`glass-card p-5 cursor-pointer flex flex-col gap-4 border transition-all duration-300 hover:scale-[1.02] ${
                        isInside 
                          ? 'border-[rgba(52,211,153,0.15)] bg-[rgba(52,211,153,0.02)] hover:border-[rgba(52,211,153,0.3)] shadow-[0_0_20px_rgba(52,211,153,0.05)]' 
                          : 'border-[rgba(255,255,255,0.04)] hover:border-[rgba(255,26,60,0.15)]'
                      }`}
                    >
                      {/* Topo do Card: Foto e Status */}
                      <div className="flex items-center justify-between">
                        <div className="w-12 h-12 rounded-full overflow-hidden border border-[rgba(255,255,255,0.08)] bg-slate-900 shrink-0">
                          {colab.fotoUrl ? (
                            <img src={colab.fotoUrl} alt={colab.nomeCompleto} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-[rgba(255,26,60,0.05)] text-[var(--accent-red)] font-bold text-[14px]">
                              {colab.nomeCompleto.split(' ').map(n => n[0]).slice(0, 2).join('')}
                            </div>
                          )}
                        </div>

                        {/* Tag de Status */}
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black tracking-[0.5px] uppercase ${
                          isInside 
                            ? 'bg-[rgba(52,211,153,0.1)] text-[var(--status-active)] border border-[rgba(52,211,153,0.2)]'
                            : 'bg-[rgba(255,255,255,0.04)] text-slate-400 border border-[rgba(255,255,255,0.06)]'
                        }`}>
                          {isInside ? 'DENTRO' : 'FORA'}
                        </span>
                      </div>

                      {/* Nome e CPF */}
                      <div>
                        <h4 className="text-[14px] font-bold text-white line-clamp-1 leading-tight">{colab.nomeCompleto}</h4>
                        <span className="text-[11px] text-slate-500 font-medium block mt-1">
                          CPF: {colab.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")}
                        </span>
                      </div>

                      {/* Informações da Atividade se estiver DENTRO */}
                      {isInside && colab.registroAtivo && (
                        <div className="pt-3 border-t border-[rgba(255,255,255,0.04)] flex flex-col gap-1.5 text-[11px]">
                          <div className="flex justify-between text-slate-500">
                            <span>Entrada:</span>
                            <span className="font-bold text-slate-300">
                              {new Date(colab.registroAtivo.timestampEntrada).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <div className="text-slate-400 line-clamp-1">
                            <span className="font-semibold">Serviço:</span> {colab.registroAtivo.descricaoServico}
                          </div>
                        </div>
                      )}

                      {/* Botão de Ação Rápida */}
                      <button
                        className={`w-full py-2.5 rounded-xl text-[12px] font-bold transition-all mt-1 flex items-center justify-center gap-1.5 ${
                          isInside 
                            ? 'bg-[rgba(248,113,113,0.08)] border border-[rgba(248,113,113,0.15)] text-red-300 hover:bg-red-500 hover:text-white' 
                            : 'bg-[var(--accent-red)] text-white hover:bg-[var(--accent-red-hover)] shadow-[0_0_15px_rgba(255,26,60,0.1)]'
                        }`}
                      >
                        {isInside ? (
                          <>
                            <span className="material-symbols-outlined text-[14px]">logout</span>
                            Registrar Saída
                          </>
                        ) : (
                          <>
                            <span className="material-symbols-outlined text-[14px]">login</span>
                            Liberar Entrada
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modais de Operação */}
      <ModalCheckIn
        isOpen={isCheckInOpen}
        onClose={() => {
          setIsCheckInOpen(false);
          setSelectedColab(null);
        }}
        colaborador={selectedColab}
        onConfirm={handleConfirmCheckIn}
      />

      <ModalCheckOut
        isOpen={isCheckOutOpen}
        onClose={() => {
          setIsCheckOutOpen(false);
          setSelectedColab(null);
        }}
        colaborador={selectedColab}
        onConfirm={handleConfirmCheckOut}
      />
    </div>
  );
}
