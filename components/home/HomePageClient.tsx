"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { WeeklyViewWrapper } from "@/components/home/WeeklyViewWrapper";
import { OnboardingModal, useShouldShowOnboarding } from "@/components/home/OnboardingModal";
import { TaskDetailModal } from "@/components/tasks/TaskDetailModal";
import { Database } from "@/types/database.types";

type Task = Database["public"]["Tables"]["tasks"]["Row"];

interface HomePageClientProps {
  tasks: Task[];
  workspaces: { id: string; name: string }[];
}

const WELCOME_SEEN_KEY = 'symples-welcome-seen';

export function HomePageClient({ tasks, workspaces }: HomePageClientProps) {
  const searchParams = useSearchParams();
  const [isOnboardingModalOpen, setIsOnboardingModalOpen] = useState(false);
  const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  
  const hasTasks = tasks && tasks.length > 0;
  const inviteAccepted = searchParams.get('invite_accepted') === 'true';
  const workspacesLength = workspaces.length; // Valor primitivo estável para dependências
  
  // ✅ CORREÇÃO: Detectar aceitação de invite (via URL ou cookie)
  // Resetar welcome_seen APENAS se for um novo usuário (sem workspaces)
  // Se o usuário já tem workspaces, não mostrar onboarding novamente
  useEffect(() => {
    if (hasInitialized) return;
    
    // Verificar cookie de invite recém-aceito (setado por acceptInvite)
    const getCookie = (name: string) => {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop()?.split(';').shift();
      return null;
    };
    
    const newlyAcceptedWorkspaceId = getCookie('newly_accepted_workspace_id');
    const hasNewInvite = inviteAccepted || newlyAcceptedWorkspaceId;
    
    if (hasNewInvite) {
      // ✅ CORREÇÃO: Só resetar localStorage se for um novo usuário (sem workspaces)
      // Se o usuário já tem workspaces, significa que já viu o onboarding antes
      // e não deve vê-lo novamente apenas por aceitar um novo convite
      if (workspacesLength === 0) {
        localStorage.removeItem(WELCOME_SEEN_KEY);
      }
      
      // Limpar cookie após uso (evita resetar em navegações futuras)
      if (newlyAcceptedWorkspaceId) {
        document.cookie = 'newly_accepted_workspace_id=; path=/; max-age=0';
      }
    }
    
    setHasInitialized(true);
  }, [inviteAccepted, hasInitialized, workspacesLength]);

  const shouldShowOnboarding = useShouldShowOnboarding(hasTasks);

  // Abrir modal de onboarding automaticamente quando necessário
  useEffect(() => {
    if (shouldShowOnboarding && hasInitialized) {
      setIsOnboardingModalOpen(true);
    }
  }, [shouldShowOnboarding, hasInitialized]);

  const handleOnboardingAction = () => {
    // Apenas fechar o modal e ir para a dashboard
    setIsOnboardingModalOpen(false);
  };

  const handleTaskCreated = () => {
    setIsCreateTaskModalOpen(false);
    // Recarregar dados da página para mostrar as novas tarefas
    // Usar router.refresh() ao invés de window.location.reload() para melhor UX
    setTimeout(() => window.location.reload(), 500);
  };

  const handleTaskUpdated = () => {
    // Recarregar dados da página para mostrar as tarefas atualizadas
    setTimeout(() => window.location.reload(), 500);
  };

  return (
    <>
      <WeeklyViewWrapper tasks={tasks} workspaces={workspaces} />

      {/* Modal de Onboarding (FTUX) */}
      <OnboardingModal
        open={isOnboardingModalOpen}
        onOpenChange={setIsOnboardingModalOpen}
        onAction={handleOnboardingAction}
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
