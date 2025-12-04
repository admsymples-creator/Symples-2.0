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
import { mapLabelToStatus } from "@/lib/config/tasks";

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
  color?: string;
}

interface TaskBoardProps {
  columns: Column[];
  onTaskClick?: (taskId: string) => void;
  onAddTask?: (columnId: string, title: string, dueDate?: Date | null, assigneeId?: string | null) => Promise<void> | void;
  onTaskMoved?: (taskId: string, sourceColumnId: string, destinationColumnId: string, newIndex?: number) => void;
  members?: Array<{ id: string; name: string; avatar?: string }>;
  groupBy?: string;
  onToggleComplete?: (taskId: string, completed: boolean) => void;
  onTaskUpdated?: () => void;
  onTaskUpdatedOptimistic?: (taskId: string, updates: Partial<{ title: string; status: string; dueDate?: string; assignees: Array<{ name: string; avatar?: string; id?: string }> }>) => void;
  onDelete?: () => void;
  isDragDisabled?: boolean;
}

// Componente de Coluna Droppable
function DroppableColumn({
  column,
  onTaskClick,
  onAddTask,
  members,
  groupBy,
  onToggleComplete,
  onTaskUpdated,
  onTaskUpdatedOptimistic,
  onDelete,
  isDragDisabled = false,
}: {
  column: Column;
  onTaskClick?: (taskId: string) => void;
  onAddTask?: (columnId: string, title: string, dueDate?: Date | null, assigneeId?: string | null) => Promise<void> | void;
  members?: Array<{ id: string; name: string; avatar?: string }>;
  groupBy?: string;
  onToggleComplete?: (taskId: string, completed: boolean) => void;
  onTaskUpdated?: () => void;
  onTaskUpdatedOptimistic?: (taskId: string, updates: Partial<{ title: string; status: string; dueDate?: string; assignees: Array<{ name: string; avatar?: string; id?: string }> }>) => void;
  onDelete?: () => void;
  isDragDisabled?: boolean;
}) {
  // Configura a coluna inteira como uma zona de drop
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: {
      type: 'column',
      columnId: column.id,
    }
  });
  
  const [isAdding, setIsAdding] = useState(false);

  // Garantir que tasks seja sempre um array
  const tasks = column.tasks || [];
  
  // Estabilizar array de IDs usado no DnD (SortableContext)
  const taskIds = useMemo(() => tasks.map((t) => t.id), [tasks]);
  
  // Handlers memoizados
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
    if (result && typeof result === 'object' && 'then' in result) {
      await result;
    }
  }, [onAddTask, column.id]);

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "bg-gray-50/50 rounded-xl w-[300px] flex-none flex flex-col transition-all duration-200 h-full max-h-full",
        // Feedback visual quando arrastar sobre a coluna (Estilo Clean)
        isOver ? "bg-slate-100/80 ring-2 ring-inset ring-slate-200/50" : "hover:bg-gray-50/80"
      )}
    >
      {/* Header da Coluna */}
      <div className="px-2 pt-2 flex-shrink-0">
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
      <div className="flex-1 min-h-0 flex flex-col px-1 pb-2">
        <SortableContext
          items={taskIds}
          strategy={verticalListSortingStrategy}
        >
          <div className="flex-1 overflow-y-auto space-y-2 scrollbar-thin pr-1 min-h-[100px]">
            {tasks.length === 0 && !isAdding ? (
              <KanbanEmptyCard
                columnTitle={column.title}
                columnId={column.id}
                onClick={handleSetAdding}
              />
            ) : (
              tasks.map((task) => (
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
                  onTaskUpdated={onTaskUpdated}
                  onTaskUpdatedOptimistic={onTaskUpdatedOptimistic}
                  onDelete={onDelete}
                  disabled={isDragDisabled}
                />
              ))
            )}

            {/* Quick Add no final da lista */}
            {(tasks.length > 0 || isAdding) && (
              <div className="pt-1 pb-2">
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
    </div>
  );
}

// TaskBoard Component
// Nota: O DndContext reside no componente pai (TasksView) para gerenciar o estado global do drag
function TaskBoardComponent({ 
  columns, 
  onTaskClick, 
  onAddTask, 
  onTaskMoved, 
  members, 
  groupBy, 
  onToggleComplete, 
  onTaskUpdated, 
  onTaskUpdatedOptimistic, 
  onDelete, 
  isDragDisabled = false 
}: TaskBoardProps) {
  
  // 🔍 DEBUG: Verificar se callback está chegando no TaskBoardComponent
  return (
    <div className="flex h-full overflow-x-auto gap-4 scrollbar-thin px-4 pb-4 items-start">
      {columns.map((column) => (
        <DroppableColumn
          key={column.id}
          column={column}
          onTaskClick={onTaskClick}
          onAddTask={onAddTask}
          members={members}
          groupBy={groupBy}
          onToggleComplete={onToggleComplete}
          onTaskUpdated={onTaskUpdated}
          onTaskUpdatedOptimistic={onTaskUpdatedOptimistic}
          onDelete={onDelete}
          isDragDisabled={isDragDisabled}
        />
      ))}
    </div>
  );
}

// Memoização Otimizada para evitar re-renders desnecessários no board
export const TaskBoard = memo(TaskBoardComponent, (prev, next) => {
  // ✅ Se a referência das colunas mudou, sempre re-renderizar
  // Isso garante que quando kanbanColumns é recalculado (nova referência), o componente atualiza
  if (prev.columns !== next.columns) {
    return false; // Re-renderizar
  }

  // ✅ Se outras props importantes mudaram, re-renderizar
  if (
    prev.groupBy !== next.groupBy ||
    prev.isDragDisabled !== next.isDragDisabled ||
    prev.members !== next.members ||
    prev.onTaskClick !== next.onTaskClick ||
    prev.onAddTask !== next.onAddTask ||
    prev.onTaskMoved !== next.onTaskMoved ||
    prev.onToggleComplete !== next.onToggleComplete ||
    prev.onTaskUpdated !== next.onTaskUpdated ||
    prev.onTaskUpdatedOptimistic !== next.onTaskUpdatedOptimistic ||
    prev.onDelete !== next.onDelete
  ) {
    return false; // Re-renderizar
  }

  return true; // Não re-renderizar
});