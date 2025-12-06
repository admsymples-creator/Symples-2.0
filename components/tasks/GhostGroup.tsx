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
                // Layout & Dimensões (Estilo Barra Horizontal)
                "group relative w-full flex items-center justify-center gap-2.5",
                "py-3 px-4 mt-4", // Margem superior para separar do último grupo
                
                // Bordas & Fundo (Sutil até o hover)
                "border-2 border-dashed border-gray-200 rounded-lg", // rounded-lg conforme Design Tokens 
                "bg-transparent hover:bg-gray-50/50",
                
                // Interação & Transições
                "cursor-pointer transition-all duration-200 ease-in-out",
                "hover:border-green-400 hover:shadow-sm",
                "active:scale-[0.99]", // Feedback tátil sutil
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-1",
                
                className
            )}
            aria-label={`Criar ${label}`}
        >
            {/* Ícone */}
            <div className={cn(
                "flex items-center justify-center w-6 h-6 rounded-md",
                "bg-gray-100 text-gray-400",
                "transition-colors group-hover:bg-green-100 group-hover:text-green-600"
            )}>
                <Plus className="w-4 h-4" strokeWidth={2.5} />
            </div>

            {/* Texto */}
            <span className={cn(
                "text-sm font-medium text-gray-500",
                "transition-colors group-hover:text-green-700"
            )}>
                {label}
            </span>
        </button>
    );
}