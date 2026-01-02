"use server";

import { createServerActionClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Database } from "@/types/database.types";
import { cache } from "react";

type Task = Database["public"]["Tables"]["tasks"]["Row"];

export interface WeekTask extends Task {
  // Campos adicionais que podem ser úteis na UI
  workspace_name?: string | null;
  assignee_name?: string | null;
}

export interface WorkspaceMember {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

export interface WorkspaceStats {
  id: string;
  name: string;
  slug: string | null;
  logo_url: string | null;
  pendingCount: number;
  totalCount: number;
  members: WorkspaceMember[];
}

/**
 * Busca tarefas da semana para o usuário autenticado
 * @param start - Data de início (início da semana - Segunda-feira)
 * @param end - Data de fim (fim da semana - Domingo)
 * @returns Array de tarefas da semana
 */
export const getWeekTasks = cache(async (
  start: Date,
  end: Date
): Promise<WeekTask[]> => {
  try {
    const supabase = await createServerActionClient();

    // Verificar autenticação
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error("Erro de autenticação:", authError);
      redirect("/login");
    }

    // Converter datas para ISO string (timestamptz)
    const startISO = start.toISOString();
    const endISO = end.toISOString();

    // Buscar tarefas pessoais (workspace_id IS NULL)
    // Aparecem se o usuário criou OU está atribuído
    const { data: personalTasks, error: personalError } = await supabase
      .from("tasks")
      .select(`
        *,
        workspaces(name),
        assignee:profiles!tasks_assignee_id_fkey(full_name)
      `)
      .is("workspace_id", null)
      .or(`assignee_id.eq.${user.id},created_by.eq.${user.id}`)
      .gte("due_date", startISO)
      .lte("due_date", endISO);

    // Buscar tarefas de workspace (workspace_id IS NOT NULL)
    // Aparecem se o usuário está atribuído (assignee_id = user.id) OU está em task_members
    const { data: workspaceTasks, error: workspaceError } = await supabase
      .from("tasks")
      .select(`
        *,
        workspaces(name),
        assignee:profiles!tasks_assignee_id_fkey(full_name)
      `)
      .not("workspace_id", "is", null)
      .eq("assignee_id", user.id) // Tarefas atribuídas via assignee_id
      .gte("due_date", startISO)
      .lte("due_date", endISO);

    // Buscar tarefas de workspace via task_members
    const { data: taskMemberTasks, error: taskMemberError } = await supabase
      .from("task_members")
      .select(`
        task_id,
        tasks:task_id (
          *,
          workspaces(name),
          assignee:profiles!tasks_assignee_id_fkey(full_name)
        )
      `)
      .eq("user_id", user.id);

    if (personalError || workspaceError || taskMemberError) {
      console.error("Erro ao buscar tarefas:", personalError || workspaceError || taskMemberError);
      // Retornar array vazio em caso de erro (não quebrar a UI)
      return [];
    }

    // Combinar resultados
    const allTasks = [...(personalTasks || []), ...(workspaceTasks || [])];
    const taskIdsSet = new Set(allTasks.map(task => task.id));

    // Adicionar tarefas de task_members que não estão já incluídas
    if (taskMemberTasks) {
      taskMemberTasks.forEach((tm: any) => {
        const task = tm.tasks;
        if (
          task &&
          !taskIdsSet.has(task.id) &&
          task.workspace_id !== null && // Apenas tarefas de workspace
          task.status !== "archived" &&
          task.due_date
        ) {
          const taskDate = new Date(task.due_date);
          const startDateObj = new Date(startISO);
          const endDateObj = new Date(endISO);
          
          // Filtrar por range de datas e garantir que não está em assignee_id já
          if (
            taskDate >= startDateObj &&
            taskDate <= endDateObj &&
            task.assignee_id !== user.id // Evitar duplicatas (já incluídas na query acima)
          ) {
            allTasks.push(task);
            taskIdsSet.add(task.id);
          }
        }
      });
    }

    // Ordenar por data e depois por data de criação
    const sortedTasks = allTasks.sort((a, b) => {
      const dateA = a.due_date ? new Date(a.due_date).getTime() : 0;
      const dateB = b.due_date ? new Date(b.due_date).getTime() : 0;
      if (dateA !== dateB) return dateA - dateB;
      const createdA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const createdB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return createdB - createdA;
    });

    // Mapear dados para incluir informações relacionadas
    const weekTasks: WeekTask[] = sortedTasks.map((task: any) => ({
      ...task,
      workspace_name: task.workspaces?.name || null,
      assignee_name: task.assignee?.full_name || null,
    }));

    return weekTasks;
  } catch (error) {
    console.error("Erro inesperado ao buscar tarefas:", error);
    return [];
  }
});

/**
 * Busca estatísticas semanais dos workspaces do usuário
 * @param start - Data de início (início da semana)
 * @param end - Data de fim (fim da semana)
 */
export const getWorkspacesWeeklyStats = cache(async (
  start: Date,
  end: Date
): Promise<WorkspaceStats[]> => {
  try {
    const supabase = await createServerActionClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) return [];

    // 1. Buscar workspaces do usuário
    const { data: members, error: membersError } = await supabase
      .from("workspace_members")
      .select(`
        workspace_id,
        workspaces (
          id,
          name,
          slug,
          logo_url
        )
      `)
      .eq("user_id", user.id);

    if (membersError || !members) {
      console.error("Erro ao buscar workspaces:", membersError);
      return [];
    }

    const workspaceIds = members.map((m) => m.workspace_id);

    if (workspaceIds.length === 0) return [];

    // 2. Buscar TODAS as tarefas desses workspaces na semana (Progresso do Time)
    const startISO = start.toISOString();
    const endISO = end.toISOString();

    const { data: tasks, error: tasksError } = await supabase
      .from("tasks")
      .select("id, workspace_id, status")
      .in("workspace_id", workspaceIds)
      .gte("due_date", startISO)
      .lte("due_date", endISO);

    if (tasksError) {
      console.error("Erro ao buscar tarefas dos workspaces:", tasksError);
      return [];
    }

    // 3. Buscar membros de cada workspace
    const { data: allMembers, error: allMembersError } = await supabase
      .from("workspace_members")
      .select(`
        workspace_id,
        profiles:user_id (
          id,
          full_name,
          avatar_url
        )
      `)
      .in("workspace_id", workspaceIds);

    // Agrupar membros por workspace
    const membersByWorkspace = new Map<string, WorkspaceMember[]>();
    if (allMembers && !allMembersError) {
      allMembers.forEach((m: any) => {
        if (m.profiles) {
          const workspaceId = m.workspace_id;
          if (!membersByWorkspace.has(workspaceId)) {
            membersByWorkspace.set(workspaceId, []);
          }
          membersByWorkspace.get(workspaceId)!.push({
            id: m.profiles.id,
            full_name: m.profiles.full_name,
            avatar_url: m.profiles.avatar_url,
          });
        }
      });
    }

    // 4. Agregar dados
    const statsMap = new Map<string, WorkspaceStats>();

    // Inicializar com os workspaces encontrados
    members.forEach((m: any) => {
        if (m.workspaces) {
            statsMap.set(m.workspace_id, {
                id: m.workspaces.id,
                name: m.workspaces.name,
                slug: m.workspaces.slug || null,
                logo_url: m.workspaces.logo_url || null,
                pendingCount: 0,
                totalCount: 0,
                members: membersByWorkspace.get(m.workspace_id) || []
            });
        }
    });

    // Contar tarefas
    tasks?.forEach((task) => {
      const stats = statsMap.get(task.workspace_id!);
      if (stats) {
        stats.totalCount++;
        if (task.status !== "done" && task.status !== "archived") {
          stats.pendingCount++;
        }
      }
    });

    return Array.from(statsMap.values());

  } catch (error) {
    console.error("Erro ao calcular estatísticas dos workspaces:", error);
    return [];
  }
});

/**
 * Busca estatísticas semanais dos projetos (tags) de um workspace
 * @param workspaceId - ID do workspace
 * @param start - Data de início (início da semana)
 * @param end - Data de fim (fim da semana)
 */
export const getProjectsWeeklyStats = cache(async (
  workspaceId: string,
  start: Date,
  end: Date
): Promise<Array<{
  tag: string;
  pendingCount: number;
  totalCount: number;
}>> => {
  try {
    const supabase = await createServerActionClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) return [];

    // Verificar se usuário é membro do workspace
    const { data: membership } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .single();

    if (!membership) return [];

    // Buscar tarefas do workspace na semana que tenham tags
    const startISO = start.toISOString();
    const endISO = end.toISOString();

    const { data: tasks, error: tasksError } = await supabase
      .from("tasks")
      .select("id, tags, status")
      .eq("workspace_id", workspaceId)
      .neq("status", "archived")
      .gte("due_date", startISO)
      .lte("due_date", endISO);

    if (tasksError) {
      console.error("Erro ao buscar tarefas dos projetos:", tasksError);
      return [];
    }

    // Agrupar por tag
    const statsMap = new Map<string, { pendingCount: number; totalCount: number }>();

    tasks?.forEach((task: any) => {
      if (task.tags && Array.isArray(task.tags) && task.tags.length > 0) {
        task.tags.forEach((tag: string) => {
          if (tag && tag.trim()) {
            const tagKey = tag.trim();
            if (!statsMap.has(tagKey)) {
              statsMap.set(tagKey, { pendingCount: 0, totalCount: 0 });
            }
            const stats = statsMap.get(tagKey)!;
            stats.totalCount++;
            if (task.status !== "done" && task.status !== "archived") {
              stats.pendingCount++;
            }
          }
        });
      }
    });

    // Converter para array e ordenar por nome
    return Array.from(statsMap.entries())
      .map(([tag, stats]) => ({
        tag,
        ...stats,
      }))
      .sort((a, b) => a.tag.localeCompare(b.tag));

  } catch (error) {
    console.error("Erro ao calcular estatísticas dos projetos:", error);
    return [];
  }
});

// getUserWorkspaces foi movido para lib/actions/user.ts para evitar duplicação

/**
 * Busca tarefas de um dia específico
 * @param date - Data do dia
 * @returns Array de tarefas do dia
 */
export const getDayTasks = cache(async (date: Date): Promise<WeekTask[]> => {
  try {
    const supabase = await createServerActionClient();

    // Verificar autenticação
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error("Erro de autenticação:", authError);
      redirect("/login");
    }

    // Criar range do dia (00:00:00 até 23:59:59)
    // Usar meio-dia para start para garantir que o dia correto seja mantido ao converter para UTC
    const startOfDay = new Date(date);
    startOfDay.setHours(12, 0, 0, 0);
    const startDateOnly = startOfDay.toISOString().split('T')[0];
    const startISO = startDateOnly + 'T00:00:00.000Z';
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    const endISO = endOfDay.toISOString();

    // Buscar tarefas pessoais (workspace_id IS NULL)
    // Aparecem se o usuário criou OU está atribuído
    const { data: personalTasks, error: personalError } = await supabase
      .from("tasks")
      .select(`
        *,
        workspaces(name),
        assignee:profiles!tasks_assignee_id_fkey(full_name)
      `)
      .is("workspace_id", null)
      .or(`assignee_id.eq.${user.id},created_by.eq.${user.id}`)
      .gte("due_date", startISO)
      .lte("due_date", endISO);

    // Buscar tarefas de workspace (workspace_id IS NOT NULL)
    // Aparecem se o usuário está atribuído (assignee_id = user.id) OU está em task_members
    const { data: workspaceTasks, error: workspaceError } = await supabase
      .from("tasks")
      .select(`
        *,
        workspaces(name),
        assignee:profiles!tasks_assignee_id_fkey(full_name)
      `)
      .not("workspace_id", "is", null)
      .eq("assignee_id", user.id) // Tarefas atribuídas via assignee_id
      .gte("due_date", startISO)
      .lte("due_date", endISO);

    // Buscar tarefas de workspace via task_members
    const { data: taskMemberTasks, error: taskMemberError } = await supabase
      .from("task_members")
      .select(`
        task_id,
        tasks:task_id (
          *,
          workspaces(name),
          assignee:profiles!tasks_assignee_id_fkey(full_name)
        )
      `)
      .eq("user_id", user.id);

    if (personalError || workspaceError || taskMemberError) {
      console.error("Erro ao buscar tarefas do dia:", personalError || workspaceError || taskMemberError);
      return [];
    }

    // Combinar resultados
    const allTasks = [...(personalTasks || []), ...(workspaceTasks || [])];
    const taskIdsSet = new Set(allTasks.map(task => task.id));

    // Adicionar tarefas de task_members que não estão já incluídas
    if (taskMemberTasks) {
      taskMemberTasks.forEach((tm: any) => {
        const task = tm.tasks;
        if (
          task &&
          !taskIdsSet.has(task.id) &&
          task.workspace_id !== null && // Apenas tarefas de workspace
          task.status !== "archived" &&
          task.due_date
        ) {
          const taskDate = new Date(task.due_date);
          const startDateObj = new Date(startISO);
          const endDateObj = new Date(endISO);
          
          // Filtrar por range de datas e garantir que não está em assignee_id já
          if (
            taskDate >= startDateObj &&
            taskDate <= endDateObj &&
            task.assignee_id !== user.id // Evitar duplicatas (já incluídas na query acima)
          ) {
            allTasks.push(task);
            taskIdsSet.add(task.id);
          }
        }
      });
    }

    // Ordenar por data e depois por data de criação
    const sortedTasks = allTasks.sort((a, b) => {
      const dateA = a.due_date ? new Date(a.due_date).getTime() : 0;
      const dateB = b.due_date ? new Date(b.due_date).getTime() : 0;
      if (dateA !== dateB) return dateA - dateB;
      const createdA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const createdB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return createdB - createdA;
    });

    const dayTasks: WeekTask[] = sortedTasks.map((task: any) => ({
      ...task,
      workspace_name: task.workspaces?.name || null,
      assignee_name: task.assignee?.full_name || null,
    }));

    return dayTasks;
  } catch (error) {
    console.error("Erro inesperado ao buscar tarefas do dia:", error);
    return [];
  }
});
