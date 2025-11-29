"use server";

import { createServerActionClient } from "@/lib/supabase";
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

    // Preparar payload
    // NOTE: O campo 'is_recurring' não consta nos tipos gerados automaticamente,
    // mas foi solicitado na especificação. Estou enviando-o assumindo que a coluna existe no banco.
    // Se der erro de coluna inexistente, será necessário criar a migration.
    const payload: any = {
      amount: data.amount,
      type: data.type,
      description: data.description,
      category: data.category,
      date: data.date.toISOString(),
      status: data.status,
      workspace_id: workspaceId,
      // @ts-ignore: Campo pode não existir nos tipos ainda
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

export async function getFinanceMetrics(month: number, year: number) {
  const supabase = await createServerActionClient();

  // Definir range de datas
  const date = new Date(year, month - 1, 1); // month é 1-based na UI, 0-based no JS Date
  const startDate = startOfMonth(date).toISOString();
  const endDate = endOfMonth(date).toISOString();

  // Buscar transações do mês
  const { data: transactions, error } = await supabase
    .from("transactions")
    .select("*")
    .gte("date", startDate)
    .lte("date", endDate);

  if (error) {
    console.error("Erro ao buscar métricas:", error);
    return {
      totalIncome: 0,
      totalExpense: 0,
      balance: 0,
      burnRate: 0,
      healthStatus: "healthy",
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
  // Como is_recurring pode não estar tipado corretamente, fazemos cast
  const burnRate = transactions
    .filter((t: any) => t.type === "expense" && t.is_recurring === true)
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

export async function getTransactions(filters?: { limit?: number; startDate?: string; endDate?: string }) {
  const supabase = await createServerActionClient();

  let query = supabase
    .from("transactions")
    .select("*")
    .order("date", { ascending: false });

  if (filters?.startDate) {
    query = query.gte("date", filters.startDate);
  }
  
  if (filters?.endDate) {
    query = query.lte("date", filters.endDate);
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

