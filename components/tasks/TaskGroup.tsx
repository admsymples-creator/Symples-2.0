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
    useSortable,
} from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

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
    hasComments?: boolean;
    commentCount?: number;
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
    groupBy?: string;
    members?: Array<{ id: string; name: string; avatar?: string }>;
    groupColor?: string; // Cor atual do grupo
    onRenameGroup?: (groupId: string, newTitle: string) => void;
    onColorChange?: (groupId: string, color: string) => void;
    onDeleteGroup?: (groupId: string) => void;
    onClearGroup?: (groupId: string) => void;
    isGroupSortable?: boolean; // Se true, o grupo pode ser arrastado para reordenar
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
    onClearGroup,
    isGroupSortable = false,
}: TaskGroupProps) {
    const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
    const [isHovered, setIsHovered] = useState(false);
    const [isQuickAddActive, setIsQuickAddActive] = useState(false);

    const completedCount = tasks.filter((t) => t.completed).length;
    const totalCount = tasks.length;

    // Tornar o grupo sortable se isGroupSortable for true
    const {
        attributes,
        listeners,
        setNodeRef: setSortableNodeRef,
        transform,
        transition,
        isDragging: isGroupDragging,
    } = useSortable({ 
        id: id,
        disabled: !isGroupSortable,
    });

    // Tornar o grupo um droppable
    const { setNodeRef: setDroppableNodeRef, isOver } = useDroppable({
        id: id,
    });

    // Combinar refs
    const setNodeRef = (node: HTMLElement | null) => {
        setSortableNodeRef(node);
        setDroppableNodeRef(node);
    };

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isGroupDragging ? 0.5 : 1,
    };


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
                    "urgente": "urgent",
                    "alta": "high",
                    "média": "medium",
                    "baixa": "low",
                    "Urgente": "urgent",
                    "Alta": "high",
                    "Média": "medium",
                    "Baixa": "low"
                };
                const priority = priorityMap[title];
                if (priority) {
                    context.priority = priority;
                }
                break;
            case "assignee":
                context.assignee = title;
                break;
            // case "group": case "date": 
            // Para "group", o nome do grupo (title) seria o nome do Custom Group.
            // Mas o `onAddTask` precisaria receber o ID do grupo, e aqui só temos o title.
            // Idealmente `id` da prop TaskGroup é o ID do grupo se groupBy="group".
            // Mas por enquanto vamos deixar sem contexto específico para esses casos,
            // a menos que passemos o ID corretamente.
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
            style={style}
            className={cn(
                "mb-6 transition-colors",
                isOver && !isCollapsed && "bg-blue-50/30 rounded-lg p-2",
                isGroupDragging && "opacity-50"
            )}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Header do Grupo */}
            <div className="mb-4">
                <TaskSectionHeader
                title={title}
                count={totalCount}
                color={groupColor}
                leftContent={
                    <>
                        {isGroupSortable && (
                            <div
                                {...attributes}
                                {...listeners}
                                className="p-1 hover:bg-gray-100 rounded transition-colors cursor-grab active:cursor-grabbing"
                            >
                                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                                </svg>
                            </div>
                        )}
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
                    groupBy === "group" ? (
                        <GroupActionMenu
                            groupId={id}
                            groupTitle={title}
                            currentColor={groupColor}
                            onRename={onRenameGroup}
                            onColorChange={onColorChange}
                            onDelete={onDeleteGroup}
                            onClear={onClearGroup}
                        />
                    ) : null
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
                                    groupColor={groupColor}
                                    hasComments={task.hasComments}
                                    commentCount={task.commentCount}
                                />
                            ))}
                        </SortableContext>
                    )}

                    {/* Quick Add no rodapé */}
                    <div className="border-t border-gray-100">
                        {isQuickAddActive ? (
                            <QuickTaskAdd
                                placeholder="Adicionar tarefa aqui..."
                                onSubmit={handleQuickAddSubmit}
                                members={members}
                                variant="ghost"
                                className="border-none shadow-none focus-within:ring-0"
                            />
                        ) : (
                            <button
                                onClick={() => setIsQuickAddActive(true)}
                                className="w-full flex items-center h-10 px-4 text-sm text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors group"
                            >
                                {/* Placeholder do Drag Handle */}
                                <div className="w-[26px] flex-shrink-0" />
                                {/* Placeholder do Checkbox */}
                                <div className="flex-shrink-0 mr-3">
                                    <div className="w-4 h-4 rounded border border-dashed border-gray-300 group-hover:border-gray-400" />
                                </div>
                                <span className="flex-1 text-left">Adicionar tarefa aqui...</span>
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

