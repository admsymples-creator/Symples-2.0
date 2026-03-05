"use client";

import { useCallback, useRef } from "react";
import { getFullModalData } from "@/lib/actions/task-details";
import { useTaskCache } from "./use-task-cache";

/**
 * Hook para pré-carregar dados completos de tarefas no hover
 * Usa debounce de 150ms para carregar todos os dados antes do click
 */
export function useTaskPreload() {
  const taskCache = useTaskCache();
  const preloadTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const preloadingTaskIdRef = useRef<string | null>(null);

  /**
   * Pré-carrega dados completos de uma tarefa (basic + extended + members + tags)
   * Usa debounce de 150ms para evitar muitas requisições
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

    // Verificar se já está no cache (basic + extended = modal abre instantâneo)
    if (taskCache.hasBasicData(taskId) && taskCache.hasExtendedData(taskId)) {
      return; // Dados completos já no cache
    }

    // Debounce de 150ms (usuário leva ~200-400ms entre hover e click)
    preloadTimeoutRef.current = setTimeout(async () => {
      try {
        preloadingTaskIdRef.current = taskId;
        
        // Buscar TODOS os dados do modal em uma única chamada
        const result = await getFullModalData(taskId, workspaceId || null, 50);
        
        if (result.basic) {
          // Armazenar dados básicos no cache
          taskCache.setBasicData(taskId, result.basic);
        }
        if (result.extended) {
          // Armazenar dados estendidos no cache
          taskCache.setExtendedData(taskId, result.extended);
        }
        // Armazenar members e tags por workspace
        const wsId = result.basic?.workspace_id;
        if (wsId) {
          if (result.members.length > 0) {
            taskCache.setWorkspaceMembers(wsId, result.members);
          }
          if (result.availableTags.length > 0) {
            taskCache.setWorkspaceTags(wsId, result.availableTags);
          }
        }
      } catch (error) {
        console.error("Erro ao pré-carregar tarefa:", error);
        // Silenciosamente falhar - não é crítico
      } finally {
        preloadingTaskIdRef.current = null;
      }
    }, 150);
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











