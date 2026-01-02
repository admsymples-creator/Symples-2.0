"use server";

import { createServerActionClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { NotificationCategory, NotificationMetadata } from "@/types/database.types";

export interface Notification {
  id: string;
  recipient_id: string;
  triggering_user_id: string | null;
  category: NotificationCategory;
  resource_type: string;
  resource_id: string | null;
  title: string;
  content: string | null;
  action_url: string | null;
  metadata: NotificationMetadata;
  read_at: string | null;
  created_at: string;
}

export interface NotificationWithActor extends Notification {
  triggering_user?: {
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

/**
 * Busca notificações do usuário atual
 */
export async function getNotifications(
  filters?: {
    category?: NotificationCategory;
    unreadOnly?: boolean;
    limit?: number;
  }
): Promise<NotificationWithActor[]> {
  const supabase = await createServerActionClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  // Primeiro, buscar as notificações
  let query = supabase
    .from("notifications")
    .select("*")
    .eq("recipient_id", user.id)
    .order("created_at", { ascending: false })
    .limit(filters?.limit || 20);

  if (filters?.category) {
    query = query.eq("category", filters.category);
  }

  if (filters?.unreadOnly) {
    query = query.is("read_at", null);
  }

  const { data: notifications, error } = await query;

  if (error) {
    console.error("Error fetching notifications:", error);
    return [];
  }

  if (!notifications || notifications.length === 0) {
    return [];
  }

  // Buscar dados dos usuários que dispararam as notificações
  const triggeringUserIds = notifications
    .map(n => n.triggering_user_id)
    .filter((id): id is string => id !== null);

  let usersData: Record<string, { full_name: string | null; avatar_url: string | null }> = {};

  if (triggeringUserIds.length > 0) {
    const { data: users } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url")
      .in("id", triggeringUserIds);

    if (users) {
      usersData = users.reduce((acc, user) => {
        acc[user.id] = {
          full_name: user.full_name,
          avatar_url: user.avatar_url,
        };
        return acc;
      }, {} as Record<string, { full_name: string | null; avatar_url: string | null }>);
    }
  }

  // Buscar workspace_id das tarefas relacionadas (quando resource_type === 'task')
  const taskNotifications = notifications.filter(n => n.resource_type === 'task' && n.resource_id);
  const taskIds = taskNotifications.map(n => n.resource_id).filter((id): id is string => id !== null);
  
  let taskWorkspaceMap: Record<string, string | null> = {};
  
  if (taskIds.length > 0) {
    const { data: tasks } = await supabase
      .from("tasks")
      .select("id, workspace_id")
      .in("id", taskIds);
    
    if (tasks) {
      taskWorkspaceMap = tasks.reduce((acc, task) => {
        acc[task.id] = task.workspace_id;
        return acc;
      }, {} as Record<string, string | null>);
    }
  }

  // Combinar notificações com dados dos usuários e workspace_id
  const result = notifications.map((notification) => {
    const workspaceId = notification.resource_type === 'task' && notification.resource_id
      ? taskWorkspaceMap[notification.resource_id] || null
      : null;
    
    // Adicionar workspace_id ao metadata se disponível (criar novo objeto para não mutar)
    const existingMetadata = (notification.metadata as any) || {};
    const metadata = workspaceId && !existingMetadata.workspace_id
      ? { ...existingMetadata, workspace_id: workspaceId }
      : existingMetadata;
    
    return {
      ...notification,
      metadata,
      triggering_user: notification.triggering_user_id
        ? usersData[notification.triggering_user_id] || null
        : null,
    };
  }) as NotificationWithActor[];
  return result;
}

/**
 * Marca uma notificação como lida
 */
export async function markAsRead(notificationId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerActionClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Não autenticado" };
  }

  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("recipient_id", user.id);

  if (error) {
    console.error("Error marking notification as read:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/");
  return { success: true };
}

/**
 * Marca todas as notificações do usuário como lidas
 */
export async function markAllAsRead(): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerActionClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Não autenticado" };
  }

  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("recipient_id", user.id)
    .is("read_at", null);

  if (error) {
    console.error("Error marking all notifications as read:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/");
  return { success: true };
}

/**
 * Cria uma notificação (utilitário para ser usado por outros fluxos)
 */
export async function createNotification(params: {
  recipientId: string;
  triggeringUserId?: string;
  category: NotificationCategory;
  resourceType: string;
  resourceId?: string;
  title: string;
  content?: string;
  actionUrl?: string;
  metadata?: NotificationMetadata;
}): Promise<{ success: boolean; error?: string; id?: string }> {
  const supabase = await createServerActionClient();

  const { data, error } = await supabase
    .from("notifications")
    .insert({
      recipient_id: params.recipientId,
      triggering_user_id: params.triggeringUserId || null,
      category: params.category,
      resource_type: params.resourceType,
      resource_id: params.resourceId || null,
      title: params.title,
      content: params.content || null,
      action_url: params.actionUrl || null,
      metadata: params.metadata || {},
    })
    .select("id")
    .single();

  if (error) {
    console.error("Error creating notification:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/");
  return { success: true, id: data.id };
}

/**
 * Conta notificações não lidas
 */
export async function getUnreadCount(): Promise<number> {
  const supabase = await createServerActionClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return 0;
  }

  const { count, error } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("recipient_id", user.id)
    .is("read_at", null);

  if (error) {
    console.error("Error counting unread notifications:", error);
    return 0;
  }

  return count || 0;
}

/**
 * Cria notificações de teste para o usuário atual
 * Útil para testar o sistema sem precisar de outra conta
 */
export async function createTestNotifications(): Promise<{ success: boolean; error?: string; count?: number }> {
  const supabase = await createServerActionClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Não autenticado" };
  }

  // Buscar perfil do usuário para usar como "triggering_user"
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url")
    .eq("id", user.id)
    .single();

  const actorName = profile?.full_name || "Você mesmo";
  const now = new Date();

  // Criar várias notificações de teste
  const testNotifications = [
    {
      recipient_id: user.id,
      triggering_user_id: user.id,
      category: "operational" as NotificationCategory,
      resource_type: "task",
      resource_id: null,
      title: `${actorName} comentou em Tarefa de Teste`,
      content: "Este é um comentário de teste para verificar o sistema de notificações.",
      action_url: "/tasks",
      metadata: {
        actor_name: actorName,
        task_title: "Tarefa de Teste"
      } as NotificationMetadata
    },
    {
      recipient_id: user.id,
      triggering_user_id: user.id,
      category: "operational" as NotificationCategory,
      resource_type: "attachment",
      resource_id: null,
      title: `${actorName} anexou um arquivo em Tarefa de Teste`,
      content: "audio-teste.ogg",
      action_url: "/tasks",
      metadata: {
        actor_name: actorName,
        file_type: "audio" as const,
        task_title: "Tarefa de Teste",
        file_name: "audio-teste.ogg",
        color: "text-purple-600",
        bg: "bg-purple-50"
      } as NotificationMetadata
    },
    {
      recipient_id: user.id,
      triggering_user_id: user.id,
      category: "operational" as NotificationCategory,
      resource_type: "task",
      resource_id: null,
      title: `${actorName} atribuiu a tarefa "Teste de Atribuição" para você`,
      content: "Esta é uma tarefa de teste para verificar notificações de atribuição.",
      action_url: "/tasks",
      metadata: {
        actor_name: actorName,
        task_title: "Teste de Atribuição"
      } as NotificationMetadata
    },
    {
      recipient_id: user.id,
      triggering_user_id: user.id,
      category: "admin" as NotificationCategory,
      resource_type: "member",
      resource_id: null,
      title: `${actorName} convidou você para Workspace de Teste`,
      content: "Você foi convidado como member",
      action_url: "/settings",
      metadata: {
        actor_name: actorName,
        workspace_name: "Workspace de Teste",
        role: "member"
      } as NotificationMetadata
    },
    {
      recipient_id: user.id,
      triggering_user_id: null,
      category: "system" as NotificationCategory,
      resource_type: "task",
      resource_id: null,
      title: "Tarefa \"Teste Atrasada\" está atrasada",
      content: "A tarefa está atrasada há 2 dia(s)",
      action_url: "/tasks",
      metadata: {
        task_title: "Teste Atrasada",
        days_overdue: 2
      } as NotificationMetadata
    }
  ];

  const { data, error } = await supabase
    .from("notifications")
    .insert(testNotifications)
    .select("id");

  if (error) {
    console.error("Error creating test notifications:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/");
  return { success: true, count: data?.length || 0 };
}

