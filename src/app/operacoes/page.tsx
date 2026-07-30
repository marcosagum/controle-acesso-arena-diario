'use client';

import React, { useState, useEffect, useTransition } from 'react';
import {
  getEquipamentosCftv,
  cadastrarEquipamentoCftv,
  registrarDefeitoCftv,
  resolverDefeitoCftv,
  getDefeitosCftv,
  getAuditoriasImagens,
  cadastrarAuditoriaImagem,
  getControleExtintores,
  registrarMovimentacaoExtintor,
  getOcorrencias,
  cadastrarOcorrencia,
  getDadosRelatorioUnificado,
  EquipamentoCftvInfo,
  DefeitoCftvInfo,
  AuditoriaImagemInfo,
  ControleExtintorInfo,
  OcorrenciaInfo
} from '../actions';

export default function OperacoesPage() {
  const [activeTab, setActiveTab] = useState<'cftv' | 'auditoria' | 'extintores' | 'ocorrencias' | 'relatorios'>('cftv');
  const [isPending, startTransition] = useTransition();

  // Estados de dados
  const [cftvs, setCftvs] = useState<EquipamentoCftvInfo[]>([]);
  const [defeitos, setDefeitos] = useState<DefeitoCftvInfo[]>([]);
  const [auditorias, setAuditorias] = useState<AuditoriaImagemInfo[]>([]);
  const [extintores, setExtintores] = useState<ControleExtintorInfo[]>([]);
  const [ocorrencias, setOcorrencias] = useState<OcorrenciaInfo[]>([]);

  // Estados de loading
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ tipo: 'sucesso' | 'erro'; msg: string } | null>(null);

  // Estados de Modais / Formulários
  const [modalAberto, setModalAberto] = useState<'nova_camera' | 'reportar_defeito' | 'nova_auditoria' | 'novo_extintor' | 'nova_ocorrencia' | null>(null);
  
  // Form Câmeras
  const [camNome, setCamNome] = useState('');
  const [camTipo, setCamTipo] = useState('CFTV_PADRAO');
  
  // Form Defeito
  const [defeitoCamNome, setDefeitoCamNome] = useState('');
  const [defeitoDesc, setDefeitoDesc] = useState('');
  const [operadorDefeito, setOperadorDefeito] = useState('');

  // Form Auditoria Imagem
  const [audCamNome, setAudCamNome] = useState('');
  const [audTrechoHora, setAudTrechoHora] = useState('');
  const [audTrechoData, setAudTrechoData] = useState('');
  const [audDesc, setAudDesc] = useState('');
  const [audOperador, setAudOperador] = useState('');
  const [audTipo, setAudTipo] = useState<'AUDITORIA' | 'SINALIZACAO_IMPORTANTE'>('AUDITORIA');

  // Form Extintores
  const [extTipo, setExtTipo] = useState<'ENTREGA' | 'RECEBIMENTO'>('ENTREGA');
  const [extResponsavelExterno, setExtResponsavelExterno] = useState('');
  const [extOperador, setExtOperador] = useState('');
  const [extMotivo, setExtMotivo] = useState('');

  // Form Ocorrências
  const [ocTipo, setOcTipo] = useState<'GERAL' | 'EVENTO'>('GERAL');
  const [ocEventoNome, setOcEventoNome] = useState('');
  const [ocOperador, setOcOperador] = useState('');
  const [ocDetalhes, setOcDetalhes] = useState('');

  // Form Relatórios
  const [relDataInicio, setRelDataInicio] = useState('');
  const [relDataFim, setRelDataFim] = useState('');
  const [dadosRelatorio, setDadosRelatorio] = useState<any | null>(null);
  const [incluirAcessos, setIncluirAcessos] = useState(true);
  const [incluirChaves, setIncluirChaves] = useState(true);
  const [incluirOcorrencias, setIncluirOcorrencias] = useState(true);
  const [incluirCftv, setIncluirCftv] = useState(true);
  const [incluirAuditorias, setIncluirAuditorias] = useState(true);
  const [incluirExtintores, setIncluirExtintores] = useState(true);

  useEffect(() => {
    carregarDados();
  }, [activeTab]);

  const carregarDados = async () => {
    setLoading(true);
    try {
      if (activeTab === 'cftv') {
        const c = await getEquipamentosCftv();
        const d = await getDefeitosCftv();
        setCftvs(c);
        setDefeitos(d);
      } else if (activeTab === 'auditoria') {
        const a = await getAuditoriasImagens();
        const c = await getEquipamentosCftv();
        setAuditorias(a);
        setCftvs(c);
      } else if (activeTab === 'extintores') {
        const ex = await getControleExtintores();
        setExtintores(ex);
      } else if (activeTab === 'ocorrencias') {
        const o = await getOcorrencias();
        setOcorrencias(o);
      }
    } catch (err) {
      console.error(err);
      mostrarFeedback('erro', 'Falha ao sincronizar dados com o banco.');
    } finally {
      setLoading(false);
    }
  };

  const mostrarFeedback = (tipo: 'sucesso' | 'erro', msg: string) => {
    setFeedback({ tipo, msg });
    setTimeout(() => setFeedback(null), 5000);
  };

  const fecharModais = () => {
    setModalAberto(null);
    setCamNome('');
    setDefeitoDesc('');
    setAudDesc('');
    setExtMotivo('');
    setOcDetalhes('');
  };

  // Submit Câmera
  const handleCadastrarCamera = (e: React.FormEvent) => {
    e.preventDefault();
    if (!camNome.trim()) return;

    startTransition(async () => {
      try {
        await cadastrarEquipamentoCftv(camNome, camTipo);
        mostrarFeedback('sucesso', `Câmera "${camNome}" cadastrada com sucesso!`);
        fecharModais();
        carregarDados();
      } catch (err: any) {
        mostrarFeedback('erro', err.message || 'Erro ao cadastrar câmera.');
      }
    });
  };

  // Submit Defeito
  const handleReportarDefeito = (e: React.FormEvent) => {
    e.preventDefault();
    if (!defeitoCamNome || !defeitoDesc.trim() || !operadorDefeito.trim()) {
      mostrarFeedback('erro', 'Preencha todos os campos do chamado.');
      return;
    }

    startTransition(async () => {
      try {
        await registrarDefeitoCftv(defeitoCamNome, defeitoDesc, operadorDefeito);
        mostrarFeedback('sucesso', 'Defeito registrado. Câmera colocada em Manutenção!');
        fecharModais();
        carregarDados();
      } catch (err: any) {
        mostrarFeedback('erro', err.message || 'Erro ao registrar chamado.');
      }
    });
  };

  // Resolver Defeito
  const handleResolverDefeito = (id: string, operador: string) => {
    if (!operador.trim()) {
      alert('Por favor, informe seu nome como operador CCO para concluir o chamado.');
      return;
    }

    startTransition(async () => {
      try {
        await resolverDefeitoCftv(id, operador);
        mostrarFeedback('sucesso', 'Câmera restaurada para status operacional!');
        carregarDados();
      } catch (err: any) {
        mostrarFeedback('erro', err.message || 'Erro ao encerrar chamado.');
      }
    });
  };

  // Submit Auditoria
  const handleCadastrarAuditoria = (e: React.FormEvent) => {
    e.preventDefault();
    if (!audCamNome || !audTrechoData || !audTrechoHora || !audDesc.trim() || !audOperador.trim()) {
      mostrarFeedback('erro', 'Preencha todas as informações da auditoria.');
      return;
    }

    const timestampTrecho = new Date(`${audTrechoData}T${audTrechoHora}`);

    startTransition(async () => {
      try {
        await cadastrarAuditoriaImagem({
          cameraNome: audCamNome,
          timestampTrecho,
          descricaoFato: audDesc,
          operador: audOperador,
          tipo: audTipo
        });
        mostrarFeedback('sucesso', 'Auditoria registrada no CCO!');
        fecharModais();
        carregarDados();
      } catch (err: any) {
        mostrarFeedback('erro', err.message || 'Erro ao salvar auditoria.');
      }
    });
  };

  // Submit Extintor
  const handleRegistrarExtintor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!extResponsavelExterno.trim() || !extOperador.trim() || !extMotivo.trim()) {
      mostrarFeedback('erro', 'Preencha todos os campos do fluxo.');
      return;
    }

    startTransition(async () => {
      try {
        await registrarMovimentacaoExtintor({
          tipoMovimentacao: extTipo,
          responsavelExterno: extResponsavelExterno,
          operadorCco: extOperador,
          motivo: extMotivo
        });
        mostrarFeedback('sucesso', 'Registro de extintor de reserva salvo!');
        fecharModais();
        carregarDados();
      } catch (err: any) {
        mostrarFeedback('erro', err.message || 'Erro ao salvar cautela.');
      }
    });
  };

  // Submit Ocorrência
  const handleCadastrarOcorrencia = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ocOperador.trim() || !ocDetalhes.trim()) {
      mostrarFeedback('erro', 'Preencha o operador e os fatos da ocorrência.');
      return;
    }

    if (ocTipo === 'EVENTO' && !ocEventoNome.trim()) {
      mostrarFeedback('erro', 'Informe o nome do Evento associado.');
      return;
    }

    startTransition(async () => {
      try {
        await cadastrarOcorrencia({
          tipo: ocTipo,
          nomeEvento: ocEventoNome,
          operador: ocOperador,
          detalhes: ocDetalhes
        });
        mostrarFeedback('sucesso', 'Ocorrência lançada no livro de ocorrências!');
        fecharModais();
        carregarDados();
      } catch (err: any) {
        mostrarFeedback('erro', err.message || 'Erro ao salvar ocorrência.');
      }
    });
  };

  // Lógica de Geração do Relatório de Visualização
  const handleGerarRelatorio = (e: React.FormEvent) => {
    e.preventDefault();
    if (!relDataInicio || !relDataFim) {
      alert('Selecione o período inicial e final.');
      return;
    }

    setLoading(true);
    startTransition(async () => {
      try {
        const dados = await getDadosRelatorioUnificado(new Date(relDataInicio), new Date(relDataFim));
        setDadosRelatorio(dados);
      } catch (err) {
        console.error(err);
        alert('Erro ao consolidar dados.');
      } finally {
        setLoading(false);
      }
    });
  };

  const dispararImpressao = () => {
    window.print();
  };

  // Contadores para CFTV
  const cftvsAtivos = cftvs.filter(c => c.status === 'DISPONIVEL').length;
  const cftvsManutencao = cftvs.filter(c => c.status === 'MANUTENCAO').length;

  return (
    <div className="p-8 flex flex-col gap-6 print:p-0 print:bg-white print:text-black">
      {/* Estilo de Impressão Nativa Inline */}
      <style jsx global>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          aside, header, nav, button, .no-print {
            display: none !important;
          }
          main {
            padding: 0 !important;
            margin: 0 !important;
            background: white !important;
          }
          .print-container {
            display: block !important;
            width: 100% !important;
            color: black !important;
          }
          .print-header {
            border-bottom: 2px solid #000 !important;
            padding-bottom: 12px !important;
            margin-bottom: 20px !important;
          }
          .print-table {
            width: 100% !important;
            border-collapse: collapse !important;
            margin-top: 10px !important;
          }
          .print-table th, .print-table td {
            border: 1px solid #ddd !important;
            padding: 8px !important;
            text-align: left !important;
            font-size: 11px !important;
            color: black !important;
          }
          .print-section {
            page-break-inside: avoid !important;
            margin-bottom: 25px !important;
          }
        }
      `}</style>

      {/* Abas Superiores (Ocultadas na Impressão) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[rgba(255,255,255,0.03)] pb-4 no-print">
        <div className="flex gap-1.5 overflow-x-auto py-1">
          {[
            { id: 'cftv', label: 'CFTV & Câmeras', icon: 'videocam' },
            { id: 'auditoria', label: 'Auditoria de Imagens', icon: 'visibility' },
            { id: 'extintores', label: 'Extintores Reserva', icon: 'fire_extinguisher' },
            { id: 'ocorrencias', label: 'Livro Ocorrências', icon: 'menu_book' },
            { id: 'relatorios', label: 'Relatórios CCO', icon: 'analytics' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                setDadosRelatorio(null);
              }}
              className={`px-4 py-2 rounded-xl text-[11px] font-bold uppercase tracking-[1px] flex items-center gap-1.5 transition-all cursor-pointer border ${
                activeTab === tab.id
                  ? 'bg-[rgba(255,26,60,0.08)] text-[var(--accent-red)] border-[rgba(255,26,60,0.15)] font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-300'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Feedbacks de Operações (Ocultados na Impressão) */}
      {feedback && (
        <div className="no-print">
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
        </div>
      )}

      {/* ======================================= */}
      {/* 1. ABA CFTV & CÂMERAS                   */}
      {/* ======================================= */}
      {activeTab === 'cftv' && (
        <div className="flex flex-col gap-6 no-print">
          {/* Indicadores de Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="glass-card p-5 border border-[rgba(52,211,153,0.1)] bg-[rgba(52,211,153,0.01)] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[32px] text-[var(--status-active)]">videocam</span>
                <div className="flex flex-col">
                  <span className="text-[11px] font-bold uppercase tracking-[1px] text-slate-400">Câmeras Operacionais</span>
                  <span className="text-[20px] font-black text-white">{cftvsAtivos} / {cftvs.length}</span>
                </div>
              </div>
              <span className="text-[10px] bg-[rgba(52,211,153,0.1)] text-[var(--status-active)] px-2 py-0.5 rounded font-bold uppercase tracking-[0.5px]">Online</span>
            </div>

            <div className="glass-card p-5 border border-[rgba(245,158,11,0.1)] bg-[rgba(245,158,11,0.01)] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[32px] text-amber-500">build</span>
                <div className="flex flex-col">
                  <span className="text-[11px] font-bold uppercase tracking-[1px] text-slate-400">Em Manutenção</span>
                  <span className="text-[20px] font-black text-white">{cftvsManutencao}</span>
                </div>
              </div>
              <span className="text-[10px] bg-[rgba(245,158,11,0.1)] text-amber-500 px-2 py-0.5 rounded font-bold uppercase tracking-[0.5px]">Chamados Abertos</span>
            </div>
          </div>

          {/* Ações da Aba */}
          <div className="flex gap-3 justify-end">
            <button
              onClick={() => setModalAberto('nova_camera')}
              className="px-4 py-2.5 rounded-xl text-[12px] font-bold bg-[var(--accent-red)] hover:bg-[var(--accent-red-hover)] text-white flex items-center gap-1.5 transition-all cursor-pointer shadow-[0_0_20px_rgba(255,26,60,0.15)]"
            >
              <span className="material-symbols-outlined text-[16px]">add_circle</span>
              Cadastrar Equipamento
            </button>
            <button
              onClick={() => setModalAberto('reportar_defeito')}
              className="px-4 py-2.5 rounded-xl text-[12px] font-bold border border-[rgba(255,255,255,0.06)] hover:bg-white/5 text-slate-300 hover:text-white flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">report_problem</span>
              Reportar Defeito (Chamado)
            </button>
          </div>

          {/* Grid de CFTV e Câmeras */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-8 h-8 rounded-full border-4 border-t-[var(--accent-red)] border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
              <span className="text-[12px] text-slate-500 uppercase font-bold tracking-[1px]">Carregando CFTV...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {cftvs.map((cam) => {
                const defeitoAtivo = defeitos.find(d => d.equipamentoNome === cam.nome);
                return (
                  <div
                    key={cam.id}
                    className={`glass-card p-5 border flex flex-col gap-4 transition-all hover:scale-[1.01] ${
                      cam.status === 'DISPONIVEL'
                        ? 'border-[rgba(52,211,153,0.15)] bg-[rgba(52,211,153,0.01)]'
                        : 'border-[rgba(245,158,11,0.15)] bg-[rgba(245,158,11,0.01)]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex flex-col">
                        <span className="text-[13px] font-black text-white uppercase tracking-[0.5px] leading-tight">
                          {cam.nome}
                        </span>
                        <span className="text-[9px] text-slate-500 font-mono mt-1">TIPO: {cam.tipo}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-[0.5px] ${
                        cam.status === 'DISPONIVEL'
                          ? 'bg-[rgba(52,211,153,0.1)] text-[var(--status-active)]'
                          : 'bg-[rgba(245,158,11,0.1)] text-amber-500'
                      }`}>
                        {cam.status === 'DISPONIVEL' ? 'OK' : 'MANUTENÇÃO'}
                      </span>
                    </div>

                    <div className="flex-1 text-[11px] border-t border-[rgba(255,255,255,0.03)] pt-3">
                      {cam.status === 'DISPONIVEL' ? (
                        <span className="text-slate-500 italic">Equipamento funcionando normalmente.</span>
                      ) : (
                        <div className="flex flex-col gap-1 text-slate-300">
                          <span className="text-red-400 font-bold">Defeito Reportado:</span>
                          <span className="text-slate-400">"{defeitoAtivo?.descricao}"</span>
                          <span className="text-[9px] text-slate-500 mt-1">Por: {defeitoAtivo?.operador} em {defeitoAtivo?.dataHora ? new Date(defeitoAtivo.dataHora).toLocaleString('pt-BR') : ''}</span>
                        </div>
                      )}
                    </div>

                    {cam.status === 'MANUTENCAO' && (
                      <button
                        onClick={() => {
                          const op = prompt('Informe seu nome como operador CCO para fechar este chamado de manutenção:');
                          if (op) handleResolverDefeito(cam.id, op);
                        }}
                        className="w-full py-2 rounded-lg text-[10px] font-bold uppercase bg-[var(--status-active)] hover:bg-[#2fbfa0] text-white flex items-center justify-center gap-1 cursor-pointer transition-all"
                      >
                        <span className="material-symbols-outlined text-[14px]">check_circle</span>
                        Concluir Manutenção
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ======================================= */}
      {/* 2. ABA AUDITORIA DE IMAGENS             */}
      {/* ======================================= */}
      {activeTab === 'auditoria' && (
        <div className="flex flex-col gap-6 no-print">
          <div className="flex justify-end">
            <button
              onClick={() => setModalAberto('nova_auditoria')}
              className="px-4 py-2.5 rounded-xl text-[12px] font-bold bg-[var(--accent-red)] hover:bg-[var(--accent-red-hover)] text-white flex items-center gap-1.5 transition-all cursor-pointer shadow-[0_0_20px_rgba(255,26,60,0.15)]"
            >
              <span className="material-symbols-outlined text-[16px]">visibility</span>
              Registrar Auditoria / Sinalização
            </button>
          </div>

          <div className="glass-card overflow-hidden">
            <div className="px-6 py-4 border-b border-[rgba(255,255,255,0.03)] bg-white/[0.01]">
              <h3 className="text-[12px] font-black uppercase tracking-[1.5px] text-white">Relatório de Verificações de Gravação</h3>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <div className="w-8 h-8 rounded-full border-4 border-t-[var(--accent-red)] border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
                <span className="text-[12px] text-slate-500 uppercase font-bold tracking-[1px]">Carregando Auditorias...</span>
              </div>
            ) : auditorias.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center justify-center gap-3">
                <span className="material-symbols-outlined text-[48px] text-slate-600">visibility_off</span>
                <p className="text-[13px] text-slate-400">Nenhum registro de auditoria realizado.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-[12px] text-slate-300">
                  <thead>
                    <tr className="border-b border-[rgba(255,255,255,0.05)] bg-slate-950/40 text-left text-slate-400 font-bold uppercase text-[9px] tracking-[1px]">
                      <th className="px-6 py-4">Data Registro</th>
                      <th className="px-6 py-4">Câmera / Equipamento</th>
                      <th className="px-6 py-4">Horário do Fato</th>
                      <th className="px-6 py-4">Tipo</th>
                      <th className="px-6 py-4">Fatos Observados</th>
                      <th className="px-6 py-4">Operador CCO</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[rgba(255,255,255,0.02)]">
                    {auditorias.map((a) => {
                      const isSinalizacao = a.tipo === 'SINALIZACAO_IMPORTANTE';
                      return (
                        <tr key={a.id} className="hover:bg-white/[0.01] transition-all">
                          <td className="px-6 py-3.5 font-mono text-slate-500">
                            {new Date(a.createdAt).toLocaleString('pt-BR')}
                          </td>
                          <td className="px-6 py-3.5 font-black text-white uppercase">{a.cameraNome}</td>
                          <td className="px-6 py-3.5 font-mono text-slate-300">
                            {new Date(a.timestampTrecho).toLocaleString('pt-BR')}
                          </td>
                          <td className="px-6 py-3.5">
                            <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-[0.5px] ${
                              isSinalizacao 
                                ? 'bg-[rgba(255,26,60,0.1)] text-[var(--accent-red)] border border-[rgba(255,26,60,0.15)] font-bold'
                                : 'bg-slate-800 text-slate-300'
                            }`}>
                              {isSinalizacao ? 'Sinalização Importante' : 'Auditoria Comum'}
                            </span>
                          </td>
                          <td className="px-6 py-3.5 text-slate-300 max-w-sm truncate" title={a.descricaoFato}>
                            {a.descricaoFato}
                          </td>
                          <td className="px-6 py-3.5 text-slate-400 font-bold">{a.operador}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================= */}
      {/* 3. ABA EXTINTORES RESERVA               */}
      {/* ======================================= */}
      {activeTab === 'extintores' && (
        <div className="flex flex-col gap-6 no-print">
          <div className="flex justify-end">
            <button
              onClick={() => setModalAberto('novo_extintor')}
              className="px-4 py-2.5 rounded-xl text-[12px] font-bold bg-[var(--accent-red)] hover:bg-[var(--accent-red-hover)] text-white flex items-center gap-1.5 transition-all cursor-pointer shadow-[0_0_20px_rgba(255,26,60,0.15)]"
            >
              <span className="material-symbols-outlined text-[16px]">fire_extinguisher</span>
              Registrar Movimentação de Reserva
            </button>
          </div>

          <div className="glass-card overflow-hidden">
            <div className="px-6 py-4 border-b border-[rgba(255,255,255,0.03)] bg-white/[0.01]">
              <h3 className="text-[12px] font-black uppercase tracking-[1.5px] text-white">Livro de Cautela de Extintores de Reserva</h3>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <div className="w-8 h-8 rounded-full border-4 border-t-[var(--accent-red)] border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
                <span className="text-[12px] text-slate-500 uppercase font-bold tracking-[1px]">Carregando Extintores...</span>
              </div>
            ) : extintores.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center justify-center gap-3">
                <span className="material-symbols-outlined text-[48px] text-slate-600">fire_extinguisher</span>
                <p className="text-[13px] text-slate-400">Nenhum registro de extintor de reserva.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-[12px] text-slate-300">
                  <thead>
                    <tr className="border-b border-[rgba(255,255,255,0.05)] bg-slate-950/40 text-left text-slate-400 font-bold uppercase text-[9px] tracking-[1px]">
                      <th className="px-6 py-4">Data/Hora</th>
                      <th className="px-6 py-4">Movimentação</th>
                      <th className="px-6 py-4">Responsável Externo</th>
                      <th className="px-6 py-4">Operador CCO</th>
                      <th className="px-6 py-4">Motivo / Justificativa</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[rgba(255,255,255,0.02)]">
                    {extintores.map((ex) => {
                      const isEntrega = ex.tipoMovimentacao === 'ENTREGA';
                      return (
                        <tr key={ex.id} className="hover:bg-white/[0.01] transition-all">
                          <td className="px-6 py-3.5 font-mono text-slate-500">
                            {new Date(ex.timestamp).toLocaleString('pt-BR')}
                          </td>
                          <td className="px-6 py-3.5">
                            <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-[0.5px] ${
                              isEntrega 
                                ? 'bg-[rgba(52,211,153,0.1)] text-[var(--status-active)]'
                                : 'bg-[rgba(245,158,11,0.1)] text-amber-500'
                            }`}>
                              {isEntrega ? 'Entrega (Saída de Reserva)' : 'Recebimento (Retorno)'}
                            </span>
                          </td>
                          <td className="px-6 py-3.5 font-bold text-slate-200">{ex.responsavelExterno}</td>
                          <td className="px-6 py-3.5 text-slate-400">{ex.operadorCco}</td>
                          <td className="px-6 py-3.5 text-slate-400 italic max-w-sm truncate" title={ex.motivo}>
                            {ex.motivo}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================= */}
      {/* 4. ABA LIVRO DE OCORRÊNCIAS            */}
      {/* ======================================= */}
      {activeTab === 'ocorrencias' && (
        <div className="flex flex-col gap-6 no-print">
          <div className="flex justify-end">
            <button
              onClick={() => setModalAberto('nova_ocorrencia')}
              className="px-4 py-2.5 rounded-xl text-[12px] font-bold bg-[var(--accent-red)] hover:bg-[var(--accent-red-hover)] text-white flex items-center gap-1.5 transition-all cursor-pointer shadow-[0_0_20px_rgba(255,26,60,0.15)]"
            >
              <span className="material-symbols-outlined text-[16px]">add_circle</span>
              Registrar Ocorrência
            </button>
          </div>

          <div className="glass-card overflow-hidden">
            <div className="px-6 py-4 border-b border-[rgba(255,255,255,0.03)] bg-white/[0.01]">
              <h3 className="text-[12px] font-black uppercase tracking-[1.5px] text-white">Livro Digital de Ocorrências e Eventos</h3>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <div className="w-8 h-8 rounded-full border-4 border-t-[var(--accent-red)] border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
                <span className="text-[12px] text-slate-500 uppercase font-bold tracking-[1px]">Carregando Ocorrências...</span>
              </div>
            ) : ocorrencias.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center justify-center gap-3">
                <span className="material-symbols-outlined text-[48px] text-slate-600">book</span>
                <p className="text-[13px] text-slate-400">Nenhum evento registrado no livro.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-[12px] text-slate-300">
                  <thead>
                    <tr className="border-b border-[rgba(255,255,255,0.05)] bg-slate-950/40 text-left text-slate-400 font-bold uppercase text-[9px] tracking-[1px]">
                      <th className="px-6 py-4">Data/Hora</th>
                      <th className="px-6 py-4">Tipo</th>
                      <th className="px-6 py-4">Evento Vinculado</th>
                      <th className="px-6 py-4">Operador CCO</th>
                      <th className="px-6 py-4">Histórico / Fatos Ocorridos</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[rgba(255,255,255,0.02)]">
                    {ocorrencias.map((o) => {
                      const isEvento = o.tipo === 'EVENTO';
                      return (
                        <tr key={o.id} className="hover:bg-white/[0.01] transition-all">
                          <td className="px-6 py-3.5 font-mono text-slate-500">
                            {new Date(o.timestamp).toLocaleString('pt-BR')}
                          </td>
                          <td className="px-6 py-3.5">
                            <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-[0.5px] ${
                              isEvento 
                                ? 'bg-[rgba(255,26,60,0.1)] text-[var(--accent-red)] border border-[rgba(255,26,60,0.15)] font-bold'
                                : 'bg-slate-800 text-slate-300'
                            }`}>
                              {o.tipo}
                            </span>
                          </td>
                          <td className="px-6 py-3.5 font-bold text-slate-200">
                            {o.nomeEvento || '-'}
                          </td>
                          <td className="px-6 py-3.5 text-slate-400">{o.operador}</td>
                          <td className="px-6 py-3.5 text-slate-300 whitespace-pre-line max-w-md">
                            {o.detalhes}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================= */}
      {/* 5. ABA GERADOR DE RELATÓRIOS (PDF/PRINT)*/}
      {/* ======================================= */}
      {activeTab === 'relatorios' && (
        <div className="flex flex-col gap-6">
          {/* Seletor de Período (Oculto na Impressão) */}
          <div className="glass-card p-6 flex flex-col gap-5 no-print">
            <div className="flex items-center gap-2 border-b border-[rgba(255,255,255,0.03)] pb-3">
              <span className="material-symbols-outlined text-[var(--accent-red)]">analytics</span>
              <h3 className="text-[13px] font-black uppercase tracking-[1.5px] text-white">Consolidar Dados e Gerar PDF</h3>
            </div>

            <form onSubmit={handleGerarRelatorio} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-[1px] text-slate-400">Data Inicial</label>
                <input
                  type="date"
                  value={relDataInicio}
                  onChange={(e) => setRelDataInicio(e.target.value)}
                  className="px-4 py-3 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(5,8,18,0.7)] text-white text-[13px] outline-none focus:border-[var(--accent-red)] transition-all"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-[1px] text-slate-400">Data Final</label>
                <input
                  type="date"
                  value={relDataFim}
                  onChange={(e) => setRelDataFim(e.target.value)}
                  className="px-4 py-3 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(5,8,18,0.7)] text-white text-[13px] outline-none focus:border-[var(--accent-red)] transition-all"
                  required
                />
              </div>

              <button
                type="submit"
                className="py-3 px-6 rounded-xl text-[13px] font-bold bg-[var(--accent-red)] hover:bg-[var(--accent-red-hover)] text-white flex items-center justify-center gap-1.5 transition-all shadow-[0_0_20px_rgba(255,26,60,0.15)] cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">build_circle</span>
                Consolidar Relatório
              </button>
            </form>

            <div className="flex flex-wrap gap-4 border-t border-[rgba(255,255,255,0.03)] pt-4 mt-2">
              <label className="flex items-center gap-2 text-[12px] text-slate-400 cursor-pointer">
                <input type="checkbox" checked={incluirAcessos} onChange={(e) => setIncluirAcessos(e.target.checked)} className="rounded accent-[var(--accent-red)]" />
                Registros de Entrada/Saída
              </label>
              <label className="flex items-center gap-2 text-[12px] text-slate-400 cursor-pointer">
                <input type="checkbox" checked={incluirChaves} onChange={(e) => setIncluirChaves(e.target.checked)} className="rounded accent-[var(--accent-red)]" />
                Histórico de Chaves
              </label>
              <label className="flex items-center gap-2 text-[12px] text-slate-400 cursor-pointer">
                <input type="checkbox" checked={incluirOcorrencias} onChange={(e) => setIncluirOcorrencias(e.target.checked)} className="rounded accent-[var(--accent-red)]" />
                Livro de Ocorrências
              </label>
              <label className="flex items-center gap-2 text-[12px] text-slate-400 cursor-pointer">
                <input type="checkbox" checked={incluirCftv} onChange={(e) => setIncluirCftv(e.target.checked)} className="rounded accent-[var(--accent-red)]" />
                Defeitos CFTV
              </label>
              <label className="flex items-center gap-2 text-[12px] text-slate-400 cursor-pointer">
                <input type="checkbox" checked={incluirAuditorias} onChange={(e) => setIncluirAuditorias(e.target.checked)} className="rounded accent-[var(--accent-red)]" />
                Auditorias de Imagem
              </label>
              <label className="flex items-center gap-2 text-[12px] text-slate-400 cursor-pointer">
                <input type="checkbox" checked={incluirExtintores} onChange={(e) => setIncluirExtintores(e.target.checked)} className="rounded accent-[var(--accent-red)]" />
                Movimentação Extintores
              </label>
            </div>
          </div>

          {/* ÁREA DE RELATÓRIO PRONTA PARA IMPRESSÃO / SALVAR EM PDF */}
          {dadosRelatorio ? (
            <div className="flex flex-col gap-6">
              {/* Botão de Visualização Rápida / Impressão */}
              <div className="flex justify-end no-print">
                <button
                  onClick={dispararImpressao}
                  className="px-6 py-3 rounded-xl text-[13px] font-bold bg-[#0f172a] hover:bg-[#1e293b] border border-slate-800 text-white flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">print</span>
                  Imprimir / Salvar em PDF
                </button>
              </div>

              {/* Layout do Relatório de Impressão */}
              <div className="glass-card p-8 bg-slate-900 border border-[rgba(255,255,255,0.04)] print:border-none print:shadow-none print:p-0 print:m-0 print:bg-white print:text-black print-container flex flex-col gap-8">
                {/* Header Timbrado do Relatório */}
                <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.06)] pb-5 print:border-b-2 print:border-black print-header">
                  <div className="flex flex-col">
                    <span className="text-[16px] font-black text-white print:text-black uppercase tracking-[1px]">RELATÓRIO CONSOLIDADO CCO</span>
                    <span className="text-[12px] text-[var(--accent-red)] print:text-black font-bold uppercase tracking-[0.5px]">Farmasi Arena Rio</span>
                  </div>
                  <div className="flex flex-col text-right font-mono text-[11px] text-slate-400 print:text-black">
                    <span>Período: {new Date(relDataInicio).toLocaleDateString('pt-BR')} a {new Date(relDataFim).toLocaleDateString('pt-BR')}</span>
                    <span>Gerado em: {new Date().toLocaleString('pt-BR')}</span>
                  </div>
                </div>

                {/* 1. SEÇÃO ACESSOS */}
                {incluirAcessos && dadosRelatorio.checkins && (
                  <div className="flex flex-col gap-3 print-section">
                    <h4 className="text-[12px] font-black uppercase text-white tracking-[0.5px] border-l-2 border-[var(--accent-red)] pl-2 print:text-black print:border-l-4">
                      1. Controle de Fluxo Operacional (Check-ins/Outs)
                    </h4>
                    {dadosRelatorio.checkins.length === 0 ? (
                      <p className="text-[11px] text-slate-500 italic">Nenhum registro de acesso no período selecionado.</p>
                    ) : (
                      <table className="w-full text-[11px] print-table">
                        <thead>
                          <tr className="bg-slate-950/50 text-slate-400 print:bg-slate-100 print:text-black font-bold text-left border-b border-white/5">
                            <th className="px-4 py-2.5">Nome / Empresa</th>
                            <th className="px-4 py-2.5">Horário Entrada</th>
                            <th className="px-4 py-2.5">Serviço Programado / Operador</th>
                            <th className="px-4 py-2.5">Horário Saída</th>
                            <th className="px-4 py-2.5">Serviços Extras / Operador</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.03] print:divide-slate-200">
                          {dadosRelatorio.checkins.map((x: any) => (
                            <tr key={x.id} className="text-slate-300 print:text-black">
                              <td className="px-4 py-2.5">
                                <strong className="text-white print:text-black block">{x.colaborador.nomeCompleto}</strong>
                                <span className="text-[9px] text-slate-500 print:text-slate-700 block uppercase">{x.colaborador.empresa.nome}</span>
                              </td>
                              <td className="px-4 py-2.5 font-mono">{new Date(x.timestampEntrada).toLocaleString('pt-BR')}</td>
                              <td className="px-4 py-2.5">
                                <span className="block">"{x.descricaoServico}"</span>
                                <span className="text-[9px] text-slate-500 block">Op: {x.operadorEntrada}</span>
                              </td>
                              <td className="px-4 py-2.5 font-mono">{x.timestampSaida ? new Date(x.timestampSaida).toLocaleString('pt-BR') : '-'}</td>
                              <td className="px-4 py-2.5">
                                <span className="block">"{x.servicosExtras || '-'}"</span>
                                <span className="text-[9px] text-slate-500 block">Op: {x.operadorSaida || '-'}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}

                {/* 2. SEÇÃO CHAVES */}
                {incluirChaves && dadosRelatorio.chavesMovimentadas && (
                  <div className="flex flex-col gap-3 print-section">
                    <h4 className="text-[12px] font-black uppercase text-white tracking-[0.5px] border-l-2 border-[var(--accent-red)] pl-2 print:text-black print:border-l-4">
                      2. Cautela e Movimentações de Chaves CCO
                    </h4>
                    {dadosRelatorio.chavesMovimentadas.length === 0 ? (
                      <p className="text-[11px] text-slate-500 italic">Nenhum empréstimo no período.</p>
                    ) : (
                      <table className="w-full text-[11px] print-table">
                        <thead>
                          <tr className="bg-slate-950/50 text-slate-400 print:bg-slate-100 print:text-black font-bold text-left border-b border-white/5">
                            <th className="px-4 py-2.5">Horário</th>
                            <th className="px-4 py-2.5">Chave / Fechadura</th>
                            <th className="px-4 py-2.5">Ação</th>
                            <th className="px-4 py-2.5">Portador / Responsável</th>
                            <th className="px-4 py-2.5">Operador CCO</th>
                            <th className="px-4 py-2.5">Observações</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.03] print:divide-slate-200">
                          {dadosRelatorio.chavesMovimentadas.map((ch: any) => (
                            <tr key={ch.id} className="text-slate-300 print:text-black">
                              <td className="px-4 py-2.5 font-mono">{new Date(ch.timestamp).toLocaleString('pt-BR')}</td>
                              <td className="px-4 py-2.5 font-bold uppercase">{ch.chaveCodigo}</td>
                              <td className="px-4 py-2.5 uppercase font-bold text-slate-400 print:text-black">{ch.acao}</td>
                              <td className="px-4 py-2.5">{ch.responsavel}</td>
                              <td className="px-4 py-2.5">{ch.operador}</td>
                              <td className="px-4 py-2.5 italic">"{ch.observacao || '-'}"</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}

                {/* 3. SEÇÃO CFTV DEFEITOS */}
                {incluirCftv && dadosRelatorio.defeitos && (
                  <div className="flex flex-col gap-3 print-section">
                    <h4 className="text-[12px] font-black uppercase text-white tracking-[0.5px] border-l-2 border-[var(--accent-red)] pl-2 print:text-black print:border-l-4">
                      3. Chamados de Defeito CFTV / Segurança Eletrônica
                    </h4>
                    {dadosRelatorio.defeitos.length === 0 ? (
                      <p className="text-[11px] text-slate-500 italic">Nenhum chamado registrado no período.</p>
                    ) : (
                      <table className="w-full text-[11px] print-table">
                        <thead>
                          <tr className="bg-slate-950/50 text-slate-400 print:bg-slate-100 print:text-black font-bold text-left border-b border-white/5">
                            <th className="px-4 py-2.5">Data Ocorrido</th>
                            <th className="px-4 py-2.5">Câmera / Equipamento</th>
                            <th className="px-4 py-2.5">Descrição do Defeito</th>
                            <th className="px-4 py-2.5">Operador CCO</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.03] print:divide-slate-200">
                          {dadosRelatorio.defeitos.map((def: any) => (
                            <tr key={def.id} className="text-slate-300 print:text-black">
                              <td className="px-4 py-2.5 font-mono">{new Date(def.dataHora).toLocaleString('pt-BR')}</td>
                              <td className="px-4 py-2.5 font-bold uppercase">{def.equipamentoNome}</td>
                              <td className="px-4 py-2.5">"{def.descricao}"</td>
                              <td className="px-4 py-2.5">{def.operador}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}

                {/* 4. SEÇÃO AUDITORIA IMAGENS */}
                {incluirAuditorias && dadosRelatorio.auditorias && (
                  <div className="flex flex-col gap-3 print-section">
                    <h4 className="text-[12px] font-black uppercase text-white tracking-[0.5px] border-l-2 border-[var(--accent-red)] pl-2 print:text-black print:border-l-4">
                      4. Auditorias e Sinalizações de Imagens CFTV
                    </h4>
                    {dadosRelatorio.auditorias.length === 0 ? (
                      <p className="text-[11px] text-slate-500 italic">Nenhuma auditoria ou trecho de imagem registrado.</p>
                    ) : (
                      <table className="w-full text-[11px] print-table">
                        <thead>
                          <tr className="bg-slate-950/50 text-slate-400 print:bg-slate-100 print:text-black font-bold text-left border-b border-white/5">
                            <th className="px-4 py-2.5">Câmera / Equipamento</th>
                            <th className="px-4 py-2.5">Horário do Fato</th>
                            <th className="px-4 py-2.5">Tipo</th>
                            <th className="px-4 py-2.5">Relato dos Fatos</th>
                            <th className="px-4 py-2.5">Operador</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.03] print:divide-slate-200">
                          {dadosRelatorio.auditorias.map((aud: any) => (
                            <tr key={aud.id} className="text-slate-300 print:text-black">
                              <td className="px-4 py-2.5 font-bold uppercase">{aud.cameraNome}</td>
                              <td className="px-4 py-2.5 font-mono">{new Date(aud.timestampTrecho).toLocaleString('pt-BR')}</td>
                              <td className="px-4 py-2.5 uppercase font-bold">{aud.tipo}</td>
                              <td className="px-4 py-2.5">"{aud.descricaoFato}"</td>
                              <td className="px-4 py-2.5">{aud.operador}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}

                {/* 5. SEÇÃO EXTINTORES */}
                {incluirExtintores && dadosRelatorio.extintores && (
                  <div className="flex flex-col gap-3 print-section">
                    <h4 className="text-[12px] font-black uppercase text-white tracking-[0.5px] border-l-2 border-[var(--accent-red)] pl-2 print:text-black print:border-l-4">
                      5. Controle de Extintores Reserva
                    </h4>
                    {dadosRelatorio.extintores.length === 0 ? (
                      <p className="text-[11px] text-slate-500 italic">Nenhuma cautela de extintor de reserva registrada.</p>
                    ) : (
                      <table className="w-full text-[11px] print-table">
                        <thead>
                          <tr className="bg-slate-950/50 text-slate-400 print:bg-slate-100 print:text-black font-bold text-left border-b border-white/5">
                            <th className="px-4 py-2.5">Data/Hora</th>
                            <th className="px-4 py-2.5">Movimentação</th>
                            <th className="px-4 py-2.5">Responsável Externo</th>
                            <th className="px-4 py-2.5">Operador CCO</th>
                            <th className="px-4 py-2.5">Motivo / Justificativa</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.03] print:divide-slate-200">
                          {dadosRelatorio.extintores.map((ex: any) => (
                            <tr key={ex.id} className="text-slate-300 print:text-black">
                              <td className="px-4 py-2.5 font-mono">{new Date(ex.timestamp).toLocaleString('pt-BR')}</td>
                              <td className="px-4 py-2.5 font-bold uppercase">{ex.tipoMovimentacao}</td>
                              <td className="px-4 py-2.5">{ex.responsavelExterno}</td>
                              <td className="px-4 py-2.5">{ex.operadorCco}</td>
                              <td className="px-4 py-2.5 italic">"{ex.motivo}"</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}

                {/* 6. SEÇÃO OCORRÊNCIAS */}
                {incluirOcorrencias && dadosRelatorio.ocorrencias && (
                  <div className="flex flex-col gap-3 print-section">
                    <h4 className="text-[12px] font-black uppercase text-white tracking-[0.5px] border-l-2 border-[var(--accent-red)] pl-2 print:text-black print:border-l-4">
                      6. Livro de Ocorrências e Eventos
                    </h4>
                    {dadosRelatorio.ocorrencias.length === 0 ? (
                      <p className="text-[11px] text-slate-500 italic">Nenhum evento registrado no livro.</p>
                    ) : (
                      <table className="w-full text-[11px] print-table">
                        <thead>
                          <tr className="bg-slate-950/50 text-slate-400 print:bg-slate-100 print:text-black font-bold text-left border-b border-white/5">
                            <th className="px-4 py-2.5">Data/Hora</th>
                            <th className="px-4 py-2.5">Tipo</th>
                            <th className="px-4 py-2.5">Evento Vinculado</th>
                            <th className="px-4 py-2.5">Operador CCO</th>
                            <th className="px-4 py-2.5">Histórico / Fatos Ocorridos</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.03] print:divide-slate-200">
                          {dadosRelatorio.ocorrencias.map((oc: any) => (
                            <tr key={oc.id} className="text-slate-300 print:text-black">
                              <td className="px-4 py-2.5 font-mono">{new Date(oc.timestamp).toLocaleString('pt-BR')}</td>
                              <td className="px-4 py-2.5 font-bold uppercase">{oc.tipo}</td>
                              <td className="px-4 py-2.5 font-bold">{oc.nomeEvento || '-'}</td>
                              <td className="px-4 py-2.5">{oc.operador}</td>
                              <td className="px-4 py-2.5 whitespace-pre-line text-slate-400 print:text-black">"{oc.detalhes}"</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}

                {/* Rodapé do Relatório Impresso */}
                <div className="border-t border-[rgba(255,255,255,0.06)] pt-5 text-center text-[10px] text-slate-500 print:text-black print:border-t-2 print:border-black mt-8 flex justify-between">
                  <span>Farmasi Arena - CCO Controle de Operações</span>
                  <span>Página 1 de 1</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="glass-card p-12 text-center flex flex-col items-center justify-center gap-3">
              <span className="material-symbols-outlined text-[48px] text-slate-600">analytics</span>
              <p className="text-[13px] text-slate-400">Preencha o período acima e clique em Consolidar para visualizar o relatório.</p>
            </div>
          )}
        </div>
      )}

      {/* ======================================= */}
      {/* MODAL 1: CADASTRAR CÂMERA/CFTV           */}
      {/* ======================================= */}
      {modalAberto === 'nova_camera' && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-[4px] flex items-center justify-center z-50 p-4">
          <div className="glass-card max-w-md w-full p-6 flex flex-col gap-5 border border-[rgba(255,255,255,0.06)]">
            <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.03)] pb-3">
              <div className="flex items-center gap-2 text-white">
                <span className="material-symbols-outlined text-[var(--accent-red)]">videocam</span>
                <h4 className="text-[13px] font-black uppercase tracking-[1.5px]">Cadastrar Câmera</h4>
              </div>
              <button onClick={fecharModais} className="text-slate-500 hover:text-white transition-all cursor-pointer">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleCadastrarCamera} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-[1px] text-slate-400">Nome / Identificador do Equipamento</label>
                <input
                  type="text"
                  placeholder="Ex: Câmera Portão 1 (LPR)"
                  value={camNome}
                  onChange={(e) => setCamNome(e.target.value)}
                  className="px-4 py-3 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(5,8,18,0.7)] text-white text-[13px] outline-none focus:border-[var(--accent-red)] transition-all"
                  required
                  disabled={isPending}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-[1px] text-slate-400">Tipo de Equipamento</label>
                <select
                  value={camTipo}
                  onChange={(e) => setCamTipo(e.target.value)}
                  className="px-4 py-3.5 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(5,8,18,0.7)] text-white text-[13px] outline-none focus:border-[var(--accent-red)] cursor-pointer transition-all"
                  disabled={isPending}
                >
                  <option value="LPR" className="bg-[#0c122b]">Leitor de Placas (LPR)</option>
                  <option value="RECONHECIMENTO_FACIAL" className="bg-[#0c122b]">Reconhecimento Facial</option>
                  <option value="ALARME_MOVIMENTO" className="bg-[#0c122b]">Alarme por Movimento</option>
                  <option value="CAMERA_AUDIO" className="bg-[#0c122b]">Câmeras com Áudio</option>
                  <option value="BODY_CAM" className="bg-[#0c122b]">Body Cam (Câmera Corporal)</option>
                  <option value="CFTV_PADRAO" className="bg-[#0c122b]">CFTV Geral Padrão</option>
                </select>
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
                  Confirmar Cadastro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================= */}
      {/* MODAL 2: REPORTAR DEFEITO / CHAMADO      */}
      {/* ======================================= */}
      {modalAberto === 'reportar_defeito' && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-[4px] flex items-center justify-center z-50 p-4">
          <div className="glass-card max-w-md w-full p-6 flex flex-col gap-5 border border-[rgba(255,255,255,0.06)]">
            <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.03)] pb-3">
              <div className="flex items-center gap-2 text-white">
                <span className="material-symbols-outlined text-amber-500">report_problem</span>
                <h4 className="text-[13px] font-black uppercase tracking-[1.5px]">Reportar Defeito</h4>
              </div>
              <button onClick={fecharModais} className="text-slate-500 hover:text-white transition-all cursor-pointer">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleReportarDefeito} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-[1px] text-slate-400">Selecionar Câmera com Defeito</label>
                <select
                  value={defeitoCamNome}
                  onChange={(e) => setDefeitoCamNome(e.target.value)}
                  className="px-4 py-3.5 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(5,8,18,0.7)] text-white text-[13px] outline-none focus:border-[var(--accent-red)] cursor-pointer transition-all"
                  required
                  disabled={isPending}
                >
                  <option value="" disabled>Selecione a câmera...</option>
                  {cftvs.filter(c => c.status === 'DISPONIVEL').map((c) => (
                    <option key={c.id} value={c.nome} className="bg-[#0c122b] text-white">
                      {c.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-[1px] text-slate-400">Descreva o Defeito Técnico</label>
                <textarea
                  placeholder="Ex: Sinal de vídeo intermitente com barras estáticas ou perda total de imagem..."
                  value={defeitoDesc}
                  onChange={(e) => setDefeitoDesc(e.target.value)}
                  className="px-4 py-3 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(5,8,18,0.7)] text-white text-[12px] outline-none focus:border-[var(--accent-red)] transition-all min-h-[90px] resize-none"
                  required
                  disabled={isPending}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-[1px] text-slate-400">Operador CCO Registrando</label>
                <input
                  type="text"
                  placeholder="Seu nome"
                  value={operadorDefeito}
                  onChange={(e) => setOperadorDefeito(e.target.value)}
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
                  className="flex-1 py-3 rounded-xl text-[12px] font-bold uppercase tracking-[0.5px] bg-amber-500 hover:bg-amber-600 text-white shadow-[0_0_20px_rgba(245,158,11,0.15)] flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                  disabled={isPending}
                >
                  Lançar Chamado
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================= */}
      {/* MODAL 3: REGISTRAR AUDITORIA IMAGEM      */}
      {/* ======================================= */}
      {modalAberto === 'nova_auditoria' && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-[4px] flex items-center justify-center z-50 p-4">
          <div className="glass-card max-w-md w-full p-6 flex flex-col gap-5 border border-[rgba(255,255,255,0.06)]">
            <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.03)] pb-3">
              <div className="flex items-center gap-2 text-white">
                <span className="material-symbols-outlined text-[var(--accent-red)]">visibility</span>
                <h4 className="text-[13px] font-black uppercase tracking-[1.5px]">Lançar Auditoria</h4>
              </div>
              <button onClick={fecharModais} className="text-slate-500 hover:text-white transition-all cursor-pointer">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleCadastrarAuditoria} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-[1px] text-slate-400">Tipo de Registro</label>
                <select
                  value={audTipo}
                  onChange={(e) => setAudTipo(e.target.value as any)}
                  className="px-4 py-3.5 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(5,8,18,0.7)] text-white text-[13px] outline-none focus:border-[var(--accent-red)] cursor-pointer transition-all"
                  disabled={isPending}
                >
                  <option value="AUDITORIA" className="bg-[#0c122b]">Auditoria de Imagens Comum</option>
                  <option value="SINALIZACAO_IMPORTANTE" className="bg-[#0c122b]">Sinalização de Imagem Importante (Destaque)</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-[1px] text-slate-400">Selecionar Câmera / Equipamento</label>
                <select
                  value={audCamNome}
                  onChange={(e) => setAudCamNome(e.target.value)}
                  className="px-4 py-3.5 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(5,8,18,0.7)] text-white text-[13px] outline-none focus:border-[var(--accent-red)] cursor-pointer transition-all"
                  required
                  disabled={isPending}
                >
                  <option value="" disabled>Selecione a câmera...</option>
                  {cftvs.map((c) => (
                    <option key={c.id} value={c.nome} className="bg-[#0c122b] text-white">
                      {c.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-[1px] text-slate-400">Data do Trecho</label>
                  <input
                    type="date"
                    value={audTrechoData}
                    onChange={(e) => setAudTrechoData(e.target.value)}
                    className="px-4 py-3 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(5,8,18,0.7)] text-white text-[13px] outline-none focus:border-[var(--accent-red)] transition-all"
                    required
                    disabled={isPending}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-[1px] text-slate-400">Hora do Trecho</label>
                  <input
                    type="time"
                    value={audTrechoHora}
                    onChange={(e) => setAudTrechoHora(e.target.value)}
                    className="px-4 py-3 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(5,8,18,0.7)] text-white text-[13px] outline-none focus:border-[var(--accent-red)] transition-all"
                    required
                    disabled={isPending}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-[1px] text-slate-400">Fatos e Ocorrências Visualizadas</label>
                <textarea
                  placeholder="Relate detalhadamente o que foi verificado nas imagens..."
                  value={audDesc}
                  onChange={(e) => setAudDesc(e.target.value)}
                  className="px-4 py-3 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(5,8,18,0.7)] text-white text-[12px] outline-none focus:border-[var(--accent-red)] transition-all min-h-[90px] resize-none"
                  required
                  disabled={isPending}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-[1px] text-slate-400">Operador CCO Realizando Auditoria</label>
                <input
                  type="text"
                  placeholder="Seu nome"
                  value={audOperador}
                  onChange={(e) => setAudOperador(e.target.value)}
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
                  className="flex-1 py-3 rounded-xl text-[12px] font-bold uppercase tracking-[0.5px] bg-[var(--accent-red)] hover:bg-[var(--accent-red-hover)] text-white shadow-[0_0_20px_rgba(255,26,60,0.15)] flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                  disabled={isPending}
                >
                  Salvar Registro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================= */}
      {/* MODAL 4: MOVER EXTINTOR RESERVA          */}
      {/* ======================================= */}
      {modalAberto === 'novo_extintor' && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-[4px] flex items-center justify-center z-50 p-4">
          <div className="glass-card max-w-md w-full p-6 flex flex-col gap-5 border border-[rgba(255,255,255,0.06)]">
            <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.03)] pb-3">
              <div className="flex items-center gap-2 text-white">
                <span className="material-symbols-outlined text-[var(--accent-red)]">fire_extinguisher</span>
                <h4 className="text-[13px] font-black uppercase tracking-[1.5px]">Movimentação de Extintor</h4>
              </div>
              <button onClick={fecharModais} className="text-slate-500 hover:text-white transition-all cursor-pointer">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleRegistrarExtintor} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-[1px] text-slate-400">Tipo de Movimentação</label>
                <select
                  value={extTipo}
                  onChange={(e) => setExtTipo(e.target.value as any)}
                  className="px-4 py-3.5 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(5,8,18,0.7)] text-white text-[13px] outline-none focus:border-[var(--accent-red)] cursor-pointer transition-all"
                  disabled={isPending}
                >
                  <option value="ENTREGA" className="bg-[#0c122b]">Entrega (Saída do CCO para Setor)</option>
                  <option value="RECEBIMENTO" className="bg-[#0c122b]">Recebimento (Retorno de Extintor ao CCO)</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-[1px] text-slate-400">Responsável Externo (Recebeu/Entregou)</label>
                <input
                  type="text"
                  placeholder="Ex: Bombeiro Civil Santos ou Prestador Silva"
                  value={extResponsavelExterno}
                  onChange={(e) => setExtResponsavelExterno(e.target.value)}
                  className="px-4 py-3 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(5,8,18,0.7)] text-white text-[13px] outline-none focus:border-[var(--accent-red)] transition-all"
                  required
                  disabled={isPending}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-[1px] text-slate-400">Operador CCO Registrando</label>
                <input
                  type="text"
                  placeholder="Seu nome"
                  value={extOperador}
                  onChange={(e) => setExtOperador(e.target.value)}
                  className="px-4 py-3 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(5,8,18,0.7)] text-white text-[13px] outline-none focus:border-[var(--accent-red)] transition-all"
                  required
                  disabled={isPending}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-[1px] text-slate-400">Motivo da Substituição / Cautela</label>
                <textarea
                  placeholder="Justifique a movimentação do extintor reserva (Ex: Substituição temporária por vencimento ou descarga no setor ADM)..."
                  value={extMotivo}
                  onChange={(e) => setExtMotivo(e.target.value)}
                  className="px-4 py-3 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(5,8,18,0.7)] text-white text-[12px] outline-none focus:border-[var(--accent-red)] transition-all min-h-[90px] resize-none"
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
                  className="flex-1 py-3 rounded-xl text-[12px] font-bold uppercase tracking-[0.5px] bg-[var(--accent-red)] hover:bg-[var(--accent-red-hover)] text-white shadow-[0_0_20px_rgba(255,26,60,0.15)] flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                  disabled={isPending}
                >
                  Salvar Registro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================= */}
      {/* MODAL 5: REGISTRAR OCORRÊNCIA            */}
      {/* ======================================= */}
      {modalAberto === 'nova_ocorrencia' && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-[4px] flex items-center justify-center z-50 p-4">
          <div className="glass-card max-w-md w-full p-6 flex flex-col gap-5 border border-[rgba(255,255,255,0.06)]">
            <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.03)] pb-3">
              <div className="flex items-center gap-2 text-white">
                <span className="material-symbols-outlined text-[var(--accent-red)]">add_circle</span>
                <h4 className="text-[13px] font-black uppercase tracking-[1.5px]">Lançar Ocorrência</h4>
              </div>
              <button onClick={fecharModais} className="text-slate-500 hover:text-white transition-all cursor-pointer">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleCadastrarOcorrencia} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-[1px] text-slate-400">Tipo de Ocorrência</label>
                <select
                  value={ocTipo}
                  onChange={(e) => setOcTipo(e.target.value as any)}
                  className="px-4 py-3.5 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(5,8,18,0.7)] text-white text-[13px] outline-none focus:border-[var(--accent-red)] cursor-pointer transition-all"
                  disabled={isPending}
                >
                  <option value="GERAL" className="bg-[#0c122b]">Ocorrência Geral (Cotidiano / Plantão)</option>
                  <option value="EVENTO" className="bg-[#0c122b]">Ocorrência Vinculada a Evento</option>
                </select>
              </div>

              {ocTipo === 'EVENTO' && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-[1px] text-slate-400">Nome Oficial do Evento</label>
                  <input
                    type="text"
                    placeholder="Ex: Show Roberto Carlos ou Partida Basquete Fla-Flu"
                    value={ocEventoNome}
                    onChange={(e) => setOcEventoNome(e.target.value)}
                    className="px-4 py-3 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(5,8,18,0.7)] text-white text-[13px] outline-none focus:border-[var(--accent-red)] transition-all"
                    required={ocTipo === 'EVENTO'}
                    disabled={isPending}
                  />
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-[1px] text-slate-400">Operador CCO Lançando</label>
                <input
                  type="text"
                  placeholder="Seu nome"
                  value={ocOperador}
                  onChange={(e) => setOcOperador(e.target.value)}
                  className="px-4 py-3 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(5,8,18,0.7)] text-white text-[13px] outline-none focus:border-[var(--accent-red)] transition-all"
                  required
                  disabled={isPending}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-[1px] text-slate-400">Histórico de Fatos e Detalhes</label>
                <textarea
                  placeholder="Relate detalhadamente a ocorrência com locais, pessoas envolvidas e providências tomadas..."
                  value={ocDetalhes}
                  onChange={(e) => setOcDetalhes(e.target.value)}
                  className="px-4 py-3 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(5,8,18,0.7)] text-white text-[12px] outline-none focus:border-[var(--accent-red)] transition-all min-h-[110px] resize-none"
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
                  className="flex-1 py-3 rounded-xl text-[12px] font-bold uppercase tracking-[0.5px] bg-[var(--accent-red)] hover:bg-[var(--accent-red-hover)] text-white shadow-[0_0_20px_rgba(255,26,60,0.15)] flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                  disabled={isPending}
                >
                  Gravar Ocorrência
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
