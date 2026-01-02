"use client";

import { useEffect, useState } from "react";
import { SettingsPageClient } from "../settings/settings-client";
import { useWorkspaces } from "@/components/providers/WorkspacesProvider";
import { getUserProfile, type Profile, type Workspace } from "@/lib/actions/user";

export default function TeamPage() {
  const workspaces = useWorkspaces();
  const [user, setUser] = useState<Profile | null>(null);

  useEffect(() => {
    let isActive = true;
    getUserProfile().then((profile) => {
      if (isActive) {
        setUser(profile);
      }
    });
    return () => {
      isActive = false;
    };
  }, []);

  const initialWorkspace: Workspace | null = workspaces[0] ?? null;

  return (
    <SettingsPageClient
      user={user}
      workspace={initialWorkspace}
      initialMembers={[]}
      initialInvites={[]}
      mode="team"
    />
  );
}
