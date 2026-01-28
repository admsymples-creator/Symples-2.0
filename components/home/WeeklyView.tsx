"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { DayColumn } from "@/components/home/DayColumn";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Database } from "@/types/database.types";
import { PlannerCalendar } from "@/components/calendar/planner-calendar";

type Task = Database["public"]["Tables"]["tasks"]["Row"];

interface WeeklyViewProps {
  tasks: Task[];
  workspaces: { id: string; name: string }[];
  highlightInput?: boolean;
  onTaskUpdate?: () => void; // Callback para notificar atualizações
  currentWorkspaceId?: string | null;
  isPersonal?: boolean;
}

export function WeeklyView({ tasks, workspaces, highlightInput = false, onTaskUpdate, currentWorkspaceId, isPersonal = true }: WeeklyViewProps) {
  const [viewMode, setViewMode] = useState<"week" | "month">("week");
  const shouldReduceMotion = useReducedMotion();
  const daysToShow = 5;

  const formatLocalDateKey = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const handleViewModeChange = (value: string) => {
    const mode = value === "month" ? "month" : "week";
    setViewMode(mode);
  };

  // Agrupar tarefas por dia (Memoizado)
  const tasksByDay = useMemo(() => {
    const grouped: Record<string, Task[]> = {};
    const processedKeys = new Set<string>(); // Para evitar duplicatas virtuais

    // 1. Agrupar tarefas reais
    tasks.forEach((task) => {
      if (!task.due_date) return;
      const taskDate = new Date(task.due_date);

      // Usar SEMPRE o horário local para agrupamento visual, pois as colunas são dias locais.
      // Isso evita que tarefas de workspace (UTC) de fim de dia caiam no dia seguinte visualmente.
      const dateKey = formatLocalDateKey(taskDate);

      if (!grouped[dateKey]) grouped[dateKey] = [];
      grouped[dateKey].push(task);

      // Marcar chave única para evitar gerar virtual neste mesmo dia para esta série
      // Usando ID ou título como "chave da série" simples por enquanto
      if (task.recurrence_type) {
        const seriesKey = task.recurrence_parent_id || task.id;
        const uniqueKey = `${dateKey}-${seriesKey}`;
        processedKeys.add(uniqueKey);
      }
    });

    // 2. Gerar tarefas virtuais (Projeção) para os próximos dias visíveis
    const today = new Date();
    // Limite de projeção: hoje + dias configurados (3 ou 5) + margem
    const limitDate = new Date(today);
    limitDate.setDate(today.getDate() + (daysToShow === 3 ? 3 : 6));

    tasks.forEach((task) => {
      // Apenas tarefas recorrentes ativas e não concluídas (ou concluídas recentemente se quisermos projetar a partir delas)
      // Simplificação: Projetar a partir de tarefas não arquivadas com recorrência
      if (!task.recurrence_type || !task.due_date || task.status === 'archived') return;

      const taskDate = new Date(task.due_date);
      let nextDate = new Date(taskDate);
      const interval = task.recurrence_interval || 1;
      const recurrenceEndDate = task.recurrence_end_date ? new Date(task.recurrence_end_date) : null;
      const maxOccurrences = typeof task.recurrence_count === "number" && task.recurrence_count > 0
        ? task.recurrence_count
        : null;
      const recurrenceDays = Array.isArray((task as any).recurrence_days)
        ? ((task as any).recurrence_days as number[])
        : [];

      // Projetar até o limite da visualização
      const now = new Date();
      now.setHours(0, 0, 0, 0);

      let loops = 0;
      const MAX_LOOPS = 50;

      if ((task.recurrence_type === 'weekly' || task.recurrence_type === 'custom') && recurrenceDays.length > 0) {
        const daySet = new Set<number>(recurrenceDays);
        const baseDate = new Date(taskDate);
        baseDate.setHours(0, 0, 0, 0);
        const baseTime = {
          hours: taskDate.getHours(),
          minutes: taskDate.getMinutes(),
          seconds: taskDate.getSeconds(),
          ms: taskDate.getMilliseconds(),
        };

        const cursor = new Date(now);
        if (cursor < baseDate) {
          cursor.setTime(baseDate.getTime());
        }
        cursor.setDate(cursor.getDate() + 1);

        let occurrences = 1;
        while (cursor <= limitDate && loops < MAX_LOOPS) {
          loops++;

          const daysSinceBase = Math.floor((cursor.getTime() - baseDate.getTime()) / (24 * 60 * 60 * 1000));
          const weeksSinceBase = Math.floor(daysSinceBase / 7);

          if (daySet.has(cursor.getDay()) && weeksSinceBase % interval === 0) {
            const nextDateKey = formatLocalDateKey(cursor);
            const seriesKey = task.recurrence_parent_id || task.id;
            const uniqueKey = `${nextDateKey}-${seriesKey}`;
            if (!processedKeys.has(uniqueKey)) {
              const nextDateWithTime = new Date(cursor);
              nextDateWithTime.setHours(baseTime.hours, baseTime.minutes, baseTime.seconds, baseTime.ms);

              if (recurrenceEndDate && nextDateWithTime > recurrenceEndDate) {
                break;
              }
              if (maxOccurrences !== null && occurrences >= maxOccurrences) {
                break;
              }

              const virtualTask = {
                ...task,
                id: `virtual-${task.id}-${nextDateWithTime.getTime()}`,
                due_date: nextDateWithTime.toISOString(),
                status: 'todo',
                is_virtual: true,
              } as Task & { is_virtual?: boolean };

              if (!grouped[nextDateKey]) grouped[nextDateKey] = [];
              grouped[nextDateKey].push(virtualTask);
              processedKeys.add(uniqueKey);
              occurrences += 1;
            }
          }

          cursor.setDate(cursor.getDate() + 1);
        }
      } else {
        const dayMs = 24 * 60 * 60 * 1000;
        let occurrences = 1;

        // Sempre pular a data base (tarefa real) e avan?ar para a pr?xima ocorr?ncia
        if (task.recurrence_type === 'daily' || task.recurrence_type === 'custom') {
          nextDate.setDate(nextDate.getDate() + interval);
        } else if (task.recurrence_type === 'weekly') {
          nextDate.setDate(nextDate.getDate() + (7 * interval));
        } else if (task.recurrence_type === 'monthly') {
          nextDate.setMonth(nextDate.getMonth() + interval);
        }

        // Fast-forward quando a tarefa base ? antiga (evita limite de loops)
        if (nextDate <= now) {
          if (task.recurrence_type === 'daily' || task.recurrence_type === 'custom') {
            const daysDiff = Math.floor((now.getTime() - nextDate.getTime()) / dayMs);
            const steps = Math.floor(daysDiff / interval);
            nextDate.setDate(nextDate.getDate() + (steps * interval));
            if (nextDate <= now) nextDate.setDate(nextDate.getDate() + interval);
          } else if (task.recurrence_type === 'weekly') {
            const weeksDiff = Math.floor((now.getTime() - nextDate.getTime()) / dayMs / 7);
            const steps = Math.floor(weeksDiff / interval);
            nextDate.setDate(nextDate.getDate() + (steps * 7 * interval));
            if (nextDate <= now) nextDate.setDate(nextDate.getDate() + (7 * interval));
          } else if (task.recurrence_type === 'monthly') {
            const monthsDiff = (now.getFullYear() - nextDate.getFullYear()) * 12 + (now.getMonth() - nextDate.getMonth());
            const steps = Math.floor(monthsDiff / interval);
            nextDate.setMonth(nextDate.getMonth() + (steps * interval));
            if (nextDate <= now) nextDate.setMonth(nextDate.getMonth() + interval);
          }
        }

        while (nextDate <= limitDate && loops < MAX_LOOPS) {
          loops++;

          if (recurrenceEndDate && nextDate > recurrenceEndDate) break;
          if (maxOccurrences !== null && occurrences >= maxOccurrences) {
            break;
          }

          // Gerar chave de data para o agrupamento (Local Time)
          const nextDateKey = formatLocalDateKey(nextDate);

          // Verificar conflito: J? existe tarefa real dessa s?rie neste dia?
          const seriesKey = task.recurrence_parent_id || task.id;
          const uniqueKey = `${nextDateKey}-${seriesKey}`;
          if (!processedKeys.has(uniqueKey)) {
            // Criar Tarefa Virtual
            const virtualTask = {
              ...task,
              id: `virtual-${task.id}-${nextDate.getTime()}`,
              due_date: nextDate.toISOString(),
              status: 'todo', // Sempre 'todo'
              is_virtual: true, // Flag para UI
            } as Task & { is_virtual?: boolean };

            if (!grouped[nextDateKey]) grouped[nextDateKey] = [];
            grouped[nextDateKey].push(virtualTask);
            processedKeys.add(uniqueKey);
            occurrences += 1;
          }

          // Avan?ar para a pr?xima ocorr?ncia
          if (task.recurrence_type === 'daily' || task.recurrence_type === 'custom') {
            nextDate = new Date(nextDate);
            nextDate.setDate(nextDate.getDate() + interval);
          } else if (task.recurrence_type === 'weekly') {
            nextDate = new Date(nextDate);
            nextDate.setDate(nextDate.getDate() + (7 * interval));
          } else if (task.recurrence_type === 'monthly') {
            nextDate = new Date(nextDate);
            nextDate.setMonth(nextDate.getMonth() + interval);
          } else {
            break;
          }
        }
      }
    });

    return grouped;
  }, [tasks]);

  // Gerar dias para exibição
  const weekDays = useMemo(() => {
    const today = new Date();
    const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    const fullDayNames = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

    const days = [];
    let startOffset = 0;
    let endOffset = 0;

    if (daysToShow === 3) {
      const currentDayOfWeek = today.getDay();
      startOffset = -1;
      endOffset = 1;
      if (currentDayOfWeek === 0) { startOffset = 0; endOffset = 2; }
      if (currentDayOfWeek === 6) { startOffset = -2; endOffset = 0; }
    } else {
      startOffset = -2;
      endOffset = 2;
    }

    for (let i = startOffset; i <= endOffset; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dayOfWeek = date.getDay();
      const isToday = i === 0;
      const dateKey = formatLocalDateKey(date);

      days.push({
        id: dateKey, // ID estável para animação
        name: fullDayNames[dayOfWeek],
        shortName: dayNames[dayOfWeek],
        date: date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
        dateObj: date,
        tasks: tasksByDay[dateKey] || [],
        isToday,
      });
    }
    return days;
  }, [tasksByDay]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900">
          {viewMode === "month" ? "Visão Mensal" : "Visão Semanal"}
        </h2>
        <div className="flex items-center gap-3">
          <Tabs value={viewMode} onValueChange={handleViewModeChange}>
            <TabsList variant="default">
              <TabsTrigger value="week" variant="default">Semana</TabsTrigger>
              <TabsTrigger value="month" variant="default">Mês</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      <AnimatePresence mode="sync" initial={false}>
        <motion.div
          key={viewMode}
          initial={shouldReduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: shouldReduceMotion ? 1 : 0 }}
          transition={shouldReduceMotion ? undefined : { duration: 0.15 }}
        >
          {viewMode === "month" ? (
            <div className="h-[720px]">
              <PlannerCalendar
                workspaceId={isPersonal ? null : (currentWorkspaceId ?? undefined)}
                hideViewTabs={true}
              />
            </div>
          ) : (
            <div className="grid gap-4 grid-cols-1 md:grid-cols-3 lg:grid-cols-5">
              {weekDays.map((day) => (
                <div key={day.id}>
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
                  />
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
