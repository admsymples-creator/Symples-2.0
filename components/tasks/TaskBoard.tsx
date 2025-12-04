"use client";

import { useState, useCallback, useMemo, memo } from "react";
import { Button } from "@/components/ui/button";
import { KanbanCard } from "./KanbanCard";
import { KanbanEmptyCard } from "./KanbanEmptyCard";
import { TaskSectionHeader } from "./TaskSectionHeader";
import { QuickTaskAdd } from "./QuickTaskAdd";
import { MoreHorizontal } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    SortableContext,
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
    onTaskMoved?: (taskId: string, sourceColumnId: string, destinationColumnId: string, newIndex?: number) => void;
    members?: Array<{ id: string; name: string; avatar?: string }>;
    groupBy?: string;
    onToggleComplete?: (taskId: string, completed: boolean) => void;
}

import { mapLabelToStatus } from "@/lib/config/tasks";

// Mapear status customizáveis para status do banco (usando config centralizado)
const mapStatusToDb = (status: string): "todo" | "in_progress" | "done" | "archived" => {
    return mapLabelToStatus(status) as "todo" | "in_progress" | "done" | "archived";
};

// ✅ MINIFY v2: DroppableColumn apenas renderiza, não gerencia drag & drop
// Componente de Coluna Droppable
function DroppableColumn({
    column,
    onTaskClick,
    onAddTask,
    members,
    groupBy,
    onToggleComplete,
}: {
    column: Column;
    onTaskClick?: (taskId: string) => void;
    onAddTask?: (columnId: string, title: string, dueDate?: Date | null, assigneeId?: string | null) => Promise<void> | void;
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
    
    // ✅ REGRA 4: estabilizar array de IDs usado no DnD (SortableContext)
    const taskIds = useMemo(() => tasks.map((t) => t.id), [tasks]);
    
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
                items={taskIds}
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

// ✅ MINIFY v2: TaskBoard agora é puramente apresentacional, sem DndContext interno
// O DndContext deve estar no componente pai (TasksView)
function TaskBoardComponent({ columns, onTaskClick, onAddTask, onTaskMoved, members, groupBy, onToggleComplete }: TaskBoardProps) {
    // ✅ MINIFY v2: TaskBoard apenas renderiza colunas, não gerencia drag & drop
    // O drag & drop é gerenciado pelo TasksView que tem o DndContext principal
    
    return (
        <div className="flex h-[calc(100vh-200px)] overflow-x-auto gap-6 scrollbar-thin">
            {columns.map((column) => (
                <DroppableColumn
                    key={column.id}
                    column={column}
                    onTaskClick={onTaskClick}
                    onAddTask={onAddTask}
                    members={members}
                    groupBy={groupBy}
                    onToggleComplete={onToggleComplete}
                />
            ))}
        </div>
    );
}

// ✅ REGRA 6 — Boundary de memo para o board kanban
export const TaskBoard = memo(TaskBoardComponent, (prev, next) => {
    const prevColIds = prev.columns.map(c => c.id).join(",");
    const nextColIds = next.columns.map(c => c.id).join(",");
    if (prevColIds !== nextColIds) return false;

    if (
        prev.groupBy !== next.groupBy ||
        prev.onTaskClick !== next.onTaskClick ||
        prev.onAddTask !== next.onAddTask ||
        prev.onTaskMoved !== next.onTaskMoved ||
        prev.onToggleComplete !== next.onToggleComplete
    ) {
        return false;
    }

    return true;
});
