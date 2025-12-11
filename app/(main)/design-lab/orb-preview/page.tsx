"use client";

import { useState, useEffect } from "react";
import { AIOrb } from "@/components/assistant/AIOrbVariants";

// Estilos para animações customizadas
if (typeof document !== "undefined") {
  const style = document.createElement("style");
  style.textContent = `
    @keyframes float-0 {
      0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.6; }
      50% { transform: translate(10px, -10px) scale(1.2); opacity: 1; }
    }
    @keyframes float-1 {
      0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.6; }
      50% { transform: translate(-10px, 10px) scale(1.2); opacity: 1; }
    }
    @keyframes float-2 {
      0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.6; }
      50% { transform: translate(10px, 10px) scale(1.2); opacity: 1; }
    }
    @keyframes float-3 {
      0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.6; }
      50% { transform: translate(-10px, -10px) scale(1.2); opacity: 1; }
    }
    @keyframes float-4 {
      0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.6; }
      50% { transform: translate(15px, -5px) scale(1.2); opacity: 1; }
    }
    @keyframes float-5 {
      0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.6; }
      50% { transform: translate(-15px, 5px) scale(1.2); opacity: 1; }
    }
    @keyframes float-6 {
      0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.6; }
      50% { transform: translate(5px, 15px) scale(1.2); opacity: 1; }
    }
    @keyframes float-7 {
      0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.6; }
      50% { transform: translate(-5px, -15px) scale(1.2); opacity: 1; }
    }
    @keyframes ray-0 {
      0%, 100% { opacity: 0.3; transform: scaleY(1); }
      50% { opacity: 1; transform: scaleY(1.5); }
    }
    @keyframes glow-pulse {
      0%, 100% { opacity: 0.2; transform: scale(1); }
      50% { opacity: 0.4; transform: scale(1.1); }
    }
  `;
  if (!document.head.querySelector('style[data-orb-animations]')) {
    style.setAttribute('data-orb-animations', 'true');
    document.head.appendChild(style);
  }
}

const variants = [
  { id: "default", name: "Siri Classic", description: "Ondas concêntricas suaves estilo Siri" },
  { id: "particles", name: "Siri Pulse", description: "Pulso suave com múltiplas camadas" },
  { id: "waves", name: "Siri Ripple", description: "Ondulações suaves e elegantes" },
  { id: "rays", name: "Siri Gradient", description: "Gradiente rotativo suave" },
  { id: "glow", name: "Siri Glow", description: "Brilho suave e elegante" },
];

export default function OrbPreviewPage() {
  const [selectedVariant, setSelectedVariant] = useState("default");
  const [isLoading, setIsLoading] = useState(false);
  const [compact, setCompact] = useState(false);

  // Adicionar estilos CSS para animações customizadas estilo Siri
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      @keyframes siri-wave {
        0% {
          transform: scale(0.8);
          opacity: 0.6;
        }
        50% {
          opacity: 0.3;
        }
        100% {
          transform: scale(1.4);
          opacity: 0;
        }
      }
      
      @keyframes siri-pulse {
        0%, 100% {
          transform: scale(1);
          opacity: 0.15;
        }
        50% {
          transform: scale(1.1);
          opacity: 0.25;
        }
      }
      
      @keyframes siri-pulse-soft {
        0%, 100% {
          transform: scale(1);
          opacity: 0.2;
        }
        50% {
          transform: scale(1.15);
          opacity: 0.4;
        }
      }
      
      @keyframes siri-ripple {
        0% {
          transform: scale(1);
          opacity: 0.7;
        }
        100% {
          transform: scale(1.5);
          opacity: 0;
        }
      }
      
      @keyframes siri-glow {
        0%, 100% {
          opacity: 0.15;
          transform: scale(1);
        }
        50% {
          opacity: 0.25;
          transform: scale(1.05);
        }
      }
      
      @keyframes siri-glow-soft {
        0%, 100% {
          opacity: 0.2;
          transform: scale(1);
        }
        50% {
          opacity: 0.35;
          transform: scale(1.08);
        }
      }
    `;
    style.setAttribute('data-orb-animations', 'true');
    document.head.appendChild(style);

    return () => {
      const existingStyle = document.head.querySelector('style[data-orb-animations]');
      if (existingStyle) {
        existingStyle.remove();
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">AI Orb - Visualização de Variantes</h1>
          <p className="text-slate-600">Explore diferentes efeitos visuais para o orb do assistente</p>
        </div>

        {/* Controles */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Seletor de Variante */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Variante
              </label>
              <select
                value={selectedVariant}
                onChange={(e) => setSelectedVariant(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                {variants.map((variant) => (
                  <option key={variant.id} value={variant.id}>
                    {variant.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Toggle Loading */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Estado
              </label>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isLoading}
                    onChange={(e) => setIsLoading(e.target.checked)}
                    className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                  />
                  <span className="text-sm text-slate-700">Loading</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={compact}
                    onChange={(e) => setCompact(e.target.checked)}
                    className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                  />
                  <span className="text-sm text-slate-700">Compacto</span>
                </label>
              </div>
            </div>

            {/* Info */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Descrição
              </label>
              <p className="text-sm text-slate-600">
                {variants.find((v) => v.id === selectedVariant)?.description}
              </p>
            </div>
          </div>
        </div>

        {/* Preview Area */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Preview Principal */}
          <div className="bg-white rounded-lg shadow-sm p-8 col-span-full">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">Preview Principal</h2>
            <div className="flex items-center justify-center min-h-[400px] bg-gradient-to-br from-slate-900 to-slate-800 rounded-lg">
              <AIOrb variant={selectedVariant as any} isLoading={isLoading} compact={compact} />
            </div>
          </div>

          {/* Todas as Variantes */}
          {variants.map((variant) => (
            <div
              key={variant.id}
              className={`
                bg-white rounded-lg shadow-sm p-6 cursor-pointer transition-all
                ${selectedVariant === variant.id ? "ring-2 ring-green-500" : "hover:shadow-md"}
              `}
              onClick={() => setSelectedVariant(variant.id)}
            >
              <h3 className="text-lg font-semibold text-slate-900 mb-2">{variant.name}</h3>
              <p className="text-sm text-slate-600 mb-4">{variant.description}</p>
              <div className="flex items-center justify-center min-h-[200px] bg-gradient-to-br from-slate-900 to-slate-800 rounded-lg">
                <AIOrb variant={variant.id as any} isLoading={false} compact={true} />
              </div>
            </div>
          ))}
        </div>

        {/* Comparação lado a lado */}
        <div className="mt-8 bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">Comparação - Todas as Variantes</h2>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            {variants.map((variant) => (
              <div key={variant.id} className="text-center">
                <div className="flex items-center justify-center min-h-[150px] bg-gradient-to-br from-slate-900 to-slate-800 rounded-lg mb-3">
                  <AIOrb variant={variant.id as any} isLoading={false} compact={true} />
                </div>
                <p className="text-sm font-medium text-slate-700">{variant.name}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
