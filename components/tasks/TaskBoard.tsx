"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TaskCard } from "./TaskCard";
import { Plus } from "lucide-react";
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
}

interface Column {
    id: string;
    title: string;
    tasks: Task[];
}

interface TaskBoardProps {
    columns: Column[];
    onTaskClick?: (taskId: string) => void;
    onAddTask?: (columnId: string) => void;
    onTasksChange?: () => void; // Callback para recarregar tarefas
}

// Mapear status customizáveis para status do banco
const mapStatusToDb = (status: string): "todo" | "in_progress" | "done" | "archived" => {
    const statusLower = status.toLowerCase();
    if (statusLower.includes("backlog") || statusLower === "todo" || statusLower === "não iniciado") {
        return "todo";
    }
    if (statusLower.includes("triagem") || statusLower.includes("execução") || statusLower === "in_progress") {
        return "in_progress";
    }
    if (statusLower.includes("revisão") || statusLower === "done" || statusLower === "finalizado") {
        return "done";
    }
    return "todo";
};

// Componente de Coluna Droppable
function DroppableColumn({
    column,
    onTaskClick,
    onAddTask,
}: {
    column: Column;
    onTaskClick?: (taskId: string) => void;
    onAddTask?: (columnId: string) => void;
}) {
    const { setNodeRef, isOver } = useDroppable({
        id: column.id,
    });

    return (
        <div
            ref={setNodeRef}
            className={cn(
                "bg-gray-50/50 rounded-xl p-2 w-[300px] flex-none flex flex-col transition-colors",
                isOver && "bg-blue-50/50 border-2 border-blue-300 border-dashed"
            )}
        >
            {/* Header da Coluna */}
            <div className="flex items-center justify-between mb-3 px-2">
                <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-gray-900">{column.title}</h3>
                    <Badge
                        variant="outline"
                        className="text-xs px-2 py-0 bg-white text-gray-600 border-gray-200"
                    >
                        {column.tasks.length}
                    </Badge>
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-gray-500 hover:text-gray-900 hover:bg-white"
                    onClick={() => onAddTask?.(column.id)}
                >
                    <Plus className="w-4 h-4" />
                </Button>
            </div>

            {/* Corpo da Coluna (Scroll) */}
            <SortableContext
                items={column.tasks.map((t) => t.id)}
                strategy={verticalListSortingStrategy}
            >
                <div className="flex-1 overflow-y-auto space-y-2 px-1 min-h-0">
                    {column.tasks.length === 0 ? (
                        <div
                            onClick={() => onAddTask?.(column.id)}
                            className={cn(
                                "h-32 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all group",
                                "bg-gray-50/50 border-gray-200",
                                "hover:border-green-300 hover:bg-green-50/30",
                                isOver && "bg-green-50 border-green-400 border-solid"
                            )}
                        >
                            <Plus className={cn(
                                "size-8 transition-colors",
                                isOver ? "text-green-500" : "text-gray-300 group-hover:text-green-500"
                            )} />
                            <span className={cn(
                                "text-xs font-medium mt-2 transition-colors",
                                isOver ? "text-green-600" : "text-gray-400"
                            )}>
                                Adicionar em {column.title}
                            </span>
                        </div>
                    ) : (
                        column.tasks.map((task) => (
                            <TaskCard
                                key={task.id}
                                {...task}
                                onClick={() => onTaskClick?.(task.id)}
                            />
                        ))
                    )}
                </div>
            </SortableContext>
        </div>
    );
}

export function TaskBoard({ columns, onTaskClick, onAddTask, onTasksChange }: TaskBoardProps) {
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
                const result = await updateTaskPosition({
                    taskId: active.id as string,
                    newPosition: newIndex + 1,
                });

                if (result.success) {
                    // Recarregar tarefas do banco
                    onTasksChange?.();
                } else {
                    throw new Error(result.error);
                }
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
                const result = await updateTaskPosition({
                    taskId: active.id as string,
                    newPosition: insertIndex + 1,
                    newStatus,
                });

                if (result.success) {
                    // Recarregar tarefas do banco
                    onTasksChange?.();
                } else {
                    throw new Error(result.error);
                }
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
            <div className="flex h-[calc(100vh-200px)] overflow-x-auto gap-6 p-4">
                {localColumns.map((column) => (
                    <DroppableColumn
                        key={column.id}
                        column={column}
                        onTaskClick={onTaskClick}
                        onAddTask={onAddTask}
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

