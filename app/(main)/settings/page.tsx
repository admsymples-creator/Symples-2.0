import { Suspense } from "react";
import { getUserProfile, getUserWorkspaces } from "@/lib/actions/user";
import { getWorkspaceMembers, getPendingInvites } from "@/lib/actions/members";
import { SettingsPageClient } from "./settings-client";

export default async function SettingsPage() {
  const user = await getUserProfile();
  const workspaces = await getUserWorkspaces();
  
  // Assumindo o primeiro workspace como ativo para fins de configuração
  // Em uma implementação mais robusta, o workspace ativo viria de um contexto, cookie ou URL
  const activeWorkspace = workspaces.length > 0 ? workspaces[0] : null;
  
  const members = activeWorkspace ? await getWorkspaceMembers(activeWorkspace.id) : [];
  const invites = activeWorkspace ? await getPendingInvites(activeWorkspace.id) : [];

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
      />
    </Suspense>
  );
}
