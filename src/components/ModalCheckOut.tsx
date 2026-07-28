'use client';

import { useState, useEffect } from 'react';

interface RegistroAtivoInfo {
  id: string;
  timestampEntrada: Date | string;
  operadorEntrada: string;
  descricaoServico: string;
}

interface ColaboradorInfo {
  id: string;
  nomeCompleto: string;
  cpf: string;
  empresa: {
    nome: string;
  };
  registroAtivo?: RegistroAtivoInfo;
}

interface ModalCheckOutProps {
  isOpen: boolean;
  onClose: () => void;
  colaborador: ColaboradorInfo | null;
  onConfirm: (operadorSaida: string, servicosExtras: string) => Promise<void>;
}

const OPERADORES_CCO = ['CCO - Thiago', 'CCO - Roberto', 'CCO - Amanda', 'CCO - Bruno'];

export default function ModalCheckOut({ isOpen, onClose, colaborador, onConfirm }: ModalCheckOutProps) {
  const [operador, setOperador] = useState('');
  const [servicosExtras, setServicosExtras] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Resgatar o último operador utilizado para poupar cliques
  useEffect(() => {
    if (isOpen) {
      const savedOperador = localStorage.getItem('ultimo_operador_cco_saida') || '';
      setOperador(savedOperador);
      setServicosExtras('');
      setError('');
    }
  }, [isOpen]);

  if (!isOpen || !colaborador) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!operador) {
      setError('Por favor, selecione o operador do CCO responsável pela validação da saída.');
      return;
    }

    setSubmitting(true);
    try {
      localStorage.setItem('ultimo_operador_cco_saida', operador);
      await onConfirm(operador, servicosExtras.trim());
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao realizar check-out.');
    } finally {
      setSubmitting(false);
    }
  };

  const getFormattedTime = (dateStr: Date | string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) + 'h';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-[4px] animate-[fadeIn_0.2s_ease-out]">
      <div className="w-full max-w-lg glass-panel rounded-3xl overflow-hidden shadow-2xl border border-[rgba(255,26,60,0.2)]">
        {/* Header do Modal */}
        <div className="px-8 py-6 border-b border-[rgba(255,255,255,0.05)] bg-[rgba(255,26,60,0.03)] flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[var(--accent-red)] text-[24px]">logout</span>
            <h3 className="text-[18px] font-black tracking-[0.5px] text-white">VALIDAÇÃO DE SAÍDA</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Informações do Colaborador */}
        <div className="px-8 py-5 bg-[rgba(8,12,28,0.4)] border-b border-[rgba(255,255,255,0.03)] flex gap-4 items-center">
          <div className="w-12 h-12 rounded-xl bg-[rgba(255,26,60,0.1)] border border-[rgba(255,26,60,0.15)] flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[var(--accent-red)] text-[24px]">person</span>
          </div>
          <div>
            <h4 className="text-[15px] font-bold text-white leading-tight">{colaborador.nomeCompleto}</h4>
            <div className="flex items-center gap-3 mt-1 text-[12px] text-slate-400">
              <span className="font-semibold text-slate-300">{colaborador.empresa.nome}</span>
              <span className="w-1 h-1 rounded-full bg-slate-600"></span>
              <span>CPF: {colaborador.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")}</span>
            </div>
          </div>
        </div>

        {/* Resumo do Turno de Entrada */}
        {colaborador.registroAtivo && (
          <div className="mx-8 mt-6 p-4 rounded-2xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.04)] flex flex-col gap-2">
            <div className="flex justify-between items-center text-[11px] font-bold uppercase tracking-[0.5px]">
              <span className="text-[var(--accent-red)]">Detalhamento da Entrada</span>
              <span className="text-slate-400">Entrada às {getFormattedTime(colaborador.registroAtivo.timestampEntrada)}</span>
            </div>
            <div className="text-[13px] text-slate-300">
              <span className="font-semibold text-slate-400">Serviço inicial: </span>
              {colaborador.registroAtivo.descricaoServico}
            </div>
            <div className="text-[11px] text-slate-500 font-medium">
              Liberado por {colaborador.registroAtivo.operadorEntrada}
            </div>
          </div>
        )}

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="p-8 flex flex-col gap-6">
          {error && (
            <div className="p-4 rounded-xl border border-[rgba(248,113,113,0.2)] bg-[rgba(248,113,113,0.05)] text-[13px] text-red-400 flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px]">error</span>
              {error}
            </div>
          )}

          {/* Seleção do Operador CCO */}
          <div className="flex flex-col gap-2">
            <label className="text-[12px] font-bold uppercase tracking-[1px] text-slate-400">Operador CCO (Saída)</label>
            <select
              value={operador}
              onChange={(e) => setOperador(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(8,12,28,0.6)] text-white text-[14px] focus:border-[var(--accent-red)] focus:ring-1 focus:ring-[var(--accent-red)] outline-none transition-all cursor-pointer"
              required
            >
              <option value="" disabled>Selecione o operador do CCO...</option>
              {OPERADORES_CCO.map((op) => (
                <option key={op} value={op} className="bg-[#0c122b] text-white">
                  {op}
                </option>
              ))}
            </select>
          </div>

          {/* Serviços Extras / Ocorrências */}
          <div className="flex flex-col gap-2">
            <label className="text-[12px] font-bold uppercase tracking-[1px] text-slate-400">Serviços Extras / Ocorrências (Texto Aberto)</label>
            <textarea
              value={servicosExtras}
              onChange={(e) => setServicosExtras(e.target.value)}
              placeholder="Descreva se houve serviços extras executados, observações de segurança ou ocorrências no turno..."
              className="w-full h-24 px-4 py-3 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(8,12,28,0.6)] text-white text-[14px] focus:border-[var(--accent-red)] focus:ring-1 focus:ring-[var(--accent-red)] outline-none transition-all resize-none"
            />
          </div>

          {/* Botões de Ação */}
          <div className="flex gap-4 mt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 py-3.5 rounded-xl text-[14px] font-bold border border-[rgba(255,255,255,0.08)] bg-transparent text-slate-300 hover:bg-[rgba(255,255,255,0.02)] transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-3.5 rounded-xl text-[14px] font-bold bg-[var(--accent-red)] hover:bg-[var(--accent-red-hover)] text-white shadow-[0_0_20px_rgba(255,26,60,0.2)] hover:shadow-[0_0_30px_rgba(255,26,60,0.3)] transition-all flex items-center justify-center gap-2"
            >
              {submitting ? (
                <span className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin"></span>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">done</span>
                  Confirmar Saída
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
