/**
 * ETAPA 3.3A-1 — PROPOSTA DE COMPONENTE FRONTEND (TURNSTILE)
 * AUDITORIA: Somente para visualização da proposta de integração no React.
 */

import React, { useEffect, useRef, useState } from 'react';

// Declarar globalmente o objeto Turnstile da Cloudflare
declare global {
  interface Window {
    onloadTurnstileCallback: () => void;
    turnstile: {
      render: (container: string | HTMLElement, options: any) => string;
      reset: (widgetId: string) => void;
      getResponse: (widgetId: string) => string | undefined;
      remove: (widgetId: string) => void;
    };
  }
}

interface TurnstileWidgetProps {
  onVerify: (token: string) => void;
  onExpire?: () => void;
  onError?: () => void;
  action?: string;
}

export const TurnstileWidget: React.FC<TurnstileWidgetProps> = ({ 
  onVerify, 
  onExpire, 
  onError,
  action = "create_order" 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;

  useEffect(() => {
    // 15. SITEKEY - Se ausente, não renderiza e avisa
    if (!siteKey) {
      console.error("[AV] Turnstile Site Key missing");
      return;
    }

    const renderWidget = () => {
      if (containerRef.current && window.turnstile) {
        // 14. RENDERING EXPLÍCITO
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          action: action, // 9. ACTION FIXA
          theme: 'dark',
          callback: (token: string) => {
            onVerify(token);
          },
          'expired-callback': () => {
            if (onExpire) onExpire();
          },
          'error-callback': () => {
            if (onError) onError();
          },
        });
      }
    };

    // Carregar script se ainda não estiver presente
    if (!document.getElementById('cloudflare-turnstile-script')) {
      const script = document.createElement('script');
      script.id = 'cloudflare-turnstile-script';
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.defer = true;
      script.onload = renderWidget;
      document.body.appendChild(script);
    } else if (window.turnstile) {
      renderWidget();
    }

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
      }
    };
  }, [siteKey, onVerify, onExpire, onError, action]);

  if (!siteKey) {
    return (
      <div className="p-4 bg-red-900/20 border border-red-500/50 rounded-lg text-sm text-red-200">
        Proteção anti-bot indisponível (Site Key ausente).
      </div>
    );
  }

  return <div ref={containerRef} className="min-h-[65px]" />;
};

/**
 * EXEMPLO DE INTEGRAÇÃO NO CHECKOUT
 */
/*
const CheckoutForm = () => {
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!turnstileToken) return; // BLOQUEAR SUBMIT SEM TOKEN
    
    // ... lógica de envio ...
    
    // 14. RESET APÓS TENTATIVA
    // if (widgetId) window.turnstile.reset(widgetId);
    // setTurnstileToken(null);
  };

  return (
    <form onSubmit={handleSubmit}>
      ...
      <TurnstileWidget onVerify={setTurnstileToken} />
      <button disabled={!turnstileToken}>Finalizar Pedido</button>
    </form>
  );
};
*/
