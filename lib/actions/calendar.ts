"use server";

import { createServerActionClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { updateTask } from "@/lib/actions/tasks";

/**
 * Interface para eventos do FullCalendar
 */
export interface CalendarEvent {
  id: string;
  title: string;
  start: string; // ISO date string
  extendedProps: {
    status: string;
    priority: string;
  };
  backgroundColor?: string;
  textColor?: string;
  classNames?: string[];
}

/**
 * Busca tarefas no range de datas para o calendário
 * Retorna array formatado para o FullCalendar
 */
export async function getTasksForCalendar(
  start: Date,
  end: Date,
  workspaceId?: string | null
): Promise<CalendarEvent[]> {
  const supabase = await createServerActionClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return [];

  // Converter datas para ISO string (apenas data, sem hora)
  // Usar UTC para evitar problemas de timezone
  const startDate = new Date(start);
  startDate.setHours(0, 0, 0, 0);
  const startISO = startDate.toISOString().split('T')[0];
  
  const endDate = new Date(end);
  endDate.setHours(23, 59, 59, 999);
  const endISO = endDate.toISOString();

  // Verificar se usuário é membro do workspace (se workspaceId fornecido)
  if (workspaceId !== undefined && workspaceId !== null) {
    const { data: membership } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .single();
    
    if (!membership) {
      console.warn(`[getTasksForCalendar] Acesso negado: Usuário ${user.id} tentou acessar workspace ${workspaceId} sem ser membro`);
      return [];
    }
  }

  // Filtro de workspace
  let data: any[] = [];
  let error: any = null;

  if (workspaceId === undefined) {
    // Calendário geral: tarefas atribuídas ao usuário (de todos os workspaces) + tarefas pessoais
    // Fazer duas queries separadas e combinar os resultados
    
    // Query 1: Tarefas atribuídas ao usuário (de todos os workspaces)
    const query1 = supabase
      .from("tasks")
      .select("id, title, due_date, status, priority")
      .neq("status", "archived")
      .not("due_date", "is", null)
      .eq("assignee_id", user.id)
      .gte("due_date", startISO)
      .lte("due_date", endISO);

    // Query 2: Tarefas pessoais (sem workspace)
    const query2 = supabase
      .from("tasks")
      .select("id, title, due_date, status, priority")
      .neq("status", "archived")
      .not("due_date", "is", null)
      .is("workspace_id", null)
      .eq("created_by", user.id)
      .gte("due_date", startISO)
      .lte("due_date", endISO);

    // Executar ambas as queries em paralelo
    const [result1, result2] = await Promise.all([query1, query2]);

    if (result1.error) {
      console.error("[getTasksForCalendar] Erro na query 1:", result1.error);
      error = result1.error;
    }
    if (result2.error) {
      console.error("[getTasksForCalendar] Erro na query 2:", result2.error);
      error = result2.error;
    }

    // Combinar resultados e remover duplicatas (caso uma tarefa pessoal também tenha assignee_id)
    const allTasks = [...(result1.data || []), ...(result2.data || [])];
    const uniqueTasks = Array.from(
      new Map(allTasks.map(task => [task.id, task])).values()
    );
    data = uniqueTasks;
  } else if (workspaceId === null) {
    // Tarefas pessoais (sem workspace)
    const query = supabase
      .from("tasks")
      .select("id, title, due_date, status, priority")
      .neq("status", "archived")
      .not("due_date", "is", null)
      .is("workspace_id", null)
      .eq("created_by", user.id)
      .gte("due_date", startISO)
      .lte("due_date", endISO);
    
    const result = await query;
    data = result.data || [];
    error = result.error;
  } else {
    // Tarefas do workspace (já verificamos membership acima)
    const query = supabase
      .from("tasks")
      .select("id, title, due_date, status, priority")
      .neq("status", "archived")
      .not("due_date", "is", null)
      .eq("workspace_id", workspaceId)
      .gte("due_date", startISO)
      .lte("due_date", endISO);
    
    const result = await query;
    data = result.data || [];
    error = result.error;
  }

  if (error) {
    console.error("[getTasksForCalendar] Erro ao buscar tarefas:", error);
    return [];
  }

  if (!data) return [];

  // Mapear para formato do FullCalendar
  return data.map((task) => {
    const isDone = task.status === "done";
    const backgroundColor = isDone ? "#f3f4f6" : "#22C55E"; // bg-muted ou brand-green
    const textColor = isDone ? "#6b7280" : "#ffffff";
    const classNames = isDone ? ["task-completed"] : [];

    return {
      id: task.id,
      title: task.title,
      start: task.due_date,
      extendedProps: {
        status: task.status || "todo",
        priority: task.priority || "medium",
      },
      backgroundColor,
      textColor,
      classNames,
    };
  });
}

/**
 * Atualiza a data de uma tarefa (chamado no drag & drop)
 */
export async function updateTaskDate(
  taskId: string,
  newDate: Date
): Promise<{ success: boolean; error?: string }> {
  // Converter Date para ISO string (apenas data, sem hora)
  const dateISO = newDate.toISOString().split('T')[0];

  const result = await updateTask({
    id: taskId,
    due_date: dateISO,
  });

  if (!result.success) {
    return { success: false, error: result.error };
  }

  // Revalidar paths do calendário e tarefas
  revalidatePath("/planner");
  revalidatePath("/tasks");
  revalidatePath("/home");

  return { success: true };
}
