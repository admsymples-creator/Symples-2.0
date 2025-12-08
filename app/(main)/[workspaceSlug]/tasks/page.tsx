import { notFound } from "next/navigation";
import { getTasksForWorkspace, getWorkspaceIdBySlug } from "@/lib/actions/tasks";
import { getGroupsForWorkspace } from "@/lib/group-actions";
import TasksPage from "../../tasks/page";

interface PageProps {
  params: Promise<{ workspaceSlug: string }>;
}

/**
 * Server Component para a taskboard "normal" por workspace.
 *
 * ✅ RESPONSABILIDADE: Buscar dados no servidor antes de renderizar
 * ✅ FLUXO: Obter workspaceId → Fetch Tarefas FILTRADAS → Passar para Cliente
 * ✅ SEGURANÇA: Se o slug for inválido, retorna 404
 */
export default async function WorkspaceTasksPage({ params }: PageProps) {
  const { workspaceSlug } = await params;

  // 1. OBTENÇÃO E VALIDAÇÃO DO ID
  const workspaceId = await getWorkspaceIdBySlug(workspaceSlug);

  if (!workspaceId) {
    // Trava de segurança: Se o slug for inválido, não renderiza nada
    return notFound();
  }

  // 2. BUSCA PARALELA DE DADOS FILTRADOS (tarefas + grupos)
  const [initialTasks, initialGroups] = await Promise.all([
    getTasksForWorkspace(workspaceId),
    getGroupsForWorkspace(workspaceId),
  ]);

  // O Client Component agora é PURO e recebe apenas os dados finais
  return (
    <TasksPage
      initialTasks={initialTasks}
      workspaceId={workspaceId}
      initialGroups={initialGroups}
    />
  );
}


