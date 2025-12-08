import { getUserProfile, getUserWorkspaces } from "@/lib/actions/user";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";

/**
 * Layout para rotas administrativas (/app/(admin)/...)
 * 
 * ⚠️ SEGURANÇA: Esta página deve ser protegida por uma verificação de 
 * system_role === 'super_admin' no servidor antes de renderizar dados sensíveis.
 * Adicione middleware ou verificação de permissão antes de permitir acesso.
 */
export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    // Buscar usuário
    const user = await getUserProfile();
    
    if (!user) {
        redirect("/login");
    }

    // TODO: Adicionar verificação de system_role === 'super_admin' aqui
    // if (user.system_role !== 'super_admin') {
    //     redirect("/home");
    // }

    // Buscar workspaces (mesmo para admin, para manter estrutura do AppShell)
    const workspaces = await getUserWorkspaces();

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