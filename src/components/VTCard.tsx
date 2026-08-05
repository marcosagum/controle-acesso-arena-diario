"use client";

import React, { useState } from 'react';

interface VT {
  id: string;
  event: string;
  date: string;
  responsible: string;
  companion: string;
  rooms: string[];
  clientRequests: string;
  specialNotes: string;
  status: 'pending' | 'completed';
}

interface VTCardProps {
  vt: VT;
  onComplete: (id: string) => void;
  onEdit: (vt: VT) => void;
  onDelete: (id: string) => void;
}

export const VTCard: React.FC<VTCardProps> = ({ vt, onComplete, onEdit, onDelete }) => {
  const [activeTab, setActiveTab] = useState<'requests' | 'notes'>('requests');

  // Lógica heurística local para sugerir soluções automaticamente com valor padrão
  const getTechnicalSolutions = (request: string = '') => {
    const text = request.toLowerCase();
    const solutions: string[] = [];

    if (text.includes("som") || text.includes("áudio") || text.includes("audio") || text.includes("microfone")) {
      solutions.push("PA Line Array L-Acoustics K2", "Console Digital Yamaha Rivage PM7", "Sistema Shure Axient Digital");
    }
    if (text.includes("retorno") || text.includes("in-ear") || text.includes("iem")) {
      solutions.push("Monitores In-Ear Sennheiser G4 IEM", "Side-fills d&b audiotechnik");
    }
    if (text.includes("led") || text.includes("painel") || text.includes("vídeo") || text.includes("video")) {
      solutions.push("Painel de LED Absen P2.8 Premium", "Processador Barco E2");
    }
    if (text.includes("luz") || text.includes("ilumina") || text.includes("refletor")) {
      solutions.push("Moving Heads Robe Pointe", "Mesa MA Lighting GrandMA3");
    }
    if (text.includes("energia") || text.includes("gerador") || text.includes("trifásico")) {
      solutions.push("Grupo Gerador Silenciado 250kVA", "QTA Trifásico 125A");
    }
    
    if (solutions.length === 0) {
      solutions.push("PA JBL VRX Line Array médio", "Console Digital Standard (Behringer X32)");
    }
    return solutions;
  };

  return (
    <div className="bg-[#121620] border border-[#1d2433] rounded-xl p-6 flex flex-col gap-5 transition-all duration-300 hover:-translate-y-1 hover:border-[#2e3952] hover:shadow-[0_10px_25px_rgba(0,0,0,0.3)]">
      <div className="flex justify-between items-start gap-2">
        <div className="flex flex-col gap-1">
          <h3 className="font-bold text-lg text-[#f3f4f6] truncate max-w-[200px]">{vt.event || 'Sem Evento'}</h3>
          <div className="text-xs text-[#00e5ff] flex items-center gap-1.5 font-semibold">
            <span className="material-symbols-outlined text-[16px]">calendar_today</span>
            <span>{vt.date ? new Date(vt.date).toLocaleString('pt-BR') : 'Data não definida'}</span>
          </div>
        </div>
        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
          vt.status === 'completed'
            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
            : 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
        }`}>
          {vt.status === 'completed' ? 'Concluída' : 'Agendada'}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs border-b border-[#1d2433] pb-4">
        <div>
          <span className="text-[#6b7280] font-medium block mb-0.5">Quem Fará a VT</span>
          <span className="text-[#f3f4f6] font-semibold">{vt.responsible || 'Não definido'}</span>
        </div>
        <div>
          <span className="text-[#6b7280] font-medium block mb-0.5">Acompanhante</span>
          <span className="text-[#f3f4f6] font-semibold">{vt.companion || 'Não definido'}</span>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-wide">Salas Mapeadas</span>
        <div className="flex flex-wrap gap-1.5">
          {(vt.rooms || []).map(room => (
            <span key={room} className="bg-white/5 border border-[#1d2433] px-2 py-0.5 rounded text-[10px] text-[#9ca3af]">
              {room}
            </span>
          ))}
        </div>
      </div>

      <div className="border-t border-[#1d2433] pt-3 flex flex-col gap-2">
        <div className="flex gap-4 border-b border-[#1d2433] pb-1">
          <button
            type="button"
            onClick={() => setActiveTab('requests')}
            className={`text-[10px] font-bold uppercase pb-1.5 border-b-2 transition-all ${
              activeTab === 'requests' ? 'border-[#ff1a3c] text-white' : 'border-transparent text-[#6b7280]'
            }`}
          >
            Pedido do Cliente
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('notes')}
            className={`text-[10px] font-bold uppercase pb-1.5 border-b-2 transition-all ${
              activeTab === 'notes' ? 'border-[#ff1a3c] text-white' : 'border-transparent text-[#6b7280]'
            }`}
          >
            Considerações Especiais
          </button>
        </div>
        <div className="text-xs text-[#9ca3af] min-h-[50px] leading-relaxed">
          {activeTab === 'requests' ? (vt.clientRequests || 'Nenhum pedido registrado') : (vt.specialNotes || 'Nenhuma consideração registrada')}
        </div>
      </div>

      <div className="bg-[#00e5ff]/5 border border-dashed border-[#00e5ff]/20 rounded-lg p-3 mt-auto text-xs flex flex-col gap-1.5">
        <div className="text-[#00e5ff] font-bold flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[16px]">memory</span>
          <span>Soluções Pré-Sugeridas:</span>
        </div>
        <ul className="list-disc pl-4 text-[#9ca3af] flex flex-col gap-0.5">
          {getTechnicalSolutions(vt.clientRequests || '').map((sol, index) => (
            <li key={index}>{sol}</li>
          ))}
        </ul>
      </div>

      <div className="flex justify-end gap-2 mt-2">
        {vt.status !== 'completed' && (
          <button
            type="button"
            onClick={() => onComplete(vt.id)}
            className="flex items-center gap-1 bg-[#121620] hover:bg-[#1b2130] border border-[#1d2433] text-xs font-semibold px-3 py-1.5 rounded transition-all text-emerald-400 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">check_circle</span>
            <span>Concluir</span>
          </button>
        )}
        <button
          type="button"
          onClick={() => onEdit(vt)}
          className="flex items-center gap-1 bg-[#121620] hover:bg-[#1b2130] border border-[#1d2433] text-xs font-semibold px-3 py-1.5 rounded transition-all text-[#9ca3af] hover:text-white cursor-pointer"
        >
          <span className="material-symbols-outlined text-[16px]">edit</span>
          <span>Editar</span>
        </button>
        <button
          type="button"
          onClick={() => onDelete(vt.id)}
          className="flex items-center gap-1 bg-[#121620] hover:bg-[#1b2130] border border-[#ff1a3c]/20 hover:border-[#ff1a3c]/40 text-xs font-semibold px-3 py-1.5 rounded transition-all text-[#ff1a3c] cursor-pointer"
        >
          <span className="material-symbols-outlined text-[16px]">delete</span>
          <span>Excluir</span>
        </button>
      </div>
    </div>
  );
};
