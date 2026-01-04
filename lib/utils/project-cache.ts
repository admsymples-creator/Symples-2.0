/**
 * Cache simples em memória para dados de projetos
 * Evita recarregamentos desnecessários quando volta para a home
 */

type ProjectStats = Array<{ tag: string; pendingCount: number; totalCount: number }>;
type ProjectIcons = Map<string, string>;

interface CachedProjectData {
  stats: ProjectStats;
  icons: ProjectIcons;
  workspaceId: string;
  timestamp: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos
const projectCache = new Map<string, CachedProjectData>();

/**
 * Obtém dados de projetos do cache se ainda válidos
 */
export function getCachedProjects(workspaceId: string): { stats: ProjectStats; icons: ProjectIcons } | null {
  const cached = projectCache.get(workspaceId);
  if (!cached) return null;
  
  const now = Date.now();
  if (now - cached.timestamp > CACHE_TTL_MS) {
    projectCache.delete(workspaceId);
    return null;
  }
  
  return {
    stats: cached.stats,
    icons: cached.icons,
  };
}

/**
 * Salva dados de projetos no cache
 */
export function setCachedProjects(
  workspaceId: string,
  stats: ProjectStats,
  icons: ProjectIcons
): void {
  projectCache.set(workspaceId, {
    stats,
    icons,
    workspaceId,
    timestamp: Date.now(),
  });
}

/**
 * Limpa o cache de um workspace específico
 */
export function clearProjectCache(workspaceId: string): void {
  projectCache.delete(workspaceId);
}

/**
 * Limpa todo o cache
 */
export function clearAllProjectCache(): void {
  projectCache.clear();
}



