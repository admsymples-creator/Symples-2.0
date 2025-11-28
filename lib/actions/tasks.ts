"use server";

import { createServerActionClient } from "@/lib/supabase";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

// Tipo baseado no schema do banco
export type TaskStatus = "todo" | "in_progress" | "done" | "archived";
export type TaskPriority = "low" | "medium" | "high" | "urgent";

export interface Task {
  id: string;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  position: number;
  due_date?: string | null;
  is_personal: boolean;
  workspace_id?: string | null;
  assignee_id?: string | null;
  created_by: string;
  origin_context?: any;
  created_at: string;
  updated_at: string;
}

export interface TaskFilters {
  workspaceId?: string | null;
  status?: TaskStatus;
  assigneeId?: string | null;
}

/**
 * Busca tarefas com filtros opcionais
 * @param filters - Filtros opcionais (workspaceId, status, assigneeId)
 * @returns Array de tarefas
 */
export async function getTasks(filters?: TaskFilters): Promise<Task[]> {
  try {
    const supabase = await createServerActionClient();

    // Verificar autenticação
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error("Erro de autenticação:", authError);
      // Para funções de fetch, retornamos array vazio para não quebrar a UI
      // O redirecionamento deve ser tratado no nível do componente/página ou middleware
      return [];
    }

    // Construir query base
    let query = supabase
      .from("tasks")
      .select("*")
      .order("position", { ascending: true })
      .order("created_at", { ascending: false });

    // Aplicar filtros
    if (filters?.workspaceId) {
      query = query.eq("workspace_id", filters.workspaceId);
    } else if (filters?.workspaceId === null) {
      // Filtrar apenas tarefas pessoais
      query = query.is("workspace_id", null).eq("is_personal", true);
    }

    if (filters?.status) {
      query = query.eq("status", filters.status);
    }

    if (filters?.assigneeId) {
      query = query.eq("assignee_id", filters.assigneeId);
    }

    const { data: tasks, error } = await query;

    if (error) {
      console.error("Erro ao buscar tarefas:", error);
      return [];
    }

    return (tasks || []) as Task[];
  } catch (error) {
    console.error("Erro inesperado ao buscar tarefas:", error);
    return [];
  }
}

/**
 * Busca tarefas da semana para o usuário autenticado
 * @param startDate - Data de início no formato ISO string
 * @param endDate - Data de fim no formato ISO string
 * @returns Array de tarefas tipado
 */
export async function getWeekTasks(
  startDate: string,
  endDate: string
): Promise<Task[]> {
  try {
    const supabase = await createServerActionClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error("Erro de autenticação:", authError);
      // Para funções de fetch, retornamos array vazio para não quebrar a UI
      // O redirecionamento deve ser tratado no nível do componente/página ou middleware
      return [];
    }

    const { data: tasks, error } = await supabase
      .from("tasks")
      .select("*")
      .gte("due_date", startDate)
      .lte("due_date", endDate)
      .order("due_date", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erro ao buscar tarefas:", error);
      return [];
    }

    return (tasks || []) as Task[];
  } catch (error) {
    console.error("Erro inesperado ao buscar tarefas:", error);
    return [];
  }
}

export interface CreateTaskParams {
  title: string;
  description?: string;
  workspace_id?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  due_date?: string | null;
  assignee_id?: string | null;
}

/**
 * Cria uma nova tarefa
 * @param params - Parâmetros da tarefa
 * @returns Tarefa criada ou erro
 */
export async function createTask(
  params: CreateTaskParams
): Promise<{ success: boolean; data?: Task; error?: string }> {
  try {
    const supabase = await createServerActionClient();

    // Verificar autenticação
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error("Erro de autenticação:", authError);
      return { success: false, error: "Usuário não autenticado" };
    }

    // Determinar se é tarefa pessoal
    const isPersonal = !params.workspace_id;

    // Buscar a maior posição atual para inserir no final
    let maxPosition = 0;
    if (params.workspace_id) {
      const { data: maxTask } = await supabase
        .from("tasks")
        .select("position")
        .eq("workspace_id", params.workspace_id)
        .order("position", { ascending: false })
        .limit(1)
        .single();

      if (maxTask?.position) {
        maxPosition = maxTask.position;
      }
    } else {
      // Para tarefas pessoais, buscar pelo created_by
      const { data: maxTask } = await supabase
        .from("tasks")
        .select("position")
        .is("workspace_id", null)
        .eq("is_personal", true)
        .eq("created_by", user.id)
        .order("position", { ascending: false })
        .limit(1)
        .single();

      if (maxTask?.position) {
        maxPosition = maxTask.position;
      }
    }

    // Nova posição: maior posição + 1000 (para ficar no final)
    const newPosition = maxPosition + 1000;

    // Criar tarefa
    const { data, error } = await supabase
      .from("tasks")
      .insert({
        title: params.title,
        description: params.description || null,
        workspace_id: params.workspace_id || null,
        status: params.status || "todo",
        priority: params.priority || "medium",
        position: newPosition,
        due_date: params.due_date || null,
        is_personal: isPersonal,
        created_by: user.id,
        assignee_id: params.assignee_id || null,
      })
      .select()
      .single();

    if (error) {
      console.error("Erro ao criar tarefa:", error);
      return {
        success: false,
        error: error.message,
      };
    }

    // Revalidar cache da página de tarefas
    revalidatePath("/tasks");

    return { success: true, data: data as Task };
  } catch (error) {
    console.error("Erro inesperado ao criar tarefa:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro desconhecido",
    };
  }
}

export interface UpdateTaskParams {
  id: string;
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  position?: number;
  due_date?: string | null;
  assignee_id?: string | null;
  is_complete?: boolean; // Helper: se true, seta status para 'done', se false, seta para 'todo'
}

/**
 * Atualiza uma tarefa (PATCH parcial)
 * @param params - Parâmetros de atualização
 * @returns Tarefa atualizada ou erro
 */
export async function updateTask(
  params: UpdateTaskParams
): Promise<{ success: boolean; data?: Task; error?: string }> {
  try {
    const supabase = await createServerActionClient();

    // Verificar autenticação
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error("Erro de autenticação:", authError);
      return { success: false, error: "Usuário não autenticado" };
    }

    // Preparar dados de atualização
    const updateData: any = {};

    if (params.title !== undefined) {
      updateData.title = params.title;
    }

    if (params.description !== undefined) {
      updateData.description = params.description;
    }

    if (params.status !== undefined) {
      updateData.status = params.status;
    }

    // Helper: is_complete sobrescreve status se fornecido
    if (params.is_complete !== undefined) {
      updateData.status = params.is_complete ? "done" : "todo";
    }

    if (params.priority !== undefined) {
      updateData.priority = params.priority;
    }

    if (params.position !== undefined) {
      updateData.position = params.position;
    }

    if (params.due_date !== undefined) {
      updateData.due_date = params.due_date;
    }

    if (params.assignee_id !== undefined) {
      updateData.assignee_id = params.assignee_id;
    }

    // Atualizar tarefa
    const { data, error } = await supabase
      .from("tasks")
      .update(updateData)
      .eq("id", params.id)
      .select()
      .single();

    if (error) {
      console.error("Erro ao atualizar tarefa:", error);
      return {
        success: false,
        error: error.message,
      };
    }

    // Revalidar cache da página de tarefas
    revalidatePath("/tasks");

    return { success: true, data: data as Task };
  } catch (error) {
    console.error("Erro inesperado ao atualizar tarefa:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro desconhecido",
    };
  }
}

/**
 * Deleta uma tarefa
 * @param id - ID da tarefa
 * @returns Sucesso ou erro
 */
export async function deleteTask(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createServerActionClient();

    // Verificar autenticação
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error("Erro de autenticação:", authError);
      return { success: false, error: "Usuário não autenticado" };
    }

    // Deletar tarefa
    const { error } = await supabase.from("tasks").delete().eq("id", id);

    if (error) {
      console.error("Erro ao deletar tarefa:", error);
      return {
        success: false,
        error: error.message,
      };
    }

    // Revalidar cache da página de tarefas
    revalidatePath("/tasks");

    return { success: true };
  } catch (error) {
    console.error("Erro inesperado ao deletar tarefa:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro desconhecido",
    };
  }
}

