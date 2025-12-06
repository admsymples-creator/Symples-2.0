import { getUserProfile, getUserWorkspaces } from "@/lib/actions/user";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { cookies } from "next/headers";

export default async function MainLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const [user, workspaces] = await Promise.all([
        getUserProfile(),
        getUserWorkspaces()
    ]);

    // ✅ CORREÇÃO 4: Loop de Onboarding - Verificar cookie antes de redirecionar
    // Previne redirecionamento para onboarding logo após aceitar convite
    const cookieStore = await cookies();
    const justAcceptedInvite = cookieStore.get('just_accepted_invite')?.value === 'true';
    
    // NOTA: Não deletar o cookie aqui (Server Components não podem modificar cookies)
    // O cookie expira automaticamente após 60 segundos (definido no callback)
    
    // Redirecionamento de segurança se não houver workspaces
    // IMPORTANTE: Não redirecionar para onboarding se acabou de aceitar um convite
    // Isso evita redirecionamento prematuro antes do cache ser atualizado
    let finalWorkspaces = workspaces;
    if (workspaces.length === 0) {
         // Se acabou de aceitar convite, dar mais tempo e mais tentativas
         const maxAttempts = justAcceptedInvite ? 5 : 3;
         const delayMs = justAcceptedInvite ? 700 : 500;
         
         for (let attempt = 0; attempt < maxAttempts; attempt++) {
             await new Promise(resolve => setTimeout(resolve, delayMs));
             const workspacesRetry = await getUserWorkspaces();
             
             if (workspacesRetry.length > 0) {
                 finalWorkspaces = workspacesRetry;
                 break;
             }
         }
         
         // Se após todas tentativas ainda não encontrou workspaces
         if (finalWorkspaces.length === 0) {
             // ✅ CORREÇÃO: Se acabou de aceitar convite, não redirecionar para onboarding
             // mesmo que não tenha encontrado workspace ainda (pode ser delay de replicação)
             if (justAcceptedInvite) {
                 console.warn('⚠️ Workspace não encontrado após aceitar convite, mas permitindo acesso para evitar loop de onboarding');
                 // Permitir que o usuário continue mesmo sem workspace visível
                 // O workspace deve aparecer em breve após refresh
             } else {
                 // IMPORTANTE: O middleware não deve redirecionar /onboarding de volta para /home
                 // se o usuário estiver logado, para evitar loop infinito.
                 redirect("/onboarding");
             }
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
