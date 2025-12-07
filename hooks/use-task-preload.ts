"use client";

import { useCallback, useRef } from "react";
import { getTaskBasicDetails } from "@/lib/actions/task-details";
import { useTaskCache } from "./use-task-cache";

/**
 * Hook para pré-carregar dados de tarefas no hover
 * Usa debounce para evitar muitas requisições
 */
export function useTaskPreload() {
  const taskCache = useTaskCache();
  const preloadTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const preloadingTaskIdRef = useRef<string | null>(null);

  /**
   * Pré-carrega dados básicos de uma tarefa
   * Usa debounce de 300ms para evitar muitas requisições
   */
  const preloadTask = useCallback((taskId: string, workspaceId?: string | null) => {
    // Limpar timeout anterior se existir
    if (preloadTimeoutRef.current) {
      clearTimeout(preloadTimeoutRef.current);
    }

    // Se já está pré-carregando esta tarefa, não fazer nada
    if (preloadingTaskIdRef.current === taskId) {
      return;
    }

    // Verificar se já está no cache
    if (taskCache.hasBasicData(taskId)) {
      return; // Já está no cache, não precisa pré-carregar
    }

    // Debounce de 300ms
    preloadTimeoutRef.current = setTimeout(async () => {
      try {
        preloadingTaskIdRef.current = taskId;
        
        // Buscar dados básicos
        const basicDetails = await getTaskBasicDetails(taskId);
        
        if (basicDetails) {
          // Armazenar no cache
          taskCache.setBasicData(taskId, basicDetails);
        }
      } catch (error) {
        console.error("Erro ao pré-carregar tarefa:", error);
        // Silenciosamente falhar - não é crítico
      } finally {
        preloadingTaskIdRef.current = null;
      }
    }, 300);
  }, [taskCache]);

  /**
   * Cancela pré-carregamento pendente
   */
  const cancelPreload = useCallback(() => {
    if (preloadTimeoutRef.current) {
      clearTimeout(preloadTimeoutRef.current);
      preloadTimeoutRef.current = null;
    }
    preloadingTaskIdRef.current = null;
  }, []);

  return {
    preloadTask,
    cancelPreload,
  };
}






