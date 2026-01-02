"use server";

import { createServerActionClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * Busca o ícone de um projeto específico
 */
export async function getProjectIcon(
  workspaceId: string,
  tagName: string
): Promise<string | null> {
  const supabase = await createServerActionClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !workspaceId || !tagName) return null;

  // Verificar se usuário é membro do workspace
  const { data: membership } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .single();

  if (!membership) return null;

  // Buscar ícone do projeto
  const { data, error } = await supabase
    .from("project_icons")
    .select("icon_name")
    .eq("workspace_id", workspaceId)
    .eq("tag_name", tagName)
    .single();

  if (error || !data) return null;

  return data.icon_name;
}

/**
 * Busca todos os ícones de projetos de um workspace
 * Retorna um Map<string, string> (tagName -> iconName)
 */
export async function getProjectIcons(
  workspaceId: string
): Promise<Map<string, string>> {
  const supabase = await createServerActionClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !workspaceId) return new Map();

  // Verificar se usuário é membro do workspace
  const { data: membership } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .single();

  if (!membership) return new Map();

  // Buscar todos os ícones do workspace
  const { data, error } = await supabase
    .from("project_icons")
    .select("tag_name, icon_name")
    .eq("workspace_id", workspaceId);

  if (error || !data) return new Map();

  // Converter para Map
  const iconsMap = new Map<string, string>();
  data.forEach((item) => {
    iconsMap.set(item.tag_name, item.icon_name);
  });

  return iconsMap;
}

/**
 * Define ou atualiza o ícone de um projeto
 */
export async function setProjectIcon(
  workspaceId: string,
  tagName: string,
  iconName: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerActionClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !workspaceId || !tagName || !iconName) {
    return { success: false, error: "Parâmetros inválidos" };
  }

  // Verificar se usuário é membro do workspace
  const { data: membership } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .single();

  if (!membership) {
    return { success: false, error: "Sem permissão para acessar este workspace" };
  }

  // Inserir ou atualizar ícone (UPSERT)
  const { error } = await supabase
    .from("project_icons")
    .upsert(
      {
        workspace_id: workspaceId,
        tag_name: tagName,
        icon_name: iconName,
      },
      {
        onConflict: "workspace_id,tag_name",
      }
    );

  if (error) {
    console.error("Erro ao salvar ícone do projeto:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/");
  return { success: true };
}

/**
 * Remove o ícone de um projeto
 */
export async function deleteProjectIcon(
  workspaceId: string,
  tagName: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerActionClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !workspaceId || !tagName) {
    return { success: false, error: "Parâmetros inválidos" };
  }

  // Verificar se usuário é membro do workspace
  const { data: membership } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .single();

  if (!membership) {
    return { success: false, error: "Sem permissão para acessar este workspace" };
  }

  // Deletar ícone
  const { error } = await supabase
    .from("project_icons")
    .delete()
    .eq("workspace_id", workspaceId)
    .eq("tag_name", tagName);

  if (error) {
    console.error("Erro ao deletar ícone do projeto:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/");
  return { success: true };
}

