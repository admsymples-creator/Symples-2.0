"use client";

import React, { memo } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTaskPreload } from "@/hooks/use-task-preload";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { Avatar, AvatarGroup } from "./Avatar";
import {
    MoreHorizontal,
    GripVertical,
    Zap,
    AlertTriangle,
    Calendar as CalendarIcon,
    User,
    MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { TaskActionsMenu } from "./TaskActionsMenu";
import { InlineTextEdit } from "@/components/ui/inline-text-edit";

interface TaskRowProps {
    id: string;
    title: string;
    completed: boolean;
    priority?: "low" | "medium" | "high" | "urgent";
    status: string;
    assignees?: Array<{ name: string; avatar?: string; id?: string }>;
    assigneeId?: string | null; // ID do responsável atual
    dueDate?: string;
    tags?: string[];
    hasUpdates?: boolean;
    workspaceId?: string | null; // ID do workspace para buscar membros
    onClick?: () => void;
    onToggleComplete?: (id: string, completed: boolean) => void;
    onTaskUpdated?: () => void;
    onTaskDeleted?: () => void;
    isLast?: boolean;
    groupColor?: string;
    hasComments?: boolean;
    commentCount?: number;
}

const priorityColors = {
    low: "bg-blue-500",
    medium: "bg-yellow-500",
    high: "bg-orange-500",
    urgent: "bg-red-500",
};

import { TASK_CONFIG, getTaskStatusConfig, mapLabelToStatus, TaskStatus } from "@/lib/config/tasks";
import { TaskDatePicker } from "./pickers/TaskDatePicker";
import { TaskAssigneePicker } from "./pickers/TaskAssigneePicker";
import { TaskStatusPicker } from "./pickers/TaskStatusPicker";
import { updateTask } from "@/lib/actions/tasks";
import { toast } from "sonner";

// Função utilitária para verificar se a data é o próximo domingo
const isNextSunday = (dateString?: string): boolean => {
    if (!dateString) return false;
    
    const date = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Encontrar o próximo domingo
    const dayOfWeek = today.getDay(); // 0 = Domingo, 1 = Segunda, etc.
    const daysUntilSunday = dayOfWeek === 0 ? 7 : 7 - dayOfWeek;
    const nextSunday = new Date(today);
    nextSunday.setDate(today.getDate() + daysUntilSunday);
    nextSunday.setHours(0, 0, 0, 0);
    
    // Comparar apenas a data (sem hora)
    const taskDate = new Date(date);
    taskDate.setHours(0, 0, 0, 0);
    
    return taskDate.getTime() === nextSunday.getTime();
};

// Função utilitária para verificar se a data é hoje
const isToday = (dateString?: string): boolean => {
    if (!dateString) return false;
    
    const date = new Date(dateString);
    const today = new Date();
    
    return (
        date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear()
    );
};

// Função para obter o próximo domingo
const getNextSunday = (): Date => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysUntilSunday = dayOfWeek === 0 ? 7 : 7 - dayOfWeek;
    const nextSunday = new Date(today);
    nextSunday.setDate(today.getDate() + daysUntilSunday);
    nextSunday.setHours(0, 0, 0, 0);
    return nextSunday;
};

function TaskRowComponent({
    id,
    title,
    completed,
    priority = "medium",
    status,
    assignees = [],
    assigneeId,
    dueDate,
    tags = [],
    hasUpdates = false,
    workspaceId,
    onClick,
    onToggleComplete,
    onTaskUpdated,
    onTaskDeleted,
    isLast = false,
    groupColor,
    hasComments = false,
    commentCount = 0,
}: TaskRowProps) {
    const { preloadTask, cancelPreload } = useTaskPreload();
    const isOverdue = dueDate && new Date(dueDate) < new Date() && !completed;
    // Obter apenas o label do status (sem cores - cores vêm apenas do grupo)
    const dbStatus = mapLabelToStatus(status);
    const statusConfig = TASK_CONFIG[dbStatus] || TASK_CONFIG.todo;
    
    // Mapear cor do grupo se existir (ex: "red" -> "bg-red-500")
    const getGroupColorClass = (colorName?: string) => {
        if (!colorName) return null;
        // Se for hex, retorna null para não aplicar classe, vamos tratar com style
        if (colorName.startsWith("#")) return null;

        const colorMap: Record<string, string> = {
            "red": "bg-red-500",
            "blue": "bg-blue-500",
            "green": "bg-green-500",
            "yellow": "bg-yellow-500",
            "purple": "bg-purple-500",
            "pink": "bg-pink-500",
            "orange": "bg-orange-500",
            "slate": "bg-slate-500",
            "cyan": "bg-cyan-500",
            "indigo": "bg-indigo-500",
        };
        return colorMap[colorName] || null;
    };
    
    const groupColorClass = getGroupColorClass(groupColor);
    const isHexColor = groupColor?.startsWith("#");

    // Lógica de Smart Triggers
    const isFocusActive = isNextSunday(dueDate);
    const isUrgentActive = isToday(dueDate) || priority === "high" || priority === "urgent";

    // Handler para atualizar data
    const handleDateSelect = async (date: Date | null) => {
        try {
            const result = await updateTask({
                id,
                due_date: date ? date.toISOString() : null,
            });

            if (result.success) {
                onTaskUpdated?.();
            } else {
                toast.error(result.error || "Erro ao atualizar data");
            }
        } catch (error) {
            toast.error("Erro ao atualizar data");
            console.error(error);
        }
    };

    // Handler para atualizar responsável
    const handleAssigneeSelect = async (newAssigneeId: string | null) => {
        try {
            const result = await updateTask({
                id,
                assignee_id: newAssigneeId,
            });

            if (result.success) {
                onTaskUpdated?.();
            } else {
                toast.error(result.error || "Erro ao atualizar responsável");
            }
        } catch (error) {
            toast.error("Erro ao atualizar responsável");
            console.error(error);
        }
    };

    // Handler para atualizar status
    const handleStatusSelect = async (newStatus: TaskStatus) => {
        try {
            const result = await updateTask({
                id,
                status: newStatus,
            });

            if (result.success) {
                onTaskUpdated?.();
            } else {
                toast.error(result.error || "Erro ao atualizar status");
            }
        } catch (error) {
            toast.error("Erro ao atualizar status");
            console.error(error);
        }
    };

    // Handler para atualizar título
    const handleTitleUpdate = async (newTitle: string) => {
        try {
            const result = await updateTask({
                id,
                title: newTitle,
            });

            if (result.success) {
                onTaskUpdated?.();
            } else {
                toast.error(result.error || "Erro ao atualizar título");
            }
        } catch (error) {
            toast.error("Erro ao atualizar título");
            console.error(error);
        }
    };

    // Converter dueDate string para Date
    const dueDateObj = dueDate ? new Date(dueDate) : null;

    // Hook do dnd-kit para tornar a linha sortable
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: String(id) }); // ✅ CORREÇÃO: Normalizar ID para string

    // ✅ CORREÇÃO: Usar CSS.Translate em vez de CSS.Transform para melhor performance
    // Remover transition durante drag para evitar flicking
    const style = {
        transform: CSS.Translate.toString(transform),
        transition: isDragging ? 'none' : transition,
        opacity: isDragging ? 0.5 : 1,
    };

    // Preparar objeto da tarefa para o menu de ações
    const taskForMenu = {
        id,
        title,
        description: null,
        status,
        priority,
        due_date: dueDate || null,
        assignee_id: assigneeId || null,
        workspace_id: workspaceId || null,
        origin_context: {},
    };

    return (
        <TooltipProvider>
            <div
                ref={setNodeRef}
                style={style}
                className={cn(
                    "group flex items-center w-full border-b border-gray-100 bg-white hover:bg-gray-50 transition-colors h-10 px-4 relative",
                    isDragging && "shadow-lg bg-white rounded-lg z-50"
                )}
                onMouseEnter={() => preloadTask(id, workspaceId)}
                onMouseLeave={cancelPreload}
            >
            {/* Barra Lateral Colorida (linha contínua) - APENAS Cor do Grupo */}
            {(groupColorClass || isHexColor) && (
                <div 
                    className={cn(
                        "absolute left-0 top-0 bottom-0 w-1 rounded-r-md",
                        groupColorClass
                    )}
                    style={isHexColor ? { backgroundColor: groupColor } : undefined}
                />
            )}

            {/* Esquerda (Fluido) */}
            {/* Drag Handle (invisível até hover) */}
            <div 
                {...attributes}
                {...listeners}
                className="flex items-center justify-center pr-2 z-10"
            >
                <GripVertical className="w-4 h-4 text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
            </div>

            {/* Checkbox */}
            <div onClick={(e) => e.stopPropagation()} className="flex-shrink-0 mr-3">
                <Checkbox 
                    checked={completed} 
                    onCheckedChange={(checked) => {
                        if (onToggleComplete) {
                            onToggleComplete(id, checked === true);
                        }
                    }}
                    className="border-gray-200 hover:border-gray-300 transition-colors duration-200 data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
                />
            </div>

            {/* Título (Truncate, flex-1, mr-4) - Área clicável */}
            <div 
                className="flex items-center gap-2 min-w-0 flex-1 mr-4 cursor-pointer"
                onClick={onClick}
            >
                {/* Indicador de atualização não lida */}
                {hasUpdates && (
                    <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                )}
                
                <InlineTextEdit
                    value={title}
                    onSave={handleTitleUpdate}
                    className={cn(
                        "text-sm text-gray-900 leading-tight",
                        hasUpdates ? "font-semibold" : "font-medium",
                        completed && "line-through text-gray-500"
                    )}
                    inputClassName="text-sm font-medium text-gray-900"
                />

                {/* Indicador de comentários - mais sutil */}
                {hasComments && commentCount > 0 && (
                    <div className="ml-1 flex items-center gap-0.5 flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors">
                        <MessageSquare className="w-3 h-3" />
                        {commentCount > 1 && (
                            <span className="text-[10px] font-medium">{commentCount}</span>
                        )}
                    </div>
                )}

                {/* Tags (após o título, máximo 2 + "+1") */}
                {tags.length > 0 && (
                    <div className="flex items-center gap-1 flex-shrink-0">
                        {tags.slice(0, 2).map((tag, index) => (
                            <Badge
                                key={index}
                                variant="outline"
                                className="text-[10px] px-1.5 py-0 h-5 font-normal text-gray-500 border-gray-200 bg-gray-50"
                            >
                                {tag}
                            </Badge>
                        ))}
                        {tags.length > 2 && (
                            <Badge
                                variant="outline"
                                className="text-[10px] px-1.5 py-0 h-5 font-normal text-gray-500 border-gray-200 bg-gray-50"
                            >
                                +{tags.length - 2}
                            </Badge>
                        )}
                    </div>
                )}
            </div>

            {/* Direita (Fixo) - Container com dimensões fixas */}
            <div className="flex items-center justify-center gap-3 shrink-0 min-w-[300px]">
                {/* 1. Ações (Raio e Exclamação) */}
                <div className="flex items-center gap-1">
                    {/* Botão Raio (Foco Semanal) */}
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button
                                onClick={async (e) => {
                                    e.stopPropagation();
                                    try {
                                        const nextSunday = getNextSunday();
                                        const result = await updateTask({
                                            id,
                                            due_date: nextSunday.toISOString(),
                                        });

                                        if (result.success) {
                                            toast.success("Tarefa movida para o próximo domingo");
                                            onTaskUpdated?.();
                                        } else {
                                            toast.error(result.error || "Erro ao mover tarefa");
                                        }
                                    } catch (error) {
                                        toast.error("Erro ao mover tarefa");
                                        console.error(error);
                                    }
                                }}
                                className={cn(
                                    "rounded p-1 transition-all",
                                    isFocusActive
                                        ? "text-yellow-600 fill-yellow-100 bg-yellow-50 opacity-100"
                                        : "text-gray-300 opacity-0 group-hover:opacity-100 hover:text-yellow-500"
                                )}
                            >
                                <Zap className="w-4 h-4" />
                            </button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>{isFocusActive ? "Marcado para o próximo domingo" : "Mover para Minha Semana"}</p>
                        </TooltipContent>
                    </Tooltip>

                    {/* Botão Exclamação (Urgente) */}
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button
                                onClick={async (e) => {
                                    e.stopPropagation();
                                    try {
                                        const today = new Date();
                                        today.setHours(0, 0, 0, 0);
                                        
                                        const result = await updateTask({
                                            id,
                                            priority: "urgent",
                                            due_date: today.toISOString(),
                                        });

                                        if (result.success) {
                                            toast.success("Tarefa marcada como urgente");
                                            onTaskUpdated?.();
                                        } else {
                                            toast.error(result.error || "Erro ao marcar como urgente");
                                        }
                                    } catch (error) {
                                        toast.error("Erro ao marcar como urgente");
                                        console.error(error);
                                    }
                                }}
                                className={cn(
                                    "rounded p-1 transition-all",
                                    isUrgentActive
                                        ? "text-red-600 fill-red-50 bg-red-50 opacity-100"
                                        : "text-gray-300 opacity-0 group-hover:opacity-100 hover:text-red-500"
                                )}
                            >
                                <AlertTriangle className="w-4 h-4" />
                            </button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>{isUrgentActive ? "Marcado como urgente" : "Marcar como Urgente"}</p>
                        </TooltipContent>
                    </Tooltip>
                </div>

                {/* 2. Divisor Vertical Sutil */}
                <div className="h-4 w-px bg-gray-200 mx-2" />

                {/* 3. Responsável */}
                <div className="flex items-center justify-center w-8" onClick={(e) => e.stopPropagation()}>
                    <TaskAssigneePicker
                        assigneeId={assigneeId || null}
                        onSelect={handleAssigneeSelect}
                        workspaceId={workspaceId}
                        trigger={
                            <button
                                type="button"
                                className={cn(
                                    "transition-all flex items-center justify-center",
                                    assignees.length > 0 
                                        ? "hover:opacity-80" 
                                        : "size-6 rounded-full border border-dashed border-gray-300 hover:border-gray-400 cursor-pointer"
                                )}
                            >
                                {assignees.length > 0 ? (
                                    <AvatarGroup users={assignees} max={3} size="sm" />
                                ) : (
                                    <User className="w-3 h-3 text-gray-400" />
                                )}
                            </button>
                        }
                    />
                </div>

                {/* 4. Data */}
                <div className="flex items-center justify-center w-24" onClick={(e) => e.stopPropagation()}>
                    <TaskDatePicker
                        date={dueDateObj}
                        onSelect={handleDateSelect}
                        side="left"
                        align="end"
                        trigger={
                            <button
                                type="button"
                                className={cn(
                                    "text-xs transition-colors hover:opacity-80",
                                    dueDate && isToday(dueDate) && "text-red-500 font-medium",
                                    dueDate && isOverdue && !isToday(dueDate) && "text-red-500 font-medium",
                                    dueDate && !isToday(dueDate) && !isOverdue && "text-gray-400",
                                    !dueDate && "text-gray-300 hover:text-gray-500 cursor-pointer"
                                )}
                            >
                                {dueDate ? (
                                    <span className="uppercase">
                                        {new Date(dueDate).toLocaleDateString("pt-BR", {
                                            day: "2-digit",
                                            month: "short",
                                        }).replace(/ de /g, " ").replace(/\./g, "")}
                                    </span>
                                ) : (
                                    <CalendarIcon className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                                )}
                            </button>
                        }
                    />
                </div>

                {/* 5. Status (Badge editável) */}
                <div className="flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                    <TaskStatusPicker
                        status={status}
                        onSelect={handleStatusSelect}
                        side="bottom"
                        align="end"
                    />
                </div>

                {/* 6. Menu */}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                    <TaskActionsMenu
                        task={taskForMenu}
                        onOpenDetails={onClick}
                        onTaskUpdated={onTaskUpdated}
                        onTaskDeleted={onTaskDeleted}
                    />
                </div>
            </div>
        </div>
        </TooltipProvider>
    );
}

// 🛡️ Memoização agressiva: re-renderiza SÓ quando algo visualmente relevante muda
export const TaskRow = memo(
    TaskRowComponent,
    (prev, next) => {
        // Props escalares principais
        if (
            prev.id !== next.id ||
            prev.title !== next.title ||
            prev.completed !== next.completed ||
            prev.status !== next.status ||
            prev.priority !== next.priority ||
            prev.assigneeId !== next.assigneeId ||
            prev.dueDate !== next.dueDate ||
            prev.groupColor !== next.groupColor ||
            prev.hasComments !== next.hasComments ||
            prev.commentCount !== next.commentCount ||
            prev.hasUpdates !== next.hasUpdates ||
            prev.workspaceId !== next.workspaceId ||
            prev.isLast !== next.isLast
        ) {
            return false; // algo importante mudou → re-render
        }

        // Arrays de tags: comparar conteúdo básico (comprimento + join)
        const prevTags = prev.tags || [];
        const nextTags = next.tags || [];
        if (
            prevTags.length !== nextTags.length ||
            prevTags.join("|") !== nextTags.join("|")
        ) {
            return false;
        }

        // Assignees: comparar só IDs (referências podem mudar)
        const prevAssignees = prev.assignees || [];
        const nextAssignees = next.assignees || [];
        if (prevAssignees.length !== nextAssignees.length) {
            return false;
        }
        for (let i = 0; i < prevAssignees.length; i++) {
            if (prevAssignees[i]?.id !== nextAssignees[i]?.id) {
                return false;
            }
        }

        // Callbacks são estáveis (useCallback nos pais) → ignorar
        return true; // nada relevante mudou → pular re-render
    }
);

