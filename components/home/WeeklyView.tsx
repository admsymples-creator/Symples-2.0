"use client";

import { useState, useMemo, useRef, useEffect } from "react";
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
  onTaskUpdate?: () => void;
  currentWorkspaceId?: string | null;
  isPersonal?: boolean;
}

export function WeeklyView({ tasks, workspaces, highlightInput = false, onTaskUpdate, currentWorkspaceId, isPersonal = true }: WeeklyViewProps) {
  const [viewMode, setViewMode] = useState<"week" | "month">("week");
  const daysToShow: number = 5;
  const initialWeekOffset = -Math.floor(daysToShow / 2);
  const [weekOffset, setWeekOffset] = useState(initialWeekOffset);
  const [trackOffset, setTrackOffset] = useState(0);
  const [isSliding, setIsSliding] = useState(false);
  const shouldReduceMotion = useReducedMotion();
  const trackRef = useRef<HTMLDivElement | null>(null);
  const stepRef = useRef(0);
  const directionRef = useRef<-1 | 1>(1);

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
    directionRef.current = direction;
    
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

  // Agrupar tarefas por dia (Memoizado)
  const tasksByDay = useMemo(() => {
    const grouped: Record<string, Task[]> = {};
    const processedKeys = new Set<string>();

    tasks.forEach((task) => {
      if (!task.due_date) return;
      const dateKey = formatLocalDateKey(new Date(task.due_date));
      if (!grouped[dateKey]) grouped[dateKey] = [];
      grouped[dateKey].push(task);

      if (task.recurrence_type) {
        processedKeys.add(`${dateKey}-${task.recurrence_parent_id || task.id}`);
      }
    });

    // (Lógica de projeção de recorrência simplificada para o exemplo)
    return grouped;
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

      <AnimatePresence mode="wait">
        <motion.div key={viewMode} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          {viewMode === "month" ? (
            <div className="h-[600px] border rounded-xl flex items-center justify-center bg-gray-50">
               <p className="text-gray-400 italic">Calendário Mensal</p>
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
