"use client";

import { useState, useRef } from "react";
import { PlannerCalendar } from "@/components/calendar/planner-calendar";
import { WeeklyView } from "@/components/home/WeeklyView";
import { Database } from "@/types/database.types";
import { useRouter } from "next/navigation";

type Task = Database["public"]["Tables"]["tasks"]["Row"];

interface PlannerContentProps {
  tasks: Task[];
  workspaces: { id: string; name: string }[];
  workspaceId?: string | undefined;
  isPersonal?: boolean;
}

export function PlannerContent({ tasks, workspaces, workspaceId, isPersonal = false }: PlannerContentProps) {
  const router = useRouter();
  const calendarReloadRef = useRef<(() => void) | null>(null);

  // Handler para quando tarefa é criada/atualizada na WeeklyView
  const handleWeeklyViewUpdate = () => {
    // Disparar evento customizado para o calendário escutar
    window.dispatchEvent(new CustomEvent('planner-task-updated'));
    // Recarregar o calendário imediatamente se disponível
    if (calendarReloadRef.current) {
      setTimeout(() => {
        calendarReloadRef.current?.();
      }, 100);
    }
    // Recarregar a página para atualizar WeeklyView
    setTimeout(() => {
      router.refresh();
    }, 200);
  };

  // Handler para quando controles do calendário estão prontos
  const handleCalendarControlsReady = (controls: {
    handlePrev: () => void;
    handleNext: () => void;
    handleToday: () => void;
    handleViewChange: (view: string) => void;
    monthYearTitle: string;
    currentView: string;
    reloadEvents?: () => void;
  }) => {
    if (controls.reloadEvents) {
      calendarReloadRef.current = controls.reloadEvents;
    }
  };

  return (
    <>
      {/* Visão Semanal */}
      <WeeklyView 
        tasks={tasks} 
        workspaces={workspaces}
        onTaskUpdate={handleWeeklyViewUpdate}
      />

      {/* Calendário */}
      <div className="relative h-full w-full">
        <div className="h-[calc(100vh-300px)]">
          <PlannerCalendar 
            workspaceId={workspaceId}
            hideViewTabs={true}
            onControlsReady={handleCalendarControlsReady}
            onExternalTaskCreated={handleWeeklyViewUpdate}
          />
        </div>
      </div>
    </>
  );
}

