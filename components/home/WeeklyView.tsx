"use client";

import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { DayColumn } from "@/components/home/DayColumn";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Database } from "@/types/database.types";

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
  // Estado local para controlar a visualização (3 ou 5 dias)
  const [daysToShow, setDaysToShow] = useState<3 | 5>(5);
  const shouldReduceMotion = useReducedMotion();

  // Carregar preferência salva no mount
  useEffect(() => {
    const saved = localStorage.getItem("dashboard_daysToShow");
    if (saved === "3" || saved === "5") {
      setDaysToShow(parseInt(saved) as 3 | 5);
    }
  }, []);

  // Salvar preferência ao mudar
  const handleViewChange = (value: string) => {
    const newValue = parseInt(value) as 3 | 5;
    setDaysToShow(newValue);
    localStorage.setItem("dashboard_daysToShow", value);
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
      const dateKey = taskDate.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
      });

      if (!grouped[dateKey]) grouped[dateKey] = [];
      grouped[dateKey].push(task);

      // Marcar chave única para evitar gerar virtual neste mesmo dia para esta série
      // Usando ID ou título como "chave da série" simples por enquanto
      if (task.recurrence_type) {
        const uniqueKey = `${dateKey}-${task.title}-${task.recurrence_type}`;
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

      // Projetar até o limite da visualização
      const now = new Date();
      now.setHours(0, 0, 0, 0);

      let loops = 0;
      const MAX_LOOPS = 50;

      while (nextDate < limitDate && loops < MAX_LOOPS) {
        loops++;

        // Calcular próxima data baseada no tipo
        if (task.recurrence_type === 'daily') {
          nextDate.setDate(nextDate.getDate() + interval);
        } else if (task.recurrence_type === 'weekly') {
          nextDate.setDate(nextDate.getDate() + (7 * interval));
        } else if (task.recurrence_type === 'monthly') {
          nextDate.setMonth(nextDate.getMonth() + interval);
        } else if (task.recurrence_type === 'custom') {
          nextDate.setDate(nextDate.getDate() + interval);
        }

        // Se passou do limite, parar
        if (nextDate > limitDate) break;

        // Se data gerada é anterior ou igual a hoje (fim do dia de hoje), pular
        // Queremos mostrar apenas tarefas de AMANHÃ em diante como virtuais
        if (nextDate <= now) continue;

        // Gerar chave de data para o agrupamento (Local Time)
        const nextDateKey = nextDate.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });

        // Verificar conflito: Já existe tarefa real dessa série neste dia?
        const uniqueKey = `${nextDateKey}-${task.title}-${task.recurrence_type}`;
        if (processedKeys.has(uniqueKey)) continue;

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

        // Adicionar aos processados para não duplicar se houver múltiplas instâncias loopando
        processedKeys.add(uniqueKey);
      }
    });

    return grouped;
  }, [tasks, daysToShow]);

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
      const dateKey = date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });

      days.push({
        id: dateKey, // ID estável para animação
        name: fullDayNames[dayOfWeek],
        shortName: dayNames[dayOfWeek],
        date: dateKey,
        dateObj: date,
        tasks: tasksByDay[dateKey] || [],
        isToday,
      });
    }
    return days;
  }, [daysToShow, tasksByDay]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900">
          Visão Semanal
        </h2>
        <div className="flex items-center gap-3">
          <Tabs value={daysToShow.toString()} onValueChange={handleViewChange}>
            <TabsList variant="default">
              <TabsTrigger value="3" variant="default">3 Dias</TabsTrigger>
              <TabsTrigger value="5" variant="default">Semana</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      <AnimatePresence mode="sync" initial={false}>
        <motion.div
          key={daysToShow}
          initial={shouldReduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: shouldReduceMotion ? 1 : 0 }}
          transition={shouldReduceMotion ? undefined : { duration: 0.15 }}
          className={`grid gap-4 ${daysToShow === 3 ? "grid-cols-1 md:grid-cols-3" : "grid-cols-1 md:grid-cols-3 lg:grid-cols-5"}`}
        >
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
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
