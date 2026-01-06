/**
 * Cache simples em memória para dados do planner
 * Evita recarregamentos desnecessários quando volta para o planner
 */

import { Database } from "@/types/database.types";

type Task = Database["public"]["Tables"]["tasks"]["Row"];

interface CachedPlannerData {
  tasks: Task[];
  workspaceId: string | null;
  isPersonal: boolean;
  timestamp: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos
const plannerCache = new Map<string, CachedPlannerData>();

/**
 * Gera chave de cache baseada no workspace
 */
function getCacheKey(workspaceId: string | null, isPersonal: boolean): string {
  if (isPersonal) {
    return "personal";
  }
  return workspaceId || "none";
}

/**
 * Obtém tarefas do planner do cache se ainda válidas
 */
export function getCachedPlannerTasks(
  workspaceId: string | null,
  isPersonal: boolean
): Task[] | null {
  const key = getCacheKey(workspaceId, isPersonal);
  const cached = plannerCache.get(key);
  if (!cached) return null;
  
  const now = Date.now();
  if (now - cached.timestamp > CACHE_TTL_MS) {
    plannerCache.delete(key);
    return null;
  }
  
  // Verificar se workspace ainda é o mesmo
  if (cached.workspaceId !== workspaceId || cached.isPersonal !== isPersonal) {
    plannerCache.delete(key);
    return null;
  }
  
  return cached.tasks;
}

/**
 * Salva tarefas do planner no cache
 */
export function setCachedPlannerTasks(
  workspaceId: string | null,
  isPersonal: boolean,
  tasks: Task[]
): void {
  const key = getCacheKey(workspaceId, isPersonal);
  plannerCache.set(key, {
    tasks,
    workspaceId,
    isPersonal,
    timestamp: Date.now(),
  });
}

/**
 * Limpa o cache de um workspace específico
 */
export function clearPlannerCache(workspaceId: string | null, isPersonal: boolean): void {
  const key = getCacheKey(workspaceId, isPersonal);
  plannerCache.delete(key);
}

/**
 * Limpa todo o cache do planner
 */
export function clearAllPlannerCache(): void {
  plannerCache.clear();
}



