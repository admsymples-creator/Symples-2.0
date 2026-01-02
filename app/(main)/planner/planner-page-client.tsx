"use client";

import dynamic from "next/dynamic";
import { PlannerClient } from "@/components/planner/PlannerClient";
import { Database } from "@/types/database.types";

type Task = Database["public"]["Tables"]["tasks"]["Row"];

const PlannerClientDynamic = dynamic(
  () => import("@/components/planner/PlannerClient").then((mod) => mod.PlannerClient),
  { 
    ssr: false,
    loading: () => (
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
    )
  }
);

interface PlannerPageClientProps {
  initialTasks?: Task[];
  workspaceId?: string;
  isPersonal?: boolean;
}

export function PlannerPageClient({ initialTasks, workspaceId, isPersonal }: PlannerPageClientProps = {}) {
  // Se temos dados iniciais, passar para o componente
  if (initialTasks !== undefined) {
    return (
      <PlannerClient 
        initialTasks={initialTasks}
        initialWorkspaceId={workspaceId}
        initialIsPersonal={isPersonal}
      />
    );
  }
  
  // Fallback para carregamento dinâmico (quando não há dados iniciais)
  return <PlannerClientDynamic />;
}
