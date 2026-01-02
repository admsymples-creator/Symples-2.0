import { Suspense } from "react";
import { getUserProfile, getUserWorkspaces } from "@/lib/actions/user";
import { getWorkspaceMembers, getPendingInvites } from "@/lib/actions/members";
import { getCurrentSubscription } from "@/lib/actions/billing";
import { SettingsPageClient } from "./settings-client";
import { cookies } from "next/headers";

export default async function SettingsPage() {
  const user = await getUserProfile();
  const workspaces = await getUserWorkspaces();
  
  // Buscar workspace ativo do cookie ou usar o primeiro
  const cookieStore = await cookies();
  const activeWorkspaceId = cookieStore.get('active-workspace-id')?.value;
  const activeWorkspace = activeWorkspaceId 
    ? workspaces.find(w => w.id === activeWorkspaceId) || workspaces[0]
    : workspaces.length > 0 ? workspaces[0] : null;
  
  const members = activeWorkspace ? await getWorkspaceMembers(activeWorkspace.id) : [];
  const invites = activeWorkspace ? await getPendingInvites(activeWorkspace.id) : [];
  
  // Buscar dados de subscription no servidor
  const subscription = activeWorkspace ? await getCurrentSubscription(activeWorkspace.id) : null;

  return (
    <Suspense fallback={null}>
      <SettingsPageClient 
        user={user} 
        workspace={activeWorkspace}
        initialMembers={members}
        initialInvites={invites}
        initialSubscription={subscription}
      />
    </Suspense>
  );
}
