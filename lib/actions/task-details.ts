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
 * Interface para dados básicos da tarefa (carregamento rápido)
 */
export interface TaskBasicDetails {
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
}

/**
 * Interface para dados estendidos da tarefa (carregamento sob demanda)
 */
export interface TaskExtendedDetails {
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
  subtasks?: {
    id: string;
    title: string;
    completed: boolean;
    assignee?: { name: string; avatar?: string };
  }[];
}

/**
 * Busca apenas os dados básicos da tarefa (rápido)
 * Retorna: id, title, description, status, priority, due_date, assignee, tags
 */
export async function getTaskBasicDetails(taskId: string): Promise<TaskBasicDetails | null> {
  const supabase = await createServerActionClient();

  // Verificar autenticação
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Buscar apenas dados básicos da tarefa
  const { data: task, error: taskError } = await supabase
    .from("tasks")
    .select(`
      id,
      title,
      description,
      status,
      priority,
      due_date,
      assignee_id,
      workspace_id,
      created_by,
      created_at,
      updated_at,
      origin_context,
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
    .single();

  if (taskError || !task) {
    console.error("Erro ao buscar tarefa básica:", taskError);
    return null;
  }

  // Extrair tags do origin_context se existir
  let tags: string[] = [];
  if (task.origin_context && typeof task.origin_context === 'object' && 'tags' in task.origin_context) {
    const contextTags = (task.origin_context as any).tags;
    if (Array.isArray(contextTags)) {
      tags = contextTags;
    }
  }

  return {
    id: task.id,
    title: task.title,
    description: task.description,
    status: (task.status as "todo" | "in_progress" | "done" | "archived") || "todo",
    priority: (task.priority as "low" | "medium" | "high" | "urgent") || "medium",
    due_date: task.due_date,
    assignee_id: task.assignee_id,
    workspace_id: task.workspace_id,
    created_by: task.created_by || user.id,
    created_at: task.created_at || new Date().toISOString(),
    updated_at: task.updated_at || new Date().toISOString(),
    origin_context: task.origin_context,
    tags: tags,
    assignee: task.assignee,
    creator: task.creator,
    workspace: task.workspace,
  };
}

/**
 * Busca dados estendidos da tarefa (anexos, comentários, subtarefas)
 * Com paginação de comentários para otimização
 */
export async function getTaskExtendedDetails(
  taskId: string,
  commentsLimit: number = 50,
  commentsOffset: number = 0
): Promise<TaskExtendedDetails | null> {
  const supabase = await createServerActionClient();

  // Verificar autenticação
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Buscar dados estendidos em paralelo
  const [attachmentsResult, commentsResult] = await Promise.all([
    // Buscar anexos (apenas metadados, sem carregar arquivos)
    supabase
      .from("task_attachments")
      .select("id, file_url, file_name, file_type, file_size, uploader_id, created_at")
      .eq("task_id", taskId)
      .order("created_at", { ascending: false }),

    // Buscar comentários com paginação
    supabase
      .from("task_comments")
      .select(`
        id,
        content,
        type,
        metadata,
        created_at,
        user:user_id (
          id,
          full_name,
          email,
          avatar_url
        )
      `)
      .eq("task_id", taskId)
      .order("created_at", { ascending: true })
      .range(commentsOffset, commentsOffset + commentsLimit - 1)
  ]);

  const { data: attachments, error: attachmentsError } = attachmentsResult;
  const { data: comments, error: commentsError } = commentsResult;

  if (attachmentsError) {
    console.error("Erro ao buscar anexos:", attachmentsError);
  }

  if (commentsError) {
    console.error("Erro ao buscar comentários:", commentsError);
  }

  // Buscar subtarefas da tarefa (se existirem no origin_context ou em campo separado)
  const { data: task } = await supabase
    .from("tasks")
    .select("subtasks")
    .eq("id", taskId)
    .single();

  return {
    attachments: (attachments || []).map(att => ({
      ...att,
      created_at: att.created_at || new Date().toISOString(),
    })),
    comments: (comments || []).map(comment => ({
      ...comment,
      created_at: comment.created_at || new Date().toISOString(),
    })),
    subtasks: (task as any)?.subtasks || [],
  };
}

/**
 * Busca detalhes completos de uma tarefa com todos os relacionamentos
 * Mantida para compatibilidade com código existente
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
 * Atualiza um campo específico da tarefa e cria log de atividade
 */
export async function updateTaskField(
  taskId: string,
  field: string,
  value: any,
  options?: {
    skipLog?: boolean;
    logContent?: string;
    oldValue?: any;
  }
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerActionClient();
  
  // Verificar autenticação para criar log
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Usuário não autenticado" };
  }

  console.log(`Atualizando tarefa ${taskId}, campo ${field}, valor:`, JSON.stringify(value));

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

  // Buscar valor antigo para criar log
  let oldValue: any = options?.oldValue;
  if (!oldValue && !options?.skipLog) {
    const { data: currentTask } = await supabase
      .from("tasks")
      .select(field)
      .eq("id", taskId)
      .single();
    
    if (currentTask) {
      oldValue = (currentTask as any)[field];
    }
  }

  // Converter valores especiais se necessário
  let updateValue = value;
  if (field === "due_date") {
    updateValue = value ? new Date(value).toISOString() : null;
  } else if (field === "assignee_id") {
    updateValue = value || null;
  } else if (field === "subtasks") {
    // Garantir que subtasks seja um array JSON válido
    if (Array.isArray(value)) {
      // Limpar qualquer propriedade não serializável e garantir estrutura correta
      updateValue = value.map((st: any) => ({
        id: st.id || `subtask-${Date.now()}-${Math.random()}`,
        title: st.title || "",
        completed: Boolean(st.completed),
        assignee: st.assignee ? {
          name: st.assignee.name || "",
          avatar: st.assignee.avatar || null
        } : undefined
      }));
    } else {
      updateValue = [];
    }
  }

  const { error } = await supabase
    .from("tasks")
    .update({ [field]: updateValue })
    .eq("id", taskId);

  if (error) {
    console.error(`Erro ao atualizar ${field}:`, error);
    return { success: false, error: error.message };
  }

  // Criar log de atividade se não foi pulado
  if (!options?.skipLog) {
    let logContent = options?.logContent;
    
    // Se não fornecido, gerar conteúdo do log baseado no campo
    if (!logContent) {
      const fieldLabels: Record<string, string> = {
        title: "título",
        description: "descrição",
        status: "status",
        priority: "prioridade",
        due_date: "data de vencimento",
        assignee_id: "responsável",
        tags: "tags",
        subtasks: "subtarefas"
      };
      
      const fieldLabel = fieldLabels[field] || field;
      
      if (field === "status") {
        const statusLabels: Record<string, string> = {
          "todo": "Não iniciada",
          "in_progress": "Em progresso",
          "review": "Em revisão",
          "correction": "Correção",
          "done": "Concluída",
          "archived": "Arquivada"
        };
        const oldStatusLabel = oldValue ? statusLabels[oldValue] || oldValue : "N/A";
        const newStatusLabel = updateValue ? statusLabels[updateValue] || updateValue : "N/A";
        logContent = `alterou o status de ${oldStatusLabel} para ${newStatusLabel}`;
      } else if (field === "priority") {
        const priorityLabels: Record<string, string> = {
          "low": "Baixa",
          "medium": "Média",
          "high": "Alta",
          "urgent": "Urgente"
        };
        const oldPriorityLabel = oldValue ? priorityLabels[oldValue] || oldValue : "N/A";
        const newPriorityLabel = updateValue ? priorityLabels[updateValue] || updateValue : "N/A";
        logContent = `alterou a prioridade de ${oldPriorityLabel} para ${newPriorityLabel}`;
      } else if (field === "assignee_id") {
        if (!oldValue && updateValue) {
          logContent = `atribuiu a tarefa`;
        } else if (oldValue && !updateValue) {
          logContent = `removeu a atribuição`;
        } else if (oldValue && updateValue && oldValue !== updateValue) {
          logContent = `alterou o responsável`;
        }
      } else if (field === "due_date") {
        const oldDate = oldValue ? new Date(oldValue).toLocaleDateString("pt-BR") : "sem data";
        const newDate = updateValue ? new Date(updateValue).toLocaleDateString("pt-BR") : "sem data";
        logContent = `alterou a data de vencimento de ${oldDate} para ${newDate}`;
      } else if (field === "subtasks") {
        const oldCount = Array.isArray(oldValue) ? oldValue.length : 0;
        const newCount = Array.isArray(updateValue) ? updateValue.length : 0;
        if (newCount > oldCount) {
          logContent = `adicionou ${newCount - oldCount} subtarefa(s)`;
        } else if (newCount < oldCount) {
          logContent = `removeu ${oldCount - newCount} subtarefa(s)`;
        } else {
          logContent = `atualizou as subtarefas`;
        }
      } else {
        logContent = `alterou o ${fieldLabel}`;
      }
    }

    if (logContent) {
      // Buscar informações do usuário para o log
      const { data: userProfile } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", user.id)
        .single();

      const userName = userProfile?.full_name || userProfile?.email || "Usuário";

      // Criar log em task_comments
      const { error: logError } = await supabase
        .from("task_comments")
        .insert({
          task_id: taskId,
          user_id: user.id,
          content: logContent,
          type: "log",
          metadata: {
            field,
            old_value: oldValue,
            new_value: updateValue,
            action: "field_updated"
          }
        });

      if (logError) {
        console.error("Erro ao criar log de atividade:", logError);
        // Não falhar a atualização se o log falhar, apenas logar o erro
      }
    }
  }

  console.log(`Sucesso ao atualizar ${field}`);
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
 * Nota: Logs são criados manualmente pelos handlers para ter mais detalhes
 */
export async function updateTaskSubtasks(
  taskId: string,
  subtasks: any[]
): Promise<{ success: boolean; error?: string }> {
  try {
    // Força a conversão para JSON puro para evitar problemas de serialização
    const subtasksJson = JSON.parse(JSON.stringify(subtasks));
    
    // Log para debug
    console.log("Atualizando subtasks (raw):", subtasks);
    console.log("Atualizando subtasks (json):", subtasksJson);
    
    // Pular log automático, pois os handlers criam logs mais detalhados
    return await updateTaskField(taskId, "subtasks", subtasksJson, { skipLog: true });
  } catch (error) {
    console.error("Erro ao preparar subtasks para update:", error);
    return { success: false, error: "Erro interno ao processar subtarefas" };
  }
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
          audio_url: publicUrl, // Manter compatibilidade com código que busca audio_url
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

/**
 * Atualiza a transcrição de um comentário de áudio
 */
export async function updateAudioTranscription(
  commentId: string,
  transcription: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createServerActionClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Usuário não autenticado" };
    }

    // Buscar o comentário atual para preservar o metadata existente
    const { data: comment, error: fetchError } = await supabase
      .from("task_comments")
      .select("metadata")
      .eq("id", commentId)
      .single();

    if (fetchError || !comment) {
      return { success: false, error: "Comentário não encontrado" };
    }

    // Atualizar o metadata com a transcrição
    const updatedMetadata = {
      ...(comment.metadata && typeof comment.metadata === 'object' ? comment.metadata : {}),
      transcription: transcription
    };

    const { error: updateError } = await supabase
      .from("task_comments")
      .update({ metadata: updatedMetadata })
      .eq("id", commentId);

    if (updateError) {
      console.error("Erro ao atualizar transcrição:", updateError);
      return { success: false, error: "Erro ao salvar transcrição" };
    }

    revalidatePath(`/tasks`);
    return { success: true };
  } catch (error) {
    console.error("Erro na action updateAudioTranscription:", error);
    return { success: false, error: "Erro interno no servidor" };
  }
}

/**
 * Gera um link de compartilhamento para a tarefa
 */
export async function generateTaskShareLink(
  taskId: string,
  type: "public" | "private"
): Promise<{ success: boolean; error?: string; shareToken?: string; shareLink?: string }> {
  try {
    const supabase = await createServerActionClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Usuário não autenticado" };
    }

    // Gerar token único para compartilhamento
    const shareToken = `${taskId}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    
    // Atualizar campos is_public e share_token na tabela tasks
    const updateData: any = {
      share_token: shareToken,
    };
    
    // Se for público, marcar is_public como true
    if (type === "public") {
      updateData.is_public = true;
    }

    const { error: updateError } = await supabase
      .from("tasks")
      .update(updateData)
      .eq("id", taskId);

    if (updateError) {
      console.error("Erro ao salvar token de compartilhamento:", updateError);
      return { success: false, error: "Erro ao gerar link de compartilhamento" };
    }

    // Gerar URL completa
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const shareLink = `${baseUrl}/tasks/share/${shareToken}`;

    return { success: true, shareToken, shareLink };
  } catch (error) {
    console.error("Erro ao gerar link de compartilhamento:", error);
    return { success: false, error: "Erro interno ao gerar link" };
  }
}

/**
 * Verifica um token de compartilhamento e retorna os dados da tarefa
 */
export async function verifyShareToken(
  shareToken: string
): Promise<{ success: boolean; error?: string; task?: TaskDetails; isPublic?: boolean }> {
  try {
    const supabase = await createServerActionClient();
    
    // Buscar tarefa pelo share_token
    const { data: task, error: taskError } = await supabase
      .from("tasks")
      .select("*")
      .eq("share_token", shareToken)
      .single();

    if (taskError || !task) {
      return { success: false, error: "Link de compartilhamento inválido ou expirado" };
    }

    // Verificar se é público ou privado
    // Nota: is_public pode não existir na tabela, usar share_token como indicador
    const isPublic = (task as any).is_public === true || false;
    
    // Se for privado, verificar se o usuário está autenticado e no workspace
    if (!isPublic) {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return { success: false, error: "Acesso restrito. Faça login para continuar." };
      }

      // Verificar se o usuário está no workspace da tarefa
      if (task.workspace_id) {
        const { data: membership, error: membershipError } = await supabase
          .from("workspace_members")
          .select("id")
          .eq("workspace_id", task.workspace_id)
          .eq("user_id", user.id)
          .single();

        if (membershipError || !membership) {
          return { success: false, error: "Você não tem permissão para acessar esta tarefa" };
        }
      }
    }

    // Buscar detalhes completos da tarefa
    const taskDetails = await getTaskDetails(task.id);
    
    if (!taskDetails) {
      return { success: false, error: "Erro ao carregar detalhes da tarefa" };
    }

    return { success: true, task: taskDetails, isPublic };
  } catch (error) {
    console.error("Erro ao verificar token de compartilhamento:", error);
    return { success: false, error: "Erro interno ao verificar link" };
  }
}
