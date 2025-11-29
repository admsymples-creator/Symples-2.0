"use server";

import { createServerActionClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Database } from "@/types/database.types";

type Task = Database["public"]["Tables"]["tasks"]["Row"];

export interface WeekTask extends Task {
  // Campos adicionais que podem ser úteis na UI
  workspace_name?: string | null;
  assignee_name?: string | null;
}

/**
 * Busca tarefas da semana para o usuário autenticado
 * @param start - Data de início (início da semana - Segunda-feira)
 * @param end - Data de fim (fim da semana - Domingo)
 * @returns Array de tarefas da semana
 */
export async function getWeekTasks(
  start: Date,
  end: Date
): Promise<WeekTask[]> {
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

    // Buscar tarefas onde:
    // 1. assignee_id = user.id OU created_by = user.id (minhas tarefas)
    // 2. due_date está entre start e end
    const { data: tasks, error } = await supabase
      .from("tasks")
      .select(`
        *,
        workspaces(name),
        assignee:profiles!tasks_assignee_id_fkey(full_name)
      `)
      .or(`assignee_id.eq.${user.id},created_by.eq.${user.id}`)
      .gte("due_date", startISO)
      .lte("due_date", endISO)
      .order("due_date", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erro ao buscar tarefas:", error);
      // Retornar array vazio em caso de erro (não quebrar a UI)
      return [];
    }

    // Mapear dados para incluir informações relacionadas
    const weekTasks: WeekTask[] = (tasks || []).map((task: any) => ({
      ...task,
      workspace_name: task.workspaces?.name || null,
      assignee_name: task.assignee?.full_name || null,
    }));

    return weekTasks;
  } catch (error) {
    console.error("Erro inesperado ao buscar tarefas:", error);
    return [];
  }
}

/**
 * Busca tarefas de um dia específico
 * @param date - Data do dia
 * @returns Array de tarefas do dia
 */
export async function getDayTasks(date: Date): Promise<WeekTask[]> {
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
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const startISO = startOfDay.toISOString();
    const endISO = endOfDay.toISOString();

    const { data: tasks, error } = await supabase
      .from("tasks")
      .select(`
        *,
        workspaces(name),
        assignee:profiles!tasks_assignee_id_fkey(full_name)
      `)
      .or(`assignee_id.eq.${user.id},created_by.eq.${user.id}`)
      .gte("due_date", startISO)
      .lte("due_date", endISO)
      .order("due_date", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erro ao buscar tarefas do dia:", error);
      return [];
    }

    const dayTasks: WeekTask[] = (tasks || []).map((task: any) => ({
      ...task,
      workspace_name: task.workspaces?.name || null,
      assignee_name: task.assignee?.full_name || null,
    }));

    return dayTasks;
  } catch (error) {
    console.error("Erro inesperado ao buscar tarefas do dia:", error);
    return [];
  }
}

