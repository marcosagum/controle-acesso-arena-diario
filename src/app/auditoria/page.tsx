'use client';

import { useState, useEffect, useTransition } from 'react';
import { 
  getAuditLogs, 
  getEmpresas, 
  realizarCheckIn, 
  realizarCheckOut, 
  AuditLogItem 
} from '../actions';
import ModalCheckIn from '@/components/ModalCheckIn';
import ModalCheckOut from '@/components/ModalCheckOut';

interface EmpresaInfo {
  id: string;
  nome: string;
}

export default function AuditoriaPainel() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [empresas, setEmpresas] = useState<EmpresaInfo[]>([]);
  const [filtroBusca, setFiltroBusca] = useState('');
  const [filtroEmpresa, setFiltroEmpresa] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  const [isPending, startTransition] = useTransition();

  // Estado para ordenação interativa de colunas
  const [sortField, setSortField] = useState<string>('default');

  // Lógica de rotação de ordenação baseada em cliques no cabeçalho
  const handleSort = (field: string) => {
    setSortField((prev) => {
      if (field === 'colaborador') {
        if (prev === 'colaborador') return 'empresa';
        if (prev === 'empresa') return 'default';
        return 'colaborador';
      }
      if (field === 'entrada') {
        if (prev === 'entrada-hora') return 'entrada-data';
        if (prev === 'entrada-data') return 'default';
        return 'entrada-hora';
      }
      if (field === 'saida') {
        if (prev === 'saida-hora') return 'saida-data';
        if (prev === 'saida-data') return 'default';
        return 'saida-hora';
      }
      if (field === 'operador-entrada') {
        return prev === 'operador-entrada' ? 'default' : 'operador-entrada';
      }
      if (field === 'operador-saida') {
        return prev === 'operador-saida' ? 'default' : 'operador-saida';
      }
      if (field === 'permanencia') {
        if (prev === 'permanencia-desc') return 'permanencia-asc';
        if (prev === 'permanencia-asc') return 'default';
        return 'permanencia-desc';
      }
      if (field === 'status') {
        if (prev === 'status-dentro') return 'status-fora';
        if (prev === 'status-fora') return 'default';
        return 'status-dentro';
      }
      return 'default';
    });
  };

  // Estados para Modais Interativos
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);
  const [isCheckInOpen, setIsCheckInOpen] = useState(false);
  const [isCheckOutOpen, setIsCheckOutOpen] = useState(false);
  const [selectedDesc, setSelectedDesc] = useState<AuditLogItem | null>(null);

  // Lógica de ações de check-in e check-out
  const handleConfirmCheckIn = async (operadorEntrada: string, descricaoServico: string) => {
    if (!selectedLog) return;
    await realizarCheckIn(selectedLog.colaboradorId, operadorEntrada, descricaoServico);
    loadData(); // Recarregar logs
  };

  const handleConfirmCheckOut = async (operadorSaida: string, servicosExtras: string) => {
    if (!selectedLog) return;
    await realizarCheckOut(selectedLog.colaboradorId, operadorSaida, servicosExtras);
    loadData(); // Recarregar logs
  };

  const loadData = () => {
    startTransition(async () => {
      try {
        const [logsData, empresasData] = await Promise.all([
          getAuditLogs(),
          getEmpresas()
        ]);
        setLogs(logsData);
        setEmpresas(empresasData);
      } catch (err) {
        console.error(err);
      }
    });
  };

  useEffect(() => {
    loadData();

    // Ler parâmetros da URL para aplicar filtros vindos do dashboard
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const statusParam = params.get('status');
      if (statusParam === 'DENTRO') {
        setFiltroStatus('DENTRO');
      } else if (statusParam === 'TODOS') {
        setFiltroStatus(''); // Limpar status para mostrar todo o histórico (dentro e fora)
      }
    }
  }, []);

  // Filtrar logs localmente para máxima reatividade
  const logsFiltrados = logs.filter(log => {
    const correspondeBusca = 
      log.colaboradorNome.toLowerCase().includes(filtroBusca.toLowerCase()) ||
      log.colaboradorCpf.includes(filtroBusca) ||
      log.descricaoServico.toLowerCase().includes(filtroBusca.toLowerCase()) ||
      (log.servicosExtras && log.servicosExtras.toLowerCase().includes(filtroBusca.toLowerCase()));

    const correspondeEmpresa = !filtroEmpresa || log.empresaNome === filtroEmpresa;
    const correspondeStatus = !filtroStatus || log.status === filtroStatus;

    return correspondeBusca && correspondeEmpresa && correspondeStatus;
  });

  // Ordenar logs filtrados de acordo com a seleção de cabeçalho
  const logsOrdenados = [...logsFiltrados].sort((a, b) => {
    if (sortField === 'colaborador') {
      return a.colaboradorNome.localeCompare(b.colaboradorNome, 'pt-BR');
    }
    if (sortField === 'empresa') {
      return a.empresaNome.localeCompare(b.empresaNome, 'pt-BR');
    }
    if (sortField === 'entrada-hora') {
      const dateA = new Date(a.timestampEntrada);
      const dateB = new Date(b.timestampEntrada);
      const timeA = dateA.getHours() * 60 + dateA.getMinutes();
      const timeB = dateB.getHours() * 60 + dateB.getMinutes();
      return timeA - timeB;
    }
    if (sortField === 'entrada-data') {
      return new Date(a.timestampEntrada).getTime() - new Date(b.timestampEntrada).getTime();
    }
    if (sortField === 'saida-hora') {
      if (!a.timestampSaida) return 1;
      if (!b.timestampSaida) return -1;
      const dateA = new Date(a.timestampSaida);
      const dateB = new Date(b.timestampSaida);
      const timeA = dateA.getHours() * 60 + dateA.getMinutes();
      const timeB = dateB.getHours() * 60 + dateB.getMinutes();
      return timeA - timeB;
    }
    if (sortField === 'saida-data') {
      if (!a.timestampSaida) return 1;
      if (!b.timestampSaida) return -1;
      return new Date(a.timestampSaida).getTime() - new Date(b.timestampSaida).getTime();
    }
    if (sortField === 'operador-entrada') {
      return a.operadorEntrada.localeCompare(b.operadorEntrada, 'pt-BR');
    }
    if (sortField === 'operador-saida') {
      const opA = a.operadorSaida || '';
      const opB = b.operadorSaida || '';
      return opA.localeCompare(opB, 'pt-BR');
    }
    if (sortField === 'permanencia-desc') {
      const getMs = (log: typeof a) => {
        if (!log.timestampSaida) return 0;
        return new Date(log.timestampSaida).getTime() - new Date(log.timestampEntrada).getTime();
      };
      return getMs(b) - getMs(a);
    }
    if (sortField === 'permanencia-asc') {
      const getMs = (log: typeof a) => {
        if (!log.timestampSaida) return 0;
        return new Date(log.timestampSaida).getTime() - new Date(log.timestampEntrada).getTime();
      };
      return getMs(a) - getMs(b);
    }
    if (sortField === 'status-dentro') {
      return a.status === 'DENTRO' ? -1 : 1;
    }
    if (sortField === 'status-fora') {
      return a.status === 'FORA' ? -1 : 1;
    }
    return 0; // padrão: data entrada desc
  });

  // Exportar dados para CSV
  const handleExportCSV = () => {
    if (logsFiltrados.length === 0) return;

    // Cabeçalhos do CSV
    const headers = [
      'Nome Colaborador',
      'CPF',
      'Empresa',
      'Horário Entrada',
      'Operador Entrada',
      'Serviço Inicial',
      'Horário Saída',
      'Operador Saída',
      'Serviços Extras / Ocorrências',
      'Status de Acesso',
      'Tempo de Permanência'
    ];

    // Linhas do CSV
    const rows = logsFiltrados.map(log => {
      const entrada = new Date(log.timestampEntrada).toLocaleString('pt-BR');
      const saida = log.timestampSaida ? new Date(log.timestampSaida).toLocaleString('pt-BR') : 'N/A';
      
      // Calcular tempo de permanência
      let permanencia = 'N/A';
      if (log.timestampSaida) {
        const diffMs = new Date(log.timestampSaida).getTime() - new Date(log.timestampEntrada).getTime();
        const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
        const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        permanencia = `${diffHrs}h ${diffMins}m`;
      }

      return [
        log.colaboradorNome,
        log.colaboradorCpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4'),
        log.empresaNome,
        entrada,
        log.operadorEntrada,
        log.descricaoServico.replace(/"/g, '""'), // Escapar aspas duplas no CSV
        saida,
        log.operadorSaida || 'N/A',
        (log.servicosExtras || 'N/A').replace(/"/g, '""'),
        log.status,
        permanencia
      ];
    });

    // Construir string CSV
    // Utilizar codificação UTF-8 com BOM para que o Excel abra acentuações do português corretamente
    const csvContent = 
      '\uFEFF' + // Byte Order Mark (BOM) para UTF-8
      [headers.join(';'), ...rows.map(e => e.map(val => `"${val}"`).join(';'))].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    const dataAtual = new Date().toISOString().split('T')[0];
    link.setAttribute('href', url);
    link.setAttribute('download', `relatorio_acessos_cco_${dataAtual}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getFormattedDate = (dateStr: Date | string | null) => {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getFormattedTime = (dateStr: Date | string | null) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    }) + 'h';
  };

  const getTempoPermanencia = (entradaStr: Date | string, saidaStr: Date | string | null) => {
    if (!saidaStr) return '—';
    const diffMs = new Date(saidaStr).getTime() - new Date(entradaStr).getTime();
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${diffHrs}h ${diffMins}m`;
  };

  return (
    <div className="flex flex-col gap-8 animate-[fadeIn_0.4s_ease-out]">
      {/* Filtros e Busca de Histórico */}
      <div className="glass-card p-6 flex flex-col gap-6 bg-[rgba(12,18,43,0.5)] border-[rgba(255,255,255,0.02)]">
        <h3 className="text-[14px] font-black uppercase tracking-[1.5px] text-slate-300 flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">filter_list</span>
          Filtros de Auditoria
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Busca por Colaborador */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-[1.5px] text-slate-400">Busca Geral</label>
            <input
              type="text"
              placeholder="Nome, CPF ou serviço..."
              value={filtroBusca}
              onChange={(e) => setFiltroBusca(e.target.value)}
              className="px-4 py-3.5 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(5,8,18,0.7)] text-white text-[13px] outline-none focus:border-[var(--accent-red)] transition-all"
            />
          </div>

          {/* Filtro por Empresa */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-[1.5px] text-slate-400">Filtrar por Empresa</label>
            <select
              value={filtroEmpresa}
              onChange={(e) => setFiltroEmpresa(e.target.value)}
              className="px-4 py-3.5 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(5,8,18,0.7)] text-white text-[13px] outline-none focus:border-[var(--accent-red)] cursor-pointer transition-all"
            >
              <option value="">Todas as empresas</option>
              {empresas.map((emp) => (
                <option key={emp.id} value={emp.nome} className="bg-[#0c122b] text-white">
                  {emp.nome}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro por Status */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-[1.5px] text-slate-400">Status de Acesso</label>
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              className="px-4 py-3.5 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(5,8,18,0.7)] text-white text-[13px] outline-none focus:border-[var(--accent-red)] cursor-pointer transition-all"
            >
              <option value="">Todos os status</option>
              <option value="DENTRO" className="bg-[#0c122b] text-white">Dentro da Arena (Ativos)</option>
              <option value="FORA" className="bg-[#0c122b] text-white">Já Saíram (Concluídos)</option>
            </select>
          </div>

          {/* Botões de Ação de Filtros */}
          <div className="flex items-end gap-3">
            <button
              onClick={handleExportCSV}
              disabled={logsFiltrados.length === 0}
              className="flex-1 py-3.5 rounded-xl text-[13px] font-bold bg-[var(--accent-red)] hover:bg-[var(--accent-red-hover)] disabled:bg-slate-800 disabled:text-slate-500 disabled:border-transparent text-white transition-all shadow-[0_0_20px_rgba(255,26,60,0.15)] flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined text-[18px]">download</span>
              Exportar (CSV)
            </button>
            <button
              onClick={loadData}
              className="px-4 py-3.5 rounded-xl border border-[rgba(255,255,255,0.06)] bg-transparent text-slate-400 hover:text-white hover:border-slate-500 transition-all cursor-pointer"
              title="Atualizar Logs"
            >
              <span className={`material-symbols-outlined text-[18px] block ${isPending ? 'animate-spin' : ''}`}>sync</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tabela de Histórico e Auditoria */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[rgba(255,255,255,0.04)] bg-[rgba(255,26,60,0.02)] text-[10px] font-black uppercase tracking-[1.5px] text-slate-400 select-none">
                {/* Colaborador / Empresa */}
                <th 
                  onClick={() => handleSort('colaborador')}
                  className="px-6 py-4.5 cursor-pointer hover:text-white transition-colors"
                  title="Clique 1x: Nome A-Z | Clique 2x: Empresa A-Z"
                >
                  <div className="flex flex-col">
                    <span>Colaborador / Empresa</span>
                    {sortField === 'colaborador' && (
                      <span className="text-[9px] text-[var(--accent-red)] font-bold normal-case tracking-normal mt-0.5">↓ Colaborador A-Z</span>
                    )}
                    {sortField === 'empresa' && (
                      <span className="text-[9px] text-cyan-400 font-bold normal-case tracking-normal mt-0.5">↓ Empresa A-Z</span>
                    )}
                  </div>
                </th>
                
                {/* CPF */}
                <th className="px-6 py-4.5">CPF</th>
                
                {/* Horário Entrada */}
                <th 
                  onClick={() => handleSort('entrada')}
                  className="px-6 py-4.5 cursor-pointer hover:text-white transition-colors"
                  title="Clique 1x: Hora do Dia | Clique 2x: Data Cheia"
                >
                  <div className="flex flex-col">
                    <span>Horário Entrada</span>
                    {sortField === 'entrada-hora' && (
                      <span className="text-[9px] text-[var(--accent-red)] font-bold normal-case tracking-normal mt-0.5">↓ Hora do Dia</span>
                    )}
                    {sortField === 'entrada-data' && (
                      <span className="text-[9px] text-cyan-400 font-bold normal-case tracking-normal mt-0.5">↓ Data Cheia</span>
                    )}
                  </div>
                </th>
                
                {/* Operador Entrada */}
                <th 
                  onClick={() => handleSort('operador-entrada')}
                  className="px-6 py-4.5 cursor-pointer hover:text-white transition-colors"
                  title="Ordenar por Operador"
                >
                  <div className="flex flex-col">
                    <span>Operador Entrada</span>
                    {sortField === 'operador-entrada' && (
                      <span className="text-[9px] text-[var(--accent-red)] font-bold normal-case tracking-normal mt-0.5">↓ Operador A-Z</span>
                    )}
                  </div>
                </th>
                
                {/* Descrição do Serviço */}
                <th className="px-6 py-4.5">Descrição do Serviço</th>
                
                {/* Horário Saída */}
                <th 
                  onClick={() => handleSort('saida')}
                  className="px-6 py-4.5 cursor-pointer hover:text-white transition-colors"
                  title="Clique 1x: Hora do Dia | Clique 2x: Data Cheia"
                >
                  <div className="flex flex-col">
                    <span>Horário Saída</span>
                    {sortField === 'saida-hora' && (
                      <span className="text-[9px] text-[var(--accent-red)] font-bold normal-case tracking-normal mt-0.5">↓ Hora do Dia</span>
                    )}
                    {sortField === 'saida-data' && (
                      <span className="text-[9px] text-cyan-400 font-bold normal-case tracking-normal mt-0.5">↓ Data Cheia</span>
                    )}
                  </div>
                </th>
                
                {/* Operador Saída */}
                <th 
                  onClick={() => handleSort('operador-saida')}
                  className="px-6 py-4.5 cursor-pointer hover:text-white transition-colors"
                  title="Ordenar por Operador"
                >
                  <div className="flex flex-col">
                    <span>Operador Saída</span>
                    {sortField === 'operador-saida' && (
                      <span className="text-[9px] text-[var(--accent-red)] font-bold normal-case tracking-normal mt-0.5">↓ Operador A-Z</span>
                    )}
                  </div>
                </th>
                
                {/* Permanência */}
                <th 
                  onClick={() => handleSort('permanencia')}
                  className="px-6 py-4.5 cursor-pointer hover:text-white transition-colors"
                  title="Clique 1x: Maior tempo | Clique 2x: Menor tempo"
                >
                  <div className="flex flex-col">
                    <span>Permanência</span>
                    {sortField === 'permanencia-desc' && (
                      <span className="text-[9px] text-[var(--accent-red)] font-bold normal-case tracking-normal mt-0.5">↓ Maior Tempo</span>
                    )}
                    {sortField === 'permanencia-asc' && (
                      <span className="text-[9px] text-cyan-400 font-bold normal-case tracking-normal mt-0.5">↓ Menor Tempo</span>
                    )}
                  </div>
                </th>
                
                {/* Status */}
                <th 
                  onClick={() => handleSort('status')}
                  className="px-6 py-4.5 cursor-pointer hover:text-white transition-colors"
                  title="Clique 1x: Dentro Arena | Clique 2x: Fora Arena"
                >
                  <div className="flex flex-col">
                    <span>Status</span>
                    {sortField === 'status-dentro' && (
                      <span className="text-[9px] text-[var(--status-active)] font-bold normal-case tracking-normal mt-0.5">↓ Dentro Primeiro</span>
                    )}
                    {sortField === 'status-fora' && (
                      <span className="text-[9px] text-slate-400 font-bold normal-case tracking-normal mt-0.5">↓ Fora Primeiro</span>
                    )}
                  </div>
                </th>
                
                {/* Ações */}
                <th className="px-6 py-4.5 text-right text-[10px] font-black uppercase tracking-[1.5px] text-slate-400 select-none">Operações CCO</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(255,255,255,0.03)] text-[13px]">
              {logsOrdenados.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center text-slate-500 font-medium">
                    Nenhuma movimentação registrada correspondente aos filtros.
                  </td>
                </tr>
              ) : (
                logsOrdenados.map((log) => {
                  const isInside = log.status === 'DENTRO';
                  return (
                    <tr 
                      key={log.id} 
                      className={`hover:bg-[rgba(255,255,255,0.01)] transition-colors ${
                        isInside ? 'bg-[rgba(52,211,153,0.01)]' : ''
                      }`}
                    >
                      {/* Colaborador / Empresa */}
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-white leading-tight">{log.colaboradorNome}</span>
                          <span className="text-[11px] text-slate-400 mt-1 font-semibold">
                            {log.empresaNome}
                          </span>
                        </div>
                      </td>

                      {/* CPF */}
                      <td className="px-6 py-4 font-mono font-semibold text-slate-300 text-[12px] whitespace-nowrap">
                        {log.colaboradorCpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')}
                      </td>

                      {/* Horário Entrada (Duas linhas elegantes) */}
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-bold text-slate-200 leading-tight">{getFormattedDate(log.timestampEntrada)}</span>
                          <span className="text-[11px] font-semibold text-slate-400 font-mono">{getFormattedTime(log.timestampEntrada)}</span>
                        </div>
                      </td>

                      {/* Operador Entrada */}
                      <td className="px-6 py-4 text-slate-400 font-medium">
                        {log.operadorEntrada}
                      </td>

                      {/* Descrição do Serviço (Clicável para ampliar) */}
                      <td 
                        onClick={() => setSelectedDesc(log)}
                        className="px-6 py-4 text-slate-300 max-w-xs cursor-pointer hover:bg-[rgba(255,255,255,0.02)] hover:text-white transition-all group"
                        title="Clique para ver descrição completa"
                      >
                        <div className="flex flex-col gap-1.5">
                          <span className="line-clamp-2 group-hover:underline font-medium">{log.descricaoServico}</span>
                          {/* Exibir serviços extras se existirem */}
                          {log.servicosExtras && (
                            <span className="text-[11px] text-yellow-500 border-l border-yellow-800/40 pl-2 leading-snug block">
                              <span className="font-bold uppercase tracking-[0.5px] text-[9px] block">Serviços Extras / Ocorrência:</span>
                              <span className="line-clamp-1">{log.servicosExtras}</span>
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Horário Saída (Duas linhas elegantes) */}
                      <td className="px-6 py-4">
                        {log.timestampSaida ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="font-bold text-slate-200 leading-tight">{getFormattedDate(log.timestampSaida)}</span>
                            <span className="text-[11px] font-semibold text-slate-400 font-mono">{getFormattedTime(log.timestampSaida)}</span>
                          </div>
                        ) : (
                          <span className="text-slate-500 italic font-medium">—</span>
                        )}
                      </td>

                      {/* Operador Saída */}
                      <td className={`px-6 py-4 font-medium ${isInside ? 'text-slate-500 italic' : 'text-slate-400'}`}>
                        {log.operadorSaida || '—'}
                      </td>

                      {/* Tempo de Permanência */}
                      <td className="px-6 py-4 font-mono font-semibold text-slate-300">
                        {getTempoPermanencia(log.timestampEntrada, log.timestampSaida)}
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-[0.5px] ${
                          isInside 
                            ? 'bg-[rgba(52,211,153,0.1)] text-[var(--status-active)]'
                            : 'bg-slate-800 text-slate-400'
                        }`}>
                          {log.status}
                        </span>
                      </td>

                      {/* Ações (Compacto e Altamente Destacado) */}
                      <td className="px-6 py-4 text-right">
                        {isInside ? (
                          <button
                            onClick={() => {
                              setSelectedLog(log);
                              setIsCheckOutOpen(true);
                            }}
                            className="px-2.5 py-1.5 rounded-lg font-bold bg-red-600 hover:bg-red-500 text-white shadow-[0_0_15px_rgba(220,38,38,0.3)] border border-red-500/20 transition-all duration-200 hover:scale-[1.02] cursor-pointer inline-flex items-center gap-1.5 text-[11px]"
                          >
                            <span className="material-symbols-outlined text-[14px]">logout</span>
                            Dar Baixa
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setSelectedLog(log);
                              setIsCheckInOpen(true);
                            }}
                            className="px-2.5 py-1.5 rounded-lg font-bold bg-cyan-600 hover:bg-cyan-500 text-white shadow-[0_0_15px_rgba(8,145,178,0.3)] border border-cyan-500/20 transition-all duration-200 hover:scale-[1.02] cursor-pointer inline-flex items-center gap-1.5 text-[11px]"
                          >
                            <span className="material-symbols-outlined text-[14px]">login</span>
                            Novo Acesso
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modais de Operação de Acesso */}
      <ModalCheckIn 
        isOpen={isCheckInOpen}
        onClose={() => {
          setIsCheckInOpen(false);
          setSelectedLog(null);
        }}
        colaborador={selectedLog ? {
          id: selectedLog.colaboradorId,
          nomeCompleto: selectedLog.colaboradorNome,
          cpf: selectedLog.colaboradorCpf,
          empresa: { nome: selectedLog.empresaNome }
        } : null}
        onConfirm={handleConfirmCheckIn}
      />

      <ModalCheckOut 
        isOpen={isCheckOutOpen}
        onClose={() => {
          setIsCheckOutOpen(false);
          setSelectedLog(null);
        }}
        colaborador={selectedLog ? {
          id: selectedLog.colaboradorId,
          nomeCompleto: selectedLog.colaboradorNome,
          cpf: selectedLog.colaboradorCpf,
          empresa: { nome: selectedLog.empresaNome },
          registroAtivo: {
            id: selectedLog.id,
            timestampEntrada: selectedLog.timestampEntrada,
            operadorEntrada: selectedLog.operadorEntrada,
            descricaoServico: selectedLog.descricaoServico
          }
        } : null}
        onConfirm={handleConfirmCheckOut}
      />

      {/* Modal de Detalhes do Serviço Expandido (Zoom) */}
      {selectedDesc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-[4px]">
          <div className="w-full max-w-2xl bg-[#070a16] border border-[rgba(255,255,255,0.08)] rounded-3xl p-8 shadow-[0_15px_40px_rgba(0,0,0,0.6)] animate-[fadeIn_0.2s_ease-out]">
            <div className="flex justify-between items-start border-b border-[rgba(255,255,255,0.05)] pb-4 mb-6">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-[1.5px] text-[var(--accent-red)] block mb-1">
                  Detalhes do Serviço Operacional
                </span>
                <h2 className="text-[18px] font-black text-white">
                  {selectedDesc.colaboradorNome} ({selectedDesc.empresaNome})
                </h2>
              </div>
              <button 
                onClick={() => setSelectedDesc(null)}
                className="w-8 h-8 rounded-full border border-[rgba(255,255,255,0.08)] bg-transparent hover:bg-slate-800 transition-colors flex items-center justify-center cursor-pointer text-slate-400 hover:text-white"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
            
            <div className="flex flex-col gap-6 text-[14px]">
              {/* Serviço Inicial */}
              <div className="flex flex-col gap-2">
                <label className="text-[11px] font-bold uppercase tracking-[1.5px] text-slate-500">
                  Descrição do Serviço Inicial (Check-in)
                </label>
                <div className="p-4 rounded-2xl bg-[rgba(5,8,18,0.7)] border border-[rgba(255,255,255,0.04)] text-slate-200 leading-relaxed font-medium whitespace-pre-wrap">
                  {selectedDesc.descricaoServico}
                </div>
              </div>

              {/* Serviços Extras */}
              {selectedDesc.servicosExtras && (
                <div className="flex flex-col gap-2">
                  <label className="text-[11px] font-bold uppercase tracking-[1.5px] text-yellow-500">
                    Serviços Extras / Ocorrências (Check-out)
                  </label>
                  <div className="p-4 rounded-2xl bg-yellow-950/10 border border-yellow-800/20 text-yellow-100 leading-relaxed font-medium whitespace-pre-wrap">
                    {selectedDesc.servicosExtras}
                  </div>
                </div>
              )}
              
              {/* Metadados */}
              <div className="grid grid-cols-2 gap-4 border-t border-[rgba(255,255,255,0.05)] pt-6 mt-2 text-[12px] text-slate-400">
                <div className="flex flex-col gap-1">
                  <span><strong>Operador Entrada:</strong> {selectedDesc.operadorEntrada}</span>
                  <span><strong>Entrada:</strong> {new Date(selectedDesc.timestampEntrada).toLocaleString('pt-BR')}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span><strong>Operador Saída:</strong> {selectedDesc.operadorSaida || '—'}</span>
                  <span><strong>Saída:</strong> {selectedDesc.timestampSaida ? new Date(selectedDesc.timestampSaida).toLocaleString('pt-BR') : '—'}</span>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end mt-8">
              <button
                onClick={() => setSelectedDesc(null)}
                className="px-6 py-3 rounded-2xl font-bold bg-slate-800 hover:bg-slate-700 text-white text-[13px] transition-colors cursor-pointer"
              >
                Fechar Detalhes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
