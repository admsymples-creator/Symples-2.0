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

export function PlannerClient() {
  const pathname = usePathname();
  const { activeWorkspaceId, isLoaded } = useWorkspace();
  const initialWorkspaces = useWorkspaces();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentWorkspace, setCurrentWorkspace] = useState<{ id: string; name: string; isPersonal: boolean } | null>(null);
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

  // Buscar tarefas - filtrar por workspace ativo (exceto se for pessoal)
  useEffect(() => {
    const loadTasks = async () => {
      if (!currentWorkspace) return;
      
      setLoading(true);
      try {
        const today = new Date();
        const startOfWeek = getStartOfWeek(today);
        const endOfWeek = getEndOfWeek(today);

        // Se for workspace pessoal, buscar de todos os workspaces (reunir informações)
        // Caso contrário, buscar apenas do workspace ativo
        if (currentWorkspace.isPersonal) {
          // Workspace pessoal: buscar todas as tarefas atribuídas ao usuário da semana
          const fetchedTasks = await getTasks({
            assigneeId: "current",
            dueDateStart: startOfWeek.toISOString(),
            dueDateEnd: endOfWeek.toISOString(),
          });
          setTasks(fetchedTasks as unknown as Task[] || []);
        } else {
          // Workspace profissional: buscar apenas tarefas do workspace ativo da semana
          const fetchedTasks = await getTasks({
            workspaceId: currentWorkspace.id,
            assigneeId: "current",
            dueDateStart: startOfWeek.toISOString(),
            dueDateEnd: endOfWeek.toISOString(),
          });
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
  }, [currentWorkspace]);

  if (loading || !currentWorkspace) {
    return <div className="min-h-[400px]" />;
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

