import { PlannerPageClient } from "../../planner/planner-page-client";

export default function WorkspacePlannerPage() {
  return (
    <div className="min-h-screen bg-white pb-20">
      <div className="bg-white border-b border-gray-200 px-6 py-3 sticky top-0 z-10">
        <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Planner</h1>
            <p className="text-sm text-gray-500">Visualize suas tarefas em formato de calend?rio e vis?o semanal.</p>
          </div>
        </div>
      </div>

      <div className="w-full bg-white px-6">
        <div className="max-w-[1600px] mx-auto">
          <div className="py-3 space-y-8">
            <PlannerPageClient />
          </div>
        </div>
      </div>
    </div>
  );
}
