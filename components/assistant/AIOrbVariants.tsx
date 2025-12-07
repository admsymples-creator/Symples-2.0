import Image from "next/image";
import { cn } from "@/lib/utils";

interface AIOrbProps {
  isLoading?: boolean;
  compact?: boolean;
  variant?: "default" | "particles" | "waves" | "rays" | "glow";
}

// Variante 1: Siri Classic - Ondas concêntricas suaves (estilo Siri padrão)
export function AIOrbDefault({ isLoading = false, compact = false }: AIOrbProps) {
  const size = compact ? "size-16" : "size-32";
  const iconSize = compact ? "w-5 h-5" : "w-10 h-10";
  const pulseSize = compact ? "size-12" : "size-24";
  const mbClass = compact ? "" : "mb-8";

  return (
    <div className={cn("relative flex items-center justify-center", mbClass)}>
      {/* Glow suave ao redor */}
      <div className={isLoading ? "absolute inset-0 bg-green-500/20 blur-[50px] rounded-full scale-[1.8] animate-[siri-glow_2s_ease-in-out_infinite]" : "absolute inset-0 bg-green-500/15 blur-[50px] rounded-full scale-[1.8]"} />
      
      {/* Ondas concêntricas suaves estilo Siri */}
      {[...Array(4)].map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full border border-green-500/30"
          style={{
            width: `${compact ? 64 + i * 20 : 128 + i * 40}px`,
            height: `${compact ? 64 + i * 20 : 128 + i * 40}px`,
            animation: `siri-wave ${2.5 + i * 0.3}s cubic-bezier(0.4, 0, 0.2, 1) infinite`,
            animationDelay: `${i * 0.4}s`,
            opacity: 0.6 - i * 0.15,
          }}
        />
      ))}

      <div className={cn("relative rounded-full overflow-visible", size)}>
        <div className="relative h-full w-full rounded-full bg-slate-900 flex items-center justify-center shadow-inner">
          {/* Pulso interno suave */}
          <div className={cn(
            "absolute rounded-full",
            pulseSize,
            isLoading 
              ? "bg-green-500/25 animate-[siri-pulse_1s_ease-in-out_infinite]" 
              : "bg-green-500/15 animate-[siri-pulse_2s_ease-in-out_infinite]"
          )} />
          
          <div className={cn("relative z-10", iconSize)}>
            <Image
              src="/white-icon-symples.svg"
              alt="Symples"
              width={compact ? 20 : 40}
              height={compact ? 20 : 40}
              className="drop-shadow-[0_0_8px_rgba(34,197,94,0.6)]"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// Variante 2: Siri Pulse - Pulso suave com múltiplas camadas
export function AIOrbParticles({ isLoading = false, compact = false }: AIOrbProps) {
  const size = compact ? "size-16" : "size-32";
  const iconSize = compact ? "w-5 h-5" : "w-10 h-10";
  const pulseSize = compact ? "size-12" : "size-24";
  const mbClass = compact ? "" : "mb-8";

  return (
    <div className={cn("relative flex items-center justify-center", mbClass)}>
      {/* Glow suave */}
      <div className={isLoading ? "absolute inset-0 bg-green-500/20 blur-[50px] rounded-full scale-[1.8] animate-[siri-glow_1.5s_ease-in-out_infinite]" : "absolute inset-0 bg-green-500/15 blur-[50px] rounded-full scale-[1.8]"} />
      
      {/* Múltiplas camadas de pulso */}
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-green-500/20"
          style={{
            width: `${compact ? 64 + i * 12 : 128 + i * 24}px`,
            height: `${compact ? 64 + i * 12 : 128 + i * 24}px`,
            animation: `siri-pulse-soft ${2 + i * 0.2}s ease-in-out infinite`,
            animationDelay: `${i * 0.3}s`,
            opacity: 0.4 - i * 0.08,
            filter: `blur(${4 + i * 2}px)`,
          }}
        />
      ))}

      <div className={cn("relative rounded-full overflow-visible", size)}>
        <div className="relative h-full w-full rounded-full bg-slate-900 flex items-center justify-center shadow-inner">
          <div className={cn(
            "absolute rounded-full",
            pulseSize,
            isLoading 
              ? "bg-green-500/25 animate-[siri-pulse_1s_ease-in-out_infinite]" 
              : "bg-green-500/15 animate-[siri-pulse_2s_ease-in-out_infinite]"
          )} />
          
          <div className={cn("relative z-10", iconSize)}>
            <Image
              src="/white-icon-symples.svg"
              alt="Symples"
              width={compact ? 20 : 40}
              height={compact ? 20 : 40}
              className="drop-shadow-[0_0_8px_rgba(34,197,94,0.6)]"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// Variante 3: Siri Ripple - Ondulações suaves e elegantes
export function AIOrbWaves({ isLoading = false, compact = false }: AIOrbProps) {
  const size = compact ? "size-16" : "size-32";
  const iconSize = compact ? "w-5 h-5" : "w-10 h-10";
  const pulseSize = compact ? "size-12" : "size-24";
  const mbClass = compact ? "" : "mb-8";

  return (
    <div className={cn("relative flex items-center justify-center", mbClass)}>
      {/* Glow suave */}
      <div className={isLoading ? "absolute inset-0 bg-green-500/20 blur-[50px] rounded-full scale-[1.8] animate-[siri-glow_2s_ease-in-out_infinite]" : "absolute inset-0 bg-green-500/15 blur-[50px] rounded-full scale-[1.8]"} />
      
      {/* Ondulações suaves estilo Siri */}
      {[...Array(3)].map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full border-2 border-green-500/25"
          style={{
            width: `${compact ? 64 : 128}px`,
            height: `${compact ? 64 : 128}px`,
            animation: `siri-ripple ${2.5 + i * 0.5}s cubic-bezier(0.4, 0, 0.2, 1) infinite`,
            animationDelay: `${i * 0.6}s`,
            transform: `scale(${1 + i * 0.3})`,
            opacity: 0.7 - i * 0.25,
          }}
        />
      ))}

      <div className={cn("relative rounded-full overflow-visible", size)}>
        <div className="relative h-full w-full rounded-full bg-slate-900 flex items-center justify-center shadow-inner">
          <div className={cn(
            "absolute rounded-full",
            pulseSize,
            isLoading 
              ? "bg-green-500/25 animate-[siri-pulse_1s_ease-in-out_infinite]" 
              : "bg-green-500/15 animate-[siri-pulse_2s_ease-in-out_infinite]"
          )} />
          
          <div className={cn("relative z-10", iconSize)}>
            <Image
              src="/white-icon-symples.svg"
              alt="Symples"
              width={compact ? 20 : 40}
              height={compact ? 20 : 40}
              className="drop-shadow-[0_0_8px_rgba(34,197,94,0.6)]"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// Variante 4: Siri Gradient - Gradiente rotativo suave
export function AIOrbRays({ isLoading = false, compact = false }: AIOrbProps) {
  const size = compact ? "size-16" : "size-32";
  const iconSize = compact ? "w-5 h-5" : "w-10 h-10";
  const pulseSize = compact ? "size-12" : "size-24";
  const mbClass = compact ? "" : "mb-8";

  return (
    <div className={cn("relative flex items-center justify-center", mbClass)}>
      {/* Glow suave */}
      <div className={isLoading ? "absolute inset-0 bg-green-500/20 blur-[50px] rounded-full scale-[1.8] animate-[siri-glow_2s_ease-in-out_infinite]" : "absolute inset-0 bg-green-500/15 blur-[50px] rounded-full scale-[1.8]"} />
      
      {/* Anel com gradiente rotativo suave */}
      <div className={cn("relative rounded-full p-[2px] overflow-hidden", size)}>
        <div className={isLoading 
          ? "absolute inset-[-100%] animate-[spin_3s_linear_infinite] bg-[conic-gradient(from_0deg_at_50%_50%,rgba(34,197,94,0.1)_0%,rgba(34,197,94,0.4)_25%,rgba(34,197,94,0.1)_50%,rgba(34,197,94,0.4)_75%,rgba(34,197,94,0.1)_100%)] opacity-100" 
          : "absolute inset-[-100%] animate-[spin_5s_linear_infinite] bg-[conic-gradient(from_0deg_at_50%_50%,rgba(34,197,94,0.1)_0%,rgba(34,197,94,0.3)_25%,rgba(34,197,94,0.1)_50%,rgba(34,197,94,0.3)_75%,rgba(34,197,94,0.1)_100%)] opacity-100"
        } />
        
        <div className="relative h-full w-full rounded-full bg-slate-900 flex items-center justify-center shadow-inner">
          <div className={cn(
            "absolute rounded-full",
            pulseSize,
            isLoading 
              ? "bg-green-500/25 animate-[siri-pulse_1s_ease-in-out_infinite]" 
              : "bg-green-500/15 animate-[siri-pulse_2s_ease-in-out_infinite]"
          )} />
          
          <div className={cn("relative z-10", iconSize)}>
            <Image
              src="/white-icon-symples.svg"
              alt="Symples"
              width={compact ? 20 : 40}
              height={compact ? 20 : 40}
              className="drop-shadow-[0_0_8px_rgba(34,197,94,0.6)]"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// Variante 5: Siri Glow - Brilho suave e elegante
export function AIOrbGlow({ isLoading = false, compact = false }: AIOrbProps) {
  const size = compact ? "size-16" : "size-32";
  const iconSize = compact ? "w-5 h-5" : "w-10 h-10";
  const pulseSize = compact ? "size-12" : "size-24";
  const mbClass = compact ? "" : "mb-8";

  return (
    <div className={cn("relative flex items-center justify-center", mbClass)}>
      {/* Múltiplas camadas de glow suave */}
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-green-500/15"
          style={{
            width: `${compact ? 64 + i * 10 : 128 + i * 20}px`,
            height: `${compact ? 64 + i * 10 : 128 + i * 20}px`,
            animation: `siri-glow-soft ${2.5 + i * 0.2}s ease-in-out infinite`,
            animationDelay: `${i * 0.25}s`,
            opacity: 0.3 - i * 0.05,
            filter: `blur(${6 + i * 3}px)`,
          }}
        />
      ))}

      <div className={cn("relative rounded-full overflow-visible", size)}>
        <div className="relative h-full w-full rounded-full bg-slate-900 flex items-center justify-center shadow-inner ring-1 ring-green-500/20">
          <div className={cn(
            "absolute rounded-full",
            pulseSize,
            isLoading 
              ? "bg-green-500/25 animate-[siri-pulse_1s_ease-in-out_infinite]" 
              : "bg-green-500/15 animate-[siri-pulse_2s_ease-in-out_infinite]"
          )} />
          
          <div className={cn("relative z-10", iconSize)}>
            <Image
              src="/white-icon-symples.svg"
              alt="Symples"
              width={compact ? 20 : 40}
              height={compact ? 20 : 40}
              className="drop-shadow-[0_0_8px_rgba(34,197,94,0.6)]"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// Componente principal que seleciona a variante
export function AIOrb({ isLoading = false, compact = false, variant = "default" }: AIOrbProps) {
  switch (variant) {
    case "particles":
      return <AIOrbParticles isLoading={isLoading} compact={compact} />;
    case "waves":
      return <AIOrbWaves isLoading={isLoading} compact={compact} />;
    case "rays":
      return <AIOrbRays isLoading={isLoading} compact={compact} />;
    case "glow":
      return <AIOrbGlow isLoading={isLoading} compact={compact} />;
    default:
      return <AIOrbDefault isLoading={isLoading} compact={compact} />;
  }
}
