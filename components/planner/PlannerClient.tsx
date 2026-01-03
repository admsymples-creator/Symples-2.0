"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { useWorkspace } from "@/components/providers/SidebarProvider";
import { useWorkspaces } from "@/components/providers/WorkspacesProvider";
import { getTasks, getWorkspaceIdBySlug } from "@/lib/actions/tasks";
import { PlannerContent } from "@/components/planner/PlannerContent";
import { Database } from "@/types/database.types";
import { isPersonalWorkspace } from "@/lib/utils/workspace-helpers";

type Task = Database["public"]["Tables"]["tasks"]["Row"];

// Funções auxiliares para manipulação de datas
function getStartOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Ajustar para Segunda-feira
  return new Date(d.setDate(diff));
}

function getEndOfWeek(date: Date): Date {
  const start = getStartOfWeek(date);
  const end = new Date(start);
  end.setDate(start.getDate() + 6); // Adicionar 6 dias para chegar no Domingo
  end.setHours(23, 59, 59, 999); // Fim do dia
  return end;
}

interface PlannerClientProps {
  initialTasks?: Task[];
  initialWorkspaceId?: string;
  initialIsPersonal?: boolean;
}

export function PlannerClient({ initialTasks, initialWorkspaceId, initialIsPersonal }: PlannerClientProps = {}) {
  const pathname = usePathname();
  const { activeWorkspaceId, isLoaded } = useWorkspace();
  const initialWorkspaces = useWorkspaces();
  const [tasks, setTasks] = useState<Task[]>(initialTasks || []);
  const [loading, setLoading] = useState(!initialTasks); // Não carregar se temos dados iniciais
  const [currentWorkspace, setCurrentWorkspace] = useState<{ id: string; name: string; isPersonal: boolean } | null>(() => {
    // Inicializar com dados fornecidos se disponíveis
    if (initialWorkspaceId && initialWorkspaces) {
      const workspace = initialWorkspaces.find(w => w.id === initialWorkspaceId);
      if (workspace) {
        return {
          id: initialWorkspaceId,
          name: workspace.name || "Workspace",
          isPersonal: initialIsPersonal ?? false
        };
      }
    }
    return null;
  });
  const [pendingWorkspaceSlug, setPendingWorkspaceSlug] = useState<string | null>(null);

  // Detectar workspace atual da URL e verificar se é pessoal
  useEffect(() => {
    if (!isLoaded) return;
    if (!initialWorkspaces || initialWorkspaces.length === 0) {
      setCurrentWorkspace(null);
      setPendingWorkspaceSlug(null);
      return;
    }

    const workspaces = initialWorkspaces;
    const segments = pathname.split("/").filter(Boolean);
    const isWorkspaceScoped = segments.length > 0 && segments[0] !== "planner";
    
    // Se estamos em /planner (sem workspace), usar workspace ativo do contexto
    let workspaceId = isWorkspaceScoped ? undefined : activeWorkspaceId;
    if (isWorkspaceScoped) {
      // Estamos em um workspace específico na URL
      const workspaceSlug = segments[0];
      const workspace = workspaces.find(w => w.slug === workspaceSlug || w.id === workspaceSlug);
      if (workspace) {
        workspaceId = workspace.id;
        setPendingWorkspaceSlug(null);
      } else {
        setPendingWorkspaceSlug(workspaceSlug);
      }
    }
    
    if (workspaceId) {
      const workspace = workspaces.find(w => w.id === workspaceId);
      const isPersonal = isPersonalWorkspace(workspace, workspaces);
      setCurrentWorkspace({
        id: workspaceId,
        name: workspace?.name || "Workspace",
        isPersonal
      });
    } else if (isWorkspaceScoped) {
      // Se a URL é de workspace e ainda não resolvemos o slug, não fazer fallback
      setCurrentWorkspace(null);
    } else {
      // Se não há workspace ativo, usar o primeiro workspace ou criar lógica padrão
      const firstWorkspace = workspaces[0];
      if (firstWorkspace) {
        const isPersonal = isPersonalWorkspace(firstWorkspace, workspaces);
        setCurrentWorkspace({
          id: firstWorkspace.id,
          name: firstWorkspace.name,
          isPersonal
        });
      } else {
        setCurrentWorkspace(null);
      }
    }
  }, [pathname, activeWorkspaceId, isLoaded, initialWorkspaces]);

  useEffect(() => {
    if (!pendingWorkspaceSlug || !initialWorkspaces || initialWorkspaces.length === 0) {
      return;
    }

    let cancelled = false;

    const resolveWorkspace = async () => {
      try {
        const resolvedId = await getWorkspaceIdBySlug(pendingWorkspaceSlug);
        if (cancelled) return;
        if (!resolvedId) {
          setCurrentWorkspace(null);
          return;
        }
        const workspace = initialWorkspaces.find(w => w.id === resolvedId) || null;
        const isPersonal = isPersonalWorkspace(workspace, initialWorkspaces);
        setCurrentWorkspace({
          id: resolvedId,
          name: workspace?.name || "Workspace",
          isPersonal
        });
        setPendingWorkspaceSlug(null);
      } catch (error) {
        console.error("Erro ao resolver workspace por slug:", error);
        if (!cancelled) {
          setCurrentWorkspace(null);
        }
      }
    };

    resolveWorkspace();

    return () => {
      cancelled = true;
    };
  }, [pendingWorkspaceSlug, initialWorkspaces]);

  // OTIMIZAÇÃO: Buscar tarefas apenas se não tivermos dados iniciais
  useEffect(() => {
    // Se temos dados iniciais, não precisamos buscar novamente
    if (initialTasks && initialTasks.length >= 0 && currentWorkspace) {
      // Usar dados iniciais se disponíveis
      if (initialTasks.length > 0) {
        setTasks(initialTasks as unknown as Task[]);
        setLoading(false);
        return;
      }
    }

    const loadTasks = async () => {
      if (!currentWorkspace) return;
      
      setLoading(true);
      try {
        const today = new Date();
        const startOfWeek = getStartOfWeek(today);
        const endOfWeek = getEndOfWeek(today);

        // OTIMIZAÇÃO: Usar Promise para não bloquear UI
        const fetchPromise = currentWorkspace.isPersonal
          ? // Workspace pessoal: buscar todas as tarefas atribuídas ao usuário da semana
            getTasks({
              assigneeId: "current",
              dueDateStart: startOfWeek.toISOString(),
              dueDateEnd: endOfWeek.toISOString(),
            })
          : // Workspace profissional: buscar apenas tarefas do workspace ativo da semana
            getTasks({
              workspaceId: currentWorkspace.id,
              assigneeId: "current",
              dueDateStart: startOfWeek.toISOString(),
              dueDateEnd: endOfWeek.toISOString(),
            });

        const fetchedTasks = await fetchPromise;
        
        if (currentWorkspace.isPersonal) {
          setTasks(fetchedTasks as unknown as Task[] || []);
        } else {
          // Filtrar apenas tarefas do workspace ativo (garantir escopo)
          const scopedTasks = (fetchedTasks as unknown as Task[] || []).filter(
            (task) => task.workspace_id === currentWorkspace.id
          );
          setTasks(scopedTasks);
        }
      } catch (error) {
        console.error("Erro ao carregar tarefas:", error);
        setTasks([]);
      } finally {
        setLoading(false);
      }
    };

    loadTasks();
  }, [currentWorkspace, initialTasks]);

  if (loading || !currentWorkspace) {
    return (
      <div className="space-y-8">
        {/* Skeleton para Visão Semanal */}
        <div>
          <div className="h-6 bg-gray-200 rounded w-48 mb-4 animate-pulse"></div>
          <div className="grid grid-cols-7 gap-2">
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div key={i} className="bg-gray-50 rounded-lg p-4 border border-gray-200 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-20 mb-2"></div>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 rounded w-full"></div>
                  <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
        {/* Skeleton para Calendário */}
        <div>
          <div className="h-[calc(100vh-300px)] bg-gray-50 rounded-lg border border-gray-200 animate-pulse"></div>
        </div>
      </div>
    );
  }

  return (
    <PlannerContent 
      tasks={tasks} 
      workspaces={initialWorkspaces}
      workspaceId={currentWorkspace?.isPersonal ? undefined : currentWorkspace?.id}
      isPersonal={currentWorkspace?.isPersonal ?? false}
    />
  );
}

