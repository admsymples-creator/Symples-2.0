"use client";

import React from "react";
import { Avatar } from "./Avatar";
import { Calendar, MoreHorizontal, Paperclip, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface TaskCardProps {
    id: string;
    title: string;
    completed: boolean;
    priority?: "low" | "medium" | "high" | "urgent";
    assignees?: Array<{ name: string; avatar?: string }>;
    dueDate?: string;
    tags?: string[];
    checklistTotal?: number;
    checklistCompleted?: number;
    attachmentsCount?: number;
    commentsCount?: number;
    onClick?: () => void;
    onEdit?: () => void;
    onDelete?: () => void;
}

// Cores de prioridade para badge
const priorityBadgeColors = {
    low: "bg-blue-50 text-blue-600",
    medium: "bg-yellow-50 text-yellow-600",
    high: "bg-orange-50 text-orange-600",
    urgent: "bg-red-50 text-red-600",
};

// Labels de prioridade
const priorityLabels = {
    low: "Baixa",
    medium: "Média",
    high: "Alta",
    urgent: "Urgente",
};

function TaskCardComponent({
    id,
    title,
    completed,
    priority = "medium",
    assignees = [],
    dueDate,
    tags = [],
    checklistTotal = 0,
    checklistCompleted = 0,
    attachmentsCount = 0,
    commentsCount = 0,
    onClick,
    onEdit,
    onDelete,
}: TaskCardProps) {
    const isOverdue = dueDate && new Date(dueDate) < new Date() && !completed;
    const isToday = dueDate && new Date(dueDate).toDateString() === new Date().toDateString();

    // Calcular progresso do checklist
    const progress = checklistTotal > 0 ? (checklistCompleted / checklistTotal) * 100 : 0;

    // Hook do dnd-kit para tornar o card sortable
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

    // Primeira tag ou prioridade para o badge
    const displayTag = tags.length > 0 ? tags[0] : priorityLabels[priority];
    const displayTagColor = tags.length > 0 
        ? "bg-gray-100 text-gray-600" 
        : priorityBadgeColors[priority];

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className={cn(
                "group bg-white rounded-xl p-4 border border-gray-200 shadow-sm",
                "hover:border-green-400 hover:shadow-md cursor-grab active:cursor-grabbing transition-all",
                "flex flex-col",
                isDragging && "shadow-lg rotate-1"
            )}
            onClick={onClick}
        >
            {/* 1. Header (Contexto) */}
            <div className="flex justify-between items-start mb-2">
                {/* Badge de Prioridade/Tag */}
                <span
                    className={cn(
                        "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide",
                        displayTagColor
                    )}
                >
                    {displayTag}
                </span>

                {/* Menu "..." (visível no hover) */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-gray-300 hover:text-gray-600 hover:bg-gray-50 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <MoreHorizontal size={14} />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                        {onEdit && (
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }}>
                                Editar
                            </DropdownMenuItem>
                        )}
                        {onDelete && (
                            <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    onClick={(e) => { e.stopPropagation(); onDelete(); }}
                                    className="text-red-600 focus:bg-red-50 focus:text-red-600"
                                >
                                    Excluir
                                </DropdownMenuItem>
                            </>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* 2. Corpo (Conteúdo) */}
            <div className="mb-3">
                {/* Título */}
                <h4
                    className={cn(
                        "font-semibold text-sm text-gray-900 mt-3 mb-1 line-clamp-2 leading-tight",
                        completed && "line-through text-gray-500"
                    )}
                >
                    {title}
                </h4>

                {/* Barra de Progresso (se tiver subtarefas) */}
                {checklistTotal > 0 && (
                    <div className="mt-2 mb-1">
                        <div className="h-1 bg-gray-100 rounded-full overflow-hidden w-full">
                            <div
                                className="h-full bg-green-500 rounded-full transition-all duration-300 ease-out"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* 3. Rodapé (Meta Info) */}
            <div className="mt-4 flex items-center justify-between pt-3 border-t border-gray-50">
                {/* Esquerda: Avatar do Responsável */}
                <div className="flex items-center">
                    {assignees.length > 0 ? (
                        <Avatar
                            name={assignees[0].name}
                            avatar={assignees[0].avatar}
                            size="sm"
                            className="size-6 border border-white"
                        />
                    ) : (
                        <div className="size-6 rounded-full border border-dashed border-gray-300 flex items-center justify-center">
                            <span className="text-[8px] text-gray-300">?</span>
                        </div>
                    )}
                </div>

                {/* Direita: Indicadores */}
                <div className="flex items-center gap-3 text-gray-400 text-xs">
                    {/* Ícone de Anexo */}
                    {attachmentsCount > 0 && (
                        <div className="flex items-center gap-1" title={`${attachmentsCount} anexo(s)`}>
                            <Paperclip size={12} strokeWidth={2.5} />
                        </div>
                    )}

                    {/* Ícone de Comentário + Contagem */}
                    {commentsCount > 0 && (
                        <div className="flex items-center gap-1" title={`${commentsCount} comentário(s)`}>
                            <MessageSquare size={12} strokeWidth={2.5} />
                            <span className="text-[10px] font-semibold">{commentsCount}</span>
                        </div>
                    )}

                    {/* Data de Entrega */}
                    {dueDate && (
                        <div className="flex items-center gap-1">
                            <Calendar
                                className={cn(
                                    "w-3 h-3",
                                    isOverdue
                                        ? "text-red-600"
                                        : isToday
                                        ? "text-green-600"
                                        : "text-gray-400"
                                )}
                            />
                            <span
                                className={cn(
                                    "text-[10px] font-medium",
                                    isOverdue
                                        ? "text-red-600"
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
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// Exportar sem memo para evitar loops de renderização
// O memo pode causar problemas quando props são recriadas a cada render
export const TaskCard = TaskCardComponent;

