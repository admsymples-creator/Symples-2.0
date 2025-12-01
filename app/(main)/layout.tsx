import { getUserProfile, getUserWorkspaces } from "@/lib/actions/user";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";

export default async function MainLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const [user, workspaces] = await Promise.all([
        getUserProfile(),
        getUserWorkspaces()
    ]);

    // Redirecionamento de segurança se não houver workspaces
    // (Exceto se estivermos já no onboarding - mas como este layout é para (main),
    // assumimos que onboarding está fora ou deve ser tratado)
    if (workspaces.length === 0) {
         // IMPORTANTE: O middleware não deve redirecionar /onboarding de volta para /home
         // se o usuário estiver logado, para evitar loop infinito.
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
