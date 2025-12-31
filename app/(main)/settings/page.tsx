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
  const activeWorkspaceId = cookies().get('active-workspace-id')?.value;
  const activeWorkspace = activeWorkspaceId 
    ? workspaces.find(w => w.id === activeWorkspaceId) || workspaces[0]
    : workspaces.length > 0 ? workspaces[0] : null;
  
  const members = activeWorkspace ? await getWorkspaceMembers(activeWorkspace.id) : [];
  const invites = activeWorkspace ? await getPendingInvites(activeWorkspace.id) : [];
  
  // Buscar dados de subscription no servidor
  const subscription = activeWorkspace ? await getCurrentSubscription(activeWorkspace.id) : null;

  return (
    <Suspense fallback={
      <div className="container max-w-5xl py-10 mx-auto">
        <div className="flex flex-col gap-2 mb-8">
          <div className="h-9 w-64 bg-gray-200 animate-pulse rounded" />
          <div className="h-5 w-96 bg-gray-100 animate-pulse rounded" />
        </div>
        <div className="h-96 bg-gray-50 animate-pulse rounded-lg" />
      </div>
    }>
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
