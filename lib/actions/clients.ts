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

    return (data as ClientRecord[]) || [];
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
