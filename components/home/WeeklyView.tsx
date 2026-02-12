"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { DayColumn } from "@/components/home/DayColumn";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Database } from "@/types/database.types";
import { PlannerCalendar } from "@/components/calendar/planner-calendar";
import { ChevronLeft, ChevronRight } from "lucide-react";

type Task = Database["public"]["Tables"]["tasks"]["Row"];

interface WeeklyViewProps {
  tasks: Task[];
  workspaces: { id: string; name: string }[];
  /** Tags (projetos) do workspace para "Atribuir ao Projeto" */
  projectTags?: string[];
  highlightInput?: boolean;
  onTaskUpdate?: () => void | Promise<void>;
  /** Atualização otimista de data: (taskId, dueDate) para a UI refletir na hora */
  onTaskUpdateOptimistic?: (taskId: string, dueDate: string | null) => void;
  /** Atualização otimista de tags (projeto) */
  onTagsUpdateOptimistic?: (taskId: string, tags: string[]) => void;
  currentWorkspaceId?: string | null;
  isPersonal?: boolean;
  originContext?: string;
}

// Função auxiliar para calcular próxima data de recorrência
/** Verifica se uma recorrência deveria ter uma ocorrência na data-alvo */
function shouldHaveOccurrenceOn(
  dueDateObj: Date,          // due_date da task raiz, normalizado para meia-noite local
  recurrenceType: string,
  interval: number,
  recurrenceDays: number[] | null,
  recurrenceEndDate: Date | null,
  targetDate: Date           // dia a verificar, normalizado para meia-noite local
): boolean {
  if (targetDate < dueDateObj) return false;
  if (recurrenceEndDate && targetDate > recurrenceEndDate) return false;

  // weekly/custom com dias específicos: qualquer dia da semana que esteja na lista
  if ((recurrenceType === "weekly" || recurrenceType === "custom") && recurrenceDays && recurrenceDays.length > 0) {
    return recurrenceDays.includes(targetDate.getDay());
  }

  const msPerDay = 24 * 60 * 60 * 1000;
  const daysDiff = Math.round((targetDate.getTime() - dueDateObj.getTime()) / msPerDay);

  switch (recurrenceType) {
    case "daily":
      return daysDiff % interval === 0;
    case "weekly":
      return targetDate.getDay() === dueDateObj.getDay()
        && Math.round(daysDiff / 7) % interval === 0;
    case "monthly": {
      if (targetDate.getDate() !== dueDateObj.getDate()) return false;
      const monthsDiff =
        (targetDate.getFullYear() - dueDateObj.getFullYear()) * 12
        + (targetDate.getMonth() - dueDateObj.getMonth());
      return monthsDiff % interval === 0;
    }
    case "custom":
      return daysDiff % interval === 0;
    default:
      return false;
  }
}

function getNextRecurrenceDate(
  currentDate: Date,
  recurrenceType: string,
  interval: number = 1,
  recurrenceDays?: number[] | null
): Date {
  const next = new Date(currentDate);
  
  if ((recurrenceType === "weekly" || recurrenceType === "custom") && recurrenceDays && recurrenceDays.length > 0) {
    // Para recorrência semanal com dias específicos
    const daySet = new Set(recurrenceDays);
    for (let i = 1; i <= 14; i++) {
      const candidate = new Date(currentDate);
      candidate.setDate(currentDate.getDate() + i);
      if (daySet.has(candidate.getDay())) {
        return candidate;
      }
    }
  }
  
  switch (recurrenceType) {
    case "daily":
      next.setDate(next.getDate() + interval);
      break;
    case "weekly":
      next.setDate(next.getDate() + 7 * interval);
      break;
    case "monthly":
      next.setMonth(next.getMonth() + interval);
      break;
    case "custom":
      next.setDate(next.getDate() + interval);
      break;
  }
  
  return next;
}

export function WeeklyView({ tasks, workspaces, projectTags = [], highlightInput = false, onTaskUpdate, onTaskUpdateOptimistic, onTagsUpdateOptimistic, currentWorkspaceId, isPersonal = true, originContext }: WeeklyViewProps) {
  const [viewMode, setViewMode] = useState<"week" | "month">("week");
  const daysToShow: number = 5;
  const initialWeekOffset = -Math.floor(daysToShow / 2);
  const [weekOffset, setWeekOffset] = useState(initialWeekOffset);
  const [trackOffset, setTrackOffset] = useState(0);
  const [isSliding, setIsSliding] = useState(false);
  const shouldReduceMotion = useReducedMotion();
  const trackRef = useRef<HTMLDivElement | null>(null);
  const stepRef = useRef(0);

  const formatLocalDateKey = useCallback((date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }, []);

  const handleViewModeChange = (value: string) => {
    const mode = value === "month" ? "month" : "week";
    setViewMode(mode);
  };

  const measureStep = () => {
    if (!trackRef.current) return;
    const first = trackRef.current.querySelector("[data-day-column]") as HTMLElement | null;
    const style = getComputedStyle(trackRef.current);
    const gap = parseFloat(style.columnGap || style.gap || "16");
    const width = first?.getBoundingClientRect().width || trackRef.current.clientWidth;
    stepRef.current = width + gap;
  };

  const slideTrack = (direction: -1 | 1) => {
    if (isSliding) return;
    
    if (shouldReduceMotion) {
      setWeekOffset((prev) => prev + direction);
      return;
    }

    if (!stepRef.current) measureStep();
    
    // CORREÇÃO: Primeiro, desativamos a animação para "pular" a posição
    setIsSliding(true);
    // O trackOffset pula para onde a nova coluna VAI estar
    setTrackOffset(-direction * stepRef.current);
    
    // Atualizamos os dados
    setWeekOffset((prev) => prev + direction);
  };

  const handlePrevDay = () => slideTrack(-1);
  const handleNextDay = () => slideTrack(1);

  // EFEITO DE DISPARO DA ANIMAÇÃO (Slide de volta para o 0)
  useEffect(() => {
    if (!isSliding || shouldReduceMotion) return;

    // Usamos dois RFAs para garantir que o browser aplicou o 'jump' inicial
    // e os novos cards já estão no DOM antes de começar o slide de volta
    const frame = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setTrackOffset(0);
      });
    });

    // Segurança: se por algum motivo a animação não resetar o estado, limpamos após 600ms
    const timeout = setTimeout(() => setIsSliding(false), 600);

    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timeout);
    };
  }, [weekOffset, isSliding, shouldReduceMotion]);

  // Calcular range de datas visíveis para projeção de recorrência (início/fim do dia para evitar edge cases de timezone)
  const visibleDateRange = useMemo(() => {
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() + weekOffset - 7);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + weekOffset + daysToShow + 7);
    endDate.setHours(23, 59, 59, 999);
    return { startDate, endDate };
  }, [weekOffset, daysToShow]);

  // Agrupar tarefas por dia com projeção de recorrência
  const tasksByDay = useMemo(() => {
    const grouped: Record<string, Task[]> = {};
    const processedRecurrenceIds = new Set<string>();
    type SeriesInfo = {
      parentId: string;
      baseTask: Task;
      earliestDue: Date;
      latestDue: Date;
      hasNonDone: boolean;
    };
    const seriesMap = new Map<string, SeriesInfo>();

    // Primeiro, adicionar todas as tarefas reais (chave por dia local para evitar timezone)
    tasks.forEach((task) => {
      if (!task.due_date) return;
      const d = new Date(task.due_date);
      const dateKey = formatLocalDateKey(new Date(d.getFullYear(), d.getMonth(), d.getDate()));
      if (!grouped[dateKey]) grouped[dateKey] = [];
      grouped[dateKey].push(task);

      // Marcar tarefas recorrentes como processadas na sua data original
      const taskAny = task as any;
      if (task.recurrence_type || taskAny.recurrence_parent_id) {
        const parentId = taskAny.recurrence_parent_id || task.id;
        processedRecurrenceIds.add(`${parentId}-${dateKey}`);

        // Construir mapa da série recorrente (pais + filhos) para projeções futuras/passadas
        const taskDateNorm = new Date(d.getFullYear(), d.getMonth(), d.getDate());
        const isNonDone = task.status !== "done";
        const existing = seriesMap.get(parentId);

        if (!existing) {
          seriesMap.set(parentId, {
            parentId,
            baseTask: task,
            earliestDue: taskDateNorm,
            latestDue: taskDateNorm,
            hasNonDone: isNonDone,
          });
        } else {
          if (taskDateNorm < existing.earliestDue) existing.earliestDue = taskDateNorm;
          if (taskDateNorm > existing.latestDue) existing.latestDue = taskDateNorm;
          if (isNonDone) existing.hasNonDone = true;

          // Preferimos uma baseTask que tenha recurrence_type definido e, se possível, não concluída
          const existingAny = existing.baseTask as any;
          const existingHasRecurrence = !!existing.baseTask.recurrence_type;
          const candidateHasRecurrence = !!task.recurrence_type;

          if (
            candidateHasRecurrence &&
            (!existingHasRecurrence ||
              existing.baseTask.status === "done" && task.status !== "done")
          ) {
            existing.baseTask = task;
          } else {
            // Garantir que ao menos tenhamos uma baseTask com recurrence_type se algum filho tiver
            if (!existingHasRecurrence && candidateHasRecurrence) {
              existing.baseTask = task;
            }
          }

          seriesMap.set(parentId, existing);
        }
      }
    });

    // Projetar tarefas recorrentes para dias futuros dentro do range visível
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    seriesMap.forEach((series) => {
      const base = series.baseTask;
      // Precisamos de configuração de recorrência e pelo menos uma ocorrência não concluída na série
      if (!base.recurrence_type || !base.due_date || !series.hasNonDone) return;

      const baseAny = base as any;
      const recurrenceDays = Array.isArray(baseAny.recurrence_days) ? baseAny.recurrence_days : null;
      const interval = base.recurrence_interval || 1;

      let currentDate = new Date(series.latestDue);
      const maxProjections = 30; // Limitar projeções para performance

      for (let i = 0; i < maxProjections; i++) {
        const nextDate = getNextRecurrenceDate(currentDate, base.recurrence_type, interval, recurrenceDays);

        // Parar se ultrapassar o range visível
        if (nextDate > visibleDateRange.endDate) break;

        // Verificar recurrence_end_date
        if (base.recurrence_end_date && nextDate > new Date(base.recurrence_end_date)) break;

        const nextDateKey = formatLocalDateKey(new Date(nextDate.getFullYear(), nextDate.getMonth(), nextDate.getDate()));
        const projectionKey = `${series.parentId}-${nextDateKey}`;

        // Evitar duplicata: não projetar virtual se já existe a tarefa real nesse dia (qualquer pai/filho da série)
        const alreadyHasRealOnDay = grouped[nextDateKey]?.some((t) => {
          const tAny = t as any;
          const tParentId = tAny.recurrence_parent_id || t.id;
          return tParentId === series.parentId;
        }) ?? false;

        const inRange = nextDate >= visibleDateRange.startDate && nextDate <= visibleDateRange.endDate;

        if (!processedRecurrenceIds.has(projectionKey) && inRange && !alreadyHasRealOnDay && nextDate >= todayStart) {
          if (!grouped[nextDateKey]) grouped[nextDateKey] = [];

          // Todas as projeções são virtuais (somente leitura); evita ações com ID inexistente no banco
          const virtualTask: Task = {
            ...base,
            id: `${series.parentId}-virtual-${nextDateKey}`,
            due_date: nextDate.toISOString(),
            recurrence_parent_id: series.parentId,
          } as Task;

          (virtualTask as any).is_virtual = true;

          grouped[nextDateKey].push(virtualTask);
          processedRecurrenceIds.add(projectionKey);
        }

        currentDate = nextDate;
      }
    });

    // Projetar "falhas" de recorrência para dias passados VISÍVEIS (não concluídas, não materializadas)
    const nowMidnight = new Date(); nowMidnight.setHours(0, 0, 0, 0);
    const visiblePastDays: { dateKey: string; dateObj: Date }[] = [];
    for (let offset = weekOffset; offset <= weekOffset + (daysToShow - 1); offset++) {
      const d = new Date(); d.setDate(d.getDate() + offset); d.setHours(0, 0, 0, 0);
      if (d < nowMidnight) visiblePastDays.push({ dateKey: formatLocalDateKey(d), dateObj: d });
    }

    if (visiblePastDays.length > 0) {
      seriesMap.forEach((series) => {
        const base = series.baseTask;
        if (!base.recurrence_type || !base.due_date || !series.hasNonDone) return;

        const baseAny = base as any;
        const recurrenceDays = Array.isArray(baseAny.recurrence_days) ? baseAny.recurrence_days : null;
        const interval = base.recurrence_interval || 1;

        // Usar a primeira ocorrência conhecida na série como âncora de recorrência
        const dueNorm = new Date(series.earliestDue);
        dueNorm.setHours(0, 0, 0, 0);

        const endNorm = base.recurrence_end_date
          ? (() => { const d = new Date(base.recurrence_end_date); d.setHours(0, 0, 0, 0); return d; })()
          : null;

        for (const { dateKey, dateObj } of visiblePastDays) {
          const projectionKey = `${series.parentId}-${dateKey}`;
          if (processedRecurrenceIds.has(projectionKey)) continue;

          const hasReal = grouped[dateKey]?.some((t) => {
            const tAny = t as any;
            const tParentId = tAny.recurrence_parent_id || t.id;
            return tParentId === series.parentId;
          }) ?? false;
          if (hasReal) continue;

          if (!shouldHaveOccurrenceOn(dueNorm, base.recurrence_type, interval, recurrenceDays, endNorm, dateObj)) continue;

          if (!grouped[dateKey]) grouped[dateKey] = [];
          const missedTask: Task = {
            ...base,
            id: `${series.parentId}-missed-${dateKey}`,
            due_date: dateObj.toISOString(),
            recurrence_parent_id: series.parentId,
          } as Task;
          (missedTask as any).is_missed_virtual = true;
          grouped[dateKey].push(missedTask);
          processedRecurrenceIds.add(projectionKey);
        }
      });
    }

      // Ordenar tarefas de cada dia: com horário no topo (e entre elas por horário), depois sem horário
    // "Sem horário" = meia-noite em UTC (backend) ou meia-noite em local (app); senão = com horário
    const hasSpecificTime = (t: Task) => {
      if (!t.due_date) return false;
      const d = new Date(t.due_date);
      const utcMidnight = d.getUTCHours() === 0 && d.getUTCMinutes() === 0;
      const localMidnight = d.getHours() === 0 && d.getMinutes() === 0;
      return !utcMidnight && !localMidnight;
    };
    const sortKey = (t: Task) => (t.due_date ? new Date(t.due_date).getTime() : 0);
    Object.keys(grouped).forEach((key) => {
      grouped[key].sort((a, b) => {
        const aHas = hasSpecificTime(a);
        const bHas = hasSpecificTime(b);
        if (aHas && !bHas) return -1;
        if (!aHas && bHas) return 1;
        if (aHas && bHas) return sortKey(a) - sortKey(b);
        return sortKey(a) - sortKey(b);
      });
    });

    return grouped;
  }, [tasks, formatLocalDateKey, visibleDateRange, weekOffset, daysToShow]);

  const monthStats = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    monthEnd.setHours(23, 59, 59, 999);

    const tasksInMonth = tasks.filter((task) => {
      if (!task.due_date) return false;
      const due = new Date(task.due_date);
      return due >= monthStart && due <= monthEnd;
    });

    const doneCount = tasksInMonth.filter((task) => task.status === "done").length;
    const totalCount = tasksInMonth.length;
    const progress = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

    return { doneCount, totalCount, progress };
  }, [tasks]);

  // Gerar dias para exibição
  const weekDays = useMemo(() => {
    const today = new Date();
    const days = [];
    const startOffset = weekOffset;
    const endOffset = weekOffset + (daysToShow - 1);

    for (let i = startOffset; i <= endOffset; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dateKey = formatLocalDateKey(date);
      days.push({
        id: dateKey,
        name: date.toLocaleDateString("pt-BR", { weekday: 'long' }),
        date: date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
        dateObj: date,
        tasks: tasksByDay[dateKey] || [],
        isToday: dateKey === formatLocalDateKey(today),
      });
    }
    return days;
  }, [tasksByDay, weekOffset, daysToShow]);

  useEffect(() => {
    if (viewMode !== "week") return;
    measureStep();
    window.addEventListener("resize", measureStep);
    return () => window.removeEventListener("resize", measureStep);
  }, [viewMode, weekDays.length]);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-6">
        <Tabs value={viewMode} onValueChange={handleViewModeChange}>
          <TabsList>
            <TabsTrigger value="week">Minha semana</TabsTrigger>
            <TabsTrigger value="month">Meu mês</TabsTrigger>
          </TabsList>
        </Tabs>
        
        {viewMode === "week" && (
          <div className="flex gap-2">
            <button onClick={handlePrevDay} className="p-2 border rounded-md hover:bg-gray-50 transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={handleNextDay} className="p-2 border rounded-md hover:bg-gray-50 transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      <AnimatePresence mode="sync">
        <motion.div key={viewMode} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
          {viewMode === "month" ? (
            <div className="h-[720px]">
              <PlannerCalendar
                workspaceId={isPersonal ? null : (currentWorkspaceId ?? undefined)}
                hideViewTabs={true}
                fillHeight={true}
                forcePersonal={isPersonal}
              />
            </div>
          ) : (
            <div className="overflow-hidden">
              <div
                ref={trackRef}
                onTransitionEnd={() => setIsSliding(false)}
                className="flex gap-4"
                style={{
                  transform: `translateX(${trackOffset}px)`,
                  // A transição só existe quando estamos voltando para o 0
                  transition: isSliding && trackOffset === 0 && !shouldReduceMotion
                    ? "transform 0.7s cubic-bezier(0.25, 1, 0.5, 1)"
                    : "none",
                  willChange: "transform",
                }}
              >
                {weekDays.map((day) => (
                  <div
                    key={day.id}
                    data-day-column
                    data-today={day.isToday ? "true" : undefined}
                    data-date={day.id}
                    className="w-full shrink-0 md:w-[calc((100%-2rem)/3)] lg:w-[calc((100%-4rem)/5)]"
                  >
                    <DayColumn
                      dayName={day.name}
                      date={day.date}
                      dateObj={day.dateObj}
                      tasks={day.tasks}
                      isToday={day.isToday}
                      workspaces={workspaces}
                      projectTags={projectTags}
                      highlightInput={highlightInput && day.isToday}
                      onTaskUpdate={onTaskUpdate}
                      onTaskUpdateOptimistic={onTaskUpdateOptimistic}
                      onTagsUpdateOptimistic={onTagsUpdateOptimistic}
                      currentWorkspaceId={currentWorkspaceId}
                      isPersonalContext={isPersonal}
                      originContext={originContext}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

