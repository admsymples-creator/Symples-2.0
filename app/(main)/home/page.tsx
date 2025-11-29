import { getWeekTasks } from "@/lib/actions/dashboard";
import { WeeklyView } from "@/components/home/WeeklyView";
import { WorkspaceCard } from "@/components/home/WorkspaceCard";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Database } from "@/types/database.types";

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

  // Converter para ISO strings
  const startDateISO = startOfWeek.toISOString();
  const endDateISO = endOfWeek.toISOString();

  // Buscar tarefas da semana
  let tasks: Task[] = [];
  try {
    const startDate = new Date(startDateISO);
    const endDate = new Date(endDateISO);
    const weekTasks = await getWeekTasks(startDate, endDate);
    // Cast necessário pois getWeekTasks retorna tipo com campos opcionais (?) enquanto o banco define como nullable (| null)
    tasks = weekTasks as unknown as Task[];
  } catch (error) {
    console.error("Erro ao carregar tarefas:", error);
  }

  // Mock de workspaces (será substituído por dados reais depois)
  const MOCK_WORKSPACES = [
    { id: "1", name: "Agência V4", pendingCount: 5, totalCount: 12 },
    { id: "2", name: "Consultoria Tech", pendingCount: 3, totalCount: 8 },
  ];

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
          <Button
            className="bg-green-600 hover:bg-green-700 text-white"
            asChild
          >
            <a href="/tasks?action=create">
              <Plus className="w-4 h-4 mr-2" />
              Nova Tarefa
            </a>
          </Button>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-6 py-8 space-y-8">
        {/* Weekly View (Client Component) */}
        <WeeklyView tasks={tasks} />

        {/* Workspaces Overview */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Visão por Workspace
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {MOCK_WORKSPACES.map((workspace) => (
              <WorkspaceCard
                key={workspace.id}
                name={workspace.name}
                pendingCount={workspace.pendingCount}
                totalCount={workspace.totalCount}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
