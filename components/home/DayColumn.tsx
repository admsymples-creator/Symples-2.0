"use client";

import { useState, useEffect, useRef, useMemo, useOptimistic, startTransition } from "react";
import { FolderOpen, Calendar as CalendarIcon } from "lucide-react";
import { TaskRow } from "@/components/home/TaskRow";
import { cn } from "@/lib/utils";
import { createTask, deleteTask, updateTask, getTaskRecurrenceInfo } from "@/lib/actions/tasks";
import { Database } from "@/types/database.types";
import { TaskDateTimePicker } from "@/components/tasks/pickers/TaskDateTimePicker";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ConfirmModal } from "@/components/modals/confirm-modal";
import { DeleteRecurringTaskModal } from "@/components/modals/delete-recurring-task-modal";

type Task = Database["public"]["Tables"]["tasks"]["Row"];

type OptimisticAction =
  | { type: 'add'; task: Task }
  | { type: 'update'; task: Partial<Task> & { id: string } }
  | { type: 'delete'; id: string };

interface DayColumnProps {
  dayName: string;
  date: string;
  dateObj?: Date;
  tasks: Task[];
  isToday?: boolean;
  workspaces?: { id: string; name: string }[];
  highlightInput?: boolean;
  onTaskUpdate?: () => void; // Callback para notificar atualizações
}

export function DayColumn({
  dayName,
  date,
  dateObj,
  tasks,
  isToday,
  workspaces = [],
  highlightInput = false,
  onTaskUpdate,
}: DayColumnProps) {
  const router = useRouter();
  const [quickAddValue, setQuickAddValue] = useState("");
  const [isQuickAddFocused, setIsQuickAddFocused] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedDateTime, setSelectedDateTime] = useState<Date | null>(null);
  const [recurrenceType, setRecurrenceType] = useState<'daily' | 'weekly' | 'monthly' | 'custom' | null>(null);
  const [showTutorialHint, setShowTutorialHint] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showRecurringModal, setShowRecurringModal] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<{ id: string; title: string } | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const hintTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [optimisticTasks, addOptimisticTask] = useOptimistic(
    tasks,
    (state: Task[], action: OptimisticAction) => {
      switch (action.type) {
        case 'add':
          return [...state, action.task];
        case 'update':
          return state.map(t => t.id === action.task.id ? { ...t, ...action.task } : t);
        case 'delete':
          return state.filter(t => t.id !== action.id);
        default:
          return state;
      }
    }
  );

  useEffect(() => {
    if (highlightInput && isToday && inputRef.current) {
      setShowTutorialHint(true);
      if (hintTimeoutRef.current) {
        clearTimeout(hintTimeoutRef.current);
      }
      hintTimeoutRef.current = setTimeout(() => {
        inputRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'nearest'
        });
      }, 300);
    }
    return () => {
      if (hintTimeoutRef.current) {
        clearTimeout(hintTimeoutRef.current);
        hintTimeoutRef.current = null;
      }
    };
  }, [highlightInput, isToday]);

  const handleInputFocus = () => {
    setIsQuickAddFocused(true);
    if (showTutorialHint) setShowTutorialHint(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setQuickAddValue(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;

    if (showTutorialHint && e.target.value.trim().length > 0) {
      setShowTutorialHint(false);
  };

  const processBatchInput = (text: string): string[] => {
    if (!text.includes("\n") && !text.includes("\r")) return [text.trim()].filter(Boolean);
    return text.split(/\r?\n/)
      .map(line => line.replace(/^[-*•]\s+/, "").replace(/^\d+\.\s+/, "").trim())
      .filter(line => line.length > 0);
  };

  const sortedTasks = useMemo(() => {
    return [...optimisticTasks].sort((a, b) => {
      const aIsPersonal = a.is_personal || !a.workspace_id;
      const bIsPersonal = b.is_personal || !b.workspace_id;

      // CORREÇÃO: Ordenar tarefas pessoais cronologicamente (por due_date/hora)
      if (aIsPersonal && bIsPersonal) {
        // Ambas são pessoais: ordenar por data/hora
        if (a.due_date && b.due_date) {
          const timeA = new Date(a.due_date).getTime();
          const timeB = new Date(b.due_date).getTime();
          return timeA - timeB;
        }
        if (a.due_date) return -1; // a tem data, b não -> a primeiro
        if (b.due_date) return 1; // b tem data, a não -> b primeiro
        // Nenhuma tem data: manter ordem original (ou por criação)
        if (a.created_at && b.created_at) {
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        }
        return 0;
      }

      // Separar pessoais de workspace: pessoais primeiro
      if (aIsPersonal && !bIsPersonal) return -1;
      if (!aIsPersonal && bIsPersonal) return 1;

      // Ambas são workspace: manter ordem original (ou por criação)
      if (a.created_at && b.created_at) {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }

      return 0;
    });
  }, [optimisticTasks]);

  const pendingCount = useMemo(() =>
    optimisticTasks.filter(t => t.status !== 'done').length,
    [optimisticTasks]);

  const handleQuickAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const rawValue = quickAddValue;
    if (!rawValue.trim()) return;

    const tasksToCreate = processBatchInput(rawValue);
    if (tasksToCreate.length === 0) return;

    setQuickAddValue("");
    if (inputRef.current) inputRef.current.style.height = 'auto';
    setIsCreating(true);

    let dueDateISO: string | undefined = undefined;
    if (selectedDateTime) {
      dueDateISO = selectedDateTime.toISOString();
    } else if (dateObj) {
      // Usar meio-dia (12:00) para evitar problemas de timezone
      // Meio-dia em qualquer timezone mantém o mesmo dia ao converter para UTC
      const d = new Date(dateObj);
      d.setHours(12, 0, 0, 0);
      dueDateISO = d.toISOString();
    }

    // Optimistic Update
    const baseId = Date.now();
    const tempTasks = tasksToCreate.map((title, index) => ({
      id: `temp-${baseId}-${index}-${Math.random()}`,
      title,
      status: "todo",
      due_date: dueDateISO || null,
      workspace_id: null,
      is_personal: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      description: null,
      position: 0,
      assignee_id: null,
      priority: null,
      created_by: null,
      origin_context: null
    } as Task));

    tempTasks.forEach((tempTask) => {
      startTransition(() => {
        addOptimisticTask({ type: 'add', task: tempTask });
      });
    });

    try {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/3cb1781a-45f3-4822-84f0-70123428e0e4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'components/home/DayColumn.tsx:187',message:'BUG-RECURRENCE: Creating task with recurrence',data:{recurrenceType,selectedDateTime:selectedDateTime?.toISOString(),dueDateISO,tasksToCreateCount:tasksToCreate.length},timestamp:Date.now(),sessionId:'debug-session',runId:'bug-investigation-recurrence',hypothesisId:'bug-recurrence-create'})}).catch(()=>{});
      // #endregion

      const createPromises = tasksToCreate.map((title) =>
        createTask({
          title,
          due_date: dueDateISO,
          workspace_id: null,
          status: "todo",
          is_personal: true,
          recurrence_type: recurrenceType || undefined,
        })
      );

      setSelectedDateTime(null);
      setRecurrenceType(null);
      const results = await Promise.all(createPromises);
      const failedCount = results.filter((r) => !r.success).length;
      const successCount = results.filter((r) => r.success).length;

      results.forEach((result, index) => {
        const tempTask = tempTasks[index];
        if (!tempTask) return;
        startTransition(() => {
          addOptimisticTask({ type: 'delete', id: tempTask.id });
          if (result.success && result.data) {
            addOptimisticTask({ type: 'add', task: result.data });
          }
        });
      });

      if (successCount > 0) {
        onTaskUpdate?.(); // Notificar atualizacao
        startTransition(() => {
          router.refresh();
        });
      }

      if (failedCount === results.length) {
        setQuickAddValue(rawValue);
        throw new Error("Falha ao criar");
      }
      if (failedCount > 0) {
        toast.error(`Falha ao criar ${failedCount} tarefa(s)`);
      }

    } catch (error) {
      toast.error("Erro ao criar tarefa");
      setQuickAddValue(rawValue);
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggle = async (id: string, checked: boolean) => {
    try {
      startTransition(() => {
        addOptimisticTask({
          type: 'update',
          task: { id, status: checked ? "done" : "todo" }
        });
      });

      await updateTask({ id, status: checked ? "done" : "todo" });
      onTaskUpdate?.(); // Notificar atualização
      router.refresh();
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      toast.error("Erro ao atualizar tarefa");
      router.refresh(); // Reverte estado
    }
  };

  const handleDelete = async (id: string) => {
    const task = optimisticTasks.find(t => t.id === id);
    if (!task) return;
    
    setTaskToDelete({ id, title: task.title || "Tarefa" });
    
    // Verificar se a tarefa e recorrente
    try {
      const recurrenceInfo = await getTaskRecurrenceInfo(id);
      
      if (recurrenceInfo.isRecurring && recurrenceInfo.relatedTasksCount > 1) {
        setShowRecurringModal(true);
      } else {
        setShowDeleteModal(true);
      }
    } catch (error) {
      console.error("Erro ao verificar recorrencia:", error);
      toast.error("Erro ao verificar recorrencia");
      setShowDeleteModal(true);
    }
    }
  };

  const confirmDelete = async (deleteAll: boolean = false) => {
    if (!taskToDelete) return;
    
    setIsDeleting(true);
    
    try {
      startTransition(() => {
        addOptimisticTask({ type: 'delete', id: taskToDelete.id });
      });
      
      const result = await deleteTask(taskToDelete.id, deleteAll);
      
      if (result.success) {
        toast.success(deleteAll ? "Tarefas excluídas com sucesso" : "Tarefa excluída com sucesso");
        onTaskUpdate?.(); // Notificar atualização
        router.refresh();
      } else {
        toast.error(result.error || "Erro ao excluir tarefa");
        router.refresh();
      }
    } catch (error) {
      console.error("Erro ao excluir:", error);
      toast.error("Erro ao excluir tarefa");
      router.refresh();
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
      setShowRecurringModal(false);
      setTaskToDelete(null);
    }
  };

  const handleEdit = async (id: string, title: string) => {
    try {
      startTransition(() => {
        addOptimisticTask({
          type: 'update',
          task: { id, title }
        });
      });
      await updateTask({ id, title });
      onTaskUpdate?.(); // Notificar atualização
      router.refresh();
    } catch (error) {
      console.error("Erro ao editar:", error);
      toast.error("Erro ao editar tarefa");
      router.refresh();
    }
  };

  const handleMove = async (id: string, wid: string) => {
    try {
      startTransition(() => {
        addOptimisticTask({
          type: 'update',
          task: { id, workspace_id: wid, is_personal: false }
        });
      });
      await updateTask({ id, workspace_id: wid, is_personal: false });
      onTaskUpdate?.(); // Notificar atualização
      router.refresh();
    } catch (error) {
      console.error("Erro ao mover:", error);
      toast.error("Erro ao mover tarefa");
      router.refresh();
    }
  };

  return (
    <div
      className={cn(
        "group/column flex flex-col h-full min-h-[500px] max-h-[80vh] rounded-2xl transition-all duration-300",
        isToday
          ? "bg-gradient-to-b from-gray-50/80 to-white border border-gray-300 shadow-md"
          : "bg-surface border border-gray-100 hover:border-gray-200 hover:bg-gray-50/50"
      )}
    >
      {/* --- HEADER --- */}
      <div className={cn(
        "flex-none p-4 border-b border-transparent transition-colors",
        isToday ? "border-gray-200" : "group-hover/column:border-gray-100"
      )}>
        <div className="flex items-center justify-between mb-1">
          <span className={cn(
            "text-[10px] font-bold uppercase tracking-wider",
            isToday ? "text-gray-900" : "text-gray-500"
          )}>
            {dayName}
          </span>
          {pendingCount > 0 && (
            <span className={cn(
              "text-[10px] font-medium px-2 py-0.5 rounded-full",
              isToday ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-500"
            )}>
              {pendingCount}
            </span>
          )}
        </div>
        <div className={cn(
          "text-lg font-semibold tracking-tight",
          isToday ? "text-gray-900" : "text-gray-700"
        )}>
          {date}
        </div>
      </div>

      {/* --- TASK LIST (SCROLL AREA) --- */}
      <div
        className={cn(
          "flex-1 px-2 py-2 relative flex flex-col",
          // CORREÇÃO: Scroll apenas se houver itens. Hidden se vazio para travar o layout.
          sortedTasks.length > 0
            ? "overflow-y-auto overflow-x-hidden custom-scrollbar"
            : "overflow-hidden"
        )}
      >
        {sortedTasks.length > 0 ? (
          <>
            {/* CORREÇÃO: Gap reduzido para space-y-0.5 (2px) para maior densidade */}
            <div className="space-y-0.5">
              {sortedTasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  workspaces={workspaces}
                  onToggle={handleToggle}
                  onDelete={handleDelete}
                  onEdit={handleEdit}
                  onMoveToWorkspace={handleMove}
                  onDateUpdate={() => {
                    onTaskUpdate?.();
                    router.refresh();
                  }}
                />
              ))}
            </div>
            <div className="h-16 shrink-0" />
          </>
        ) : (
          /* Empty State Centralizado sem Scroll */
          <div className="flex-1 flex flex-col items-center justify-center text-center p-4 opacity-70 group-hover/column:opacity-100 transition-opacity duration-300">
            <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center mb-2">
              <FolderOpen className="w-4 h-4 text-gray-300" />
            </div>
            <p className="text-xs font-medium text-gray-400">Vazio</p>
          </div>
        )}
      </div>

      {/* --- FOOTER / INPUT AREA --- */}
      <div className="flex-none px-3 pb-3 pt-2 relative">
        <div className="absolute -top-8 left-0 right-0 h-8 bg-gradient-to-t from-white to-transparent pointer-events-none" />

        <form onSubmit={handleQuickAddSubmit} className="relative z-10">

          {/* Tutorial Tooltip Hint */}
          {highlightInput && isToday && !isQuickAddFocused && (
            <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs font-medium px-3 py-1.5 rounded-lg shadow-xl animate-bounce z-20 whitespace-nowrap after:content-[''] after:absolute after:top-full after:left-1/2 after:-translate-x-1/2 after:border-[6px] after:border-transparent after:border-t-gray-900">
              Organize sua vida pessoal aqui
            </div>
          )}

          <div
            className={cn(
              "flex flex-col bg-white rounded-xl border shadow-sm transition-all duration-300 overflow-hidden",
              isQuickAddFocused
                ? "border-gray-400 ring-4 ring-gray-100 shadow-md transform -translate-y-1"
                : "border-gray-200 hover:border-gray-300",
              // Tutorial Highlight: Green Ring & Shadow
              highlightInput && isToday && !isQuickAddFocused && "ring-2 ring-green-500 shadow-[0_0_20px_rgba(34,197,94,0.3)] border-green-500 scale-[1.02]"
            )}
          >
            {/* Background Pulse for Extra Attention */}
            {highlightInput && isToday && !isQuickAddFocused && (
              <div
                className="absolute inset-0 z-0 animate-pulse pointer-events-none rounded-xl bg-green-50/50"
              />
            )}

            <div className="flex items-start gap-2 px-3 py-2 relative z-10">
              <textarea
                ref={inputRef}
                placeholder="Nova tarefa..."
                value={quickAddValue}
                onChange={handleInputChange}
                onFocus={handleInputFocus}
                onBlur={() => setIsQuickAddFocused(false)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    e.currentTarget.form?.requestSubmit();
                  }
                }}
                disabled={isCreating}
                rows={1}
                className="flex-1 bg-transparent border-none outline-none text-sm text-gray-800 placeholder:text-gray-400 resize-none py-1 min-h-[24px] max-h-[120px]"
              />
            </div>

            <div className="flex items-center justify-between px-3 pb-2 pt-1 border-t border-gray-50 bg-gray-50/50 relative z-10">
              <div className="flex items-center gap-1">
                <TaskDateTimePicker
                  date={selectedDateTime}
                  onSelect={setSelectedDateTime}
                  recurrenceType={recurrenceType}
                  onRecurrenceChange={setRecurrenceType}
                  align="start"
                  side="top"
                  trigger={
                    <button type="button" className={cn(
                      "p-1.5 rounded-md hover:bg-gray-200 transition-colors flex items-center gap-1.5 text-xs font-medium",
                      selectedDateTime ? "bg-gray-900 text-white" : "text-gray-500"
                    )}>
                      <CalendarIcon className="w-3.5 h-3.5" />
                      {selectedDateTime ? "Data definida" : "Agendar"}
                    </button>
                  }
                />
              </div>

              <div className="flex items-center gap-2">
                {(isQuickAddFocused || quickAddValue) && (
                  <span className="text-[10px] text-gray-400 hidden sm:inline">
                    Shift+Enter para nova linha
                  </span>
                )}
                {(isQuickAddFocused || quickAddValue) && (
                  <button
                    type="submit"
                    disabled={isCreating || !quickAddValue.trim()}
                    className={cn(
                      "text-[10px] font-medium px-2 py-1 rounded hover:bg-gray-200 transition-colors",
                      isCreating || !quickAddValue.trim()
                        ? "text-gray-400 cursor-not-allowed"
                        : "text-gray-600 hover:text-gray-900"
                    )}
                  >
                    Salvar
                  </button>
                )}
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* Modais de confirmação de exclusão */}
      <ConfirmModal
        open={showDeleteModal}
        onOpenChange={setShowDeleteModal}
        title="Excluir Tarefa?"
        description="Esta ação não pode ser desfeita."
        confirmText="Excluir Tarefa"
        isLoading={isDeleting}
        onConfirm={() => confirmDelete(false)}
      />
      <DeleteRecurringTaskModal
        open={showRecurringModal}
        onOpenChange={setShowRecurringModal}
        taskTitle={taskToDelete?.title || "Tarefa"}
        onConfirm={confirmDelete}
        isLoading={isDeleting}
      />
    </div>
  );
}
