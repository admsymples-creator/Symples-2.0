"use server";

import { getTaskGroups } from "@/lib/actions/task-groups";

export interface WorkspaceGroup {
  id: string;
  name: string;
  color: string | null;
}

/**
 * Busca grupos de tarefas de um workspace específico.
 *
 * ✅ Trava de segurança: se workspaceId for inválido, retorna array vazio.
 * ✅ Usa a server action existente `getTaskGroups`.
 */
export async function getGroupsForWorkspace(
  workspaceId: string | null | undefined
): Promise<WorkspaceGroup[]> {
  if (!workspaceId) {
    return [];
  }

  const result = await getTaskGroups(workspaceId);

  if (!result.success || !result.data) {
    return [];
  }

  return result.data;
}




