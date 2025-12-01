"use server";

import { createServerActionClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * Interface para detalhes completos da tarefa
 */
export interface TaskDetails {
  id: string;
  title: string;
  description: string | null;
  status: "todo" | "in_progress" | "done" | "archived";
  priority: "low" | "medium" | "high" | "urgent";
  due_date: string | null;
  assignee_id: string | null;
  workspace_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  origin_context: any;
  tags?: string[];
  subtasks?: {
    id: string;
    title: string;
    completed: boolean;
    assignee?: { name: string; avatar?: string };
  }[];
  assignee: {
    id: string;
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
  } | null;
  creator: {
    id: string;
    full_name: string | null;
    email: string | null;
  } | null;
  workspace: {
    id: string;
    name: string;
  } | null;
  attachments: Array<{
    id: string;
    file_url: string;
    file_name: string;
    file_type: string | null;
    file_size: number | null;
    uploader_id: string | null;
    created_at: string | null;
  }>;
  comments: Array<{
    id: string;
    content: string;
    type: "comment" | "log" | "file" | "system" | "audio";
    metadata: any;
    created_at: string;
    user: {
      id: string;
      full_name: string | null;
      email: string | null;
      avatar_url: string | null;
    };
  }>;
}

/**
 * Busca detalhes completos de uma tarefa com todos os relacionamentos
 */
export async function getTaskDetails(taskId: string): Promise<TaskDetails | null> {
  const supabase = await createServerActionClient();

  // Verificar autenticação
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Buscar dados em paralelo
  const [taskResult, attachmentsResult, commentsResult] = await Promise.all([
    // Buscar tarefa com todos os relacionamentos
    supabase
      .from("tasks")
      .select(`
        *,
        assignee:profiles!tasks_assignee_id_fkey (
          id,
          full_name,
          email,
          avatar_url
        ),
        creator:profiles!tasks_created_by_fkey (
          id,
          full_name,
          email
        ),
        workspace:workspaces!tasks_workspace_id_fkey (
          id,
          name
        )
      `)
      .eq("id", taskId)
      .single(),

    // Buscar anexos
    supabase
      .from("task_attachments")
      .select("*")
      .eq("task_id", taskId)
      .order("created_at", { ascending: false }),

    // Buscar comentários
    supabase
      .from("task_comments")
      .select(`
        *,
        user:user_id (
          id,
          full_name,
          email,
          avatar_url
        )
      `)
      .eq("task_id", taskId)
      .order("created_at", { ascending: true })
  ]);

  const { data: task, error: taskError } = taskResult;
  const { data: attachments, error: attachmentsError } = attachmentsResult;
  const { data: comments, error: commentsError } = commentsResult;

  if (taskError || !task) {
    console.error("Erro ao buscar tarefa:", taskError);
    return null;
  }

  if (attachmentsError) {
    console.error("Erro ao buscar anexos:", attachmentsError);
  }

  if (commentsError) {
    console.error("Erro ao buscar comentários:", commentsError);
  }

  return {
    ...task,
    status: (task.status as "todo" | "in_progress" | "done" | "archived") || "todo",
    priority: (task.priority as "low" | "medium" | "high" | "urgent") || "medium",
    created_by: task.created_by || user.id,
    created_at: task.created_at || new Date().toISOString(),
    updated_at: task.updated_at || new Date().toISOString(),
    attachments: (attachments || []).map(att => ({
      ...att,
      created_at: att.created_at || new Date().toISOString(),
    })),
    comments: (comments || []).map(comment => ({
      ...comment,
      created_at: comment.created_at || new Date().toISOString(),
    })),
    tags: (task as any).tags || [],
    subtasks: (task as any).subtasks || [],
  };
}

/**
 * Adiciona um comentário (texto simples)
 */
export async function addComment(
  taskId: string,
  content: string,
  metadata: any = null,
  type: "comment" | "log" | "file" | "system" | "audio" = "comment"
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerActionClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { success: false, error: "Usuário não autenticado" };
  }

  // Converter tipo "audio" para "comment" já que o banco não aceita "audio"
  const commentType = type === "audio" ? "comment" : (type || "comment");
  
  const { error } = await supabase
    .from("task_comments")
    .insert({
      task_id: taskId,
      user_id: user.id,
      content,
      type: commentType as "comment" | "log" | "file" | "system",
      metadata,
    });

  if (error) {
    console.error("Erro ao adicionar comentário:", error);
    return { success: false, error: error.message };
  }

  revalidatePath(`/tasks`);
  return { success: true };
}

/**
 * Atualiza um campo específico da tarefa
 */
export async function updateTaskField(
  taskId: string,
  field: string,
  value: any
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerActionClient();
  
  // Validar campo permitido
  const allowedFields = [
    "title",
    "description",
    "status",
    "priority",
    "due_date",
    "assignee_id",
    "tags",
    "subtasks"
  ];

  if (!allowedFields.includes(field)) {
    return { success: false, error: `Campo '${field}' não é permitido` };
  }

  // Converter valores especiais se necessário
  let updateValue = value;
  if (field === "due_date") {
    updateValue = value ? new Date(value).toISOString() : null;
  } else if (field === "assignee_id") {
    updateValue = value || null;
  }

  const { error } = await supabase
    .from("tasks")
    .update({ [field]: updateValue })
    .eq("id", taskId);

  if (error) {
    console.error(`Erro ao atualizar ${field}:`, error);
    return { success: false, error: error.message };
  }

  revalidatePath(`/tasks`);
  return { success: true };
}

/**
 * Atualiza múltiplos campos da tarefa
 */
export async function updateTaskFields(
  taskId: string,
  fields: Record<string, any>
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerActionClient();
  
  // Validar campos permitidos
  const allowedFields = [
    "title",
    "description",
    "status",
    "priority",
    "due_date",
    "assignee_id",
    "tags",
    "subtasks"
  ];

  const updateData: any = {};

  for (const [field, value] of Object.entries(fields)) {
    if (!allowedFields.includes(field)) {
      continue;
    }

    if (field === "due_date") {
      updateData[field] = value ? new Date(value).toISOString() : null;
    } else if (field === "assignee_id") {
      updateData[field] = value || null;
    } else {
      updateData[field] = value;
    }
  }

  if (Object.keys(updateData).length === 0) {
    return { success: false, error: "Nenhum campo válido para atualizar" };
  }

  const { error } = await supabase
    .from("tasks")
    .update(updateData)
    .eq("id", taskId);

  if (error) {
    console.error("Erro ao atualizar campos da tarefa:", error);
    return { success: false, error: error.message };
  }

  revalidatePath(`/tasks`);
  return { success: true };
}

/**
 * Atualiza as tags da tarefa
 */
export async function updateTaskTags(
  taskId: string,
  tags: string[]
): Promise<{ success: boolean; error?: string }> {
  return updateTaskField(taskId, "tags", tags);
}

/**
 * Atualiza as subtarefas
 */
export async function updateTaskSubtasks(
  taskId: string,
  subtasks: any[]
): Promise<{ success: boolean; error?: string }> {
  return updateTaskField(taskId, "subtasks", subtasks);
}

/**
 * Upload de Áudio e criação de comentário
 */
export async function uploadAudioComment(
  taskId: string,
  formData: FormData
): Promise<{ success: boolean; error?: string; data?: any }> {
  try {
    const supabase = await createServerActionClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Usuário não autenticado" };
    }

    const audioFile = formData.get("audio") as Blob;
    const duration = Number(formData.get("duration") || 0);

    if (!audioFile) {
      return { success: false, error: "Arquivo de áudio não encontrado" };
    }

    // 1. Upload para o Storage
    const fileName = `audio_${Date.now()}_${Math.random().toString(36).substring(7)}.webm`;
    const filePath = `audio/${taskId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("task-files")
      .upload(filePath, audioFile, {
        contentType: "audio/webm",
        upsert: false,
      });

    if (uploadError) {
      console.error("Erro no upload do áudio:", uploadError);
      return { success: false, error: "Erro ao fazer upload do áudio" };
    }

    // 2. Obter URL pública
    const { data: { publicUrl } } = supabase.storage
      .from("task-files")
      .getPublicUrl(filePath);

    // 3. Criar comentário do tipo 'audio'
    const { data: comment, error: commentError } = await supabase
      .from("task_comments")
      .insert({
        task_id: taskId,
        user_id: user.id,
        content: "Mensagem de voz",
        type: "audio" as any, // TODO: Atualizar tipos do banco
        metadata: {
          url: publicUrl,
          duration: duration,
          file_path: filePath,
        },
      })
      .select()
      .single();

    if (commentError) {
      console.error("Erro ao salvar comentário de áudio:", commentError);
      return { success: false, error: "Erro ao salvar registro de áudio" };
    }

    revalidatePath(`/tasks`);
    return { success: true, data: comment };
  } catch (error) {
    console.error("Erro na action uploadAudioComment:", error);
    return { success: false, error: "Erro interno no servidor" };
  }
}
