"use server";

import { createServerActionClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { startOfMonth, endOfMonth, parseISO, format, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cache } from "react";

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

export interface TransactionData {
  amount: number;
  type: "income" | "expense";
  description: string;
  category: string;
  date: Date; // Data da transação (created_at/transaction_date)
  due_date?: Date | null; // Data de vencimento
  status: "paid" | "pending";
  is_recurring: boolean;
  counterparty_name?: string | null;
  related_task_id?: string | null;
  client_id?: string | null;
  workspace_id?: string;
}

export async function createTransaction(data: TransactionData) {
  try {
    const supabase = await createServerActionClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new Error("Usuário não autenticado");
    }

    let workspaceId = data.workspace_id;

    // Se não vier workspace_id, tenta pegar o primeiro do usuário
    // (Fallback para evitar erro de constraint, já que é obrigatório)
    if (!workspaceId) {
      const { data: memberData } = await supabase
        .from("workspace_members")
        .select("workspace_id")
        .eq("user_id", user.id)
        .limit(1)
        .single();
        
      if (memberData) {
        workspaceId = memberData.workspace_id;
      } else {
         throw new Error("Nenhum workspace encontrado para este usuário.");
      }
    }

    // Verificar se usuário é membro do workspace
    const { data: membership } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .single();
    
    if (!membership) {
      throw new Error("Você não tem permissão para criar transações neste workspace.");
    }

    // Verificar acesso do workspace (gatekeeper)
    const { checkWorkspaceAccess } = await import("@/lib/utils/subscription");
    const accessCheck = await checkWorkspaceAccess(workspaceId);
    
    if (!accessCheck.allowed) {
      return {
        success: false,
        error: accessCheck.reason || "Seu trial expirou. Escolha um plano para continuar criando transações.",
      };
    }

    // Preparar payload
    const payload: any = {
      amount: data.amount,
      type: data.type,
      description: data.description,
      category: data.category,
      due_date: data.due_date ? data.due_date.toISOString() : null,
      status: data.status,
      workspace_id: workspaceId,
      is_recurring: data.is_recurring,
      counterparty_name: data.counterparty_name || null,
      related_task_id: data.related_task_id || null,
      client_id: data.client_id || null,
      created_at: data.date.toISOString(), // Data da transação (pode ser passada)
    };

    const { error } = await supabase.from("transactions").insert(payload);

    if (error) {
      console.error("Erro ao criar transação:", error);
      throw new Error(`Erro ao salvar transação: ${error.message}`);
    }

    revalidatePath("/finance");
    return { success: true };
  } catch (error: any) {
    console.error("Create Transaction Error:", error);
    return { success: false, error: error.message };
  }
}

export const getFinanceMetrics = cache(async (month: number, year: number, workspaceId?: string) => {
  const perfStart = perfNow();
  const supabase = await createServerActionClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    const result = {
      totalIncome: 0,
      totalExpense: 0,
      balance: 0,
      futureBalance: 0,
      burnRate: 0,
      healthStatus: "healthy" as const,
    };
    logPerf("getFinanceMetrics:anonymous", perfStart);
    return result;
  }

  // Se workspaceId não fornecido, pegar o primeiro do usuário
  let effectiveWorkspaceId = workspaceId;
  if (!effectiveWorkspaceId) {
    const { data: memberData } = await supabase
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id", user.id)
      .limit(1)
      .single();
    
    if (!memberData) {
      const result = {
        totalIncome: 0,
        totalExpense: 0,
        balance: 0,
        futureBalance: 0,
        burnRate: 0,
        healthStatus: "healthy" as const,
      };
      logPerf("getFinanceMetrics:no-workspace", perfStart);
      return result;
    }
    effectiveWorkspaceId = memberData.workspace_id;
  }

  // Verificar membership
  const { data: membership } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", effectiveWorkspaceId)
    .eq("user_id", user.id)
    .single();
  
  if (!membership) {
    console.warn(`[getFinanceMetrics] Acesso negado: Usuário ${user.id} tentou acessar workspace ${effectiveWorkspaceId} sem ser membro`);
    const result = {
      totalIncome: 0,
      totalExpense: 0,
      balance: 0,
      futureBalance: 0,
      burnRate: 0,
      healthStatus: "healthy" as const,
    };
    logPerf("getFinanceMetrics:denied", perfStart, { workspaceId: effectiveWorkspaceId });
    return result;
  }

  // Definir range de datas
  const date = new Date(year, month - 1, 1); // month é 1-based na UI, 0-based no JS Date
  const startDate = startOfMonth(date).toISOString();
  const endDate = endOfMonth(date).toISOString();

  // Buscar transações do mês filtradas por workspace
  const queryStart = perfNow();
  let metricsQuery = (supabase as any)
    .from("transactions")
    .select("amount,type,is_recurring,status,due_date,created_at")
    .eq("workspace_id", effectiveWorkspaceId);

  metricsQuery = metricsQuery.or(
    `and(due_date.gte.${startDate},due_date.lte.${endDate}),and(due_date.is.null,created_at.gte.${startDate},created_at.lte.${endDate})`
  );

  const { data: transactions, error } = await metricsQuery;
  logPerf("getFinanceMetrics:query", queryStart, { workspaceId: effectiveWorkspaceId });

  if (error) {
    console.error("Erro ao buscar métricas:", error);
    const result = {
      totalIncome: 0,
      totalExpense: 0,
      balance: 0,
      futureBalance: 0,
      burnRate: 0,
      healthStatus: "healthy" as const,
    };
    logPerf("getFinanceMetrics:error", perfStart, { workspaceId: effectiveWorkspaceId });
    return result;
  }

  const typedTransactions = (transactions as any[]) || [];

  // Cálculos
  const totalIncome = typedTransactions
    .filter((t: any) => t.type === "income" && t.status !== "cancelled")
    .reduce((acc: number, curr: any) => acc + Number(curr.amount), 0);

  const totalExpense = typedTransactions
    .filter((t: any) => t.type === "expense" && t.status !== "cancelled")
    .reduce((acc: number, curr: any) => acc + Number(curr.amount), 0);

  const realIncome = typedTransactions
    .filter((t: any) => t.type === "income" && t.status === "paid")
    .reduce((acc: number, curr: any) => acc + Number(curr.amount), 0);

  const realExpense = typedTransactions
    .filter((t: any) => t.type === "expense" && t.status === "paid")
    .reduce((acc: number, curr: any) => acc + Number(curr.amount), 0);

  const futureIncome = typedTransactions
    .filter((t: any) => t.type === "income" && t.status !== "cancelled")
    .reduce((acc: number, curr: any) => acc + Number(curr.amount), 0);

  const futureExpense = typedTransactions
    .filter((t: any) => t.type === "expense" && t.status !== "cancelled")
    .reduce((acc: number, curr: any) => acc + Number(curr.amount), 0);

  const balance = realIncome - realExpense;
  const futureBalance = futureIncome - futureExpense;

  // Burn Rate: Soma das despesas fixas (is_recurring)
  const burnRate = typedTransactions
    .filter((t: any) => t.type === "expense" && t.is_recurring === true && t.status !== "cancelled")
    .reduce((acc: number, curr: any) => acc + Number(curr.amount), 0);

  // Lógica de Saúde Financeira
  let healthStatus: "healthy" | "critical" | "warning" = "healthy";
  if (balance < 0) {
    healthStatus = "critical";
  } else if (totalExpense > 0 && balance < totalExpense * 0.1) {
    // Se o saldo for muito baixo (< 10% das despesas mensais), warning
    healthStatus = "warning";
  }

  const result = {
    totalIncome,
    totalExpense,
    balance,
    futureBalance,
    burnRate,
    healthStatus,
  };
  logPerf("getFinanceMetrics", perfStart, { workspaceId: effectiveWorkspaceId });
  return result;
});

export const getTransactions = cache(async (filters?: { 
  limit?: number; 
  startDate?: string; 
  endDate?: string;
  workspaceId?: string;
  isRecurring?: boolean;
  relatedTaskId?: string;
}) => {
  const perfStart = perfNow();
  const supabase = await createServerActionClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    logPerf("getTransactions:anonymous", perfStart);
    return [];
  }

  // Se workspaceId não fornecido, pegar o primeiro do usuário
  let effectiveWorkspaceId = filters?.workspaceId;
  if (!effectiveWorkspaceId) {
    const { data: memberData } = await supabase
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id", user.id)
      .limit(1)
      .single();
    
    if (!memberData) {
      logPerf("getTransactions:no-workspace", perfStart);
      return [];
    }
    effectiveWorkspaceId = memberData.workspace_id;
  }

  // Verificar membership
  const { data: membership } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", effectiveWorkspaceId)
    .eq("user_id", user.id)
    .single();
  
  if (!membership) {
    console.warn(`[getTransactions] Acesso negado: Usuário ${user.id} tentou acessar workspace ${effectiveWorkspaceId} sem ser membro`);
    logPerf("getTransactions:denied", perfStart, { workspaceId: effectiveWorkspaceId });
    return [];
  }

  let query = (supabase as any)
    .from("transactions")
    .select("id,due_date,created_at,description,amount,status,category,type,is_recurring,counterparty_name,related_task_id,client_id,client:clients(name)")
    .eq("workspace_id", effectiveWorkspaceId)
    .order("due_date", { ascending: false, nullsLast: true })
    .order("created_at", { ascending: false });

  if (filters?.startDate && filters?.endDate) {
    query = query.or(
      `and(due_date.gte.${filters.startDate},due_date.lte.${filters.endDate}),and(due_date.is.null,created_at.gte.${filters.startDate},created_at.lte.${filters.endDate})`
    );
  } else if (filters?.startDate) {
    query = query.or(
      `due_date.gte.${filters.startDate},and(due_date.is.null,created_at.gte.${filters.startDate})`
    );
  } else if (filters?.endDate) {
    query = query.or(
      `due_date.lte.${filters.endDate},and(due_date.is.null,created_at.lte.${filters.endDate})`
    );
  }

  if (filters?.isRecurring !== undefined) {
    query = query.eq("is_recurring", filters.isRecurring);
  }

  if (filters?.relatedTaskId) {
    query = query.eq("related_task_id", filters.relatedTaskId);
  }

  if (filters?.limit) {
    query = query.limit(filters.limit);
  }

  const queryStart = perfNow();
  const { data, error } = await query;
  logPerf("getTransactions:query", queryStart, { workspaceId: effectiveWorkspaceId });

  if (error) {
    console.error("Erro ao buscar transações:", error);
    logPerf("getTransactions:error", perfStart, { workspaceId: effectiveWorkspaceId });
    return [];
  }

  logPerf("getTransactions", perfStart, { workspaceId: effectiveWorkspaceId, count: data?.length ?? 0 });
  return data;
});

export async function getTransactionsByTask(taskId: string, workspaceId: string) {
  try {
    const supabase = await createServerActionClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return [];

    const { data: membership } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .single();

    if (!membership) return [];

    const { data, error } = await supabase
      .from("transactions")
      .select("id,due_date,created_at,description,amount,status,category,type,is_recurring,counterparty_name,related_task_id,client_id,client:clients(name)")
      .eq("workspace_id", workspaceId)
      .eq("related_task_id", taskId)
      .order("due_date", { ascending: false, nullsLast: true })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erro ao buscar transações da tarefa:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("Erro ao buscar transações da tarefa:", error);
    return [];
  }
}

export async function createClient(params: { workspaceId: string; name: string; email?: string | null; phone?: string | null }) {
  try {
    const supabase = await createServerActionClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("Usuário não autenticado");
    }

    const { data: membership } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", params.workspaceId)
      .eq("user_id", user.id)
      .single();

    if (!membership) {
      throw new Error("Você não tem permissão para criar clientes neste workspace.");
    }

    const { data, error } = await supabase
      .from("clients")
      .insert({
        workspace_id: params.workspaceId,
        name: params.name.trim(),
        email: params.email || null,
        phone: params.phone || null,
        created_by: user.id,
      })
      .select("id,name")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return { success: true, client: data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export interface UpdateTransactionData {
  amount?: number;
  type?: "income" | "expense";
  description?: string;
  category?: string;
  date?: Date; // Data da transação (created_at/transaction_date)
  due_date?: Date | null; // Data de vencimento
  status?: "paid" | "pending" | "scheduled" | "cancelled";
  is_recurring?: boolean;
  counterparty_name?: string | null;
  related_task_id?: string | null;
  client_id?: string | null;
}

export async function updateTransaction(id: string, data: UpdateTransactionData) {
  try {
    const supabase = await createServerActionClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("Usuário não autenticado");
    }

    // Buscar a transação para verificar workspace e permissões
    const { data: transaction, error: fetchError } = await supabase
      .from("transactions")
      .select("workspace_id")
      .eq("id", id)
      .single();

    if (fetchError || !transaction) {
      throw new Error("Transação não encontrada");
    }

    // Verificar membership
    const { data: membership } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", (transaction as any).workspace_id)
      .eq("user_id", user.id)
      .single();
    
    if (!membership) {
      throw new Error("Você não tem permissão para editar transações neste workspace.");
    }

    // Preparar payload de atualização
    const payload: any = {};
    if (data.amount !== undefined) payload.amount = data.amount;
    if (data.type !== undefined) payload.type = data.type;
    if (data.description !== undefined) payload.description = data.description;
    if (data.category !== undefined) payload.category = data.category;
    if (data.date !== undefined) payload.created_at = data.date.toISOString();
    if (data.due_date !== undefined) payload.due_date = data.due_date ? data.due_date.toISOString() : null;
    if (data.status !== undefined) payload.status = data.status;
    if (data.is_recurring !== undefined) payload.is_recurring = data.is_recurring;
    if (data.counterparty_name !== undefined) payload.counterparty_name = data.counterparty_name || null;
    if (data.related_task_id !== undefined) payload.related_task_id = data.related_task_id || null;
    if (data.client_id !== undefined) payload.client_id = data.client_id || null;

    const { error } = await supabase
      .from("transactions")
      .update(payload)
      .eq("id", id);

    if (error) {
      console.error("Erro ao atualizar transação:", error);
      throw new Error(`Erro ao atualizar transação: ${error.message}`);
    }

    revalidatePath("/finance");
    return { success: true };
  } catch (error: any) {
    console.error("Update Transaction Error:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteTransaction(id: string) {
  try {
    const supabase = await createServerActionClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("Usuário não autenticado");
    }

    // Buscar a transação para verificar workspace e permissões
    const { data: transaction, error: fetchError } = await supabase
      .from("transactions")
      .select("workspace_id")
      .eq("id", id)
      .single();

    if (fetchError || !transaction) {
      throw new Error("Transação não encontrada");
    }

    // Verificar se é admin (seguindo RLS policy)
    const { data: membership } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", (transaction as any).workspace_id)
      .eq("user_id", user.id)
      .single();
    
    const isAdmin = membership?.role === "owner" || membership?.role === "admin";

    if (!membership || !isAdmin) {
      throw new Error("Você não tem permissão para excluir esta transação.");
    }

    const { error } = await supabase
      .from("transactions")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Erro ao deletar transação:", error);
      throw new Error(`Erro ao deletar transação: ${error.message}`);
    }

    revalidatePath("/finance");
    return { success: true };
  } catch (error: any) {
    console.error("Delete Transaction Error:", error);
    return { success: false, error: error.message };
  }
}

// ============================================
// PLANEJAMENTO FINANCEIRO
// ============================================

export interface BudgetData {
  category: string;
  amount: number;
  month: number;
  year: number;
  workspace_id?: string;
}

export interface Budget {
  id: string;
  workspace_id: string;
  category: string;
  amount: number;
  month: number;
  year: number;
  created_by: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export async function getBudgets(month: number, year: number, workspaceId?: string): Promise<Budget[]> {
  const supabase = await createServerActionClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  let effectiveWorkspaceId = workspaceId;
  if (!effectiveWorkspaceId) {
    const { data: memberData } = await supabase
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id", user.id)
      .limit(1)
      .single();
    
    if (!memberData) {
      return [];
    }
    effectiveWorkspaceId = memberData.workspace_id;
  }

  // Verificar membership
  const { data: membership } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", effectiveWorkspaceId)
    .eq("user_id", user.id)
    .single();
  
  if (!membership) {
    return [];
  }

  const { data, error } = await (supabase as any)
    .from("budgets")
    .select("*")
    .eq("workspace_id", effectiveWorkspaceId)
    .eq("month", month)
    .eq("year", year);

  if (error) {
    console.error("Erro ao buscar orçamentos:", error);
    return [];
  }

  return data || [];
}

export async function createBudget(data: BudgetData) {
  try {
    const supabase = await createServerActionClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new Error("Usuário não autenticado");
    }

    let workspaceId = data.workspace_id;
    if (!workspaceId) {
      const { data: memberData } = await supabase
        .from("workspace_members")
        .select("workspace_id")
        .eq("user_id", user.id)
        .limit(1)
        .single();
      
      if (memberData) {
        workspaceId = memberData.workspace_id;
      } else {
        throw new Error("Nenhum workspace encontrado para este usuário.");
      }
    }

    // Verificar membership e permissões
    const { data: membership } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .single();
    
    if (!membership || !membership.role || !["owner", "admin"].includes(membership.role)) {
      throw new Error("Você não tem permissão para criar orçamentos neste workspace.");
    }

    // Usar upsert para criar ou atualizar
    const { error } = await (supabase as any)
      .from("budgets")
      .upsert({
        workspace_id: workspaceId,
        category: data.category,
        amount: data.amount,
        month: data.month,
        year: data.year,
        created_by: user.id,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: "workspace_id,category,month,year"
      });

    if (error) {
      console.error("Erro ao criar/atualizar orçamento:", error);
      throw new Error(`Erro ao salvar orçamento: ${error.message}`);
    }

    revalidatePath("/finance");
    return { success: true };
  } catch (error: any) {
    console.error("Create Budget Error:", error);
    return { success: false, error: error.message };
  }
}

export interface Projection {
  month: number;
  year: number;
  monthName: string;
  income: number;
  expense: number;
  balance: number;
}

export const getProjections = cache(async (months: number = 6, workspaceId?: string): Promise<Projection[]> => {
  const perfStart = perfNow();
  const supabase = await createServerActionClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    logPerf("getProjections:anonymous", perfStart);
    return [];
  }

  let effectiveWorkspaceId = workspaceId;
  if (!effectiveWorkspaceId) {
    const { data: memberData } = await supabase
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id", user.id)
      .limit(1)
      .single();
    
    if (!memberData) {
      logPerf("getProjections:no-workspace", perfStart);
      return [];
    }
    effectiveWorkspaceId = memberData.workspace_id;
  }

  // Verificar membership
  const { data: membership } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", effectiveWorkspaceId)
    .eq("user_id", user.id)
    .single();
  
  if (!membership) {
    logPerf("getProjections:denied", perfStart, { workspaceId: effectiveWorkspaceId });
    return [];
  }

  const projections = [];
  const currentDate = new Date();
  const firstMonthDate = addMonths(currentDate, 1);
  const lastMonthDate = addMonths(currentDate, months);
  const rangeStart = startOfMonth(firstMonthDate).toISOString();
  const rangeEnd = endOfMonth(lastMonthDate).toISOString();

  // OTIMIZAÇÃO: Executar queries em paralelo
  const queriesStart = perfNow();
  const [recurringResult, scheduledResult] = await Promise.all([
    supabase
      .from("transactions")
      .select("*")
      .eq("workspace_id", effectiveWorkspaceId)
      .eq("is_recurring", true),
    supabase
      .from("transactions")
      .select("*")
      .eq("workspace_id", effectiveWorkspaceId)
      .gte("due_date", rangeStart)
      .lte("due_date", rangeEnd)
  ]);
  logPerf("getProjections:queries-parallel", queriesStart, { workspaceId: effectiveWorkspaceId });

  const recurringTransactions = recurringResult.data;
  const scheduledTransactions = scheduledResult.data;

  const scheduledByMonth = new Map<string, any[]>();
  (scheduledTransactions || []).forEach((t: any) => {
    const dueDate = t.due_date ? parseISO(String(t.due_date)) : null;
    if (!dueDate) return;
    const key = `${dueDate.getFullYear()}-${dueDate.getMonth() + 1}`;
    const list = scheduledByMonth.get(key);
    if (list) {
      list.push(t);
    } else {
      scheduledByMonth.set(key, [t]);
    }
  });

  for (let i = 1; i <= months; i++) {
    const projectionDate = addMonths(currentDate, i);
    const month = projectionDate.getMonth() + 1;
    const year = projectionDate.getFullYear();
    const key = `${year}-${month}`;
    const scheduledForMonth = scheduledByMonth.get(key) || [];
    const transactions = [
      ...(recurringTransactions || []),
      ...scheduledForMonth.filter((t: any) => !t.is_recurring),
    ];

    const income = (transactions || [])
      .filter((t: any) => t.type === "income")
      .reduce((acc: number, curr: any) => acc + (Number(curr.amount) || 0), 0);

    const expense = (transactions || [])
      .filter((t: any) => t.type === "expense")
      .reduce((acc: number, curr: any) => acc + (Number(curr.amount) || 0), 0);

    projections.push({
      month,
      year,
      monthName: format(projectionDate, "MMMM", { locale: ptBR }),
      income,
      expense,
      balance: income - expense,
    });
  }

  logPerf("getProjections", perfStart, { workspaceId: effectiveWorkspaceId, months });
  return projections;
});

export interface FinancialGoalData {
  title: string;
  description?: string;
  target_amount: number;
  current_amount?: number;
  type: "savings" | "spending_limit";
  deadline?: Date;
  workspace_id?: string;
}

export interface FinancialGoal {
  id: string;
  workspace_id: string;
  title: string;
  description: string | null;
  target_amount: number;
  current_amount: number;
  type: "savings" | "spending_limit";
  deadline: string | null;
  status: "active" | "completed" | "cancelled";
  created_by: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export async function getFinancialGoals(workspaceId?: string): Promise<FinancialGoal[]> {
  const supabase = await createServerActionClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  let effectiveWorkspaceId = workspaceId;
  if (!effectiveWorkspaceId) {
    const { data: memberData } = await supabase
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id", user.id)
      .limit(1)
      .single();
    
    if (!memberData) {
      return [];
    }
    effectiveWorkspaceId = memberData.workspace_id;
  }

  // Verificar membership
  const { data: membership } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", effectiveWorkspaceId)
    .eq("user_id", user.id)
    .single();
  
  if (!membership) {
    return [];
  }

  const { data, error } = await (supabase as any)
    .from("financial_goals")
    .select("*")
    .eq("workspace_id", effectiveWorkspaceId)
    .eq("status", "active")
    .order("deadline", { ascending: true, nullsFirst: false });

  if (error) {
    console.error("Erro ao buscar metas:", error);
    return [];
  }

  return data || [];
}

export async function createFinancialGoal(data: FinancialGoalData) {
  try {
    const supabase = await createServerActionClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new Error("Usuário não autenticado");
    }

    let workspaceId = data.workspace_id;
    if (!workspaceId) {
      const { data: memberData } = await supabase
        .from("workspace_members")
        .select("workspace_id")
        .eq("user_id", user.id)
        .limit(1)
        .single();
      
      if (memberData) {
        workspaceId = memberData.workspace_id;
      } else {
        throw new Error("Nenhum workspace encontrado para este usuário.");
      }
    }

    // Verificar membership e permissões
    const { data: membership } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .single();
    
    if (!membership || !membership.role || !["owner", "admin"].includes(membership.role)) {
      throw new Error("Você não tem permissão para criar metas neste workspace.");
    }

    const { error } = await (supabase as any)
      .from("financial_goals")
      .insert({
        workspace_id: workspaceId,
        title: data.title,
        description: data.description || null,
        target_amount: data.target_amount,
        current_amount: data.current_amount || 0,
        type: data.type,
        deadline: data.deadline ? data.deadline.toISOString() : null,
        status: "active",
        created_by: user.id,
      });

    if (error) {
      console.error("Erro ao criar meta:", error);
      throw new Error(`Erro ao salvar meta: ${error.message}`);
    }

    revalidatePath("/finance");
    return { success: true };
  } catch (error: any) {
    console.error("Create Financial Goal Error:", error);
    return { success: false, error: error.message };
  }
}

export interface UpdateFinancialGoalData {
  title?: string;
  description?: string;
  target_amount?: number;
  current_amount?: number;
  deadline?: Date;
  status?: "active" | "completed" | "cancelled";
}

export async function updateFinancialGoal(id: string, data: UpdateFinancialGoalData) {
  try {
    const supabase = await createServerActionClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("Usuário não autenticado");
    }

    // Buscar a meta para verificar workspace e permissões
    const { data: goal, error: fetchError } = await (supabase as any)
      .from("financial_goals")
      .select("workspace_id")
      .eq("id", id)
      .single();

    if (fetchError || !goal) {
      throw new Error("Meta não encontrada");
    }

    // Verificar membership e permissões
    const { data: membership } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", (goal as any).workspace_id)
      .eq("user_id", user.id)
      .single();
    
    if (!membership || !membership.role || !["owner", "admin"].includes(membership.role)) {
      throw new Error("Você não tem permissão para editar metas neste workspace.");
    }

    // Preparar payload
    const payload: any = {
      updated_at: new Date().toISOString(),
    };
    if (data.title !== undefined) payload.title = data.title;
    if (data.description !== undefined) payload.description = data.description;
    if (data.target_amount !== undefined) payload.target_amount = data.target_amount;
    if (data.current_amount !== undefined) payload.current_amount = data.current_amount;
    if (data.deadline !== undefined) payload.deadline = data.deadline ? data.deadline.toISOString() : null;
    if (data.status !== undefined) payload.status = data.status;

    const { error } = await (supabase as any)
      .from("financial_goals")
      .update(payload)
      .eq("id", id);

    if (error) {
      console.error("Erro ao atualizar meta:", error);
      throw new Error(`Erro ao atualizar meta: ${error.message}`);
    }

    revalidatePath("/finance");
    return { success: true };
  } catch (error: any) {
    console.error("Update Financial Goal Error:", error);
    return { success: false, error: error.message };
  }
}

export interface CashFlowForecast {
  month: number;
  year: number;
  monthName: string;
  income: number;
  expense: number;
  balance: number;
}

export const getCashFlowForecast = cache(async (months: number = 6, workspaceId?: string): Promise<CashFlowForecast[]> => {
  const perfStart = perfNow();
  const supabase = await createServerActionClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    logPerf("getCashFlowForecast:anonymous", perfStart);
    return [];
  }

  let effectiveWorkspaceId = workspaceId;
  if (!effectiveWorkspaceId) {
    const { data: memberData } = await supabase
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id", user.id)
      .limit(1)
      .single();
    
    if (!memberData) {
      logPerf("getCashFlowForecast:no-workspace", perfStart);
      return [];
    }
    effectiveWorkspaceId = memberData.workspace_id;
  }

  // Verificar membership
  const { data: membership } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", effectiveWorkspaceId)
    .eq("user_id", user.id)
    .single();
  
  if (!membership) {
    logPerf("getCashFlowForecast:denied", perfStart, { workspaceId: effectiveWorkspaceId });
    return [];
  }

  // OTIMIZAÇÃO: Calcular range de datas primeiro
  const currentDate = new Date();
  const currentMonthStart = startOfMonth(currentDate).toISOString();
  const currentMonthEnd = endOfMonth(currentDate).toISOString();
  const lastMonthDate = addMonths(currentDate, months - 1);
  const rangeStart = startOfMonth(currentDate).toISOString();
  const rangeEnd = endOfMonth(lastMonthDate).toISOString();

  // OTIMIZAÇÃO: Executar todas as queries em paralelo
  const queriesStart = perfNow();
  const [currentMonthResult, recurringResult, scheduledResult] = await Promise.all([
    supabase
      .from("transactions")
      .select("*")
      .eq("workspace_id", effectiveWorkspaceId)
      .gte("due_date", currentMonthStart)
      .lte("due_date", currentMonthEnd),
    supabase
      .from("transactions")
      .select("*")
      .eq("workspace_id", effectiveWorkspaceId)
      .eq("is_recurring", true),
    supabase
      .from("transactions")
      .select("*")
      .eq("workspace_id", effectiveWorkspaceId)
      .gte("due_date", rangeStart)
      .lte("due_date", rangeEnd)
  ]);
  logPerf("getCashFlowForecast:queries-parallel", queriesStart, { workspaceId: effectiveWorkspaceId });

  const currentMonthTransactions = currentMonthResult.data;
  const recurringTransactions = recurringResult.data;
  const scheduledTransactions = scheduledResult.data;

  const currentMonthIncome = (currentMonthTransactions || [])
    .filter((t: any) => t.type === "income")
    .reduce((acc: number, curr: any) => acc + Number(curr.amount) || 0, 0);

  const currentMonthExpense = (currentMonthTransactions || [])
    .filter((t: any) => t.type === "expense")
    .reduce((acc: number, curr: any) => acc + Number(curr.amount) || 0, 0);

  let runningBalance = currentMonthIncome - currentMonthExpense;
  const forecast = [];

  const scheduledByMonth = new Map<string, any[]>();
  (scheduledTransactions || []).forEach((t: any) => {
    const dueDate = t.due_date ? parseISO(String(t.due_date)) : null;
    if (!dueDate) return;
    const key = `${dueDate.getFullYear()}-${dueDate.getMonth() + 1}`;
    const list = scheduledByMonth.get(key);
    if (list) {
      list.push(t);
    } else {
      scheduledByMonth.set(key, [t]);
    }
  });

  // Começar do mês atual (i = 0)
  for (let i = 0; i < months; i++) {
    const forecastDate = addMonths(currentDate, i);
    const month = forecastDate.getMonth() + 1;
    const year = forecastDate.getFullYear();
    const key = `${year}-${month}`;
    const scheduledForMonth = scheduledByMonth.get(key) || [];
    const transactions = [
      ...(recurringTransactions || []),
      ...scheduledForMonth.filter((t: any) => !t.is_recurring),
    ];

    const income = (transactions || [])
      .filter((t: any) => t.type === "income")
      .reduce((acc: number, curr: any) => acc + (Number(curr.amount) || 0), 0);

    const expense = (transactions || [])
      .filter((t: any) => t.type === "expense")
      .reduce((acc: number, curr: any) => acc + (Number(curr.amount) || 0), 0);

    runningBalance = runningBalance + income - expense;

    forecast.push({
      month,
      year,
      monthName: format(forecastDate, "MMM/yyyy", { locale: ptBR }),
      income,
      expense,
      balance: runningBalance,
    });
  }

  logPerf("getCashFlowForecast", perfStart, { workspaceId: effectiveWorkspaceId, months });
  return forecast;
});
