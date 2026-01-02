"use server";

import { createServerActionClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { Database } from "@/types/database.types";

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

  return {
    ...task,
    assignees,
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
}) {
  const supabase = await createServerActionClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  // ✅ SEGURANÇA E LÓGICA: Fail-safe
  // Exceção: Se assigneeId === "current" (aba "Minhas"), permitir buscar sem workspaceId
  const isMinhasTab = filters?.assigneeId === "current";
  
  if (filters?.workspaceId === undefined && !isMinhasTab) {
    console.warn(`[getTasks] workspaceId não especificado e não é aba "Minhas" - retornando array vazio por segurança`);
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
    // ✅ Filtro 1: Soft Delete - Excluir tarefas arquivadas
    .neq("status", "archived")
    .order("position", { ascending: true })
    .order("created_at", { ascending: false });

  // ✅ LÓGICA CORRIGIDA: Aplicar filtro baseado no tipo de workspaceId
  if (filters?.workspaceId === undefined) {
    // Aba "Minhas": Não aplicar filtro de workspace (buscar de todos os workspaces)
    // O filtro de assignee será aplicado abaixo
  } else if (filters.workspaceId === null) {
    // Tarefas Pessoais (sem workspace e criadas pelo usuário)
    query = query.is("workspace_id", null).eq("created_by", user.id);
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

  let { data, error } = await query;
  
  // Se estamos na aba "Minhas" e há tarefas em task_members, buscar também essas tarefas
  if (filters?.assigneeId === "current" && isMinhasTab) {
      const { data: taskMemberTasks } = await supabase
        .from("task_members")
        .select(`
          task_id,
          tasks:task_id (
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
          )
        `)
        .eq("user_id", user.id);
      
      if (taskMemberTasks && taskMemberTasks.length > 0) {
          const tasksFromMembers = taskMemberTasks
            .map((tm: any) => tm.tasks)
            .filter((task: any) => task && task.status !== "archived" && task.assignee_id !== user.id);
          
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
    return [];
  }

  if (!data || data.length === 0) {
    return [];
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
    const { data: commentsData, error: commentsError } = await supabase
      .from("task_comments")
      .select("task_id")
      .in("task_id", taskIds);
    
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

  // Verificar se usuário é membro do workspace
  const { data: membership } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .single();

  if (!membership) return [];

  // Buscar todas as tags do workspace (de tarefas)
  const { data: tasks, error } = await supabase
    .from("tasks")
    .select("tags")
    .eq("workspace_id", workspaceId)
    .neq("status", "archived");

  // Extrair tags únicas de tarefas
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

  // Buscar tags que têm ícones salvos (projetos criados sem tarefas ainda)
  const { data: projectIcons, error: iconsError } = await supabase
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
  group_id?: string | null;
  tags?: string[];
  subtasks?: any[];
  recurrence_type?: "daily" | "weekly" | "monthly" | "custom" | null;
  recurrence_interval?: number | null;
  recurrence_end_date?: string | null;
  recurrence_count?: number | null;
}) {
  const supabase = await createServerActionClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "Usuário não autenticado" };

  // Define se é pessoal ou de workspace
  const is_personal = data.is_personal ?? (!data.workspace_id);

  // Verificar acesso do workspace (gatekeeper) - apenas para tarefas de workspace
  if (!is_personal && data.workspace_id) {
    const { checkWorkspaceAccess } = await import("@/lib/utils/subscription");
    const accessCheck = await checkWorkspaceAccess(data.workspace_id);
    
    if (!accessCheck.allowed) {
      return {
        success: false,
        error: accessCheck.reason || "Seu trial expirou. Escolha um plano para continuar criando tarefas.",
      };
    }
  }

  // Garantir que subtasks seja um JSON válido
  const subtasks = data.subtasks ? JSON.parse(JSON.stringify(data.subtasks)) : [];

  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/3cb1781a-45f3-4822-84f0-70123428e0e4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/actions/tasks.ts:479',message:'BUG-RECURRENCE: createTask insert data',data:{title:data.title,recurrence_type:data.recurrence_type,recurrence_interval:data.recurrence_interval,is_personal},timestamp:Date.now(),sessionId:'debug-session',runId:'bug-investigation-recurrence',hypothesisId:'bug-recurrence-create'})}).catch(()=>{});
  // #endregion

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
    group_id: data.group_id || null,
    tags: data.tags || [],
    subtasks: subtasks,
    recurrence_type: data.recurrence_type || null,
    recurrence_interval: data.recurrence_interval || null,
    recurrence_end_date: data.recurrence_end_date || null,
    recurrence_count: data.recurrence_count || null,
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

  console.log("[updateTask] Atualizando tarefa:", { id, updates });

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
  revalidatePath("/tasks");
  revalidatePath("/home");
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
            
            return { success: false, error: `Falha ao mover tarefa: ${rpcError.message}` };
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
                        error: `Erro Bulk: ${failures.length} de ${updates.length} tarefas não puderam ser atualizadas. Execute o script SCRIPT_REFRESH_BULK_CACHE.sql no Supabase.` 
                    };
                }
                
                console.log(`[Server Action] ✅ Fallback: ${updates.length} tarefas atualizadas individualmente`);
                return { success: true };
            }
            
            return { success: false, error: `Erro Bulk: ${error.message}` };
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
                    error: `Erro ao verificar atualizações: ${verifyError.message}` 
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
                            const errorMsg = `Tarefa ${task.id}: Esperado ${expected}, Salvo ${task.position}`;
                            errors.push(errorMsg);
                            console.error(`[Server Action] ❌ ${errorMsg}`);
                        } else {
                            console.log(`[Server Action] ✅ Tarefa ${task.id}: Posição ${task.position} confirmada`);
                        }
                    } else if (expected !== undefined) {
                        hasErrors = true;
                        const errorMsg = `Tarefa ${task.id}: Position é null no banco`;
                        errors.push(errorMsg);
                        console.error(`[Server Action] ❌ ${errorMsg}`);
                    }
                });
                
                // Verificar se alguma tarefa não foi encontrada
                const foundIds = new Set(verifyData.map(t => t.id));
                updates.forEach(u => {
                    if (!foundIds.has(u.id)) {
                        hasErrors = true;
                        const errorMsg = `Tarefa ${u.id}: Não encontrada no banco após update`;
                        errors.push(errorMsg);
                        console.error(`[Server Action] ❌ ${errorMsg}`);
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
    .or(`recurrence_parent_id.eq.${parentId},id.eq.${parentId}`);

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
        .or(`recurrence_parent_id.eq.${recurrenceInfo.parentId},id.eq.${recurrenceInfo.parentId}`);

      if (error) {
        console.error("Erro ao deletar tarefas recorrentes:", error);
        return { success: false, error: error.message };
      }

      revalidatePath("/tasks");
      revalidatePath("/home");
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
  revalidatePath("/home");
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
  revalidatePath("/home");
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

  const { getUserWorkspaces } = await import("@/lib/actions/user");
  const workspaces = await getUserWorkspaces();

  // Buscar pelo slug (preferencial) ou id (fallback)
  const matchedWorkspace =
    workspaces.find((w) => w.slug === workspaceSlug) ??
    workspaces.find((w) => w.id === workspaceSlug) ??
    null;

  if (!matchedWorkspace) {
    console.warn(`[getWorkspaceIdBySlug] Workspace não encontrado para slug: ${workspaceSlug}`);
    return null;
  }

  return matchedWorkspace.id;
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
export async function getTasksForWorkspace(workspaceId: string): Promise<TaskWithDetails[]> {
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
    .eq("workspace_id", workspaceId) // ✅ Scope: Apenas tarefas do workspace
    .neq("status", "archived") // ✅ Status: Exclui tarefas arquivadas (soft delete via status)
    .order("position", { ascending: true }) // ✅ Ordem: Para DND
    .order("created_at", { ascending: false }); // ✅ Ordem: Mais recentes primeiro

  if (error) {
    console.error("[getTasksForWorkspace] Erro ao buscar tarefas:", error);
    return [];
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
