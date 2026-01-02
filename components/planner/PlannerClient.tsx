"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { useWorkspace } from "@/components/providers/SidebarProvider";
import { getUserWorkspaces } from "@/lib/actions/user";
import { getTasks } from "@/lib/actions/tasks";
import { PlannerContent } from "@/components/planner/PlannerContent";
import { Database } from "@/types/database.types";
import { isPersonalWorkspace } from "@/lib/utils/workspace-helpers";

type Task = Database["public"]["Tables"]["tasks"]["Row"];

interface PlannerClientProps {
  workspaces: { id: string; name: string }[];
}

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

export function PlannerClient({ workspaces: initialWorkspaces }: PlannerClientProps) {
  const pathname = usePathname();
  const { activeWorkspaceId, isLoaded } = useWorkspace();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentWorkspace, setCurrentWorkspace] = useState<{ id: string; name: string; isPersonal: boolean } | null>(null);
  const [allWorkspaces, setAllWorkspaces] = useState<Array<{ id: string; name: string; slug: string | null }>>([]);

  // Detectar workspace atual da URL e verificar se é pessoal
  useEffect(() => {
    const detectWorkspace = async () => {
      if (!isLoaded) return;
      
      const workspaces = await getUserWorkspaces();
      setAllWorkspaces(workspaces); // Armazenar para usar na função helper
      const segments = pathname.split("/").filter(Boolean);
      
      // Se estamos em /planner (sem workspace), usar workspace ativo do contexto
      let workspaceId = activeWorkspaceId;
      if (segments.length > 0 && segments[0] !== "planner") {
        // Estamos em um workspace específico na URL
        const workspaceSlug = segments[0];
        const workspace = workspaces.find(w => w.slug === workspaceSlug || w.id === workspaceSlug);
        if (workspace) {
          workspaceId = workspace.id;
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
        }
      }
    };
    
    detectWorkspace();
  }, [pathname, activeWorkspaceId, isLoaded]);

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
          setTasks(fetchedTasks as unknown as Task[] || []);
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

