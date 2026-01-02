"use server";

import { createServerActionClient } from "@/lib/supabase/server";
import { Database } from "@/types/database.types";
import { revalidatePath } from "next/cache";
import { cache } from "react";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Workspace = Pick<Database["public"]["Tables"]["workspaces"]["Row"], "id" | "name" | "slug"> & { logo_url?: string | null };

export const getUserProfile = cache(async () => {
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
});

export const getUserWorkspaces = cache(async () => {
  const supabase = await createServerActionClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    console.error("❌ [getUserWorkspaces] Erro ao buscar usuário autenticado:", authError);
    return [];
  }

  if (!user) {
    console.warn("⚠️ [getUserWorkspaces] Usuário não autenticado");
    return [];
  }

  console.log("🔍 [getUserWorkspaces] Buscando workspaces para usuário:", user.id);

  // Buscar workspaces onde o usuário é membro
  // Nota: Não podemos usar unstable_cache aqui porque precisamos acessar cookies() para autenticação
  // O Next.js não permite acessar dados dinâmicos (cookies) dentro de funções cacheadas
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
    console.error("❌ [getUserWorkspaces] Erro ao buscar workspaces:", {
      error: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      userId: user.id,
    });
    return [];
  }

  console.log("📦 [getUserWorkspaces] Member workspaces encontrados:", memberWorkspaces?.length || 0);

  // Transformar o retorno para um array plano de workspaces
  // O tipo do retorno do join é um pouco complexo, então fazemos um map seguro
  const workspaces = memberWorkspaces
    ?.map((item) => {
      // O join pode retornar como objeto ou array dependendo da relação
      const workspace = Array.isArray(item.workspaces) ? item.workspaces[0] : item.workspaces;
      return workspace;
    })
    .filter((ws): ws is any => ws !== null && typeof ws === "object") as Workspace[] || [];

  console.log("✅ [getUserWorkspaces] Workspaces transformados:", workspaces.length);

  return workspaces;
});

/**
 * Garante que o usuário tenha um workspace pessoal
 * Cria automaticamente se não existir
 */
export async function ensurePersonalWorkspace(): Promise<{ success: boolean; workspaceId?: string; error?: string }> {
  const supabase = await createServerActionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Usuário não autenticado" };
  }

  // Verificar se já existe workspace pessoal
  const { data: existingWorkspaces, error: fetchError } = await supabase
    .from("workspace_members")
    .select(`
      workspace_id,
      workspaces:workspace_id (
        id,
        name
      )
    `)
    .eq("user_id", user.id);

  if (fetchError) {
    console.error("Erro ao buscar workspaces:", fetchError);
    return { success: false, error: fetchError.message };
  }

  // Verificar se já existe workspace pessoal
  const personalWorkspace = existingWorkspaces?.find((item: any) => {
    const workspace = Array.isArray(item.workspaces) ? item.workspaces[0] : item.workspaces;
    return workspace?.name?.toLowerCase().trim() === "pessoal";
  });

  if (personalWorkspace) {
    const workspace = Array.isArray(personalWorkspace.workspaces) 
      ? personalWorkspace.workspaces[0] 
      : personalWorkspace.workspaces;
    return { success: true, workspaceId: workspace?.id };
  }

  // Criar workspace pessoal
  const slug = `pessoal-${user.id.slice(0, 8)}`;
  const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

  const { data: newWorkspace, error: createError } = await supabase
    .from("workspaces")
    .insert({
      name: "Pessoal",
      owner_id: user.id,
      slug,
      plan: "business",
      subscription_status: "trialing",
      trial_ends_at: trialEndsAt,
      member_limit: 15,
    })
    .select()
    .single();

  if (createError) {
    console.error("Erro ao criar workspace pessoal:", createError);
    return { success: false, error: createError.message };
  }

  // O trigger já adiciona o owner como membro, mas garantimos aqui também
  const { error: memberError } = await supabase
    .from("workspace_members")
    .upsert(
      {
        workspace_id: newWorkspace.id,
        user_id: user.id,
        role: "owner",
      },
      { onConflict: "workspace_id, user_id", ignoreDuplicates: true }
    );

  if (memberError) {
    console.error("Erro ao adicionar membro ao workspace pessoal:", memberError);
    // Não retornamos erro aqui, pois o workspace foi criado
  }

  revalidatePath("/", "layout");
  return { success: true, workspaceId: newWorkspace.id };
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
    .select("id, name, slug")
    .eq("id", workspaceId)
    .single();

  if (error || !workspace) {
    console.error("Erro ao buscar workspace:", error);
    return null;
  }

  // Buscar logo_url separadamente (pode não existir na tabela ainda)
  let logo_url: string | null = null;
  try {
    const { data: workspaceWithLogo } = await supabase
      .from("workspaces")
      .select("logo_url")
      .eq("id", workspaceId)
      .single();
    logo_url = (workspaceWithLogo as any)?.logo_url || null;
  } catch {
    // Se logo_url não existir, ignora o erro
  }

  return {
    ...workspace,
    logo_url,
  } as Workspace;
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
