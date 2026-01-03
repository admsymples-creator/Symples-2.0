import { PlannerPageClient } from "../../planner/planner-page-client";
import { getWorkspaceIdBySlug } from "@/lib/actions/tasks";
import { getTasks } from "@/lib/actions/tasks";
import { notFound } from "next/navigation";
import { isPersonalWorkspace } from "@/lib/utils/workspace-helpers";
import { getUserWorkspaces } from "@/lib/actions/user";

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

  // 1. Obter workspaceId do slug
  const workspaceId = await getWorkspaceIdBySlug(workspaceSlug);

  if (!workspaceId) {
    return notFound();
  }

  // 2. Buscar workspaces para detectar se é pessoal
  const workspaces = await getUserWorkspaces();
  const workspace = workspaces.find(w => w.id === workspaceId);
  const isPersonal = workspace ? isPersonalWorkspace(workspace, workspaces) : false;

  // 3. Calcular range da semana
  const today = new Date();
  const startOfWeek = getStartOfWeek(today);
  const endOfWeek = getEndOfWeek(today);

  // 4. Buscar tarefas iniciais da semana
  const tasksStartTime = Date.now();
  const initialTasks = await getTasks({
    workspaceId: isPersonal ? undefined : workspaceId,
    assigneeId: "current",
    dueDateStart: startOfWeek.toISOString(),
    dueDateEnd: endOfWeek.toISOString(),
  });
  const tasksTime = Date.now() - tasksStartTime;
  const tasksSize = JSON.stringify(initialTasks).length;
  console.log(`[PERF] Planner - Tasks fetch: ${tasksTime}ms`);
  console.log(`[PERF] Planner - Data size: tasks=${(tasksSize / 1024).toFixed(2)}KB`);

  // Filtrar por workspace se não for pessoal
  const filteredTasks = isPersonal 
    ? initialTasks 
    : initialTasks.filter(task => task.workspace_id === workspaceId);
  
  const totalPageTime = Date.now() - pageStartTime;
  console.log(`[PERF] Planner - Total page render time: ${totalPageTime}ms`);

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
            />
          </div>
        </div>
      </div>
    </div>
  );
}
