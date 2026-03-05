"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TaskDetailModal } from "@/components/tasks/TaskDetailModal";
import { Plus } from "lucide-react";

interface HomeActionBarProps {
  period: "week" | "month";
  onPeriodChange: (period: "week" | "month") => void;
}

export function HomeActionBar({ period, onPeriodChange }: HomeActionBarProps) {
  const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState(false);

  const handleTaskCreated = () => {
    setIsCreateTaskModalOpen(false);
    if (typeof window !== "undefined") {
      const ts = Date.now();
      sessionStorage.setItem("home_tasks_refresh_ts", String(ts));
      window.dispatchEvent(new CustomEvent("home-tasks-updated"));
    }
  };

  const handleTaskUpdated = () => {
    if (typeof window !== "undefined") {
      const ts = Date.now();
      sessionStorage.setItem("home_tasks_refresh_ts", String(ts));
      window.dispatchEvent(new CustomEvent("home-tasks-updated"));
    }
  };

  return (
    <>
      {/* Barra de ações */}
      <div className="flex items-center justify-between gap-4 pb-4">
        {/* Botão criar tarefa à esquerda */}
        <Button
          onClick={() => setIsCreateTaskModalOpen(true)}
          className="bg-green-600 hover:bg-green-700 text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          Criar tarefa
        </Button>

        {/* Tabs de período à direita */}
        <Tabs value={period} onValueChange={(v) => onPeriodChange(v as "week" | "month")}>
          <TabsList variant="default">
            <TabsTrigger value="week" variant="default">
              Minha semana
            </TabsTrigger>
            <TabsTrigger value="month" variant="default">
              Meu mês
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Modal de criação de tarefa */}
      <TaskDetailModal
        open={isCreateTaskModalOpen}
        onOpenChange={setIsCreateTaskModalOpen}
        mode="create"
        onTaskCreated={handleTaskCreated}
        onTaskUpdated={handleTaskUpdated}
      />
    </>
  );
}

