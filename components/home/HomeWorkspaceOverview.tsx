"use client";

import { useState, useEffect, useMemo } from "react";
import { useWorkspace } from "@/components/providers/SidebarProvider";
import { WorkspaceCard } from "@/components/home/WorkspaceCard";
import { ProjectCard } from "@/components/home/ProjectCard";
import { getProjectsWeeklyStats } from "@/lib/actions/dashboard";
import { getUserWorkspaces } from "@/lib/actions/user";
import { isPersonalWorkspace } from "@/lib/utils/workspace-helpers";
import { getProjectIcons } from "@/lib/actions/projects";

interface WorkspaceStats {
  id: string;
  name: string;
  slug: string | null;
  logo_url: string | null;
  pendingCount: number;
  totalCount: number;
  members: Array<{
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  }>;
}

interface HomeWorkspaceOverviewProps {
  workspaceStats: WorkspaceStats[];
  weekStart: Date;
  weekEnd: Date;
}

export function HomeWorkspaceOverview({ workspaceStats, weekStart, weekEnd }: HomeWorkspaceOverviewProps) {
  const { activeWorkspaceId, isLoaded } = useWorkspace();
  const [projectStats, setProjectStats] = useState<Array<{ tag: string; pendingCount: number; totalCount: number }>>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [workspaces, setWorkspaces] = useState<Array<{ id: string; name: string; slug: string | null }>>([]);
  const [projectIcons, setProjectIcons] = useState<Map<string, string>>(new Map());

  // Buscar workspaces para detectar se é pessoal
  useEffect(() => {
    const loadWorkspaces = async () => {
      try {
        const ws = await getUserWorkspaces();
        setWorkspaces(ws);
      } catch (error) {
        console.error("Erro ao carregar workspaces:", error);
      }
    };
    loadWorkspaces();
  }, []);

  // Detectar se é workspace pessoal (usando função helper robusta)
  const isPersonal = useMemo(() => {
    if (!activeWorkspaceId || !isLoaded) return false;
    const currentWorkspace = workspaces.find(w => w.id === activeWorkspaceId);
    return isPersonalWorkspace(currentWorkspace, workspaces);
  }, [activeWorkspaceId, isLoaded, workspaces]);

  // Buscar estatísticas de projetos quando for workspace profissional
  useEffect(() => {
    const loadProjectStats = async () => {
      if (!activeWorkspaceId || !isLoaded || isPersonal) {
        setProjectStats([]);
        return;
      }

      setLoadingProjects(true);
      try {
        const stats = await getProjectsWeeklyStats(activeWorkspaceId, weekStart, weekEnd);
        setProjectStats(stats);
        
        // Buscar ícones dos projetos
        const icons = await getProjectIcons(activeWorkspaceId);
        setProjectIcons(icons);
      } catch (error) {
        console.error("Erro ao carregar estatísticas de projetos:", error);
        setProjectStats([]);
        setProjectIcons(new Map());
      } finally {
        setLoadingProjects(false);
      }
    };

    loadProjectStats();
  }, [activeWorkspaceId, isLoaded, isPersonal, weekStart, weekEnd]);

  // Filtrar stats para mostrar apenas workspaces (quando for pessoal)
  const filteredWorkspaceStats = useMemo(() => {
    if (isPersonal) {
      return workspaceStats.filter((ws) => {
        // Usar função helper para verificar se é workspace pessoal
        const wsData = workspaces.find(w => w.id === ws.id);
        return !isPersonalWorkspace(wsData, workspaces);
      });
    }
    return [];
  }, [workspaceStats, isPersonal, workspaces]);

  // Mostrar skeleton/loading enquanto carrega (evita desaparecimento do card)
  if (!isLoaded) {
    return (
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Carregando...
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-xl p-5 border border-gray-200 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-2 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Workspace profissional: mostrar projetos
  if (!isPersonal) {
    if (loadingProjects) {
      return (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Visão por Projeto
          </h2>
          <div className="text-sm text-gray-500">Carregando projetos...</div>
        </div>
      );
    }

    if (projectStats.length === 0) {
      return null;
    }

    return (
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Visão por Projeto
        </h2>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {projectStats.map((project, index) => {
            const iconName = projectIcons.get(project.tag);
            return (
              <ProjectCard
                key={project.tag}
                tag={project.tag}
                pendingCount={project.pendingCount}
                totalCount={project.totalCount}
                iconName={iconName}
                isFirst={index === 0}
              />
            );
          })}
        </div>
      </div>
    );
  }

  // Workspace pessoal: mostrar workspaces
  if (filteredWorkspaceStats.length === 0) {
    return null;
  }

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        Visão por Workspace
      </h2>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {filteredWorkspaceStats.map((workspace, index) => {
          return (
            <WorkspaceCard
              key={workspace.id}
              id={workspace.id}
              name={workspace.name}
              slug={workspace.slug}
              logo_url={workspace.logo_url}
              pendingCount={workspace.pendingCount}
              totalCount={workspace.totalCount}
              members={workspace.members}
              isFirst={index === 0}
            />
          );
        })}
      </div>
    </div>
  );
}

