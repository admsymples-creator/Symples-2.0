import { getUserProfile, getUserWorkspaces, ensurePersonalWorkspace } from "@/lib/actions/user";
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

    // Garantir que o usuário tenha workspace pessoal
    const hasPersonalWorkspace = workspaces.some(w => w.name?.toLowerCase().trim() === "pessoal");
    if (!hasPersonalWorkspace) {
        await ensurePersonalWorkspace();
        // Recarregar workspaces após criar o pessoal
        const updatedWorkspaces = await getUserWorkspaces();
        if (updatedWorkspaces.length === 0) {
            redirect("/onboarding");
        }
        // Usar workspaces atualizados
        const activeWorkspace = updatedWorkspaces[0];
        const subscription = activeWorkspace 
            ? await getCurrentSubscription(activeWorkspace.id)
            : null;
        
        const uiUser = user ? {
            name: user.full_name || "Usuário",
            email: user.email || "",
            avatarUrl: user.avatar_url,
        } : null;

        return (
            <AppShell user={uiUser} workspaces={updatedWorkspaces} initialSubscription={subscription}>
                {children}
            </AppShell>
        );
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
