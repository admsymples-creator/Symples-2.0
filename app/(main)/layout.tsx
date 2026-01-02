import { getUserProfile, getUserWorkspaces } from "@/lib/actions/user";
import { getCurrentSubscription } from "@/lib/actions/billing";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";

export default async function MainLayout({
    children,
}: {
    children: React.ReactNode
}) {
    // Fetch user profile and workspaces in parallel for better performance
    const [user, workspaces] = await Promise.all([
        getUserProfile(),
        getUserWorkspaces()
    ]);

    if (!user) {
        return null;
    }

    // Redirect to onboarding if no workspaces (fast failure)
    if (workspaces.length === 0) {
        redirect("/onboarding");
    }

    // Determine active workspace (first workspace for now)
    const activeWorkspace = workspaces[0];
    
    // Fetch subscription data in parallel with other data
    const subscription = activeWorkspace 
        ? await getCurrentSubscription(activeWorkspace.id)
        : null;

    // Map Supabase user to UI user format
    const uiUser = user ? {
        name: user.full_name || "Usuário",
        email: user.email || "",
        avatarUrl: user.avatar_url,
    } : null;

    return (
        <AppShell user={uiUser} workspaces={workspaces} initialSubscription={subscription}>
            {children}
        </AppShell>
    )
}
