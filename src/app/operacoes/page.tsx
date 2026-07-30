'use client';

import React, { useState, useEffect, useTransition, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  getNvrsComCameras,
  simularHeartbeatCftv,
  reportarFalhaCamera,
  resolverFalhaCamera,
  getHistoricoQuedas,
  getAuditoriasImagens,
  cadastrarAuditoriaImagem,
  getControleExtintores,
  registrarMovimentacaoExtintor,
  getOcorrencias,
  cadastrarOcorrencia,
  getDadosRelatorioUnificado,
  realizarLimpezaAnualBanco,
  NvrInfo,
  CameraCftvInfo,
  HistoricoQuedaInfo,
  AuditoriaImagemInfo,
  ControleExtintorInfo,
  OcorrenciaInfo
} from '../actions';

export default function OperacoesPage() {
  const [activeTab, setActiveTab] = useState<'cftv' | 'auditoria' | 'extintores' | 'ocorrencias' | 'relatorios'>('cftv');
  const [isPending, startTransition] = useTransition();

  // Estados de dados
  const [nvrs, setNvrs] = useState<NvrInfo[]>([]);
  const [quedas, setQuedas] = useState<HistoricoQuedaInfo[]>([]);
  const [auditorias, setAuditorias] = useState<AuditoriaImagemInfo[]>([]);
  const [extintores, setExtintores] = useState<ControleExtintorInfo[]>([]);
  const [ocorrencias, setOcorrencias] = useState<OcorrenciaInfo[]>([]);
  const [ocorrenciaSelecionadaDetalhe, setOcorrenciaSelecionadaDetalhe] = useState<OcorrenciaInfo | null>(null);
  const [fotoVisualizarLightbox, setFotoVisualizarLightbox] = useState<string | null>(null);

  // Estados de loading
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ tipo: 'sucesso' | 'erro'; msg: string } | null>(null);

  // Controle de Acordeões (NVRs abertos)
  const [nvrsExpandidos, setNvrsExpandidos] = useState<{ [key: string]: boolean }>({
    'NVR-01': true // Primeiro NVR expandido por padrão
  });

  // Estados de Modais
  const [modalAberto, setModalAberto] = useState<'reportar_falha' | 'concluir_reparo' | 'nova_auditoria' | 'novo_extintor' | 'nova_ocorrencia' | 'assistente_exportacao' | 'detalhe_ocorrencia' | null>(null);
  
  // Seleções para modais de Câmera
  const [selecionadaCameraId, setSelecionadaCameraId] = useState('');
  const [selecionadaCameraCodigo, setSelecionadaCameraCodigo] = useState('');
  const [selecionadaCameraNome, setSelecionadaCameraNome] = useState('');
  const [justificativaFalha, setJustificativaFalha] = useState('');
  const [solucaoReparo, setSolucaoReparo] = useState('');
  const [operadorAcao, setOperadorAcao] = useState('');

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

  // Form Ocorrências (Foto e Campos)
  const [ocTipo, setOcTipo] = useState<'GERAL' | 'EVENTO'>('GERAL');
  const [ocEventoNome, setOcEventoNome] = useState('');
  const [ocOperador, setOcOperador] = useState('');
  const [ocDetalhes, setOcDetalhes] = useState('');
  const [ocFotoBase64, setOcFotoBase64] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Estados do Assistente de Exportação / Fechamento
  const [tipoExportacaoDesejada, setTipoExportacaoDesejada] = useState<'EXCEL' | 'PDF' | null>(null);
  const [passoFechamento, setPassoFechamento] = useState<'ESCOLHA' | 'CONFIRMACAO_LIMPEZA' | null>(null);
  const [anoConfirmacao, setAnoConfirmacao] = useState('');

  // Carregar dados conforme a aba ativa
  useEffect(() => {
    carregarDados();
  }, [activeTab]);

  // Loop de pulsação e atualização do CFTV (apenas quando na aba CFTV e modais fechados)
  useEffect(() => {
    if (activeTab !== 'cftv' || modalAberto !== null) return;

    const intervalId = setInterval(async () => {
      try {
        await simularHeartbeatCftv();
        const n = await getNvrsComCameras();
        const q = await getHistoricoQuedas();
        setNvrs(n);
        setQuedas(q);
      } catch (err) {
        console.error('Falha no batimento de pulsação do CFTV:', err);
      }
    }, 6000);

    return () => clearInterval(intervalId);
  }, [activeTab, modalAberto]);

  const carregarDados = async () => {
    setLoading(true);
    try {
      if (activeTab === 'cftv') {
        const n = await getNvrsComCameras();
        const q = await getHistoricoQuedas();
        setNvrs(n);
        setQuedas(q);
      } else if (activeTab === 'auditoria') {
        const a = await getAuditoriasImagens();
        const n = await getNvrsComCameras();
        setAuditorias(a);
        setNvrs(n);
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

  const toggleNvr = (codigo: string) => {
    setNvrsExpandidos(prev => ({
      ...prev,
      [codigo]: !prev[codigo]
    }));
  };

  const fecharModais = () => {
    setModalAberto(null);
    setJustificativaFalha('');
    setSolucaoReparo('');
    setOperadorAcao('');
    setAudDesc('');
    setExtMotivo('');
    setOcDetalhes('');
    setOcFotoBase64('');
    setTipoExportacaoDesejada(null);
    setPassoFechamento(null);
    setAnoConfirmacao('');
    setFotoVisualizarLightbox(null);
  };

  // Processar e comprimir imagem da ocorrência localmente via HTML5 Canvas
  const handleSelecionarFotoOcorrencia = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 300;
        const scaleSize = MAX_WIDTH / img.width;
        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scaleSize;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.75);
          setOcFotoBase64(compressedBase64);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Fluxo de Reportar Falha (Abertura de Chamado)
  const handleAbreModalFalha = (cam: CameraCftvInfo) => {
    setSelecionadaCameraId(cam.id);
    setSelecionadaCameraCodigo(cam.codigo);
    setSelecionadaCameraNome(cam.nome);
    setModalAberto('reportar_falha');
  };

  const handleSubmitFalha = (e: React.FormEvent) => {
    e.preventDefault();
    if (!justificativaFalha.trim() || !operadorAcao.trim()) {
      mostrarFeedback('erro', 'Informe a justificativa e o operador.');
      return;
    }

    startTransition(async () => {
      try {
        await reportarFalhaCamera(selecionadaCameraId, justificativaFalha, operadorAcao);
        mostrarFeedback('sucesso', `Câmera ${selecionadaCameraCodigo} colocada em manutenção!`);
        fecharModais();
        carregarDados();
      } catch (err: any) {
        mostrarFeedback('erro', err.message || 'Erro ao registrar chamado técnico.');
      }
    });
  };

  // Fluxo de Resolver Falha (Encerramento de Chamado)
  const handleAbreModalReparo = (cam: CameraCftvInfo) => {
    setSelecionadaCameraId(cam.id);
    setSelecionadaCameraCodigo(cam.codigo);
    setSelecionadaCameraNome(cam.nome);
    setModalAberto('concluir_reparo');
  };

  const handleSubmitReparo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!solucaoReparo.trim() || !operadorAcao.trim()) {
      mostrarFeedback('erro', 'Informe a resolução e o operador.');
      return;
    }

    startTransition(async () => {
      try {
        await resolverFalhaCamera(selecionadaCameraId, operadorAcao, solucaoReparo);
        mostrarFeedback('sucesso', `Câmera ${selecionadaCameraCodigo} restabelecida com sucesso!`);
        fecharModais();
        carregarDados();
      } catch (err: any) {
        mostrarFeedback('erro', err.message || 'Erro ao encerrar chamado técnico.');
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

  // Submit Ocorrência com Foto
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
          detalhes: ocDetalhes,
          fotoBase64: ocFotoBase64 || undefined
        });
        mostrarFeedback('sucesso', 'Ocorrência lançada no livro de ocorrências!');
        fecharModais();
        carregarDados();
      } catch (err: any) {
        mostrarFeedback('erro', err.message || 'Erro ao salvar ocorrência.');
      }
    });
  };

  // Geração de Relatório
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

  // Função auxiliar de auto-ajuste de colunas para planilhas excel
  const autoAjustarColunas = (ws: XLSX.WorkSheet, dados: any[]) => {
    if (!dados || dados.length === 0) return;
    const colunas = Object.keys(dados[0]);
    const larguras = colunas.map(col => {
      let maxLen = col.length;
      dados.forEach(row => {
        const val = row[col] ? String(row[col]) : '';
        if (val.length > maxLen) {
          maxLen = val.length;
        }
      });
      // Adiciona uma margem de segurança de 4 caracteres, máximo 65
      return { wch: Math.min(maxLen + 4, 65) };
    });
    ws['!cols'] = larguras;
  };

  // Exportar dados efetivos em planilha Excel Multi-abas com layout e cabeçalhos em caixa alta
  const gerarExcelEfetivo = () => {
    try {
      const wb = XLSX.utils.book_new();

      // 1. Aba Acessos Portaria (Check-ins/Outs)
      if (incluirAcessos && dadosRelatorio.checkins) {
        const dadosAcessos = dadosRelatorio.checkins.map((x: any) => ({
          'NOME COLABORADOR': x.colaborador.nomeCompleto,
          'CPF': x.colaborador.cpf,
          'EMPRESA': x.colaborador.empresa.nome,
          'ENTRADA (DATA/HORA)': new Date(x.timestampEntrada).toLocaleString('pt-BR'),
          'SERVIÇO PROGRAMADO': x.descricaoServico,
          'OPERADOR ENTRADA': x.operadorEntrada,
          'SAÍDA (DATA/HORA)': x.timestampSaida ? new Date(x.timestampSaida).toLocaleString('pt-BR') : 'Ainda na Arena',
          'SERVIÇOS EXTRAS / OCORRÊNCIA': x.servicosExtras || '-',
          'OPERADOR SAÍDA': x.operadorSaida || '-'
        }));
        const ws = XLSX.utils.json_to_sheet(dadosAcessos);
        autoAjustarColunas(ws, dadosAcessos);
        XLSX.utils.book_append_sheet(wb, ws, 'Acessos Portaria');
      }

      // 2. Aba Cautela de Chaves
      if (incluirChaves && dadosRelatorio.chavesMovimentadas) {
        const dadosChaves = dadosRelatorio.chavesMovimentadas.map((ch: any) => ({
          'DATA/HORA': new Date(ch.timestamp).toLocaleString('pt-BR'),
          'CHAVE / FECHADURA': ch.chaveCodigo,
          'AÇÃO': ch.acao,
          'RESPONSÁVEL (RETIRADA/REPORTE)': ch.responsavel,
          'OPERADOR CCO': ch.operador,
          'JUSTIFICATIVA/OBSERVAÇÕES': ch.observacao || '-'
        }));
        const ws = XLSX.utils.json_to_sheet(dadosChaves);
        autoAjustarColunas(ws, dadosChaves);
        XLSX.utils.book_append_sheet(wb, ws, 'Cautela de Chaves');
      }

      // 3. Aba Livro de Ocorrências
      if (incluirOcorrencias && dadosRelatorio.ocorrencias) {
        const dadosOcorrencias = dadosRelatorio.ocorrencias.map((oc: any) => ({
          'DATA/HORA': new Date(oc.timestamp).toLocaleString('pt-BR'),
          'TIPO': oc.tipo,
          'EVENTO VINCULADO': oc.nomeEvento || '-',
          'OPERADOR CCO': oc.operador,
          'HISTÓRICO / FATOS OCORRIDOS': oc.detalhes,
          'EVIDÊNCIA FOTOGRÁFICA': oc.fotoUrl || 'Sem Foto'
        }));
        const ws = XLSX.utils.json_to_sheet(dadosOcorrencias);
        autoAjustarColunas(ws, dadosOcorrencias);
        XLSX.utils.book_append_sheet(wb, ws, 'Ocorrências');
      }

      // 4. Aba Auditoria de Imagens
      if (incluirAuditorias && dadosRelatorio.auditorias) {
        const dadosAuditorias = dadosRelatorio.auditorias.map((aud: any) => ({
          'DATA REGISTRO': new Date(aud.createdAt).toLocaleString('pt-BR'),
          'CÂMERA / EQUIPAMENTO': aud.cameraNome,
          'HORÁRIO DO FATO': new Date(aud.timestampTrecho).toLocaleString('pt-BR'),
          'TIPO': aud.tipo,
          'FATOS OBSERVADOS': aud.descricaoFato,
          'OPERADOR CCO': aud.operador
        }));
        const ws = XLSX.utils.json_to_sheet(dadosAuditorias);
        autoAjustarColunas(ws, dadosAuditorias);
        XLSX.utils.book_append_sheet(wb, ws, 'Auditoria de Imagens');
      }

      // 5. Aba Extintores Reserva
      if (incluirExtintores && dadosRelatorio.extintores) {
        const dadosExtintores = dadosRelatorio.extintores.map((ex: any) => ({
          'DATA/HORA': new Date(ex.timestamp).toLocaleString('pt-BR'),
          'MOVIMENTAÇÃO': ex.tipoMovimentacao,
          'RESPONSÁVEL EXTERNO': ex.responsavelExterno,
          'OPERADOR CCO': ex.operadorCco,
          'MOTIVO / JUSTIFICATIVA': ex.motivo
        }));
        const ws = XLSX.utils.json_to_sheet(dadosExtintores);
        autoAjustarColunas(ws, dadosExtintores);
        XLSX.utils.book_append_sheet(wb, ws, 'Extintores Reserva');
      }

      // 6. Aba Defeitos/Quedas CFTV
      if (incluirCftv && dadosRelatorio.defeitos) {
        const dadosDefeitos = dadosRelatorio.defeitos.map((def: any) => ({
          'DATA/HORA OCORRIDO': new Date(def.dataHora).toLocaleString('pt-BR'),
          'EQUIPAMENTO / SETOR': def.equipamentoNome,
          'DESCRIÇÃO DA OCORRÊNCIA': def.descricao,
          'OPERADOR / RESPONSÁVEL': def.operador
        }));
        const ws = XLSX.utils.json_to_sheet(dadosDefeitos);
        autoAjustarColunas(ws, dadosDefeitos);
        XLSX.utils.book_append_sheet(wb, ws, 'Logs de Rede CFTV');
      }

      const nomeArquivo = `Backup_Consolidado_CCO_${relDataInicio}_a_${relDataFim}.xlsx`;
      XLSX.writeFile(wb, nomeArquivo);
      mostrarFeedback('sucesso', 'Planilha Excel formatada e baixada com sucesso!');
    } catch (err) {
      console.error('Falha ao exportar planilha:', err);
      alert('Ocorreu um erro ao exportar os dados para o Excel.');
    }
  };

  // Disparadores do Assistente
  const handleDispararAssistente = (formato: 'EXCEL' | 'PDF') => {
    if (!dadosRelatorio) {
      alert('Consolide os dados do relatório primeiro informando o período.');
      return;
    }
    setTipoExportacaoDesejada(formato);
    setPassoFechamento('ESCOLHA');
    setModalAberto('assistente_exportacao');
  };

  // Executa o download e em seguida apaga o cache físico do banco
  const handleConfirmarFechamentoELimpeza = () => {
    const anoDesejado = relDataFim.split('-')[0];
    if (anoConfirmacao !== anoDesejado) {
      alert(`Digite o ano de fechamento correto (${anoDesejado}) para confirmar.`);
      return;
    }

    // 1. Gera o download de backup dependendo do formato escolhido
    if (tipoExportacaoDesejada === 'EXCEL') {
      gerarExcelEfetivo();
    } else {
      window.print();
    }

    // 2. Chama a action de limpeza anual
    startTransition(async () => {
      try {
        const res = await realizarLimpezaAnualBanco(new Date(relDataInicio), new Date(relDataFim));
        mostrarFeedback('sucesso', `Fechamento concluído! Backup gerado e ${res.deletados} registros de históricos foram expurgados.`);
        fecharModais();
        setDadosRelatorio(null); // Limpa o relatório da tela
        carregarDados(); // Recarrega chaves, CFTV etc.
      } catch (err: any) {
        mostrarFeedback('erro', err.message || 'Erro ao realizar a limpeza física do banco.');
      }
    });
  };

  const handleConfirmarExportacaoParcial = () => {
    if (tipoExportacaoDesejada === 'EXCEL') {
      gerarExcelEfetivo();
    } else {
      window.print();
    }
    fecharModais();
  };

  // Métricas do CFTV
  const camerasListaCompleta = nvrs.flatMap(n => n.cameras || []);
  const totalCameras = camerasListaCompleta.length;
  const camerasOnline = camerasListaCompleta.filter(c => c.status === 'ONLINE').length;
  const camerasInstaveis = camerasListaCompleta.filter(c => c.status === 'OFFLINE').length;
  const camerasManutencao = camerasListaCompleta.filter(c => c.status === 'MANUTENCAO').length;

  const latenciaMedia = camerasListaCompleta.filter(c => c.status === 'ONLINE').length > 0
    ? Math.round(camerasListaCompleta.filter(c => c.status === 'ONLINE').reduce((acc, c) => acc + c.latencia, 0) / camerasListaCompleta.filter(c => c.status === 'ONLINE').length)
    : 0;

  const driftMedio = camerasListaCompleta.filter(c => c.status === 'ONLINE').length > 0
    ? parseFloat((camerasListaCompleta.filter(c => c.status === 'ONLINE').reduce((acc, c) => acc + Math.abs(c.ntpDrift), 0) / camerasListaCompleta.filter(c => c.status === 'ONLINE').length).toFixed(3))
    : 0.0;

  const uptimeGeral = totalCameras > 0 
    ? parseFloat((((camerasOnline + camerasManutencao) / totalCameras) * 100).toFixed(1))
    : 100.0;

  return (
    <div className="p-8 flex flex-col gap-6 print:p-0 print:bg-white print:text-black">
      {/* Estilos Globais de Impressão */}
      <style jsx global>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          aside, header, nav, button, .no-print, .cftv-pulse-indicator {
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

      {/* Navegação por Abas (Ocultado na Impressão) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[rgba(255,255,255,0.03)] pb-4 no-print">
        <div className="flex gap-1.5 overflow-x-auto py-1">
          {[
            { id: 'cftv', label: 'Monitor CFTV & NVRs', icon: 'videocam' },
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

      {/* Feedbacks Rápidos */}
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
      {/* 1. ABA CFTV & CÂMERAS (HIERÁRQUICO)      */}
      {/* ======================================= */}
      {activeTab === 'cftv' && (
        <div className="flex flex-col lg:flex-row gap-6 no-print">
          {/* Coluna Esquerda: Visão do Painel de Monitoramento */}
          <div className="flex-1 flex flex-col gap-6">
            
            {/* Metadados CFTV e Indicadores */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="glass-card p-4 border border-slate-800 flex flex-col">
                <span className="text-[9px] font-black uppercase tracking-[1px] text-slate-500 mb-1">Câmeras Conectadas</span>
                <span className="text-[18px] font-black text-white">{camerasOnline} / {totalCameras}</span>
                <div className="w-full bg-slate-950 h-1 rounded-full overflow-hidden mt-2">
                  <div 
                    className="bg-[var(--status-active)] h-full transition-all duration-500" 
                    style={{ width: `${totalCameras > 0 ? (camerasOnline / totalCameras) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>

              <div className="glass-card p-4 border border-slate-800 flex flex-col">
                <span className="text-[9px] font-black uppercase tracking-[1px] text-slate-500 mb-1">Uptime CCO</span>
                <span className="text-[18px] font-black text-emerald-400">{uptimeGeral}%</span>
                <span className="text-[8px] text-slate-500 mt-1 uppercase font-bold">Taxa média de rede</span>
              </div>

              <div className="glass-card p-4 border border-slate-800 flex flex-col">
                <span className="text-[9px] font-black uppercase tracking-[1px] text-slate-500 mb-1">Latência Média</span>
                <span className={`text-[18px] font-black ${latenciaMedia > 50 ? 'text-amber-500' : 'text-white'}`}>{latenciaMedia} ms</span>
                <span className="text-[8px] text-slate-500 mt-1 uppercase font-bold">Tempo de resposta</span>
              </div>

              <div className="glass-card p-4 border border-slate-800 flex flex-col">
                <span className="text-[9px] font-black uppercase tracking-[1px] text-slate-500 mb-1">NTP Drift Médio</span>
                <span className="text-[18px] font-black text-white">± {driftMedio}s</span>
                <span className="text-[8px] text-slate-500 mt-1 uppercase font-bold">Desvio de relógio</span>
              </div>
            </div>

            {/* Painel Operacional dos 8 NVRs */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.03)] pb-2">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[var(--status-active)] animate-pulse cftv-pulse-indicator"></span>
                  <h3 className="text-[12px] font-black uppercase tracking-[1.5px] text-white">Estrutura de Agregação de Vídeo (Setores CFTV)</h3>
                </div>
                <span className="text-[10px] text-slate-500 font-mono">Heartbeat ativo (6s)</span>
              </div>

              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <div className="w-8 h-8 rounded-full border-4 border-t-[var(--accent-red)] border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
                  <span className="text-[12px] text-slate-500 uppercase font-bold tracking-[1px]">Sincronizando topologia de rede...</span>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {nvrs.map((nvr) => {
                    const isNvrExpandido = !!nvrsExpandidos[nvr.codigo];
                    const camerasNvr = nvr.cameras || [];
                    const onlineCount = camerasNvr.filter(c => c.status === 'ONLINE').length;
                    const isNvrOffline = nvr.status === 'OFFLINE';

                    return (
                      <div 
                        key={nvr.id} 
                        className={`glass-card overflow-hidden border transition-all ${
                          isNvrOffline
                            ? 'border-red-900 bg-red-950/5'
                            : 'border-slate-800'
                        }`}
                      >
                        {/* Faixa Cabeçalho do NVR */}
                        <div 
                          onClick={() => toggleNvr(nvr.codigo)}
                          className="px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-white/[0.01] transition-all"
                        >
                          <div className="flex items-center gap-4">
                            <span className="material-symbols-outlined text-[24px] text-slate-500">dns</span>
                            <div className="flex flex-col">
                              <span className="text-[13px] font-black text-white uppercase tracking-[0.5px]">
                                {nvr.codigo} — {nvr.setor}
                              </span>
                              <span className="text-[9px] text-slate-500 font-mono mt-0.5">IP: {nvr.ip}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-5">
                            <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-[0.5px] ${
                              isNvrOffline
                                ? 'bg-red-500/10 text-red-500 border border-red-500/20'
                                : 'bg-[rgba(52,211,153,0.1)] text-[var(--status-active)]'
                            }`}>
                              {isNvrOffline ? 'FALHA SETORIAL' : 'CONECTADO'}
                            </span>

                            <span className="text-[11px] font-mono font-bold text-slate-400">
                              {onlineCount} / {camerasNvr.length} Câmeras
                            </span>

                            <span className="material-symbols-outlined text-slate-500 select-none">
                              {isNvrExpandido ? 'expand_less' : 'expand_more'}
                            </span>
                          </div>
                        </div>

                        {/* Grade e Tabela de Câmeras (Acordeão) */}
                        {isNvrExpandido && (
                          <div className="border-t border-slate-800 bg-slate-950/20">
                            {camerasNvr.length === 0 ? (
                              <p className="p-4 text-[11px] text-slate-500 italic text-center">Nenhuma câmera agregada a este NVR.</p>
                            ) : (
                              <div className="overflow-x-auto">
                                <table className="w-full text-left text-[11px] border-collapse text-slate-300">
                                  <thead>
                                    <tr className="border-b border-slate-900 bg-slate-950/60 font-bold uppercase text-[8px] tracking-[1px] text-slate-500">
                                      <th className="px-6 py-2.5">Código</th>
                                      <th className="px-6 py-2.5">Nome / Localização</th>
                                      <th className="px-6 py-2.5">Tipo</th>
                                      <th className="px-6 py-2.5">Status</th>
                                      <th className="px-6 py-2.5">Uptime</th>
                                      <th className="px-6 py-2.5 text-right">Latência</th>
                                      <th className="px-6 py-2.5 text-right">NTP Drift</th>
                                      <th className="px-6 py-2.5 text-right no-print">Manutenção</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-900">
                                    {camerasNvr.map((cam) => {
                                      const isOff = cam.status === 'OFFLINE';
                                      const isMan = cam.status === 'MANUTENCAO';
                                      const driftCritico = Math.abs(cam.ntpDrift) > 1.5;

                                      return (
                                        <tr key={cam.id} className="hover:bg-white/[0.01] transition-all">
                                          <td className="px-6 py-3 font-mono font-bold text-slate-400">{cam.codigo}</td>
                                          <td className="px-6 py-3 font-bold text-white uppercase text-[12px]">{cam.nome}</td>
                                          <td className="px-6 py-3">
                                            <span className="text-[9px] bg-slate-900 text-slate-400 px-2 py-0.5 rounded font-mono uppercase">{cam.tipo}</span>
                                          </td>
                                          <td className="px-6 py-3">
                                            <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-[0.5px] ${
                                              isOff
                                                ? 'bg-red-950 text-red-500 border border-red-900'
                                                : isMan
                                                ? 'bg-amber-950 text-amber-500 border border-amber-900'
                                                : 'bg-emerald-950 text-emerald-500 border border-emerald-900'
                                            }`}>
                                              {cam.status}
                                            </span>
                                          </td>
                                          <td className="px-6 py-3 font-mono text-slate-400">
                                            {isOff ? '-' : `${Math.floor(cam.uptimeContinuo / 60)}h ${cam.uptimeContinuo % 60}m`}
                                          </td>
                                          <td className={`px-6 py-3 text-right font-mono font-bold ${isOff ? 'text-red-500' : 'text-slate-200'}`}>
                                            {isOff ? 'TIMEOUT' : `${cam.latencia} ms`}
                                          </td>
                                          <td className={`px-6 py-3 text-right font-mono ${
                                            isOff 
                                              ? 'text-slate-500' 
                                              : driftCritico 
                                              ? 'text-red-500 font-bold animate-pulse' 
                                              : 'text-slate-300'
                                          }`}>
                                            {isOff ? '-' : `${cam.ntpDrift > 0 ? '+' : ''}${cam.ntpDrift}s`}
                                          </td>
                                          <td className="px-6 py-3 text-right no-print">
                                            {isMan ? (
                                              <button
                                                onClick={() => handleAbreModalReparo(cam)}
                                                className="px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.5px] bg-[var(--status-active)] hover:bg-[#2fbfa0] text-white rounded cursor-pointer transition-all"
                                              >
                                                Reparar
                                              </button>
                                            ) : (
                                              <button
                                                onClick={() => handleAbreModalFalha(cam)}
                                                className="px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.5px] border border-slate-800 hover:bg-red-500/10 text-slate-400 hover:text-red-400 rounded cursor-pointer transition-all"
                                              >
                                                Chamado
                                              </button>
                                            )}
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
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Coluna Direita: Painel Histórico de Quedas e MTTR */}
          <div className="w-full lg:w-[360px] shrink-0 flex flex-col gap-5">
            <div className="glass-card p-5 border border-slate-800 flex flex-col gap-4 h-full max-h-[800px] overflow-y-auto">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                <span className="material-symbols-outlined text-[var(--accent-red)]">history</span>
                <div className="flex flex-col">
                  <h4 className="text-[11px] font-black uppercase tracking-[1.5px] text-white">Log de Histórico e MTTR</h4>
                  <span className="text-[8px] text-slate-500 font-bold uppercase mt-0.5">Tempo Médio de Reparo</span>
                </div>
              </div>

              {quedas.length === 0 ? (
                <div className="py-20 text-center flex flex-col items-center justify-center gap-2 text-slate-500">
                  <span className="material-symbols-outlined text-[32px]">check_circle</span>
                  <span className="text-[11px] font-bold uppercase tracking-[0.5px]">Rede CCO Estável</span>
                  <span className="text-[9px] text-slate-600">Sem incidentes registrados.</span>
                </div>
              ) : (
                <div className="flex flex-col gap-3.5">
                  {quedas.slice(0, 15).map((q) => {
                    const isNvr = q.tipo === 'NVR';
                    const emAberto = q.timestampRetorno === null;
                    
                    let mttrTexto = 'Em andamento';
                    if (!emAberto && q.duracaoSegundos) {
                      const mins = Math.floor(q.duracaoSegundos / 60);
                      const segs = q.duracaoSegundos % 60;
                      mttrTexto = mins > 0 ? `${mins}m ${segs}s` : `${segs}s`;
                    }

                    return (
                      <div 
                        key={q.id} 
                        className={`p-3 rounded-lg border flex flex-col gap-2 transition-all ${
                          emAberto 
                            ? 'bg-red-500/5 border-red-500/20' 
                            : 'bg-slate-950/40 border-slate-900'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex flex-col">
                            <span className={`text-[9px] font-black uppercase tracking-[0.5px] ${
                              emAberto ? 'text-red-400' : 'text-slate-400'
                            }`}>
                              {isNvr ? 'QUEDA SETORIAL NVR' : 'Queda Câmera CFTV'}
                            </span>
                            <span className="text-[10px] font-bold text-slate-500 mt-0.5">
                              {new Date(q.timestampQueda).toLocaleTimeString('pt-BR')}
                            </span>
                          </div>

                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${
                            emAberto 
                              ? 'bg-red-500/10 text-red-500 animate-pulse' 
                              : 'bg-slate-800 text-slate-400'
                          }`}>
                            {emAberto ? 'ABERTO' : 'OK'}
                          </span>
                        </div>

                        <div className="text-[10px] text-slate-300 font-mono">
                          <span className="text-slate-500 block font-sans">MTTR (Reparo):</span>
                          <span className={emAberto ? 'text-red-400 font-bold' : 'text-emerald-400 font-bold'}>
                            {mttrTexto}
                          </span>
                        </div>

                        <p className="text-[10px] text-slate-400 italic leading-tight">
                          "{q.observacao}"
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
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
                      <th className="px-6 py-4 text-center">Evidência</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[rgba(255,255,255,0.02)]">
                    {ocorrencias.map((o) => {
                      const isEvento = o.tipo === 'EVENTO';
                      return (
                        <tr 
                          key={o.id} 
                          onClick={() => {
                            setOcorrenciaSelecionadaDetalhe(o);
                            setModalAberto('detalhe_ocorrencia');
                          }}
                          className="hover:bg-white/5 transition-all cursor-pointer"
                          title="Clique para visualizar o cartão detalhado desta ocorrência"
                        >
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
                          <td className="px-6 py-3.5 text-center">
                            {o.fotoUrl ? (
                              <button 
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setFotoVisualizarLightbox(o.fotoUrl);
                                }}
                                className="text-[var(--accent-red)] hover:text-white transition-all inline-flex items-center justify-center cursor-pointer bg-transparent border-none p-0 outline-none"
                                title="Visualizar Evidência Fotográfica"
                              >
                                <span className="material-symbols-outlined text-[20px]">image</span>
                              </button>
                            ) : (
                              <span className="text-slate-600 text-[11px]">-</span>
                            )}
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
              <h3 className="text-[13px] font-black uppercase tracking-[1.5px] text-white">Consolidar Dados e Gerar PDF / Excel</h3>
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
                Defeitos/Quedas CFTV
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

          {/* DOCUMENTO CONSOLIDADO PARA IMPRESSÃO EM PDF */}
          {dadosRelatorio ? (
            <div className="flex flex-col gap-6">
              {/* Botões de Ação */}
              <div className="flex justify-end gap-3 no-print">
                <button
                  onClick={() => handleDispararAssistente('EXCEL')}
                  className="px-6 py-3 rounded-xl text-[13px] font-bold bg-emerald-750 hover:bg-emerald-850 border border-emerald-600 text-white flex items-center gap-1.5 transition-all cursor-pointer shadow-[0_0_20px_rgba(16,185,129,0.15)]"
                >
                  <span className="material-symbols-outlined text-[18px]">table_view</span>
                  Exportar Planilha Excel (.xlsx)
                </button>
                <button
                  onClick={() => handleDispararAssistente('PDF')}
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
                                <strong className="text-white print:text-black block font-bold uppercase">{x.colaborador.nomeCompleto}</strong>
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
                              <td className="px-4 py-2.5 uppercase font-bold text-white print:text-black">{ch.responsavel}</td>
                              <td className="px-4 py-2.5 font-mono">{ch.operador}</td>
                              <td className="px-4 py-2.5 italic text-slate-400 print:text-black">"{ch.observacao || '-'}"</td>
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
                      3. Chamados de Defeitos e Incidentes de CFTV
                    </h4>
                    {dadosRelatorio.defeitos.length === 0 ? (
                      <p className="text-[11px] text-slate-500 italic">Nenhum chamado de falha de rede ou equipamento no período.</p>
                    ) : (
                      <table className="w-full text-[11px] print-table">
                        <thead>
                          <tr className="bg-slate-950/50 text-slate-400 print:bg-slate-100 print:text-black font-bold text-left border-b border-white/5">
                            <th className="px-4 py-2.5">Data Ocorrido</th>
                            <th className="px-4 py-2.5">Setor / Equipamento</th>
                            <th className="px-4 py-2.5">Descrição da Ocorrência de Rede</th>
                            <th className="px-4 py-2.5">Operador / Responsável</th>
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
                              <td className="px-4 py-2.5 font-bold uppercase">{oc.nomeEvento || '-'}</td>
                              <td className="px-4 py-2.5 font-mono">{oc.operador}</td>
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
                  <span>Farmasi Arena - CCO GESTÃO DE OPERAÇÕES</span>
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
      {/* MODAL 1: REPORTAR FALHA MANUAL (CHAMADO) */}
      {/* ======================================= */}
      {modalAberto === 'reportar_falha' && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-[4px] flex items-center justify-center z-50 p-4">
          <div className="glass-card max-w-md w-full p-6 flex flex-col gap-5 border border-[rgba(255,255,255,0.06)] bg-slate-900">
            <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.03)] pb-3">
              <div className="flex items-center gap-2 text-white">
                <span className="material-symbols-outlined text-red-500">report_problem</span>
                <h4 className="text-[13px] font-black uppercase tracking-[1.5px]">Abertura Chamado Técnico</h4>
              </div>
              <button onClick={fecharModais} className="text-slate-500 hover:text-white transition-all cursor-pointer">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-900 flex flex-col gap-1 text-[12px]">
              <span className="text-slate-500 uppercase font-black text-[9px] tracking-[0.5px]">Equipamento Afetado:</span>
              <strong className="text-white uppercase">{selecionadaCameraCodigo} — {selecionadaCameraNome}</strong>
            </div>

            <form onSubmit={handleSubmitFalha} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-[1px] text-slate-400">Descreva o Problema / Justificativa</label>
                <textarea
                  placeholder="Ex: Câmera oscilando sinal ou lente com sujeira obstruindo gravação facial..."
                  value={justificativaFalha}
                  onChange={(e) => setJustificativaFalha(e.target.value)}
                  className="px-4 py-3 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(5,8,18,0.7)] text-white text-[12px] outline-none focus:border-[var(--accent-red)] transition-all min-h-[90px] resize-none"
                  required
                  disabled={isPending}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-[1px] text-slate-400">Operador do CCO</label>
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
                  className="flex-1 py-3 rounded-xl text-[12px] font-bold uppercase tracking-[0.5px] bg-red-500 hover:bg-red-600 text-white shadow-[0_0_20px_rgba(239,68,68,0.15)] flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                  disabled={isPending}
                >
                  Abrir Chamado
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================= */}
      {/* MODAL 2: RESOLVER FALHA MANUAL (REPARO)  */}
      {/* ======================================= */}
      {modalAberto === 'concluir_reparo' && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-[4px] flex items-center justify-center z-50 p-4">
          <div className="glass-card max-w-md w-full p-6 flex flex-col gap-5 border border-[rgba(255,255,255,0.06)] bg-slate-900">
            <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.03)] pb-3">
              <div className="flex items-center gap-2 text-white">
                <span className="material-symbols-outlined text-[var(--status-active)]">build_circle</span>
                <h4 className="text-[13px] font-black uppercase tracking-[1.5px]">Encerramento Chamado Técnico</h4>
              </div>
              <button onClick={fecharModais} className="text-slate-500 hover:text-white transition-all cursor-pointer">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-900 flex flex-col gap-1 text-[12px]">
              <span className="text-slate-500 uppercase font-black text-[9px] tracking-[0.5px]">Equipamento Reparado:</span>
              <strong className="text-white uppercase">{selecionadaCameraCodigo} — {selecionadaCameraNome}</strong>
            </div>

            <form onSubmit={handleSubmitReparo} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-[1px] text-slate-400">Resolução do Reparo</label>
                <textarea
                  placeholder="Relate o que foi feito pelo técnico (Ex: Cabo de rede substituído, lente limpa e foco reajustado)..."
                  value={solucaoReparo}
                  onChange={(e) => setSolucaoReparo(e.target.value)}
                  className="px-4 py-3 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(5,8,18,0.7)] text-white text-[12px] outline-none focus:border-[var(--accent-red)] transition-all min-h-[90px] resize-none"
                  required
                  disabled={isPending}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-[1px] text-slate-400">Operador do CCO</label>
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
                  Fechar Chamado
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
          <div className="glass-card max-w-md w-full p-6 flex flex-col gap-5 border border-[rgba(255,255,255,0.06)] bg-slate-900">
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
                  {camerasListaCompleta.map((c) => (
                    <option key={c.id} value={c.nome} className="bg-[#0c122b] text-white">
                      {c.codigo} — {c.nome}
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
                  className="px-4 py-3 rounded-xl border border-[rgba(255,255,255,0.7)] bg-[rgba(5,8,18,0.7)] text-white text-[12px] outline-none focus:border-[var(--accent-red)] transition-all min-h-[90px] resize-none"
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
          <div className="glass-card max-w-md w-full p-6 flex flex-col gap-5 border border-[rgba(255,255,255,0.06)] bg-slate-900">
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
          <div className="glass-card max-w-md w-full p-6 flex flex-col gap-5 border border-[rgba(255,255,255,0.06)] bg-slate-900">
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

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-[1px] text-slate-400">Anexar Evidência Fotográfica (Opcional)</label>
                <div className="flex items-center gap-4">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleSelecionarFotoOcorrencia}
                    ref={fileInputRef}
                    className="hidden"
                    disabled={isPending}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2.5 rounded-xl border border-dashed border-slate-700 hover:border-[var(--accent-red)] bg-slate-950/40 text-slate-400 hover:text-white text-[12px] font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                    disabled={isPending}
                  >
                    <span className="material-symbols-outlined text-[18px]">photo_camera</span>
                    {ocFotoBase64 ? 'Alterar Foto' : 'Selecionar Imagem'}
                  </button>

                  {ocFotoBase64 && (
                    <div className="flex items-center gap-2">
                      <img 
                        src={ocFotoBase64} 
                        alt="Preview" 
                        className="w-10 h-10 object-cover rounded border border-slate-800" 
                      />
                      <button
                        type="button"
                        onClick={() => setOcFotoBase64('')}
                        className="p-1 rounded bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all cursor-pointer"
                        title="Remover imagem"
                      >
                        <span className="material-symbols-outlined text-[16px]">delete</span>
                      </button>
                      <span className="text-[10px] text-emerald-400 font-mono">Comprimida (OK)</span>
                    </div>
                  )}
                </div>
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

      {/* ================================================= */}
      {/* MODAL 6: ASSISTENTE DE EXPORTAÇÃO E FECHAMENTO    */}
      {/* ================================================= */}
      {modalAberto === 'assistente_exportacao' && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-[5px] flex items-center justify-center z-50 p-4 no-print">
          <div className="glass-card max-w-lg w-full p-6 flex flex-col gap-5 border border-[rgba(255,255,255,0.06)] bg-slate-900">
            
            {/* Cabeçalho do Assistente */}
            <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.03)] pb-3">
              <div className="flex items-center gap-2 text-white">
                <span className="material-symbols-outlined text-[var(--accent-red)]">download_for_offline</span>
                <h4 className="text-[13px] font-black uppercase tracking-[1.5px]">
                  Configurar Relatório ({tipoExportacaoDesejada})
                </h4>
              </div>
              <button onClick={fecharModais} className="text-slate-500 hover:text-white transition-all cursor-pointer">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Passo 1: Escolha entre Parcial ou Fechamento Anual */}
            {passoFechamento === 'ESCOLHA' && (
              <div className="flex flex-col gap-4">
                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-900 text-[12px] text-slate-300">
                  <span className="text-slate-500 uppercase font-black text-[9.5px] block tracking-[0.5px]">Intervalo Selecionado:</span>
                  <strong className="text-white block mt-0.5 font-mono">
                    {new Date(relDataInicio).toLocaleDateString('pt-BR')} até {new Date(relDataFim).toLocaleDateString('pt-BR')}
                  </strong>
                </div>

                <p className="text-[12px] text-slate-400">
                  Selecione a finalidade do relatório de exportação atual para a Arena:
                </p>

                <div className="grid grid-cols-1 gap-3.5 mt-1">
                  
                  {/* Opção Parcial */}
                  <div 
                    onClick={handleConfirmarExportacaoParcial}
                    className="p-4 rounded-xl border border-slate-800 hover:border-emerald-600 bg-slate-950/20 hover:bg-emerald-950/5 cursor-pointer transition-all flex items-start gap-3.5 group"
                  >
                    <span className="material-symbols-outlined text-emerald-500 text-[24px] mt-0.5 group-hover:scale-110 transition-transform">article</span>
                    <div className="flex flex-col gap-1">
                      <strong className="text-[12px] font-bold text-white uppercase group-hover:text-emerald-400 transition-colors">
                        1. Apenas Exportar Relatório Parcial
                      </strong>
                      <span className="text-[10.5px] text-slate-500 leading-normal">
                        Gera e baixa o arquivo normalmente. Todos os dados históricos continuam preservados no banco de dados na nuvem.
                      </span>
                    </div>
                  </div>

                  {/* Opção Fechamento Anual */}
                  <div 
                    onClick={() => setPassoFechamento('CONFIRMACAO_LIMPEZA')}
                    className="p-4 rounded-xl border border-slate-800 hover:border-red-600 bg-slate-950/20 hover:bg-red-950/5 cursor-pointer transition-all flex items-start gap-3.5 group"
                  >
                    <span className="material-symbols-outlined text-red-500 text-[24px] mt-0.5 group-hover:scale-110 transition-transform">cleaning_services</span>
                    <div className="flex flex-col gap-1">
                      <strong className="text-[12px] font-bold text-white uppercase group-hover:text-red-400 transition-colors">
                        2. Fechamento de Ano e Limpeza de Cache
                      </strong>
                      <span className="text-[10.5px] text-slate-500 leading-normal">
                        Gera o arquivo de backup e, em seguida, apaga permanentemente o histórico do período do banco para liberar espaço.
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Passo 2: Tela de Confirmação Dupla de Apagamento */}
            {passoFechamento === 'CONFIRMACAO_LIMPEZA' && (
              <div className="flex flex-col gap-4">
                
                {/* Alerta Crítico */}
                <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/5 text-red-400 flex items-start gap-3">
                  <span className="material-symbols-outlined text-[24px] animate-pulse">warning</span>
                  <div className="flex flex-col gap-1 text-[12px] leading-relaxed">
                    <strong className="uppercase tracking-[0.5px] text-red-500">Atenção! Ação Irreversível.</strong>
                    <span>
                      Você escolheu limpar os dados operacionais históricos da Arena do período selecionado.
                    </span>
                  </div>
                </div>

                <div className="text-[11.5px] text-slate-300 leading-relaxed flex flex-col gap-2 bg-slate-950/40 p-4 rounded-xl border border-slate-900">
                  <p>
                    <strong>O que será apagado:</strong> logs de check-in, movimentações de chaves, ocorrências com fotos, auditorias de CFTV, cautelas de extintores e logs de incidentes de rede.
                  </p>
                  <p className="text-emerald-400 font-bold">
                    * Os cadastros base de colaboradores, chaves e câmeras continuam totalmente intactos.
                  </p>
                </div>

                <div className="flex flex-col gap-2 mt-2">
                  <label className="text-[10.5px] font-black uppercase tracking-[0.5px] text-slate-400 leading-relaxed">
                    Confirme digitando o ano do fechamento selecionado (<span className="text-white font-mono">{relDataFim.split('-')[0]}</span>):
                  </label>
                  <input
                    type="text"
                    placeholder={`Digite ${relDataFim.split('-')[0]} aqui...`}
                    value={anoConfirmacao}
                    onChange={(e) => setAnoConfirmacao(e.target.value)}
                    className="px-4 py-3 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(5,8,18,0.7)] text-white text-[13px] font-mono outline-none focus:border-red-500 transition-all text-center tracking-[2px]"
                    disabled={isPending}
                  />
                </div>

                {/* Botões de Decisão */}
                <div className="flex gap-3 border-t border-[rgba(255,255,255,0.03)] pt-4 mt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPassoFechamento('ESCOLHA');
                      setAnoConfirmacao('');
                    }}
                    className="flex-1 py-3 rounded-xl text-[11px] font-bold uppercase tracking-[0.5px] border border-[rgba(255,255,255,0.06)] hover:bg-white/5 text-slate-400 hover:text-white transition-all cursor-pointer"
                    disabled={isPending}
                  >
                    Voltar
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmarFechamentoELimpeza}
                    disabled={anoConfirmacao !== relDataFim.split('-')[0] || isPending}
                    className={`flex-1 py-3 rounded-xl text-[11px] font-bold uppercase tracking-[0.5px] flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                      anoConfirmacao === relDataFim.split('-')[0]
                        ? 'bg-red-600 hover:bg-red-700 text-white shadow-[0_0_20px_rgba(220,38,38,0.25)]'
                        : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                    }`}
                  >
                    {isPending ? 'Processando...' : 'Confirmar e Limpar'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================================================= */}
      {/* MODAL 7: VISUALIZAÇÃO DETALHADA DE OCORRÊNCIA     */}
      {/* ================================================= */}
      {modalAberto === 'detalhe_ocorrencia' && ocorrenciaSelecionadaDetalhe && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-[5px] flex items-center justify-center z-50 p-4 no-print">
          <div className="glass-card max-w-lg w-full p-6 flex flex-col gap-5 border border-[rgba(255,255,255,0.06)] bg-slate-900 max-h-[90vh] overflow-y-auto">
            
            {/* Cabeçalho do Detalhe */}
            <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.03)] pb-3">
              <div className="flex items-center gap-2 text-white">
                <span className="material-symbols-outlined text-[var(--accent-red)] text-[20px]">menu_book</span>
                <h4 className="text-[13px] font-black uppercase tracking-[1.5px]">Detalhes do Registro</h4>
              </div>
              <button onClick={fecharModais} className="text-slate-500 hover:text-white transition-all cursor-pointer">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Metadados da Ocorrência */}
            <div className="grid grid-cols-2 gap-4 bg-slate-950/60 p-4 rounded-xl border border-slate-900 text-[12px]">
              <div className="flex flex-col gap-0.5">
                <span className="text-slate-500 uppercase font-black text-[9px] tracking-[0.5px]">Data / Hora Registro:</span>
                <span className="text-white font-mono">{new Date(ocorrenciaSelecionadaDetalhe.timestamp).toLocaleString('pt-BR')}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-slate-500 uppercase font-black text-[9px] tracking-[0.5px]">Operador CCO:</span>
                <span className="text-white uppercase font-bold">{ocorrenciaSelecionadaDetalhe.operador}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-slate-500 uppercase font-black text-[9px] tracking-[0.5px]">Tipo de Ocorrência:</span>
                <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase w-max tracking-[0.5px] ${
                  ocorrenciaSelecionadaDetalhe.tipo === 'EVENTO'
                    ? 'bg-[rgba(255,26,60,0.1)] text-[var(--accent-red)] border border-[rgba(255,26,60,0.15)] font-bold'
                    : 'bg-slate-800 text-slate-300'
                }`}>
                  {ocorrenciaSelecionadaDetalhe.tipo}
                </span>
              </div>
              {ocorrenciaSelecionadaDetalhe.tipo === 'EVENTO' && (
                <div className="flex flex-col gap-0.5 col-span-2 mt-2 border-t border-slate-900 pt-2">
                  <span className="text-slate-500 uppercase font-black text-[9px] tracking-[0.5px]">Evento Vinculado:</span>
                  <span className="text-emerald-400 font-bold uppercase text-[12px]">{ocorrenciaSelecionadaDetalhe.nomeEvento}</span>
                </div>
              )}
            </div>

            {/* Fatos Relatados */}
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black uppercase tracking-[1px] text-slate-500">Histórico de Fatos e Detalhes</label>
              <div className="p-4 rounded-xl border border-[rgba(255,255,255,0.04)] bg-slate-950/30 text-slate-200 text-[12px] whitespace-pre-line leading-relaxed max-h-[200px] overflow-y-auto font-sans">
                {ocorrenciaSelecionadaDetalhe.detalhes}
              </div>
            </div>

            {/* Evidência Fotográfica */}
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black uppercase tracking-[1px] text-slate-500">Evidência Fotográfica</label>
              {ocorrenciaSelecionadaDetalhe.fotoUrl ? (
                <div className="flex flex-col gap-3">
                  <img 
                    src={ocorrenciaSelecionadaDetalhe.fotoUrl} 
                    alt="Evidência Ocorrência" 
                    className="w-full max-h-[250px] object-cover rounded-xl border border-slate-800"
                  />
                  <button
                    type="button"
                    onClick={() => setFotoVisualizarLightbox(ocorrenciaSelecionadaDetalhe.fotoUrl)}
                    className="w-full py-2.5 rounded-xl border border-slate-800 hover:border-[var(--accent-red)] bg-slate-950/40 hover:bg-slate-900 text-slate-400 hover:text-white text-[11px] font-bold uppercase tracking-[0.5px] flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">zoom_in</span>
                    Ampliar Imagem (Zoom)
                  </button>
                </div>
              ) : (
                <div className="py-8 text-center flex flex-col items-center justify-center gap-2 border border-dashed border-slate-800 rounded-xl bg-slate-950/10 text-slate-600">
                  <span className="material-symbols-outlined text-[32px]">image_not_supported</span>
                  <span className="text-[10px] font-bold uppercase tracking-[0.5px]">Nenhuma foto anexada a este registro</span>
                </div>
              )}
            </div>

            {/* Rodapé do Modal */}
            <div className="flex border-t border-[rgba(255,255,255,0.03)] pt-4 mt-2">
              <button
                type="button"
                onClick={fecharModais}
                className="w-full py-3 rounded-xl text-[12px] font-bold uppercase tracking-[0.5px] bg-[var(--accent-red)] hover:bg-[var(--accent-red-hover)] text-white shadow-[0_0_20px_rgba(255,26,60,0.15)] transition-all cursor-pointer flex items-center justify-center gap-1"
              >
                Voltar ao Livro
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ================================================= */}
      {/* LIGHTBOX DE VISUALIZAÇÃO DE IMAGEM EM TELA CHEIA  */}
      {/* ================================================= */}
      {fotoVisualizarLightbox && (
        <div 
          onClick={() => setFotoVisualizarLightbox(null)}
          className="fixed inset-0 bg-black/95 flex flex-col items-center justify-center z-[99999] p-4 cursor-zoom-out no-print"
        >
          <div className="relative max-w-4xl w-full flex flex-col gap-3" onClick={(e) => e.stopPropagation()}>
            <button 
              onClick={() => setFotoVisualizarLightbox(null)}
              className="absolute -top-10 right-0 text-white/70 hover:text-white transition-all text-[12px] font-bold uppercase tracking-[1px] flex items-center gap-1 cursor-pointer bg-transparent border-none outline-none"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
              Fechar
            </button>
            <img 
              src={fotoVisualizarLightbox} 
              alt="Evidência Fotográfica Ampliada" 
              className="w-full max-h-[80vh] object-contain rounded-xl border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.9)]"
            />
          </div>
        </div>
      )}
    </div>
  );
}
