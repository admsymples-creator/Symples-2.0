"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { WeeklyViewWrapper } from "@/components/home/WeeklyViewWrapper";
// import { OnboardingModal, useShouldShowOnboarding } from "@/components/home/OnboardingModal"; // Componente desativado
import { TaskDetailModal } from "@/components/tasks/TaskDetailModal";
import { Database } from "@/types/database.types";

type Task = Database["public"]["Tables"]["tasks"]["Row"];

interface HomePageClientProps {
  tasks: Task[];
  workspaces: { id: string; name: string }[];
}

// const WELCOME_SEEN_KEY = 'symples-welcome-seen'; // Desativado

export function HomePageClient({ tasks, workspaces }: HomePageClientProps) {
  const searchParams = useSearchParams();
  const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState(false);

  const hasTasks = tasks && tasks.length > 0;
  const inviteAccepted = searchParams.get('invite_accepted') === 'true';

  // ✅ Simplificação: Tutorial removido conforme solicitação. Sempre considera como visto.
  // Isso garante que o Zero State (EmptyWeekState) apareça imediatamente se não houver tarefas.
  const welcomeSeen = true;

  const handleTaskCreated = () => {
    setIsCreateTaskModalOpen(false);
    setTimeout(() => window.location.reload(), 500);
  };

  const handleTaskUpdated = () => {
    setTimeout(() => window.location.reload(), 500);
  };

  return (
    <>
      <WeeklyViewWrapper
        tasks={tasks}
        workspaces={workspaces}
        welcomeSeen={welcomeSeen}
      />

      {/* Modal de Criação de Tarefa (aberto a partir do onboarding) */}
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
