"use client";

import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDroppable } from "@dnd-kit/core";

interface KanbanEmptyCardProps {
    columnTitle?: string;
    columnId?: string;
    onClick?: () => void;
}

export function KanbanEmptyCard({ columnTitle, columnId, onClick }: KanbanEmptyCardProps) {
    const { isOver, setNodeRef } = useDroppable({
        id: `empty-${columnId || "default"}`,
    });

    return (
        <div
            ref={setNodeRef}
            className={cn(
                "w-full h-24 rounded-xl border-2 border-dashed bg-gray-50/50",
                "flex flex-col items-center justify-center gap-2",
                "cursor-pointer transition-all group",
                isOver
                    ? "border-green-400 border-solid bg-green-50/50"
                    : "border-gray-200 hover:border-green-400 hover:bg-green-50/30"
            )}
            onClick={onClick}
        >
            <Plus
                className={cn(
                    "size-6 transition-colors",
                    isOver
                        ? "text-green-500"
                        : "text-gray-300 group-hover:text-green-500"
                )}
            />
            <span
                className={cn(
                    "text-xs font-medium transition-opacity",
                    isOver
                        ? "text-green-600 opacity-100"
                        : "text-gray-400 group-hover:text-green-600 opacity-0 group-hover:opacity-100"
                )}
            >
                {columnTitle ? `Adicionar em ${columnTitle}` : "Adicionar tarefa"}
            </span>
        </div>
    );
}

