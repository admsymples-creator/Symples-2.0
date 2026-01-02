import { getUserWorkspaces } from "@/lib/actions/user";
import { PlannerContent } from "@/components/planner/PlannerContent";
import { PlannerClient } from "@/components/planner/PlannerClient";

export default async function PlannerPage() {
  // Buscar workspaces
  const userWorkspaces = await getUserWorkspaces();

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
            <PlannerClient 
              workspaces={userWorkspaces.map(w => ({ id: w.id, name: w.name }))}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
