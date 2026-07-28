'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import SplashLoader from './SplashLoader';

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const [splashCompleted, setSplashCompleted] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [currentTime, setCurrentTime] = useState('');
  const pathname = usePathname();

  const handleSplashComplete = useCallback(() => {
    setSplashCompleted(true);
  }, []);

  useEffect(() => {
    setMounted(true);
    
    // Relógio dinâmico para a equipe do CCO
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
    };

    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!mounted) return null;

  return (
    <div className="min-h-screen flex flex-col relative">
      {/* Splash Screen */}
      <SplashLoader onComplete={handleSplashComplete} />

      {/* Interface Principal da Aplicação */}
      <div 
        className={`flex-1 flex flex-row transition-opacity duration-700 ease-out ${
          splashCompleted ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Sidebar Lateral Premium */}
        <aside className="w-[260px] shrink-0 border-r border-[rgba(255,255,255,0.05)] bg-[rgba(5,8,18,0.85)] backdrop-blur-[16px] flex flex-col z-10">
          {/* Topo da Sidebar (Onde o logotipo da animação vai pousar) */}
          <div className="h-[96px] px-8 flex items-center gap-3 border-b border-[rgba(255,255,255,0.03)]">
            <div className="w-[42px] h-[42px] relative shrink-0 overflow-hidden rounded-[9px]">
              {/* Espaço reservado para o logo real que surge após o splash */}
              <img
                src="/logo_gl.png"
                alt="GL Logo"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex flex-col">
              <span className="text-[14px] font-black tracking-[1.5px] text-white">FARMASI ARENA</span>
              <span className="text-[9px] font-bold tracking-[0.5px] text-[var(--accent-red)] uppercase leading-snug">Sistema de credenciamento</span>
            </div>
          </div>

          {/* Links de Navegação */}
          <nav className="flex-1 px-4 py-8 flex flex-col gap-2">
            <Link
              href="/"
              className={`flex items-center gap-3 px-4 py-3.5 rounded-xl text-[14px] font-medium transition-all ${
                pathname === '/'
                  ? 'bg-[rgba(255,26,60,0.08)] text-[var(--accent-red)] border border-[rgba(255,26,60,0.15)] font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-[rgba(255,255,255,0.02)]'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">dashboard</span>
              Painel CCO Live
            </Link>

            <Link
              href="/auditoria"
              className={`flex items-center gap-3 px-4 py-3.5 rounded-xl text-[14px] font-medium transition-all ${
                pathname === '/auditoria'
                  ? 'bg-[rgba(255,26,60,0.08)] text-[var(--accent-red)] border border-[rgba(255,26,60,0.15)] font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-[rgba(255,255,255,0.02)]'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">history</span>
              Histórico & Auditoria
            </Link>

            <Link
              href="/colaboradores"
              className={`flex items-center gap-3 px-4 py-3.5 rounded-xl text-[14px] font-medium transition-all ${
                pathname === '/colaboradores'
                  ? 'bg-[rgba(255,26,60,0.08)] text-[var(--accent-red)] border border-[rgba(255,26,60,0.15)] font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-[rgba(255,255,255,0.02)]'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">group</span>
              Gestão de Cadastros
            </Link>
          </nav>

          {/* Rodapé da Sidebar */}
          <div className="p-6 border-t border-[rgba(255,255,255,0.03)] text-center">
            <span className="text-[10px] tracking-[1.5px] font-bold text-slate-500 block mb-1">CCO CONSOLE</span>
            <span className="text-[9px] text-slate-600 block">v1.2.0-diario</span>
          </div>
        </aside>

        {/* Área de Conteúdo Principal */}
        <main className="flex-1 flex flex-col overflow-y-auto relative bg-[rgba(3,5,12,0.92)]">
          {/* Header Superior com Informações Operacionais */}
          <header className="h-[96px] px-8 border-b border-[rgba(255,255,255,0.03)] bg-[rgba(3,5,12,0.4)] backdrop-blur-[8px] flex items-center justify-between shrink-0 z-10">
            <div>
              <h2 className="text-[18px] font-bold text-white tracking-[0.5px]">
                {pathname === '/' && 'Controle de Fluxo Operacional'}
                {pathname === '/auditoria' && 'Painel de Auditoria Diária'}
                {pathname === '/colaboradores' && 'Gestão de Colaboradores'}
              </h2>
              <p className="text-[12px] text-slate-400">
                {pathname === '/' && 'Monitoramento ativo e liberação rápida de acessos'}
                {pathname === '/auditoria' && 'Relatórios consolidados de check-ins e check-outs'}
                {pathname === '/colaboradores' && 'Cadastro de prestadores de serviço e empresas credenciadas'}
              </p>
            </div>

            {/* Relógio CCO e Status Geral */}
            <div className="flex items-center gap-6">
              {/* Status de Conectividade do CCO */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-[rgba(52,211,153,0.15)] bg-[rgba(52,211,153,0.04)]">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--status-active)] animate-pulse"></span>
                <span className="text-[11px] font-bold text-[var(--status-active)] tracking-[0.5px] uppercase">CCO ONLINE</span>
              </div>

              {/* Relógio do CCO */}
              <div className="flex flex-col text-right">
                <span className="text-[16px] font-mono font-bold text-white tracking-[1px]">{currentTime || '--:--:--'}</span>
                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-[0.5px]">Hora</span>
              </div>
            </div>
          </header>

          {/* Conteúdo da Página */}
          <div className="flex-1 p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
