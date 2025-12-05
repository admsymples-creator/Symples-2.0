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
    // IMPORTANTE: Não redirecionar para onboarding se acabou de aceitar um convite
    // Isso evita redirecionamento prematuro antes do cache ser atualizado
    let finalWorkspaces = workspaces;
    if (workspaces.length === 0) {
         // Aguardar mais tempo e tentar múltiplas vezes para dar tempo do cache/RLS atualizar
         // após aceitar um convite
         for (let attempt = 0; attempt < 3; attempt++) {
             await new Promise(resolve => setTimeout(resolve, 500));
             const workspacesRetry = await getUserWorkspaces();
             
             if (workspacesRetry.length > 0) {
                 finalWorkspaces = workspacesRetry;
                 break;
             }
         }
         
         // Se após 3 tentativas ainda não encontrou workspaces, redirecionar para onboarding
         if (finalWorkspaces.length === 0) {
             // IMPORTANTE: O middleware não deve redirecionar /onboarding de volta para /home
             // se o usuário estiver logado, para evitar loop infinito.
             redirect("/onboarding");
         }
    }

    // Map Supabase user to UI user format
    const uiUser = user ? {
        name: user.full_name || "Usuário",
        email: user.email || "",
        avatarUrl: user.avatar_url,
    } : null;

    return (
        <AppShell user={uiUser} workspaces={finalWorkspaces}>
            {children}
        </AppShell>
    )
}
