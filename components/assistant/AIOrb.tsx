import Image from "next/image";
import { cn } from "@/lib/utils";

interface AIOrbProps {
  isLoading?: boolean;
  compact?: boolean; // Para versão compacta no FAB
}

export function AIOrb({ isLoading = false, compact = false }: AIOrbProps) {
  const size = compact ? "size-16" : "size-32";
  const iconSize = compact ? "w-5 h-5" : "w-10 h-10";
  const pulseSize = compact ? "size-12" : "size-24";
  const mbClass = compact ? "" : "mb-8";

  return (
    <div className={cn("relative flex items-center justify-center", mbClass)}>
      {/* 1. O Brilho Externo (Atmosphere) - Mais contido */}
      <div className={isLoading ? "absolute inset-0 bg-green-500/30 blur-[40px] rounded-full scale-150 animate-pulse" : "absolute inset-0 bg-green-500/20 blur-[40px] rounded-full scale-150"} />

      {/* 2. O Anel de Energia (Giratório) */}
      <div className={cn("relative rounded-full p-[6px] overflow-hidden", size)}>
        {/* O Gradiente que gira */}
        <div className={isLoading ? "absolute inset-[-100%] animate-[spin_2s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#F9FAFB_0%,#22C55E_50%,#F9FAFB_100%)] opacity-100" : "absolute inset-[-100%] animate-[spin_4s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#F9FAFB_0%,#22C55E_50%,#F9FAFB_100%)] opacity-100"} />
        
        {/* 3. O Núcleo (Core) - Fundo Escuro para contraste no Light Mode */}
        <div className="relative h-full w-full rounded-full bg-slate-900 flex items-center justify-center shadow-inner">
          {/* 4. O Coração (Pulso) */}
          <div className={cn("absolute rounded-full animate-pulse", pulseSize, isLoading ? "bg-green-500/20" : "bg-green-500/10")} />
          
          {/* Ícone Central - Logo Symples */}
          <div className={cn(
            "relative z-10",
            iconSize,
            isLoading && "animate-pulse"
          )}>
            <Image
              src="/white-icon-symples.svg"
              alt="Symples"
              width={compact ? 20 : 40}
              height={compact ? 20 : 40}
              className={cn(
                "drop-shadow-[0_0_15px_rgba(34,197,94,1)] drop-shadow-[0_0_25px_rgba(34,197,94,0.6)]",
                isLoading && "drop-shadow-[0_0_20px_rgba(34,197,94,1)] drop-shadow-[0_0_30px_rgba(34,197,94,0.8)]"
              )}
            />
          </div>
        </div>
      </div>
    </div>
  );
}















