"use server";

import { createServerActionClient } from "@/lib/supabase/server";

/**
 * Busca todas as tags únicas de um workspace
 * Retorna array de tags ordenadas alfabeticamente
 */
export async function getWorkspaceTags(workspaceId: string): Promise<string[]> {
  const supabase = await createServerActionClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !workspaceId) return [];

  const { data: workspace, error: workspaceError } = await supabase
    .from("workspaces")
    .select("owner_id")
    .eq("id", workspaceId)
    .single();

  if (workspaceError || !workspace) return [];

  if (workspace.owner_id !== user.id) {
    const { data: membership } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .single();

    if (!membership) return [];
  }

  const { data: tasks, error } = await supabase
    .from("tasks")
    .select("tags")
    .eq("workspace_id", workspaceId)
    .neq("status", "archived")
    .not("tags", "is", null);

  const allTags = new Set<string>();
  if (!error && tasks) {
    tasks.forEach((task: { tags?: string[] }) => {
      if (task.tags && Array.isArray(task.tags)) {
        task.tags.forEach((tag: string) => {
          if (tag && tag.trim()) {
            allTags.add(tag.trim());
          }
        });
      }
    });
  }

  const { data: projectIcons, error: iconsError } = await (supabase as any)
    .from("project_icons")
    .select("tag_name")
    .eq("workspace_id", workspaceId);

  if (!iconsError && projectIcons) {
    projectIcons.forEach((icon: { tag_name?: string }) => {
      if (icon.tag_name && icon.tag_name.trim()) {
        allTags.add(icon.tag_name.trim());
      }
    });
  }

  return Array.from(allTags).sort();
}
