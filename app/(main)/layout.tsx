import { getUserProfile, getUserWorkspaces, ensurePersonalWorkspace } from "@/lib/actions/user";
import { getCurrentSubscription } from "@/lib/actions/billing";
import { getWorkspaceTags } from "@/lib/actions/tasks";
import { getProjectIcons } from "@/lib/actions/projects";
import { isPersonalWorkspace } from "@/lib/utils/workspace-helpers";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
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

    // Garantir que o usuário tenha workspace pessoal (apenas se não tiver nenhum workspace)
    // Se o usuário já tem workspaces (ex: acabou de aceitar um convite), não criar pessoal aqui
    // O workspace pessoal será criado quando necessário, mas não deve bloquear acesso ao workspace convidado
    const hasPersonalWorkspace = workspaces.some(w => w.name?.toLowerCase().trim() === "pessoal");
    if (!hasPersonalWorkspace && workspaces.length === 0) {
        // Só criar workspace pessoal se não tiver NENHUM workspace
        // Se tem workspace (ex: convidado), o pessoal será criado em outro momento se necessário
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

        // Buscar projetos para o workspace atualizado
        const isPersonalUpdated = isPersonalWorkspace(activeWorkspace, updatedWorkspaces);
        const [initialProjectsTagsUpdated, initialProjectsIconsUpdated] = await Promise.all([
            !isPersonalUpdated ? getWorkspaceTags(activeWorkspace.id) : Promise.resolve([]),
            !isPersonalUpdated ? getProjectIcons(activeWorkspace.id) : Promise.resolve(new Map<string, string>()),
        ]);

        return (
            <AppShell
                user={uiUser}
                workspaces={updatedWorkspaces}
                initialSubscription={subscription}
                initialProjectsTags={initialProjectsTagsUpdated}
                initialProjectsIcons={initialProjectsIconsUpdated}
                initialWorkspaceId={activeWorkspace.id}
            >
                {children}
            </AppShell>
        );
    }

    // Redirect to onboarding if no workspaces (fast failure)
    if (workspaces.length === 0) {
        redirect("/onboarding");
    }

    // Determine active workspace (do cookie ou primeiro workspace)
    const cookieStore = await cookies();
    const activeWorkspaceIdCookie = cookieStore.get("active_workspace_id");
    const activeWorkspace = activeWorkspaceIdCookie?.value
        ? workspaces.find(w => w.id === activeWorkspaceIdCookie.value) || workspaces[0]
        : workspaces[0];

    const isPersonal = activeWorkspace ? isPersonalWorkspace(activeWorkspace, workspaces) : false;

    // Fetch subscription data e projetos em paralelo
    const [subscription, initialProjectsTags, initialProjectsIcons] = await Promise.all([
        activeWorkspace ? getCurrentSubscription(activeWorkspace.id) : null,
        // Buscar projetos apenas se não for workspace pessoal
        activeWorkspace && !isPersonal ? getWorkspaceTags(activeWorkspace.id) : Promise.resolve([]),
        activeWorkspace && !isPersonal ? getProjectIcons(activeWorkspace.id) : Promise.resolve(new Map<string, string>()),
    ]);

    // Map Supabase user to UI user format
    const uiUser = user ? {
        name: user.full_name || "Usuário",
        email: user.email || "",
        avatarUrl: user.avatar_url,
    } : null;

    return (
        <AppShell
            user={uiUser}
            workspaces={workspaces}
            initialSubscription={subscription}
            initialProjectsTags={initialProjectsTags}
            initialProjectsIcons={initialProjectsIcons}
        >
            {children}
        </AppShell>
    )
}
