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
