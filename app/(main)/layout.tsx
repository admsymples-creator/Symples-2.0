import { getUserProfile, getUserWorkspaces } from "@/lib/actions/user";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";

export default async function MainLayout({
    children,
}: {
    children: React.ReactNode
}) {
    // Fetch user profile
    const user = await getUserProfile();

    if (!user) {
        return null;
    }

    // Fetch workspaces (single call, no retries, no artificial delays)
    const workspaces = await getUserWorkspaces();

    // Redirect to onboarding if no workspaces (fast failure)
    if (workspaces.length === 0) {
        redirect("/onboarding");
    }

    // Map Supabase user to UI user format
    const uiUser = user ? {
        name: user.full_name || "Usuário",
        email: user.email || "",
        avatarUrl: user.avatar_url,
    } : null;

    return (
        <AppShell user={uiUser} workspaces={workspaces}>
            {children}
        </AppShell>
    )
}
