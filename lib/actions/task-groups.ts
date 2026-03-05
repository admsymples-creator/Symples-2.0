"use server";

import { createServerActionClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createTaskGroup(
  name: string,
  workspaceId: string,
  color?: string
): Promise<{ success: boolean; error?: string; data?: any }> {
  const supabase = await createServerActionClient();

  const { data, error } = await (supabase as any)
    .from("task_groups")
    .insert({
      name,
      workspace_id: workspaceId,
      color: color || "#e5e7eb", // Cor padrão (cinza claro)
    })
    .select()
    .single();

  if (error) {
    console.error("Erro ao criar grupo:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/tasks");
  return { success: true, data };
}

export async function updateTaskGroup(
  groupId: string,
  data: { name?: string; color?: string }
): Promise<{ success: boolean; error?: string; data?: any }> {
  const supabase = await createServerActionClient();

  const { data: updatedGroup, error } = await (supabase as any)
    .from("task_groups")
    .update(data)
    .eq("id", groupId)
    .select()
    .single();

  if (error) {
    console.error("Erro ao atualizar grupo:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/tasks");
  return { success: true, data: updatedGroup };
}

export async function deleteTaskGroup(
  groupId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerActionClient();

  // Deletar grupo (as tarefas podem ser deletadas em cascata ou setadas como null dependendo da FK)
  // A FK em tasks é ON DELETE SET NULL, então as tarefas ficam órfãs.
  const { error } = await (supabase as any)
    .from("task_groups")
    .delete()
    .eq("id", groupId);

  if (error) {
    console.error("Erro ao deletar grupo:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/tasks");
  return { success: true };
}

export async function getTaskGroups(
  workspaceId: string | null
): Promise<{ success: boolean; data?: Array<{ id: string; name: string; color: string | null }>; error?: string }> {
  const supabase = await createServerActionClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Usuário não autenticado" };
  }

  let query = (supabase as any)
    .from("task_groups")
    .select("id, name, color")
    .order("name", { ascending: true });

  if (workspaceId) {
    query = query.eq("workspace_id", workspaceId);
  } else {
    // Para grupos pessoais, se houver uma lógica futura
    query = query.is("workspace_id", null);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Erro ao buscar grupos:", error);
    return { success: false, error: error.message };
  }

  return { success: true, data };
}

export async function reorderTaskGroup(
  groupId: string,
  direction: "up" | "down",
  workspaceId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerActionClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Usuário não autenticado" };
  }

  // Buscar todos os grupos do workspace ordenados por created_at
  const { data: groups, error: fetchError } = await (supabase as any)
    .from("task_groups")
    .select("id, name, created_at")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: true });

  if (fetchError || !groups || groups.length < 2) {
    return { success: false, error: "Erro ao buscar grupos ou não há grupos suficientes" };
  }

  // Encontrar índice do grupo atual
  const currentIndex = groups.findIndex((g: any) => g.id === groupId);
  if (currentIndex === -1) {
    return { success: false, error: "Grupo não encontrado" };
  }

  // Verificar limites
  if (direction === "up" && currentIndex === 0) {
    return { success: false, error: "Grupo já está no topo" };
  }
  if (direction === "down" && currentIndex === groups.length - 1) {
    return { success: false, error: "Grupo já está no final" };
  }

  // Calcular novo índice
  const newIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
  const targetGroup = groups[newIndex];

  // Trocar as posições usando created_at como referência
  const targetCreatedAt = new Date(targetGroup.created_at).getTime();
  const currentCreatedAt = new Date(groups[currentIndex].created_at).getTime();

  // Calcular novo timestamp (meio caminho entre o alvo e seu vizinho)
  let newTimestamp: number;
  if (direction === "up") {
    // Mover para cima: colocar antes do grupo alvo
    const prevGroup = groups[newIndex - 1];
    const prevCreatedAt = prevGroup ? new Date(prevGroup.created_at).getTime() : targetCreatedAt - 1000;
    newTimestamp = (prevCreatedAt + targetCreatedAt) / 2;
  } else {
    // Mover para baixo: colocar depois do grupo alvo
    const nextGroup = groups[newIndex + 1];
    const nextCreatedAt = nextGroup ? new Date(nextGroup.created_at).getTime() : targetCreatedAt + 1000;
    newTimestamp = (targetCreatedAt + nextCreatedAt) / 2;
  }

  // Atualizar created_at do grupo atual
  const { error: updateError } = await (supabase as any)
    .from("task_groups")
    .update({ created_at: new Date(newTimestamp).toISOString() })
    .eq("id", groupId);

  if (updateError) {
    console.error("Erro ao reordenar grupo:", updateError);
    return { success: false, error: updateError.message };
  }

  revalidatePath("/tasks");
  return { success: true };
}
