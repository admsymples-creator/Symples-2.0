"use client";

import * as React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

const thinkingPhrases = [
  "Processando sua solicitação...",
  "Estruturando os dados...",
  "Consultando sua agenda...",
  "Quase lá, finalizando...",
];

export function ThinkingIndicator() {
  const [currentPhraseIndex, setCurrentPhraseIndex] = React.useState(0);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setCurrentPhraseIndex((prev) => (prev + 1) % thinkingPhrases.length);
    }, 3000); // Rotaciona a cada 3 segundos

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center gap-3 p-3">
      {/* 1. O ORB (Versão Turbo) - Reduzido em 20% */}
      <div className="relative flex h-8 w-8 items-center justify-center">
        
        {/* Fundo Escuro (Core) */}
        <div className="absolute inset-0 rounded-full bg-slate-950" />

        {/* Anel de Carga (Grosso e Rápido) */}
        {/* 'inset-[-2px]' define a grossura da borda para fora (ajustado proporcionalmente) */}
        {/* 'animate-spin' padrão é 1s. Vamos forçar mais rápido com style ou classe arbitrária */}
        <div className="absolute inset-[-2px] rounded-full overflow-hidden">
          <div 
            className="absolute inset-0 bg-[conic-gradient(from_0deg,transparent_0deg,#22c55e_180deg,transparent_180deg)]" 
            style={{ animation: "thinking-spin 0.6s linear infinite" }} // 0.6s = Muito rápido
          />
        </div>
        
        {/* Miolo com ícone Symples */}
        <div className="absolute inset-[1.5px] rounded-full bg-slate-950 z-20 flex items-center justify-center">
           {/* Ícone Symples no centro (reduzido proporcionalmente) */}
           <Image
             src="/white-icon-symples.svg"
             alt="Symples"
             width={12}
             height={12}
             className="drop-shadow-[0_0_6px_rgba(34,197,94,0.8)]"
           />
        </div>
      </div>

      {/* 2. O TEXTO (Efeito Shimmer/Luz Passando) */}
      <div className="flex flex-col justify-center h-full">
        <span 
          key={currentPhraseIndex}
          className="text-sm font-medium bg-gradient-to-r from-slate-500 via-slate-300 to-slate-500 bg-[length:200%_auto] bg-clip-text text-transparent animate-in fade-in duration-300"
          style={{ animation: "thinking-shimmer 2s linear infinite" }}
        >
          {thinkingPhrases[currentPhraseIndex]}
        </span>
      </div>

      {/* Estilos Globais para keyframes */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes thinking-spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          @keyframes thinking-shimmer {
            0% { background-position: 200% center; }
            100% { background-position: -200% center; }
          }
        `
      }} />
    </div>
  );
}
