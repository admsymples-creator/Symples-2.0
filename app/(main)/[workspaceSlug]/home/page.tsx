import { Suspense } from "react";
import { getWorkspacesWeeklyStats, getProjectsWeeklyStats } from "@/lib/actions/dashboard";
import { getTasks } from "@/lib/actions/tasks";
import { getNotifications } from "@/lib/actions/notifications";
import { getProjectIcons } from "@/lib/actions/projects";
import { getWorkspaceIdBySlug } from "@/lib/actions/tasks";
import { getUserWorkspaces } from "@/lib/actions/user";
import { isPersonalWorkspace } from "@/lib/utils/workspace-helpers";
import { TrialBanner } from "@/components/home/TrialBanner";
import { HomeTasksSection } from "@/components/home/HomeTasksSection";
import { HomeInboxSection } from "@/components/home/HomeInboxSection";
import { HomeWorkspaceOverview } from "@/components/home/HomeWorkspaceOverview";
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
  
  // 1. Obter workspaceId do slug
  const workspaceId = await getWorkspaceIdBySlug(workspaceSlug);
  if (!workspaceId) {
    return notFound();
  }

  // 2. Buscar workspaces para detectar se é pessoal
  const workspaces = await getUserWorkspaces();
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

  // 4. Buscar dados críticos primeiro (tarefas e notificações) para exibição imediata
  const criticalDataStartTime = Date.now();
  const [initialTasks, initialNotifications] = await Promise.all([
    // Buscar tarefas iniciais no servidor
    getTasks({
      workspaceId: isPersonal ? null : workspaceId,
      assigneeId: "current",
      dueDateStart: startOfWeek.toISOString(),
      dueDateEnd: endOfWeek.toISOString(),
    }),
    // Buscar notificações iniciais no servidor
    getNotifications({ 
      limit: 30,
      workspaceId: isPersonal ? null : workspaceId,
    }),
  ]);
  const criticalDataTime = Date.now() - criticalDataStartTime;
  const tasksSize = JSON.stringify(initialTasks).length;
  const notificationsSize = JSON.stringify(initialNotifications).length;
  console.log(`[PERF] Home - Critical data (tasks + notifications): ${criticalDataTime}ms`);
  console.log(`[PERF] Home - Data size: tasks=${(tasksSize / 1024).toFixed(2)}KB, notifications=${(notificationsSize / 1024).toFixed(2)}KB`);

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
  const secondaryDataTime = Date.now() - secondaryDataStartTime;
  const totalPageTime = Date.now() - pageStartTime;
  console.log(`[PERF] Home - Secondary data (stats + icons): ${secondaryDataTime}ms`);
  console.log(`[PERF] Home - Total page render time: ${totalPageTime}ms`);

  return (
    <div className="min-h-screen bg-white pb-20">
      {/* HEADER AREA - LINE 1 */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 sticky top-0 z-10">
        <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Bom dia, Usuário 👋
            </h1>
            <p className="text-sm text-gray-500">
              Aqui está o panorama da sua semana.
            </p>
          </div>
        </div>
      </div>

      <div className="w-full bg-white px-6">
        <div className="max-w-[1600px] mx-auto py-3">
          <div className="space-y-8">
            {/* Trial Banner */}
            <Suspense fallback={null}>
              <TrialBanner />
            </Suspense>

            {/* Cards: Minhas tarefas e Caixa de entrada - Carregar imediatamente com dados do servidor */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <HomeTasksSection 
                period="week" 
                initialTasks={initialTasks}
                initialWorkspaceId={workspaceId}
                initialIsPersonal={isPersonal}
              />
              <HomeInboxSection initialNotifications={initialNotifications} />
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
