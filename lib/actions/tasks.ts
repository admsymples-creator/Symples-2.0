"use server";

import { createServerActionClient } from "@/lib/supabase/server";
import { cookies, headers } from "next/headers";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { revalidatePath } from "next/cache";
import { Database } from "@/types/database.types";
import { createMentionNotificationsForTaskText } from "@/lib/utils/mentions";
import { addMonths } from "date-fns";

const perfEnabled = process.env.DEBUG_PERF === "1";
const perfNow = () => Date.now();
const logPerf = (label: string, startMs: number, meta?: Record<string, unknown>) => {
  if (!perfEnabled) return;
  const durationMs = perfNow() - startMs;
  if (meta) {
    console.log(`[perf] ${label}`, { durationMs, ...meta });
  } else {
    console.log(`[perf] ${label}`, { durationMs });
  }
};

type CacheEntry<T> = { value: T; expiresAt: number };
const IN_MEMORY_TTL_MS = 10_000;
const workspaceIdBySlugCache = new Map<string, CacheEntry<string | null>>();

const readCache = <T,>(cache: Map<string, CacheEntry<T>>, key: string): CacheEntry<T> | null => {
  const cached = cache.get(key);
  if (!cached) return null;
  if (cached.expiresAt <= Date.now()) {
    cache.delete(key);
    return null;
  }
  return cached;
};

const writeCache = <T,>(cache: Map<string, CacheEntry<T>>, key: string, value: T) => {
  cache.set(key, { value, expiresAt: Date.now() + IN_MEMORY_TTL_MS });
};

/** Formata data para chave dia (YYYY-MM-DD) para comparação */
function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Calcula a próxima data de recorrência (lado servidor, espelha WeeklyView) */
function getNextRecurrenceDateServer(
  currentDate: Date,
  recurrenceType: string,
  interval: number = 1,
  recurrenceDays?: number[] | null
): Date {
  let next = new Date(currentDate);
  if ((recurrenceType === "weekly" || recurrenceType === "custom") && recurrenceDays && recurrenceDays.length > 0) {
    const daySet = new Set(recurrenceDays);
    for (let i = 1; i <= 14; i++) {
      const candidate = new Date(currentDate);
      candidate.setDate(currentDate.getDate() + i);
      if (daySet.has(candidate.getDay())) {
        return candidate;
      }
    }
  }
  switch (recurrenceType) {
    case "daily":
      next.setDate(next.getDate() + interval);
      break;
    case "weekly":
      next.setDate(next.getDate() + 7 * interval);
      break;
    case "monthly":
      next = addMonths(next, interval);
      break;
    case "custom":
      next.setDate(next.getDate() + interval);
      break;
  }
  return next;
}

/**
 * Garante que a próxima ocorrência de cada tarefa recorrente exista como tarefa real no banco
 * (mesmo que a atual não tenha sido marcada como concluída). Retorna os IDs das tarefas criadas.
 */
async function ensureNextRecurrenceOccurrences(
  data: any[],
  dueDateStart: string,
  dueDateEnd: string
): Promise<string[]> {
  const end = new Date(dueDateEnd);
  const newIds: string[] = [];

  // Materializar apenas ocorrências de hoje — dias passados e futuros ficam como estão
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);

  for (const task of data) {
    if (!task.recurrence_type || task.status === "done" || task.recurrence_parent_id) continue;
    if (!task.due_date) continue;

    // Partir do último filho existente (ou do próprio pai), para não desperdiçar iterações em datas antigas
    const seriesOccurrences = (data as any[]).filter(
      (t: any) => (t.recurrence_parent_id === task.id || t.id === task.id) && t.due_date
    );
    const latest = seriesOccurrences.reduce((acc: any, t: any) =>
      !acc || new Date(t.due_date) > new Date(acc.due_date) ? t : acc, null
    );
    let currentDate = latest ? new Date(latest.due_date) : new Date(task.due_date);
    const MAX_CATCHUP = 30; // segurança: no máximo 30 iterações por série

    for (let i = 0; i < MAX_CATCHUP; i++) {
      const nextDate = getNextRecurrenceDateServer(
        currentDate,
        task.recurrence_type,
        task.recurrence_interval ?? 1,
        task.recurrence_days ?? null
      );

      if (task.recurrence_end_date && nextDate > new Date(task.recurrence_end_date)) break;
      if (nextDate > end) break;

      // Datas passadas (antes de hoje): avança o cursor sem criar nada
      if (nextDate < todayStart) { currentDate = nextDate; continue; }

      // Datas futuras (depois de hoje): para — virão como virtuais no frontend
      if (nextDate > todayEnd) break;

      // Hoje: verifica se já existe e cria se necessário
      const nextDateKey = toDateKey(nextDate);
      const alreadyExists = data.some(
        (t: any) =>
          (t.id === task.id || t.recurrence_parent_id === task.id) &&
          t.due_date &&
          toDateKey(new Date(t.due_date)) === nextDateKey
      );

      if (!alreadyExists) {
        const result = await createTask(
          {
            title: task.title,
            description: task.description ?? undefined,
            workspace_id: task.workspace_id ?? undefined,
            is_personal: task.is_personal ?? undefined,
            status: "todo",
            priority: (task.priority as "low" | "medium" | "high" | "urgent") || "medium",
            assignee_id: task.assignee_id ?? "current",
            due_date: nextDate.toISOString(),
            origin_context: task.origin_context ?? undefined,
            group_id: task.group_id ?? undefined,
            tags: Array.isArray(task.tags) ? task.tags : undefined,
            subtasks: task.subtasks ?? undefined,
            recurrence_type: task.recurrence_type,
            recurrence_interval: task.recurrence_interval ?? 1,
            recurrence_end_date: task.recurrence_end_date ?? undefined,
            recurrence_days: Array.isArray(task.recurrence_days) ? task.recurrence_days : undefined,
            recurrence_parent_id: task.id,
          },
          { skipRevalidate: true }
        );

        if (result.success && result.data && (result.data as any).id) {
          newIds.push((result.data as any).id);
        }
      }

      currentDate = nextDate;
    }
  }

  return newIds;
}

// Re-exporting types
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
  group: {
    id: string;
    name: string;
    color: string | null;
  } | null;
  task_members?: Array<{
    user: {
      id: string;
      full_name: string | null;
      email: string | null;
      avatar_url: string | null;
    };
  }>;
};

/**
 * Função helper para transformar tarefa com task_members em array assignees
 * Combina assignee_id (se existir) com task_members, garantindo que assignee_id aparece primeiro
 */
function transformTaskWithMembers(task: any): any {
  const assignees: Array<{ id: string; name: string; avatar?: string }> = [];
  const seenIds = new Set<string>();

  // Adicionar assignee_id primeiro (se existir)
  if (task.assignee_id && task.assignee) {
    assignees.push({
      id: task.assignee_id,
      name: task.assignee.full_name || task.assignee.email || "Usuário",
      avatar: task.assignee.avatar_url || undefined,
    });
    seenIds.add(task.assignee_id);
  }

  // Adicionar membros de task_members (se não já incluídos)
  if (task.task_members && Array.isArray(task.task_members)) {
    task.task_members.forEach((tm: any) => {
      if (tm.user && !seenIds.has(tm.user.id)) {
        assignees.push({
          id: tm.user.id,
          name: tm.user.full_name || tm.user.email || "Usuário",
          avatar: tm.user.avatar_url || undefined,
        });
        seenIds.add(tm.user.id);
      }
    });
  }

  // Extrair tags da coluna tags (preferencial) ou do origin_context (fallback)
  let tags: string[] = [];
  if ((task as any).tags && Array.isArray((task as any).tags)) {
    tags = (task as any).tags;
  } else if (task.origin_context && typeof task.origin_context === 'object' && 'tags' in task.origin_context) {
    const contextTags = (task.origin_context as any).tags;
    if (Array.isArray(contextTags)) {
      tags = contextTags;
    }
  }

  return {
    ...task,
    assignees,
    tags, // Garantir que tags sempre está presente
  };
}

/**
 * Busca tarefas de um workspace ou pessoais
 * ✅ Filtros aplicados:
 * - Soft Delete: Exclui tarefas com status "archived"
 * - Hierarquia: Garante que grupos pertencem ao workspace correto
 * - Integridade: Tarefas de grupos deletados são filtradas
 */
export async function getTasks(filters?: {
  workspaceId?: string | null;
  assigneeId?: string | null | "current";
  dueDateStart?: string;
  dueDateEnd?: string;
  tag?: string;
  status?: string | string[]; // Suporte a múltiplos status
  excludeStatus?: string | string[]; // Suporte a exclusão
  limit?: number; // Limite de resultados (opcional)
}) {
  const perfStart = perfNow();
  const supabase = await createServerActionClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    logPerf("getTasks:anonymous", perfStart);
    return [];
  }

  // ✅ SEGURANÇA E LÓGICA: Fail-safe
  // Exceção: Se assigneeId === "current" (aba "Minhas"), permitir buscar sem workspaceId
  const isMinhasTab = filters?.assigneeId === "current";

  if (filters?.workspaceId === undefined && !isMinhasTab) {
    console.warn(`[getTasks] workspaceId não especificado e não é aba "Minhas" - retornando array vazio por segurança`);
    logPerf("getTasks:no-workspace", perfStart);
    return [];
  }

  // ✅ SEGURANÇA: Verificar se usuário é membro do workspace antes de buscar tarefas
  // (Apenas quando workspaceId é uma string válida)
  if (filters?.workspaceId !== undefined && filters.workspaceId !== null) {
    const { data: membership } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", filters.workspaceId)
      .eq("user_id", user.id)
      .single();

    if (!membership) {
      console.warn(`[getTasks] Acesso negado: Usuário ${user.id} tentou acessar workspace ${filters.workspaceId} sem ser membro`);
      logPerf("getTasks:denied", perfStart, { workspaceId: filters.workspaceId });
      return []; // Retornar vazio se não for membro
    }
  }

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
      ),
      group:group_id (
        id,
        name,
        color,
        workspace_id
      ),
      task_members (
        user:user_id (
          id,
          full_name,
          email,
          avatar_url
        )
      )
    `)
    .order("position", { ascending: true })
    .order("created_at", { ascending: false });

  // ✅ Filtro de Status (Inclusão/Exclusão)
  if (filters?.excludeStatus) {
    if (Array.isArray(filters.excludeStatus)) {
      query = query.not("status", "in", `(${filters.excludeStatus.join(',')})`);
    } else {
      query = query.neq("status", filters.excludeStatus);
    }
  } else if (filters?.status) {
    if (Array.isArray(filters.status)) {
      query = query.in("status", filters.status);
    } else {
      query = query.eq("status", filters.status);
    }
  } else {
    // Padrão: Apenas não arquivadas (se nenhum filtro específico for passado)
    query = query.neq("status", "archived");
  }

  // Limite de resultados
  if (filters?.limit) {
    query = query.limit(filters.limit);
  }

  // ✅ LÓGICA CORRIGIDA: Aplicar filtro baseado no tipo de workspaceId
  if (filters?.workspaceId === undefined) {
    // Aba "Minhas": Não aplicar filtro de workspace (buscar de todos os workspaces)
    // O filtro de assignee será aplicado abaixo
  } else if (filters.workspaceId === null) {
    // Tarefas Pessoais (sem workspace e criadas pelo usuário)
    // IMPORTANTE: filtrar também por is_personal=true para corresponder à política RLS
    query = query.is("workspace_id", null).eq("created_by", user.id).eq("is_personal", true);
  } else {
    // Tarefas do Workspace (já verificamos que o usuário é membro acima)
    query = query.eq("workspace_id", filters.workspaceId);
  }

  // Filtro de Responsável
  if (filters?.assigneeId) {
    if (filters.assigneeId === "current") {
      query = query.eq("assignee_id", user.id);
    } else {
      query = query.eq("assignee_id", filters.assigneeId);
    }
  }

  // Filtro de Data (Início)
  if (filters?.dueDateStart) {
    query = query.gte("due_date", filters.dueDateStart);
  }

  // Filtro de Data (Fim)
  if (filters?.dueDateEnd) {
    query = query.lte("due_date", filters.dueDateEnd);
  }

  // Filtro de Tag (Projeto)
  if (filters?.tag) {
    query = query.contains("tags", [filters.tag]);
  }

  const queryStart = perfNow();
  let { data, error } = await query;
  logPerf("getTasks:query", queryStart, { workspaceId: filters?.workspaceId ?? null });

  // Se a busca for pelas tarefas do usuário atual e há tarefas em task_members, buscar também essas tarefas
  if (filters?.assigneeId === "current") {
    const membersQueryStart = perfNow();
    const { data: taskMemberTasks } = await supabase
      .from("task_members")
      .select(`
  task_id,
    tasks: task_id(
            *,
      assignee: assignee_id(
        full_name,
        email,
        avatar_url
      ),
      creator: created_by(
        full_name
      ),
      group: group_id(
        id,
        name,
        color,
        workspace_id
      ),
      task_members(
        user: user_id(
          id,
          full_name,
          email,
          avatar_url
        )
      )
    )
        `)
      .eq("user_id", user.id);
    logPerf("getTasks:task-members", membersQueryStart);

    if (taskMemberTasks && taskMemberTasks.length > 0) {
      const tasksFromMembers = taskMemberTasks
        .map((tm: any) => tm.tasks)
        .filter((task: any) => {
          // Validar existência e status
          if (!task || task.status === "archived" || task.assignee_id === user.id) return false;

          // ✅ FIX CRÍTICO: Garantir que a tarefa pertence ao workspace solicitado
          // Se workspaceId for fornecido (não é null/undefined), filtrar rigorosamente
          if (filters?.workspaceId) {
            if (task.workspace_id !== filters.workspaceId) return false;
          }

          // ✅ Planner: só incluir tarefas com data no intervalo exibido (responsável + data)
          if (!task.due_date) return false;
          if (filters?.dueDateStart && task.due_date < filters.dueDateStart) return false;
          if (filters?.dueDateEnd && task.due_date > filters.dueDateEnd) return false;

          return true;
        });

      // Combinar tarefas de assignee_id com tarefas de task_members
      const existingTaskIds = new Set((data || []).map((t: any) => t.id));
      const additionalTasks = tasksFromMembers.filter((t: any) => !existingTaskIds.has(t.id));

      // As tarefas de task_members já vêm com a estrutura correta da query (incluindo relacionamentos),
      // então serão transformadas junto com as outras tarefas no final através de transformTaskWithMembers
      data = [...(data || []), ...additionalTasks];
    }
  }

  if (error) {
    console.error("Erro ao buscar tarefas:", error);
    logPerf("getTasks:error", perfStart);
    return [];
  }

  if (!data || data.length === 0) {
    logPerf("getTasks:empty", perfStart);
    return [];
  }

  // Garantir próxima ocorrência real de tarefas recorrentes (mesmo sem marcar a atual como concluída)
  if (filters?.dueDateStart && filters?.dueDateEnd) {
    try {
      // Weekly/Planner pessoal: incluir tarefas-pai recorrentes mesmo fora do range atual.
      // Sem isso, séries antigas podem sumir da visão semanal por não haver "âncora" no intervalo.
      if (filters.workspaceId === null && filters.assigneeId === "current") {
        let recurringParentsQuery = supabase
          .from("tasks")
          .select(`
            *,
            assignee:assignee_id (full_name, email, avatar_url),
            creator:created_by (full_name),
            group:group_id (id, name, color, workspace_id),
            task_members (user:user_id (id, full_name, email, avatar_url))
          `)
          .is("workspace_id", null)
          .eq("created_by", user.id)
          .eq("is_personal", true)
          .eq("assignee_id", user.id)
          .not("recurrence_type", "is", null)
          .is("recurrence_parent_id", null)
          .neq("status", "archived")
          .neq("status", "done");

        if (filters.tag) {
          recurringParentsQuery = recurringParentsQuery.contains("tags", [filters.tag]);
        }

        const { data: recurringParents } = await recurringParentsQuery;
        if (recurringParents && recurringParents.length > 0) {
          const existingIds = new Set((data || []).map((t: any) => t.id));
          const missingParents = recurringParents.filter((t: any) => !existingIds.has(t.id));
          if (missingParents.length > 0) {
            data = [...(data as any[] || []), ...missingParents];
          }
        }
      }

      // Workspace: incluir tarefas-pai recorrentes mesmo fora do range atual.
      // Mesma regra do pessoal: séries ativas devem aparecer (virtuais + laranja) independente do due_date do pai.
      if (typeof filters.workspaceId === "string" && filters.assigneeId === "current") {
        let recurringParentsWsQuery = supabase
          .from("tasks")
          .select(`
            *,
            assignee:assignee_id (full_name, email, avatar_url),
            creator:created_by (full_name),
            group:group_id (id, name, color, workspace_id),
            task_members (user:user_id (id, full_name, email, avatar_url))
          `)
          .eq("workspace_id", filters.workspaceId)
          .eq("assignee_id", user.id)
          .not("recurrence_type", "is", null)
          .is("recurrence_parent_id", null)
          .neq("status", "archived")
          .neq("status", "done");

        if (filters.tag) {
          recurringParentsWsQuery = recurringParentsWsQuery.contains("tags", [filters.tag]);
        }

        const { data: recurringParentsWs } = await recurringParentsWsQuery;
        if (recurringParentsWs && recurringParentsWs.length > 0) {
          const existingIds = new Set((data || []).map((t: any) => t.id));
          const missingParents = recurringParentsWs.filter((t: any) => !existingIds.has(t.id));
          if (missingParents.length > 0) {
            data = [...(data as any[] || []), ...missingParents];
          }
        }
      }

      const newIds = await ensureNextRecurrenceOccurrences(
        data as any[],
        filters.dueDateStart,
        filters.dueDateEnd
      );
      if (newIds.length > 0) {
        const { data: newTasksData } = await supabase
          .from("tasks")
          .select(`
            *,
            assignee:assignee_id (full_name, email, avatar_url),
            creator:created_by (full_name),
            group:group_id (id, name, color, workspace_id),
            task_members (user:user_id (id, full_name, email, avatar_url))
          `)
          .in("id", newIds);
        if (newTasksData && newTasksData.length > 0) {
          data = [...(data as any[]), ...newTasksData];
        }
      }
    } catch (ensureErr) {
      console.error("[getTasks] ensureNextRecurrenceOccurrences:", ensureErr);
    }
  }

  // ✅ Filtro 2: Buscar grupos válidos do workspace (backend)
  // Isso garante que só retornamos tarefas de grupos que existem e pertencem ao workspace
  // IMPORTANTE: Quando assigneeId === "current" (aba "Minhas"), não filtrar por workspace
  let validGroupIds: Set<string> | null = null;

  if (filters?.workspaceId !== undefined && !isMinhasTab) {
    try {
      // Usar cast para evitar erro de tipo (task_groups pode não estar nos tipos ainda)
      let groupsQuery = (supabase as any)
        .from("task_groups")
        .select("id");

      if (filters.workspaceId === null) {
        groupsQuery = groupsQuery.is("workspace_id", null);
      } else {
        groupsQuery = groupsQuery.eq("workspace_id", filters.workspaceId);
      }

      const { data: validGroups } = await groupsQuery;

      if (validGroups && Array.isArray(validGroups)) {
        validGroupIds = new Set(validGroups.map((g: any) => g.id));
      }
    } catch (error) {
      console.error("Erro ao buscar grupos válidos:", error);
      // Continuar sem filtro de grupos em caso de erro
    }
  }

  // ✅ Filtro 3: Aplicar filtros de hierarquia e integridade (backend)
  const filteredData = (data as any[]).filter((task) => {
    // ✅ 3.1: Excluir tarefas arquivadas (já filtrado na query, mas garantindo aqui também)
    if (task.status === "archived") {
      return false;
    }

    // ✅ 3.2: Se a tarefa tem grupo, verificar se o grupo é válido
    if (task.group_id) {
      // Se o grupo não existe (group é null), excluir tarefa
      if (!task.group || !task.group.id) {
        return false;
      }

      // Se estamos na aba "Minhas" (assigneeId === "current"), não filtrar por workspace do grupo
      if (isMinhasTab) {
        // Apenas verificar se o grupo existe, sem filtrar por workspace
        return true;
      }

      // Se temos lista de grupos válidos, verificar se o grupo está nela
      if (validGroupIds !== null) {
        if (!validGroupIds.has(task.group.id)) {
          return false; // Grupo não pertence ao workspace correto
        }
      } else {
        // Se não há filtro de workspace, verificar se grupo tem workspace_id compatível
        if (filters?.workspaceId && task.group.workspace_id !== filters.workspaceId) {
          return false;
        }
        if (filters?.workspaceId === null && task.group.workspace_id !== null) {
          return false;
        }
      }
    }

    // ✅ 3.3: Tarefas sem grupo são válidas (se atendem outros critérios)
    return true;
  });

  // Buscar contagem de comentários para cada tarefa usando query única (mais eficiente)
  const taskIds = filteredData.map((t: any) => t.id);
  const commentCountMap: Record<string, number> = {};

  if (taskIds.length > 0) {
    // Buscar todos os task_ids de uma vez - mais eficiente que múltiplas queries em lote
    const commentsQueryStart = perfNow();
    const { data: commentsData, error: commentsError } = await supabase
      .from("task_comments")
      .select("task_id")
      .in("task_id", taskIds);
    logPerf("getTasks:comments", commentsQueryStart, { count: taskIds.length });

    if (commentsError) {
      console.error("Erro ao buscar contagem de comentários:", commentsError);
      // Continuar sem contagem de comentários em caso de erro
    } else if (commentsData) {
      // Contar comentários por task_id
      commentsData.forEach((comment: any) => {
        commentCountMap[comment.task_id] = (commentCountMap[comment.task_id] || 0) + 1;
      });
    }
  }

  // Adicionar contagem de comentários e transformar membros
  // IMPORTANTE: As tarefas de task_members já foram adicionadas ao `data` antes do filtro,
  // então elas também passam pela transformação aqui
  const result = filteredData.map((task) => {
    const transformed = transformTaskWithMembers({
      ...task,
      comment_count: commentCountMap[task.id] || 0,
    });
    return transformed;
  }) as unknown as TaskWithDetails[];

  logPerf("getTasks", perfStart, { count: result.length });
  return result;
}

/**
 * Busca todas as tags únicas de um workspace
 * Retorna array de tags ordenadas alfabeticamente
 */
export async function getWorkspaceTags(workspaceId: string): Promise<string[]> {
  const supabase = await createServerActionClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !workspaceId) return [];

  const { data: workspace, error: workspaceError } = await supabase
    .from("workspaces")
    .select("owner_id")
    .eq("id", workspaceId)
    .single();

  if (workspaceError || !workspace) return [];

  if (workspace.owner_id !== user.id) {
    const { data: membership } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .single();

    if (!membership) return [];
  }

  const { data: tasks, error } = await supabase
    .from("tasks")
    .select("tags")
    .eq("workspace_id", workspaceId)
    .neq("status", "archived")
    .not("tags", "is", null);

  const allTags = new Set<string>();
  if (!error && tasks) {
    tasks.forEach((task: any) => {
      if (task.tags && Array.isArray(task.tags)) {
        task.tags.forEach((tag: string) => {
          if (tag && tag.trim()) {
            allTags.add(tag.trim());
          }
        });
      }
    });
  }

  const { data: projectIcons, error: iconsError } = await (supabase as any)
    .from("project_icons")
    .select("tag_name")
    .eq("workspace_id", workspaceId);

  if (!iconsError && projectIcons) {
    projectIcons.forEach((icon: any) => {
      if (icon.tag_name && icon.tag_name.trim()) {
        allTags.add(icon.tag_name.trim());
      }
    });
  }

  return Array.from(allTags).sort();
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
    assignee: assignee_id(
      full_name,
      email,
      avatar_url
    ),
      creator: created_by(
        full_name
      ),
      group: group_id(
        id,
        name,
        color,
        workspace_id
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
        assignee: assignee_id(
          full_name,
          email,
          avatar_url
        ),
          creator: created_by(
            full_name
          ),
            workspace: workspace_id(
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
export async function createTask(
  data: {
    title: string;
    due_date?: string | null;
    workspace_id?: string | null;
    status?: string;
    priority?: string;
    is_personal?: boolean | null;
    description?: string;
    assignee_id?: string | null;
    recurrence_type?: string;
    recurrence_interval?: number | null;
    recurrence_end_date?: string | null;
    recurrence_count?: number | null;
    recurrence_days?: number[] | null;
    recurrence_parent_id?: string | null;
    group_id?: string | null;
    tags?: string[];
    position?: number;
    origin_context?: any;
    subtasks?: any;
  },
  options?: {
    /** Quando true, não chama revalidatePath (útil em caminhos de leitura como getTasks/ensureNextRecurrenceOccurrences) */
    skipRevalidate?: boolean;
  }
) {
  const supabase = await createServerActionClient();
  console.log("[SERVER-ACTION] createTask called with:", JSON.stringify(data));

  const skipRevalidate = options?.skipRevalidate === true;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    console.error("[SERVER-ACTION] createTask: No user found");
    return { success: false, error: "Usuário não autenticado" };
  }

  if (data.is_personal === true) {
    data.workspace_id = null;
  }

  const isPlannerRequest = data.origin_context === "planner";
  const isWeeklyViewOnly = data.origin_context === "weekly_view";

  if (isPlannerRequest) {
    data.workspace_id = null;
    data.is_personal = true;
    data.origin_context = data.origin_context || "planner";
  }

  const visibleOnBoard = !(isPlannerRequest || isWeeklyViewOnly);

  // Validação de acesso ao workspace se fornecido
  // Validação de acesso ao workspace se fornecido
  if (data.workspace_id) {
    const { data: workspace, error: wsError } = await supabase
      .from("workspaces")
      .select("owner_id")
      .eq("id", data.workspace_id)
      .single();

    if (wsError || !workspace) {
      console.error("[SERVER-ACTION] Workspace not found or error:", wsError);
      return { success: false, error: "Workspace não encontrado" };
    }

    // Se for dono, permite
    if (workspace.owner_id === user.id) {
      console.log(`[SERVER-ACTION] User ${user.id} is owner of ${data.workspace_id}. Access granted.`);
    } else {
      // Se não for dono, verifica membro
      console.log(`[SERVER-ACTION] Checking workspace membership. User: ${user.id}, Workspace: ${data.workspace_id}`);
      const { data: member, error: memberError } = await supabase
        .from("workspace_members")
        .select("user_id")
        .eq("workspace_id", data.workspace_id)
        .eq("user_id", user.id)
        .single();

      if (memberError || !member) {
        console.error("[SERVER-ACTION] Access denied details:", {
          isOwner: false,
          memberFound: !!member,
          memberError
        });
        return { success: false, error: "Acesso negado ao workspace" };
      }
    }
  }

  // Resolver assignee_id: "current" para o ID do usuário atual
  const resolvedAssigneeId = data.assignee_id === "current" ? user.id : data.assignee_id;

  // Validar group_id: evita FK violation se o grupo foi deletado ou não existe
  let safeGroupId: string | null = null;
  const rawGroupId = data.group_id && String(data.group_id).trim() ? data.group_id : null;
  if (rawGroupId) {
    const { data: groupRow } = await (supabase as any)
      .from("task_groups")
      .select("id, workspace_id")
      .eq("id", rawGroupId)
      .single();
    if (groupRow && typeof groupRow === "object" && "id" in groupRow) {
      const taskWorkspaceId = data.workspace_id || null;
      if (groupRow.workspace_id === taskWorkspaceId) {
        safeGroupId = groupRow.id;
      } else {
        console.warn("[createTask] group_id não pertence ao workspace da tarefa, usando null");
      }
    } else {
      console.warn("[createTask] group_id não encontrado em task_groups, criando tarefa no inbox");
    }
  }

  const taskData: any = {
    title: data.title,
    due_date: data.due_date || null,
    workspace_id: data.workspace_id || null, // Se undefined/null, grava null (tarefa pessoal ou sem workspace)
    status: data.status || "todo",
    created_by: user.id,
    assignee_id: resolvedAssigneeId !== undefined ? resolvedAssigneeId : null, // Default: sem responsável
    priority: (data.priority as any) || "medium",
    is_personal: data.is_personal ?? (data.workspace_id ? false : true), // Default: True se não tiver WS
    description: data.description || null,
    // Novos campos de recorrencia
    recurrence_type: data.recurrence_type || null,
    recurrence_interval: data.recurrence_interval || (data.recurrence_type ? 1 : null),
    recurrence_end_date: data.recurrence_end_date || null,
    recurrence_count: typeof data.recurrence_count === "number" ? data.recurrence_count : null,
    recurrence_days: Array.isArray(data.recurrence_days) && data.recurrence_days.length > 0 ? data.recurrence_days : null,
    recurrence_parent_id: data.recurrence_parent_id ?? null,
    // Group and Tags
    group_id: safeGroupId,
    tags: data.tags || null,
    visible_on_board: visibleOnBoard,
  };

  if (typeof data.position === "number" && Number.isFinite(data.position)) {
    taskData.position = data.position;
  }

  console.log("[SERVER-ACTION] Inserting taskData:", JSON.stringify(taskData));

  const { data: newTask, error } = await supabase
    .from("tasks")
    .insert(taskData)
    .select()
    .single();

  if (error) {
    console.error("[SERVER-ACTION] Insert error:", error);
    return { success: false, error: error.message };
  }

  console.log("[SERVER-ACTION] Task created successfully:", newTask.id);

  // Notificações de menção na descrição inicial da tarefa
  try {
    if (data.description && data.description.trim()) {
      await createMentionNotificationsForTaskText({
        taskId: newTask.id,
        text: data.description,
        mentionType: "description",
        authorId: user.id,
      });
    }
  } catch (mentionError) {
    console.error("[createTask] Erro ao criar notificações de menção na descrição:", mentionError);
    // Não falhar a criação da tarefa se as notificações falharem
  }

  // Revalidar path relevante (home omitido: na home a UI atualiza via evento home-tasks-updated + refetch no cliente, evita re-render pesado da página)
  // Importante: não chamar durante render de páginas (ex.: getTasks na home) — por isso o flag skipRevalidate.
  if (!skipRevalidate) {
    try {
      revalidatePath("/");
      revalidatePath("/(main)/planner", "page");
      if (data.workspace_id) {
        revalidatePath(`/${data.workspace_id}`);
      }
    } catch (e) {
      console.error("[SERVER-ACTION] Revalidate error (non-fatal):", e);
    }
  }

  return { success: true, data: newTask };
}

/**
 * Atualiza uma tarefa (Status, Detalhes, Posição)
 */
export async function updateTask(params: Partial<TaskUpdate> & { id: string }) {
  const supabase = await createServerActionClient();
  const { id, ...updates } = params;

  console.log("[updateTask] Atualizando tarefa:", { id, updates });

  // Buscar usuário atual para registrar quem fez o update (usado pelo trigger de notificação)
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    (updates as any).updated_by = user.id;
  }

  // Regra de promoção para quadro:
  // somente quando o responsável muda para OUTRA pessoa (não o usuário atual).
  if (updates.assignee_id !== undefined && updates.assignee_id !== null) {
    const { data: currentTask } = await supabase
      .from("tasks")
      .select("workspace_id, assignee_id, is_personal, recurrence_type, recurrence_parent_id")
      .eq("id", id)
      .single();
    const hasAssigneeChanged = !!currentTask && currentTask.assignee_id !== updates.assignee_id;
    const assignedToAnotherUser = !!user && updates.assignee_id !== user.id;
    const isPersonalRecurringTask = !!currentTask &&
      currentTask.workspace_id === null &&
      currentTask.is_personal === true &&
      (currentTask.recurrence_type !== null || currentTask.recurrence_parent_id !== null);
    const shouldPromoteToBoard = hasAssigneeChanged && assignedToAnotherUser && !isPersonalRecurringTask;

    if (shouldPromoteToBoard) {
      updates.visible_on_board = true;

      if (currentTask.workspace_id === null) {
        let activeWorkspaceId: string | null = null;
        try {
          const cookieStore = await cookies();
          activeWorkspaceId = cookieStore.get("active_workspace_id")?.value ?? null;
        } catch {
          activeWorkspaceId = null;
        }
        if (activeWorkspaceId && user) {
          const { data: workspace } = await supabase
            .from("workspaces")
            .select("owner_id")
            .eq("id", activeWorkspaceId)
            .single();
          const isOwner = workspace?.owner_id === user.id;
          const { data: member } = !isOwner
            ? await supabase
              .from("workspace_members")
              .select("user_id")
              .eq("workspace_id", activeWorkspaceId)
              .eq("user_id", user.id)
              .single()
            : { data: { user_id: user.id } };
          if (isOwner || member) {
            updates.workspace_id = activeWorkspaceId;
            updates.is_personal = false;
          }
        }
      }
    }
  }

  // Fazer o update diretamente sem select para evitar problemas de RLS
  // O Supabase retorna erro apenas se houver problema de permissão ou sintaxe
  const { error } = await supabase
    .from("tasks")
    .update(updates)
    .eq("id", id);

  if (error) {
    console.error("[updateTask] Erro ao atualizar tarefa:", error);
    // Se for erro de "nenhuma linha", pode ser que a tarefa não existe ou RLS bloqueou
    if (error.code === 'PGRST116' || error.message.includes('0 rows') || error.message.includes('No rows')) {
      return { success: false, error: "Tarefa não encontrada ou sem permissão" };
    }
    return { success: false, error: error.message };
  }

  // Se não houve erro, o update foi bem-sucedido
  console.log("[updateTask] Tarefa atualizada com sucesso:", id);

  // ✅ Auto-reset de urgência: Se a tarefa foi concluída e tinha prioridade "urgent", resetar para "medium"
  if (updates.status === "done") {
    try {
      // Buscar a tarefa para verificar a prioridade atual
      const { data: taskForPriority } = await supabase
        .from("tasks")
        .select("priority")
        .eq("id", id)
        .single();

      if (taskForPriority && taskForPriority.priority === "urgent") {
        console.log("[updateTask] Resetando prioridade urgente para medium após conclusão:", id);
        await supabase
          .from("tasks")
          .update({ priority: "medium" })
          .eq("id", id);
      }
    } catch (priorityError) {
      console.error("[updateTask] Erro ao resetar prioridade:", priorityError);
      // Não falhar o update principal se o reset de prioridade falhar
    }
  }

  // ✅ Recorrência: Se a tarefa foi concluída, verificar se precisa criar a próxima
  if (updates.status === "done") {
    try {
      // Buscar a tarefa atual para ver regras de recorrência
      // Usar uma nova query para garantir dados atualizados e evitar problemas de cache/tipo
      const { data: currentTask } = await supabase
        .from("tasks")
        .select("*")
        .eq("id", id)
        .single();

      if (currentTask && currentTask.recurrence_type && currentTask.due_date) {
        console.log("[updateTask] Processando recorrência para tarefa:", id);

        const { addDays, addWeeks, addMonths, isAfter, parseISO } = require("date-fns");

        let nextDate = parseISO(currentTask.due_date);
        const interval = currentTask.recurrence_interval || 1;
        const recurrenceDays = Array.isArray((currentTask as any).recurrence_days)
          ? ((currentTask as any).recurrence_days as number[])
          : [];

        if ((currentTask.recurrence_type === "weekly" || currentTask.recurrence_type === "custom") && recurrenceDays.length > 0) {
          const daySet = new Set<number>(recurrenceDays);
          const base = new Date(nextDate);
          base.setHours(0, 0, 0, 0);
          let found = false;

          for (let i = 1; i <= 14; i++) {
            const candidate = new Date(base);
            candidate.setDate(base.getDate() + i);
            if (!daySet.has(candidate.getDay())) continue;
            candidate.setHours(nextDate.getHours(), nextDate.getMinutes(), nextDate.getSeconds(), nextDate.getMilliseconds());
            nextDate = candidate;
            found = true;
            break;
          }

          if (!found) {
            nextDate = addDays(nextDate, 7);
          }
        } else {
          // Calcular próxima data
          switch (currentTask.recurrence_type) {
            case "daily":
              nextDate = addDays(nextDate, interval);
              break;
            case "weekly":
              nextDate = addWeeks(nextDate, interval);
              break;
            case "monthly":
              nextDate = addMonths(nextDate, interval);
              break;
            case "custom":
              // Fallback para diário se não especificado
              nextDate = addDays(nextDate, interval);
              break;
          }
        }

        const nextDateISO = nextDate.toISOString();

        // Verificar data fim
        let shouldCreate = true;
        if (currentTask.recurrence_end_date) {
          const endDate = parseISO(currentTask.recurrence_end_date);
          if (isAfter(nextDate, endDate)) {
            shouldCreate = false;
          }
        }

        // Verificar contagem
        let nextCount = currentTask.recurrence_count;
        if (shouldCreate && typeof nextCount === "number") {
          if (nextCount <= 0) {
            nextCount = null;
          } else if (nextCount > 1) {
            nextCount = nextCount - 1;
          } else {
            shouldCreate = false;
          }
        }

        if (shouldCreate) {
          console.log("[updateTask] Criando próxima ocorrência para:", nextDateISO);

          const parentId = (currentTask as any).recurrence_parent_id || currentTask.id;

          // Validar group_id: grupo pode ter sido deletado desde que a tarefa foi criada
          let recurrenceGroupId: string | null = null;
          const currentGroupId = currentTask.group_id && String(currentTask.group_id).trim() ? currentTask.group_id : null;
          if (currentGroupId) {
            const { data: groupRow } = await (supabase as any)
              .from("task_groups")
              .select("id, workspace_id")
              .eq("id", currentGroupId)
              .single();
            if (groupRow && typeof groupRow === "object" && "id" in groupRow && groupRow.workspace_id === (currentTask.workspace_id ?? null)) {
              recurrenceGroupId = groupRow.id;
            }
          }

          await createTask({
            title: currentTask.title,
            description: currentTask.description || undefined,
            workspace_id: currentTask.workspace_id,
            is_personal: currentTask.is_personal,
            status: "todo",
            priority: (currentTask.priority || "medium") as "low" | "medium" | "high" | "urgent",
            assignee_id: currentTask.assignee_id,
            due_date: nextDateISO,
            origin_context: currentTask.origin_context,
            group_id: recurrenceGroupId,
            tags: currentTask.tags || [],
            subtasks: currentTask.subtasks || [],
            recurrence_type: currentTask.recurrence_type,
            recurrence_interval: currentTask.recurrence_interval,
            recurrence_end_date: currentTask.recurrence_end_date,
            recurrence_days: (currentTask as any).recurrence_days || null,
            recurrence_count: nextCount,
            recurrence_parent_id: parentId,
          });
        }
      }
    } catch (recError) {
      console.error("[updateTask] Erro ao processar recorrência:", recError);
      // Não falhar o update principal se a recorrência falhar
    }
  }

  revalidatePath("/tasks");
  return { success: true, data: null };
}

interface UpdateTaskPositionParams {
  taskId: string;
  newPosition: number;
  newStatus?: "todo" | "in_progress" | "review" | "correction" | "done" | "archived";
  assignee_id?: string | null;
  priority?: "low" | "medium" | "high" | "urgent";
  status?: "todo" | "in_progress" | "review" | "correction" | "done" | "archived";
  group_id?: string | null;
  workspace_id?: string | null;
}

/**
 * Atualiza a posição de uma tarefa (para drag & drop)
 * Versão com objeto de parâmetros
 * 
 * ✅ USA RPC `move_task` para contornar problemas de RLS
 * ✅ Lida corretamente com retorno VOID da RPC
 */
export async function updateTaskPosition(params: UpdateTaskPositionParams) {
  try {
    const supabase = await createServerActionClient();

    // 1. Chamada da RPC (Sem esperar retorno de dados - RPC retorna VOID)
    console.log("[Server Action] Chamando RPC move_task:", {
      taskId: params.taskId,
      newPosition: params.newPosition,
      timestamp: new Date().toISOString()
    });

    // @ts-ignore - Função RPC move_task definida no banco, mas não nos tipos TypeScript ainda
    const { error: rpcError } = await supabase.rpc('move_task', {
      p_task_id: params.taskId,
      p_new_position: params.newPosition
    });

    if (rpcError) {
      console.error("[Server Action] ❌ Erro na RPC move_task:", rpcError);
      console.error("[Server Action] Detalhes do erro:", {
        message: rpcError.message,
        details: rpcError.details,
        hint: rpcError.hint,
        code: rpcError.code
      });

      // ✅ FALLBACK: Se a RPC não existir ou houver problema de cache, usar update direto
      if (rpcError.message?.includes('Could not find the function') ||
        rpcError.message?.includes('function') && rpcError.message?.includes('not found') ||
        rpcError.message?.includes('schema cache')) {
        console.warn("[Server Action] RPC move_task não encontrada, usando fallback de update direto");

        // Preparar objeto de update incluindo position
        const updates: any = { position: params.newPosition };
        if (params.newStatus) updates.status = params.newStatus;
        if (params.status) updates.status = params.status;
        if (params.priority) updates.priority = params.priority;
        if (params.assignee_id !== undefined) updates.assignee_id = params.assignee_id;
        if (params.group_id !== undefined) updates.group_id = params.group_id;
        if (params.workspace_id !== undefined) updates.workspace_id = params.workspace_id;

        // Tentar update direto (pode falhar por RLS)
        const { data, error: updateError } = await supabase
          .from("tasks")
          .update(updates)
          .eq("id", params.taskId)
          .select("id, position, group_id, status, priority")
          .single();

        if (updateError) {
          console.error("[Server Action] Erro no fallback de update:", updateError);
          return {
            success: false,
            error: `Falha ao mover tarefa: ${updateError.message}. Execute o script SCRIPT_CRIAR_MOVE_TASK.sql no Supabase.`
          };
        }

        if (!data) {
          return { success: false, error: "Nenhuma linha atualizada (verifique RLS ou workspace_id)" };
        }

        return { success: true, data };
      }

      return { success: false, error: `Falha ao mover tarefa: ${rpcError.message} ` };
    }

    // 2. Se houver mudança de status/priority/group, atualiza separadamente
    const additionalUpdates: any = {};

    if (params.newStatus) additionalUpdates.status = params.newStatus;
    if (params.status) additionalUpdates.status = params.status;
    if (params.priority) additionalUpdates.priority = params.priority;
    if (params.assignee_id !== undefined) additionalUpdates.assignee_id = params.assignee_id;
    if (params.group_id !== undefined) additionalUpdates.group_id = params.group_id;
    if (params.workspace_id !== undefined) additionalUpdates.workspace_id = params.workspace_id;

    // Se houver campos adicionais para atualizar, fazer um update separado
    if (Object.keys(additionalUpdates).length > 0) {
      const { error: updateError } = await supabase
        .from("tasks")
        .update(additionalUpdates)
        .eq("id", params.taskId);

      if (updateError) {
        console.error("[Server Action] Erro ao atualizar campos adicionais:", updateError);
        // Não falhar completamente, pois a posição já foi atualizada
        // Mas logar o erro para debug
      }
    }

    // 3. Sucesso (Não verifique 'data' aqui! RPC retorna VOID)
    console.log("[Server Action] ✅ RPC move_task executada com sucesso (retorno VOID)");
    return { success: true };

  } catch (error: any) {
    console.error("[Server Action] Erro inesperado ao mover tarefa:", error);
    return { success: false, error: error?.message || "Erro interno ao salvar ordem" };
  }
}

/**
 * Atualiza múltiplas posições de tarefas em lote (para drag & drop em massa)
 * 
 * ✅ USA RPC `move_tasks_bulk` para contornar problemas de RLS e melhorar performance
 */
export async function updateTaskPositionsBulk(updates: { id: string; position: number }[]) {
  try {
    const supabase = await createServerActionClient();

    // Validar entrada
    if (!updates || updates.length === 0) {
      return { success: false, error: "Nenhuma atualização fornecida" };
    }

    // Chama a nova RPC passando o array como JSON
    console.log("[Server Action] Chamando RPC move_tasks_bulk:", {
      totalUpdates: updates.length,
      firstFew: updates.slice(0, 3),
      timestamp: new Date().toISOString()
    });

    // @ts-ignore - Função RPC move_tasks_bulk definida no banco, mas não nos tipos TypeScript ainda
    const { error } = await supabase.rpc('move_tasks_bulk', {
      p_updates: updates
    });

    if (error) {
      console.error("[Server Action] Erro na RPC move_tasks_bulk:", error);
      console.error("[Server Action] Detalhes do erro:", {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });

      // ✅ FALLBACK: Se a RPC não existir ou houver problema de cache, usar updates individuais
      if (error.message?.includes('Could not find the function') ||
        error.message?.includes('function') && error.message?.includes('not found') ||
        error.message?.includes('schema cache')) {
        console.warn("[Server Action] RPC move_tasks_bulk não encontrada, usando fallback de updates individuais");

        // Tentar fazer updates individuais (pode falhar por RLS, mas é melhor que quebrar)
        const results = await Promise.allSettled(
          updates.map((update) =>
            supabase
              .from("tasks")
              .update({ position: update.position })
              .eq("id", update.id)
          )
        );

        const failures = results.filter((r) => r.status === 'rejected' || (r.status === 'fulfilled' && r.value.error));

        if (failures.length > 0) {
          console.error(`[Server Action] ${failures.length} de ${updates.length} updates falharam no fallback`);
          return {
            success: false,
            error: `Erro Bulk: ${failures.length} de ${updates.length} tarefas não puderam ser atualizadas.Execute o script SCRIPT_REFRESH_BULK_CACHE.sql no Supabase.`
          };
        }

        console.log(`[Server Action] ✅ Fallback: ${updates.length} tarefas atualizadas individualmente`);
        return { success: true };
      }

      return { success: false, error: `Erro Bulk: ${error.message} ` };
    }

    // ✅ SEMPRE verificar se as posições foram realmente atualizadas (amostra)
    // Verificar TODAS as tarefas, não apenas uma amostra
    if (updates.length > 0) {
      const allIds = updates.map(u => u.id);
      const { data: verifyData, error: verifyError } = await supabase
        .from("tasks")
        .select("id, position")
        .in("id", allIds);

      if (verifyError) {
        console.error("[Server Action] ❌ Erro ao verificar bulk update:", verifyError);
        return {
          success: false,
          error: `Erro ao verificar atualizações: ${verifyError.message} `
        };
      } else if (verifyData) {
        const updatesMap = new Map(updates.map(u => [u.id, u.position]));
        let hasErrors = false;
        const errors: string[] = [];

        verifyData.forEach((task) => {
          const expected = updatesMap.get(task.id);
          if (expected !== undefined && task.position !== null) {
            const diff = Math.abs(task.position - expected);
            if (diff > 0.01) {
              hasErrors = true;
              const errorMsg = `Tarefa ${task.id}: Esperado ${expected}, Salvo ${task.position} `;
              errors.push(errorMsg);
              console.error(`[Server Action] ❌ ${errorMsg} `);
            } else {
              console.log(`[Server Action] ✅ Tarefa ${task.id}: Posição ${task.position} confirmada`);
            }
          } else if (expected !== undefined) {
            hasErrors = true;
            const errorMsg = `Tarefa ${task.id}: Position é null no banco`;
            errors.push(errorMsg);
            console.error(`[Server Action] ❌ ${errorMsg} `);
          }
        });

        // Verificar se alguma tarefa não foi encontrada
        const foundIds = new Set(verifyData.map(t => t.id));
        updates.forEach(u => {
          if (!foundIds.has(u.id)) {
            hasErrors = true;
            const errorMsg = `Tarefa ${u.id}: Não encontrada no banco após update`;
            errors.push(errorMsg);
            console.error(`[Server Action] ❌ ${errorMsg} `);
          }
        });

        if (hasErrors) {
          console.error(`[Server Action] ❌ PROBLEMA CRÍTICO: ${errors.length} de ${updates.length} tarefas não foram atualizadas corretamente`);
          return {
            success: false,
            error: `Erro no bulk update: ${errors.slice(0, 3).join('; ')}${errors.length > 3 ? '...' : ''}. Execute SCRIPT_VERIFICAR_POSICOES_SALVAS.sql para diagnosticar.`
          };
        }
      }
    }

    console.log(`[Server Action] ✅ Bulk update concluído: ${updates.length} tarefas processadas`);
    return { success: true };
  } catch (error: any) {
    console.error("[Server Action] Erro ao salvar bulk:", error);
    return { success: false, error: error?.message || "Falha no salvamento em lote" };
  }
}

/**
 * Atualiza a posição de uma tarefa (para drag & drop)
 * Versão simplificada com parâmetros separados (compatibilidade)
 * 
 * @deprecated Use a versão com objeto de parâmetros. Esta função será removida em versões futuras.
 */
export async function updateTaskPositionSimple(
  taskId: string,
  status: string,
  order: number
) {
  try {
    const supabase = await createServerActionClient();

    // Mapear status customizável para status do banco
    const statusMap: Record<string, "todo" | "in_progress" | "done" | "archived"> = {
      "Não iniciada": "todo",
      "Em progresso": "in_progress",
      "Concluída": "done",
      "Arquivada": "archived",
      "todo": "todo",
      "in_progress": "in_progress",
      "done": "done",
      "archived": "archived",
    };

    const dbStatus = statusMap[status] || status as "todo" | "in_progress" | "done" | "archived";

    // Preparar objeto de update
    const updates: any = {
      position: order,
      status: dbStatus
    };

    const { error } = await supabase
      .from("tasks")
      .update(updates)
      .eq("id", taskId);

    if (error) {
      console.error("[Server Action] Erro ao atualizar posição:", error);
      throw new Error(error.message);
    }

    return { success: true };
  } catch (error: any) {
    console.error("[Server Action] Erro inesperado:", error);
    throw error;
  }
}

/**
 * Deleta uma tarefa
 */
/**
 * Busca informações sobre recorrência de uma tarefa
 */
export async function getTaskRecurrenceInfo(taskId: string): Promise<{
  isRecurring: boolean;
  parentId: string | null;
  recurrenceType: string | null;
  relatedTasksCount: number;
}> {
  const supabase = await createServerActionClient();

  // Buscar a tarefa
  const { data: task, error: taskError } = await supabase
    .from("tasks")
    .select("recurrence_type, recurrence_parent_id, id")
    .eq("id", taskId)
    .single();

  if (taskError || !task) {
    return {
      isRecurring: false,
      parentId: null,
      recurrenceType: null,
      relatedTasksCount: 0,
    };
  }

  const taskAny = task as any;
  const isRecurring = !!taskAny.recurrence_type || !!taskAny.recurrence_parent_id;
  const parentId = taskAny.recurrence_parent_id || (taskAny.recurrence_type ? taskAny.id : null);

  if (!parentId) {
    return {
      isRecurring: false,
      parentId: null,
      recurrenceType: null,
      relatedTasksCount: 0,
    };
  }

  // Contar tarefas relacionadas (filhas do mesmo parent ou o parent + filhas)
  // Se a tarefa atual é o parent, contar ela + todas as filhas
  // Se a tarefa atual é filha, contar o parent + todas as filhas (incluindo ela mesma)
  const { count, error: countError } = await supabase
    .from("tasks")
    .select("*", { count: "exact", head: true })
    .or(`recurrence_parent_id.eq.${parentId}, id.eq.${parentId} `);

  const relatedTasksCount = countError ? 0 : (count || 0);

  return {
    isRecurring,
    parentId,
    recurrenceType: taskAny.recurrence_type || null,
    relatedTasksCount,
  };
}

export async function deleteTask(id: string, deleteAll: boolean = false) {
  const supabase = await createServerActionClient();

  // Se deleteAll, buscar todas as tarefas relacionadas
  if (deleteAll) {
    // Buscar informações de recorrência
    const recurrenceInfo = await getTaskRecurrenceInfo(id);

    if (recurrenceInfo.isRecurring && recurrenceInfo.parentId) {
      // Excluir todas as tarefas da série (parent + todas as filhas)
      // Usar .or() para excluir tanto o parent quanto todas as filhas em uma única query
      const { error } = await supabase
        .from("tasks")
        .delete()
        .or(`recurrence_parent_id.eq.${recurrenceInfo.parentId}, id.eq.${recurrenceInfo.parentId} `);

      if (error) {
        console.error("Erro ao deletar tarefas recorrentes:", error);
        return { success: false, error: error.message };
      }

      revalidatePath("/tasks");
      return { success: true };
    }
  }

  // Excluir apenas a tarefa específica
  const { error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Erro ao deletar tarefa:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/tasks");
  return { success: true };
}

/**
 * Duplica uma tarefa (copia todos os dados exceto ID e created_at)
 */
export async function duplicateTask(taskId: string) {
  const supabase = await createServerActionClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Usuário não autenticado" };
  }

  // Buscar a tarefa original completa
  const { data: originalTask, error: fetchError } = await supabase
    .from("tasks")
    .select("*")
    .eq("id", taskId)
    .single();

  if (fetchError || !originalTask) {
    console.error("Erro ao buscar tarefa:", fetchError);
    return { success: false, error: "Tarefa não encontrada" };
  }

  // Preparar dados para a nova tarefa
  // Copia todos os campos exceto: id, created_at, updated_at
  // E redefine created_by para o usuário atual
  const taskData: any = {
    title: `${originalTask.title} (Cópia)`,
    description: originalTask.description,
    status: originalTask.status || "todo",
    priority: originalTask.priority || "medium",
    position: originalTask.position || 0,
    due_date: originalTask.due_date,
    is_personal: originalTask.is_personal ?? false,
    workspace_id: originalTask.workspace_id,
    assignee_id: originalTask.assignee_id,
    created_by: user.id, // Usuário atual é o criador da cópia
    origin_context: originalTask.origin_context,
    // Campos que podem não existir em todas as versões do schema
    group_id: (originalTask as any).group_id || null,
    tags: (originalTask as any).tags || [],
    subtasks: (originalTask as any).subtasks || [],
  };

  // Inserir a nova tarefa
  const { data: newTask, error: insertError } = await supabase
    .from("tasks")
    .insert(taskData)
    .select()
    .single();

  if (insertError) {
    console.error("Erro ao duplicar tarefa:", insertError);

    if (
      insertError.code === "PGRST301" ||
      insertError.code === "42501" ||
      insertError.message.includes("permission") ||
      insertError.message.includes("policy") ||
      insertError.message.includes("RLS")
    ) {
      return {
        success: false,
        error: "Erro de permissão no banco de dados. Verifique as políticas RLS no Supabase.",
      };
    }

    return { success: false, error: insertError.message };
  }

  revalidatePath("/tasks");
  return { success: true, data: newTask };
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
    user: user_id(
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
 * getWorkspaceIdBySlug
 * 
 * Resolve o workspaceId a partir do slug.
 * Retorna null se o slug for inválido ou o usuário não tiver acesso.
 */
export async function getWorkspaceIdBySlug(workspaceSlug: string): Promise<string | null> {
  if (!workspaceSlug) {
    console.warn("[getWorkspaceIdBySlug] Slug vazio ou inválido");
    return null;
  }

  const supabase = await createServerActionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const cacheKey = `${user.id}:${workspaceSlug}`;
  const cached = readCache(workspaceIdBySlugCache, cacheKey);
  if (cached && cached.value !== null) {
    return cached.value;
  }

  const { getUserWorkspaces } = await import("@/lib/actions/user");
  const workspaces = await getUserWorkspaces();

  // Buscar pelo slug (preferencial) ou id (fallback)
  const matchedWorkspace =
    workspaces.find((w) => w.slug === workspaceSlug) ??
    workspaces.find((w) => w.id === workspaceSlug) ??
    null;

  if (matchedWorkspace) {
    writeCache(workspaceIdBySlugCache, cacheKey, matchedWorkspace.id);
    return matchedWorkspace.id;
  }

  // Fallback: buscar direto no banco para evitar cache stale de workspaces
  const { data: workspaceBySlug } = await supabase
    .from("workspaces")
    .select("id")
    .eq("slug", workspaceSlug)
    .single();

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    workspaceSlug
  );
  let workspaceId = workspaceBySlug?.id || (isUuid ? workspaceSlug : null);
  if (workspaceId) {
    const { data: membership } = await supabase
      .from("workspace_members")
      .select("workspace_id")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .single();

    if (membership?.workspace_id) {
      writeCache(workspaceIdBySlugCache, cacheKey, membership.workspace_id);
      return membership.workspace_id;
    }
  }

  // Fallback admin: evita cache/RLS stale logo após aceitar convite
  try {
    const supabaseAdmin = await createServiceRoleClient();
    if (!workspaceId) {
      const { data: adminWorkspace } = await supabaseAdmin
        .from("workspaces")
        .select("id")
        .eq("slug", workspaceSlug)
        .single();
      workspaceId = adminWorkspace?.id || null;
    }

    if (workspaceId) {
      const { data: adminMembership } = await supabaseAdmin
        .from("workspace_members")
        .select("workspace_id")
        .eq("workspace_id", workspaceId)
        .eq("user_id", user.id)
        .single();

      if (adminMembership?.workspace_id) {
        writeCache(workspaceIdBySlugCache, cacheKey, adminMembership.workspace_id);
        return adminMembership.workspace_id;
      }
    }
  } catch (error) {
    console.warn("[getWorkspaceIdBySlug] Falha ao validar acesso com admin:", error);
  }

  console.warn(`[getWorkspaceIdBySlug] Workspace não encontrado para slug: ${workspaceSlug}`);
  return null;
}

/**
 * getTasksForWorkspace
 * 
 * Busca tarefas de um workspace específico com filtros obrigatórios.
 * 
 * ✅ TRAVA DE SEGURANÇA: Retorna array vazio se workspaceId for inválido.
 * ✅ FILTROS OBRIGATÓRIOS:
 *   - workspace_id: Apenas tarefas do workspace especificado
 *   - status: Exclui tarefas arquivadas (soft delete via status "archived")
 *   - Ordem: position (para DND) e created_at
 * 
 * @param workspaceId - ID do workspace (OBRIGATÓRIO)
 * @returns Array de tarefas filtradas ou array vazio se workspaceId for inválido
 */
export async function getTasksForWorkspace(workspaceId: string, tag?: string | null): Promise<TaskWithDetails[]> {
  // ✅ 1. TRAVA: Garante que nunca faremos uma busca global se o ID for inválido
  if (!workspaceId) {
    console.warn("[getTasksForWorkspace] workspaceId não fornecido - retornando array vazio por segurança");
    return [];
  }

  const supabase = await createServerActionClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    console.warn("[getTasksForWorkspace] Usuário não autenticado");
    return [];
  }

  // ✅ SEGURANÇA: Verificar se usuário é membro do workspace
  const { data: membership } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .single();

  if (!membership) {
    console.warn(`[getTasksForWorkspace] Acesso negado: Usuário ${user.id} tentou acessar workspace ${workspaceId} sem ser membro`);
    return []; // Retornar vazio se não for membro
  }

  // ✅ 2. FILTROS OBRIGATÓRIOS: Scope, Status e Ordem
  let query = supabase
    .from("tasks")
    .select(`
    *,
    assignee: assignee_id(
      full_name,
      email,
      avatar_url
    ),
      creator: created_by(
        full_name
      ),
        group: group_id(
          id,
          name,
          color,
          workspace_id
        ),
          task_members(
            user: user_id(
              id,
              full_name,
              email,
              avatar_url
            )
          )
            `)
    .eq("workspace_id", workspaceId) // ✅ Scope: Apenas tarefas do workspace
    .neq("status", "archived") // ✅ Status: Exclui tarefas arquivadas (soft delete via status)
    .or("visible_on_board.eq.true,visible_on_board.is.null"); // ✅ Quadro: só tarefas liberadas para o quadro (null = legado)

  // ✅ Filtro de tag (projeto) se fornecido
  if (tag) {
    // Debug log (apenas em desenvolvimento)
    if (process.env.NODE_ENV === 'development') {
      console.log('[getTasksForWorkspace] Aplicando filtro de tag:', { tag, workspaceId });
    }
    query = query.contains("tags", [tag]);
  }

  // ✅ Aplicar ordenação
  query = query
    .order("position", { ascending: true }) // ✅ Ordem: Para DND
    .order("created_at", { ascending: false }); // ✅ Ordem: Mais recentes primeiro

  // ✅ Executar query
  const { data, error } = await query;

  if (error) {
    console.error("[getTasksForWorkspace] Erro ao buscar tarefas:", error);
    return [];
  }

  // Debug log (apenas em desenvolvimento)
  if (process.env.NODE_ENV === 'development') {
    console.log('[getTasksForWorkspace] Query executada:', {
      tag,
      totalTasks: data?.length || 0,
      hasError: !!error
    });
    if (tag && data && data.length > 0) {
      // Verificar se as tarefas retornadas realmente têm a tag
      const tasksWithTag = data.filter((task: any) =>
        task.tags && Array.isArray(task.tags) && task.tags.includes(tag)
      );
      console.log('[getTasksForWorkspace] Tarefas com tag:', {
        expectedTag: tag,
        tasksWithTag: tasksWithTag.length,
        allTasks: data.length
      });
    }
  }

  if (!data || data.length === 0) {
    return [];
  }

  // ✅ Filtro adicional: Verificar se grupos são válidos
  let validGroupIds: Set<string> | null = null;

  try {
    const { data: validGroups } = await (supabase as any)
      .from("task_groups")
      .select("id")
      .eq("workspace_id", workspaceId);

    if (validGroups && Array.isArray(validGroups)) {
      validGroupIds = new Set(validGroups.map((g: any) => g.id));
    }
  } catch (error) {
    console.error("[getTasksForWorkspace] Erro ao buscar grupos válidos:", error);
    // Continuar sem filtro de grupos em caso de erro
  }

  // ✅ Filtro 3: Aplicar filtros de hierarquia e integridade
  const filteredData = (data as any[]).filter((task) => {
    // ✅ 3.1: Excluir tarefas arquivadas (já filtrado na query, mas garantindo aqui também)
    if (task.status === "archived") {
      return false;
    }

    // ✅ 3.2: Se a tarefa tem grupo, verificar se o grupo é válido
    if (task.group_id) {
      // Se o grupo não existe (group é null), excluir tarefa
      if (!task.group || !task.group.id) {
        return false;
      }

      // Se temos lista de grupos válidos, verificar se o grupo está nela
      if (validGroupIds !== null) {
        if (!validGroupIds.has(task.group.id)) {
          return false; // Grupo não pertence ao workspace correto
        }
      } else {
        // Verificar se grupo pertence ao workspace
        if (task.group.workspace_id !== workspaceId) {
          return false;
        }
      }
    }

    // ✅ 3.3: Tarefas sem grupo são válidas (se atendem outros critérios)
    return true;
  });

  // Buscar contagem de comentários para cada tarefa
  const taskIds = filteredData.map((t: any) => t.id);
  const commentCountMap: Record<string, number> = {};

  if (taskIds.length > 0) {
    const { data: commentsData, error: commentsError } = await supabase
      .from("task_comments")
      .select("task_id")
      .in("task_id", taskIds);

    if (commentsError) {
      console.error("[getTasksForWorkspace] Erro ao buscar contagem de comentários:", commentsError);
    } else if (commentsData) {
      commentsData.forEach((comment: any) => {
        commentCountMap[comment.task_id] = (commentCountMap[comment.task_id] || 0) + 1;
      });
    }
  }

  // Adicionar contagem de comentários e transformar membros
  return filteredData.map((task) => {
    const transformed = transformTaskWithMembers({
      ...task,
      comment_count: commentCountMap[task.id] || 0,
    });
    return transformed;
  }) as unknown as TaskWithDetails[];
}

/**
 * Busca membros do workspace
 *
 * Regra importante:
 *  - A lista de members **sempre** deve incluir o usuário logado (currentUser),
 *    mesmo que ele ainda não esteja registrado em `workspace_members`.
 */
export async function getWorkspaceMembers(workspaceId: string | null) {
  const supabase = await createServerActionClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return [];

  // Caso de tarefas pessoais (sem workspace): retornamos somente o próprio usuário
  if (!workspaceId) {
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
  user: user_id(
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

  // Mapear membros - tratar user como array ou objeto (dependendo de como o Supabase retorna)
  const members = (data || [])
    .map((member: any) => {
      // Tratar user como array ou objeto (similar ao tratamento em members.ts)
      const userData = Array.isArray(member.user)
        ? member.user[0]
        : member.user;
      return userData;
    })
    .filter(Boolean);

  // Garante que o usuário logado esteja presente na lista de membros
  const hasCurrentUser = members.some((m: any) => m.id === user.id);

  if (!hasCurrentUser) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (profile) {
      members.push(profile);
    }
  }

  return members;
}

/**
 * Busca membros de múltiplos workspaces de uma vez (otimização de performance)
 * Reduz N queries para 1 query única
 */
export async function getWorkspaceMembersBatch(workspaceIds: string[]): Promise<Map<string, Array<{ id: string; name: string; avatar?: string }>>> {
  const supabase = await createServerActionClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !workspaceIds || workspaceIds.length === 0) {
    return new Map();
  }

  // Buscar todos os membros de todos os workspaces de uma vez
  const { data, error } = await supabase
    .from("workspace_members")
    .select(`
  workspace_id,
    user: user_id(
      id,
      full_name,
      email,
      avatar_url
    )
      `)
    .in("workspace_id", workspaceIds);

  if (error) {
    console.error("Erro ao buscar membros em batch:", error);
    return new Map();
  }

  // Organizar membros por workspace_id
  const membersMap = new Map<string, Array<{ id: string; name: string; avatar?: string }>>();

  // Inicializar mapas vazios para cada workspace
  workspaceIds.forEach(wsId => {
    membersMap.set(wsId, []);
  });

  // Processar dados retornados
  (data || []).forEach((member: any) => {
    const workspaceId = member.workspace_id;
    const userData = Array.isArray(member.user) ? member.user[0] : member.user;

    if (userData && workspaceId) {
      const existing = membersMap.get(workspaceId) || [];
      existing.push({
        id: userData.id,
        name: userData.full_name || userData.email || "Usuário",
        avatar: userData.avatar_url || undefined,
      });
      membersMap.set(workspaceId, existing);
    }
  });

  // Garantir que o usuário atual esteja em cada workspace
  const { data: currentUserProfile } = await supabase
    .from("profiles")
    .select("id, full_name, email, avatar_url")
    .eq("id", user.id)
    .single();

  if (currentUserProfile) {
    const currentUser = {
      id: currentUserProfile.id,
      name: currentUserProfile.full_name || currentUserProfile.email || "Usuário",
      avatar: currentUserProfile.avatar_url || undefined,
    };

    workspaceIds.forEach(wsId => {
      const existing = membersMap.get(wsId) || [];
      const hasCurrentUser = existing.some(m => m.id === user.id);
      if (!hasCurrentUser) {
        existing.push(currentUser);
        membersMap.set(wsId, existing);
      }
    });
  }

  return membersMap;
}

/**
 * bulkArchiveTasks
 * 
 * Arquiva tarefas em massa de forma eficiente (single SQL update).
 * 
 * @param workspaceId - ID do workspace
 * @param options - Opções de filtro:
 *  - groupId: ID do grupo a limpar (se null/undefined ou "inbox", limpa inbox)
 *  - completedOnly: Se true, arquiva apenas tarefas concluídas
 */
export async function bulkArchiveTasks(
  workspaceId: string,
  options: {
    groupId?: string | null;
    completedOnly?: boolean
  }
): Promise<{ success: boolean; error?: string; count?: number }> {
  const supabase = await createServerActionClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Usuário não autenticado" };
  }

  if (!workspaceId) {
    return { success: false, error: "Workspace ID obrigatório" };
  }

  try {
    // Verificar permissão no workspace
    const { data: membership } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .single();

    if (!membership) {
      return { success: false, error: "Acesso negado ao workspace" };
    }

    // Construir query de update
    let query = supabase
      .from("tasks")
      .update({ status: 'archived' })
      .eq("workspace_id", workspaceId)
      .neq("status", "archived"); // Evitar re-arquivar

    // Filtro de Grupo
    if (!options.groupId || options.groupId === "inbox" || options.groupId === "Inbox") {
      // Inbox = group_id IS NULL
      // IMPORTANTE: Apenas arquivar tarefas que estão no quadro (visible_on_board = true)
      // para não afetar tarefas do WeeklyView que ainda não foram enviadas para o quadro
      query = query.is("group_id", null).eq("visible_on_board", true);
    } else {
      // Grupo específico
      query = query.eq("group_id", options.groupId);
    }

    // Filtro de Concluídas
    if (options.completedOnly) {
      query = query.eq("status", "done");
    }

    // Executar
    const { data, error } = await query.select("id");
    const count = data ? data.length : 0;

    if (error) {
      // Log detalhado do erro
      console.error("Erro ao arquivar tarefas em massa:", error);
      return { success: false, error: error.message };
    }

    // Revalidar path
    revalidatePath("/tasks");

    return { success: true, count: count || 0 };
  } catch (e) {
    console.error("Erro inesperado ao arquivar tarefas em massa:", e);
    return { success: false, error: "Erro inesperado" };
  }
}
