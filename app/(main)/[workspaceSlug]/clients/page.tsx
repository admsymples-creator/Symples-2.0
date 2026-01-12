import { redirect } from "next/navigation";
import { getUserProfile, getUserWorkspaces } from "@/lib/actions/user";
import { getClients } from "@/lib/actions/clients";
import { ClientsPageClient } from "../../clients/clients-page-client";

/**
 * Pagina de clientes por workspace
 */
export default async function WorkspaceClientsPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>;
}) {
  const { workspaceSlug } = await params;

  const [user, userWorkspaces] = await Promise.all([
    getUserProfile(),
    getUserWorkspaces(),
  ]);

  if (!user) {
    redirect("/login");
  }

  if (!userWorkspaces || userWorkspaces.length === 0) {
    redirect("/onboarding");
  }

  const activeWorkspace = userWorkspaces.find(
    (workspace) => workspace.slug === workspaceSlug || workspace.id === workspaceSlug
  );

  if (!activeWorkspace) {
    const firstWorkspace = userWorkspaces[0];
    const firstWorkspaceSlug = firstWorkspace.slug || firstWorkspace.id;
    redirect(`/${firstWorkspaceSlug}/clients`);
  }

  const clients = await getClients(activeWorkspace.id);

  return (
    <ClientsPageClient
      workspaceId={activeWorkspace.id}
      initialClients={clients}
    />
  );
}
