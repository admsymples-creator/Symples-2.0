"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
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
  // ✅ CORREÇÃO: Verificar localStorage no estado inicial para aparecer na primeira renderização
  const [showPlaceholder, setShowPlaceholder] = useState(() => {
    if (typeof window === 'undefined') return false;
    const hasTasks = tasks && tasks.length > 0;
    if (hasTasks) return false;
    const seen = localStorage.getItem(WELCOME_SEEN_KEY);
    return seen === 'true';
  });
  const [isMounted, setIsMounted] = useState(false);
  const [isTutorialActive, setIsTutorialActive] = useState(false);

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

  // Determinar o que mostrar: EmptyState ou WeeklyView
  // Durante a hidratação inicial (!isMounted), sempre mostrar placeholder neutro
  // Após montagem, usar a lógica normal com animações
  const shouldShowEmptyState = isMounted && !hasTasks && !isTutorialActive && showPlaceholder;
  const shouldShowWeeklyView = isMounted && (hasTasks || isTutorialActive);

  // Sempre renderizar a mesma estrutura wrapper para evitar erro de hidratação
  // O AnimatePresence precisa estar sempre presente para manter a estrutura consistente
  return (
    <>
      <div>
        <AnimatePresence mode="wait">
          {!isMounted ? (
            // Renderização inicial (servidor e primeiro render do cliente)
            // key único para garantir que este seja sempre o mesmo elemento
            // suppressHydrationWarning: Extensões do navegador podem adicionar atributos (ex: bis_skin_checked)
            <div key="placeholder-hydration" className="min-h-[500px]" suppressHydrationWarning />
          ) : shouldShowEmptyState ? (
            <motion.div
              key="empty-state"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Visão Semanal
                  </h2>
                </div>
                <EmptyWeekState onAction={() => setIsTutorialActive(true)} />
              </div>
            </motion.div>
          ) : shouldShowWeeklyView ? (
            <motion.div
              key="weekly-view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <WeeklyView 
                tasks={tasks} 
                workspaces={workspaces}
                highlightInput={isTutorialActive}
              />
            </motion.div>
          ) : (
            // Quando ainda não foi visto, o modal será mostrado pelo HomePageClient
            // suppressHydrationWarning: Extensões do navegador podem adicionar atributos (ex: bis_skin_checked)
            <div key="placeholder-waiting" className="min-h-[500px]" suppressHydrationWarning />
          )}
        </AnimatePresence>
      </div>

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
