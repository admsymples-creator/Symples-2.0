"use client";

import * as React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

const switchingPhrases = [
  "Trocando de workspace...",
  "Estamos preparando tudo...",
];

const initialLoadPhrases = [
  "Carregando seu workspace...",
  "Estamos preparando tudo...",
];

export function WorkspaceLoadingOverlay({ isVisible, isInitialLoad = false }: { isVisible: boolean; isInitialLoad?: boolean }) {
  const [currentPhraseIndex, setCurrentPhraseIndex] = React.useState(0);
  const previousVisibleRef = React.useRef(isVisible);

  React.useEffect(() => {
    if (isVisible !== previousVisibleRef.current) {
      previousVisibleRef.current = isVisible;
    }

    if (!isVisible) return;

    const phrases = isInitialLoad ? initialLoadPhrases : switchingPhrases;
    const interval = setInterval(() => {
      setCurrentPhraseIndex((prev) => (prev + 1) % phrases.length);
    }, 2000); // Rotaciona a cada 2 segundos

    return () => clearInterval(interval);
  }, [isVisible, isInitialLoad]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* Backdrop sólido para esconder movimentação atrás */}
      <div className="absolute inset-0 bg-background" />

      {/* Conteúdo centralizado */}
      <div className="relative z-10 flex flex-col items-center gap-6">
        {/* Spinner tipo IA Assistant */}
        <div className="relative flex h-16 w-16 items-center justify-center">
          {/* Fundo Escuro (Core) */}
          <div className="absolute inset-0 rounded-full bg-slate-950" />

          {/* Anel de Carga (Grosso e Rápido) */}
          <div className="absolute inset-[-3px] rounded-full overflow-hidden">
            <div
              className="absolute inset-0 bg-[conic-gradient(from_0deg,transparent_0deg,#22c55e_180deg,transparent_180deg)]"
              style={{ animation: "workspace-switch-spin 0.6s linear infinite" }}
            />
          </div>

          {/* Miolo com ícone Symples */}
          <div className="absolute inset-[2px] rounded-full bg-slate-950 z-20 flex items-center justify-center">
            <Image
              src="/white-icon-symples.svg"
              alt="Symples"
              width={24}
              height={24}
              priority
              className="w-6 h-6 object-contain drop-shadow-[0_0_8px_rgba(34,197,94,0.8)]"
            />
          </div>
        </div>

        {/* Frases animadas */}
        <div className="flex flex-col items-center justify-center">
          <span
            key={currentPhraseIndex}
            className="text-base font-medium bg-gradient-to-r from-slate-600 via-slate-400 to-slate-600 bg-[length:200%_auto] bg-clip-text text-transparent animate-in fade-in duration-300"
            style={{ animation: "workspace-switch-shimmer 2s linear infinite" }}
          >
            {(isInitialLoad ? initialLoadPhrases : switchingPhrases)[currentPhraseIndex]}
          </span>
        </div>
      </div>

      {/* Estilos Globais para keyframes */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes workspace-switch-spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          @keyframes workspace-switch-shimmer {
            0% { background-position: 200% center; }
            100% { background-position: -200% center; }
          }
        `
      }} />
    </div>
  );
}

