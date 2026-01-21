"use server";

import { createServerActionClient } from "@/lib/supabase/server";

export interface ClientRecord {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  created_at?: string | null;
  created_by?: string | null;
  workspace_id?: string | null;
  totalReceived?: number; // Total já recebido (income pago)
  totalReceivable?: number; // Total a receber (income pendente no prazo)
  totalOverdue?: number; // Total em atraso (income pendente vencido)
}

export async function getClients(workspaceId: string): Promise<ClientRecord[]> {
  try {
    const supabase = await createServerActionClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return [];
    }

    const { data: membership } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .single();

    if (!membership) {
      return [];
    }

    const { data, error } = await supabase
      .from("clients")
      .select("id,name,email,phone,created_at,created_by,workspace_id")
      .eq("workspace_id", workspaceId)
      .order("name", { ascending: true });

    if (error) {
      console.error("Erro ao buscar clientes:", {
        message: (error as any)?.message,
        details: (error as any)?.details,
        hint: (error as any)?.hint,
        code: (error as any)?.code,
      });
      return [];
    }

    // Buscar todas as transações de income para cada cliente
    const { data: transactions, error: transError } = await supabase
      .from("transactions")
      .select("client_id,amount,type,status,due_date,description")
      .eq("workspace_id", workspaceId)
      .eq("type", "income")
      .not("client_id", "is", null);

    if (transError) {
      console.error("Erro ao buscar transações:", transError);
    }

    console.log(`[getClients] Total de transações encontradas: ${transactions?.length || 0}`);

    // Calcular valores por cliente
    const clientFinances = new Map<string, { received: number; receivable: number; overdue: number }>();
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Zerar horas para comparação de data
    
    transactions?.forEach((t: any) => {
      if (!t.client_id) return;
      
      const current = clientFinances.get(t.client_id) || { received: 0, receivable: 0, overdue: 0 };
      const amount = Number(t.amount) || 0;
      
      if (t.status === "paid") {
        // Total já recebido
        current.received += amount;
        console.log(`[getClients] Cliente ${t.client_id}: Recebido +${amount} (${t.description})`);
      } else if (t.status === "pending") {
        // Verificar se está em atraso
        if (t.due_date) {
          const dueDate = new Date(t.due_date);
          dueDate.setHours(0, 0, 0, 0);
          
          if (dueDate < now) {
            // Em atraso
            current.overdue += amount;
            console.log(`[getClients] Cliente ${t.client_id}: Em atraso +${amount} (${t.description})`);
          } else {
            // A receber (no prazo)
            current.receivable += amount;
            console.log(`[getClients] Cliente ${t.client_id}: A receber +${amount} (${t.description})`);
          }
        } else {
          // Sem data de vencimento = a receber
          current.receivable += amount;
          console.log(`[getClients] Cliente ${t.client_id}: A receber (sem vencimento) +${amount} (${t.description})`);
        }
      }
      
      clientFinances.set(t.client_id, current);
    });

    // Adicionar valores financeiros aos clientes
    const clientsWithFinances = (data as ClientRecord[]).map((client) => {
      const finances = clientFinances.get(client.id) || { received: 0, receivable: 0, overdue: 0 };
      return {
        ...client,
        totalReceived: finances.received,
        totalReceivable: finances.receivable,
        totalOverdue: finances.overdue,
      };
    });

    return clientsWithFinances;
  } catch (error) {
    console.error("Erro ao buscar clientes:", {
      message: (error as any)?.message || String(error),
      error,
    });
    return [];
  }
}

export async function updateClient(clientId: string, data: { name: string; email?: string | null; phone?: string | null }) {
  try {
    const supabase = await createServerActionClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("Usuario nao autenticado");
    }

    const { data: client, error: fetchError } = await supabase
      .from("clients")
      .select("workspace_id")
      .eq("id", clientId)
      .single();

    if (fetchError || !client) {
      throw new Error("Cliente nao encontrado");
    }

    const { data: membership } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", (client as any).workspace_id)
      .eq("user_id", user.id)
      .single();

    if (!membership) {
      throw new Error("Sem permissao para atualizar cliente");
    }

    const { error } = await supabase
      .from("clients")
      .update({
        name: data.name.trim(),
        email: data.email || null,
        phone: data.phone || null,
      })
      .eq("id", clientId);

    if (error) {
      throw new Error(error.message);
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteClient(clientId: string) {
  try {
    const supabase = await createServerActionClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("Usuario nao autenticado");
    }

    const { data: client, error: fetchError } = await supabase
      .from("clients")
      .select("workspace_id,created_by")
      .eq("id", clientId)
      .single();

    if (fetchError || !client) {
      throw new Error("Cliente nao encontrado");
    }

    const { data: membership } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", (client as any).workspace_id)
      .eq("user_id", user.id)
      .single();

    const isAdmin = membership?.role === "owner" || membership?.role === "admin";
    const isCreator = (client as any).created_by === user.id;

    if (!membership || (!isAdmin && !isCreator)) {
      throw new Error("Sem permissao para excluir cliente");
    }

    const { error } = await supabase
      .from("clients")
      .delete()
      .eq("id", clientId);

    if (error) {
      throw new Error(error.message);
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

interface ClientDetails {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  workspace_id: string;
  created_at: string | null;
  updated_at: string | null;
}

export async function getClientDetails(clientId: string) {
  try {
    const supabase = await createServerActionClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return null;

    // 1. Buscar Cliente
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("id, name, email, phone, workspace_id, created_at, updated_at")
      .eq("id", clientId)
      .single();

    if (clientError || !client) {
      console.error("Cliente não encontrado:", clientError);
      return null;
    }

    // Type assertion para garantir o tipo correto
    const typedClient = client as ClientDetails;

    // Verificar permissão no workspace
    const { data: membership } = await supabase
        .from("workspace_members")
        .select("role")
        .eq("workspace_id", typedClient.workspace_id)
        .eq("user_id", user.id)
        .single();

    if (!membership) {
      console.error("Sem permissão de acesso ao cliente");
      return null;
    }

    // 2. Métricas Financeiras e Transações
    const { data: transactions } = await supabase
        .from("transactions")
        .select("id, amount, type, status, due_date, description, category, created_at")
        .eq("client_id", clientId)
        .order("due_date", { ascending: false });

    let totalIncome = 0;
    let totalPending = 0;
    let totalOverdue = 0;

    const now = new Date();

    transactions?.forEach((t: any) => {
        const amount = Number(t.amount);
        if (t.type === 'income') {
            if (t.status === 'paid') {
                totalIncome += amount;
            } else if (t.status === 'pending') {
                totalPending += amount;
                if (t.due_date && new Date(t.due_date) < now) {
                    totalOverdue += amount;
                }
            }
        }
    });

    // 3. Tarefas Recentes (Todas para listagem)
    const { data: tasks } = await supabase
        .from("tasks")
        .select("id, title, status, due_date, priority, tags")
        .eq("client_id", clientId)
        .neq("status", "archived")
        .order("created_at", { ascending: false });

    return {
        client: typedClient,
        finance: {
            totalIncome,
            totalPending,
            totalOverdue,
            transactions: transactions || []
        },
        tasks: tasks || []
    };

  } catch (error: any) {
    console.error("Erro ao buscar detalhes do cliente:", error);
    return null;
  }
}
