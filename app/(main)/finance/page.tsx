"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useWorkspaces } from "@/components/providers/WorkspacesProvider";

export default function FinancePage() {
  const router = useRouter();
  const workspaces = useWorkspaces();

  useEffect(() => {
    if (workspaces.length === 0) {
      router.replace("/onboarding");
      return;
    }

    const workspace = workspaces[0];
    const slug = workspace.slug || workspace.id;
    router.replace(`/${slug}/finance`);
  }, [router, workspaces]);

  return null;
}
