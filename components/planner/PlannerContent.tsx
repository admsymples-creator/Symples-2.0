"use client";

import { useState, useRef, useEffect } from "react";
import { PlannerCalendar } from "@/components/calendar/planner-calendar";
import { WeeklyView } from "@/components/home/WeeklyView";
import { Database } from "@/types/database.types";

type Task = Database["public"]["Tables"]["tasks"]["Row"];

interface PlannerContentProps {
  tasks: Task[];
  workspaces: { id: string; name: string }[];
  workspaceId?: string | undefined;
  isPersonal?: boolean;
  onRefetchTasks?: () => Promise<void>;
}

export function PlannerContent({ tasks, workspaces, workspaceId, isPersonal = false, onRefetchTasks }: PlannerContentProps) {
  const isPersonalMode = true;
  const workspaceIdForCalendar = isPersonalMode ? null : workspaceId;
  const calendarReloadRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    document.cookie = "planner_personal=1; path=/";
    return () => {
      document.cookie = "planner_personal=; Max-Age=0; path=/";
    };
  }, []);

  // Handler para quando tarefa é criada/atualizada na WeeklyView — refetch no cliente (mesma query do servidor)
  // Não usar router.refresh() aqui: o servidor pode devolver cache e o efeito setTasks(initialTasks) sobrescreve a lista
  const handleWeeklyViewUpdate = async () => {
    await onRefetchTasks?.();
    window.dispatchEvent(new CustomEvent('planner-task-updated'));
    if (calendarReloadRef.current) {
      setTimeout(() => {
        calendarReloadRef.current?.();
      }, 100);
    }
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
        currentWorkspaceId={workspaceIdForCalendar}
        isPersonal={isPersonalMode}
        originContext="planner"
      />

      {/* Calendário */}
      <div className="relative h-full w-full">
        <div className="h-[calc(100vh-300px)]">
          <PlannerCalendar
            workspaceId={workspaceIdForCalendar}
            hideViewTabs={true}
            onControlsReady={handleCalendarControlsReady}
            onExternalTaskCreated={handleWeeklyViewUpdate}
            forcePersonal={isPersonalMode}
          />
        </div>
      </div>
    </>
  );
}

