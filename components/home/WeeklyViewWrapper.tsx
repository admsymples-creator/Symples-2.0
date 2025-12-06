"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { WeeklyView } from "@/components/home/WeeklyView";
import { TaskDetailModal } from "@/components/tasks/TaskDetailModal";
import { Database } from "@/types/database.types";

type Task = Database["public"]["Tables"]["tasks"]["Row"];

interface WeeklyViewWrapperProps {
  tasks: Task[];
  workspaces: { id: string; name: string }[];
}

const WELCOME_SEEN_KEY = 'symples-welcome-seen';

export function WeeklyViewWrapper({ tasks, workspaces }: WeeklyViewWrapperProps) {
  const router = useRouter();
  const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState(false);
  const [showPlaceholder, setShowPlaceholder] = useState(false);

  const hasTasks = tasks && tasks.length > 0;

  // Verificar se o modal de onboarding foi fechado mas ainda não há tarefas
  useEffect(() => {
    if (!hasTasks) {
      const seen = localStorage.getItem(WELCOME_SEEN_KEY);
      // Mostrar placeholder apenas se o modal foi fechado
      setShowPlaceholder(seen === 'true');
    } else {
      setShowPlaceholder(false);
    }
  }, [hasTasks]);

  const handleCreateTask = () => {
    setIsCreateTaskModalOpen(true);
  };

  const handleTaskCreated = () => {
    setIsCreateTaskModalOpen(false);
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
      ) : showPlaceholder ? (
        // Placeholder minimalista quando não há tarefas e o modal foi fechado
        <div className="flex items-center justify-center py-12">
          <p className="text-sm text-gray-400">Tudo limpo por aqui</p>
        </div>
      ) : (
        // Quando ainda não foi visto, o modal será mostrado pelo HomePageClient
        // Aqui apenas renderizamos o grid vazio com estrutura mínima
        <div className="min-h-[400px]" />
      )}

      {/* Modal de Criação de Tarefa */}
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
