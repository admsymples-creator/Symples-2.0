"use client";

import { useState, useEffect, useRef, useMemo, useOptimistic, startTransition } from "react";
import { addMonths } from "date-fns";
import dynamic from "next/dynamic";
import { FolderOpen, Calendar as CalendarIcon, Repeat, Send } from "lucide-react";
import { TaskRow } from "@/components/home/TaskRow";
import { cn } from "@/lib/utils";
import { createTask, deleteTask, updateTask, getTaskRecurrenceInfo } from "@/lib/actions/tasks";
import { Database } from "@/types/database.types";
import { TaskDateTimePicker } from "@/components/tasks/pickers/TaskDateTimePicker";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ConfirmModal } from "@/components/modals/confirm-modal";
import { DeleteRecurringTaskModal } from "@/components/modals/delete-recurring-task-modal";

const TaskDetailModal = dynamic(
  () => import("@/components/tasks/TaskDetailModal").then((mod) => mod.TaskDetailModal),
  { ssr: false }
);

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
  /** Tags (projetos) do workspace para "Atribuir ao Projeto" no TaskRow */
  projectTags?: string[];
  highlightInput?: boolean;
  onTaskUpdate?: () => void | Promise<void>;
  /** Atualização otimista de data: (taskId, dueDate) para a UI refletir na hora */
  onTaskUpdateOptimistic?: (taskId: string, dueDate: string | null) => void;
  /** Atualização otimista de tags (projeto) */
  onTagsUpdateOptimistic?: (taskId: string, tags: string[]) => void;
  currentWorkspaceId?: string | null;
  isPersonalContext?: boolean;
  originContext?: string;
}

export function DayColumn({
  dayName,
  date,
  dateObj,
  tasks,
  isToday,
  workspaces = [],
  projectTags = [],
  highlightInput = false,
  onTaskUpdate,
  onTaskUpdateOptimistic,
  onTagsUpdateOptimistic,
  currentWorkspaceId,
  isPersonalContext = true,
  originContext,
}: DayColumnProps) {
  const router = useRouter();
  const [quickAddValue, setQuickAddValue] = useState("");
  const [isQuickAddFocused, setIsQuickAddFocused] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedDateTime, setSelectedDateTime] = useState<Date | null>(null);
  const [recurrenceType, setRecurrenceType] = useState<'daily' | 'weekly' | 'monthly' | 'custom' | null>(null);
  const [recurrenceDays, setRecurrenceDays] = useState<number[]>([]);
  const recurrenceTypeRef = useRef<'daily' | 'weekly' | 'monthly' | 'custom' | null>(null);
  const recurrenceDaysRef = useRef<number[]>([]);
  const [showTutorialHint, setShowTutorialHint] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showRecurringModal, setShowRecurringModal] = useState(false);
  const [isVirtualOccurrenceToDelete, setIsVirtualOccurrenceToDelete] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<{ id: string; title: string; uiRemoveId?: string } | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(false);
  const formRef = useRef<HTMLFormElement | null>(null);
  /* --- STATE: Local Persistence for Created Tasks --- */
  const inputRef = useRef<HTMLInputElement | null>(null);
  const hintTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Mantém tarefas criadas visíveis até que o servidor as retorne (evita desaparecimento)
  const [createdTasks, setCreatedTasks] = useState<Task[]>([]);

  // Limpar tarefas criadas localmente quando elas aparecem na prop tasks (vindas do servidor)
  useEffect(() => {
    if (createdTasks.length > 0) {
      const persistedIds = new Set(tasks.map(t => t.id));
      const remaining = createdTasks.filter(t => !persistedIds.has(t.id));
      if (remaining.length !== createdTasks.length) {
        setCreatedTasks(remaining);
      }
    }
  }, [tasks, createdTasks]);


  const [optimisticTasks, addOptimisticTask] = useOptimistic(
    tasks,
    (state: Task[], action: OptimisticAction) => {
      switch (action.type) {
        case 'add':
          const exists = state.some(t => t.id === action.task.id);
          if (exists) {
            return state.map(t => t.id === action.task.id ? action.task : t);
          }
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

  const updateScrollIndicators = () => {
    const el = scrollRef.current;
    if (!el) return;
    const isOverflow = el.scrollHeight - el.clientHeight > 8;
    const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 8;
    setIsOverflowing(isOverflow);
    setIsAtBottom(atBottom);
  };

  const handleInputFocus = () => {
    setIsQuickAddFocused(true);
    if (showTutorialHint) setShowTutorialHint(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuickAddValue(e.target.value);

    if (showTutorialHint && e.target.value.trim().length > 0) {
      setShowTutorialHint(false);
    }
  };

  const focusQuickAddInput = () => {
    if (!inputRef.current) return;
    inputRef.current.focus();
  };

  const processBatchInput = (text: string): string[] => {
    if (!text.includes("\n") && !text.includes("\r")) return [text.trim()].filter(Boolean);
    return text.split(/\r?\n/)
      .map(line => line.replace(/^[-*•]\s+/, "").replace(/^\d+\.\s+/, "").trim())
      .filter(line => line.length > 0);
  };

  // "Sem horário" = meia-noite em UTC ou em local; "com horário" = horário específico no dia
  const hasSpecificTime = (t: Task) => {
    if (!t.due_date) return false;
    const d = new Date(t.due_date);
    const utcMidnight = d.getUTCHours() === 0 && d.getUTCMinutes() === 0;
    const localMidnight = d.getHours() === 0 && d.getMinutes() === 0;
    return !utcMidnight && !localMidnight;
  };

  const sortedTasks = useMemo(() => {
    // Mesclar optimisticTasks com createdTasks (priorizando optimistic se duplicado)
    const optimisticIds = new Set(optimisticTasks.map(t => t.id));
    const uniqueCreatedTasks = createdTasks.filter(t => !optimisticIds.has(t.id));
    const combined = [...optimisticTasks, ...uniqueCreatedTasks];

    return combined.sort((a, b) => {
      const aHasTime = hasSpecificTime(a);
      const bHasTime = hasSpecificTime(b);
      // Com horário no topo; entre elas, por horário
      if (aHasTime && !bHasTime) return -1;
      if (!aHasTime && bHasTime) return 1;
      if (aHasTime && bHasTime) {
        const timeA = new Date(a.due_date as string).getTime();
        const timeB = new Date(b.due_date as string).getTime();
        return timeA - timeB;
      }
      // Sem horário: por due_date (mesmo que seja meia-noite) e depois por created_at
      const aHasDue = !!a.due_date;
      const bHasDue = !!b.due_date;
      if (aHasDue && bHasDue) {
        const timeA = new Date(a.due_date as string).getTime();
        const timeB = new Date(b.due_date as string).getTime();
        if (timeA !== timeB) return timeA - timeB;
      } else if (aHasDue && !bHasDue) return -1;
      else if (!aHasDue && bHasDue) return 1;
      if (a.created_at && b.created_at) {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      return 0;
    });
  }, [optimisticTasks, createdTasks]);

  // Atualizar indicadores de scroll quando tarefas mudam ou scroll container redimensiona
  useEffect(() => {
    updateScrollIndicators();
    
    // Usar ResizeObserver ao invés de window resize listener (mais eficiente)
    const el = scrollRef.current;
    if (!el) return;
    
    const resizeObserver = new ResizeObserver(() => {
      updateScrollIndicators();
    });
    resizeObserver.observe(el);
    
    return () => resizeObserver.disconnect();
  }, [sortedTasks.length]);

  const pendingCount = useMemo(() =>
    // Contar também as createdTasks pendentes
    sortedTasks.filter(t => t.status !== 'done').length,
    [sortedTasks]);

  const handleQuickAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const rawValue = quickAddValue;
    if (!rawValue.trim()) return;

    const tasksToCreate = processBatchInput(rawValue);
    if (tasksToCreate.length === 0) return;

    setQuickAddValue("");
    focusQuickAddInput();
    if (inputRef.current) inputRef.current.style.height = 'auto';
    setIsCreating(true);

    // Capturar selectedDateTime e recurrenceType antes de qualquer operação assíncrona
    const currentRecurrenceType = recurrenceTypeRef.current ?? recurrenceType;
    let currentRecurrenceDays = recurrenceDaysRef.current.length > 0 ? recurrenceDaysRef.current : recurrenceDays;
    const currentSelectedDateTime = selectedDateTime;

    let dueDateISO: string | undefined = undefined;
    if (currentSelectedDateTime) {
      const now = new Date();
      const isSameDay =
        currentSelectedDateTime.getFullYear() === now.getFullYear() &&
        currentSelectedDateTime.getMonth() === now.getMonth() &&
        currentSelectedDateTime.getDate() === now.getDate();
      let adjustedDateTime = new Date(currentSelectedDateTime);
      if (isSameDay && adjustedDateTime < now) {
        adjustedDateTime.setDate(adjustedDateTime.getDate() + 1);
      }
      dueDateISO = adjustedDateTime.toISOString();
    } else if (dateObj) {
      let d = new Date(dateObj);
      // Se estiver recorrente com dias específicos, usar a primeira ocorrência >= data do card (evita tarefa em "hoje" quando o card não é um dia de recorrência)
      if ((currentRecurrenceType === "weekly" || currentRecurrenceType === "custom") && Array.isArray(currentRecurrenceDays) && currentRecurrenceDays.length > 0) {
        const daySet = new Set(currentRecurrenceDays);
        for (let i = 0; i <= 7; i++) {
          const candidate = new Date(dateObj);
          candidate.setDate(candidate.getDate() + i);
          if (daySet.has(candidate.getDay())) {
            d = candidate;
            break;
          }
        }
      }
      // Sem horário escolhido: usar meia-noite (sem horário) para recorrente e não recorrente
      d.setHours(0, 0, 0, 0);
      dueDateISO = d.toISOString();
    }

    if ((currentRecurrenceType === "weekly" || currentRecurrenceType === "custom") && currentRecurrenceDays.length === 0) {
      const base = currentSelectedDateTime ?? (dateObj ? new Date(dateObj) : new Date());
      currentRecurrenceDays = [base.getDay()];
    }

    // Optimistic Update
    const baseId = Date.now();
    const tempTasks = tasksToCreate.map((title, index) => ({
      id: `temp-${baseId}-${index}-${Math.random()}`,
      title,
      status: "todo",
      due_date: dueDateISO || null,
      workspace_id: isPersonalContext ? null : (currentWorkspaceId || null),
      is_personal: isPersonalContext,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      description: null,
      position: 0,
      assignee_id: null,
      priority: null,
      created_by: null,
      origin_context: originContext || null,
      client_id: null,
      recurrence_interval: null,
      recurrence_end_date: null,
      recurrence_count: null,
      group_id: null,
      subtasks: null,
      tags: null,
      recurrence_type: currentRecurrenceType || null,
      recurrence_days: Array.isArray(currentRecurrenceDays) && currentRecurrenceDays.length > 0 ? currentRecurrenceDays : null,
    } as Task));

    tempTasks.forEach((tempTask) => {
      startTransition(() => {
        addOptimisticTask({ type: 'add', task: tempTask });
      });
    });

    try {
      const createPromises = tasksToCreate.map((title) => {
        const payload = {
          title,
          due_date: dueDateISO,
          workspace_id: isPersonalContext ? null : currentWorkspaceId,
          status: "todo" as any,
          is_personal: isPersonalContext,
          origin_context: originContext,
          recurrence_type: currentRecurrenceType || undefined,
          recurrence_days: Array.isArray(currentRecurrenceDays) && currentRecurrenceDays.length > 0 ? currentRecurrenceDays : undefined,
        };
        return createTask(payload);
      });

      const results = await Promise.all(createPromises);

      const failedCount = results.filter((r) => !r.success).length;
      const successCount = results.filter((r) => r.success).length;

      // Substituir tarefas temporárias pelas tarefas reais
      startTransition(() => {
        tempTasks.forEach((tempTask) => {
          addOptimisticTask({ type: 'delete', id: tempTask.id });
        });
      });

      if (successCount > 0) {
        const newRealTasks = results
          .filter(r => r.success && r.data)
          .map(r => r.data!);

        setCreatedTasks(prev => [...prev, ...newRealTasks]);

        if (tasksToCreate.length === 1 || successCount === tasksToCreate.length) {
          setSelectedDateTime(null);
          setRecurrenceType(null);
          setRecurrenceDays([]);
          recurrenceTypeRef.current = null;
          recurrenceDaysRef.current = [];
        }

        onTaskUpdate?.();
        if (typeof window !== "undefined") {
          const ts = Date.now();
          sessionStorage.setItem("home_tasks_refresh_ts", String(ts));
          window.dispatchEvent(new CustomEvent("home-tasks-updated"));
        }
        setTimeout(focusQuickAddInput, 0);
      }

      if (failedCount === results.length) {
        setQuickAddValue(rawValue);
        const firstError = results.find(r => !r.success)?.error;
        console.error("[DayColumn] All failed:", firstError);
        throw new Error(firstError || "Falha ao criar");
      }
      if (failedCount > 0) {
        console.warn("[DayColumn] Partial failure", { failedCount, results });
        const firstError = results.find(r => !r.success)?.error;
        toast.error(firstError ? `Erro: ${firstError}` : `Falha ao criar ${failedCount} tarefa(s)`);
      }

    } catch (error) {
      console.error("[DayColumn] Catch error:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao criar tarefa");
      setQuickAddValue(rawValue);
    } finally {
      setIsCreating(false);
      setTimeout(focusQuickAddInput, 0);
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
      if (typeof window !== "undefined") {
        const ts = Date.now();
        sessionStorage.setItem("home_tasks_refresh_ts", String(ts));
        window.dispatchEvent(new CustomEvent("home-tasks-updated"));
      }
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      toast.error("Erro ao atualizar tarefa");
      startTransition(() => {
        addOptimisticTask({
          type: 'update',
          task: { id, status: checked ? "todo" : "done" }
        });
      });
    }
  };

  const handleOpenDetails = (id: string) => {
    setSelectedTaskId(String(id));
    setIsDetailModalOpen(true);
  };

  const handleDelete = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    const isVirtual = !!(task as any)?.is_virtual || (typeof taskId === "string" && taskId.includes("-virtual-"));
    const parentId = (task as any)?.recurrence_parent_id;

    if (isVirtual && parentId) {
      setTaskToDelete({ id: parentId, title: task?.title || "", uiRemoveId: taskId });
      setIsVirtualOccurrenceToDelete(true);
      setShowRecurringModal(true);
      return;
    }

    const isRecurring = !!task?.recurrence_type || !!parentId;
    if (isRecurring && task) {
      setTaskToDelete({ id: taskId, title: task.title || "" });
      setIsVirtualOccurrenceToDelete(false);
      setShowRecurringModal(true);
      return;
    }

    setTaskToDelete({ id: taskId, title: task?.title || "" });
    setShowDeleteModal(true);
  };

  const confirmDelete = async (deleteAllFuture: boolean = false) => {
    if (!taskToDelete) return;

    setIsDeleting(true);

    try {
      const idToRemoveFromUi = taskToDelete.uiRemoveId ?? taskToDelete.id;
      startTransition(() => {
        addOptimisticTask({ type: 'delete', id: idToRemoveFromUi });
      });

      // Se for "Excluir apenas esta" (Pular) para recorrente
      if (showRecurringModal && !deleteAllFuture) {
        // Lógica de update da data para "pular"
        const task = tasks.find(t => t.id === taskToDelete.id);
        if (task && task.recurrence_type) {
          const current = new Date(task.due_date || new Date());
          const interval = task.recurrence_interval || 1;
          const recurrenceDaysList = Array.isArray((task as any).recurrence_days)
            ? ((task as any).recurrence_days as Array<number | string>)
                .map((value) => Number(value))
                .filter((value) => Number.isFinite(value))
            : [];

          let nextDate = new Date(current);
          if ((task.recurrence_type === 'weekly' || task.recurrence_type === 'custom') && recurrenceDaysList.length > 0) {
            const daySet = new Set<number>(recurrenceDaysList);
            const base = new Date(current);
            base.setHours(0, 0, 0, 0);
            for (let i = 1; i <= 14; i++) {
              const candidate = new Date(base);
              candidate.setDate(base.getDate() + i);
              if (!daySet.has(candidate.getDay())) continue;
              candidate.setHours(current.getHours(), current.getMinutes(), current.getSeconds(), current.getMilliseconds());
              nextDate = candidate;
              break;
            }
          } else if (task.recurrence_type === 'daily') nextDate.setDate(nextDate.getDate() + interval);
          else if (task.recurrence_type === 'weekly') nextDate.setDate(nextDate.getDate() + (7 * interval));
          else if (task.recurrence_type === 'monthly') nextDate = addMonths(nextDate, interval);
          else if (task.recurrence_type === 'custom') nextDate.setDate(nextDate.getDate() + interval);

          // Atualizar data para pular ocorrência atual
          await updateTask({ id: taskToDelete.id, due_date: nextDate.toISOString() });
          toast.success("Ocorrência pulada com sucesso");
        } else {
          // Fallback
          await deleteTask(taskToDelete.id);
          toast.success("Tarefa excluída");
        }
      } else {
        // Excluir (Normal ou Série)
        // Se for série, backend deveria tratar, mas aqui estamos chamando delete simples por enquanto
        // Até termos action específica 'deleteSeries', delete normal já quebra a série futura
        const result = await deleteTask(taskToDelete.id);
        if (!result.success) throw new Error(result.error);
        toast.success("Tarefa excluída");
      }

      onTaskUpdate?.();
      if (typeof window !== "undefined") {
        const ts = Date.now();
        sessionStorage.setItem("home_tasks_refresh_ts", String(ts));
        window.dispatchEvent(new CustomEvent("home-tasks-updated"));
      }

    } catch (error) {
      console.error("Erro ao excluir:", error);
      toast.error("Erro ao processar exclusão");
      if (typeof window !== "undefined") {
        const ts = Date.now();
        sessionStorage.setItem("home_tasks_refresh_ts", String(ts));
        window.dispatchEvent(new CustomEvent("home-tasks-updated"));
      }
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
      setShowRecurringModal(false);
      setIsVirtualOccurrenceToDelete(false);
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
      if (typeof window !== "undefined") {
        const ts = Date.now();
        sessionStorage.setItem("home_tasks_refresh_ts", String(ts));
        window.dispatchEvent(new CustomEvent("home-tasks-updated"));
      }
    } catch (error) {
      console.error("Erro ao editar:", error);
      toast.error("Erro ao editar tarefa");
      if (typeof window !== "undefined") {
        const ts = Date.now();
        sessionStorage.setItem("home_tasks_refresh_ts", String(ts));
        window.dispatchEvent(new CustomEvent("home-tasks-updated"));
      }
    }
  };

  const handleMove = async (id: string, wid: string) => {
    try {
      startTransition(() => {
        addOptimisticTask({
          type: 'update',
          task: { id, workspace_id: wid, is_personal: false, visible_on_board: true, group_id: null }
        });
      });
      // Enviar para o inbox (group_id: null) do workspace selecionado
      await updateTask({ id, workspace_id: wid, is_personal: false, visible_on_board: true, group_id: null });
      onTaskUpdate?.(); // Notificar atualização
      if (typeof window !== "undefined") {
        const ts = Date.now();
        sessionStorage.setItem("home_tasks_refresh_ts", String(ts));
        window.dispatchEvent(new CustomEvent("home-tasks-updated"));
      }
    } catch (error) {
      console.error("Erro ao mover:", error);
      toast.error("Erro ao mover tarefa");
      if (typeof window !== "undefined") {
        const ts = Date.now();
        sessionStorage.setItem("home_tasks_refresh_ts", String(ts));
        window.dispatchEvent(new CustomEvent("home-tasks-updated"));
      }
    }
  };

  return (
    <div
      className={cn(
        "group/column relative flex flex-col h-full min-h-[420px] max-h-[67vh] rounded-2xl transition-all duration-300",
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
        <div className="flex items-center justify-between">
          <span className={cn(
            "text-xs font-bold uppercase tracking-wider",
            isToday ? "text-gray-900" : "text-gray-500"
          )}>
            {dayName}
          </span>
          <div className="flex items-center gap-2">
            {pendingCount > 0 && (
              <span className={cn(
                "text-xs font-medium px-2 py-0.5 rounded-full",
                isToday ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-500"
              )}>
                {pendingCount}
              </span>
            )}
            <span className={cn(
              "text-xs font-semibold tracking-tight",
              isToday ? "text-gray-900" : "text-gray-700"
            )}>
              {date}
            </span>
          </div>
        </div>
      </div>

      {/* --- TASK LIST (SCROLL AREA) --- */}
      <div
        ref={scrollRef}
        onScroll={updateScrollIndicators}
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
                  projectTags={projectTags}
                  onToggle={handleToggle}
                  onDelete={handleDelete}
                  onEdit={handleEdit}
                  onMoveToWorkspace={handleMove}
                  onDateUpdate={() => {
                    onTaskUpdate?.();
                    if (typeof window !== "undefined") {
                      const ts = Date.now();
                      sessionStorage.setItem("home_tasks_refresh_ts", String(ts));
                      window.dispatchEvent(new CustomEvent("home-tasks-updated"));
                    }
                  }}
                  onDateUpdateOptimistic={onTaskUpdateOptimistic}
                  onTagsUpdateOptimistic={onTagsUpdateOptimistic}
                  onOpenDetails={handleOpenDetails}
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

      {/* Indicador de overflow: fora do scroll para ficar fixo na base visível do card */}
      {isOverflowing && !isAtBottom && (
        <div className="pointer-events-none absolute inset-x-0 bottom-[56px] z-10">
          <div className="h-10 bg-gradient-to-t from-white via-white/70 to-transparent" />
          <div className="text-center text-[11px] font-medium text-gray-400 bg-white/80 pb-0.5">
            Mais tarefas abaixo
          </div>
        </div>
      )}

      {/* --- FOOTER / INPUT AREA --- */}
      <div className="flex-none px-3 pb-3 pt-2 relative">
        <div className="absolute -top-4 left-0 right-0 h-4 bg-gradient-to-t from-white to-transparent pointer-events-none" />

        <form ref={formRef} onSubmit={handleQuickAddSubmit} className="relative z-10">

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

          <div className="flex items-center gap-1 px-3 py-2 border-t border-gray-50 bg-gray-50/50 relative z-10 overflow-visible">
            <input
              ref={inputRef}
              placeholder="Nova tarefa..."
              value={quickAddValue}
              onChange={(e) => {
                setQuickAddValue(e.target.value);
                if (showTutorialHint && e.target.value.trim().length > 0) {
                  setShowTutorialHint(false);
                }
              }}
              onFocus={handleInputFocus}
              onBlur={() => setIsQuickAddFocused(false)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  e.currentTarget.form?.requestSubmit();
                  e.currentTarget.focus();
                }
              }}
              className="flex-1 min-w-0 bg-transparent border-none outline-none text-xs text-gray-800 placeholder:text-gray-400 h-7"
            />

            <TaskDateTimePicker
              date={selectedDateTime}
              onSelect={setSelectedDateTime}
              defaultDateWhenNull={dateObj ?? undefined}
              recurrenceType={recurrenceType}
              onRecurrenceChange={(type) => {
                setRecurrenceType(type);
                recurrenceTypeRef.current = type;
              }}
              recurrenceDays={recurrenceDays}
              onRecurrenceDaysChange={(days) => {
                setRecurrenceDays(days);
                recurrenceDaysRef.current = days;
              }}
              allowCustomRecurrence={false}
              onConfirmApplied={() => {
                if (quickAddValue.trim()) {
                  formRef.current?.requestSubmit();
                }
              }}
              align="start"
              side="top"
              trigger={
                <button
                  type="button"
                  className={cn(
                    "h-7 w-7 rounded-md hover:bg-gray-200 transition-colors flex items-center justify-center flex-shrink-0",
                    selectedDateTime ? "bg-gray-900 text-white" : "text-gray-500"
                  )}
                  aria-label="Agendar"
                  title="Agendar"
                >
                  {recurrenceType ? <Repeat className="w-3.5 h-3.5" /> : <CalendarIcon className="w-3.5 h-3.5" />}
                </button>
              }
            />

            <button
              type="submit"
              disabled={isCreating || !quickAddValue.trim()}
              className={cn(
                "h-7 w-7 rounded-md hover:bg-gray-200 transition-colors flex items-center justify-center flex-shrink-0",
                isCreating || !quickAddValue.trim()
                  ? "text-gray-400 cursor-not-allowed"
                  : "text-gray-600 hover:text-gray-900"
              )}
              aria-label="Salvar"
              title="Salvar"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
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
        hideOnlyThisOption={isVirtualOccurrenceToDelete}
      />

      {selectedTaskId && (
        <TaskDetailModal
          open={isDetailModalOpen}
          onOpenChange={setIsDetailModalOpen}
          task={sortedTasks.find((t) => String(t.id) === selectedTaskId) as any}
          onTaskUpdated={() => {
            onTaskUpdate?.();
            if (typeof window !== "undefined") {
              const ts = Date.now();
              sessionStorage.setItem("home_tasks_refresh_ts", String(ts));
              window.dispatchEvent(new CustomEvent("home-tasks-updated"));
            }
          }}
        />
      )}
    </div>
  );
}
