"use client";

import React from "react";
import { MoreHorizontal, Calendar, GitPullRequest, MessageSquare } from "lucide-react";
import { Avatar } from "./Avatar";
import { cn } from "@/lib/utils";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { TASK_CONFIG, mapLabelToStatus } from "@/lib/config/tasks";
import { Badge } from "@/components/ui/badge";

interface KanbanCardProps {
    id: string;
    title: string;
    completed?: boolean;
    status?: string; // Status da tarefa (label da UI ou status do banco)
    priority?: "low" | "medium" | "high" | "urgent";
    assignees?: Array<{ name: string; avatar?: string }>;
    dueDate?: string;
    tags?: string[];
    workspaceColor?: string; // Cor do workspace/grupo para o traço superior
    subtasksCount?: number;
    commentsCount?: number;
    onClick?: () => void;
    onEdit?: () => void;
    onDelete?: () => void;
}

// Cores de tags baseadas no nome da tag
const getTagColor = (tag: string): string => {
    const tagLower = tag.toLowerCase();
    if (tagLower.includes("marketing") || tagLower.includes("mkt")) {
        return "bg-orange-50 text-orange-600";
    }
    if (tagLower.includes("design") || tagLower.includes("ui") || tagLower.includes("ux")) {
        return "bg-purple-50 text-purple-600";
    }
    if (tagLower.includes("dev") || tagLower.includes("frontend") || tagLower.includes("backend")) {
        return "bg-blue-50 text-blue-600";
    }
    if (tagLower.includes("bug") || tagLower.includes("fix")) {
        return "bg-red-50 text-red-600";
    }
    if (tagLower.includes("financeiro") || tagLower.includes("finance")) {
        return "bg-emerald-50 text-emerald-600";
    }
    // Default
    return "bg-gray-100 text-gray-600";
};

// Função para gerar cor do workspace baseada no ID (se não fornecido)
const getWorkspaceColor = (workspaceId: string | null | undefined): string => {
    if (!workspaceId) return "#22C55E"; // Verde padrão

    // Hash simples baseado no ID para gerar cor consistente
    let hash = 0;
    for (let i = 0; i < workspaceId.length; i++) {
        hash = workspaceId.charCodeAt(i) + ((hash << 5) - hash);
    }

    // Gerar cores vibrantes mas não muito claras/escuras
    const hue = Math.abs(hash % 360);
    const saturation = 60 + (Math.abs(hash) % 20); // 60-80%
    const lightness = 45 + (Math.abs(hash) % 15); // 45-60%

    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
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
    workspaceColor,
    subtasksCount,
    commentsCount,
    onClick,
    onEdit,
    onDelete,
}: KanbanCardProps) {
    const isOverdue = dueDate && new Date(dueDate) < new Date() && !completed;
    const isToday = dueDate && new Date(dueDate).toDateString() === new Date().toDateString();
    
    // Obter configuração do status (apenas label, sem cores)
    const dbStatus = mapLabelToStatus(status);
    const statusConfig = TASK_CONFIG[dbStatus] || TASK_CONFIG.todo;

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

    // Dados para exibição
    const displayTags = tags.length > 0 ? tags : [];
    const displaySubtasks = subtasksCount !== undefined ? subtasksCount : 0;
    const displayComments = commentsCount !== undefined ? commentsCount : 0;
    
    // Cor do workspace (usa a cor fornecida ou gera baseada no ID)
    const groupColor = workspaceColor || getWorkspaceColor(id);

    return (
        <div
            ref={setNodeRef}
            style={dragStyle}
            {...attributes}
            {...listeners}
            className={cn(
                "group bg-white rounded-xl p-4 border border-gray-200 shadow-sm w-full",
                "hover:shadow-md transition-all duration-200 cursor-grab active:cursor-grabbing",
                "flex flex-col h-[140px]",
                isDragging && "shadow-lg rotate-1"
            )}
            onClick={onClick}
        >
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
                
                {/* Menu */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-gray-300 hover:text-gray-600 hover:bg-gray-50"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <MoreHorizontal size={14} />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit?.(); }}>
                            Editar
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            onClick={(e) => { e.stopPropagation(); onDelete?.(); }}
                            className="text-red-600 focus:bg-red-50 focus:text-red-600"
                        >
                            Excluir
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* Corpo: Título e Tags */}
            <div className="mb-3 flex-1 flex flex-col min-h-0">
                <h4
                    className={cn(
                        "font-semibold text-gray-800 text-sm mb-2 leading-snug line-clamp-3 flex-shrink-0",
                        completed && "line-through text-gray-500"
                    )}
                >
                    {title}
                </h4>
                {displayTags.length > 0 && (
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
            <div className="mt-auto pt-3 border-t border-gray-50 flex justify-between items-center">
                {/* Esquerda: Prazo */}
                <div className="flex items-center gap-1.5">
                    {dueDate ? (
                        <>
                            <Calendar
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
                        <span className="text-xs text-gray-400">Sem prazo</span>
                    )}
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

                    {/* Avatar do Responsável */}
                    {assignees.length > 0 ? (
                        <Avatar
                            name={assignees[0].name}
                            avatar={assignees[0].avatar}
                            size="sm"
                            className="border border-white"
                        />
                    ) : (
                        <div className="size-6 rounded-full border border-dashed border-gray-300 flex items-center justify-center">
                            <span className="text-[8px] text-gray-300">?</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

