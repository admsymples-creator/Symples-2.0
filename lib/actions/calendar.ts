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
  allDay?: boolean; // true for date-only events (no specific time)
  extendedProps: {
    status: string;
    priority: string;
    workspace_id?: string | null;
    is_personal?: boolean;
    workspace_name?: string | null;
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

  // Converter datas para ISO string preservando o dia correto
  // Para start: usar meio-dia (12:00) local, depois converter para UTC
  // Isso garante que o dia seja mantido mesmo após conversão
  const startDate = new Date(start);
  startDate.setHours(12, 0, 0, 0);
  const startDateStr = startDate.toISOString().split('T')[0];
  const startISO = startDateStr + 'T00:00:00.000Z';
  
  // Para end: usar 23:59:59 do timezone local, depois converter para UTC
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
    // Incluir tarefas via assignee_id e task_members
    
    // Query 1: Tarefas atribuídas ao usuário via assignee_id (de todos os workspaces)
    const query1 = supabase
      .from("tasks")
      .select("id, title, due_date, status, priority, workspace_id, is_personal, recurrence_type, recurrence_parent_id")
      .neq("status", "archived")
      .not("due_date", "is", null)
      .eq("assignee_id", user.id)
      .gte("due_date", startISO)
      .lte("due_date", endISO);

    // Query 2: Tarefas pessoais (sem workspace)
    const query2 = supabase
      .from("tasks")
      .select("id, title, due_date, status, priority, workspace_id, is_personal, recurrence_type, recurrence_parent_id")
      .neq("status", "archived")
      .not("due_date", "is", null)
      .is("workspace_id", null)
      .eq("created_by", user.id)
      .gte("due_date", startISO)
      .lte("due_date", endISO);

    // Query 3: Tarefas de workspace via task_members (onde usuário está em task_members mas não é assignee_id)
    const { data: taskMemberTasks } = await supabase
      .from("task_members")
      .select(`
        task_id,
        tasks:task_id (
          id,
          title,
          due_date,
          status,
          priority,
          workspace_id,
          is_personal,
          recurrence_type,
          recurrence_parent_id
        )
      `)
      .eq("user_id", user.id);

    // Executar queries 1 e 2 em paralelo
    const [result1, result2] = await Promise.all([query1, query2]);

    if (result1.error) {
      console.error("[getTasksForCalendar] Erro na query 1:", result1.error);
      error = result1.error;
    }
    if (result2.error) {
      console.error("[getTasksForCalendar] Erro na query 2:", result2.error);
      error = result2.error;
    }

    // Combinar resultados das queries 1 e 2
    const allTasks = [...(result1.data || []), ...(result2.data || [])] as any[];
    const taskIdsSet = new Set(allTasks.map(task => task.id));

    // Adicionar tarefas de task_members que não estão já incluídas e estão no range de datas
    if (taskMemberTasks) {
      taskMemberTasks.forEach((tm: any) => {
        const task = tm.tasks;
        if (task && !taskIdsSet.has(task.id)) {
          // Filtrar por range de datas e status
          const taskDate = new Date(task.due_date);
          const startDateObj = new Date(startISO);
          const endDateObj = new Date(endISO);
          
          if (
            task.status !== "archived" &&
            task.due_date &&
            taskDate >= startDateObj &&
            taskDate <= endDateObj &&
            task.workspace_id !== null // Apenas tarefas de workspace (pessoais já estão na query2)
          ) {
            allTasks.push(task);
            taskIdsSet.add(task.id);
          }
        }
      });
    }

    // Remover duplicatas
    const uniqueTasks = Array.from(
      new Map(allTasks.map(task => [task.id, task])).values()
    );
    data = uniqueTasks;
  } else if (workspaceId === null) {
    // Tarefas pessoais (sem workspace)
    const query = supabase
      .from("tasks")
      .select("id, title, due_date, status, priority, workspace_id, is_personal, recurrence_type, recurrence_parent_id")
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
    // Incluir tarefas via assignee_id e task_members
    
    // Query 1: Tarefas atribuídas via assignee_id
    const query1 = supabase
      .from("tasks")
      .select("id, title, due_date, status, priority, workspace_id, is_personal, recurrence_type, recurrence_parent_id")
      .neq("status", "archived")
      .not("due_date", "is", null)
      .eq("workspace_id", workspaceId)
      .eq("assignee_id", user.id)
      .gte("due_date", startISO)
      .lte("due_date", endISO);

    // Query 2: Tarefas onde usuário está em task_members
    const { data: taskMemberTasks } = await supabase
      .from("task_members")
      .select(`
        task_id,
        tasks:task_id (
          id,
          title,
          due_date,
          status,
          priority,
          workspace_id,
          is_personal,
          recurrence_type,
          recurrence_parent_id
        )
      `)
      .eq("user_id", user.id);

    const result1 = await query1;
    if (result1.error) {
      console.error("[getTasksForCalendar] Erro na query 1:", result1.error);
      error = result1.error;
    }

    const allTasks = [...(result1.data || [])];
    const taskIdsSet = new Set(allTasks.map(task => task.id));

    // Adicionar tarefas de task_members que pertencem ao workspace e não estão já incluídas
    if (taskMemberTasks) {
      taskMemberTasks.forEach((tm: any) => {
        const task = tm.tasks;
        if (
          task &&
          !taskIdsSet.has(task.id) &&
          task.workspace_id === workspaceId &&
          task.status !== "archived" &&
          task.due_date
        ) {
          const taskDate = new Date(task.due_date);
          const startDateObj = new Date(startISO);
          const endDateObj = new Date(endISO);
          
          if (taskDate >= startDateObj && taskDate <= endDateObj) {
            allTasks.push(task);
            taskIdsSet.add(task.id);
          }
        }
      });
    }

    data = allTasks;
    error = result1.error;
  }

  if (error) {
    console.error("[getTasksForCalendar] Erro ao buscar tarefas:", error);
    return [];
  }

  if (!data) return [];

  // Buscar workspaces para mapear nomes (apenas se houver tarefas de workspace)
  const workspaceIds = Array.from(new Set(data.filter(t => t.workspace_id).map(t => t.workspace_id)));
  const workspaceMap = new Map<string, string>();
  
  if (workspaceIds.length > 0) {
    const { data: workspaces } = await supabase
      .from("workspaces")
      .select("id, name")
      .in("id", workspaceIds);
    
    if (workspaces) {
      workspaces.forEach(ws => {
        workspaceMap.set(ws.id, ws.name);
      });
    }
  }

  // Função helper para gerar cor baseada no workspace_id (similar a TaskRow.tsx)
  const getWorkspaceColor = (workspaceId: string | null): string => {
    if (!workspaceId) return "#22C55E"; // Verde padrão para tarefas pessoais

    let hash = 0;
    for (let i = 0; i < workspaceId.length; i++) {
      hash = workspaceId.charCodeAt(i) + ((hash << 5) - hash);
    }

    const hue = Math.abs(hash % 360);
    const saturation = 60 + (Math.abs(hash) % 20);
    const lightness = 45 + (Math.abs(hash) % 15);

    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  };

  // Mapear para formato do FullCalendar
  return data.map((task) => {
    const isDone = task.status === "done";
    const isPersonal = task.is_personal || !task.workspace_id;
    
    // Aplicar cor diferente para workspace vs pessoal
    let backgroundColor: string;
    let textColor: string;
    
    if (isDone) {
      backgroundColor = "#f3f4f6"; // Cinza para tarefas completadas
      textColor = "#6b7280";
    } else if (isPersonal) {
      backgroundColor = "#f3f4f6"; // Cinza para tarefas pessoais
      textColor = "#000000"; // Preto para tarefas pessoais
    } else {
      backgroundColor = getWorkspaceColor(task.workspace_id); // Cor baseada no workspace
      textColor = "#ffffff"; // Branco para tarefas de workspace
    }
    
    const classNames = isDone ? ["task-completed"] : [];

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/3cb1781a-45f3-4822-84f0-70123428e0e4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/actions/calendar.ts:304',message:'HYP-A: Raw due_date from DB',data:{taskId:task.id,due_date:task.due_date,due_date_type:typeof task.due_date},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'A'})}).catch(()=>{});
    // #endregion

    // Determinar se é um evento "all-day" (sem hora específica)
    // Para tarefas pessoais: sempre não-allDay para mostrar hora no calendário (mesmo que seja 00:00:00)
    // Para tarefas de workspace: considerar allDay se for 00:00:00 UTC
    const dueDate = task.due_date ? new Date(task.due_date) : null;
    let isAllDay = false;
    let startValue: string = task.due_date;
    
    if (dueDate) {
      if (isPersonal) {
        // Para tarefas pessoais: sempre não-allDay para exibir hora no calendário
        isAllDay = false;
        // Manter a data/hora original (já está em formato correto)
        startValue = task.due_date;
      } else {
        // Para tarefas de workspace: verificar se a hora é 00:00:00 UTC
        const hour = dueDate.getUTCHours();
        const minute = dueDate.getUTCMinutes();
        const second = dueDate.getUTCSeconds();
        // Considerar allDay se for meia-noite UTC (00:00:00)
        isAllDay = hour === 0 && minute === 0 && second === 0;
        
        // Para eventos allDay, FullCalendar requer formato YYYY-MM-DD (sem hora)
        // Para eventos com hora, usar ISO string completa
        if (isAllDay) {
          startValue = task.due_date.split('T')[0]; // Apenas a data (YYYY-MM-DD)
        }
      }
    }

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/3cb1781a-45f3-4822-84f0-70123428e0e4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/actions/calendar.ts:315',message:'BUG-1: allDay determination and start format',data:{taskId:task.id,due_date:task.due_date,isAllDay,startValue,hour:dueDate?.getUTCHours(),minute:dueDate?.getUTCMinutes()},timestamp:Date.now(),sessionId:'debug-session',runId:'bug-investigation',hypothesisId:'bug-1'})}).catch(()=>{});
    // #endregion

    const calendarEvent = {
      id: task.id,
      title: task.title,
      start: startValue,
      allDay: isAllDay,
      extendedProps: {
        status: task.status || "todo",
        priority: task.priority || "medium",
        workspace_id: task.workspace_id || null,
        is_personal: isPersonal,
        workspace_name: task.workspace_id ? workspaceMap.get(task.workspace_id) || null : null,
        recurrence_type: (task as any).recurrence_type || null,
        recurrence_parent_id: (task as any).recurrence_parent_id || null,
      },
      backgroundColor,
      textColor,
      classNames,
    };

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/3cb1781a-45f3-4822-84f0-70123428e0e4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/actions/calendar.ts:340',message:'HYP-A: Calendar event start value',data:{taskId:task.id,start:calendarEvent.start,allDay:calendarEvent.allDay,start_type:typeof calendarEvent.start},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'A'})}).catch(()=>{});
    // #endregion

    return calendarEvent;
  });
}

/**
 * Atualiza a data de uma tarefa (chamado no drag & drop)
 */
export async function updateTaskDate(
  taskId: string,
  newDate: Date
): Promise<{ success: boolean; error?: string }> {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/3cb1781a-45f3-4822-84f0-70123428e0e4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/actions/calendar.ts:352',message:'BUG-2: updateTaskDate called',data:{taskId,newDate:newDate.toString(),newDateISO:newDate.toISOString()},timestamp:Date.now(),sessionId:'debug-session',runId:'bug-investigation',hypothesisId:'bug-2'})}).catch(()=>{});
  // #endregion

  // Converter Date para ISO string preservando o dia correto
  // Quando FullCalendar passa uma data via eventDrop, ela já está no timezone local
  // Para eventos allDay, sempre usar meia-noite UTC (00:00:00.000Z) para manter o dia correto
  // Para eventos com hora específica, preservar a hora mas usar meio-dia como fallback se necessário
  const dateOnly = new Date(Date.UTC(newDate.getFullYear(), newDate.getMonth(), newDate.getDate()));
  const dateISO = dateOnly.toISOString(); // Sempre usar meia-noite UTC para manter consistência

  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/3cb1781a-45f3-4822-84f0-70123428e0e4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/actions/calendar.ts:372',message:'BUG-2: updateTaskDate date conversion',data:{taskId,isAllDay,dateISO,originalDate:newDate.toString()},timestamp:Date.now(),sessionId:'debug-session',runId:'bug-investigation',hypothesisId:'bug-2'})}).catch(()=>{});
  // #endregion

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
