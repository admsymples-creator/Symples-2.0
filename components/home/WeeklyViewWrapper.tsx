"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { WeeklyView } from "@/components/home/WeeklyView";
import { WelcomeEmptyState } from "@/components/home/WelcomeEmptyState";
import { TaskDetailModal } from "@/components/tasks/TaskDetailModal";
import { Database } from "@/types/database.types";

type Task = Database["public"]["Tables"]["tasks"]["Row"];

interface WeeklyViewWrapperProps {
  tasks: Task[];
  workspaces: { id: string; name: string }[];
}

export function WeeklyViewWrapper({ tasks, workspaces }: WeeklyViewWrapperProps) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const hasTasks = tasks && tasks.length > 0;

  const handleCreateTask = () => {
    setIsModalOpen(true);
  };

  const handleTaskCreated = () => {
    setIsModalOpen(false);
    // Recarregar dados da página para mostrar as novas tarefas
    router.refresh();
  };

  const handleTaskUpdated = () => {
    // Recarregar dados da página para mostrar as tarefas atualizadas
    router.refresh();
  };

  return (
    <>
      {hasTasks ? (
        <WeeklyView tasks={tasks} workspaces={workspaces} />
      ) : (
        <WelcomeEmptyState
          workspaceName="Minha Semana"
          onAction={handleCreateTask}
        />
      )}

      {/* Modal de Criação de Tarefa */}
      <TaskDetailModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        mode="create"
        task={null}
        onTaskCreated={handleTaskCreated}
        onTaskUpdated={handleTaskUpdated}
      />
    </>
  );
}
