"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ChevronDown, ChevronRight } from "lucide-react";
import { TaskRow } from "./TaskRow";
import { TaskGroupEmpty } from "./TaskGroupEmpty";
import { TaskSectionHeader } from "./TaskSectionHeader";
import { QuickTaskAdd } from "./QuickTaskAdd";
import { GroupActionMenu } from "./GroupActionMenu";
import { cn } from "@/lib/utils";
import {
    SortableContext,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";

interface Task {
    id: string;
    title: string;
    completed: boolean;
    priority?: "low" | "medium" | "high" | "urgent";
    status: string;
    assignees?: Array<{ name: string; avatar?: string }>;
    dueDate?: string;
    tags?: string[];
    hasUpdates?: boolean;
}

interface TaskGroupProps {
    id: string;
    title: string;
    icon?: string;
    tasks: Task[];
    onTaskClick?: (taskId: string) => void;
    onAddTask?: (title: string, context: { status?: string; priority?: string; assignee?: string; dueDate?: Date | null; assigneeId?: string | null }) => Promise<void> | void;
    onToggleComplete?: (taskId: string, completed: boolean) => void;
    onTaskUpdated?: () => void; // Callback após atualização de tarefa
    onTaskDeleted?: () => void; // Callback após exclusão de tarefa
    defaultCollapsed?: boolean;
    groupBy?: "status" | "priority" | "assignee";
    members?: Array<{ id: string; name: string; avatar?: string }>;
    groupColor?: string; // Cor atual do grupo
    onRenameGroup?: (groupId: string, newTitle: string) => void;
    onColorChange?: (groupId: string, color: string) => void;
    onDeleteGroup?: (groupId: string) => void;
}

export function TaskGroup({
    id,
    title,
    icon,
    tasks,
    onTaskClick,
    onAddTask,
    onToggleComplete,
    onTaskUpdated,
    onTaskDeleted,
    defaultCollapsed = false,
    groupBy = "status",
    members = [],
    groupColor,
    onRenameGroup,
    onColorChange,
    onDeleteGroup,
}: TaskGroupProps) {
    const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
    const [isHovered, setIsHovered] = useState(false);
    const [isQuickAddActive, setIsQuickAddActive] = useState(false);

    const completedCount = tasks.filter((t) => t.completed).length;
    const totalCount = tasks.length;

    // Tornar o grupo um droppable
    const { setNodeRef, isOver } = useDroppable({
        id: id,
    });


    // Função para determinar o contexto do grupo
    const getGroupContext = () => {
        const context: { status?: string; priority?: string; assignee?: string } = {};

        switch (groupBy) {
            case "status":
                context.status = title;
                break;
            case "priority":
                // Mapear título para prioridade
                const priorityMap: Record<string, "low" | "medium" | "high" | "urgent"> = {
                    "urgent": "urgent",
                    "high": "high",
                    "medium": "medium",
                    "low": "low",
                };
                const priority = priorityMap[title.toLowerCase()];
                if (priority) {
                    context.priority = priority;
                }
                break;
            case "assignee":
                context.assignee = title;
                break;
        }

        return context;
    };

    const handleQuickAddSubmit = async (title: string, dueDate?: Date | null, assigneeId?: string | null) => {
        const context = getGroupContext();
        const result = onAddTask?.(title, { ...context, dueDate, assigneeId });
        // Aguardar Promise se onAddTask retornar uma
        if (result && typeof result === 'object' && 'then' in result) {
            await result;
        }
        // Não fechar o QuickAdd imediatamente para permitir criação em lote
        // O QuickAdd será fechado quando o usuário clicar fora ou pressionar Escape
    };

    return (
        <div
            ref={setNodeRef}
            className={cn(
                "mb-6 transition-colors",
                isOver && !isCollapsed && "bg-blue-50/30 rounded-lg p-2"
            )}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Header do Grupo */}
            <div className="mb-4">
                <TaskSectionHeader
                title={title}
                count={totalCount}
                leftContent={
                    <>
                        <button
                            onClick={() => setIsCollapsed(!isCollapsed)}
                            className="p-1 hover:bg-gray-100 rounded transition-colors"
                        >
                            {isCollapsed ? (
                                <ChevronRight className="w-4 h-4 text-gray-500" />
                            ) : (
                                <ChevronDown className="w-4 h-4 text-gray-500" />
                            )}
                        </button>
                        {icon && <span className="text-xs">{icon}</span>}
                    </>
                }
                actions={
                    <GroupActionMenu
                        groupId={id}
                        groupTitle={title}
                        currentColor={groupColor}
                        onRename={(newTitle) => onRenameGroup?.(id, newTitle)}
                        onColorChange={(color) => onColorChange?.(id, color)}
                        onDelete={() => onDeleteGroup?.(id)}
                    />
                }
            />
            </div>

            {/* Lista de Tarefas */}
            {!isCollapsed && (
                <div className="bg-white border border-gray-100 rounded-lg overflow-hidden">
                    {tasks.length === 0 ? (
                        <TaskGroupEmpty
                            groupTitle={title}
                            onCreateClick={() => {
                                setIsQuickAddActive(true);
                            }}
                        />
                    ) : (
                        <SortableContext
                            items={tasks.map((t) => t.id)}
                            strategy={verticalListSortingStrategy}
                        >
                            {tasks.map((task, index) => (
                                <TaskRow
                                    key={task.id}
                                    {...task}
                                    onClick={() => onTaskClick?.(task.id)}
                                    onToggleComplete={onToggleComplete}
                                    onTaskUpdated={onTaskUpdated}
                                    onTaskDeleted={onTaskDeleted}
                                    isLast={index === tasks.length - 1}
                                />
                            ))}
                        </SortableContext>
                    )}

                    {/* Quick Add no rodapé */}
                    <div className="p-3 border-t border-gray-100">
                        {isQuickAddActive ? (
                            <QuickTaskAdd
                                placeholder="Adicionar tarefa aqui..."
                                onSubmit={handleQuickAddSubmit}
                                members={members}
                            />
                        ) : (
                            <button
                                onClick={() => setIsQuickAddActive(true)}
                                className="w-full text-left text-sm text-gray-400 hover:text-gray-600 transition-colors py-1"
                            >
                                + Adicionar tarefa aqui...
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

