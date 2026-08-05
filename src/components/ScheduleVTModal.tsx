"use client";

import React, { useState, useEffect } from 'react';

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

interface ScheduleVTModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (vt: Omit<VT, 'id' | 'status'> & { id?: string }) => void;
  editingVT: VT | null;
  availableRooms: string[];
  onAddCustomRoom: (room: string) => void;
}

export const ScheduleVTModal: React.FC<ScheduleVTModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingVT,
  availableRooms,
  onAddCustomRoom
}) => {
  const [event, setEvent] = useState('');
  const [date, setDate] = useState('');
  const [responsible, setResponsible] = useState('');
  const [companion, setCompanion] = useState('');
  const [selectedRooms, setSelectedRooms] = useState<string[]>([]);
  const [clientRequests, setClientRequests] = useState('');
  const [specialNotes, setSpecialNotes] = useState('');
  const [newRoomInput, setNewRoomInput] = useState('');

  // Sincroniza campos quando entra em modo de edição
  useEffect(() => {
    if (editingVT) {
      setEvent(editingVT.event || '');
      setDate(editingVT.date || '');
      setResponsible(editingVT.responsible || '');
      setCompanion(editingVT.companion || '');
      setSelectedRooms(editingVT.rooms || []);
      setClientRequests(editingVT.clientRequests || '');
      setSpecialNotes(editingVT.specialNotes || '');
    } else {
      setEvent('');
      setDate('');
      setResponsible('');
      setCompanion('');
      setSelectedRooms([]);
      setClientRequests('');
      setSpecialNotes('');
    }
  }, [editingVT, isOpen]);

  if (!isOpen) return null;

  const handleRoomToggle = (room: string) => {
    setSelectedRooms(prev =>
      prev.includes(room) ? prev.filter(r => r !== room) : [...prev, room]
    );
  };

  const handleAddCustomRoom = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanRoom = newRoomInput.trim();
    if (!cleanRoom) return;

    if (!(availableRooms || []).includes(cleanRoom)) {
      onAddCustomRoom(cleanRoom);
    }

    if (!selectedRooms.includes(cleanRoom)) {
      setSelectedRooms(prev => [...prev, cleanRoom]);
    }
    setNewRoomInput('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedRooms.length === 0) {
      alert("Por favor, selecione ao menos uma sala.");
      return;
    }
    onSave({
      id: editingVT?.id,
      event,
      date,
      responsible,
      companion,
      rooms: selectedRooms,
      clientRequests,
      specialNotes
    });
  };

  return (
    <>
      {/* Backdrop de Fundo */}
      <div 
        onClick={onClose}
        className="fixed inset-0 bg-[#03050c]/75 backdrop-blur-sm z-[1000] transition-opacity duration-355"
      />

      {/* Caixa da Modal - Posicionada no Centro da Tela e Rolável */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[95%] max-w-[600px] max-h-[85vh] bg-[#121620] border border-[#1d2433] rounded-2xl z-[1001] flex flex-col shadow-[0_20px_50px_rgba(0,0,0,0.6)] overflow-hidden">
        
        {/* Header */}
        <div className="p-6 border-b border-[#1d2433] flex justify-between items-center">
          <h2 className="font-bold text-xl text-[#f3f4f6]">
            {editingVT ? 'Editar Visita Técnica' : 'Agendar Nova Visita Técnica'}
          </h2>
          <button 
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-lg border border-[#1d2433] bg-[#121620] hover:bg-[#1b2130] hover:text-[#ff1a3c] flex items-center justify-center text-[#9ca3af] transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Formulário com Área Interna Autocontrolada para Rolagem */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-grow overflow-hidden">
          <div className="p-6 overflow-y-auto flex-grow flex flex-col gap-5">
            
            {/* Nome do Evento */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-[#9ca3af] uppercase tracking-wide">Nome do Evento</label>
              <input
                type="text"
                value={event}
                onChange={e => setEvent(e.target.value)}
                placeholder="Ex: Festival Arena Rock 2026"
                required
                className="bg-[#171d2b] border border-[#1d2433] rounded-lg p-3 text-sm text-[#f3f4f6] focus:outline-none focus:border-[#ff1a3c] transition-all"
              />
            </div>

            {/* Grid Data & Responsável */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-[#9ca3af] uppercase tracking-wide">Data & Hora</label>
                <input
                  type="datetime-local"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  required
                  className="bg-[#171d2b] border border-[#1d2433] rounded-lg p-3 text-sm text-[#f3f4f6] focus:outline-none focus:border-[#ff1a3c] transition-all"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-[#9ca3af] uppercase tracking-wide">Responsável Técnico</label>
                <input
                  type="text"
                  value={responsible}
                  onChange={e => setResponsible(e.target.value)}
                  placeholder="Quem fará a VT"
                  required
                  className="bg-[#171d2b] border border-[#1d2433] rounded-lg p-3 text-sm text-[#f3f4f6] focus:outline-none focus:border-[#ff1a3c] transition-all"
                />
              </div>
            </div>

            {/* Acompanhante */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-[#9ca3af] uppercase tracking-wide">Acompanhante (Quem vai acompanhar)</label>
              <input
                type="text"
                value={companion}
                onChange={e => setCompanion(e.target.value)}
                placeholder="Ex: Diretor do Cliente, Produtor Local"
                required
                className="bg-[#171d2b] border border-[#1d2433] rounded-lg p-3 text-sm text-[#f3f4f6] focus:outline-none focus:border-[#ff1a3c] transition-all"
              />
            </div>

            {/* Seletor de Salas com Adição Customizada */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-[#9ca3af] uppercase tracking-wide">Salas / Espaços a Visitar</label>
              <div className="grid grid-cols-2 gap-2 bg-[#090b11]/60 border border-[#1d2433] p-4 rounded-lg max-h-[150px] overflow-y-auto">
                {(availableRooms || []).map(room => (
                  <label key={room} className="flex items-center gap-2 text-sm text-[#9ca3af] cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={selectedRooms.includes(room)}
                      onChange={() => handleRoomToggle(room)}
                      className="accent-[#ff1a3c] w-4 h-4 rounded cursor-pointer"
                    />
                    <span className={selectedRooms.includes(room) ? "text-[#f3f4f6] font-semibold" : ""}>{room}</span>
                  </label>
                ))}
              </div>
              
              {/* Campo para criar e selecionar novas salas dinamicamente */}
              <div className="flex gap-2 mt-2">
                <input
                  type="text"
                  value={newRoomInput}
                  onChange={e => setNewRoomInput(e.target.value)}
                  placeholder="Adicionar nova sala personalizada..."
                  className="flex-grow bg-[#171d2b] border border-[#1d2433] rounded-lg px-3 py-2 text-xs text-[#f3f4f6] focus:outline-none focus:border-[#ff1a3c] transition-all"
                />
                <button
                  type="button"
                  onClick={() => handleAddCustomRoom()}
                  className="bg-[#121620] hover:bg-[#1b2130] border border-[#1d2433] text-xs font-semibold px-4 py-2 rounded-lg transition-all text-[#00e5ff] flex items-center gap-1 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">add</span>
                  <span>Adicionar</span>
                </button>
              </div>
            </div>

            {/* Pedidos do Cliente */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-[#9ca3af] uppercase tracking-wide">Pedido do Cliente (Necessidades Técnicas)</label>
              <textarea
                value={clientRequests}
                onChange={e => setClientRequests(e.target.value)}
                placeholder="O que o cliente precisa neste evento? Descreva para o sistema sugerir as soluções..."
                required
                className="bg-[#171d2b] border border-[#1d2433] rounded-lg p-3 text-sm text-[#f3f4f6] focus:outline-none focus:border-[#ff1a3c] transition-all min-h-[80px]"
              />
            </div>

            {/* Considerações Especiais */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-[#9ca3af] uppercase tracking-wide">Considerações Técnicas Especiais</label>
              <textarea
                value={specialNotes}
                onChange={e => setSpecialNotes(e.target.value)}
                placeholder="Obstáculos, observações de segurança, restrições elétricas ou logísticas..."
                required
                className="bg-[#171d2b] border border-[#1d2433] rounded-lg p-3 text-sm text-[#f3f4f6] focus:outline-none focus:border-[#ff1a3c] transition-all min-h-[80px]"
              />
            </div>

          </div>

          {/* Footer - Fixado na base do Modal */}
          <div className="p-6 border-t border-[#1d2433] flex justify-end gap-3 bg-[#121620]">
            <button
              type="button"
              onClick={onClose}
              className="bg-[#121620] hover:bg-[#1b2130] border border-[#1d2433] text-sm font-semibold px-4 py-2.5 rounded-lg transition-all text-[#9ca3af] hover:text-white cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="bg-[#ff1a3c] hover:bg-[#ff4760] text-sm font-semibold px-5 py-2.5 rounded-lg transition-all text-white shadow-[0_4px_14px_rgba(255,26,60,0.35)] flex items-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">check</span>
              <span>Salvar VT</span>
            </button>
          </div>
        </form>

      </div>
    </>
  );
};
