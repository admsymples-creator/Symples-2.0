import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getUserWorkspaces } from "@/lib/actions/user";

/**
 * Redireciona /tasks para /[workspaceSlug]/tasks baseado no workspace ativo
 */
export default async function TasksPage({ searchParams }: { searchParams: Promise<{ search?: string; taskId?: string; task?: string }> }) {
  const { search, taskId, task } = await searchParams;
  const cookieStore = await cookies();
  const activeWorkspaceIdCookie = cookieStore.get("active_workspace_id");
  const workspaces = await getUserWorkspaces();

  if (!workspaces || workspaces.length === 0) {
    redirect("/onboarding");
  }

  // Determinar workspace ativo
  let activeWorkspace = workspaces[0];
  if (activeWorkspaceIdCookie?.value) {
    const workspaceFromCookie = workspaces.find(
      w => w.id === activeWorkspaceIdCookie.value
    );
    if (workspaceFromCookie) {
      activeWorkspace = workspaceFromCookie;
    }
  }

  // Redirecionar para a rota com workspace slug, preservando params
  const workspaceSlug = activeWorkspace.slug || activeWorkspace.id;
  const params = new URLSearchParams();
  if (search) params.set("search", encodeURIComponent(search));
  // Suportar tanto ?taskId= (correto) quanto ?task= (legado dos triggers antigos)
  const effectiveTaskId = taskId || task;
  if (effectiveTaskId) params.set("taskId", effectiveTaskId);
  const query = params.toString() ? `?${params.toString()}` : "";
  redirect(`/${workspaceSlug}/tasks${query}`);
}





