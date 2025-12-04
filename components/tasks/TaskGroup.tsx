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
};

interface TaskGroupProps {
    id: string;
    title: string;
    tasks: MinimalTask[];
    onTaskClick?: (taskId: string | number) => void;
    isDragDisabled?: boolean;
}

function TaskGroupComponent({ id, title, tasks, onTaskClick, isDragDisabled = false }: TaskGroupProps) {
    // Normalizar IDs para string (dnd-kit requer strings)
    const taskIds = useMemo(() => tasks.map((t) => String(t.id)), [tasks]);

    // Tornar o grupo um droppable (container que recebe tarefas)
    const { setNodeRef, isOver } = useDroppable({
        id: id,
    });

    return (
        <div className="flex-1 min-w-[320px] max-w-full">
            {/* Header do Grupo */}
            <div className="mb-2 px-1">
                <TaskSectionHeader
                    title={title}
                    count={tasks.length}
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
                                    task={task}
                                    containerId={id}
                                    onClick={onTaskClick}
                                    disabled={isDragDisabled}
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
    // Comparar IDs das tasks
    const prevIds = prev.tasks.map((t) => String(t.id)).join(',');
    const nextIds = next.tasks.map((t) => String(t.id)).join(',');
    if (prevIds !== nextIds) return false;

    // Comparar título e ID do grupo
    if (prev.id !== next.id || prev.title !== next.title) {
        return false;
    }

    if (prev.onTaskClick !== next.onTaskClick) {
        return false;
    }

    return true;
});
