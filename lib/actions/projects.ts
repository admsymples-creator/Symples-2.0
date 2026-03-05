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
  const { data, error } = await (supabase as any)
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
  const { data, error } = await (supabase as any)
    .from("project_icons")
    .select("tag_name, icon_name")
    .eq("workspace_id", workspaceId);

  if (error || !data) return new Map();

  // Converter para Map
  const iconsMap = new Map<string, string>();
  data.forEach((item: any) => {
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
  const { error } = await (supabase as any)
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
 * 
 * Nota: Esta função remove apenas o ícone do projeto, não as tags das tarefas.
 * As tags das tarefas são mantidas mesmo sem ícone, pois o projeto pode existir
 * sem ícone (apenas com tarefas que usam a tag).
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
  const { error } = await (supabase as any)
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

async function hasWorkspaceAccess(
  supabase: Awaited<ReturnType<typeof createServerActionClient>>,
  userId: string,
  workspaceId: string
): Promise<boolean> {
  const { data: workspace, error: workspaceError } = await supabase
    .from("workspaces")
    .select("owner_id")
    .eq("id", workspaceId)
    .single();

  if (workspaceError || !workspace) return false;
  if (workspace.owner_id === userId) return true;

  const { data: membership } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .single();

  return !!membership;
}

export async function getProjectTaskCount(
  workspaceId: string,
  tagName: string
): Promise<number> {
  const supabase = await createServerActionClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !workspaceId || !tagName) return 0;

  const hasAccess = await hasWorkspaceAccess(supabase, user.id, workspaceId);
  if (!hasAccess) return 0;

  const { count, error } = await (supabase as any)
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .contains("tags", [tagName]);

  if (error) return 0;

  return count || 0;
}

export async function renameProjectTag(
  workspaceId: string,
  oldTag: string,
  newTag: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerActionClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !workspaceId || !oldTag || !newTag) {
    return { success: false, error: "Parâmetros inválidos" };
  }

  if (oldTag === newTag) {
    return { success: true };
  }

  const hasAccess = await hasWorkspaceAccess(supabase, user.id, workspaceId);
  if (!hasAccess) {
    return { success: false, error: "Sem permissão para acessar este workspace" };
  }

  const { data: existing } = await (supabase as any)
    .from("tasks")
    .select("id")
    .eq("workspace_id", workspaceId)
    .contains("tags", [newTag])
    .limit(1);

  if (existing && existing.length > 0) {
    return { success: false, error: "Já existe um projeto com esse nome" };
  }

  const { data: existingIcon } = await (supabase as any)
    .from("project_icons")
    .select("tag_name")
    .eq("workspace_id", workspaceId)
    .eq("tag_name", newTag)
    .limit(1);

  if (existingIcon && existingIcon.length > 0) {
    return { success: false, error: "Já existe um projeto com esse nome" };
  }

  const { data: iconRow } = await (supabase as any)
    .from("project_icons")
    .select("icon_name")
    .eq("workspace_id", workspaceId)
    .eq("tag_name", oldTag)
    .single();

  if (iconRow) {
    const { error: iconError } = await (supabase as any)
      .from("project_icons")
      .update({ tag_name: newTag })
      .eq("workspace_id", workspaceId)
      .eq("tag_name", oldTag);

    if (iconError) {
      return { success: false, error: iconError.message };
    }
  }

  const { data: tasks, error: tasksError } = await (supabase as any)
    .from("tasks")
    .select("id, tags")
    .eq("workspace_id", workspaceId)
    .contains("tags", [oldTag]);

  if (tasksError) {
    return { success: false, error: tasksError.message };
  }

  if (tasks && tasks.length > 0) {
    const updates = tasks.map((task: any) => {
      const currentTags = Array.isArray(task.tags) ? task.tags : [];
      const replaced = currentTags.map((tag: string) => (tag === oldTag ? newTag : tag));
      const unique = Array.from(new Set(replaced)) as string[];
      return supabase
        .from("tasks")
        .update({ tags: unique.length > 0 ? unique : null })
        .eq("id", task.id);
    });

    await Promise.all(updates);
  }

  revalidatePath("/");
  revalidatePath("/tasks");
  revalidatePath("/(main)/home", "page");
  return { success: true };
}

export async function deleteProjectTag(
  workspaceId: string,
  tagName: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerActionClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !workspaceId || !tagName) {
    return { success: false, error: "Parâmetros inválidos" };
  }

  const hasAccess = await hasWorkspaceAccess(supabase, user.id, workspaceId);
  if (!hasAccess) {
    return { success: false, error: "Sem permissão para acessar este workspace" };
  }

  await (supabase as any)
    .from("project_icons")
    .delete()
    .eq("workspace_id", workspaceId)
    .eq("tag_name", tagName);

  const { data: tasks, error: tasksError } = await (supabase as any)
    .from("tasks")
    .select("id, tags")
    .eq("workspace_id", workspaceId)
    .contains("tags", [tagName]);

  if (tasksError) {
    return { success: false, error: tasksError.message };
  }

  if (tasks && tasks.length > 0) {
    const updates = tasks.map((task: any) => {
      const currentTags = Array.isArray(task.tags) ? task.tags : [];
      const filtered = currentTags.filter((tag: string) => tag !== tagName);
      return supabase
        .from("tasks")
        .update({ tags: filtered.length > 0 ? filtered : null })
        .eq("id", task.id);
    });

    await Promise.all(updates);
  }

  revalidatePath("/");
  revalidatePath("/tasks");
  revalidatePath("/(main)/home", "page");
  return { success: true };
}

