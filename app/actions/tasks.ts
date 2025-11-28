"use server";

import { createServerActionClient } from "@/lib/supabase";
import { redirect } from "next/navigation";

interface CreateTaskParams {
  title: string;
  description?: string;
  due_date?: string; // ISO string ou null
  workspace_id?: string | null; // null para tarefas pessoais
  status?: "todo" | "in_progress" | "done";
  priority?: "low" | "medium" | "high" | "urgent";
  is_personal?: boolean; // Para diferenciar Quick Add pessoal
}

export async function createTask(params: CreateTaskParams) {
  try {
    const supabase = await createServerActionClient();

    // Verificar autenticação
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error("Erro de autenticação:", authError);
      // Retornar erro em vez de redirecionar, pois server actions chamadas via client
      // não lidam bem com redirects dentro de try/catch se não forem tratadas
      return { success: false, error: "Usuário não autenticado" };
    }

    // Determinar se é tarefa pessoal
    const isPersonal = params.is_personal ?? (!params.workspace_id);

    // Criar tarefa
    const { data, error } = await supabase
      .from("tasks")
      .insert({
        title: params.title,
        description: params.description || null,
        due_date: params.due_date || null,
        workspace_id: params.workspace_id || null,
        status: params.status || "todo",
        priority: params.priority || "medium",
        is_personal: isPersonal,
        created_by: user.id, // Sempre definir o criador
        assignee_id: null, // Pode ser atribuído depois
      })
      .select()
      .single();

    if (error) {
      console.error("Erro ao criar tarefa:", error);
      // Se for erro de RLS/permissão, fornecer mensagem mais amigável
      if (
        error.code === "PGRST301" ||
        error.code === "42501" ||
        error.message.includes("permission") ||
        error.message.includes("policy") ||
        error.message.includes("RLS")
      ) {
        return {
          success: false,
          error:
            "Erro de permissão no banco de dados. Verifique as políticas RLS no Supabase.",
        };
      }
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Erro inesperado ao criar tarefa:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro desconhecido",
    };
  }
}

interface UpdateTaskPositionParams {
  taskId: string;
  newPosition: number;
  newStatus?: "todo" | "in_progress" | "done" | "archived";
}

/**
 * Atualiza a posição de uma tarefa (para drag & drop)
 * Também pode atualizar o status se a tarefa mudou de coluna no Kanban
 */
export async function updateTaskPosition(params: UpdateTaskPositionParams) {
  try {
    const supabase = await createServerActionClient();

    // Verificar autenticação
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error("Erro de autenticação:", authError);
      // Retornar erro em vez de redirecionar, pois server actions chamadas via client
      // não lidam bem com redirects dentro de try/catch se não forem tratadas
      return { success: false, error: "Usuário não autenticado" };
    }

    // Preparar dados de atualização
    const updateData: {
      position: number;
      status?: "todo" | "in_progress" | "done" | "archived";
    } = {
      position: params.newPosition,
    };

    // Se newStatus foi fornecido, atualizar também
    if (params.newStatus) {
      updateData.status = params.newStatus;
    }

    // Atualizar tarefa
    const { data, error } = await supabase
      .from("tasks")
      .update(updateData)
      .eq("id", params.taskId)
      .select()
      .single();

    if (error) {
      console.error("Erro ao atualizar posição da tarefa:", error);
      if (
        error.code === "PGRST301" ||
        error.code === "42501" ||
        error.message.includes("permission") ||
        error.message.includes("policy") ||
        error.message.includes("RLS")
      ) {
        return {
          success: false,
          error:
            "Erro de permissão no banco de dados. Verifique as políticas RLS no Supabase.",
        };
      }
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Erro inesperado ao atualizar posição da tarefa:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro desconhecido",
    };
  }
}
