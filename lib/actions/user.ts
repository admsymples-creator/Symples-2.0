"use server";

import { createServerActionClient } from "@/lib/supabase";
import { Database } from "@/types/database.types";
import { revalidatePath } from "next/cache";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Workspace = Pick<Database["public"]["Tables"]["workspaces"]["Row"], "id" | "name" | "slug">;

export async function getUserProfile() {
  const supabase = await createServerActionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return profile;
}

export async function getUserWorkspaces() {
  const supabase = await createServerActionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  // Buscar workspaces onde o usuário é membro
  const { data: memberWorkspaces, error } = await supabase
    .from("workspace_members")
    .select(`
      workspace_id,
      workspaces:workspace_id (
        id,
        name,
        slug
      )
    `)
    .eq("user_id", user.id);

  if (error) {
    console.error("Erro ao buscar workspaces:", error);
    return [];
  }

  // Transformar o retorno para um array plano de workspaces
  // O tipo do retorno do join é um pouco complexo, então fazemos um map seguro
  const workspaces = memberWorkspaces
    ?.map((item) => item.workspaces)
    .filter((ws): ws is Workspace => ws !== null && typeof ws === "object") || [];

  return workspaces;
}

export async function updateProfile(formData: FormData) {
  const supabase = await createServerActionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Usuário não autenticado");

  const full_name = formData.get("full_name") as string;
  const job_title = formData.get("job_title") as string;

  // Nota: job_title não existe no schema atual do banco (public.profiles).
  // Se necessário, adicionar coluna via migration ou salvar em metadata.
  // Por enquanto, atualizamos apenas full_name e updated_at.

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name,
      // job_title: job_title, // Descomentar quando a coluna existir
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) {
    console.error("Erro ao atualizar perfil:", error);
    throw new Error("Falha ao atualizar perfil");
  }

  revalidatePath("/settings");
  revalidatePath("/", "layout"); // Atualizar header/sidebar se necessário

  return { success: true };
}
