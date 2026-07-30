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
  const [helpOpen, setHelpOpen] = useState(false);
  const [helpActiveTab, setHelpActiveTab] = useState<'cadastro' | 'lote' | 'live' | 'auditoria'>('cadastro');
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

            <Link
              href="/chaves"
              className={`flex items-center gap-3 px-4 py-3.5 rounded-xl text-[14px] font-medium transition-all ${
                pathname === '/chaves'
                  ? 'bg-[rgba(255,26,60,0.08)] text-[var(--accent-red)] border border-[rgba(255,26,60,0.15)] font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-[rgba(255,255,255,0.02)]'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">key</span>
              Controle de Chaves
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
                {pathname === '/chaves' && 'Gestão de Chaves e Cautela'}
              </h2>
              <p className="text-[12px] text-slate-400">
                {pathname === '/' && 'Monitoramento ativo e liberação rápida de acessos'}
                {pathname === '/auditoria' && 'Relatórios consolidados de check-ins e check-outs'}
                {pathname === '/colaboradores' && 'Cadastro de prestadores de serviço e empresas credenciadas'}
                {pathname === '/chaves' && 'Controle de empréstimos, devoluções e integridade física de chaves CCO'}
              </p>
            </div>

            {/* Relógio CCO e Status Geral */}
            <div className="flex items-center gap-6">
              {/* Status de Conectividade do CCO */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-[rgba(52,211,153,0.15)] bg-[rgba(52,211,153,0.04)]">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--status-active)] animate-pulse"></span>
                <span className="text-[11px] font-bold text-[var(--status-active)] tracking-[0.5px] uppercase">CCO ONLINE</span>
              </div>

              {/* Botão de Ajuda */}
              <button
                onClick={() => setHelpOpen(true)}
                className="w-10 h-10 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(5,8,18,0.7)] text-slate-400 hover:text-white hover:border-[rgba(255,255,255,0.15)] flex items-center justify-center transition-all cursor-pointer"
                title="Central de Ajuda"
              >
                <span className="material-symbols-outlined text-[20px]">help_outline</span>
              </button>

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

      {/* Modal da Central de Ajuda Operacional */}
      {helpOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[99999] p-4 animate-[fadeIn_0.2s_ease-out]">
          <div className="glass-card w-full max-w-2xl p-6 flex flex-col gap-6 border border-[rgba(255,255,255,0.08)] bg-[#050812]/95 shadow-2xl rounded-2xl">
            {/* Cabeçalho do Modal */}
            <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.05)] pb-4 text-slate-300">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-[var(--accent-red)] text-[22px]">help</span>
                <div className="flex flex-col">
                  <h3 className="text-[14px] font-black uppercase tracking-[1px] text-white">Central de Ajuda Operacional</h3>
                  <span className="text-[11px] text-slate-400 leading-normal">Guia de treinamento e manual de conduta do CCO</span>
                </div>
              </div>
              <button
                onClick={() => setHelpOpen(false)}
                className="w-8 h-8 rounded-lg hover:bg-[rgba(255,255,255,0.05)] text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Menu de Tabs de Ajuda */}
            <div className="flex gap-2 border-b border-[rgba(255,255,255,0.03)] pb-px text-[11px] font-bold uppercase tracking-[0.5px]">
              <button
                onClick={() => setHelpActiveTab('cadastro')}
                className={`pb-3 px-3 border-b-2 cursor-pointer transition-all ${
                  helpActiveTab === 'cadastro' ? 'border-[var(--accent-red)] text-white' : 'border-transparent text-slate-500 hover:text-slate-300'
                }`}
              >
                Cadastro Individual
              </button>
              <button
                onClick={() => setHelpActiveTab('lote')}
                className={`pb-3 px-3 border-b-2 cursor-pointer transition-all ${
                  helpActiveTab === 'lote' ? 'border-[var(--accent-red)] text-white' : 'border-transparent text-slate-500 hover:text-slate-300'
                }`}
              >
                Arquivo (Lote)
              </button>
              <button
                onClick={() => setHelpActiveTab('live')}
                className={`pb-3 px-3 border-b-2 cursor-pointer transition-all ${
                  helpActiveTab === 'live' ? 'border-[var(--accent-red)] text-white' : 'border-transparent text-slate-500 hover:text-slate-300'
                }`}
              >
                Controle Live CCO
              </button>
              <button
                onClick={() => setHelpActiveTab('auditoria')}
                className={`pb-3 px-3 border-b-2 cursor-pointer transition-all ${
                  helpActiveTab === 'auditoria' ? 'border-[var(--accent-red)] text-white' : 'border-transparent text-slate-500 hover:text-slate-300'
                }`}
              >
                Auditoria & Busca
              </button>
            </div>

            {/* Conteúdo das Abas de Ajuda */}
            <div className="text-[13px] text-slate-300 leading-relaxed overflow-y-auto max-h-[350px] pr-1 flex flex-col gap-4">
              {helpActiveTab === 'cadastro' && (
                <div className="flex flex-col gap-3">
                  <h4 className="text-[14px] font-bold text-white flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[18px] text-[var(--accent-red)]">person_add</span>
                    Como realizar um Cadastro Singular
                  </h4>
                  <p>Para credenciar individualmente um novo colaborador ou prestador de serviço na arena:</p>
                  <ul className="list-disc pl-5 flex flex-col gap-1.5 text-slate-400">
                    <li>Acesse a aba <strong>Gestão de Cadastros</strong> no menu lateral e selecione <strong>Colaboradores & Prestadores</strong>.</li>
                    <li>Preencha o <strong>Nome Completo</strong> e insira os 11 dígitos do <strong>CPF</strong> (o sistema valida duplicidades na hora).</li>
                    <li>Selecione a <strong>Empresa Credenciada</strong> a qual ele pertence. Se a empresa não existir no menu, você pode criá-la previamente na aba <strong>Empresas Credenciadas</strong>.</li>
                    <li>Insira a <strong>Foto do Colaborador</strong> (por upload local ou digitando uma URL de imagem remota). Se não colocar nenhuma imagem, o sistema cria o perfil com um avatar padrão automático de usuário.</li>
                  </ul>
                </div>
              )}

              {helpActiveTab === 'lote' && (
                <div className="flex flex-col gap-3">
                  <h4 className="text-[14px] font-bold text-white flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[18px] text-[var(--accent-red)]">folder_open</span>
                    Importação de Arquivos de Dados (Lote)
                  </h4>
                  <p>Para credenciar equipes inteiras enviadas por e-mail via PDF ou planilhas Excel/CSV:</p>
                  <ul className="list-disc pl-5 flex flex-col gap-1.5 text-slate-400">
                    <li>Selecione a aba <strong>Arquivo de Dados</strong>.</li>
                    <li>Carregue o arquivo do seu computador nos formatos suportados (<code>.xlsx</code>, <code>.csv</code>, <code>.pdf</code>). O motor lê as tabelas geometricamente e identifica colunas de Nome, CPF e Empresa automaticamente.</li>
                    <li><strong>Conciliação de Empresas:</strong> Se o arquivo possuir colunas com nomes de empresas que não existem no banco de dados, o sistema abrirá um painel de conciliação. Nele, você pode optar por criar a empresa nova ou associar aqueles colaboradores a alguma empresa já existente no banco de dados.</li>
                  </ul>
                </div>
              )}

              {helpActiveTab === 'live' && (
                <div className="flex flex-col gap-3">
                  <h4 className="text-[14px] font-bold text-white flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[18px] text-[var(--accent-red)]">dashboard</span>
                    Liberação de Acesso no Painel Live CCO
                  </h4>
                  <p>Para liberar a passagem física de entrada (Check-in) ou saída (Check-out) na portaria:</p>
                  <ul className="list-disc pl-5 flex flex-col gap-1.5 text-slate-400">
                    <li>Na tela inicial <strong>Painel CCO Live</strong>, use a barra de busca rápida digitando o Nome ou CPF do colaborador.</li>
                    <li>Se o colaborador estiver do lado de fora, clique em <strong>Check-in (Entrada)</strong>, preencha o seu nome (operador CCO responsável) e descreva brevemente o serviço.</li>
                    <li>Se ele já estiver na arena e estiver saindo, clique em <strong>Check-out (Saída)</strong>, insira o seu nome de operador e digite qualquer serviço extra realizado.</li>
                  </ul>
                </div>
              )}

              {helpActiveTab === 'auditoria' && (
                <div className="flex flex-col gap-3">
                  <h4 className="text-[14px] font-bold text-white flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[18px] text-[var(--accent-red)]">history</span>
                    Histórico & Auditoria
                  </h4>
                  <p>Para consultar a movimentação e auditar acessos passados:</p>
                  <ul className="list-disc pl-5 flex flex-col gap-1.5 text-slate-400">
                    <li>Acesse a tela <strong>Histórico & Auditoria</strong> no menu lateral.</li>
                    <li><strong>Ordenação Dinâmica:</strong> Você pode clicar nos títulos das colunas para organizar a lista de colaboradores (ex: clicar em *Colaborador* uma vez ordena alfabeticamente; clicar duas vezes organiza por empresa; clicar em *Permanência* ordena do maior tempo de permanência para o menor, etc.).</li>
                  </ul>
                </div>
              )}
            </div>

            {/* Rodapé do Modal */}
            <div className="flex justify-end border-t border-[rgba(255,255,255,0.05)] pt-4">
              <button
                onClick={() => setHelpOpen(false)}
                className="px-6 py-2.5 text-[12px] font-bold bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.08)] rounded-xl text-white transition-all cursor-pointer"
              >
                Fechar Guia
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
