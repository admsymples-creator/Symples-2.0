"use client";

import { useState, useEffect, useMemo } from "react";
import { useWorkspace } from "@/components/providers/SidebarProvider";
import { useWorkspaces } from "@/components/providers/WorkspacesProvider";
import { WorkspaceCard } from "@/components/home/WorkspaceCard";
import { ProjectCard } from "@/components/home/ProjectCard";
import { getProjectsWeeklyStats } from "@/lib/actions/dashboard";
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

export interface HomeWorkspaceOverviewProps {
  workspaceStats: WorkspaceStats[];
  weekStart: Date;
  weekEnd: Date;
  initialProjectStats?: Array<{ tag: string; pendingCount: number; totalCount: number }>;
  initialProjectIcons?: Record<string, string>; // Objeto serializável em vez de Map
  initialIsPersonal?: boolean;
}

export function HomeWorkspaceOverview({ 
  workspaceStats, 
  weekStart, 
  weekEnd, 
  initialProjectStats = [], 
  initialProjectIcons = {}, 
  initialIsPersonal = false 
}: HomeWorkspaceOverviewProps) {
  const { activeWorkspaceId, isLoaded } = useWorkspace();
  const workspaces = useWorkspaces();
  const [projectStats, setProjectStats] = useState<Array<{ tag: string; pendingCount: number; totalCount: number }>>(initialProjectStats || []);
  const [loadingProjects, setLoadingProjects] = useState(false);
  // Converter objeto para Map se necessário
  const [projectIcons, setProjectIcons] = useState<Map<string, string>>(() => {
    if (initialProjectIcons) {
      return new Map(Object.entries(initialProjectIcons));
    }
    return new Map();
  });

  // Detectar se é workspace pessoal (usando função helper robusta)
  const isPersonal = useMemo(() => {
    if (!activeWorkspaceId || !isLoaded) return false;
    const currentWorkspace = workspaces.find(w => w.id === activeWorkspaceId);
    return isPersonalWorkspace(currentWorkspace, workspaces);
  }, [activeWorkspaceId, isLoaded, workspaces]);

  // Sincronizar dados iniciais quando disponíveis
  useEffect(() => {
    if (initialProjectStats !== undefined && !isPersonal && initialIsPersonal === false) {
      setProjectStats(initialProjectStats);
      if (initialProjectIcons) {
        setProjectIcons(new Map(Object.entries(initialProjectIcons)));
      }
    }
  }, [initialProjectStats, initialProjectIcons, initialIsPersonal, isPersonal]);

  // Buscar estatísticas de projetos quando for workspace profissional
  // OTIMIZAÇÃO: Só fazer fetch se não tiver dados iniciais
  useEffect(() => {
    const loadProjectStats = async () => {
      if (!activeWorkspaceId || !isLoaded || isPersonal) {
        if (isPersonal) {
          setProjectStats([]);
        }
        return;
      }

      // Se temos dados iniciais válidos, não fazer fetch
      if (initialProjectStats !== undefined && initialIsPersonal === false) {
        return; // Usar dados iniciais
      }

      setLoadingProjects(true);
      try {
        // OTIMIZAÇÃO: Buscar stats e icons em paralelo
        const [stats, icons] = await Promise.all([
          getProjectsWeeklyStats(activeWorkspaceId, weekStart, weekEnd),
          getProjectIcons(activeWorkspaceId)
        ]);
        
        setProjectStats(stats);
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
  }, [activeWorkspaceId, isLoaded, isPersonal, weekStart, weekEnd, initialProjectStats, initialIsPersonal, workspaces]);

  // Filtrar stats para mostrar apenas workspaces (quando for pessoal)
  // IMPORTANTE: Este useMemo deve estar ANTES de qualquer return condicional
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
  // IMPORTANTE: Este return está DEPOIS de todos os hooks, então está correto
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
          {/* Skeleton loading para melhor UX */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-xl p-5 border border-gray-200 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-2 bg-gray-200 rounded w-1/2 mb-4"></div>
                <div className="h-2 bg-gray-200 rounded w-full"></div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // Mostrar mensagem se não houver projetos (em vez de retornar null)
    if (projectStats.length === 0) {
      return (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Visão por Projeto
          </h2>
          <div className="text-sm text-gray-500">
            Nenhum projeto encontrado. Crie um projeto na página de Tarefas.
          </div>
        </div>
      );
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
