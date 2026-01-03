import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getUserWorkspaces } from "@/lib/actions/user";

/**
 * Redireciona /tasks para /[workspaceSlug]/tasks baseado no workspace ativo
 */
export default async function TasksPage() {
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

  // Redirecionar para a rota com workspace slug
  const workspaceSlug = activeWorkspace.slug || activeWorkspace.id;
  redirect(`/${workspaceSlug}/tasks`);
}


