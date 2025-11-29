"use client";

import { cn } from "@/lib/utils";

interface TaskGroupEmptyProps {
    groupTitle?: string;
    onCreateClick?: () => void;
}

export function TaskGroupEmpty({ groupTitle, onCreateClick }: TaskGroupEmptyProps) {
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

