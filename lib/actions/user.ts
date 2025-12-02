"use server";

import { createServerActionClient } from "@/lib/supabase/server";
import { Database } from "@/types/database.types";
import { revalidatePath } from "next/cache";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Workspace = Pick<Database["public"]["Tables"]["workspaces"]["Row"], "id" | "name" | "slug"> & { logo_url?: string | null };

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
        slug,
        logo_url
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
    .filter((ws): ws is any => ws !== null && typeof ws === "object") as Workspace[] || [];

  return workspaces;
}

export async function getWorkspaceById(workspaceId: string): Promise<Workspace | null> {
  const supabase = await createServerActionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Verificar se o usuário é membro do workspace
  const { data: member, error: memberError } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .single();

  if (memberError || !member) {
    return null;
  }

  // Buscar dados do workspace
  const { data: workspace, error } = await supabase
    .from("workspaces")
    .select("id, name, slug, logo_url")
    .eq("id", workspaceId)
    .single();

  if (error || !workspace) {
    console.error("Erro ao buscar workspace:", error);
    return null;
  }

  return workspace as Workspace;
}

export async function updateProfile(formData: FormData) {
  const supabase = await createServerActionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Usuário não autenticado");

  const full_name = formData.get("full_name") as string;
  const job_title = formData.get("job_title") as string;
  const avatarFile = formData.get("avatar") as File | null;

  let avatar_url = undefined;

  if (avatarFile && avatarFile.size > 0) {
    const fileExt = avatarFile.name.split('.').pop();
    const fileName = `${user.id}-${Date.now()}.${fileExt}`;
    const filePath = `${user.id}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, avatarFile, {
        upsert: true
      });

    if (uploadError) {
      console.error("Erro no upload do avatar:", uploadError);
      throw new Error("Falha ao fazer upload da imagem");
    }

    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    avatar_url = publicUrl;
  }

  // Nota: job_title não existe no schema atual do banco (public.profiles).
  // Se necessário, adicionar coluna via migration ou salvar em metadata.
  // Por enquanto, atualizamos apenas full_name e updated_at.

  const updateData: any = {
      full_name,
      updated_at: new Date().toISOString(),
  };

  if (avatar_url) {
    updateData.avatar_url = avatar_url;
  }

  const { error } = await supabase
    .from("profiles")
    .update(updateData)
    .eq("id", user.id);

  if (error) {
    console.error("Erro detalhado ao atualizar perfil:", JSON.stringify(error, null, 2));
    throw new Error(`Falha ao atualizar perfil: ${error.message}`);
  }

  revalidatePath("/settings");
  revalidatePath("/", "layout"); // Atualizar header/sidebar se necessário

  return { success: true };
}
