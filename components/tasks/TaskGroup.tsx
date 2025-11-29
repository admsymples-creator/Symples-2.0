"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, ChevronRight, Plus, Circle, MoreHorizontal, Pencil, Palette, Trash2 } from "lucide-react";
import { TaskRow } from "./TaskRow";
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
    assignees?: Array<{ name: string; avatar?: string; id?: string }>;
    dueDate?: string;
    tags?: string[];
    hasUpdates?: boolean;
    workspaceId?: string | null;
}

interface TaskGroupProps {
    id: string;
    title: string;
    icon?: string;
    tasks: Task[];
    onTaskClick?: (taskId: string) => void;
    onAddTask?: (title: string, context: { status?: string; priority?: string; assignee?: string }) => void;
    onToggleComplete?: (taskId: string, completed: boolean) => void;
    onTaskUpdate?: (taskId: string, updates: { title?: string; dueDate?: string | null; assigneeId?: string | null }) => void;
    defaultCollapsed?: boolean;
    groupBy?: "status" | "priority" | "assignee";
}

export function TaskGroup({
    id,
    title,
    icon,
    tasks,
    onTaskClick,
    onAddTask,
    onToggleComplete,
    onTaskUpdate,
    defaultCollapsed = false,
    groupBy = "status",
}: TaskGroupProps) {
    const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
    const [isHovered, setIsHovered] = useState(false);
    const [isQuickAddActive, setIsQuickAddActive] = useState(false);
    const [quickAddValue, setQuickAddValue] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);

    const completedCount = tasks.filter((t) => t.completed).length;
    const totalCount = tasks.length;

    // Tornar o grupo um droppable
    const { setNodeRef, isOver } = useDroppable({
        id: id,
    });

    // Focar no input quando Quick Add é ativado
    useEffect(() => {
        if (isQuickAddActive && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isQuickAddActive]);

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

    // Função auxiliar para processar texto e limpar marcadores de lista
    const processBatchText = (text: string): string[] => {
        // Dividir por quebras de linha (suporta \n e \r\n)
        const lines = text.split(/\r?\n/);
        
        // Filtrar linhas vazias e processar cada linha
        return lines
            .map(line => line.trim())
            .filter(line => line.length > 0)
            .map(line => {
                // Remover marcadores de lista comuns no início da linha
                // Remove: "- ", "* ", "• ", números como "1. ", "2. ", etc.
                return line.replace(/^[-*•]\s+/, '').replace(/^\d+\.\s+/, '').trim();
            })
            .filter(line => line.length > 0);
    };

    const handleQuickAddSubmit = async (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" && quickAddValue) {
            const text = quickAddValue; // Não usar trim() aqui para preservar quebras de linha
            if (!text.trim()) return;
            
            const context = getGroupContext();
            
            // Verificar se o texto contém quebras de linha (batch create)
            // Verificar tanto \n quanto \r\n (Windows)
            const hasLineBreaks = text.includes('\n') || text.includes('\r\n');
            
            // Processar: se houver quebras, criar múltiplas tarefas; senão, criar uma única
            const taskTitles = hasLineBreaks ? processBatchText(text) : [text.trim()];

            if (taskTitles.length === 0) {
                setQuickAddValue("");
                setIsQuickAddActive(false);
                return;
            }

            // Limite de segurança: se houver mais de 20 tarefas, pedir confirmação
            const HARD_LIMIT = 20;
            if (taskTitles.length > HARD_LIMIT) {
                const confirmed = window.confirm(
                    `Você está prestes a criar ${taskTitles.length} tarefas de uma vez. Tem certeza?`
                );
                if (!confirmed) {
                    // Manter o texto no input se o usuário cancelar
                    return;
                }
            }

            // Limpar input imediatamente (Optimistic UI)
            setQuickAddValue("");
            setIsQuickAddActive(false);

            // Criar todas as tarefas
            // Usar Promise.all para criar em paralelo, mas aguardar todas completarem
            const createPromises = taskTitles.map(title => 
                onAddTask?.(title, context)
            );
            
            await Promise.all(createPromises);
        } else if (e.key === "Escape") {
            setIsQuickAddActive(false);
            setQuickAddValue("");
        }
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
            <div className="flex items-center gap-2 h-8 mb-2 px-1 group">
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
                <div className="flex items-center gap-2">
                    {icon && <span className="text-xs">{icon}</span>}
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">{title}</h3>
                    <Badge variant="outline" className="text-xs px-2 py-0 bg-gray-100 text-gray-600 border-gray-200">
                        {completedCount}/{totalCount}
                    </Badge>

                    {/* Menu de Ações do Grupo */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                    }}
                                >
                                    <MoreHorizontal className="w-4 h-4 text-gray-500" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-48">
                                <DropdownMenuItem
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        console.log("Editar grupo:", title);
                                        // TODO: Implementar edição
                                    }}
                                >
                                    <Pencil className="w-4 h-4 mr-2" />
                                    Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        console.log("Mudar cor do grupo:", title);
                                        // TODO: Implementar mudança de cor
                                    }}
                                >
                                    <Palette className="w-4 h-4 mr-2" />
                                    Mudar Cor
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        console.log("Excluir grupo:", title);
                                        // TODO: Implementar exclusão
                                    }}
                                    className="text-red-600 focus:bg-red-50 focus:text-red-600"
                                >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Excluir Grupo
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </div>

            {/* Lista de Tarefas */}
            {!isCollapsed && (
                <div className="bg-white border border-gray-100 rounded-lg overflow-hidden">
                    {tasks.length === 0 ? (
                        <div className="py-8 text-center text-sm text-gray-500">
                            Nenhuma tarefa neste grupo
                        </div>
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
                                    onUpdate={onTaskUpdate}
                                    workspaceId={task.workspaceId}
                                    isLast={index === tasks.length - 1}
                                />
                            ))}
                        </SortableContext>
                    )}

                    {/* Quick Add no rodapé - Ghost Row */}
                    <div
                        className={cn(
                            "h-12 border-b border-gray-100 hover:bg-gray-50 transition-colors",
                            "grid grid-cols-[20px_3px_auto_1fr_auto_120px_100px_120px_40px] items-center gap-2 px-4"
                        )}
                    >
                        {/* Espaço do Drag Handle (vazio) */}
                        <div />

                        {/* Espaço da linha de prioridade (vazio) */}
                        <div />

                        {/* Ícone Plus/Circle (onde ficaria o checkbox) */}
                        <div className="flex items-center justify-center">
                            {isQuickAddActive ? (
                                <Circle className="w-4 h-4 text-gray-400" />
                            ) : (
                                <Plus className="w-4 h-4 text-gray-300" />
                            )}
                        </div>

                        {/* Texto/Input (onde ficaria o título) */}
                        {isQuickAddActive ? (
                            <Input
                                ref={inputRef}
                                value={quickAddValue}
                                onChange={(e) => setQuickAddValue(e.target.value)}
                                onPaste={(e) => {
                                    // Capturar texto colado e preservar quebras de linha
                                    e.preventDefault();
                                    const pastedText = e.clipboardData.getData('text/plain');
                                    // Preservar quebras de linha no estado (substituir completamente o valor)
                                    setQuickAddValue(pastedText);
                                }}
                                onKeyDown={handleQuickAddSubmit}
                                onBlur={() => {
                                    if (!quickAddValue.trim()) {
                                        setIsQuickAddActive(false);
                                    }
                                }}
                                placeholder="Adicionar tarefa aqui..."
                                className="h-auto text-sm text-gray-900 border-0 outline-none shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 px-0 bg-transparent placeholder:text-gray-400"
                            />
                        ) : (
                            <button
                                onClick={() => setIsQuickAddActive(true)}
                                className="w-full text-left text-sm text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                Adicionar tarefa aqui...
                            </button>
                        )}

                        {/* Espaços vazios para manter alinhamento com TaskRow */}
                        <div />
                        <div />
                        <div />
                        <div />
                        <div />
                    </div>
                </div>
            )}
        </div>
    );
}

