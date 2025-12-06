"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { WeeklyView } from "@/components/home/WeeklyView";
import { EmptyWeekState } from "@/components/home/EmptyWeekState";
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
  const [isMounted, setIsMounted] = useState(false);

  const hasTasks = tasks && tasks.length > 0;

  // Montar componente no cliente para evitar erro de hidratação
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Verificar se o modal de onboarding foi fechado mas ainda não há tarefas
  useEffect(() => {
    if (!isMounted) return;
    
    if (!hasTasks) {
      const seen = localStorage.getItem(WELCOME_SEEN_KEY);
      // Mostrar placeholder apenas se o modal foi fechado
      setShowPlaceholder(seen === 'true');
    } else {
      setShowPlaceholder(false);
    }
  }, [hasTasks, isMounted]);

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

  // Renderizar estrutura neutra no servidor para evitar erro de hidratação
  if (!isMounted) {
    return (
      <>
        <div className="min-h-[500px]" />
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

  return (
    <>
      {hasTasks ? (
        <WeeklyView tasks={tasks} workspaces={workspaces} />
      ) : showPlaceholder ? (
        // Empty State com Ghost Grid quando não há tarefas e o modal foi fechado
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">
              Visão Semanal
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <EmptyWeekState onAction={handleCreateTask} />
          </div>
        </div>
      ) : (
        // Quando ainda não foi visto, o modal será mostrado pelo HomePageClient
        // Aqui apenas renderizamos o grid vazio com estrutura mínima
        <div className="min-h-[500px]" />
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
