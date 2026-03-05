"use server";

import { createServerActionClient } from "@/lib/supabase/server";
import { createNotification } from "@/lib/actions/notifications";
import { NotificationCategory, NotificationMetadata } from "@/types/database.types";
import { stripHtmlTags } from "@/lib/utils/strip-html";

const MENTION_REGEX = /@([a-zA-Z0-9._-]{3,})/g;

/**
 * Extrai chaves de menção (`@username`) de um texto.
 * Formato atual suportado: @parte-local-do-email (antes do @).
 */
function extractMentionKeys(text: string | null | undefined): string[] {
  if (!text) return [];

  const keys = new Set<string>();
  let match: RegExpExecArray | null;

  while ((match = MENTION_REGEX.exec(text)) !== null) {
    const key = match[1]?.toLowerCase();
    if (key) {
      keys.add(key);
    }
  }

  return Array.from(keys);
}

interface MentionRecipient {
  id: string;
  name: string | null;
  email: string | null;
}

/**
 * Resolve menções (@chave) apenas para membros do workspace atual.
 * workspaceId é obrigatório: tarefas sem workspace (pessoais) não resolvem menções.
 */
async function resolveMentionRecipients(
  mentionKeys: string[],
  workspaceId: string | null,
  authorId: string
): Promise<MentionRecipient[]> {
  if (mentionKeys.length === 0 || !workspaceId) {
    return [];
  }

  const supabase = await createServerActionClient();
  const recipientsMap = new Map<string, MentionRecipient>();

  // Uma única query: membros do workspace com perfil (JOIN), isolamento por design
  const { data: members, error: membersError } = await supabase
    .from("workspace_members")
    .select(
      `
      user_id,
      profiles!inner (
        id,
        full_name,
        email
      )
    `
    )
    .eq("workspace_id", workspaceId);

  if (membersError) {
    console.error("[mentions] Erro ao buscar membros do workspace:", {
      workspaceId,
      error: membersError,
    });
    return [];
  }

  if (!members?.length) {
    return [];
  }

  // Normalizar: Supabase pode retornar profiles como objeto ou array dependendo da relação
  const profilesList = members
    .map((m: { user_id: string; profiles: { id: string; full_name: string | null; email: string | null } | { id: string; full_name: string | null; email: string | null }[] }) => {
      const p = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
      return p ? { id: p.id, full_name: p.full_name, email: p.email } : null;
    })
    .filter(Boolean) as { id: string; full_name: string | null; email: string | null }[];

  for (const rawKey of mentionKeys) {
    const key = rawKey.toLowerCase();
    const emailPrefix = `${key}@`;

    for (const profile of profilesList) {
      const email = profile.email?.toLowerCase() ?? "";
      if (!email.startsWith(emailPrefix)) {
        continue;
      }
      if (profile.id === authorId) {
        continue;
      }
      if (!recipientsMap.has(profile.id)) {
        recipientsMap.set(profile.id, {
          id: profile.id,
          name: profile.full_name,
          email: profile.email,
        });
      }
    }
  }

  return Array.from(recipientsMap.values());
}

export async function createMentionNotificationsForTaskText(params: {
  taskId: string;
  text: string | null | undefined;
  mentionType: "comment" | "description";
  commentId?: string;
  authorId: string;
}): Promise<void> {
  const { taskId, text, mentionType, commentId, authorId } = params;

  const mentionKeys = extractMentionKeys(text);
  if (mentionKeys.length === 0) {
    return;
  }

  const supabase = await createServerActionClient();

  // Buscar tarefa para obter título e workspace
  const { data: task, error: taskError } = await supabase
    .from("tasks")
    .select("id, title, workspace_id")
    .eq("id", taskId)
    .single();

  if (taskError || !task) {
    console.error("[mentions] Não foi possível buscar tarefa para menções:", {
      taskId,
      error: taskError,
    });
    return;
  }

  // Buscar nome do autor para montar o título da notificação
  const { data: authorProfile } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", authorId)
    .single();

  const actorName =
    authorProfile?.full_name ||
    authorProfile?.email ||
    "Alguém";

  const recipients = await resolveMentionRecipients(
    mentionKeys,
    task.workspace_id,
    authorId
  );

  if (recipients.length === 0) {
    return;
  }

  const category: NotificationCategory = "operational";

  const baseTitle =
    mentionType === "comment"
      ? `${actorName} mencionou você em um comentário`
      : `${actorName} mencionou você na descrição de "${task.title}"`;

  const plainText = typeof text === "string" ? stripHtmlTags(text) : "";
  const trimmedContent =
    plainText.length > 0
      ? plainText.length > 200
        ? `${plainText.slice(0, 197)}...`
        : plainText
      : null;

  const metadataBase: NotificationMetadata = {
    task_title: task.title,
    workspace_id: task.workspace_id || undefined,
    mention_type: mentionType,
    task_id: task.id,
    ...(commentId ? { comment_id: commentId } : {}),
  };

  await Promise.all(
    recipients.map(async (recipient) => {
      const result = await createNotification({
        recipientId: recipient.id,
        triggeringUserId: authorId,
        category,
        resourceType: mentionType === "comment" ? "task_comment" : "task",
        resourceId: mentionType === "comment" ? (commentId || task.id) : task.id,
        title: baseTitle,
        content: trimmedContent || undefined,
        actionUrl: `/tasks?task=${task.id}`,
        workspaceId: task.workspace_id || undefined,
        metadata: metadataBase,
      });

      if (!result.success) {
        console.error("[mentions] Erro ao criar notificação de menção:", {
          taskId: task.id,
          recipientId: recipient.id,
          error: result.error,
        });
      }
    })
  );
}

