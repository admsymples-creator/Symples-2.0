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
}

export function WeeklyView({ tasks, workspaces, highlightInput = false, onTaskUpdate }: WeeklyViewProps) {
  // Estado local para controlar a visualização (3 ou 5 dias)
  const [daysToShow, setDaysToShow] = useState<3 | 5>(5);
  const shouldReduceMotion = useReducedMotion();
  const transition = shouldReduceMotion
    ? undefined
    : { duration: 0.15, ease: [0.16, 1, 0.3, 1] };

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
    tasks.forEach((task) => {
      if (!task.due_date) return;
      const taskDate = new Date(task.due_date);
      
      // CORREÇÃO: Para tarefas pessoais com hora específica, usar a data local para agrupamento
      // Para tarefas de workspace, usar UTC
      // Isso evita que uma tarefa de 22h local (01:00 UTC do dia seguinte) seja agrupada no dia errado
      const isPersonal = task.is_personal || !task.workspace_id;
      let dateKey: string;
      
      if (isPersonal) {
        // Para tarefas pessoais: usar data local para agrupamento (mais intuitivo)
        // Uma tarefa de 22h de hoje deve aparecer em "hoje", não em "amanhã"
        dateKey = taskDate.toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
        });
      } else {
        // Para tarefas de workspace: usar UTC (como estava antes)
        const utcDay = String(taskDate.getUTCDate()).padStart(2, '0');
        const utcMonth = String(taskDate.getUTCMonth() + 1).padStart(2, '0');
        dateKey = `${utcDay}/${utcMonth}`;
      }
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/3cb1781a-45f3-4822-84f0-70123428e0e4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'components/home/WeeklyView.tsx:42',message:'BUG-WEEKLY-HOUR: Task date grouping',data:{taskId:task.id,isPersonal,dueDate:task.due_date,taskDateISO:taskDate.toISOString(),taskDateLocal:taskDate.toString(),dateKey},timestamp:Date.now(),sessionId:'debug-session',runId:'bug-investigation-weekly-hour',hypothesisId:'bug-weekly-hour'})}).catch(()=>{});
      // #endregion
      
      if (!grouped[dateKey]) grouped[dateKey] = [];
      grouped[dateKey].push(task);
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
              <TabsTrigger value="3" variant="default" className="transition-all duration-300">3 Dias</TabsTrigger>
              <TabsTrigger value="5" variant="default" className="transition-all duration-300">Semana</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      <motion.div
        className={`grid gap-4 ${daysToShow === 3 ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1 md:grid-cols-3 lg:grid-cols-5'}`}
      >
        <AnimatePresence>
          {weekDays.map((day) => (
            <motion.div
              key={day.id}
              initial={shouldReduceMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: shouldReduceMotion ? 1 : 0 }}
              transition={transition}
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
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
