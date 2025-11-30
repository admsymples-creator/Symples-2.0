import { Sparkles } from "lucide-react";

export function AIOrb() {
  return (
    <div className="relative flex items-center justify-center mb-8">
      {/* 1. O Brilho Externo (Atmosphere) - Mais contido */}
      <div className="absolute inset-0 bg-green-500/20 blur-[40px] rounded-full scale-150" />

      {/* 2. O Anel de Energia (Giratório) */}
      <div className="relative size-32 rounded-full p-[3px] overflow-hidden">
        {/* O Gradiente que gira */}
        <div className="absolute inset-[-100%] animate-[spin_4s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#F9FAFB_0%,#22C55E_50%,#F9FAFB_100%)] opacity-100" />
        
        {/* 3. O Núcleo (Core) - Fundo Escuro para contraste no Light Mode */}
        <div className="relative h-full w-full rounded-full bg-slate-900 flex items-center justify-center shadow-inner">
          {/* 4. O Coração (Pulso) */}
          <div className="absolute size-24 bg-green-500/10 rounded-full animate-pulse" />
          
          {/* Ícone Central */}
          <Sparkles className="size-10 text-white drop-shadow-[0_0_10px_rgba(34,197,94,0.8)]" />
        </div>
      </div>
    </div>
  );
}




