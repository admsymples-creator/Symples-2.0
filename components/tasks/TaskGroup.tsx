"use client";

import React, { useMemo, memo, useState, useCallback } from "react";
import { TaskRowMinify } from "./TaskRowMinify";
import { TaskSectionHeader } from "./TaskSectionHeader";
import { GroupActionMenu } from "./GroupActionMenu";
import { QuickTaskAdd } from "./QuickTaskAdd";
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
    onTaskCreatedOptimistic?: (taskData: { id: string; title: string; status: string; priority?: "low" | "medium" | "high" | "urgent"; assignees?: Array<{ name: string; avatar?: string; id?: string }>; dueDate?: string; groupId?: string | null; workspaceId?: string | null }) => void;
    members?: Array<{ id: string; name: string; avatar?: string }>;
    // Props para GroupActionMenu
    onRenameGroup?: (groupId: string, newTitle: string) => void;
    onColorChange?: (groupId: string, color: string) => void;
    onDeleteGroup?: (groupId: string) => void;
    onClearGroup?: (groupId: string) => void;
    showGroupActions?: boolean;
    onAddTask?: (groupId: string, title: string, dueDate?: Date | null, assigneeId?: string | null) => Promise<void> | void;
}

function TaskGroupComponent({ id, title, tasks, groupColor, workspaceId, onTaskClick, isDragDisabled = false, onTaskUpdated, onTaskDeleted, onTaskUpdatedOptimistic, onTaskDeletedOptimistic, onTaskDuplicatedOptimistic, onTaskCreatedOptimistic, members, onRenameGroup, onColorChange, onDeleteGroup, onClearGroup, showGroupActions = true, onAddTask }: TaskGroupProps) {
    // Log para debug
    console.log("🟡 [TaskGroup] Renderizado - id:", id, "tasks.length:", tasks.length);
    console.log("🟡 [TaskGroup] Renderizado - onTaskDeletedOptimistic existe?", !!onTaskDeletedOptimistic);
    console.log("🟡 [TaskGroup] Renderizado - onTaskDuplicatedOptimistic existe?", !!onTaskDuplicatedOptimistic);
    console.log("🟡 [TaskGroup] Renderizado - onTaskDeletedOptimistic:", onTaskDeletedOptimistic);
    console.log("🟡 [TaskGroup] Renderizado - onTaskDuplicatedOptimistic:", onTaskDuplicatedOptimistic);
    
    const [isAdding, setIsAdding] = useState(false);
    
    // Normalizar IDs para string (dnd-kit requer strings)
    const taskIds = useMemo(() => tasks.map((t) => String(t.id)), [tasks]);
    
    const handleSubmitAdd = useCallback(async (title: string, dueDate?: Date | null, assigneeId?: string | null) => {
        if (onAddTask) {
            const result = onAddTask(id, title, dueDate, assigneeId);
            if (result && typeof result === 'object' && 'then' in result) {
                await result;
            }
        }
        setIsAdding(false);
    }, [onAddTask, id]);

    const handleCancelAdd = useCallback(() => {
        setIsAdding(false);
    }, []);

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
                    actions={
                        showGroupActions && 
                        id !== "inbox" && 
                        id !== "Inbox" &&
                        (onRenameGroup || onColorChange || onDeleteGroup || onClearGroup) ? (
                            <GroupActionMenu
                                groupId={id}
                                groupTitle={title}
                                currentColor={groupColor}
                                onRename={onRenameGroup}
                                onColorChange={onColorChange}
                                onDelete={onDeleteGroup}
                                onClear={onClearGroup}
                            />
                        ) : undefined
                    }
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
                {tasks.length > 0 || (onAddTask && isAdding) ? (
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
                            
                            {/* Quick Add no final da lista quando há tarefas */}
                            {onAddTask && tasks.length > 0 && (
                                <div className="pt-1">
                                    <QuickTaskAdd
                                        placeholder="Adicionar tarefa aqui..."
                                        autoFocus={false}
                                        onCancel={handleCancelAdd}
                                        onSubmit={handleSubmitAdd}
                                        members={members || []}
                                        variant="ghost"
                                    />
                                </div>
                            )}
                        </div>
                    </SortableContext>
                ) : null}
                
                {/* Estado vazio: mostra botão ou QuickTaskAdd */}
                {tasks.length === 0 && (
                    <>
                        {onAddTask ? (
                            isAdding ? (
                                <div className="p-2">
                                    <QuickTaskAdd
                                        placeholder="Adicionar tarefa aqui..."
                                        autoFocus={true}
                                        onCancel={handleCancelAdd}
                                        onSubmit={handleSubmitAdd}
                                        members={members || []}
                                        variant="default"
                                    />
                                </div>
                            ) : (
                                <div className="flex items-center justify-center h-32">
                                    <button
                                        onClick={() => setIsAdding(true)}
                                        className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
                                    >
                                        + Adicionar tarefa
                                    </button>
                                </div>
                            )
                        ) : (
                            <div className="flex items-center justify-center h-32 text-sm text-gray-400">
                                Arraste tarefas aqui
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

// Memo para estabilidade do DnD
export const TaskGroup = memo(TaskGroupComponent, (prev, next) => {
    // Log para debug
    const shouldRender = 
        prev.tasks !== next.tasks ||
        prev.id !== next.id ||
        prev.title !== next.title ||
        prev.groupColor !== next.groupColor ||
        prev.onTaskClick !== next.onTaskClick ||
        prev.onTaskUpdated !== next.onTaskUpdated ||
        prev.onTaskDeleted !== next.onTaskDeleted ||
        prev.onTaskUpdatedOptimistic !== next.onTaskUpdatedOptimistic ||
        prev.onTaskDeletedOptimistic !== next.onTaskDeletedOptimistic ||
        prev.onTaskDuplicatedOptimistic !== next.onTaskDuplicatedOptimistic ||
        prev.onTaskCreatedOptimistic !== next.onTaskCreatedOptimistic ||
        prev.onAddTask !== next.onAddTask ||
        prev.members !== next.members ||
        prev.onRenameGroup !== next.onRenameGroup ||
        prev.onColorChange !== next.onColorChange ||
        prev.onDeleteGroup !== next.onDeleteGroup ||
        prev.onClearGroup !== next.onClearGroup ||
        prev.showGroupActions !== next.showGroupActions;
    
    console.log("🟨 [TaskGroup] memo comparando:", {
        groupId: next.id,
        tasksChanged: prev.tasks !== next.tasks,
        onTaskDeletedOptimisticChanged: prev.onTaskDeletedOptimistic !== next.onTaskDeletedOptimistic,
        onTaskDuplicatedOptimisticChanged: prev.onTaskDuplicatedOptimistic !== next.onTaskDuplicatedOptimistic,
        shouldRender,
        prevHasCallback: !!prev.onTaskDeletedOptimistic,
        nextHasCallback: !!next.onTaskDeletedOptimistic,
    });
    
    return !shouldRender; // Retorna true se NÃO deve re-renderizar
});
