"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
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
    pointerWithin,
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
    assignees?: Array<{ name: string; avatar?: string; id?: string }>;
    dueDate?: string;
    tags?: string[];
    workspaceId?: string | null;
    group?: { id: string; name: string; color?: string };
    [key: string]: any;
}

interface Column {
    id: string;
    title: string;
    tasks: Task[];
    color?: string; // Cor opcional para a coluna/grupo
}

interface TaskBoardProps {
    columns: Column[];
    onTaskClick?: (taskId: string) => void;
    onAddTask?: (columnId: string, title: string, dueDate?: Date | null, assigneeId?: string | null) => Promise<void> | void;
    onTaskMoved?: () => void;
    members?: Array<{ id: string; name: string; avatar?: string }>;
    groupBy?: string;
    onToggleComplete?: (taskId: string, completed: boolean) => void;
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
    onTaskMoved,
    members,
    groupBy,
    onToggleComplete,
}: {
    column: Column;
    onTaskClick?: (taskId: string) => void;
    onAddTask?: (columnId: string, title: string, dueDate?: Date | null, assigneeId?: string | null) => Promise<void> | void;
    onTaskMoved?: () => void;
    members?: Array<{ id: string; name: string; avatar?: string }>;
    groupBy?: string;
    onToggleComplete?: (taskId: string, completed: boolean) => void;
}) {
    const { setNodeRef, isOver } = useDroppable({
        id: column.id,
    });
    
    const [isAdding, setIsAdding] = useState(false);

    // Garantir que tasks seja sempre um array
    const tasks = column.tasks || [];
    
    // ✅ OTIMIZAÇÃO: Handlers memoizados
    const handleSetAdding = useCallback(() => {
        setIsAdding(true);
    }, []);
    
    const handleCancelAdd = useCallback(() => {
        setIsAdding(false);
    }, []);
    
    const handleTaskClick = useCallback((taskId: string) => {
        onTaskClick?.(taskId);
    }, [onTaskClick]);
    
    const handleSubmitAdd = useCallback(async (title: string, dueDate?: Date | null, assigneeId?: string | null) => {
        const result = onAddTask?.(column.id, title, dueDate, assigneeId);
        // Manter o input aberto para adicionar mais tarefas
        // Aguardar Promise se onAddTask retornar uma
        if (result && typeof result === 'object' && 'then' in result) {
            await result;
        }
    }, [onAddTask, column.id]);

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
                    count={tasks.length}
                    color={column.color}
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
                                        handleSetAdding();
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
                items={tasks.map((t) => t.id)}
                strategy={verticalListSortingStrategy}
            >
                <div className="flex-1 overflow-y-auto space-y-2 min-h-0 pb-2 scrollbar-thin p-1">
                    {tasks.length === 0 && !isAdding ? (
                        <KanbanEmptyCard
                            columnTitle={column.title}
                            columnId={column.id}
                            onClick={handleSetAdding}
                        />
                    ) : (
                        tasks.map((task) => {
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
                                    groupColor={task.group?.color}
                                    onClick={() => handleTaskClick(task.id)}
                                    onTaskUpdated={onTaskMoved}
                                    onDelete={onTaskMoved}
                                    members={members}
                                    onToggleComplete={onToggleComplete}
                                />
                            );
                        })
                    )}

                    {/* Quick Add logo abaixo do último card */}
                    {(tasks.length > 0 || isAdding) && (
                        <div className="px-0 mt-1">
                            <QuickTaskAdd
                                placeholder="Adicionar tarefa aqui..."
                                autoFocus={isAdding}
                                onCancel={handleCancelAdd}
                                onSubmit={handleSubmitAdd}
                                members={members || []}
                            />
                        </div>
                    )}
                </div>
            </SortableContext>
        </div>
    );
}

export function TaskBoard({ columns, onTaskClick, onAddTask, onTaskMoved, members, groupBy, onToggleComplete }: TaskBoardProps) {
    const [localColumns, setLocalColumns] = useState(columns);
    const [activeTask, setActiveTask] = useState<Task | null>(null);
    
    // Refs para evitar dependências desnecessárias
    const columnsRef = useRef(columns);
    columnsRef.current = columns;
    const localColumnsRef = useRef(localColumns);
    localColumnsRef.current = localColumns;

    // Atualizar colunas locais quando props mudarem
    useEffect(() => {
        setLocalColumns(columns);
    }, [columns]);
    
    // Atualizar ref quando localColumns mudar
    useEffect(() => {
        localColumnsRef.current = localColumns;
    }, [localColumns]);

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

    // ✅ OTIMIZAÇÃO: Handler memoizado para evitar re-renders
    const handleDragStart = useCallback((event: DragStartEvent) => {
        const { active } = event;
        const task = localColumnsRef.current
            .flatMap((col) => col.tasks)
            .find((t) => t.id === active.id);
        setActiveTask(task || null);
    }, []);

    // ✅ OTIMIZAÇÃO: Handler memoizado para evitar re-renders
    const handleDragEnd = useCallback(async (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveTask(null);

        if (!over) {
            return;
        }

        const currentColumns = localColumnsRef.current;

        // Encontrar coluna de origem
        const sourceColumn = currentColumns.find((col) =>
            col.tasks.some((task) => task.id === active.id)
        );

        // Se não encontrou coluna de origem, sair
        if (!sourceColumn) {
            return;
        }

        // Verificar se está arrastando para uma coluna (drop zone) ou para uma tarefa
        let destinationColumnId: string | undefined;
        
        const isColumnId = currentColumns.some((col) => col.id === over.id);
        if (isColumnId) {
            destinationColumnId = over.id as string;
        } else {
            // É uma tarefa, encontrar a coluna que contém essa tarefa
            destinationColumnId = currentColumns.find((col) =>
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
            const newColumns = currentColumns.map((col) => {
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
                setLocalColumns(columnsRef.current);
            }
        } else {
            // Mudando de coluna (status)
            const destinationColumn = currentColumns.find((col) => col.id === destinationColumnId);
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
            const newColumns = currentColumns.map((col) => {
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
                
                let updateData: any = {
                    taskId: active.id as string,
                    newPosition: insertIndex + 1,
                };

                const currentGroupBy = groupBy;
                if (currentGroupBy === "status") {
                    updateData.newStatus = mapStatusToDb(destinationColumn.title);
                } else if (currentGroupBy === "priority") {
                    const priorityMap: Record<string, "low" | "medium" | "high" | "urgent"> = {
                        "Urgente": "urgent",
                        "Alta": "high",
                        "Média": "medium",
                        "Baixa": "low",
                    };
                    updateData.priority = priorityMap[destinationColumn.title];
                } else if (currentGroupBy === "group") {
                    if (destinationColumn.id === "inbox" || destinationColumn.id === "Inbox") {
                        updateData.group_id = null;
                    } else {
                        updateData.group_id = destinationColumn.id;
                    }
                }
                // TODO: Implementar para 'date' se necessário

                await updateTaskPosition(updateData);
                onTaskMoved?.();
            } catch (error) {
                console.error("Erro ao atualizar posição e status:", error);
                setLocalColumns(columnsRef.current);
            }
        }
    }, [groupBy, onTaskMoved]);

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={pointerWithin}
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
                        onTaskMoved={onTaskMoved}
                        members={members}
                        groupBy={groupBy}
                        onToggleComplete={onToggleComplete}
                    />
                ))}
            </div>

            {/* Drag Overlay para feedback visual */}
            <DragOverlay>
                {activeTask ? (
                    <div className="bg-white rounded-lg border border-gray-200 shadow-lg p-3 rotate-2 opacity-90 w-[300px]">
                        <div className="font-medium text-gray-900 text-sm">{activeTask.title}</div>
                    </div>
                ) : null}
            </DragOverlay>
        </DndContext>
    );
}


