"use client";

import { Compass, X } from "lucide-react";
import { useEffect, useRef } from "react";

type RecommendationUnlockDialogProps = {
  open: boolean;
  onClose: () => void;
  onViewRecommendations: () => void;
  onContinueExploring: () => void;
};

export function RecommendationUnlockDialog({ open, onClose, onViewRecommendations, onContinueExploring }: RecommendationUnlockDialogProps) {
  const dialogRef = useRef<HTMLElement>(null);
  const primaryActionRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const frame = window.requestAnimationFrame(() => primaryActionRef.current?.focus());
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])');
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [onClose, open]);

  if (!open) return null;
  return <div className="fixed inset-0 z-[60] flex items-end justify-center bg-stone-950/45 sm:items-center sm:p-5" role="presentation" onMouseDown={onClose}>
    <section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="recommendation-unlock-title" aria-describedby="recommendation-unlock-description" className="max-h-[calc(100dvh-1rem)] w-full overflow-y-auto rounded-t-[2rem] bg-white px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-4 shadow-2xl sm:max-w-md sm:rounded-3xl sm:p-7" onMouseDown={(event) => event.stopPropagation()}>
      <div aria-hidden="true" className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-stone-200 sm:hidden"/>
      <div className="flex items-start justify-between gap-4"><span aria-hidden="true" className="grid h-12 w-12 place-items-center rounded-2xl bg-orange-100 text-orange-600"><Compass size={24}/></span><button type="button" onClick={onClose} aria-label="Fechar desbloqueio de recomendações" className="grid min-h-11 min-w-11 place-items-center rounded-full text-stone-500 transition hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600"><X size={20}/></button></div>
      <h2 id="recommendation-unlock-title" className="mt-5 text-2xl font-black tracking-tight">Você desbloqueou recomendações 🎯</h2>
      <div id="recommendation-unlock-description" className="mt-3 space-y-3 text-sm leading-6 text-stone-600"><p>Já estamos começando a entender seus gostos.</p><p>A partir de agora, o GODINNER pode recomendar lugares com base nas suas experiências e na sua rede.</p><p>Quanto mais você explorar e avaliar, melhores ficam suas recomendações.</p></div>
      <div className="mt-7 grid gap-3"><button ref={primaryActionRef} type="button" onClick={onViewRecommendations} className="min-h-12 rounded-2xl bg-orange-500 px-4 text-sm font-black text-white shadow-lg shadow-orange-500/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600">Ver minhas recomendações</button><button type="button" onClick={onContinueExploring} className="min-h-12 rounded-2xl bg-stone-100 px-4 text-sm font-black text-stone-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600">Continuar explorando</button></div>
    </section>
  </div>;
}
