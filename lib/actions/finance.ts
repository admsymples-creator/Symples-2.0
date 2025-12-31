"use server";

import { createServerActionClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { startOfMonth, endOfMonth, parseISO, format } from "date-fns";

export interface TransactionData {
  amount: number;
  type: "income" | "expense";
  description: string;
  category: string;
  date: Date;
  status: "paid" | "pending";
  is_recurring: boolean;
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

    // Preparar payload
    const payload: any = {
      amount: data.amount,
      type: data.type,
      description: data.description,
      category: data.category,
      due_date: data.date.toISOString(),
      status: data.status,
      workspace_id: workspaceId,
      created_by: user.id,
      is_recurring: data.is_recurring,
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

export async function getFinanceMetrics(month: number, year: number, workspaceId?: string) {
  const supabase = await createServerActionClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return {
      totalIncome: 0,
      totalExpense: 0,
      balance: 0,
      burnRate: 0,
      healthStatus: "healthy" as const,
    };
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
      return {
        totalIncome: 0,
        totalExpense: 0,
        balance: 0,
        burnRate: 0,
        healthStatus: "healthy" as const,
      };
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
    return {
      totalIncome: 0,
      totalExpense: 0,
      balance: 0,
      burnRate: 0,
      healthStatus: "healthy" as const,
    };
  }

  // Definir range de datas
  const date = new Date(year, month - 1, 1); // month é 1-based na UI, 0-based no JS Date
  const startDate = startOfMonth(date).toISOString();
  const endDate = endOfMonth(date).toISOString();

  // Buscar transações do mês filtradas por workspace
  const { data: transactions, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("workspace_id", effectiveWorkspaceId)
    .gte("due_date", startDate)
    .lte("due_date", endDate);

  if (error) {
    console.error("Erro ao buscar métricas:", error);
    return {
      totalIncome: 0,
      totalExpense: 0,
      balance: 0,
      burnRate: 0,
      healthStatus: "healthy" as const,
    };
  }

  // Cálculos
  const totalIncome = transactions
    .filter((t) => t.type === "income")
    .reduce((acc, curr) => acc + Number(curr.amount), 0);

  const totalExpense = transactions
    .filter((t) => t.type === "expense")
    .reduce((acc, curr) => acc + Number(curr.amount), 0);

  const balance = totalIncome - totalExpense;

  // Burn Rate: Soma das despesas fixas (is_recurring)
  const burnRate = transactions
    .filter((t) => t.type === "expense" && t.is_recurring === true)
    .reduce((acc, curr) => acc + Number(curr.amount), 0);

  // Lógica de Saúde Financeira
  let healthStatus: "healthy" | "critical" | "warning" = "healthy";
  if (balance < 0) {
    healthStatus = "critical";
  } else if (balance < totalExpense * 0.1) {
    // Exemplo: Se o saldo for muito baixo (< 10% das despesas), warning
    healthStatus = "warning";
  }

  return {
    totalIncome,
    totalExpense,
    balance,
    burnRate,
    healthStatus,
  };
}

export async function getTransactions(filters?: { 
  limit?: number; 
  startDate?: string; 
  endDate?: string;
  workspaceId?: string;
  isRecurring?: boolean;
}) {
  const supabase = await createServerActionClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
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
    return [];
  }

  let query = supabase
    .from("transactions")
    .select("*")
    .eq("workspace_id", effectiveWorkspaceId)
    .order("due_date", { ascending: false });

  if (filters?.startDate) {
    query = query.gte("due_date", filters.startDate);
  }
  
  if (filters?.endDate) {
    query = query.lte("due_date", filters.endDate);
  }

  if (filters?.isRecurring !== undefined) {
    query = query.eq("is_recurring", filters.isRecurring);
  }

  if (filters?.limit) {
    query = query.limit(filters.limit);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Erro ao buscar transações:", error);
    return [];
  }

  return data;
}

export interface UpdateTransactionData {
  amount?: number;
  type?: "income" | "expense";
  description?: string;
  category?: string;
  date?: Date;
  status?: "paid" | "pending" | "scheduled" | "cancelled";
  is_recurring?: boolean;
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
      .select("workspace_id, created_by")
      .eq("id", id)
      .single();

    if (fetchError || !transaction) {
      throw new Error("Transação não encontrada");
    }

    // Verificar membership
    const { data: membership } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", transaction.workspace_id)
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
    if (data.date !== undefined) payload.due_date = data.date.toISOString();
    if (data.status !== undefined) payload.status = data.status;
    if (data.is_recurring !== undefined) payload.is_recurring = data.is_recurring;

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
      .select("workspace_id, created_by")
      .eq("id", id)
      .single();

    if (fetchError || !transaction) {
      throw new Error("Transação não encontrada");
    }

    // Verificar se é admin ou criador (seguindo RLS policy)
    const { data: membership } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", transaction.workspace_id)
      .eq("user_id", user.id)
      .single();
    
    const isAdmin = membership?.role === "owner" || membership?.role === "admin";
    const isCreator = transaction.created_by === user.id;

    if (!membership || (!isAdmin && !isCreator)) {
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

