import { getWorkspacesWeeklyStats, getUserWorkspaces } from "@/lib/actions/dashboard";
import { WorkspaceCard } from "@/components/home/WorkspaceCard";
import { TrialBanner } from "@/components/home/TrialBanner";
import { HomeActionBarWrapper, HomeTasksAndInboxCards } from "@/components/home/HomeActionBarWrapper";
import { FolderOpen } from "lucide-react";

// ✅ Componente Server-Side limpo (sem lógica de params propensos a erro/crash)
export default async function HomePage() {
  // Calcular range da semana (Segunda a Domingo) para stats
  const today = new Date();
  const day = today.getDay();
  const diff = today.getDate() - day + (day === 0 ? -6 : 1);
  const startOfWeek = new Date(today.setDate(diff));
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  // Buscar dados em paralelo
  const [workspaceStats, userWorkspaces] = await Promise.all([
    getWorkspacesWeeklyStats(startOfWeek, endOfWeek),
    getUserWorkspaces()
  ]);

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
            <TrialBanner />

            {/* Barra de ações com botão criar tarefa e tabs + Cards */}
            <HomeActionBarWrapper>
              {/* Cards: Minhas tarefas e Caixa de entrada */}
              <HomeTasksAndInboxCards />
            </HomeActionBarWrapper>

            {/* Workspaces Overview */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Visão por Workspace
              </h2>

              {workspaceStats.length > 0 ? (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {workspaceStats.map((workspace, index) => {
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
                        isFirst={index === 0} // ✅ Passa apenas se é o primeiro para fallback de highlight
                      />
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl border border-gray-200 border-dashed">
                  <FolderOpen className="w-12 h-12 text-gray-300 mb-3" />
                  <p className="text-gray-500 font-medium">Nenhum workspace encontrado</p>
                  <p className="text-sm text-gray-400 mt-1">Você ainda não participa de nenhum workspace.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
