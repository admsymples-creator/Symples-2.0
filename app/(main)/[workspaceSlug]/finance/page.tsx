import { redirect } from "next/navigation";
import { getWorkspaceIdBySlug } from "@/lib/actions/tasks";

interface PageProps {
  params: Promise<{ workspaceSlug: string }>;
}

/**
 * Server Component para redirecionar /[workspaceSlug]/finance para /finance
 * 
 * O Sidebar adiciona workspace prefix às rotas, mas finance está implementado
 * como rota global que obtém workspace do contexto. Este componente apenas
 * valida o workspace e redireciona para a rota principal.
 */
export default async function WorkspaceFinancePage({ params }: PageProps) {
  const { workspaceSlug } = await params;

  // Validar se o workspace existe (segurança)
  const workspaceId = await getWorkspaceIdBySlug(workspaceSlug);

  // Redirecionar para a rota finance principal
  // A página finance já obtém workspace do contexto via getUserWorkspaces
  return redirect("/finance");
}

