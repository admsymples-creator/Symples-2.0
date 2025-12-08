"use server";

import { createServerActionClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// Tipos para mensagens do assistente
export interface AssistantMessage {
  id: string;
  workspace_id: string | null;
  user_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  type?: "text" | "component" | "image" | "audio" | "divider";
  image_url?: string | null;
  audio_url?: string | null;
  audio_duration?: number | null;
  audio_transcription?: string | null;
  is_thinking?: boolean;
  is_context_divider?: boolean;
  component_data?: {
    type: string;
    data: any;
  } | null;
  created_at: string;
}

export interface AssistantMessageInsert {
  workspace_id?: string | null;
  user_id?: string; // Opcional - será preenchido pela server action
  role: "user" | "assistant" | "system";
  content: string;
  type?: "text" | "component" | "image" | "audio" | "divider";
  image_url?: string | null;
  audio_url?: string | null;
  audio_duration?: number | null;
  audio_transcription?: string | null;
  is_thinking?: boolean;
  is_context_divider?: boolean;
  component_data?: {
    type: string;
    data: any;
  } | null;
}

/**
 * Salva uma mensagem do assistente no banco de dados
 */
export async function saveAssistantMessage(
  message: AssistantMessageInsert
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const supabase = await createServerActionClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Usuário não autenticado" };
    }

    // Blindagem: remover campos de sistema e forçar user_id autenticado
    const {
      id: _id,
      created_at: _createdAt,
      updated_at: _updatedAt,
      user_id: _userId,
      ...cleanData
    } = message as any;
    const messageToInsert = {
      ...cleanData,
      user_id: user.id,
    };

    try {
      const { data, error } = await supabase
        .from("assistant_messages")
        .insert(messageToInsert)
        .select("id")
        .single();

      if (error) {
        console.error("Erro ao salvar mensagem:", error);
        return { success: false, error: error.message };
      }

      return { success: true, messageId: data.id };
    } catch (error) {
      console.error("Erro ao salvar mensagem:", error);
      return { success: false };
    }
  } catch (error) {
    console.error("Erro ao salvar mensagem:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Erro desconhecido" 
    };
  }
}

/**
 * Salva múltiplas mensagens do assistente (batch insert)
 */
export async function saveAssistantMessages(
  messages: AssistantMessageInsert[]
): Promise<{ success: boolean; messageIds?: string[]; error?: string }> {
  try {
    const supabase = await createServerActionClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Usuário não autenticado" };
    }

    // Garantir que user_id seja o usuário autenticado para todas as mensagens
    // e evitar enviar id/created_at (id deve ser gerado pelo banco).
    const messagesToInsert = messages.map(msg => {
      const { id: _id, created_at: _createdAt, ...rest } = msg as any;
      return {
        ...rest,
        user_id: user.id,
      };
    });

    const { data, error } = await supabase
      .from("assistant_messages")
      .insert(messagesToInsert)
      .select("id");

    if (error) {
      console.error("Erro ao salvar mensagens:", error);
      return { success: false, error: error.message };
    }

    const messageIds = data?.map(m => m.id) || [];
    return { success: true, messageIds };
  } catch (error) {
    console.error("Erro ao salvar mensagens:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Erro desconhecido" 
    };
  }
}

/**
 * Carrega mensagens do assistente para um workspace (ou mensagens pessoais)
 */
export async function loadAssistantMessages(
  workspaceId: string | null,
  limit: number = 100
): Promise<{ success: boolean; messages?: AssistantMessage[]; error?: string }> {
  try {
    const supabase = await createServerActionClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Usuário não autenticado" };
    }

    let query = supabase
      .from("assistant_messages")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(limit);

    // Filtrar por workspace ou mensagens pessoais
    if (workspaceId) {
      query = query.eq("workspace_id", workspaceId);
    } else {
      query = query.is("workspace_id", null);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Erro ao carregar mensagens:", error);
      return { success: false, error: error.message };
    }

    return { success: true, messages: data as AssistantMessage[] };
  } catch (error) {
    console.error("Erro ao carregar mensagens:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Erro desconhecido" 
    };
  }
}

/**
 * Deleta uma mensagem do assistente
 */
export async function deleteAssistantMessage(
  messageId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createServerActionClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Usuário não autenticado" };
    }

    const { error } = await supabase
      .from("assistant_messages")
      .delete()
      .eq("id", messageId)
      .eq("user_id", user.id); // Garantir que apenas o dono pode deletar

    if (error) {
      console.error("Erro ao deletar mensagem:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error("Erro ao deletar mensagem:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Erro desconhecido" 
    };
  }
}

/**
 * Limpa todas as mensagens de um workspace (ou mensagens pessoais)
 */
export async function clearAssistantMessages(
  workspaceId: string | null
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createServerActionClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Usuário não autenticado" };
    }

    let query = supabase
      .from("assistant_messages")
      .delete()
      .eq("user_id", user.id);

    // Filtrar por workspace ou mensagens pessoais
    if (workspaceId) {
      query = query.eq("workspace_id", workspaceId);
    } else {
      query = query.is("workspace_id", null);
    }

    const { error } = await query;

    if (error) {
      console.error("Erro ao limpar mensagens:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error("Erro ao limpar mensagens:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Erro desconhecido" 
    };
  }
}

