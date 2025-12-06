"use client";

import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface TaskGroupEmptyProps {
    groupTitle?: string;
    onCreateClick?: () => void;
    variant?: "default" | "inbox";
    children?: ReactNode;
}

export function TaskGroupEmpty({ 
    groupTitle, 
    onCreateClick, 
    variant = "default",
    children 
}: TaskGroupEmptyProps) {
    // Variante Inbox: ultra compacta, mostra children (QuickTaskAdd) diretamente
    if (variant === "inbox") {
        return (
            <div className="py-1 px-2">
                {children}
            </div>
        );
    }

    // Variante default: estilo tradicional
    return (
        <div
            className={cn(
                "h-10 border-b border-gray-100",
                "flex items-center justify-center gap-2",
                "bg-transparent"
            )}
        >
            <span className="text-xs text-gray-400">Nenhuma tarefa neste grupo.</span>
            {onCreateClick && (
                <button
                    onClick={onCreateClick}
                    className="text-xs text-green-600 hover:underline cursor-pointer font-medium transition-colors"
                >
                    Criar nova
                </button>
            )}
        </div>
    );
}


