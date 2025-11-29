"use server";

import { createServerActionClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { Database } from "@/types/database.types";

export type Task = Database["public"]["Tables"]["tasks"]["Row"];
export type TaskInsert = Database["public"]["Tables"]["tasks"]["Insert"];
export type TaskUpdate = Database["public"]["Tables"]["tasks"]["Update"];

// Tipo estendido com relacionamentos para facilitar o uso no frontend
export type TaskWithDetails = Task & {
  assignee: {
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
  } | null;
  creator: {
    full_name: string | null;
  } | null;
};

/**
 * Busca tarefas de um workspace ou pessoais
 */
export async function getTasks(filters?: { workspaceId?: string | null }) {
  const supabase = await createServerActionClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return [];

  let query = supabase
    .from("tasks")
    .select(`
      *,
      assignee:assignee_id (
        full_name,
        email,
        avatar_url
      ),
      creator:created_by (
        full_name
      )
    `)
    .order("position", { ascending: true })
    .order("created_at", { ascending: false });

  if (filters?.workspaceId) {
    // Tarefas do Workspace
    query = query.eq("workspace_id", filters.workspaceId);
  } else if (filters?.workspaceId === null) {
    // Tarefas Pessoais (sem workspace e criadas pelo usuário)
    query = query.is("workspace_id", null).eq("created_by", user.id);
  } else {
      // Se não especificado, busca todas as tarefas que o usuário tem acesso
      // (RLS já filtra, mas podemos ser explícitos se necessário)
  }

  const { data, error } = await query;

  if (error) {
    console.error("Erro ao buscar tarefas:", error);
    return [];
  }

  return data as unknown as TaskWithDetails[];
}

/**
 * Busca tarefas da semana atual
 */
export async function getWeekTasks() {
  const supabase = await createServerActionClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return [];

  // Calcular o intervalo da semana
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 (Domingo) a 6 (Sábado)
  
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - dayOfWeek);
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(today);
  endOfWeek.setDate(today.getDate() + (6 - dayOfWeek));
  endOfWeek.setHours(23, 59, 59, 999);

  const { data, error } = await supabase
    .from("tasks")
    .select(`
      *,
      assignee:assignee_id (
        full_name,
        email,
        avatar_url
      ),
      creator:created_by (
        full_name
      )
    `)
    .gte("due_date", startOfWeek.toISOString())
    .lte("due_date", endOfWeek.toISOString())
    .order("due_date", { ascending: true });

  if (error) {
    console.error("Erro ao buscar tarefas da semana:", error);
    return [];
  }

  return data as unknown as TaskWithDetails[];
}

/**
 * Busca uma tarefa pelo ID
 */
export async function getTaskById(id: string) {
  const supabase = await createServerActionClient();

  const { data, error } = await supabase
    .from("tasks")
    .select(`
      *,
      assignee:assignee_id (
        full_name,
        email,
        avatar_url
      ),
      creator:created_by (
        full_name
      ),
      workspace:workspace_id (
        name
      )
    `)
    .eq("id", id)
    .single();

  if (error) {
    console.error("Erro ao buscar tarefa:", error);
    return null;
  }

  // Mapear para incluir workspace_name se existir
  const task = data as any;
  return {
      ...task,
      assignee_name: task.assignee?.full_name || task.assignee?.email,
      assignee_avatar: task.assignee?.avatar_url,
      workspace_name: task.workspace?.name
  };
}

/**
 * Cria uma nova tarefa
 */
export async function createTask(data: {
  title: string;
  workspace_id?: string | null;
  status?: "todo" | "in_progress" | "done" | "archived";
  priority?: "low" | "medium" | "high" | "urgent";
  assignee_id?: string | null;
  due_date?: string | null;
  description?: string;
  is_personal?: boolean;
  origin_context?: any;
}) {
  const supabase = await createServerActionClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "Usuário não autenticado" };

  // Define se é pessoal ou de workspace
  const is_personal = data.is_personal ?? (!data.workspace_id);

  const { data: newTask, error } = await supabase.from("tasks").insert({
    title: data.title,
    description: data.description || null,
    workspace_id: data.workspace_id || null,
    is_personal,
    created_by: user.id,
    status: data.status || "todo",
    priority: data.priority || "medium",
    assignee_id: data.assignee_id || null,
    due_date: data.due_date || null,
    origin_context: data.origin_context || null,
    // position será auto-gerado ou podemos calcular aqui se necessário
  }).select().single();

  if (error) {
    console.error("Erro ao criar tarefa:", error);
    
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
  revalidatePath("/home"); 
  return { success: true, data: newTask };
}

/**
 * Atualiza uma tarefa (Status, Detalhes, Posição)
 */
export async function updateTask(params: Partial<TaskUpdate> & { id: string }) {
  const supabase = await createServerActionClient();
  const { id, ...updates } = params;

  const { data, error } = await supabase
    .from("tasks")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Erro ao atualizar tarefa:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/tasks");
  revalidatePath("/home");
  return { success: true, data };
}

interface UpdateTaskPositionParams {
  taskId: string;
  newPosition: number;
  newStatus?: "todo" | "in_progress" | "done" | "archived";
  assignee_id?: string | null;
  priority?: "low" | "medium" | "high" | "urgent";
  status?: "todo" | "in_progress" | "done" | "archived";
}

/**
 * Atualiza a posição de uma tarefa (para drag & drop)
 */
export async function updateTaskPosition(params: UpdateTaskPositionParams) {
    const supabase = await createServerActionClient();
    
    // Preparar objeto de update
    const updates: any = { position: params.newPosition };
    if (params.newStatus) updates.status = params.newStatus;
    if (params.status) updates.status = params.status;
    if (params.priority) updates.priority = params.priority;
    if (params.assignee_id !== undefined) updates.assignee_id = params.assignee_id;

    const { data, error } = await supabase
        .from("tasks")
        .update(updates)
        .eq("id", params.taskId)
        .select()
        .single();

    if (error) {
        console.error("Erro ao atualizar posição:", error);
        return { success: false, error: error.message };
    }

    revalidatePath("/tasks");
    return { success: true, data };
}

/**
 * Deleta uma tarefa
 */
export async function deleteTask(id: string) {
  const supabase = await createServerActionClient();

  const { error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Erro ao deletar tarefa:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/tasks");
  revalidatePath("/home");
  return { success: true };
}

/**
 * Busca comentários de uma tarefa
 */
export async function getTaskComments(taskId: string) {
    const supabase = await createServerActionClient();

    const { data, error } = await supabase
        .from("task_comments")
        .select(`
            *,
            user:user_id (
                full_name,
                avatar_url
            )
        `)
        .eq("task_id", taskId)
        .order("created_at", { ascending: true });

    if (error) {
        console.error("Erro ao buscar comentários:", error);
        return [];
    }

    return data.map((comment: any) => ({
        ...comment,
        user_name: comment.user?.full_name || "Usuário",
        user_avatar: comment.user?.avatar_url
    }));
}

/**
 * Busca anexos de uma tarefa
 */
export async function getTaskAttachments(taskId: string) {
    const supabase = await createServerActionClient();

    const { data, error } = await supabase
        .from("task_attachments")
        .select("*")
        .eq("task_id", taskId)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Erro ao buscar anexos:", error);
        return [];
    }

    return data;
}

/**
 * Busca membros do workspace
 */
export async function getWorkspaceMembers(workspaceId: string | null) {
    const supabase = await createServerActionClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return [];

    if (!workspaceId) {
        // Se não tem workspace (tarefa pessoal), retorna apenas o próprio usuário
        const { data: profile } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .single();
            
        return profile ? [profile] : [];
    }

    // Busca membros do workspace
    const { data, error } = await supabase
        .from("workspace_members")
        .select(`
            user:user_id (
                id,
                full_name,
                email,
                avatar_url
            )
        `)
        .eq("workspace_id", workspaceId);

    if (error) {
        console.error("Erro ao buscar membros:", error);
        return [];
    }

    return data.map((member: any) => member.user).filter(Boolean);
}
