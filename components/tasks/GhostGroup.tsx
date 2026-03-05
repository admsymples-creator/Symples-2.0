"use client";

import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface GhostGroupProps {
    onClick?: () => void;
    className?: string;
    label?: string;
}

export function GhostGroup({ 
    onClick, 
    className,
    label = "Novo Grupo" 
}: GhostGroupProps) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                // Layout & Dimensões
                "group relative w-full flex items-center justify-center gap-3",
                "h-24 mt-6 mb-2",
                
                // Bordas & Forma
                "border-2 border-dashed border-gray-200",
                "rounded-xl",
                
                // Cores & Fundo
                "bg-gray-50/30 hover:bg-green-50/40",
                
                // Interação
                "cursor-pointer transition-all duration-200 ease-in-out",
                "hover:border-green-400 hover:shadow-sm",
                "active:scale-[0.99]", 
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2",
                
                className
            )}
            aria-label={`Criar ${label}`}
        >
            {/* Ícone com Container de Fundo */}
            <div className={cn(
                "flex items-center justify-center w-8 h-8 rounded-lg",
                "bg-gray-100 text-gray-400",
                "transition-colors group-hover:bg-green-100 group-hover:text-green-600 shadow-sm"
            )}>
                <Plus className="w-5 h-5" strokeWidth={2.5} />
            </div>

            {/* Texto com destaque */}
            <span className={cn(
                "text-sm font-semibold text-gray-500 uppercase tracking-wide",
                "transition-colors group-hover:text-green-700"
            )}>
                {label}
            </span>
        </button>
    );
}