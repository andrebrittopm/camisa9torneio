import { useOrderState } from "@/lib/order-state";
import { useCallback, useEffect, useState } from "react";

export function useAvNavigation() {
  const currentStep = useOrderState((s) => s.currentStep);
  const setStep = useOrderState((s) => s.setStep);
  const [pendingTarget, setPendingTarget] = useState<string | null>(null);

  const navigateToSection = useCallback((sectionId: string): void => {
    const id = sectionId.startsWith('#') ? sectionId.substring(1) : sectionId;
    
    if (currentStep !== 'idle') {
      setPendingTarget(id);
      setStep('idle');
    } else {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
        window.history.pushState(null, '', `#${id}`);
      }
    }
  }, [currentStep, setStep]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    
    if (currentStep === 'idle' && pendingTarget) {
      timer = setTimeout(() => {
        const el = document.getElementById(pendingTarget);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth' });
          window.history.pushState(null, '', `#${pendingTarget}`);
        }
        setPendingTarget(null);
      }, 100);
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [currentStep, pendingTarget]);

  return { navigateToSection };
}
