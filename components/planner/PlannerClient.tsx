"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { usePathname } from "next/navigation";
import { useWorkspace, useWorkspaceLoading } from "@/components/providers/SidebarProvider";
import { useWorkspaces } from "@/components/providers/WorkspacesProvider";
import { getTasks, getWorkspaceIdBySlug } from "@/lib/actions/tasks";
import { PlannerContent } from "@/components/planner/PlannerContent";
import { Database } from "@/types/database.types";
import { isPersonalWorkspace } from "@/lib/utils/workspace-helpers";
import { getCachedPlannerTasks, setCachedPlannerTasks, clearPlannerCache } from "@/lib/utils/planner-cache";

import { Workspace } from "@/lib/actions/user";

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

// ... (imports)

interface PlannerClientProps {
  initialTasks?: Task[];
  initialWorkspaceId?: string;
  initialIsPersonal?: boolean;
  preloadedWorkspaces?: Workspace[];
  forcePersonal?: boolean;
}

export function PlannerClient({ initialTasks, initialWorkspaceId, initialIsPersonal, preloadedWorkspaces, forcePersonal }: PlannerClientProps = {}) {
  const pathname = usePathname();
  const { activeWorkspaceId, isLoaded } = useWorkspace();
  const isForcedPersonal = forcePersonal ?? false;
  // Se preloadedWorkspaces foi passado, usar como "initial data" para o hook também se possível, mas aqui vamos priorizar
  const contextWorkspaces = useWorkspaces();
  const initialWorkspaces = preloadedWorkspaces || contextWorkspaces;

  const [tasks, setTasks] = useState<Task[]>(initialTasks || []);
  // Se temos dados iniciais (mesmo que array vazio), não mostrar loading inicial
  const [loading, setLoading] = useState(initialTasks === undefined);

  // Inicializar currentWorkspace de forma síncrona quando temos dados iniciais
  const [currentWorkspace, setCurrentWorkspace] = useState<{ id: string; name: string; isPersonal: boolean } | null>(() => {
    // Inicializar com dados fornecidos se disponíveis
    if (initialWorkspaceId && initialWorkspaces && initialWorkspaces.length > 0) {
      const workspace = initialWorkspaces.find(w => w.id === initialWorkspaceId);
      if (workspace) {
        return {
          id: initialWorkspaceId,
          name: workspace.name || "Workspace",
          isPersonal: isForcedPersonal ? true : (initialIsPersonal ?? false)
        };
      }
    }
    return null;
  });
  const [pendingWorkspaceSlug, setPendingWorkspaceSlug] = useState<string | null>(null);

  // Detectar workspace atual da URL e verificar se é pessoal
  useEffect(() => {
    if (!isLoaded) return;
    if (isForcedPersonal) {
      setCurrentWorkspace({
        id: 'personal',
        name: 'Pessoal',
        isPersonal: true,
      });
      setPendingWorkspaceSlug(null);
      return;
    }
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
  }, [pathname, activeWorkspaceId, isLoaded, initialWorkspaces, isForcedPersonal]);

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

  const hasLoadedOnceRef = useRef(false);
  const lastRefetchAtRef = useRef(0);
  const { isSwitchingWorkspace } = useWorkspaceLoading();

  // Sincronizar tasks com initialTasks só na primeira carga; não sobrescrever após refetch
  useEffect(() => {
    if (initialTasks === undefined) return;
    if (Date.now() - lastRefetchAtRef.current < 5000) return;
    setTasks(initialTasks);
    setLoading(false);
    if (currentWorkspace) {
      setCachedPlannerTasks(
        currentWorkspace.isPersonal ? null : currentWorkspace.id,
        currentWorkspace.isPersonal,
        initialTasks
      );
    }
  }, [initialTasks, currentWorkspace]);

  // OTIMIZAÇÃO: Buscar tarefas apenas se não tivermos dados iniciais ou cache
  useEffect(() => {
    if (!currentWorkspace) return;

    // Se está trocando de workspace, não mostrar skeleton - deixar workspace loading aparecer
    if (isSwitchingWorkspace) {
      return;
    }

    // Verificar cache primeiro
    const cached = getCachedPlannerTasks(
      currentWorkspace.isPersonal ? null : currentWorkspace.id,
      currentWorkspace.isPersonal
    );

    if (cached && hasLoadedOnceRef.current) {
      // Usar dados do cache se já carregou uma vez
      setTasks(cached);
      setLoading(false);
      return;
    }

    // Se temos dados iniciais, usar imediatamente na primeira carga (mesmo se array vazio)
    if (initialTasks !== undefined && !hasLoadedOnceRef.current) {
      const tasksArray = initialTasks as unknown as Task[];
      setTasks(tasksArray);
      setLoading(false);
      // Salvar no cache se temos workspace definido
      if (currentWorkspace) {
        setCachedPlannerTasks(
          currentWorkspace.isPersonal ? null : currentWorkspace.id,
          currentWorkspace.isPersonal,
          tasksArray
        );
      }
      hasLoadedOnceRef.current = true;
      return; // Não buscar novamente se temos dados iniciais
    }

    const loadTasks = async () => {
      setLoading(true);
      try {
        // CORREÇÃO: Usar range expandido para corresponder ao server component
        // A WeeklyView usa janela deslizante, então precisamos de mais dias que apenas a semana civil
        const today = new Date();
        const startRange = new Date(today);
        startRange.setDate(today.getDate() - 14);
        startRange.setHours(0, 0, 0, 0);

        const endRange = new Date(today);
        endRange.setDate(today.getDate() + 14);
        endRange.setHours(23, 59, 59, 999);

        // OTIMIZAÇÃO: Usar Promise para não bloquear UI
        // Planner: não filtrar por assignee (tarefas criadas no planner têm assignee_id null)
        const fetchPromise = currentWorkspace.isPersonal
          ? getTasks({
              workspaceId: null,
              assigneeId: undefined,
              dueDateStart: startRange.toISOString(),
              dueDateEnd: endRange.toISOString(),
            })
          : getTasks({
              workspaceId: currentWorkspace.id,
              assigneeId: undefined,
              dueDateStart: startRange.toISOString(),
              dueDateEnd: endRange.toISOString(),
            });

        const fetchedTasks = await fetchPromise;

        let finalTasks: Task[];
        if (currentWorkspace.isPersonal) {
          finalTasks = (fetchedTasks as unknown as Task[] || []);
        } else {
          // Filtrar apenas tarefas do workspace ativo (garantir escopo)
          finalTasks = (fetchedTasks as unknown as Task[] || []).filter(
            (task) => task.workspace_id === currentWorkspace.id
          );
        }

        setTasks(finalTasks);
        // Salvar no cache
        setCachedPlannerTasks(
          currentWorkspace.isPersonal ? null : currentWorkspace.id,
          currentWorkspace.isPersonal,
          finalTasks
        );
        hasLoadedOnceRef.current = true;
      } catch (error) {
        console.error("Erro ao carregar tarefas:", error);
        setTasks([]);
      } finally {
        setLoading(false);
      }
    };

    loadTasks();
  }, [currentWorkspace, initialTasks, isSwitchingWorkspace]);

  // Resetar flag quando workspace muda
  useEffect(() => {
    hasLoadedOnceRef.current = false;
  }, [currentWorkspace?.id, currentWorkspace?.isPersonal]);

  // Refetch: mesma query do servidor (pessoal + workspace, sem assignee) — chamado após criar/editar tarefa no planner
  const refetchPlannerTasks = useCallback(async () => {
    // Pequeno delay para a escrita no banco estar visível
    await new Promise((r) => setTimeout(r, 200));
    // Limpar cache para nenhum efeito sobrescrever com dados antigos
    if (currentWorkspace) {
      clearPlannerCache(
        currentWorkspace.isPersonal ? null : currentWorkspace.id,
        currentWorkspace.isPersonal
      );
    }

    const today = new Date();
    const startRange = new Date(today);
    startRange.setDate(today.getDate() - 14);
    startRange.setHours(0, 0, 0, 0);
    const endRange = new Date(today);
    endRange.setDate(today.getDate() + 14);
    endRange.setHours(23, 59, 59, 999);
    const dueDateStart = startRange.toISOString();
    const dueDateEnd = endRange.toISOString();

    const [personalTasks, workspaceTasks] = await Promise.all([
      getTasks({
        workspaceId: null,
        assigneeId: undefined,
        dueDateStart,
        dueDateEnd,
      }),
      initialWorkspaceId
        ? getTasks({
            workspaceId: initialWorkspaceId,
            assigneeId: undefined,
            dueDateStart,
            dueDateEnd,
          })
        : Promise.resolve([]),
    ]);

    const seenIds = new Set<string>();
    const merged = [...(personalTasks || []), ...(workspaceTasks || [])].filter((task) => {
      if (seenIds.has(task.id)) return false;
      seenIds.add(task.id);
      return true;
    });

    lastRefetchAtRef.current = Date.now();
    setTasks(merged as Task[]);
    if (currentWorkspace) {
      setCachedPlannerTasks(
        currentWorkspace.isPersonal ? null : currentWorkspace.id,
        currentWorkspace.isPersonal,
        merged as Task[]
      );
    }
  }, [initialWorkspaceId, currentWorkspace]);

  // Refetch no mount: lista do planner vem sempre da mesma busca (pessoal + workspace, sem assignee)
  const refetchedOnMountRef = useRef(false);
  useEffect(() => {
    if (!currentWorkspace || refetchedOnMountRef.current) return;
    if (currentWorkspace.isPersonal && !initialWorkspaceId) return; // slug ainda não resolvido
    refetchedOnMountRef.current = true;
    refetchPlannerTasks();
  }, [currentWorkspace, initialWorkspaceId, refetchPlannerTasks]);

  // Se temos dados iniciais e tasks, renderizar imediatamente mesmo sem currentWorkspace definido
  // (currentWorkspace será resolvido pelo useEffect, mas não deve bloquear renderização)
  if (initialTasks !== undefined && tasks.length >= 0 && !loading) {
    // Renderizar mesmo se currentWorkspace ainda não estiver definido (será resolvido em breve)
    // Mas só se não estamos trocando de workspace
    if (!isSwitchingWorkspace) {
      return (
        <PlannerContent
          tasks={tasks}
          workspaces={initialWorkspaces}
          workspaceId={currentWorkspace?.isPersonal ? undefined : currentWorkspace?.id}
          isPersonal={currentWorkspace?.isPersonal ?? initialIsPersonal ?? false}
          onRefetchTasks={refetchPlannerTasks}
        />
      );
    }
  }

  // Não mostrar skeleton se está trocando workspace (deixar workspace loading aparecer)
  if (isSwitchingWorkspace) {
    return null;
  }

  // Mostrar skeleton apenas se realmente estiver carregando E não temos dados iniciais
  if (loading && initialTasks === undefined) {
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

  // Se não há currentWorkspace e não temos dados iniciais, retornar null
  if (!currentWorkspace && initialTasks === undefined) {
    return null;
  }

  return (
    <PlannerContent
      tasks={tasks}
      workspaces={initialWorkspaces}
      workspaceId={currentWorkspace?.isPersonal ? undefined : currentWorkspace?.id}
      isPersonal={currentWorkspace?.isPersonal ?? false}
      onRefetchTasks={refetchPlannerTasks}
    />
  );
}

