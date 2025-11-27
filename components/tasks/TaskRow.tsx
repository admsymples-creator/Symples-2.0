"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { Avatar, AvatarGroup } from "./Avatar";
import { MoreVertical, GripVertical, Zap, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface TaskRowProps {
    id: string;
    title: string;
    completed: boolean;
    priority?: "low" | "medium" | "high" | "urgent";
    status: string;
    assignees?: Array<{ name: string; avatar?: string }>;
    dueDate?: string;
    tags?: string[];
    hasUpdates?: boolean;
    onClick?: () => void;
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
    isLast = false,
}: TaskRowProps) {
    const isOverdue = dueDate && new Date(dueDate) < new Date() && !completed;
    const statusInfo = getStatusConfig(status);
    
    // Lógica de Smart Triggers
    const isFocusActive = isNextSunday(dueDate);
    const isUrgentActive = isToday(dueDate) || priority === "high" || priority === "urgent";

    return (
        <TooltipProvider>
            <div
                className={cn(
                    "h-12 hover:bg-gray-50 transition-colors cursor-pointer group",
                    "grid grid-cols-[20px_3px_auto_1fr_auto_120px_100px_120px_40px] items-center gap-2 px-4",
                    !isLast && "border-b border-gray-50"
                )}
                onClick={onClick}
            >
                {/* Drag Handle (visível apenas no hover) */}
                <div className="flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <GripVertical className="w-4 h-4 text-gray-300 cursor-grab active:cursor-grabbing" />
                </div>

                {/* Linha vertical de prioridade (mais fina e arredondada) */}
                <div className={cn("w-[3px] h-full rounded-full", priorityColors[priority])} />

                {/* Checkbox */}
                <div onClick={(e) => e.stopPropagation()}>
                    <Checkbox checked={completed} />
                </div>

                {/* Título com tags e indicador de atualização */}
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
                    <span
                        className={cn(
                            "text-sm text-gray-900 truncate",
                            hasUpdates ? "font-semibold" : "font-medium",
                            completed && "line-through text-gray-500"
                        )}
                    >
                        {title}
                    </span>
                </div>

                {/* Ações Rápidas (visíveis apenas no hover, ou sempre se ativo) */}
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
                                    "h-7 w-7 transition-all duration-200 active:scale-110",
                                    isFocusActive
                                        ? "fill-yellow-400 text-yellow-600 hover:bg-yellow-50"
                                        : "text-gray-400 hover:text-yellow-500 hover:bg-yellow-50"
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
                                    "h-7 w-7 transition-all duration-200 active:scale-110",
                                    isUrgentActive
                                        ? "fill-red-400 text-red-600 hover:bg-red-50"
                                        : "text-gray-400 hover:text-red-500 hover:bg-red-50"
                                )}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    const today = new Date();
                                    today.setHours(0, 0, 0, 0);
                                    console.log("Urgente: Definir due_date para hoje e prioridade alta", today.toISOString());
                                    // TODO: Implementar ação no backend
                                }}
                            >
                                <AlertTriangle className={cn("w-4 h-4", isUrgentActive && "fill-current")} />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>{isUrgentActive ? "Marcado como urgente" : "Marcar como Urgente"}</p>
                        </TooltipContent>
                    </Tooltip>
                </div>

                {/* Responsáveis */}
                <div className="flex items-center justify-center min-w-[80px]">
                    {assignees.length > 0 ? (
                        <AvatarGroup users={assignees} max={3} size="sm" />
                    ) : (
                        <span className="text-xs text-gray-400">—</span>
                    )}
                </div>

                {/* Data */}
                <div className="text-xs text-right">
                    {dueDate ? (
                        <span
                            className={cn(
                                "text-gray-500",
                                isToday(dueDate) && "text-red-600 font-bold",
                                isOverdue && !isToday(dueDate) && "text-red-600 font-medium"
                            )}
                        >
                            {new Date(dueDate).toLocaleDateString("pt-BR", {
                                day: "2-digit",
                                month: "short",
                            })}
                        </span>
                    ) : (
                        <span className="text-gray-400">—</span>
                    )}
                </div>

                {/* Status Badge */}
                <div className="flex items-center gap-1.5">
                    <div className={cn("w-2 h-2 rounded-full flex-shrink-0", statusInfo.dotColor)} />
                    <span className="text-xs text-gray-500 whitespace-nowrap">{statusInfo.label}</span>
                </div>

                {/* Ações (menu) */}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                            e.stopPropagation();
                            // TODO: Abrir menu de ações
                        }}
                    >
                        <MoreVertical className="w-4 h-4 text-gray-500" />
                    </Button>
                </div>
            </div>
        </TooltipProvider>
    );
}

