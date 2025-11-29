"use client";

import { useState, useRef, useEffect } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Avatar, AvatarGroup } from "./Avatar";
import {
    MoreVertical,
    GripVertical,
    Zap,
    AlertCircle,
    Maximize2,
    MessageCircle,
    Copy,
    Trash2,
    Calendar as CalendarIcon,
    User,
    Plus,
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface TaskRowProps {
    id: string;
    title: string;
    completed: boolean;
    priority?: "low" | "medium" | "high" | "urgent";
    status: string;
    assignees?: Array<{ name: string; avatar?: string; id?: string }>;
    dueDate?: string;
    tags?: string[];
    hasUpdates?: boolean;
    onClick?: () => void;
    onToggleComplete?: (id: string, completed: boolean) => void;
    onUpdate?: (id: string, updates: { title?: string; dueDate?: string | null; assigneeId?: string | null }) => void;
    workspaceId?: string | null;
    isLast?: boolean;
}

const priorityColors = {
    low: "bg-blue-500",
    medium: "bg-yellow-500",
    high: "bg-orange-500",
    urgent: "bg-red-500",
};

// Função para obter configuração de status baseado no valor
const getStatusConfig = (status: string) => {
    const statusLower = status.toLowerCase();
    
    // Mapeamento para status customizáveis
    if (statusLower.includes("backlog") || statusLower === "todo" || statusLower === "não iniciado") {
        return { label: status, color: "bg-gray-400", dotColor: "bg-gray-400" };
    }
    if (statusLower.includes("triagem") || statusLower.includes("execução") || statusLower === "in_progress" || statusLower === "em progresso") {
        return { label: status, color: "bg-yellow-400", dotColor: "bg-yellow-400" };
    }
    if (statusLower.includes("revisão") || statusLower === "done" || statusLower === "finalizado") {
        return { label: status, color: "bg-green-500", dotColor: "bg-green-500" };
    }
    
    // Default
    return { label: status, color: "bg-gray-400", dotColor: "bg-gray-400" };
};

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

export function TaskRow({
    id,
    title,
    completed,
    priority = "medium",
    status,
    assignees = [],
    dueDate,
    tags = [],
    hasUpdates = false,
    onClick,
    onToggleComplete,
    onUpdate,
    workspaceId = null,
    isLast = false,
}: TaskRowProps) {
    // Estados para edição inline
    const [editingTitle, setEditingTitle] = useState(false);
    const [isDatePopoverOpen, setIsDatePopoverOpen] = useState(false);
    const [isAssigneePopoverOpen, setIsAssigneePopoverOpen] = useState(false);
    const [titleValue, setTitleValue] = useState(title);
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(dueDate ? new Date(dueDate) : undefined);
    const [availableUsers, setAvailableUsers] = useState<Array<{ id: string; name: string; avatar?: string }>>([]);
    const [isLoadingUsers, setIsLoadingUsers] = useState(false);
    
    const titleInputRef = useRef<HTMLInputElement>(null);

    // Sincronizar valores quando props mudam
    useEffect(() => {
        setTitleValue(title);
    }, [title]);

    useEffect(() => {
        setSelectedDate(dueDate ? new Date(dueDate) : undefined);
    }, [dueDate]);

    // Carregar usuários quando abrir popover de assignee
    useEffect(() => {
        if (isAssigneePopoverOpen && availableUsers.length === 0 && !isLoadingUsers) {
            const loadUsers = async () => {
                setIsLoadingUsers(true);
                try {
                    const { getWorkspaceMembers } = await import("@/lib/actions/tasks");
                    const members = await getWorkspaceMembers(workspaceId);
                    setAvailableUsers(
                        members.map((m) => ({
                            id: m.id,
                            name: m.full_name || m.email || 'Usuário',
                            avatar: m.avatar_url || undefined,
                        }))
                    );
                } catch (error) {
                    console.error("Erro ao carregar usuários:", error);
                } finally {
                    setIsLoadingUsers(false);
                }
            };
            loadUsers();
        }
    }, [isAssigneePopoverOpen, workspaceId, availableUsers.length, isLoadingUsers]);

    // Focar no input quando entrar em modo de edição
    useEffect(() => {
        if (editingTitle && titleInputRef.current) {
            titleInputRef.current.focus();
            titleInputRef.current.select();
        }
    }, [editingTitle]);

    const isOverdue = dueDate && new Date(dueDate) < new Date() && !completed;
    const statusInfo = getStatusConfig(status);
    
    // Lógica de Smart Triggers
    const isFocusActive = isNextSunday(dueDate);
    const isUrgentActive = isToday(dueDate) || priority === "high" || priority === "urgent";

    // Handlers para salvar edições
    const handleSaveTitle = async () => {
        if (titleValue.trim() && titleValue.trim() !== title) {
            const { updateTask } = await import("@/lib/actions/tasks");
            const result = await updateTask({
                id,
                title: titleValue.trim(),
            });
            if (result.success && onUpdate) {
                onUpdate(id, { title: titleValue.trim() });
            }
        }
        setEditingTitle(false);
    };

    const handleDateSelect = async (date: Date | undefined) => {
        setSelectedDate(date);
        const newDate = date ? date.toISOString() : null;
        const currentDate = dueDate ? new Date(dueDate).toISOString() : null;
        
        if (newDate !== currentDate) {
            const { updateTask } = await import("@/lib/actions/tasks");
            const result = await updateTask({
                id,
                due_date: newDate,
            });
            if (result.success && onUpdate) {
                onUpdate(id, { dueDate: newDate });
            }
        }
        setIsDatePopoverOpen(false);
    };

    const handleAssigneeSelect = async (userId: string | null) => {
        const currentAssigneeId = assignees[0]?.id || null;
        
        if (userId !== currentAssigneeId) {
            const { updateTask } = await import("@/lib/actions/tasks");
            const result = await updateTask({
                id,
                assignee_id: userId,
            });
            if (result.success && onUpdate) {
                onUpdate(id, { assigneeId: userId });
            }
        }
        setIsAssigneePopoverOpen(false);
    };

    // Hook do dnd-kit para tornar a linha sortable
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    // Determinar cor da borda esquerda baseada na prioridade/workspace
    const borderColorClass = priorityColors[priority];
    // Extrair a cor do Tailwind para usar no estilo inline
    const borderColorMap: Record<string, string> = {
        "bg-blue-500": "#3b82f6",
        "bg-yellow-500": "#eab308",
        "bg-orange-500": "#f97316",
        "bg-red-500": "#ef4444",
    };
    const borderColorValue = borderColorMap[borderColorClass] || "#eab308";

    return (
        <TooltipProvider>
            <div
                ref={setNodeRef}
                style={{
                    ...style,
                    borderLeftColor: borderColorValue,
                }}
                className={cn(
                    "h-12 hover:bg-gray-50 transition-colors cursor-pointer group",
                    "grid grid-cols-[20px_auto_1fr_auto_120px_100px_120px_40px] items-center gap-2 px-0",
                    !isLast && "border-b border-gray-50",
                    isDragging && "shadow-lg bg-white rounded-lg",
                    // Border left colorida (4px) com padding para respiro
                    "border-l-4 pl-3"
                )}
                onClick={onClick}
            >
                {/* Drag Handle (estilo Linear - invisível até hover) */}
                <div 
                    {...attributes}
                    {...listeners}
                    className="flex items-center justify-center"
                >
                    <GripVertical className="w-4 h-4 text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                </div>

                {/* Checkbox Sutil */}
                <div onClick={(e) => e.stopPropagation()} className="flex items-center">
                    <Checkbox 
                        checked={completed} 
                        onCheckedChange={(checked) => {
                            if (onToggleComplete) {
                                onToggleComplete(id, checked === true);
                            }
                        }}
                        className={cn(
                            "h-4 w-4 rounded border-2 transition-colors",
                            completed 
                                ? "bg-green-500 border-green-500 data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
                                : "border-gray-200 hover:border-gray-400 bg-transparent"
                        )}
                    />
                </div>

                {/* Título com tags e indicador de atualização (alinhamento vertical preciso) */}
                <div className="flex items-center gap-2 min-w-0">
                    {/* Indicador de atualização não lida */}
                    {hasUpdates && (
                        <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                    )}
                    
                    {tags.length > 0 && (
                        <div className="flex items-center gap-1 flex-shrink-0">
                            {tags.map((tag, index) => (
                                <Badge
                                    key={index}
                                    variant="secondary"
                                    className="text-[10px] px-1.5 py-0 font-medium bg-gray-100 text-gray-700"
                                >
                                    {tag}
                                </Badge>
                            ))}
                        </div>
                    )}
                    {editingTitle ? (
                        <Input
                            ref={titleInputRef}
                            value={titleValue}
                            onChange={(e) => setTitleValue(e.target.value)}
                            onBlur={handleSaveTitle}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleSaveTitle();
                                } else if (e.key === 'Escape') {
                                    setTitleValue(title);
                                    setEditingTitle(false);
                                }
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="h-7 text-sm font-medium border-gray-300 focus:border-green-500 focus:ring-1 focus:ring-green-500"
                        />
                    ) : (
                        <span
                            onClick={(e) => {
                                e.stopPropagation();
                                setEditingTitle(true);
                            }}
                            className={cn(
                                "text-sm text-gray-900 truncate leading-tight cursor-text hover:bg-gray-100 px-1 py-0.5 rounded transition-colors",
                                hasUpdates ? "font-semibold" : "font-medium",
                                completed && "line-through text-gray-500"
                            )}
                        >
                            {title}
                        </span>
                    )}
                </div>

                {/* Ações Rápidas (hierarquia visual - sutis quando inativos) */}
                <div
                    className={cn(
                        "flex items-center gap-1 transition-opacity pointer-events-none group-hover:pointer-events-auto",
                        isFocusActive || isUrgentActive
                            ? "opacity-100"
                            : "opacity-0 group-hover:opacity-100"
                    )}
                >
                    {/* Botão: Atacar na Semana (Foco Semanal) */}
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className={cn(
                                    "h-7 w-7 transition-all duration-200",
                                    isFocusActive
                                        ? "bg-yellow-50 text-yellow-600 rounded-md p-1 hover:bg-yellow-100"
                                        : "text-gray-200 hover:text-gray-400"
                                )}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    const nextSunday = getNextSunday();
                                    console.log("Foco Semanal: Definir due_date para", nextSunday.toISOString());
                                    // TODO: Implementar ação no backend
                                }}
                            >
                                <Zap className={cn("w-4 h-4", isFocusActive && "fill-current")} />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>{isFocusActive ? "Marcado para o próximo domingo" : "Mover para Minha Semana"}</p>
                        </TooltipContent>
                    </Tooltip>

                    {/* Botão: Urgência */}
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className={cn(
                                    "h-7 w-7 transition-all duration-200",
                                    isUrgentActive
                                        ? "bg-red-50 text-red-600 rounded-md p-1 hover:bg-red-100"
                                        : "text-gray-200 hover:text-gray-400"
                                )}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    const today = new Date();
                                    today.setHours(0, 0, 0, 0);
                                    console.log("Urgente: Definir due_date para hoje e prioridade alta", today.toISOString());
                                    // TODO: Implementar ação no backend
                                }}
                            >
                                <AlertCircle className={cn("w-4 h-4", isUrgentActive && "text-red-600")} />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>{isUrgentActive ? "Marcado como urgente" : "Marcar como Urgente"}</p>
                        </TooltipContent>
                    </Tooltip>
                </div>

                {/* Responsáveis - Empty State com círculo tracejado + Popover com lista */}
                <div className="flex items-center justify-end min-w-[80px]">
                    <Popover open={isAssigneePopoverOpen} onOpenChange={setIsAssigneePopoverOpen}>
                        <PopoverTrigger asChild>
                            <div
                                onClick={(e) => e.stopPropagation()}
                                className="cursor-pointer hover:opacity-80 transition-opacity"
                            >
                                {assignees.length > 0 ? (
                                    <AvatarGroup users={assignees} max={3} size="sm" />
                                ) : (
                                    <div className="size-6 rounded-full border-dashed border-gray-300 flex items-center justify-center hover:border-gray-400 transition-colors">
                                        <User className="w-3 h-3 text-gray-300" />
                                    </div>
                                )}
                            </div>
                        </PopoverTrigger>
                        <PopoverContent 
                            className="w-64 p-2" 
                            align="end"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="space-y-1">
                                <button
                                    onClick={() => handleAssigneeSelect(null)}
                                    className={cn(
                                        "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors text-left",
                                        assignees.length === 0
                                            ? "bg-gray-100 text-gray-900"
                                            : "hover:bg-gray-50 text-gray-700"
                                    )}
                                >
                                    <div className="size-8 rounded-full border-dashed border-gray-300 flex items-center justify-center flex-shrink-0">
                                        <User className="w-4 h-4 text-gray-400" />
                                    </div>
                                    <span className="font-medium">Sem responsável</span>
                                </button>
                                {isLoadingUsers ? (
                                    <div className="px-3 py-2 text-sm text-gray-500">Carregando...</div>
                                ) : (
                                    availableUsers.map((user) => (
                                        <button
                                            key={user.id}
                                            onClick={() => handleAssigneeSelect(user.id)}
                                            className={cn(
                                                "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors text-left",
                                                assignees[0]?.id === user.id
                                                    ? "bg-gray-100 text-gray-900"
                                                    : "hover:bg-gray-50 text-gray-700"
                                            )}
                                        >
                                            <Avatar
                                                name={user.name}
                                                avatar={user.avatar}
                                                size="sm"
                                            />
                                            <span className="font-medium truncate">{user.name}</span>
                                        </button>
                                    ))
                                )}
                            </div>
                        </PopoverContent>
                    </Popover>
                </div>

                {/* Data - Empty State com ícone no hover + Popover com Calendário */}
                <div className="text-xs text-right flex items-center justify-end min-w-[100px]">
                    <Popover open={isDatePopoverOpen} onOpenChange={setIsDatePopoverOpen}>
                        <PopoverTrigger asChild>
                            {dueDate ? (
                                <span
                                    onClick={(e) => e.stopPropagation()}
                                    className={cn(
                                        "text-gray-400 cursor-pointer hover:bg-gray-100 px-1 py-0.5 rounded transition-colors",
                                        isToday(dueDate) && "text-red-500 font-medium",
                                        isOverdue && !isToday(dueDate) && "text-red-500 font-medium"
                                    )}
                                >
                                    {format(new Date(dueDate), "dd MMM", { locale: ptBR })}
                                </span>
                            ) : (
                                <div
                                    onClick={(e) => e.stopPropagation()}
                                    className="cursor-pointer"
                                >
                                    <CalendarIcon className="w-4 h-4 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity hover:text-gray-400" />
                                </div>
                            )}
                        </PopoverTrigger>
                        <PopoverContent 
                            className="w-auto p-0" 
                            align="end"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <Calendar
                                mode="single"
                                selected={selectedDate}
                                onSelect={handleDateSelect}
                                initialFocus
                                locale={ptBR}
                            />
                        </PopoverContent>
                    </Popover>
                </div>

                {/* Status Badge - Alinhado à direita */}
                <div className="flex items-center gap-1.5 justify-end min-w-[120px]">
                    <div className={cn("w-2 h-2 rounded-full flex-shrink-0", statusInfo.dotColor)} />
                    <span className="text-xs text-gray-500 whitespace-nowrap">{statusInfo.label}</span>
                </div>

                {/* Menu de Ações da Tarefa */}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={(e) => {
                                    e.stopPropagation();
                                }}
                            >
                                <MoreVertical className="w-4 h-4 text-gray-500" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onClick?.();
                                }}
                            >
                                <Maximize2 className="w-4 h-4 mr-2" />
                                Abrir Detalhes
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={(e) => {
                                    e.stopPropagation();
                                    console.log("Ver no WhatsApp:", id);
                                    // TODO: Implementar visualização no WhatsApp
                                }}
                                className="text-green-600 focus:bg-green-50 focus:text-green-600"
                            >
                                <MessageCircle className="w-4 h-4 mr-2" />
                                Ver no WhatsApp
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={(e) => {
                                    e.stopPropagation();
                                    console.log("Duplicar tarefa:", id);
                                    // TODO: Implementar duplicação
                                }}
                            >
                                <Copy className="w-4 h-4 mr-2" />
                                Duplicar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                onClick={(e) => {
                                    e.stopPropagation();
                                    console.log("Excluir tarefa:", id);
                                    // TODO: Implementar exclusão
                                }}
                                className="text-red-600 focus:bg-red-50 focus:text-red-600"
                            >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Excluir
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </TooltipProvider>
    );
}

