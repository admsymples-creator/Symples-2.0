"use client";

import { Button } from "@/components/ui/button";

interface EmptyWeekStateProps {
  onAction?: () => void;
}

export function EmptyWeekState({ onAction }: EmptyWeekStateProps) {
  return (
    <div className="col-span-full">
      {/* Ghost Grid Container */}
      <div className="relative border-2 border-dashed border-slate-100 rounded-xl bg-slate-50/30 h-[500px] overflow-hidden">
        {/* Vertical Dividers (4 lines for 5 columns) */}
        <div className="absolute inset-0 flex">
          <div className="w-full border-r border-slate-100" />
          <div className="w-full border-r border-slate-100" />
          <div className="w-full border-r border-slate-100" />
          <div className="w-full border-r border-slate-100" />
          <div className="w-full" />
        </div>

        {/* Central Content */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4 text-center px-6">
            {/* Icon */}
            <div className="flex items-center justify-center">
              <img 
                src="/empty-state-coffee-weekly.svg" 
                alt="Café e planejamento"
                className="w-[200px] h-auto object-contain"
              />
            </div>

            {/* Typography */}
            <div className="space-y-2">
              <h3 className="text-base font-medium text-slate-900">
                Por enquanto, nada por aqui...
              </h3>
              <p className="text-sm text-slate-500 max-w-sm">
                Aproveite o momento para tomar um café e planejar os próximos passos.
              </p>
            </div>

            {/* CTA Button */}
            {onAction && (
              <Button
                variant="ghost"
                onClick={onAction}
                className="text-xs text-slate-600 hover:text-green-700 hover:bg-green-50"
              >
                Adicionar tarefa rápida
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

