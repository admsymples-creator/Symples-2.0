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
  // Campos adicionais de joins
  assignee_name?: string | null;
  assignee_avatar?: string | null;
  created_by_name?: string | null;
  workspace_name?: string | null;
}

export interface TaskComment {
  id: string;
  task_id: string;
  user_id: string;
  content: string;
  type: "comment" | "log" | "file" | "system";
  metadata?: any;
  created_at: string;
  user_name?: string | null;
  user_avatar?: string | null;
}

export interface TaskAttachment {
  id: string;
  task_id: string;
  file_url: string;
  file_type?: string | null;
  file_name: string;
  file_size?: number | null;
  uploader_id?: string | null;
  created_at: string;
  uploader_name?: string | null;
}

export interface WorkspaceMember {
  id: string;
  full_name?: string | null;
  avatar_url?: string | null;
  email: string;
  role: string;
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

    // Construir query base com joins
    let query = supabase
      .from("tasks")
      .select(`
        *,
        assignee:profiles!tasks_assignee_id_fkey(id, full_name, avatar_url),
        creator:profiles!tasks_created_by_fkey(id, full_name, avatar_url),
        workspace:workspaces!tasks_workspace_id_fkey(id, name)
      `)
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

    // Mapear dados com joins
    return (tasks || []).map((task: any) => ({
      ...task,
      assignee_name: task.assignee?.full_name || null,
      assignee_avatar: task.assignee?.avatar_url || null,
      created_by_name: task.creator?.full_name || null,
      workspace_name: task.workspace?.name || null,
    })) as Task[];
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

/**
 * Busca uma tarefa completa por ID com todos os relacionamentos
 * @param id - ID da tarefa
 * @returns Tarefa completa ou null
 */
export async function getTaskById(id: string): Promise<Task | null> {
  try {
    const supabase = await createServerActionClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error("Erro de autenticação:", authError);
      return null;
    }

    const { data: task, error } = await supabase
      .from("tasks")
      .select(`
        *,
        assignee:profiles!tasks_assignee_id_fkey(id, full_name, avatar_url),
        creator:profiles!tasks_created_by_fkey(id, full_name, avatar_url),
        workspace:workspaces!tasks_workspace_id_fkey(id, name)
      `)
      .eq("id", id)
      .single();

    if (error) {
      console.error("Erro ao buscar tarefa:", error);
      return null;
    }

    if (!task) {
      return null;
    }

    // Mapear dados com joins
    return {
      ...task,
      assignee_name: task.assignee?.full_name || null,
      assignee_avatar: task.assignee?.avatar_url || null,
      created_by_name: task.creator?.full_name || null,
      workspace_name: task.workspace?.name || null,
    } as Task;
  } catch (error) {
    console.error("Erro inesperado ao buscar tarefa:", error);
    return null;
  }
}

/**
 * Busca comentários de uma tarefa
 * @param taskId - ID da tarefa
 * @returns Array de comentários
 */
export async function getTaskComments(taskId: string): Promise<TaskComment[]> {
  try {
    const supabase = await createServerActionClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error("Erro de autenticação:", authError);
      return [];
    }

    const { data: comments, error } = await supabase
      .from("task_comments")
      .select(`
        *,
        user:profiles!task_comments_user_id_fkey(id, full_name, avatar_url)
      `)
      .eq("task_id", taskId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Erro ao buscar comentários:", error);
      return [];
    }

    return (comments || []).map((comment: any) => ({
      id: comment.id,
      task_id: comment.task_id,
      user_id: comment.user_id,
      content: comment.content,
      type: comment.type,
      metadata: comment.metadata,
      created_at: comment.created_at,
      user_name: comment.user?.full_name || null,
      user_avatar: comment.user?.avatar_url || null,
    })) as TaskComment[];
  } catch (error) {
    console.error("Erro inesperado ao buscar comentários:", error);
    return [];
  }
}

/**
 * Busca anexos de uma tarefa
 * @param taskId - ID da tarefa
 * @returns Array de anexos
 */
export async function getTaskAttachments(taskId: string): Promise<TaskAttachment[]> {
  try {
    const supabase = await createServerActionClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error("Erro de autenticação:", authError);
      return [];
    }

    const { data: attachments, error } = await supabase
      .from("task_attachments")
      .select(`
        *,
        uploader:profiles!task_attachments_uploader_id_fkey(id, full_name)
      `)
      .eq("task_id", taskId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erro ao buscar anexos:", error);
      return [];
    }

    return (attachments || []).map((attachment: any) => ({
      id: attachment.id,
      task_id: attachment.task_id,
      file_url: attachment.file_url,
      file_type: attachment.file_type,
      file_name: attachment.file_name,
      file_size: attachment.file_size,
      uploader_id: attachment.uploader_id,
      created_at: attachment.created_at,
      uploader_name: attachment.uploader?.full_name || null,
    })) as TaskAttachment[];
  } catch (error) {
    console.error("Erro inesperado ao buscar anexos:", error);
    return [];
  }
}

/**
 * Cria um comentário em uma tarefa
 * @param taskId - ID da tarefa
 * @param content - Conteúdo do comentário
 * @returns Comentário criado ou erro
 */
export async function createTaskComment(
  taskId: string,
  content: string
): Promise<{ success: boolean; data?: TaskComment; error?: string }> {
  try {
    const supabase = await createServerActionClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error("Erro de autenticação:", authError);
      return { success: false, error: "Usuário não autenticado" };
    }

    const { data, error } = await supabase
      .from("task_comments")
      .insert({
        task_id: taskId,
        user_id: user.id,
        content: content.trim(),
        type: "comment",
      })
      .select(`
        *,
        user:profiles!task_comments_user_id_fkey(id, full_name, avatar_url)
      `)
      .single();

    if (error) {
      console.error("Erro ao criar comentário:", error);
      return {
        success: false,
        error: error.message,
      };
    }

    const comment: TaskComment = {
      id: data.id,
      task_id: data.task_id,
      user_id: data.user_id,
      content: data.content,
      type: data.type,
      metadata: data.metadata,
      created_at: data.created_at || new Date().toISOString(),
      user_name: data.user?.full_name || null,
      user_avatar: data.user?.avatar_url || null,
    };

    revalidatePath("/tasks");

    return { success: true, data: comment };
  } catch (error) {
    console.error("Erro inesperado ao criar comentário:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro desconhecido",
    };
  }
}

/**
 * Busca membros de um workspace para atribuição de tarefas
 * @param workspaceId - ID do workspace (null para tarefas pessoais)
 * @returns Array de membros do workspace
 */
export async function getWorkspaceMembers(
  workspaceId: string | null
): Promise<WorkspaceMember[]> {
  try {
    const supabase = await createServerActionClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error("Erro de autenticação:", authError);
      return [];
    }

    // Se não há workspace, retornar apenas o usuário atual
    if (!workspaceId) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, email")
        .eq("id", user.id)
        .single();

      if (!profile) {
        return [];
      }

      return [
        {
          id: profile.id,
          full_name: profile.full_name,
          avatar_url: profile.avatar_url,
          email: profile.email || "",
          role: "owner",
        },
      ];
    }

    // Buscar membros do workspace
    const { data: members, error } = await supabase
      .from("workspace_members")
      .select(`
        role,
        user:profiles!workspace_members_user_id_fkey(id, full_name, avatar_url, email)
      `)
      .eq("workspace_id", workspaceId);

    if (error) {
      console.error("Erro ao buscar membros do workspace:", error);
      return [];
    }

    return (members || [])
      .map((member: any): WorkspaceMember | null => {
        if (!member.user?.id || !member.user?.email) return null;
        return {
          id: member.user.id,
          full_name: member.user.full_name || null,
          avatar_url: member.user.avatar_url || null,
          email: member.user.email,
          role: member.role || "member",
        };
      })
      .filter((m): m is WorkspaceMember => m !== null);
  } catch (error) {
    console.error("Erro inesperado ao buscar membros:", error);
    return [];
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
export async function updateTaskPosition(
  params: UpdateTaskPositionParams
): Promise<{ success: boolean; data?: Task; error?: string }> {
  try {
    const supabase = await createServerActionClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error("Erro de autenticação:", authError);
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

    revalidatePath("/tasks");

    return { success: true, data: data as Task };
  } catch (error) {
    console.error("Erro inesperado ao atualizar posição da tarefa:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro desconhecido",
    };
  }
}

