"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { KanbanCard } from "./KanbanCard";
import { KanbanEmptyCard } from "./KanbanEmptyCard";
import { TaskSectionHeader } from "./TaskSectionHeader";
import { QuickTaskAdd } from "./QuickTaskAdd";
import { MoreHorizontal } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
    DragOverEvent,
    DragStartEvent,
    DragOverlay,
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";

interface Task {
    id: string;
    title: string;
    completed: boolean;
    priority?: "low" | "medium" | "high" | "urgent";
    status: string;
    assignees?: Array<{ name: string; avatar?: string }>;
    dueDate?: string;
    tags?: string[];
    workspaceId?: string | null;
}

interface Column {
    id: string;
    title: string;
    tasks: Task[];
}

interface TaskBoardProps {
    columns: Column[];
    onTaskClick?: (taskId: string) => void;
    onAddTask?: (columnId: string, title: string, dueDate?: Date | null, assigneeId?: string | null) => Promise<void> | void;
    members?: Array<{ id: string; name: string; avatar?: string }>;
    groupBy?: "status" | "priority" | "assignee";
}

import { mapLabelToStatus } from "@/lib/config/tasks";

// Mapear status customizáveis para status do banco (usando config centralizado)
const mapStatusToDb = (status: string): "todo" | "in_progress" | "done" | "archived" => {
    return mapLabelToStatus(status) as "todo" | "in_progress" | "done" | "archived";
};

// Componente de Coluna Droppable
function DroppableColumn({
    column,
    onTaskClick,
    onAddTask,
    members,
    groupBy,
}: {
    column: Column;
    onTaskClick?: (taskId: string) => void;
    onAddTask?: (columnId: string, title: string, dueDate?: Date | null, assigneeId?: string | null) => Promise<void> | void;
    members?: Array<{ id: string; name: string; avatar?: string }>;
    groupBy?: "status" | "priority" | "assignee";
}) {
    const { setNodeRef, isOver } = useDroppable({
        id: column.id,
    });

    return (
        <div
            ref={setNodeRef}
            className={cn(
                "bg-gray-50/50 rounded-xl w-[300px] flex-none flex flex-col transition-colors",
                isOver && "bg-blue-50/50 border-2 border-blue-300 border-dashed"
            )}
        >
            {/* Header da Coluna */}
            <div className="px-2">
                <TaskSectionHeader
                    title={column.title}
                    count={column.tasks.length}
                    actions={
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-gray-400 hover:text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <MoreHorizontal className="w-4 h-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40">
                                <DropdownMenuItem
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onAddTask?.(column.id, "");
                                    }}
                                >
                                    Adicionar Tarefa
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    }
                />
            </div>

            {/* Corpo da Coluna (Scroll) */}
            <SortableContext
                items={column.tasks.map((t) => t.id)}
                strategy={verticalListSortingStrategy}
            >
                <div className="flex-1 overflow-y-auto space-y-2 min-h-0 pb-2 scrollbar-thin">
                    {column.tasks.length === 0 ? (
                        <KanbanEmptyCard
                            columnTitle={column.title}
                            columnId={column.id}
                            onClick={() => onAddTask?.(column.id, "")}
                        />
                    ) : (
                        column.tasks.map((task) => {
                            // Gerar cor do workspace baseada no ID
                            const getWorkspaceColor = (workspaceId: string | null | undefined): string => {
                                if (!workspaceId) return "#22C55E"; // Verde padrão
                                let hash = 0;
                                for (let i = 0; i < (workspaceId || "").length; i++) {
                                    hash = (workspaceId || "").charCodeAt(i) + ((hash << 5) - hash);
                                }
                                const hue = Math.abs(hash % 360);
                                const saturation = 60 + (Math.abs(hash) % 20);
                                const lightness = 45 + (Math.abs(hash) % 15);
                                return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
                            };

                            return (
                                <KanbanCard
                                    key={task.id}
                                    id={task.id}
                                    title={task.title}
                                    completed={task.completed}
                                    status={task.status}
                                    priority={task.priority}
                                    assignees={task.assignees}
                                    dueDate={task.dueDate}
                                    tags={task.tags}
                                    workspaceColor={getWorkspaceColor(task.workspaceId)}
                                    onClick={() => onTaskClick?.(task.id)}
                                />
                            );
                        })
                    )}
                </div>
            </SortableContext>

            {/* Quick Add no rodapé (sempre visível quando há tarefas) */}
            {column.tasks.length > 0 && (
                <div className="p-3 border-t border-gray-100">
                    <QuickTaskAdd
                        placeholder="Adicionar tarefa aqui..."
                        onSubmit={async (title, dueDate, assigneeId) => {
                            const result = onAddTask?.(column.id, title, dueDate, assigneeId);
                            // Aguardar Promise se onAddTask retornar uma
                            if (result && typeof result === 'object' && 'then' in result) {
                                await result;
                            }
                        }}
                        members={members || []}
                    />
                </div>
            )}
        </div>
    );
}

export function TaskBoard({ columns, onTaskClick, onAddTask, members, groupBy }: TaskBoardProps) {
    const [localColumns, setLocalColumns] = useState(columns);
    const [activeTask, setActiveTask] = useState<Task | null>(null);

    // Atualizar colunas locais quando props mudarem
    useEffect(() => {
        setLocalColumns(columns);
    }, [columns]);

    // Sensores para drag & drop
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    // Handler para quando o drag começa
    const handleDragStart = (event: DragStartEvent) => {
        const { active } = event;
        const task = localColumns
            .flatMap((col) => col.tasks)
            .find((t) => t.id === active.id);
        setActiveTask(task || null);
    };

    // Handler para quando o drag termina
    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveTask(null);

        if (!over) {
            return;
        }

        // Encontrar coluna de origem
        const sourceColumn = localColumns.find((col) =>
            col.tasks.some((task) => task.id === active.id)
        );

        // Se não encontrou coluna de origem, sair
        if (!sourceColumn) {
            return;
        }

        // Verificar se está arrastando para uma coluna (drop zone) ou para uma tarefa
        // Se over.id é o ID de uma coluna, usar diretamente
        // Se over.id é o ID de uma tarefa, encontrar a coluna que contém essa tarefa
        let destinationColumnId: string | undefined;
        
        const isColumnId = localColumns.some((col) => col.id === over.id);
        if (isColumnId) {
            destinationColumnId = over.id as string;
        } else {
            // É uma tarefa, encontrar a coluna que contém essa tarefa
            destinationColumnId = localColumns.find((col) =>
                col.tasks.some((t) => t.id === over.id)
            )?.id;
        }

        if (!destinationColumnId) {
            return;
        }

        // Se está arrastando para a mesma coluna, apenas reordenar
        if (sourceColumn.id === destinationColumnId) {
            const oldIndex = sourceColumn.tasks.findIndex((task) => task.id === active.id);
            const newIndex = sourceColumn.tasks.findIndex((task) => task.id === over.id);

            if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) {
                return;
            }

            // Optimistic update
            const newColumns = localColumns.map((col) => {
                if (col.id === sourceColumn.id) {
                    return {
                        ...col,
                        tasks: arrayMove(col.tasks, oldIndex, newIndex),
                    };
                }
                return col;
            });
            setLocalColumns(newColumns);

            // Persistir no backend
            try {
                const { updateTaskPosition } = await import("@/lib/actions/tasks");
                await updateTaskPosition({
                    taskId: active.id as string,
                    newPosition: newIndex + 1,
                });
            } catch (error) {
                console.error("Erro ao atualizar posição:", error);
                setLocalColumns(columns);
            }
        } else {
            // Mudando de coluna (status)
            const destinationColumn = localColumns.find((col) => col.id === destinationColumnId);
            if (!destinationColumn) {
                return;
            }

            const sourceIndex = sourceColumn.tasks.findIndex((task) => task.id === active.id);
            const task = sourceColumn.tasks[sourceIndex];

            if (sourceIndex === -1 || !task) {
                return;
            }

            // Determinar posição de inserção
            const overTaskIndex = destinationColumn.tasks.findIndex((t) => t.id === over.id);
            const insertIndex = overTaskIndex === -1 ? destinationColumn.tasks.length : overTaskIndex;

            // Optimistic update
            const newColumns = localColumns.map((col) => {
                if (col.id === sourceColumn.id) {
                    // Remover da coluna de origem
                    return {
                        ...col,
                        tasks: col.tasks.filter((t) => t.id !== active.id),
                    };
                }
                if (col.id === destinationColumnId) {
                    // Adicionar na coluna de destino
                    const newTasks = [...col.tasks];
                    newTasks.splice(insertIndex, 0, task);
                    return {
                        ...col,
                        tasks: newTasks,
                    };
                }
                return col;
            });
            setLocalColumns(newColumns);

            // Persistir no backend
            try {
                const { updateTaskPosition } = await import("@/lib/actions/tasks");
                const newStatus = mapStatusToDb(destinationColumn.title);
                await updateTaskPosition({
                    taskId: active.id as string,
                    newPosition: insertIndex + 1,
                    newStatus,
                });
            } catch (error) {
                console.error("Erro ao atualizar posição e status:", error);
                setLocalColumns(columns);
            }
        }
    };

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <div className="flex h-[calc(100vh-200px)] overflow-x-auto gap-6 scrollbar-thin">
                {localColumns.map((column) => (
                    <DroppableColumn
                        key={column.id}
                        column={column}
                        onTaskClick={onTaskClick}
                        onAddTask={onAddTask}
                        members={members}
                        groupBy={groupBy}
                    />
                ))}
            </div>

            {/* Drag Overlay para feedback visual */}
            <DragOverlay>
                {activeTask ? (
                    <div className="bg-white rounded-lg border border-gray-200 shadow-lg p-3 rotate-2 opacity-90">
                        <div className="font-medium text-gray-900 text-sm">{activeTask.title}</div>
                    </div>
                ) : null}
            </DragOverlay>
        </DndContext>
    );
}

