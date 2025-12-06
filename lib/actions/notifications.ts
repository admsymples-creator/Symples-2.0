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

  // Combinar notificações com dados dos usuários
  return notifications.map((notification) => ({
    ...notification,
    triggering_user: notification.triggering_user_id
      ? usersData[notification.triggering_user_id] || null
      : null,
  })) as NotificationWithActor[];
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

