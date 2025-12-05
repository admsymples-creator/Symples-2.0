"use client";

import React, { useMemo, memo } from "react";
import { TaskRowMinify } from "./TaskRowMinify";
import { TaskSectionHeader } from "./TaskSectionHeader";
import { cn } from "@/lib/utils";
import {
    SortableContext,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";

type MinimalTask = {
    id: string | number;
    title: string;
    status?: string;
    dueDate?: string;
    completed?: boolean;
    priority?: "low" | "medium" | "high" | "urgent";
    assignees?: Array<{ name: string; avatar?: string; id?: string }>;
    commentCount?: number;
    commentsCount?: number;
};

interface TaskGroupProps {
    id: string;
    title: string;
    tasks: MinimalTask[];
    groupColor?: string;
    workspaceId?: string | null;
    onTaskClick?: (taskId: string | number) => void;
    isDragDisabled?: boolean;
    onTaskUpdated?: () => void;
    onTaskDeleted?: () => void;
    onTaskUpdatedOptimistic?: (taskId: string | number, updates: Partial<{ dueDate?: string; status?: string; priority?: string; assignees?: Array<{ name: string; avatar?: string; id?: string }> }>) => void;
    onTaskDeletedOptimistic?: (taskId: string) => void;
    onTaskDuplicatedOptimistic?: (duplicatedTask: any) => void;
    members?: Array<{ id: string; name: string; avatar?: string }>;
}

function TaskGroupComponent({ id, title, tasks, groupColor, workspaceId, onTaskClick, isDragDisabled = false, onTaskUpdated, onTaskDeleted, onTaskUpdatedOptimistic, onTaskDeletedOptimistic, onTaskDuplicatedOptimistic, members }: TaskGroupProps) {
    // Log para debug
    console.log("🟡 [TaskGroup] Renderizado - id:", id, "tasks.length:", tasks.length);
    console.log("🟡 [TaskGroup] Renderizado - onTaskDeletedOptimistic existe?", !!onTaskDeletedOptimistic);
    console.log("🟡 [TaskGroup] Renderizado - onTaskDuplicatedOptimistic existe?", !!onTaskDuplicatedOptimistic);
    console.log("🟡 [TaskGroup] Renderizado - onTaskDeletedOptimistic:", onTaskDeletedOptimistic);
    console.log("🟡 [TaskGroup] Renderizado - onTaskDuplicatedOptimistic:", onTaskDuplicatedOptimistic);
    // Normalizar IDs para string (dnd-kit requer strings)
    const taskIds = useMemo(() => tasks.map((t) => String(t.id)), [tasks]);

    // Tornar o grupo um droppable (container que recebe tarefas)
    const { setNodeRef, isOver } = useDroppable({
        id: id,
    });

    // Converter groupColor (nome ou hex) para cor válida para o indicador
    const colorForIndicator = useMemo(() => {
        if (!groupColor) return undefined;
        
        // Se já for hex, retornar direto
        if (groupColor.startsWith('#')) {
            return groupColor;
        }
        
        // Mapear nomes de cores para valores hex
        const colorMap: Record<string, string> = {
            "red": "#ef4444",
            "blue": "#3b82f6",
            "green": "#22c55e",
            "yellow": "#eab308",
            "purple": "#a855f7",
            "pink": "#ec4899",
            "orange": "#f97316",
            "slate": "#64748b",
            "cyan": "#06b6d4",
            "indigo": "#6366f1",
        };
        
        return colorMap[groupColor] || undefined;
    }, [groupColor]);

    return (
        <div className="flex-1 min-w-[320px] max-w-full">
            {/* Header do Grupo */}
            <div className="mt-4 mb-2 px-1">
                <TaskSectionHeader
                    title={title}
                    count={tasks.length}
                    color={colorForIndicator}
                />
            </div>

            {/* Container Droppable com Lista de Tarefas */}
            <div
                ref={setNodeRef}
                className={cn(
                    "bg-gray-50 border-2 border-dashed border-gray-200 rounded-lg p-2 min-h-[200px] transition-colors",
                    isOver && "bg-blue-50 border-blue-300 border-solid"
                )}
            >
                {tasks.length === 0 ? (
                    <div className="flex items-center justify-center h-32 text-sm text-gray-400">
                        Arraste tarefas aqui
                    </div>
                ) : (
                    <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
                        <div className="space-y-1">
                            {tasks.map((task) => (
                                <TaskRowMinify
                                    key={task.id}
                                    task={{...task, workspace_id: workspaceId || null}}
                                    containerId={id}
                                    groupColor={groupColor}
                                    onClick={onTaskClick}
                                    disabled={isDragDisabled}
                                    onTaskUpdated={onTaskUpdated}
                                    onTaskDeleted={onTaskDeleted}
                                    onTaskUpdatedOptimistic={onTaskUpdatedOptimistic}
                                    onTaskDeletedOptimistic={onTaskDeletedOptimistic}
                                    onTaskDuplicatedOptimistic={onTaskDuplicatedOptimistic}
                                    members={members}
                                />
                            ))}
                        </div>
                    </SortableContext>
                )}
            </div>
        </div>
    );
}

// Memo para estabilidade do DnD
export const TaskGroup = memo(TaskGroupComponent, (prev, next) => {
    // ✅ Se a referência das tasks mudou, sempre re-renderizar
    if (prev.tasks !== next.tasks) {
        return false; // Re-renderizar
    }

    // Comparar título e ID do grupo
    if (prev.id !== next.id || prev.title !== next.title) {
        return false;
    }

    // Comparar callbacks
    if (prev.onTaskClick !== next.onTaskClick || 
        prev.onTaskUpdated !== next.onTaskUpdated ||
        prev.onTaskDeleted !== next.onTaskDeleted ||
        prev.onTaskUpdatedOptimistic !== next.onTaskUpdatedOptimistic ||
        prev.onTaskDeletedOptimistic !== next.onTaskDeletedOptimistic ||
        prev.onTaskDuplicatedOptimistic !== next.onTaskDuplicatedOptimistic ||
        prev.members !== next.members) {
        return false;
    }

    return true; // Não re-renderizar
});
