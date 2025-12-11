"use client";

import { Button } from "@/components/ui/button";

interface EmptyWeekStateProps {
  onAction?: () => void;
}

export function EmptyWeekState({ onAction }: EmptyWeekStateProps) {
  return (
    <div className="w-full min-h-[500px] relative border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50 overflow-hidden">
      {/* Ghost Grid - 5 Columns com Skeletons */}
      <div className="grid grid-cols-1 md:grid-cols-5 h-full">
        {/* Coluna 1 */}
        <div className="border-r border-slate-200/60 relative p-3">
          <div className="space-y-2 animate-pulse">
            <div className="h-4 bg-slate-200/60 rounded w-3/4" />
            <div className="h-3 bg-slate-200/60 rounded w-1/2" />
            <div className="h-8 bg-slate-200/60 rounded mt-4" />
            <div className="h-8 bg-slate-200/60 rounded" />
          </div>
        </div>
        
        {/* Coluna 2 */}
        <div className="border-r border-slate-200/60 relative p-3">
          <div className="space-y-2 animate-pulse">
            <div className="h-4 bg-slate-200/60 rounded w-3/4" />
            <div className="h-3 bg-slate-200/60 rounded w-1/2" />
            <div className="h-8 bg-slate-200/60 rounded mt-4" />
          </div>
        </div>
        
        {/* Coluna 3 */}
        <div className="border-r border-slate-200/60 relative p-3">
          <div className="space-y-2 animate-pulse">
            <div className="h-4 bg-slate-200/60 rounded w-3/4" />
            <div className="h-3 bg-slate-200/60 rounded w-1/2" />
            <div className="h-8 bg-slate-200/60 rounded mt-4" />
            <div className="h-8 bg-slate-200/60 rounded" />
            <div className="h-8 bg-slate-200/60 rounded" />
          </div>
        </div>
        
        {/* Coluna 4 */}
        <div className="border-r border-slate-200/60 relative p-3">
          <div className="space-y-2 animate-pulse">
            <div className="h-4 bg-slate-200/60 rounded w-3/4" />
            <div className="h-3 bg-slate-200/60 rounded w-1/2" />
            <div className="h-8 bg-slate-200/60 rounded mt-4" />
          </div>
        </div>
        
        {/* Coluna 5 */}
        <div className="relative p-3">
          <div className="space-y-2 animate-pulse">
            <div className="h-4 bg-slate-200/60 rounded w-3/4" />
            <div className="h-3 bg-slate-200/60 rounded w-1/2" />
            <div className="h-8 bg-slate-200/60 rounded mt-4" />
            <div className="h-8 bg-slate-200/60 rounded" />
          </div>
        </div>
      </div>

      {/* Central Content - Floating */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="flex flex-col items-center gap-6 text-center px-6">
          {/* Illustration */}
          <img 
            src="/empty-state-coffee-weekly.svg" 
            alt="Café e planejamento"
            className="h-48 w-auto object-contain"
          />

          {/* Typography */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-slate-800">
              Tudo limpo por aqui
            </h3>
            <p className="text-slate-500 text-sm mt-2 max-w-md text-center">
              Aproveite o momento para tomar um café e planejar os próximos passos.
            </p>
          </div>

          {/* CTA Button */}
          {onAction && (
            <Button
              variant="outline"
              size="sm"
              onClick={onAction}
              className="text-green-600 border-green-600 hover:bg-green-50 hover:text-green-700"
            >
              Começar agora
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

