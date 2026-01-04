import { notFound } from "next/navigation";
import { getTasksForWorkspace, getWorkspaceIdBySlug } from "@/lib/actions/tasks";
import { getGroupsForWorkspace } from "@/lib/group-actions";
import TasksPage from "../../tasks/tasks-page-client";

interface PageProps {
  params: Promise<{ workspaceSlug: string }>;
  searchParams: Promise<{ tag?: string }>;
}

/**
 * Server Component para a taskboard "normal" por workspace.
 *
 * ✅ RESPONSABILIDADE: Buscar dados no servidor antes de renderizar
 * ✅ FLUXO: Obter workspaceId → Fetch Tarefas FILTRADAS → Passar para Cliente
 * ✅ SEGURANÇA: Se o slug for inválido, retorna 404
 */
export default async function WorkspaceTasksPage({ params, searchParams }: PageProps) {
  const { workspaceSlug } = await params;
  const { tag } = await searchParams;

  // 1. OBTENÇÃO E VALIDAÇÃO DO ID
  const workspaceId = await getWorkspaceIdBySlug(workspaceSlug);

  if (!workspaceId) {
    // Trava de segurança: Se o slug for inválido, não renderiza nada
    return notFound();
  }

  // ✅ Decodificar tag se presente (pode vir encoded da URL)
  const decodedTag = tag ? decodeURIComponent(tag) : null;
  
  // Debug log (apenas em desenvolvimento)
  if (process.env.NODE_ENV === 'development' && decodedTag) {
    console.log('[WorkspaceTasksPage] Filtro de tag:', { original: tag, decoded: decodedTag, workspaceId });
  }

  // 2. BUSCA PARALELA DE DADOS FILTRADOS (tarefas + grupos)
  // ✅ Incluir filtro de tag se presente na URL
  const [initialTasks, initialGroups] = await Promise.all([
    getTasksForWorkspace(workspaceId, decodedTag),
    getGroupsForWorkspace(workspaceId),
  ]);
  
  // Debug log (apenas em desenvolvimento)
  if (process.env.NODE_ENV === 'development' && decodedTag) {
    console.log('[WorkspaceTasksPage] Tarefas filtradas:', { tag: decodedTag, count: initialTasks.length });
  }

  // O Client Component agora é PURO e recebe apenas os dados finais
  return (
    <TasksPage
      initialTasks={initialTasks}
      workspaceId={workspaceId}
      initialGroups={initialGroups}
    />
  );
}


