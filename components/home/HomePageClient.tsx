"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TaskDetailModal } from "@/components/tasks/TaskDetailModal";
import { Plus } from "lucide-react";
import { HomeTasksSection } from "./HomeTasksSection";

export function HomePageClient() {
  const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState(false);
  const [period, setPeriod] = useState<"week" | "month">("week");

  const handleTaskCreated = () => {
    setIsCreateTaskModalOpen(false);
    // Recarregar a página para atualizar os dados
    setTimeout(() => window.location.reload(), 500);
  };

  const handleTaskUpdated = () => {
    // Recarregar a página para atualizar os dados
    setTimeout(() => window.location.reload(), 500);
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
        <Tabs value={period} onValueChange={(v) => setPeriod(v as "week" | "month")}>
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
