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
  highlightInput?: boolean;
  onTaskUpdate?: () => void | Promise<void>;
  currentWorkspaceId?: string | null;
  isPersonal?: boolean;
  originContext?: string;
}

// Função auxiliar para calcular próxima data de recorrência
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

export function WeeklyView({ tasks, workspaces, highlightInput = false, onTaskUpdate, currentWorkspaceId, isPersonal = true, originContext }: WeeklyViewProps) {
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

  // Calcular range de datas visíveis para projeção de recorrência
  const visibleDateRange = useMemo(() => {
    const today = new Date();
    // Expandir range para cobrir navegação (±30 dias do offset atual)
    const startDate = new Date(today);
    startDate.setDate(today.getDate() + weekOffset - 7);
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + weekOffset + daysToShow + 7);
    return { startDate, endDate };
  }, [weekOffset, daysToShow]);

  // Agrupar tarefas por dia com projeção de recorrência
  const tasksByDay = useMemo(() => {
    const grouped: Record<string, Task[]> = {};
    const processedRecurrenceIds = new Set<string>();

    // Primeiro, adicionar todas as tarefas reais
    tasks.forEach((task) => {
      if (!task.due_date) return;
      const dateKey = formatLocalDateKey(new Date(task.due_date));
      if (!grouped[dateKey]) grouped[dateKey] = [];
      grouped[dateKey].push(task);

      // Marcar tarefas recorrentes como processadas na sua data original
      if (task.recurrence_type) {
        processedRecurrenceIds.add(`${task.id}-${dateKey}`);
      }
    });

    // Projetar tarefas recorrentes para dias futuros dentro do range visível
    tasks.forEach((task) => {
      if (!task.recurrence_type || !task.due_date || task.status === "done") return;
      
      const taskAny = task as any;
      const recurrenceDays = Array.isArray(taskAny.recurrence_days) ? taskAny.recurrence_days : null;
      const interval = task.recurrence_interval || 1;
      
      let currentDate = new Date(task.due_date);
      const maxProjections = 30; // Limitar projeções para performance
      
      for (let i = 0; i < maxProjections; i++) {
        const nextDate = getNextRecurrenceDate(currentDate, task.recurrence_type, interval, recurrenceDays);
        
        // Parar se ultrapassar o range visível
        if (nextDate > visibleDateRange.endDate) break;
        
        // Verificar recurrence_end_date
        if (task.recurrence_end_date && nextDate > new Date(task.recurrence_end_date)) break;
        
        const nextDateKey = formatLocalDateKey(nextDate);
        const projectionKey = `${task.id}-${nextDateKey}`;
        
        // Só adicionar se não foi processada e está no range
        if (!processedRecurrenceIds.has(projectionKey) && nextDate >= visibleDateRange.startDate) {
          if (!grouped[nextDateKey]) grouped[nextDateKey] = [];
          
          // Criar tarefa virtual (projetada)
          const virtualTask: Task = {
            ...task,
            id: `${task.id}-virtual-${nextDateKey}`,
            due_date: nextDate.toISOString(),
            recurrence_parent_id: task.id,
          } as Task;
          
          // Marcar como virtual para UI
          (virtualTask as any).is_virtual = true;
          
          grouped[nextDateKey].push(virtualTask);
          processedRecurrenceIds.add(projectionKey);
        }
        
        currentDate = nextDate;
      }
    });

    return grouped;
  }, [tasks, formatLocalDateKey, visibleDateRange]);

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
                    className="w-full shrink-0 md:w-[calc((100%-2rem)/3)] lg:w-[calc((100%-4rem)/5)]"
                  >
                    <DayColumn
                      dayName={day.name}
                      date={day.date}
                      dateObj={day.dateObj}
                      tasks={day.tasks}
                      isToday={day.isToday}
                      workspaces={workspaces}
                      highlightInput={highlightInput && day.isToday}
                      onTaskUpdate={onTaskUpdate}
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

