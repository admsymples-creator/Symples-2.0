import { SettingsPageClient } from "../settings/settings-client";
import { getUserProfile, getUserWorkspaces } from "@/lib/actions/user";
import { getWorkspaceMembers, getPendingInvites } from "@/lib/actions/members";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

/**
 * Server Component para a página de Time
 * Busca dados no servidor antes de renderizar para melhor performance
 */
export default async function TeamPage() {
  // Buscar dados do usuário e workspaces no servidor
  const [user, userWorkspaces] = await Promise.all([
    getUserProfile(),
    getUserWorkspaces()
  ]);

  if (!user) {
    redirect("/login");
  }

  if (!userWorkspaces || userWorkspaces.length === 0) {
    redirect("/onboarding");
  }

  // Tentar obter workspace ativo do cookie (gerenciado pelo SidebarProvider)
  const cookieStore = await cookies();
  const activeWorkspaceIdCookie = cookieStore.get("active_workspace_id");
  let activeWorkspace = userWorkspaces[0]; // Fallback para primeiro workspace

  // Se houver cookie com workspace ativo, usar ele
  if (activeWorkspaceIdCookie?.value) {
    const workspaceFromCookie = userWorkspaces.find(
      w => w.id === activeWorkspaceIdCookie.value
    );
    if (workspaceFromCookie) {
      activeWorkspace = workspaceFromCookie;
    }
  }

  // Buscar membros e convites em paralelo
  const [members, invites] = await Promise.all([
    getWorkspaceMembers(activeWorkspace.id),
    getPendingInvites(activeWorkspace.id)
  ]);

  return (
    <SettingsPageClient
      user={user}
      workspace={activeWorkspace}
      initialMembers={members}
      initialInvites={invites}
      mode="team"
    />
  );
}
