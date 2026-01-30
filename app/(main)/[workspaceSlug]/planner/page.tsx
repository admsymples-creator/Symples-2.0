import { PlannerPageClient } from "../../planner/planner-page-client";
import { getWorkspaceIdBySlug } from "@/lib/actions/tasks";
import { getTasks } from "@/lib/actions/tasks";
import { notFound } from "next/navigation";
import { getUserWorkspaces, Profile, Workspace } from "@/lib/actions/user";
import { isPersonalWorkspace } from "@/lib/utils/workspace-helpers";

interface PageProps {
  params: Promise<{ workspaceSlug: string }>;
}

// Funções auxiliares para calcular range da semana
function getStartOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

function getEndOfWeek(date: Date): Date {
  const start = getStartOfWeek(date);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

// Forçar renderização dinâmica para evitar cache que pode causar lentidão
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Server Component para o planner por workspace
 * Busca dados iniciais no servidor para melhor performance
 */
export default async function WorkspacePlannerPage({ params }: PageProps) {
  const pageStartTime = Date.now();
  const { workspaceSlug } = await params;

  // 1. Obter dados iniciais em paralelo (Workspace ID e Lista de Workspaces)
  const [workspaceId, workspaces] = await Promise.all([
    getWorkspaceIdBySlug(workspaceSlug),
    getUserWorkspaces(),
  ]);

  if (!workspaceId) {
    return notFound();
  }

  const forcePersonal = true;

  // 2. Detectar se é pessoal (para UI); planner mostra pessoal + workspace atual
  const workspace = workspaces.find(w => w.id === workspaceId);
  const isPersonal = forcePersonal ? true : (workspace ? isPersonalWorkspace(workspace, workspaces) : false);

  // 3. Calcular range expandido (-14 a +14 dias) para tarefas não sumirem após refresh (fuso/limites)
  const today = new Date();
  const startRange = new Date(today);
  startRange.setDate(today.getDate() - 14);
  startRange.setHours(0, 0, 0, 0);

  const endRange = new Date(today);
  endRange.setDate(today.getDate() + 14);
  endRange.setHours(23, 59, 59, 999);

  const dueDateStart = startRange.toISOString();
  const dueDateEnd = endRange.toISOString();

  // 4. Buscar tarefas: pessoais + do workspace atual (sem filtrar por assignee para aparecer todas)
  const [personalTasks, workspaceTasks] = await Promise.all([
    getTasks({
      workspaceId: null,
      assigneeId: undefined,
      dueDateStart,
      dueDateEnd,
    }),
    getTasks({
      workspaceId,
      assigneeId: undefined,
      dueDateStart,
      dueDateEnd,
    }),
  ]);

  // Mesclar e remover duplicatas (por id)
  const seenIds = new Set<string>();
  const filteredTasks = [...personalTasks, ...workspaceTasks].filter((task) => {
    if (seenIds.has(task.id)) return false;
    seenIds.add(task.id);
    return true;
  });

  // Performance logs removed for production

  return (
    <div className="min-h-screen bg-white pb-20">
      <div className="bg-white border-b border-gray-200 px-6 py-3 sticky top-0 z-10">
        <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Planner</h1>
            <p className="text-sm text-gray-500">Visualize suas tarefas em formato de calendário e visão semanal.</p>
          </div>
        </div>
      </div>

      <div className="w-full bg-white px-6">
        <div className="max-w-[1600px] mx-auto">
          <div className="py-3 space-y-8">
            <PlannerPageClient
              initialTasks={filteredTasks}
              workspaceId={workspaceId}
              isPersonal={isPersonal}
              workspaces={workspaces}
              forcePersonal={forcePersonal}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
