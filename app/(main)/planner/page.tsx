import { getWeekTasks, getUserWorkspaces } from "@/lib/actions/dashboard";
import { PlannerContent } from "@/components/planner/PlannerContent";
import { Database } from "@/types/database.types";
import { Suspense } from "react";

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

export default async function PlannerPage() {
  // Calcular range da semana (Segunda a Domingo)
  const today = new Date();
  const startOfWeek = getStartOfWeek(today);
  const endOfWeek = getEndOfWeek(today);

  // Buscar dados em paralelo
  const [tasks, userWorkspaces] = await Promise.all([
    getWeekTasks(startOfWeek, endOfWeek),
    getUserWorkspaces()
  ]);

  const typedTasks = tasks as unknown as Task[];

  return (
    <div className="min-h-screen bg-white pb-20">
      {/* HEADER AREA - LINE 1 */}
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
            <Suspense fallback={<div className="min-h-[400px]" />}>
              <PlannerContent 
                tasks={typedTasks} 
                workspaces={userWorkspaces.map(w => ({ id: w.id, name: w.name }))}
              />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}
