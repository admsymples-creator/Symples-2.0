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
 * OTIMIZADO: Busca profiles dos triggering_users em batch (1 query), filtra por workspace no backend
 * NOTA: triggering_user_id referencia auth.users, então buscamos profiles separadamente (não via JOIN)
 */
export async function getNotifications(
  filters?: {
    category?: NotificationCategory;
    unreadOnly?: boolean;
    limit?: number;
    workspaceId?: string | null; // NOVO: Filtrar por workspace no backend
  }
): Promise<NotificationWithActor[]> {
  try {
    const supabase = await createServerActionClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError) {
      console.error("Error getting user in getNotifications:", {
        message: authError.message,
        error: authError,
      });
      return [];
    }

    if (!user) {
      return [];
    }

    // Buscar notificações (sem JOIN - triggering_user_id referencia auth.users, não profiles)
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
      console.error("Error fetching notifications:", {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        error: error,
      });
      return [];
    }

    if (!notifications || notifications.length === 0) {
      return [];
    }

    // OTIMIZAÇÃO: Buscar profiles dos triggering_users em batch (1 query em vez de N)
    const triggeringUserIds = notifications
      .map(n => n.triggering_user_id)
      .filter((id): id is string => id !== null);
    
    let triggeringUserMap: Record<string, { full_name: string | null; avatar_url: string | null }> = {};
    
    if (triggeringUserIds.length > 0) {
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", triggeringUserIds);
      
      if (profilesError) {
        console.error("Error fetching triggering user profiles:", {
          message: profilesError.message,
          details: profilesError.details,
          hint: profilesError.hint,
          code: profilesError.code,
        });
        // Continuar mesmo com erro - triggering_user será null
      } else if (profiles) {
        triggeringUserMap = profiles.reduce((acc, profile) => {
          acc[profile.id] = {
            full_name: profile.full_name,
            avatar_url: profile.avatar_url,
          };
          return acc;
        }, {} as Record<string, { full_name: string | null; avatar_url: string | null }>);
      }
    }

    // OTIMIZAÇÃO: Buscar workspace_id das tarefas em batch (1 query em vez de N)
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

    // Processar notificações e aplicar filtro de workspace se necessário
    const result = notifications
      .map((notification: any) => {
        // Buscar triggering_user do map
        const triggeringUser = notification.triggering_user_id
          ? triggeringUserMap[notification.triggering_user_id] || null
          : null;

        // Extrair workspace_id da tarefa (se resource_type === 'task')
        let workspaceId: string | null = null;
        if (notification.resource_type === 'task' && notification.resource_id) {
          workspaceId = taskWorkspaceMap[notification.resource_id] || null;
        }

        // Adicionar workspace_id ao metadata se disponível
        const existingMetadata = (notification.metadata as any) || {};
        const metadata = workspaceId && !existingMetadata.workspace_id
          ? { ...existingMetadata, workspace_id: workspaceId }
          : existingMetadata;

        return {
          ...notification,
          metadata,
          triggering_user: triggeringUser,
        };
      })
      // Filtrar por workspace no backend se especificado
      .filter((notification: any) => {
        if (!filters?.workspaceId) {
          // Se não há filtro de workspace, mostrar todas (exceto as que têm workspace_id diferente)
          // Notificações sem workspace_id (sistema/admin) sempre aparecem
          const metadata = notification.metadata as any;
          if (!metadata?.workspace_id) {
            // Notificações sem workspace_id: apenas sistema/admin
            return notification.category === 'system' || notification.category === 'admin';
          }
          return true; // Mostrar todas as que têm workspace_id
        }

        // Filtrar por workspace_id específico
        const metadata = notification.metadata as any;
        
        // Prioridade 1: Filtrar por workspace_id no metadata
        if (metadata?.workspace_id) {
          return metadata.workspace_id === filters.workspaceId;
        }
        
        // Prioridade 2: Se não tem workspace_id, só mostrar se for notificação de sistema/admin
        if (!metadata?.workspace_id) {
          return notification.category === 'system' || notification.category === 'admin';
        }
        
        return false;
      }) as NotificationWithActor[];

    return result;
  } catch (err) {
    console.error("Unexpected error in getNotifications:", {
      error: err,
      message: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });
    return [];
  }
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
  workspaceId?: string;
  metadata?: NotificationMetadata;
}): Promise<{ success: boolean; error?: string; id?: string }> {
  const supabase = await createServerActionClient();

  let metadata = (params.metadata as any) || {};
  let workspaceId = metadata.workspace_id || params.workspaceId || null;

  if (!workspaceId && params.resourceType === "task" && params.resourceId) {
    const { data: task } = await supabase
      .from("tasks")
      .select("workspace_id")
      .eq("id", params.resourceId)
      .single();
    workspaceId = task?.workspace_id || null;
  }

  if (workspaceId) {
    metadata = { ...metadata, workspace_id: workspaceId };
  }

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
      metadata,
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

  const { data: workspaceMember } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id)
    .limit(1)
    .single();
  const workspaceId = workspaceMember?.workspace_id || null;

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
        task_title: "Tarefa de Teste",
        workspace_id: workspaceId,
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
        bg: "bg-purple-50",
        workspace_id: workspaceId,
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
        task_title: "Teste de Atribuição",
        workspace_id: workspaceId,
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
        role: "member",
        workspace_id: workspaceId,
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
        days_overdue: 2,
        workspace_id: workspaceId,
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
