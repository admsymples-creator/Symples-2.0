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
  welcomeSeen: boolean; // ✅ Prop recebida do pai
}

// const WELCOME_SEEN_KEY = 'symples-welcome-seen'; // Não é mais necessário ler aqui

export function WeeklyViewWrapper({ tasks, workspaces, welcomeSeen }: WeeklyViewWrapperProps) {
  const router = useRouter();
  const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState(false);

  const [isMounted, setIsMounted] = useState(false);
  const [isTutorialActive, setIsTutorialActive] = useState(false);

  const hasTasks = tasks && tasks.length > 0;

  // Montar componente no cliente para evitar erro de hidratação
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // ✅ Lógica simplificada: Mostrar playceholder apenas se NÃO tem tarefas e JÁ viu o welcome
  // Se ainda não viu (welcomeSeen === false), mostra o placeholder de loading ou nada (esperando o modal)
  const showEmptyState = !hasTasks && welcomeSeen;

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
  // Determinar o que mostrar: EmptyState ou WeeklyView
  // Durante a hidratação inicial (!isMounted), sempre mostrar placeholder neutro
  const shouldShowEmptyState = isMounted && showEmptyState && !isTutorialActive;
  const shouldShowWeeklyView = isMounted && (hasTasks || isTutorialActive);

  // Sempre renderizar a mesma estrutura wrapper para evitar erro de hidratação
  // O AnimatePresence precisa estar sempre presente para manter a estrutura consistente
  return (
    <>
      <div>
        <AnimatePresence mode="wait">
          {!isMounted ? (
            // Renderização inicial (servidor e primeiro render do cliente)
            // ✅ Usa o Skeleton do EmptyState para evitar "flash" branco
            <div key="placeholder-hydration">
              <EmptyWeekState skeletonOnly />
            </div>
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
            // Fallback (ex: carregando dados finais)
            <div key="placeholder-waiting">
              <EmptyWeekState skeletonOnly />
            </div>
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
