"use server";

import { createServerActionClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * Adiciona um membro a uma tarefa
 */
export async function addTaskMember(
  taskId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerActionClient();

  // Verificar autenticação
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Usuário não autenticado" };
  }

  try {
    const { error } = await supabase
      .from("task_members")
      .insert({
        task_id: taskId,
        user_id: userId,
      });

    if (error) {
      // Se já existe, não é erro (idempotente)
      if (error.code === "23505") {
        return { success: true };
      }
      console.error("[addTaskMember] Erro ao adicionar membro:", error);
      return { success: false, error: error.message };
    }

    revalidatePath("/tasks");
    revalidatePath("/home");
    return { success: true };
  } catch (error: any) {
    console.error("[addTaskMember] Erro:", error);
    return { success: false, error: error.message || "Erro ao adicionar membro" };
  }
}

/**
 * Remove um membro de uma tarefa
 */
export async function removeTaskMember(
  taskId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerActionClient();

  // Verificar autenticação
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Usuário não autenticado" };
  }

  try {
    const { error } = await supabase
      .from("task_members")
      .delete()
      .eq("task_id", taskId)
      .eq("user_id", userId);

    if (error) {
      console.error("[removeTaskMember] Erro ao remover membro:", error);
      return { success: false, error: error.message };
    }

    revalidatePath("/tasks");
    revalidatePath("/home");
    return { success: true };
  } catch (error: any) {
    console.error("[removeTaskMember] Erro:", error);
    return { success: false, error: error.message || "Erro ao remover membro" };
  }
}

/**
 * Busca todos os membros de uma tarefa
 */
export async function getTaskMembers(
  taskId: string
): Promise<Array<{ id: string; name: string; avatar?: string }>> {
  const supabase = await createServerActionClient();

  // Verificar autenticação
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from("task_members")
      .select(`
        user:user_id (
          id,
          full_name,
          email,
          avatar_url
        )
      `)
      .eq("task_id", taskId);

    if (error) {
      console.error("[getTaskMembers] Erro ao buscar membros:", error);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    return (data as any[])
      .map((item: any) => item.user)
      .filter(Boolean)
      .map((user: any) => ({
        id: user.id,
        name: user.full_name || user.email || "Usuário",
        avatar: user.avatar_url || undefined,
      }));
  } catch (error: any) {
    console.error("[getTaskMembers] Erro:", error);
    return [];
  }
}

/**
 * Atualiza a lista completa de membros de uma tarefa
 * Útil para sincronização
 */
export async function updateTaskMembers(
  taskId: string,
  userIds: string[]
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerActionClient();

  // Verificar autenticação
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Usuário não autenticado" };
  }

  try {
    // Buscar membros atuais
    const { data: currentMembers, error: fetchError } = await supabase
      .from("task_members")
      .select("user_id")
      .eq("task_id", taskId);

    if (fetchError) {
      console.error("[updateTaskMembers] Erro ao buscar membros atuais:", fetchError);
      return { success: false, error: fetchError.message };
    }

    const currentUserIds = new Set((currentMembers || []).map((m: any) => m.user_id));
    const targetUserIds = new Set(userIds);

    // Membros para adicionar
    const toAdd = userIds.filter((id) => !currentUserIds.has(id));
    // Membros para remover
    const toRemove = Array.from(currentUserIds).filter((id) => !targetUserIds.has(id));

    // Adicionar novos membros
    if (toAdd.length > 0) {
      const { error: insertError } = await supabase
        .from("task_members")
        .insert(
          toAdd.map((userId) => ({
            task_id: taskId,
            user_id: userId,
          }))
        );

      if (insertError) {
        console.error("[updateTaskMembers] Erro ao adicionar membros:", insertError);
        return { success: false, error: insertError.message };
      }
    }

    // Remover membros
    if (toRemove.length > 0) {
      const { error: deleteError } = await supabase
        .from("task_members")
        .delete()
        .eq("task_id", taskId)
        .in("user_id", toRemove);

      if (deleteError) {
        console.error("[updateTaskMembers] Erro ao remover membros:", deleteError);
        return { success: false, error: deleteError.message };
      }
    }

    revalidatePath("/tasks");
    revalidatePath("/home");
    return { success: true };
  } catch (error: any) {
    console.error("[updateTaskMembers] Erro:", error);
    return { success: false, error: error.message || "Erro ao atualizar membros" };
  }
}

