"use client";

import React, { useState, useRef, useCallback, useMemo } from "react";
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
    assignees?: Array<{ name: string; avatar?: string; id?: string }>;
    assigneeId?: string | null;
    dueDate?: string;
    tags?: string[];
    hasUpdates?: boolean;
    workspaceId?: string | null;
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

function TaskGroupComponent({
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
    const isOverRef = useRef(false);

    const completedCount = tasks.filter((t) => t.completed).length;
    const totalCount = tasks.length;

    // Calcular array de IDs das tasks diretamente - useMemo estava causando loops
    // O SortableContext precisa do array de IDs, mas não precisa ser memoizado
    const taskIds = tasks.map((t) => t.id);

    // Tornar o grupo sortable apenas se isGroupSortable for true
    // IMPORTANTE: disabled deve ser true quando não é sortable para evitar transformações indesejadas
    const {
        attributes,
        listeners,
        setNodeRef: setSortableNodeRef,
        transform,
        isDragging: isGroupDragging,
    } = useSortable({ 
        id: id,
        disabled: !isGroupSortable, // Desabilitado quando não é sortable
    });

    // Tornar o grupo um droppable
    // IMPORTANTE: Não usar isOver diretamente para evitar re-renders constantes durante drag
    const { setNodeRef: setDroppableNodeRef, isOver } = useDroppable({
        id: id,
    });
    
    // Atualizar ref sem causar re-render
    isOverRef.current = isOver;

    // Aplicar transform apenas quando o grupo está sendo arrastado (não quando uma tarefa está sendo arrastada)
    // Se isGroupSortable é false, nunca aplicar transform
    // IMPORTANTE: Não aplicar transition durante drag para evitar flicking
    const groupStyle = isGroupSortable && isGroupDragging ? {
        transform: CSS.Transform.toString(transform),
        opacity: 0.5,
    } : {};


    // ✅ OTIMIZAÇÃO: Função memoizada para determinar o contexto do grupo
    const getGroupContext = useCallback(() => {
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
    }, [groupBy, title]);

    // ✅ OTIMIZAÇÃO: Handler memoizado para evitar re-renders
    const handleQuickAddSubmit = useCallback(async (title: string, dueDate?: Date | null, assigneeId?: string | null) => {
        const context = getGroupContext();
        const result = onAddTask?.(title, { ...context, dueDate, assigneeId });
        // Aguardar Promise se onAddTask retornar uma
        if (result && typeof result === 'object' && 'then' in result) {
            await result;
        }
        // Não fechar o QuickAdd imediatamente para permitir criação em lote
        // O QuickAdd será fechado quando o usuário clicar fora ou pressionar Escape
    }, [getGroupContext, onAddTask]);
    
    // ✅ OTIMIZAÇÃO: Handler memoizado para toggle collapse
    const handleToggleCollapse = useCallback(() => {
        setIsCollapsed(!isCollapsed);
    }, [isCollapsed]);
    
    // ✅ OTIMIZAÇÃO: Handler memoizado para ativar quick add
    const handleActivateQuickAdd = useCallback(() => {
        setIsQuickAddActive(true);
    }, []);
    
    // ✅ OTIMIZAÇÃO: Handler memoizado para click em task
    const handleTaskClick = useCallback((taskId: string) => {
        onTaskClick?.(taskId);
    }, [onTaskClick]);


    // Remover completamente o estilo isOver durante drag para evitar flicking e background escuro
    // Não usar useMemo aqui para evitar loops - className simples é suficiente
    const dropZoneClassName = "mb-6";

    return (
        <div
            ref={setDroppableNodeRef}
            style={groupStyle}
            className={dropZoneClassName}
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
                                ref={setSortableNodeRef}
                                {...attributes}
                                {...listeners}
                                suppressHydrationWarning
                                className="p-1 hover:bg-gray-100 rounded transition-colors cursor-grab active:cursor-grabbing"
                            >
                                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                                </svg>
                            </div>
                        )}
                        <button
                            onClick={handleToggleCollapse}
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
                <div className={cn(
                    "bg-white border border-gray-100 rounded-lg overflow-hidden transition-colors",
                    isOver && "bg-slate-50/50"
                )}>
                    {tasks.length === 0 ? (
                        <TaskGroupEmpty
                            groupTitle={title}
                            onCreateClick={handleActivateQuickAdd}
                        />
                    ) : (
                        <SortableContext
                            items={taskIds}
                            strategy={verticalListSortingStrategy}
                        >
                            {tasks.map((task, index) => (
                                <TaskRow
                                    key={task.id}
                                    id={task.id}
                                    title={task.title}
                                    completed={task.completed}
                                    priority={task.priority}
                                    status={task.status}
                                    assignees={task.assignees}
                                    assigneeId={task.assigneeId}
                                    dueDate={task.dueDate}
                                    tags={task.tags}
                                    hasUpdates={task.hasUpdates}
                                    workspaceId={task.workspaceId}
                                    onClick={() => handleTaskClick(task.id)}
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
                                onClick={handleActivateQuickAdd}
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

// Exportar o componente sem memo para evitar loops de renderização
// O memo pode causar problemas quando arrays são recriados a cada render
export const TaskGroup = TaskGroupComponent;



