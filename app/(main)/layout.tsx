import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { getUserProfile, getUserWorkspaces } from "@/lib/actions/user";
import { redirect } from "next/navigation";

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
        <div className="flex min-h-screen bg-gray-50">
            <Sidebar workspaces={workspaces} />
            <div className="flex-1 flex flex-col overflow-hidden">
                <Header user={uiUser} />
                <main className="flex-1 overflow-auto">
                    {children}
                </main>
            </div>
        </div>
    )
}
