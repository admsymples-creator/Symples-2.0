import { Suspense } from "react";
import { cookies } from "next/headers";
import { getUserProfile, getUserWorkspaces } from "@/lib/actions/user";
import { getWorkspaceMembers, getPendingInvites } from "@/lib/actions/members";
import { SettingsPageClient } from "../settings/settings-client";

export default async function TeamPage() {
  const user = await getUserProfile();
  const workspaces = await getUserWorkspaces();

  const cookieStore = await cookies();
  const activeWorkspaceId = cookieStore.get("active-workspace-id")?.value;
  const activeWorkspace = activeWorkspaceId
    ? workspaces.find((w) => w.id === activeWorkspaceId) || workspaces[0]
    : workspaces.length > 0
      ? workspaces[0]
      : null;

  const members = activeWorkspace ? await getWorkspaceMembers(activeWorkspace.id) : [];
  const invites = activeWorkspace ? await getPendingInvites(activeWorkspace.id) : [];

  return (
    <Suspense fallback={null}>
      <SettingsPageClient
        user={user}
        workspace={activeWorkspace}
        initialMembers={members}
        initialInvites={invites}
        mode="team"
      />
    </Suspense>
  );
}
