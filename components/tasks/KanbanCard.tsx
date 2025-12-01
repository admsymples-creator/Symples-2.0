"use client";

import React, { useState, useRef, useEffect } from "react";
import { MoreHorizontal, Calendar as CalendarIcon, GitPullRequest, MessageSquare, User, X, Zap, AlertTriangle } from "lucide-react";
import { useTaskPreload } from "@/hooks/use-task-preload";
import { Avatar } from "./Avatar";
import { cn } from "@/lib/utils";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { TaskActionsMenu } from "./TaskActionsMenu";
import { TASK_CONFIG, mapLabelToStatus } from "@/lib/config/tasks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { updateTask } from "@/lib/actions/tasks";
import { toast } from "sonner";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

interface KanbanCardProps {
    id: string;
    title: string;
    completed?: boolean;
    status?: string; // Status da tarefa (label da UI ou status do banco)
    priority?: "low" | "medium" | "high" | "urgent";
    assignees?: Array<{ name: string; avatar?: string; id?: string }>;
    dueDate?: string;
    tags?: string[];
    groupColor?: string; // Cor do grupo
    subtasksCount?: number;
    commentsCount?: number;
    onClick?: () => void;
    onTaskUpdated?: () => void; // Adicionado para suportar callback de atualização
    onDelete?: () => void; // Mantido, mas idealmente usaria onTaskDeleted via TaskActionMenu
    onToggleComplete?: (taskId: string, completed: boolean) => void;
    members?: Array<{ id: string; name: string; avatar?: string }>; // Membros para atribuição rápida
}

// Função para mapear tags para cores de badge
function getTagColor(tag: string): string {
    const normalized = tag.toLowerCase();
    if (normalized.includes("urgente") || normalized.includes("alta")) {
        return "bg-red-100 text-red-700";
    }
    if (normalized.includes("backend") || normalized.includes("api")) {
        return "bg-blue-100 text-blue-700";
    }
    if (normalized.includes("frontend") || normalized.includes("ui")) {
        return "bg-emerald-100 text-emerald-700";
    }
    return "bg-gray-100 text-gray-600";
}

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
const isTodayFunc = (dateString?: string): boolean => {
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

export function KanbanCard({
    id,
    title,
    completed = false,
    status = "todo",
    priority = "medium",
    assignees = [],
    dueDate,
    tags = [],
    groupColor,
    subtasksCount,
    commentsCount,
    onClick,
    onTaskUpdated,
    onDelete,
    onToggleComplete,
    members,
}: KanbanCardProps) {
    const { preloadTask, cancelPreload } = useTaskPreload();
    const isOverdue = dueDate && new Date(dueDate) < new Date() && !completed;
    const isToday = dueDate && new Date(dueDate).toDateString() === new Date().toDateString();
    
    // Lógica de Smart Triggers
    const isFocusActive = isNextSunday(dueDate);
    const isUrgentActive = isTodayFunc(dueDate) || priority === "high" || priority === "urgent";
    
    // Obter configuração do status (apenas label, sem cores)
    const dbStatus = mapLabelToStatus(status);
    const statusConfig = TASK_CONFIG[dbStatus] || TASK_CONFIG.todo;

    // Mapear cor do grupo se existir
    const getGroupColorClass = (colorName?: string) => {
        if (!colorName) return null;
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

    // Hook do dnd-kit para tornar o card sortable
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id });

    const dragStyle = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    // Estados para edição inline
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [titleValue, setTitleValue] = useState(title);
    const titleInputRef = useRef<HTMLTextAreaElement>(null);

    // Atualizar titleValue quando a prop title mudar
    useEffect(() => {
        setTitleValue(title);
    }, [title]);

    // Focar no input quando entrar em modo de edição
    useEffect(() => {
        if (isEditingTitle && titleInputRef.current) {
            titleInputRef.current.focus();
            // Posicionar cursor no final
            titleInputRef.current.setSelectionRange(
                titleInputRef.current.value.length,
                titleInputRef.current.value.length
            );
        }
    }, [isEditingTitle]);

    const handleTitleSubmit = async () => {
        if (!titleValue.trim() || titleValue === title) {
            setIsEditingTitle(false);
            setTitleValue(title);
            return;
        }

        try {
            const result = await updateTask({ id, title: titleValue });
            if (result.success) {
                onTaskUpdated?.();
            } else {
                toast.error("Erro ao atualizar título");
                setTitleValue(title);
            }
        } catch (error) {
            toast.error("Erro ao atualizar título");
            setTitleValue(title);
        } finally {
            setIsEditingTitle(false);
        }
    };

    const handleTitleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleTitleSubmit();
        } else if (e.key === "Escape") {
            setIsEditingTitle(false);
            setTitleValue(title);
        }
    };

    // Handlers para data e responsável (Update direto)
    const handleDateUpdate = async (date: Date | undefined) => {
        try {
            const result = await updateTask({ 
                id, 
                due_date: date ? date.toISOString() : null 
            });
            if (result.success) {
                onTaskUpdated?.();
                toast.success(date ? "Data atualizada" : "Data removida");
            } else {
                toast.error("Erro ao atualizar data");
            }
        } catch (error) {
            toast.error("Erro ao atualizar data");
        }
    };

    const handleAssigneeUpdate = async (memberId: string | null) => {
        try {
            const result = await updateTask({ 
                id, 
                assignee_id: memberId 
            });
            if (result.success) {
                onTaskUpdated?.();
                toast.success(memberId ? "Responsável atualizado" : "Responsável removido");
            } else {
                toast.error("Erro ao atualizar responsável");
            }
        } catch (error) {
            toast.error("Erro ao atualizar responsável");
        }
    };


    // Dados para exibição
    const displayTags = tags.length > 0 ? tags : [];
    const displaySubtasks = subtasksCount !== undefined ? subtasksCount : 0;
    const displayComments = commentsCount !== undefined ? commentsCount : 0;
    
    // Preparar objeto da tarefa para o menu de ações
    // Nota: Estamos reconstruindo o objeto tarefa com os dados disponíveis nas props
    // Em um cenário ideal, receberíamos o objeto completo da tarefa
    const taskForMenu = {
        id,
        title,
        description: null,
        status,
        priority,
        due_date: dueDate || null,
        assignee_id: assignees[0]?.id || null, // Tentativa de pegar ID do primeiro assignee se disponível
        workspace_id: null,
        origin_context: {},
    };

    return (
        <div
            ref={setNodeRef}
            style={dragStyle}
            {...attributes}
            {...listeners}
            className={cn(
                "group bg-white rounded-xl p-3 border border-gray-200 shadow-sm w-full relative", // Adicionado relative
                "hover:shadow-md transition-all duration-200 cursor-grab active:cursor-grabbing",
                "flex flex-col h-[112px]",
                isDragging && "shadow-lg rotate-1"
            )}
            onClick={onClick}
            onMouseEnter={() => preloadTask(id, null)}
            onMouseLeave={cancelPreload}
        >
            {/* Menu de Ações Fixo no Canto Superior Direito */}
            <div 
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity z-30 flex items-center gap-1"
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
            >
                <TaskActionsMenu
                    task={taskForMenu}
                    onOpenDetails={onClick}
                    onTaskUpdated={onTaskUpdated}
                    onTaskDeleted={onDelete}
                    members={members}
                />
            </div>

            {/* Traço Colorido do Grupo */}
            {(groupColorClass || isHexColor) && (
                <div 
                    className={cn(
                        "w-[30px] h-[5px] rounded-full mb-3",
                        groupColorClass
                    )}
                    style={isHexColor ? { backgroundColor: groupColor } : undefined}
                />
            )}

            {/* Badge de Status no topo (com cor isolada) */}
            <div className="flex items-center justify-between mb-2">
                <Badge
                    variant="outline"
                    className={cn(
                        "text-[10px] px-2 py-0.5 h-5 font-medium",
                        statusConfig.lightColor
                    )}
                >
                    <div className={cn("w-1.5 h-1.5 rounded-full mr-1.5", statusConfig.color.replace("fill-", "bg-"))} />
                    {statusConfig.label}
                </Badge>
                
                {/* Menu removido daqui e movido para posição absoluta */}
            </div>


            {/* Corpo: Título e Tags */}
            <div className="mb-3 flex-1 flex flex-col min-h-0 relative z-20">
                <div className="flex gap-2">
                    <div onClick={(e) => e.stopPropagation()} className="pt-0.5 flex-shrink-0">
                        <Checkbox 
                            checked={completed} 
                            onCheckedChange={(checked) => {
                                onToggleComplete?.(id, checked === true);
                            }}
                            className="border-gray-300 data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
                        />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                        {isEditingTitle ? (
                            <Textarea
                                ref={titleInputRef}
                                value={titleValue}
                                onChange={(e) => setTitleValue(e.target.value)}
                                onBlur={handleTitleSubmit}
                                onKeyDown={handleTitleKeyDown}
                                className="min-h-[60px] text-sm font-semibold p-1 -ml-1 resize-none bg-white border-blue-200 focus:ring-blue-100"
                                onClick={(e) => e.stopPropagation()}
                                onPointerDown={(e) => e.stopPropagation()}
                                onMouseDown={(e) => e.stopPropagation()}
                            />
                        ) : (
                <h4
                    className={cn(
                                    "font-semibold text-gray-800 text-sm mb-2 leading-snug line-clamp-3 cursor-text hover:text-blue-600 transition-colors",
                        completed && "line-through text-gray-500"
                    )}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsEditingTitle(true);
                                }}
                >
                    {title}
                </h4>
                        )}
                    </div>
                </div>
                
                {displayTags.length > 0 && !isEditingTitle && (
                    <div className="flex items-center gap-1 flex-wrap flex-shrink-0">
                        {displayTags.map((tag, index) => (
                            <span
                                key={index}
                                className={cn(
                                    "text-[10px] px-1.5 py-0.5 rounded-md font-semibold uppercase tracking-wide",
                                    getTagColor(tag)
                                )}
                            >
                                {tag}
                            </span>
                        ))}
                    </div>
                )}
            </div>

            {/* Rodapé: Meta & Social */}
            <div className="mt-auto pt-3 border-t border-gray-50 flex justify-between items-center relative z-20">
                {/* Esquerda: Prazo (Editável) e Ações Rápidas */}
                <div className="flex items-center gap-2">
                    <div 
                        className="flex items-center gap-1.5 cursor-pointer hover:bg-gray-50 rounded px-1 -ml-1 transition-colors"
                        onClick={(e) => e.stopPropagation()}
                        onPointerDown={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                    >
                        <Popover>
                            <PopoverTrigger asChild>
                <div className="flex items-center gap-1.5">
                    {dueDate ? (
                        <>
                                            <CalendarIcon
                                className={cn(
                                    "w-3.5 h-3.5",
                                    isOverdue
                                        ? "text-red-600"
                                        : isToday
                                        ? "text-green-600"
                                        : "text-gray-400"
                                )}
                            />
                            <span
                                className={cn(
                                    "text-xs font-medium",
                                    isOverdue
                                        ? "text-red-600 bg-red-50 px-1.5 py-0.5 rounded"
                                        : isToday
                                        ? "text-green-600"
                                        : "text-gray-500"
                                )}
                            >
                                {new Date(dueDate).toLocaleDateString("pt-BR", {
                                    day: "2-digit",
                                    month: "short",
                                })}
                            </span>
                        </>
                    ) : (
                                        <span className="text-xs text-gray-400 flex items-center gap-1">
                                            <CalendarIcon className="w-3.5 h-3.5" />
                                            <span className="opacity-0 group-hover:opacity-100 transition-opacity">Definir prazo</span>
                                        </span>
                                    )}
                                </div>
                            </PopoverTrigger>
                            <PopoverContent className="p-0 w-auto" align="start">
                                <Calendar
                                    mode="single"
                                    selected={dueDate ? new Date(dueDate) : undefined}
                                    onSelect={handleDateUpdate}
                                    initialFocus
                                />
                                <div className="p-2 border-t">
                                    <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        className="w-full text-xs h-7 text-red-600 hover:text-red-700 hover:bg-red-50"
                                        onClick={() => handleDateUpdate(undefined)}
                                    >
                                        <X className="w-3 h-3 mr-2" />
                                        Remover data
                                    </Button>
                                </div>
                            </PopoverContent>
                        </Popover>
                    </div>

                    {/* Ações Rápidas (Foco e Urgente) */}
                    <TooltipProvider>
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
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
                                            }
                                        }}
                                        className={cn(
                                            "rounded p-0.5 transition-all",
                                            isFocusActive
                                                ? "text-yellow-600 fill-yellow-100 bg-yellow-50 opacity-100"
                                                : "text-gray-300 hover:text-yellow-500 hover:bg-yellow-50"
                                        )}
                                        onPointerDown={(e) => e.stopPropagation()}
                                        onMouseDown={(e) => e.stopPropagation()}
                                    >
                                        <Zap className="w-3.5 h-3.5" />
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent side="bottom">
                                    <p className="text-xs">{isFocusActive ? "Marcado para o próximo domingo" : "Mover para Minha Semana"}</p>
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
                                            }
                                        }}
                                        className={cn(
                                            "rounded p-0.5 transition-all",
                                            isUrgentActive
                                                ? "text-red-600 fill-red-50 bg-red-50 opacity-100"
                                                : "text-gray-300 hover:text-red-500 hover:bg-red-50"
                                        )}
                                        onPointerDown={(e) => e.stopPropagation()}
                                        onMouseDown={(e) => e.stopPropagation()}
                                    >
                                        <AlertTriangle className="w-3.5 h-3.5" />
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent side="bottom">
                                    <p className="text-xs">{isUrgentActive ? "Marcado como urgente" : "Marcar como Urgente"}</p>
                                </TooltipContent>
                            </Tooltip>
                        </div>
                    </TooltipProvider>
                </div>

                {/* Direita: Social Indicators */}
                <div className="flex items-center gap-2">
                    {/* Subtarefas */}
                    {displaySubtasks > 0 && (
                        <div className="flex items-center gap-1 text-gray-400 hover:text-gray-600 transition-colors" title="Subtarefas">
                            <GitPullRequest size={12} strokeWidth={2.5} />
                            <span className="text-[10px] font-semibold">{displaySubtasks}</span>
                        </div>
                    )}

                    {/* Comentários */}
                    {displayComments > 0 && (
                        <div className="flex items-center gap-1 text-gray-400 hover:text-gray-600 transition-colors" title="Comentários">
                            <MessageSquare size={12} strokeWidth={2.5} />
                            <span className="text-[10px] font-semibold">{displayComments}</span>
                        </div>
                    )}

                    {/* Avatar do Responsável (Editável) */}
                    <div 
                        onClick={(e) => e.stopPropagation()}
                        onPointerDown={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                    >
                        <Popover>
                            <PopoverTrigger asChild>
                                <button className="outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-400 rounded-full transition-all hover:scale-105">
                    {assignees.length > 0 ? (
                        <Avatar
                            name={assignees[0].name}
                            avatar={assignees[0].avatar}
                            size="sm"
                            className="border border-white"
                        />
                    ) : (
                                        <div className="size-6 rounded-full border border-dashed border-gray-300 flex items-center justify-center hover:border-gray-400 hover:bg-gray-50 transition-colors bg-white">
                                            <User size={10} className="text-gray-300" />
                        </div>
                    )}
                                </button>
                            </PopoverTrigger>
                            <PopoverContent className="p-0 w-56" align="end">
                                <Command>
                                    <CommandInput placeholder="Buscar membro..." />
                                    <CommandList>
                                        <CommandEmpty>Nenhum membro encontrado.</CommandEmpty>
                                        <CommandGroup>
                                            <CommandItem
                                                onSelect={() => handleAssigneeUpdate(null)}
                                                className="text-xs text-gray-500"
                                            >
                                                <div className="size-5 rounded-full border border-dashed border-gray-300 flex items-center justify-center mr-2">
                                                    <User size={10} />
                                                </div>
                                                Sem responsável
                                            </CommandItem>
                                            {members?.map((member) => (
                                                <CommandItem
                                                    key={member.id}
                                                    onSelect={() => handleAssigneeUpdate(member.id)}
                                                    className="text-xs"
                                                >
                                                    <Avatar
                                                        name={member.name}
                                                        avatar={member.avatar}
                                                        size="sm"
                                                        className="size-5 mr-2"
                                                    />
                                                    {member.name}
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    </div>
                </div>
            </div>
        </div>
    );
}

