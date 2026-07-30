'use client';

import { useEffect, useState, useRef } from 'react';

interface SplashLoaderProps {
  onComplete: () => void;
}

export default function SplashLoader({ onComplete }: SplashLoaderProps) {
  const [visible, setVisible] = useState(true);
  const [shrink, setShrink] = useState(false);
  const [fadeOutText, setFadeOutText] = useState(false);
  const [fadeOutBg, setFadeOutBg] = useState(false);

  const onCompleteRef = useRef(onComplete);
  
  // Atualizar a referência do callback sempre que ele mudar
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    // Verificar se já rodou na sessão (apenas no lado do cliente)
    const splashExecuted = typeof window !== 'undefined' ? sessionStorage.getItem('splash_executed') : null;
    
    if (splashExecuted) {
      setVisible(false);
      onCompleteRef.current();
      return;
    }

    // 1. Após 2 segundos, começa a animação de viagem do logo e fade-out do texto
    const textTimer = setTimeout(() => {
      setFadeOutText(true);
      setShrink(true);
    }, 2000);

    // 2. Após 3.2 segundos (2.0s de espera + 1.2s de viagem), inicia o fade-out do background escuro
    const bgTimer = setTimeout(() => {
      setFadeOutBg(true);
      onCompleteRef.current(); // Notifica o pai para fazer o fade-in do app
    }, 3200);

    // 3. Após 3.8 segundos (3.2s + 0.6s de fade-out), destrói o overlay da árvore do React
    const destroyTimer = setTimeout(() => {
      setVisible(false);
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('splash_executed', 'true');
      }
    }, 3800);

    return () => {
      clearTimeout(textTimer);
      clearTimeout(bgTimer);
      clearTimeout(destroyTimer);
    };
  }, []); // Array vazio garante que rode apenas no mount


  if (!visible) return null;

  return (
    <div className={`splash-overlay ${fadeOutBg ? 'fade-out' : ''}`}>
      <div className="splash-content">
        {/* Aura pulsante de fundo */}
        {!shrink && <div className="splash-glow"></div>}

        {/* Título e Subtítulo da Arena */}
        <div className={`splash-text-container ${fadeOutText ? 'fade-out-text' : ''}`}>
          <h1 className="splash-title">CCO</h1>
          <p className="splash-subtitle">GESTÃO DE OPERAÇÕES</p>
        </div>

        {/* Logotipo que encolhe e viaja até o header */}
        <img
          src="/logo_gl.jpg"
          alt="GL Events Logo"
          className={`splash-logo ${shrink ? 'shrink-move' : ''}`}
        />
      </div>
    </div>
  );
}
