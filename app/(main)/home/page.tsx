import { getWeekTasks } from "@/lib/actions/tasks";
import { DayColumn } from "@/components/home/DayColumn";
import { WorkspaceCard } from "@/components/home/WorkspaceCard";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

function getStartOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getEndOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

// Função para agrupar tarefas por dia
function groupTasksByDay(tasks: Task[]): Record<string, Task[]> {
  const grouped: Record<string, Task[]> = {};

  tasks.forEach((task) => {
    if (!task.due_date) return;

    const taskDate = new Date(task.due_date);
    const dateKey = taskDate.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
    });

    if (!grouped[dateKey]) {
      grouped[dateKey] = [];
    }

    grouped[dateKey].push(task);
  });

  return grouped;
}

interface HomePageProps {
  searchParams: Promise<{
    days?: string;
  }>;
}

export default async function HomePage(props: HomePageProps) {
  const searchParams = await props.searchParams;
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
    tasks = await getWeekTasks(startDateISO, endDateISO);
  } catch (error) {
    console.error("Erro ao carregar tarefas:", error);
    // Se houver erro de autenticação, redirect já foi feito na função
    // Se for outro erro, continuar com array vazio
  }

  // Agrupar tarefas por dia
  const tasksByDay = groupTasksByDay(tasks);

  // Determinar quantos dias mostrar (padrão: 5)
  const daysToShow = searchParams.days === "3" ? 3 : 5;

  // Gerar dias dinamicamente
  const weekDays = [];
  const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const fullDayNames = [
    "Domingo",
    "Segunda",
    "Terça",
    "Quarta",
    "Quinta",
    "Sexta",
    "Sábado",
  ];

  let startOffset = 0;
  let endOffset = 0;

  if (daysToShow === 3) {
    // 3 Dias: Ontem, Hoje, Amanhã (com clamp)
    const currentDayOfWeek = today.getDay();

    startOffset = -1;
    endOffset = 1;

    // Clamp para início da semana (Domingo)
    if (currentDayOfWeek === 0) {
      startOffset = 0;
      endOffset = 2;
    }

    // Clamp para fim da semana (Sábado)
    if (currentDayOfWeek === 6) {
      startOffset = -2;
      endOffset = 0;
    }
  } else {
    // 5 Dias (Padrão): 2 antes, hoje, 2 depois
    startOffset = -2;
    endOffset = 2;
  }

  for (let i = startOffset; i <= endOffset; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);

    const dayOfWeek = date.getDay();
    const isToday = i === 0;

    const dateKey = date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
    });

    weekDays.push({
      name: fullDayNames[dayOfWeek],
      shortName: dayNames[dayOfWeek],
      date: dateKey,
      dateKey,
      isToday,
      dateObj: date,
      tasks: tasksByDay[dateKey] || [],
    });
  }

  // Classe de grid dinâmica
  const getGridClass = () => {
    switch (daysToShow) {
      case 3:
        return "grid-cols-1 md:grid-cols-3";
      default:
        return "grid-cols-1 md:grid-cols-3 lg:grid-cols-5";
    }
  };

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
        {/* Weekly Grid */}
        <div>
          <div className="flex items-center justify-between mb-6">
            {/* Line 2 Left: Section Title */}
             <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-gray-900">
                    Visão Semanal
                </h2>
             </div>

            {/* Line 2 Right: View Toggle */}
            <Tabs defaultValue={daysToShow.toString()}>
              <TabsList className="bg-white border">
                <TabsTrigger
                  value="3"
                  className="text-sm px-4"
                  asChild
                >
                  <a href="?days=3">3 Dias</a>
                </TabsTrigger>
                <TabsTrigger
                  value="5"
                  className="text-sm px-4"
                  asChild
                >
                  <a href="?days=5">Semana</a>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className={`grid gap-4 ${getGridClass()}`}>
            {weekDays.map((day) => (
              <DayColumn
                key={day.dateKey}
                dayName={day.name}
                date={day.date}
                dateObj={day.dateObj}
                tasks={day.tasks}
                isToday={day.isToday}
              />
            ))}
          </div>
        </div>

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
