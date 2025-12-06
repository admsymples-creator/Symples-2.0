import { getWeekTasks, getWorkspacesWeeklyStats, getUserWorkspaces } from "@/lib/actions/dashboard";
import { WeeklyViewWrapper } from "@/components/home/WeeklyViewWrapper";
import { WorkspaceCard } from "@/components/home/WorkspaceCard";
import { Database } from "@/types/database.types";
import { FolderOpen } from "lucide-react";

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

export default async function HomePage() {
  // Calcular range da semana (Segunda a Domingo)
  const today = new Date();
  const startOfWeek = getStartOfWeek(today);
  const endOfWeek = getEndOfWeek(today);

  // Buscar dados em paralelo
  const [tasks, workspaceStats, userWorkspaces] = await Promise.all([
    getWeekTasks(startOfWeek, endOfWeek),
    getWorkspacesWeeklyStats(startOfWeek, endOfWeek),
    getUserWorkspaces()
  ]);

  const typedTasks = tasks as unknown as Task[];

  return (
    <div className="min-h-screen bg-gray-50/50 pb-20">
      {/* HEADER AREA - LINE 1 */}
      <div className="bg-white border-b px-6 py-5 sticky top-0 z-10">
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

      <div className="max-w-[1600px] mx-auto px-6 py-8 space-y-8">
        {/* Weekly View (Client Component with Empty State) */}
        <WeeklyViewWrapper tasks={typedTasks} workspaces={userWorkspaces} />

        {/* Workspaces Overview */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Visão por Workspace
          </h2>
          
          {workspaceStats.length > 0 ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {workspaceStats.map((workspace) => (
                <WorkspaceCard
                  key={workspace.id}
                  id={workspace.id}
                  name={workspace.name}
                  slug={workspace.slug}
                  logo_url={workspace.logo_url}
                  pendingCount={workspace.pendingCount}
                  totalCount={workspace.totalCount}
                  members={workspace.members}
                />
              ))}
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
  );
}
