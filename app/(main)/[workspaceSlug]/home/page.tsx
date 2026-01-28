import { Suspense } from "react";
import { getWorkspacesWeeklyStats, getProjectsWeeklyStats } from "@/lib/actions/dashboard";
import { getTasks } from "@/lib/actions/tasks";
import { getProjectIcons } from "@/lib/actions/projects";
import { getWorkspaceIdBySlug } from "@/lib/actions/tasks";
import { getUserWorkspaces, getUserProfile } from "@/lib/actions/user";
import { isPersonalWorkspace } from "@/lib/utils/workspace-helpers";
import { TrialBanner } from "@/components/home/TrialBanner";
import { HomeTasksSection } from "@/components/home/HomeTasksSection";
import { WeeklyView } from "@/components/home/WeeklyView";
import { HomeWorkspaceOverview } from "@/components/home/HomeWorkspaceOverview";
import { DynamicGreeting } from "@/components/home/DynamicGreeting";
import { PageLoading } from "@/components/ui/page-loading";
import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{ workspaceSlug: string }>;
}

// Forçar renderização dinâmica para evitar cache que pode causar lentidão
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// ✅ Server Component otimizado - busca todos os dados no servidor
export default async function WorkspaceHomePage({ params }: PageProps) {
  const pageStartTime = Date.now();
  const { workspaceSlug } = await params;

  // 1. Buscar dados do usuário e workspace em paralelo
  const [workspaceId, workspaces, user] = await Promise.all([
    getWorkspaceIdBySlug(workspaceSlug),
    getUserWorkspaces(),
    getUserProfile()
  ]);

  if (!workspaceId) {
    return notFound();
  }

  // 2. Detectar se é pessoal
  const workspace = workspaces.find(w => w.id === workspaceId);
  const isPersonal = workspace ? isPersonalWorkspace(workspace, workspaces) : false;

  // 3. Calcular range da semana (Segunda a Domingo) para stats
  const today = new Date();
  const day = today.getDay();
  const diff = today.getDate() - day + (day === 0 ? -6 : 1);
  const startOfWeek = new Date(today.setDate(diff));
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  // Range estendido para buscar tarefas (buffer de timezone)
  // Isso evita que tarefas criadas em UTC-X, que caem no dia anterior/seguinte em UTC, sejam filtradas
  const taskFetchStart = new Date(startOfWeek);
  taskFetchStart.setDate(taskFetchStart.getDate() - 2);

  const taskFetchEnd = new Date(endOfWeek);
  taskFetchEnd.setDate(taskFetchEnd.getDate() + 2);

  // 4. Buscar dados críticos primeiro (tarefas e notificações) para exibição imediata
  const criticalDataStartTime = Date.now();
  const [initialTasks] = await Promise.all([
    // Buscar tarefas iniciais no servidor
    getTasks({
      workspaceId: isPersonal ? null : workspaceId,
      assigneeId: "current",
      dueDateStart: taskFetchStart.toISOString(),
      dueDateEnd: taskFetchEnd.toISOString(),
    }),
  ]);
  // Performance logs removed for production

  // 5. Buscar dados secundários (stats) em paralelo - podem ser carregados depois
  const secondaryDataStartTime = Date.now();
  const [workspaceStats, projectStats, projectIcons] = await Promise.all([
    getWorkspacesWeeklyStats(startOfWeek, endOfWeek),
    // Buscar stats de projetos se for workspace profissional
    !isPersonal
      ? getProjectsWeeklyStats(workspaceId, startOfWeek, endOfWeek)
      : Promise.resolve([]),
    // Buscar ícones de projetos se for workspace profissional
    // Converter Map para objeto serializável
    !isPersonal
      ? getProjectIcons(workspaceId).then(icons => {
        // Converter Map para objeto para serialização
        const iconsObj: Record<string, string> = {};
        icons.forEach((value, key) => {
          iconsObj[key] = value;
        });
        return iconsObj;
      })
      : Promise.resolve({}),
  ]);
  // Performance logs removed for production

  return (
    <div className="min-h-screen bg-white pb-20">
      {/* HEADER AREA - LINE 1 */}
      <div className="px-6 pt-6">
        <div className="max-w-[1600px] mx-auto">
          <div className="bg-white border border-gray-200 rounded-lg px-6 py-4 sticky top-4 z-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  <DynamicGreeting userName={user?.full_name || null} />
                </h1>
                <p className="text-sm text-gray-500">
                  Aqui está o panorama da sua semana.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full bg-white px-6 mt-4">
        <div className="max-w-[1600px] mx-auto py-3">
          <div className="space-y-8">
            {/* Trial Banner */}
            <Suspense fallback={null}>
              <TrialBanner />
            </Suspense>

            {/* Visão Semanal (cópia do Planner) */}
            <div className="rounded-lg border border-gray-200 bg-white p-6">
              <WeeklyView
                tasks={initialTasks}
                workspaces={workspaces.map(({ id, name }) => ({ id, name }))}
                currentWorkspaceId={workspaceId}
                isPersonal={isPersonal}
              />
            </div>

            {/* Cards: Minhas tarefas - Carregar imediatamente com dados do servidor */}
            <div className="w-full">
              <HomeTasksSection
                period="week"
                initialTasks={initialTasks}
                initialWorkspaceId={workspaceId}
                initialIsPersonal={isPersonal}
              />
            </div>

            {/* Workspaces Overview - Carregar com Suspense para não bloquear render */}
            <Suspense fallback={<div className="h-64 animate-pulse bg-gray-100 rounded-lg" />}>
              <HomeWorkspaceOverview
                workspaceStats={workspaceStats}
                weekStart={startOfWeek}
                weekEnd={endOfWeek}
                initialProjectStats={projectStats}
                initialProjectIcons={projectIcons}
                initialIsPersonal={isPersonal}
              />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}
