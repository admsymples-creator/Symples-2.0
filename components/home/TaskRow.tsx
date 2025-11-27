"use client";

import { useState } from "react";
import { Edit2, Trash2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

interface TaskRowProps {
    id: string;
    title: string;
    status: "todo" | "in_progress" | "done";
    isQuickAdd?: boolean;
    workspaceColor?: string;
    onToggle?: (id: string, checked: boolean) => void;
    onEdit?: (id: string) => void;
    onDelete?: (id: string) => void;
}

export function TaskRow({
    id,
    title,
    status,
    isQuickAdd = false,
    workspaceColor = "#22C55E",
    onToggle,
    onEdit,
    onDelete,
}: TaskRowProps) {
    const [isChecked, setIsChecked] = useState(status === "done");

    const handleToggle = (checked: boolean) => {
        setIsChecked(checked);
        if (onToggle) {
            onToggle(id, checked);
        }
    };

    return (
        <div
            className={cn(
                "relative w-full flex items-center justify-between py-2 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors group"
            )}
        >
            {/* Workspace Bar Vertical - Apenas para tarefas de Workspace */}
            {!isQuickAdd && (
                <div
                    className="absolute left-0 top-0 bottom-0 w-1 rounded-r"
                    style={{ backgroundColor: workspaceColor }}
                />
            )}

            {/* Conteúdo Esquerda */}
            <div className={cn(
                "flex items-center flex-1 min-w-0",
                !isQuickAdd ? "pl-4" : "pl-2"
            )}>
                <Checkbox
                    checked={isChecked}
                    onCheckedChange={handleToggle}
                    className="flex-shrink-0"
                />
                <p
                    className={cn(
                        "text-sm truncate ml-3 flex-1",
                        isChecked 
                            ? "line-through text-gray-500" 
                            : "text-gray-700"
                    )}
                >
                    {title}
                </p>
            </div>

            {/* Ações Direita - Apenas no hover */}
            <div className="flex items-center gap-1 pr-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                    onClick={() => onEdit?.(id)}
                    className="p-1.5 rounded hover:bg-gray-200 transition-colors"
                    aria-label="Editar tarefa"
                >
                    <Edit2 className="w-3.5 h-3.5 text-gray-500" />
                </button>
                <button
                    onClick={() => onDelete?.(id)}
                    className="p-1.5 rounded hover:bg-red-50 hover:text-red-600 transition-colors"
                    aria-label="Excluir tarefa"
                >
                    <Trash2 className="w-3.5 h-3.5 text-gray-500" />
                </button>
            </div>
        </div>
    );
}

