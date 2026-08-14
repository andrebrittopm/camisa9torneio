/**
 * ETAPA 3.3A-1 — PROPOSTA DE COMPONENTE FRONTEND (TURNSTILE)
 * AUDITORIA: Somente para visualização da proposta de integração no React.
 */

import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';

// Declarar globalmente o objeto Turnstile da Cloudflare
declare global {
  interface Window {
    turnstile: {
      render: (container: string | HTMLElement, options: any) => string;
      reset: (widgetId: string) => void;
      getResponse: (widgetId: string) => string | undefined;
      remove: (widgetId: string) => void;
    };
  }
}

export interface TurnstileWidgetHandle {
  reset(): void;
}

interface TurnstileWidgetProps {
  onTokenChange: (token: string | null) => void;
  onTimeout?: () => void;
  onError?: () => void;
}

/**
 * 18. SCRIPT LOADER SPA (Singleton Promise)
 */
let scriptLoadingPromise: Promise<void> | null = null;
const loadTurnstileScript = (): Promise<void> => {
  if (window.turnstile) return Promise.resolve();
  if (scriptLoadingPromise) return scriptLoadingPromise;

  scriptLoadingPromise = new Promise((resolve, reject) => {
    const existingScript = document.getElementById('cloudflare-turnstile-script');
    if (existingScript) {
      // Script já existe mas window.turnstile ainda não está pronto
      const checkInterval = setInterval(() => {
        if (window.turnstile) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 50);
      return;
    }

    const script = document.createElement('script');
    script.id = 'cloudflare-turnstile-script';
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => {
      scriptLoadingPromise = null;
      reject(new Error("Turnstile script load failed"));
    };
    document.body.appendChild(script);
  });

  return scriptLoadingPromise;
};

export const TurnstileWidget = forwardRef<TurnstileWidgetHandle, TurnstileWidgetProps>(({ 
  onTokenChange, 
  onTimeout,
  onError
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  
  // 19. REACT EFFECT (Refs para callbacks para evitar re-render)
  const callbacksRef = useRef({ onTokenChange, onTimeout, onError });
  useEffect(() => {
    callbacksRef.current = { onTokenChange, onTimeout, onError };
  }, [onTokenChange, onTimeout, onError]);

  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;

  // 16. FRONTEND — RESET REAL
  useImperativeHandle(ref, () => ({
    reset: () => {
      if (widgetIdRef.current && window.turnstile) {
        callbacksRef.current.onTokenChange(null);
        window.turnstile.reset(widgetIdRef.current);
      }
    }
  }));

  useEffect(() => {
    if (!siteKey) return;

    let isMounted = true;

    loadTurnstileScript().then(() => {
      if (!isMounted || !containerRef.current || !window.turnstile) return;

      // 14. RENDERING EXPLÍCITO
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        action: "create_order", // 12. ACTION FIXA
        theme: 'dark',
        callback: (token: string) => {
          // 15. FRONTEND — TOKEN STATE
          callbacksRef.current.onTokenChange(token);
        },
        'expired-callback': () => {
          callbacksRef.current.onTokenChange(null);
        },
        'error-callback': () => {
          callbacksRef.current.onTokenChange(null);
          if (callbacksRef.current.onError) callbacksRef.current.onError();
        },
        'timeout-callback': () => {
          // 14. FRONTEND — TIMEOUT CALLBACK
          callbacksRef.current.onTokenChange(null);
          if (callbacksRef.current.onTimeout) callbacksRef.current.onTimeout();
        }
      });
    }).catch(() => {
      if (isMounted && callbacksRef.current.onError) callbacksRef.current.onError();
    });

    return () => {
      isMounted = false;
      if (widgetIdRef.current && window.turnstile) {
        // 16. No unmount: turnstile.remove()
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [siteKey]);

  if (!siteKey) {
    return (
      <div className="p-4 bg-red-900/20 border border-red-500/50 rounded-lg text-sm text-red-200">
        Proteção anti-bot indisponível.
      </div>
    );
  }

  return <div ref={containerRef} className="min-h-[65px]" />;
});

TurnstileWidget.displayName = 'TurnstileWidget';
