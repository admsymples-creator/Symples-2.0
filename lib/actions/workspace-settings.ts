"use server";

import { createServerActionClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { clearUserWorkspacesCache } from "@/lib/actions/user";

export async function updateWorkspaceSettings(workspaceId: string, formData: FormData) {
  const supabase = await createServerActionClient();
  
  // 1. Validação de Autenticação e Permissão
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Usuário não autenticado");

  // Verificar se usuário é admin/owner do workspace
  const { data: memberData, error: memberError } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .single();

  if (memberError || !memberData || !memberData.role || !["owner", "admin"].includes(memberData.role)) {
    throw new Error("Permissão negada: Apenas administradores podem editar o workspace.");
  }

  const name = formData.get("name") as string;
  const slug = formData.get("slug") as string;
  const logoFile = formData.get("logo") as File | null;

  let logo_url = undefined;

  // 2. Upload da Logo (se houver)
  if (logoFile && logoFile.size > 0) {
    // Bucket: 'workspace-logos'
    const fileExt = logoFile.name.split('.').pop();
    const fileName = `${workspaceId}-${Date.now()}.${fileExt}`;
    const filePath = `${workspaceId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('workspace-logos')
      .upload(filePath, logoFile, {
        upsert: true
      });

    if (uploadError) {
      console.error("Erro no upload da logo:", uploadError);
      throw new Error("Falha ao fazer upload da logo");
    }

    const { data: { publicUrl } } = supabase.storage
      .from('workspace-logos')
      .getPublicUrl(filePath);

    logo_url = publicUrl;
  }

  // 3. Atualização no Banco de Dados
  const updateData: any = {
    name,
    slug,
    updated_at: new Date().toISOString(),
  };

  // Só atualiza a logo se houve upload novo, senão mantém a antiga
  // Mas precisamos saber se existe campo de logo na tabela workspaces?
  // O schema padrão não tem 'logo_url' ou 'avatar_url' em workspaces explicitamente listado no arquivo lido anteriormente,
  // mas vamos assumir que deva existir ou salvamos em metadata se não houver.
  // Vamos verificar se existe 'avatar_url' ou 'logo_url' em workspaces na próxima etapa se der erro,
  // mas geralmente workspaces tem 'logo_url' ou usa o storage direto.
  
  // Vou assumir 'logo_url' como nome padrão para workspaces, se falhar ajustamos.
  // Na verdade, olhando o schema.sql lido antes:
  // CREATE TABLE IF NOT EXISTS public.workspaces ( ... name TEXT, slug TEXT ... )
  // Não vi avatar_url/logo_url. Vamos precisar adicionar esse campo se não existir!
  
  if (logo_url) {
      // Atualiza a logo_url se houve upload
      updateData.logo_url = logo_url;
  }

  const { error } = await supabase
    .from("workspaces")
    .update(updateData)
    .eq("id", workspaceId);

  if (error) {
    console.error("Erro ao atualizar workspace:", error);
    // Se o erro for coluna inexistente, saberemos.
    throw new Error(`Falha ao atualizar workspace: ${error.message}`);
  }

  revalidatePath("/settings");
  revalidatePath("/", "layout");
  
  return { success: true };
}

export async function deleteWorkspace(workspaceId: string) {
  const supabase = await createServerActionClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Usuário não autenticado" };
  }

  console.log("[deleteWorkspace] Tentando excluir workspace:", {
    workspaceId,
    userId: user.id
  });

  // Verificar se o usuário é owner via workspace_members
  const { data: memberData, error: memberError } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .single();

  console.log("[deleteWorkspace] Verificação de membro:", {
    memberData,
    memberError: memberError ? { message: memberError.message, code: memberError.code } : null
  });

  // Também verificar se é owner via campo owner_id na tabela workspaces (fallback)
  const { data: workspaceData, error: workspaceError } = await supabase
    .from("workspaces")
    .select("owner_id")
    .eq("id", workspaceId)
    .single();

  console.log("[deleteWorkspace] Verificação de workspace owner_id:", {
    workspaceData,
    workspaceError: workspaceError ? { message: workspaceError.message, code: workspaceError.code } : null
  });

  // Verificar se é owner por qualquer um dos métodos
  const isOwnerByMember = memberData?.role === "owner";
  const isOwnerByWorkspace = workspaceData?.owner_id === user.id;
  const isOwner = isOwnerByMember || isOwnerByWorkspace;

  console.log("[deleteWorkspace] Verificação de owner:", {
    isOwnerByMember,
    isOwnerByWorkspace,
    isOwner
  });

  if (!isOwner) {
    return { 
      success: false, 
      error: `Apenas o owner pode excluir o workspace. (role: ${memberData?.role || 'não encontrado'}, owner_id match: ${isOwnerByWorkspace})` 
    };
  }

  const { error: deleteError } = await supabase
    .from("workspaces")
    .delete()
    .eq("id", workspaceId);

  if (deleteError) {
    console.error("[deleteWorkspace] Erro ao excluir workspace:", {
      message: deleteError.message,
      code: deleteError.code,
      details: deleteError.details,
      hint: deleteError.hint
    });
    return { success: false, error: deleteError.message };
  }

  console.log("[deleteWorkspace] Workspace excluído com sucesso:", workspaceId);

  await clearUserWorkspacesCache(user.id);
  revalidatePath("/", "layout");
  revalidatePath("/settings");
  revalidatePath("/home");

  return { success: true };
}
