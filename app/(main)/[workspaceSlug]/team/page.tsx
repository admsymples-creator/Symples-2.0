import { SettingsPageClient } from "../../settings/settings-client";
import { getUserProfile, getUserWorkspaces } from "@/lib/actions/user";
import { getWorkspaceMembers, getPendingInvites } from "@/lib/actions/members";
import { redirect } from "next/navigation";

/**
 * Server Component para a página de Time por workspace
 * Busca dados no servidor antes de renderizar para melhor performance
 */
export default async function WorkspaceTeamPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>;
}) {
  const { workspaceSlug } = await params;
  
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

  // Encontrar workspace pelo slug ou ID
  const activeWorkspace = userWorkspaces.find(
    w => w.slug === workspaceSlug || w.id === workspaceSlug
  );

  if (!activeWorkspace) {
    // Se não encontrar, redirecionar para o primeiro workspace
    const firstWorkspace = userWorkspaces[0];
    const firstWorkspaceSlug = firstWorkspace.slug || firstWorkspace.id;
    redirect(`/${firstWorkspaceSlug}/team`);
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
