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
 * Singleton Script Loader para Turnstile
 */
let scriptLoadingPromise: Promise<void> | null = null;
const LOAD_TIMEOUT_MS = 15000;

const loadTurnstileScript = (): Promise<void> => {
  if (window.turnstile) return Promise.resolve();
  if (scriptLoadingPromise) return scriptLoadingPromise;

  scriptLoadingPromise = new Promise((resolve, reject) => {
    const scriptId = 'cloudflare-turnstile-script';
    let existingScript = document.getElementById(scriptId) as HTMLScriptElement | null;
    
    const cleanup = () => {
      clearTimeout(timeoutId);
      if (existingScript) {
        existingScript.removeEventListener('load', resolveHandler);
        existingScript.removeEventListener('error', errorHandler);
      }
    };

    const resolveHandler = () => {
      cleanup();
      resolve();
    };

    const errorHandler = () => {
      cleanup();
      scriptLoadingPromise = null;
      reject(new Error("Turnstile script load failed"));
    };

    const timeoutId = setTimeout(() => {
      cleanup();
      scriptLoadingPromise = null;
      reject(new Error("Turnstile script load timeout"));
    }, LOAD_TIMEOUT_MS);

    if (existingScript) {
      if (window.turnstile) {
        resolveHandler();
      } else {
        existingScript.addEventListener('load', resolveHandler);
        existingScript.addEventListener('error', errorHandler);
        
        // Polling de segurança caso o load já tenha disparado
        const poll = setInterval(() => {
          if (window.turnstile) {
            clearInterval(poll);
            resolveHandler();
          }
        }, 100);
        
        // Limpar polling no timeout ou erro
        setTimeout(() => clearInterval(poll), LOAD_TIMEOUT_MS);
      }
      return;
    }

    const script = document.createElement('script');
    script.id = scriptId;
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.defer = true;
    existingScript = script;

    script.addEventListener('load', resolveHandler);
    script.addEventListener('error', errorHandler);
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
  
  // Refs para callbacks para evitar re-render desnecessário
  const callbacksRef = useRef({ onTokenChange, onTimeout, onError });
  useEffect(() => {
    callbacksRef.current = { onTokenChange, onTimeout, onError };
  }, [onTokenChange, onTimeout, onError]);

  const siteKey = import.meta.env['VITE_TURNSTILE_SITE_KEY'];

  useEffect(() => {
    const isProduction = import.meta.env.PROD;
    const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    const isPreview = typeof window !== 'undefined' && window.location.hostname.includes('lovable.app') && window.location.hostname.includes('preview');

    if (!siteKey && isProduction && !isLocalhost && !isPreview) {
      console.error("[AV] Turnstile Site Key is missing in production. Orders will fail.");
    }
  }, [siteKey]);

  useImperativeHandle(ref, () => ({
    reset: () => {
      // 8. RESET DEVE SEMPRE LIMPAR TOKEN
      callbacksRef.current.onTokenChange(null);
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.reset(widgetIdRef.current);
      }
    }
  }));

  useEffect(() => {
    if (!siteKey) return;

    let isMounted = true;

    loadTurnstileScript().then(() => {
      if (!isMounted || !containerRef.current || !window.turnstile) return;

      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        action: "create_order",
        theme: 'dark',
        appearance: 'always',
        // 9. Configurar para não criar campo de resposta automático se possível
        'response-field': false,
        'retry': 'auto',
        'retry-interval': 1000,
        callback: (token: string) => {
          if (isMounted) callbacksRef.current.onTokenChange(token);
        },
        'expired-callback': () => {
          if (isMounted) callbacksRef.current.onTokenChange(null);
        },
        'error-callback': () => {
          if (isMounted) {
            callbacksRef.current.onTokenChange(null);
            if (callbacksRef.current.onError) callbacksRef.current.onError();
          }
        },
        'timeout-callback': () => {
          if (isMounted) {
            callbacksRef.current.onTokenChange(null);
            if (callbacksRef.current.onTimeout) callbacksRef.current.onTimeout();
          }
        }
      });
    }).catch(() => {
      if (isMounted && callbacksRef.current.onError) callbacksRef.current.onError();
    });

    return () => {
      isMounted = false;
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [siteKey]);

  if (!siteKey) {
    return (
      <div className="p-4 bg-red-900/20 border border-red-500/50 rounded-lg text-sm text-red-200">
        Proteção anti-bot indisponível (Site Key ausente).
      </div>
    );
  }

  return <div ref={containerRef} className="min-h-[65px] flex justify-center lg:justify-start" />;
});

TurnstileWidget.displayName = 'TurnstileWidget';
