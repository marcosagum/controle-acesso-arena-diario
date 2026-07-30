'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { 
  getChaves, 
  emprestarChave, 
  devolverChave, 
  atualizarStatusChave, 
  getHistoricoChaves,
  ChaveInfo,
  HistoricoChaveInfo
} from '../actions';
import * as XLSX from 'xlsx';

export default function ControleChavesPage() {
  const [activeTab, setActiveTab] = useState<'painel' | 'historico'>('painel');
  const [chaves, setChaves] = useState<ChaveInfo[]>([]);
  const [historico, setHistorico] = useState<HistoricoChaveInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  // Estados de busca e filtros
  const [searchQuery, setSearchQuery] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<string>('TODAS');

  // Estados dos Modais
  const [chaveSelecionada, setChaveSelecionada] = useState<ChaveInfo | null>(null);
  const [modalAcao, setModalAcao] = useState<'emprestar' | 'devolver' | 'status' | null>(null);

  // Formulários
  const [emprestadaPara, setEmprestadaPara] = useState('');
  const [operadorLiberacao, setOperadorLiberacao] = useState('');
  const [operadorAcao, setOperadorAcao] = useState('');
  const [justificativaStatus, setJustificativaStatus] = useState('');
  const [novoStatusFisico, setNovoStatusFisico] = useState<'DISPONIVEL' | 'PERDIDA' | 'QUEBRADA'>('DISPONIVEL');
  const [responsavelReporte, setResponsavelReporte] = useState('');

  // Mensagens de feedback
  const [feedback, setFeedback] = useState<{ tipo: 'sucesso' | 'erro'; msg: string } | null>(null);

  useEffect(() => {
    carregarDados();
  }, [activeTab]);

  const carregarDados = async () => {
    setLoading(true);
    try {
      if (activeTab === 'painel') {
        const dadosChaves = await getChaves();
        setChaves(dadosChaves);
      } else {
        const dadosHistorico = await getHistoricoChaves();
        setHistorico(dadosHistorico);
      }
    } catch (err) {
      console.error(err);
      mostrarFeedback('erro', 'Falha ao carregar dados do servidor.');
    } finally {
      setLoading(false);
    }
  };

  const mostrarFeedback = (tipo: 'sucesso' | 'erro', msg: string) => {
    setFeedback({ tipo, msg });
    setTimeout(() => setFeedback(null), 5000);
  };

  // 1. Ação de Empréstimo
  const handleEmprestar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chaveSelecionada) return;

    if (!emprestadaPara.trim() || !operadorLiberacao.trim()) {
      mostrarFeedback('erro', 'Por favor, preencha todos os campos.');
      return;
    }

    startTransition(async () => {
      try {
        await emprestarChave(chaveSelecionada.id, emprestadaPara, operadorLiberacao);
        mostrarFeedback('sucesso', `Chave "${chaveSelecionada.codigo}" emprestada com sucesso!`);
        fecharModais();
        carregarDados();
      } catch (err: any) {
        mostrarFeedback('erro', err.message || 'Erro ao registrar empréstimo.');
      }
    });
  };

  // 2. Ação de Devolução
  const handleDevolver = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chaveSelecionada) return;

    if (!operadorAcao.trim()) {
      mostrarFeedback('erro', 'Informe o operador CCO que está recebendo a chave.');
      return;
    }

    startTransition(async () => {
      try {
        await devolverChave(chaveSelecionada.id, operadorAcao, justificativaStatus);
        mostrarFeedback('sucesso', `Chave "${chaveSelecionada.codigo}" devolvida com sucesso!`);
        fecharModais();
        carregarDados();
      } catch (err: any) {
        mostrarFeedback('erro', err.message || 'Erro ao registrar devolução.');
      }
    });
  };

  // 3. Ação de Alteração de Status Físico
  const handleAtualizarStatusFisico = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chaveSelecionada) return;

    if (!operadorAcao.trim() || !justificativaStatus.trim() || !responsavelReporte.trim()) {
      mostrarFeedback('erro', 'Por favor, preencha a justificativa e os operadores responsáveis.');
      return;
    }

    startTransition(async () => {
      try {
        await atualizarStatusChave(
          chaveSelecionada.id,
          novoStatusFisico,
          justificativaStatus,
          operadorAcao,
          responsavelReporte
        );
        mostrarFeedback('sucesso', `Status da chave "${chaveSelecionada.codigo}" atualizado para ${novoStatusFisico}.`);
        fecharModais();
        carregarDados();
      } catch (err: any) {
        mostrarFeedback('erro', err.message || 'Erro ao alterar status da chave.');
      }
    });
  };

  const fecharModais = () => {
    setChaveSelecionada(null);
    setModalAcao(null);
    setEmprestadaPara('');
    setOperadorLiberacao('');
    setOperadorAcao('');
    setJustificativaStatus('');
    setResponsavelReporte('');
  };

  // Filtragem de chaves em tempo real
  const chavesFiltradas = chaves.filter((c) => {
    const atendeBusca = c.codigo.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (filtroStatus === 'TODAS') return atendeBusca;
    if (filtroStatus === 'DISPONIVEL') return atendeBusca && c.status === 'DISPONIVEL';
    if (filtroStatus === 'EMPRESTADA') return atendeBusca && c.status === 'EMPRESTADA';
    if (filtroStatus === 'INDISPONIVEL') return atendeBusca && (c.status === 'PERDIDA' || c.status === 'QUEBRADA');
    
    return atendeBusca;
  });

  // Exportar histórico para Excel
  const exportarHistoricoExcel = () => {
    if (historico.length === 0) return;

    const dadosFormatados = historico.map((h) => ({
      'Chave/Fechadura': h.chaveCodigo,
      'Ação realizada': h.acao,
      'Responsável (Retirada/Reporte)': h.responsavel,
      'Operador CCO': h.operador,
      'Data/Hora': new Date(h.timestamp).toLocaleString('pt-BR'),
      'Justificativa/Observações': h.observacao || 'Nenhuma'
    }));

    const worksheet = XLSX.utils.json_to_sheet(dadosFormatados);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Auditoria de Chaves CCO');

    // Auto-ajustar larguras de colunas
    const maxProps = [{ wch: 30 }, { wch: 25 }, { wch: 35 }, { wch: 25 }, { wch: 20 }, { wch: 45 }];
    worksheet['!cols'] = maxProps;

    XLSX.writeFile(workbook, `auditoria_chaves_cco_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="p-8 flex flex-col gap-6">
      {/* Abas e Ações Superiores */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[rgba(255,255,255,0.03)] pb-4">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('painel')}
            className={`px-4 py-2 rounded-xl text-[12px] font-bold uppercase tracking-[1px] transition-all cursor-pointer border ${
              activeTab === 'painel'
                ? 'bg-[rgba(255,26,60,0.08)] text-[var(--accent-red)] border-[rgba(255,26,60,0.15)] font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-300'
            }`}
          >
            Painel Cautela de Chaves
          </button>
          <button
            onClick={() => setActiveTab('historico')}
            className={`px-4 py-2 rounded-xl text-[12px] font-bold uppercase tracking-[1px] transition-all cursor-pointer border ${
              activeTab === 'historico'
                ? 'bg-[rgba(255,26,60,0.08)] text-[var(--accent-red)] border-[rgba(255,26,60,0.15)] font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-300'
            }`}
          >
            Histórico de Cautela
          </button>
        </div>

        {activeTab === 'historico' && historico.length > 0 && (
          <button
            onClick={exportarHistoricoExcel}
            className="px-4 py-2.5 rounded-xl text-[12px] font-bold bg-[#107c41] hover:bg-[#0e6b37] text-white flex items-center gap-1.5 transition-all shadow-[0_0_15px_rgba(16,124,65,0.1)] cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">download</span>
            Exportar Excel
          </button>
        )}
      </div>

      {/* Feedbacks de Operação */}
      {feedback && (
        <div className={`p-4 rounded-xl border flex items-center gap-2 text-[12px] transition-all ${
          feedback.tipo === 'sucesso' 
            ? 'border-[rgba(52,211,153,0.2)] bg-[rgba(52,211,153,0.05)] text-[var(--status-active)]'
            : 'border-[rgba(248,113,113,0.2)] bg-[rgba(248,113,113,0.05)] text-red-400'
        }`}>
          <span className="material-symbols-outlined text-[16px]">
            {feedback.tipo === 'sucesso' ? 'check_circle' : 'error'}
          </span>
          {feedback.msg}
        </div>
      )}

      {/* RENDER ABA PAINEL DE CHAVES */}
      {activeTab === 'painel' && (
        <div className="flex flex-col gap-6">
          {/* Busca e Filtros */}
          <div className="glass-card p-4 flex flex-col md:flex-row items-center gap-4">
            <div className="relative flex-1 w-full">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-[20px]">search</span>
              <input
                type="text"
                placeholder="Buscar chave por nome ou fechadura... (Ex: DG-01, COZINHA)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(5,8,18,0.7)] text-white text-[13px] outline-none focus:border-[var(--accent-red)] transition-all"
              />
            </div>

            <div className="flex gap-1.5 w-full md:w-auto shrink-0 overflow-x-auto py-1">
              {['TODAS', 'DISPONIVEL', 'EMPRESTADA', 'INDISPONIVEL'].map((status) => (
                <button
                  key={status}
                  onClick={() => setFiltroStatus(status)}
                  className={`px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-[0.5px] transition-all cursor-pointer whitespace-nowrap border ${
                    filtroStatus === status
                      ? 'bg-white/10 text-white border-white/20'
                      : 'bg-transparent text-slate-400 border-transparent hover:text-slate-200'
                  }`}
                >
                  {status === 'TODAS' && 'Todas'}
                  {status === 'DISPONIVEL' && 'Disponíveis'}
                  {status === 'EMPRESTADA' && 'Emprestadas'}
                  {status === 'INDISPONIVEL' && 'Perdidas/Quebradas'}
                </button>
              ))}
            </div>
          </div>

          {/* Grid de Cards Médios Informativos */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-8 h-8 rounded-full border-4 border-t-[var(--accent-red)] border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
              <span className="text-[12px] text-slate-500 uppercase font-bold tracking-[1px]">Carregando quadro de chaves...</span>
            </div>
          ) : chavesFiltradas.length === 0 ? (
            <div className="glass-card p-12 text-center flex flex-col items-center justify-center gap-3">
              <span className="material-symbols-outlined text-[48px] text-slate-600">vpn_key_off</span>
              <p className="text-[13px] text-slate-400">Nenhuma chave encontrada com os filtros selecionados.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {chavesFiltradas.map((c) => {
                const isDisponivel = c.status === 'DISPONIVEL';
                const isEmprestada = c.status === 'EMPRESTADA';
                const isIndisponivel = c.status === 'PERDIDA' || c.status === 'QUEBRADA';

                return (
                  <div
                    key={c.id}
                    className={`glass-card p-5 border flex flex-col gap-4 transition-all hover:scale-[1.01] ${
                      isDisponivel 
                        ? 'border-[rgba(52,211,153,0.15)] bg-[rgba(52,211,153,0.02)]' 
                        : isEmprestada 
                        ? 'border-[rgba(248,113,113,0.15)] bg-[rgba(248,113,113,0.02)]' 
                        : 'border-[rgba(245,158,11,0.15)] bg-[rgba(245,158,11,0.02)]'
                    }`}
                  >
                    {/* Cabeçalho do Card */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex flex-col gap-1">
                        <span className="text-[13px] font-black text-white leading-tight uppercase tracking-[0.5px]">
                          {c.codigo}
                        </span>
                        <span className="text-[9px] text-slate-500 font-mono">ID: {c.id.slice(0, 8)}</span>
                      </div>

                      {/* Badge de Status */}
                      <span className={`px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.5px] ${
                        isDisponivel 
                          ? 'bg-[rgba(52,211,153,0.1)] text-[var(--status-active)]'
                          : isEmprestada
                          ? 'bg-[rgba(248,113,113,0.1)] text-red-400'
                          : 'bg-[rgba(245,158,11,0.1)] text-amber-400'
                      }`}>
                        {c.status}
                      </span>
                    </div>

                    {/* Conteúdo Informativo do Card */}
                    <div className="flex-1 text-[11px] border-t border-[rgba(255,255,255,0.03)] pt-3 flex flex-col gap-1.5 justify-center">
                      {isDisponivel && (
                        <div className="text-slate-500 italic flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[14px]">lock_open</span>
                          Chave disponível na cautela do CCO
                        </div>
                      )}

                      {isEmprestada && (
                        <div className="flex flex-col gap-1 text-slate-300">
                          <div className="flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[13px] text-slate-500">person</span>
                            <span>Portador: <strong className="text-white font-bold">{c.emprestadaPara}</strong></span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[13px] text-slate-500">schedule</span>
                            <span>Retirada: <span className="font-mono text-slate-400">{c.timestampRetirada ? new Date(c.timestampRetirada).toLocaleString('pt-BR') : ''}</span></span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[13px] text-slate-500">badge</span>
                            <span>Operador: <span className="text-slate-400">{c.operadorLiberacao}</span></span>
                          </div>
                        </div>
                      )}

                      {isIndisponivel && (
                        <div className="flex flex-col gap-1 text-amber-300/80">
                          <div className="flex items-start gap-1.5">
                            <span className="material-symbols-outlined text-[14px] text-amber-500 shrink-0">warning</span>
                            <span>Motivo: <strong className="text-slate-300 font-bold uppercase">{c.status}</strong></span>
                          </div>
                          {c.observacao && (
                            <div className="text-slate-400 italic pl-5">
                              "{c.observacao}"
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Botões de Ação do Card */}
                    <div className="flex gap-2 border-t border-[rgba(255,255,255,0.03)] pt-3">
                      {isDisponivel && (
                        <button
                          onClick={() => {
                            setChaveSelecionada(c);
                            setModalAcao('emprestar');
                          }}
                          className="flex-1 py-2 rounded-lg text-[10px] font-bold uppercase bg-[var(--status-active)] hover:bg-[#2fbfa0] text-white flex items-center justify-center gap-1 cursor-pointer transition-all"
                        >
                          <span className="material-symbols-outlined text-[14px]">logout</span>
                          Emprestar
                        </button>
                      )}

                      {isEmprestada && (
                        <button
                          onClick={() => {
                            setChaveSelecionada(c);
                            setModalAcao('devolver');
                          }}
                          className="flex-1 py-2 rounded-lg text-[10px] font-bold uppercase bg-[var(--accent-red)] hover:bg-[var(--accent-red-hover)] text-white flex items-center justify-center gap-1 cursor-pointer transition-all"
                        >
                          <span className="material-symbols-outlined text-[14px]">login</span>
                          Receber Devolução
                        </button>
                      )}

                      <button
                        onClick={() => {
                          setChaveSelecionada(c);
                          setNovoStatusFisico(c.status === 'EMPRESTADA' ? 'DISPONIVEL' : c.status as any);
                          setModalAcao('status');
                        }}
                        className="px-2.5 py-2 rounded-lg text-[10px] font-bold uppercase border border-[rgba(255,255,255,0.06)] hover:bg-white/5 text-slate-400 hover:text-white flex items-center justify-center gap-1 cursor-pointer transition-all"
                        title="Ajustar Integridade ou Status Físico"
                      >
                        <span className="material-symbols-outlined text-[15px]">build</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* RENDER ABA HISTÓRICO DE AUDITORIA */}
      {activeTab === 'historico' && (
        <div className="glass-card overflow-hidden">
          <div className="px-6 py-4 border-b border-[rgba(255,255,255,0.03)] bg-white/[0.01]">
            <h3 className="text-[12px] font-black uppercase tracking-[1.5px] text-white">Relatório Geral de Cautela de Chaves</h3>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-8 h-8 rounded-full border-4 border-t-[var(--accent-red)] border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
              <span className="text-[12px] text-slate-500 uppercase font-bold tracking-[1px]">Carregando logs de cautela...</span>
            </div>
          ) : historico.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center justify-center gap-3">
              <span className="material-symbols-outlined text-[48px] text-slate-600">history_toggle_off</span>
              <p className="text-[13px] text-slate-400">Nenhum registro de movimentação de chaves encontrado.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[12px] text-slate-300">
                <thead>
                  <tr className="border-b border-[rgba(255,255,255,0.05)] bg-slate-950/40 text-left text-slate-400 font-bold uppercase text-[9px] tracking-[1px]">
                    <th className="px-6 py-4">Data/Hora</th>
                    <th className="px-6 py-4">Chave / Fechadura</th>
                    <th className="px-6 py-4">Ação</th>
                    <th className="px-6 py-4">Responsável (Retirada/Reporte)</th>
                    <th className="px-6 py-4">Operador CCO</th>
                    <th className="px-6 py-4">Justificativa/Observações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[rgba(255,255,255,0.02)]">
                  {historico.map((h) => {
                    const isRetirada = h.acao === 'RETIRADA';
                    const isDevolvida = h.acao === 'DEVOLVIDA';

                    return (
                      <tr key={h.id} className="hover:bg-white/[0.01] transition-all">
                        <td className="px-6 py-3.5 font-mono text-slate-400">
                          {new Date(h.timestamp).toLocaleString('pt-BR')}
                        </td>
                        <td className="px-6 py-3.5 font-black text-white uppercase">{h.chaveCodigo}</td>
                        <td className="px-6 py-3.5">
                          <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-[0.5px] ${
                            isRetirada 
                              ? 'bg-[rgba(248,113,113,0.1)] text-red-400' 
                              : isDevolvida 
                              ? 'bg-[rgba(52,211,153,0.1)] text-[var(--status-active)]'
                              : 'bg-[rgba(245,158,11,0.1)] text-amber-400'
                          }`}>
                            {h.acao === 'INDISPONIVEL_PERDIDA' && 'PERDIDA'}
                            {h.acao === 'INDISPONIVEL_QUEBRADA' && 'QUEBRADA'}
                            {h.acao === 'DISPONIBILIZADA' && 'DISPONIBILIZADA'}
                            {h.acao !== 'INDISPONIVEL_PERDIDA' && h.acao !== 'INDISPONIVEL_QUEBRADA' && h.acao !== 'DISPONIBILIZADA' && h.acao}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 font-bold text-slate-200">{h.responsavel}</td>
                        <td className="px-6 py-3.5 text-slate-400">{h.operador}</td>
                        <td className="px-6 py-3.5 text-[11px] text-slate-400 italic max-w-xs truncate" title={h.observacao || ''}>
                          {h.observacao || '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: REGISTRAR EMPRÉSTIMO */}
      {modalAcao === 'emprestar' && chaveSelecionada && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-[4px] flex items-center justify-center z-50 p-4">
          <div className="glass-card max-w-md w-full p-6 flex flex-col gap-5 border border-[rgba(52,211,153,0.15)] shadow-[0_0_30px_rgba(52,211,153,0.05)]">
            <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.03)] pb-3">
              <div className="flex items-center gap-2 text-[var(--status-active)]">
                <span className="material-symbols-outlined">logout</span>
                <h4 className="text-[13px] font-black uppercase tracking-[1.5px]">Liberar Cautela</h4>
              </div>
              <button onClick={fecharModais} className="text-slate-500 hover:text-white transition-all cursor-pointer">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="text-[12px] bg-white/5 p-4 rounded-xl flex flex-col gap-1">
              <span className="text-[10px] text-slate-500 uppercase font-black">Chave Selecionada</span>
              <span className="text-[14px] font-black text-white uppercase">{chaveSelecionada.codigo}</span>
            </div>

            <form onSubmit={handleEmprestar} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-[1px] text-slate-400">Emprestada Para (Responsável)</label>
                <input
                  type="text"
                  placeholder="Ex: Carlos (Eletricista terceirizado)"
                  value={emprestadaPara}
                  onChange={(e) => setEmprestadaPara(e.target.value)}
                  className="px-4 py-3 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(5,8,18,0.7)] text-white text-[13px] outline-none focus:border-[var(--accent-red)] transition-all"
                  required
                  disabled={isPending}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-[1px] text-slate-400">Operador CCO Responsável</label>
                <input
                  type="text"
                  placeholder="Seu nome"
                  value={operadorLiberacao}
                  onChange={(e) => setOperadorLiberacao(e.target.value)}
                  className="px-4 py-3 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(5,8,18,0.7)] text-white text-[13px] outline-none focus:border-[var(--accent-red)] transition-all"
                  required
                  disabled={isPending}
                />
              </div>

              <div className="flex gap-3 border-t border-[rgba(255,255,255,0.03)] pt-4 mt-2">
                <button
                  type="button"
                  onClick={fecharModais}
                  className="flex-1 py-3 rounded-xl text-[12px] font-bold uppercase tracking-[0.5px] border border-[rgba(255,255,255,0.06)] hover:bg-white/5 text-slate-400 hover:text-white transition-all cursor-pointer"
                  disabled={isPending}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl text-[12px] font-bold uppercase tracking-[0.5px] bg-[var(--status-active)] hover:bg-[#2fbfa0] text-white shadow-[0_0_20px_rgba(52,211,153,0.15)] flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                  disabled={isPending}
                >
                  {isPending ? (
                    <div className="w-4 h-4 border-2 border-t-white border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[16px]">check_circle</span>
                      Liberar Chave
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: RECEBER DEVOLUÇÃO */}
      {modalAcao === 'devolver' && chaveSelecionada && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-[4px] flex items-center justify-center z-50 p-4">
          <div className="glass-card max-w-md w-full p-6 flex flex-col gap-5 border border-[rgba(248,113,113,0.15)] shadow-[0_0_30px_rgba(248,113,113,0.05)]">
            <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.03)] pb-3">
              <div className="flex items-center gap-2 text-red-400">
                <span className="material-symbols-outlined">login</span>
                <h4 className="text-[13px] font-black uppercase tracking-[1.5px]">Receber Chave</h4>
              </div>
              <button onClick={fecharModais} className="text-slate-500 hover:text-white transition-all cursor-pointer">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="text-[12px] bg-white/5 p-4 rounded-xl flex flex-col gap-2">
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-black">Chave Selecionada</span>
                <span className="text-[14px] font-black text-white uppercase block">{chaveSelecionada.codigo}</span>
              </div>
              <div className="border-t border-white/5 pt-2 flex flex-col gap-1 text-slate-300">
                <span>Portador: <strong className="text-white">{chaveSelecionada.emprestadaPara}</strong></span>
                <span>Retirada em: {chaveSelecionada.timestampRetirada ? new Date(chaveSelecionada.timestampRetirada).toLocaleString('pt-BR') : ''}</span>
              </div>
            </div>

            <form onSubmit={handleDevolver} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-[1px] text-slate-400">Operador CCO que Recebeu</label>
                <input
                  type="text"
                  placeholder="Seu nome"
                  value={operadorAcao}
                  onChange={(e) => setOperadorAcao(e.target.value)}
                  className="px-4 py-3 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(5,8,18,0.7)] text-white text-[13px] outline-none focus:border-[var(--accent-red)] transition-all"
                  required
                  disabled={isPending}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-[1px] text-slate-400">Observações de Devolução (Opcional)</label>
                <textarea
                  placeholder="Ex: Devolvida com chaveiro quebrado ou nenhuma observação..."
                  value={justificativaStatus}
                  onChange={(e) => setJustificativaStatus(e.target.value)}
                  className="px-4 py-3 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(5,8,18,0.7)] text-white text-[12px] outline-none focus:border-[var(--accent-red)] transition-all min-h-[80px] resize-none"
                  disabled={isPending}
                />
              </div>

              <div className="flex gap-3 border-t border-[rgba(255,255,255,0.03)] pt-4 mt-2">
                <button
                  type="button"
                  onClick={fecharModais}
                  className="flex-1 py-3 rounded-xl text-[12px] font-bold uppercase tracking-[0.5px] border border-[rgba(255,255,255,0.06)] hover:bg-white/5 text-slate-400 hover:text-white transition-all cursor-pointer"
                  disabled={isPending}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl text-[12px] font-bold uppercase tracking-[0.5px] bg-[var(--accent-red)] hover:bg-[var(--accent-red-hover)] text-white shadow-[0_0_20px_rgba(255,26,60,0.15)] flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                  disabled={isPending}
                >
                  {isPending ? (
                    <div className="w-4 h-4 border-2 border-t-white border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[16px]">check_circle</span>
                      Concluir Devolução
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: INTEGRIDADE E STATUS FÍSICO */}
      {modalAcao === 'status' && chaveSelecionada && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-[4px] flex items-center justify-center z-50 p-4">
          <div className="glass-card max-w-md w-full p-6 flex flex-col gap-5 border border-[rgba(245,158,11,0.15)] shadow-[0_0_30px_rgba(245,158,11,0.05)]">
            <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.03)] pb-3">
              <div className="flex items-center gap-2 text-amber-400">
                <span className="material-symbols-outlined">build</span>
                <h4 className="text-[13px] font-black uppercase tracking-[1.5px]">Configurações da Chave</h4>
              </div>
              <button onClick={fecharModais} className="text-slate-500 hover:text-white transition-all cursor-pointer">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="text-[12px] bg-white/5 p-4 rounded-xl flex flex-col gap-1">
              <span className="text-[10px] text-slate-500 uppercase font-black">Chave Selecionada</span>
              <span className="text-[14px] font-black text-white uppercase">{chaveSelecionada.codigo}</span>
              <span className="text-[10px] text-slate-400 mt-1">Status Atual: <strong className="uppercase text-amber-400">{chaveSelecionada.status}</strong></span>
            </div>

            <form onSubmit={handleAtualizarStatusFisico} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-[1px] text-slate-400">Definir Novo Status</label>
                <select
                  value={novoStatusFisico}
                  onChange={(e) => setNovoStatusFisico(e.target.value as any)}
                  className="px-4 py-3.5 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(5,8,18,0.7)] text-white text-[13px] outline-none focus:border-[var(--accent-red)] cursor-pointer transition-all"
                  disabled={isPending}
                >
                  <option value="DISPONIVEL" className="bg-[#0c122b] text-white">DISPONÍVEL (OK)</option>
                  <option value="PERDIDA" className="bg-[#0c122b] text-white">INDISPONÍVEL: PERDIDA</option>
                  <option value="QUEBRADA" className="bg-[#0c122b] text-white">INDISPONÍVEL: QUEBRADA</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-[1px] text-slate-400">Responsável pelo Reporte / Incidente</label>
                <input
                  type="text"
                  placeholder="Nome de quem reportou o ocorrido"
                  value={responsavelReporte}
                  onChange={(e) => setResponsavelReporte(e.target.value)}
                  className="px-4 py-3 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(5,8,18,0.7)] text-white text-[13px] outline-none focus:border-[var(--accent-red)] transition-all"
                  required
                  disabled={isPending}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-[1px] text-slate-400">Operador CCO Registrando a Ação</label>
                <input
                  type="text"
                  placeholder="Seu nome"
                  value={operadorAcao}
                  onChange={(e) => setOperadorAcao(e.target.value)}
                  className="px-4 py-3 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(5,8,18,0.7)] text-white text-[13px] outline-none focus:border-[var(--accent-red)] transition-all"
                  required
                  disabled={isPending}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-[1px] text-slate-400">Justificativa / Detalhes (Obrigatório)</label>
                <textarea
                  placeholder="Justifique o motivo da alteração de status..."
                  value={justificativaStatus}
                  onChange={(e) => setJustificativaStatus(e.target.value)}
                  className="px-4 py-3 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(5,8,18,0.7)] text-white text-[12px] outline-none focus:border-[var(--accent-red)] transition-all min-h-[80px] resize-none"
                  required
                  disabled={isPending}
                />
              </div>

              <div className="flex gap-3 border-t border-[rgba(255,255,255,0.03)] pt-4 mt-2">
                <button
                  type="button"
                  onClick={fecharModais}
                  className="flex-1 py-3 rounded-xl text-[12px] font-bold uppercase tracking-[0.5px] border border-[rgba(255,255,255,0.06)] hover:bg-white/5 text-slate-400 hover:text-white transition-all cursor-pointer"
                  disabled={isPending}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl text-[12px] font-bold uppercase tracking-[0.5px] bg-amber-500 hover:bg-amber-600 text-white shadow-[0_0_20px_rgba(245,158,11,0.15)] flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                  disabled={isPending}
                >
                  {isPending ? (
                    <div className="w-4 h-4 border-2 border-t-white border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[16px]">check_circle</span>
                      Salvar Alterações
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
