"use server";

import { createServerActionClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface AttachmentParams {
  taskId: string;
  fileUrl: string;
  fileName: string;
  fileType?: string;
  fileSize?: number;
  filePath?: string; // Path do arquivo no Storage (para facilitar deleção)
}

export interface TaskAttachment {
  id: string;
  task_id: string;
  file_url: string;
  file_type: string | null;
  file_name: string;
  file_size: number | null;
  uploader_id: string | null;
  created_at: string;
}

/**
 * Salva um anexo de tarefa no banco de dados
 * @param params - Parâmetros do anexo (taskId, fileUrl, fileName, fileType, fileSize)
 * @returns Anexo criado ou erro
 */
export async function saveAttachment(
  params: AttachmentParams
): Promise<{ success: boolean; data?: TaskAttachment; error?: string }> {
  try {
    const supabase = await createServerActionClient();

    // Verificar autenticação
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error("Erro de autenticação:", authError);
      return { success: false, error: "Usuário não autenticado" };
    }

    // Inserir anexo na tabela
    // Nota: Se o schema tiver uma coluna file_path, podemos salvá-la também
    // Por enquanto, vamos extrair o path da URL quando necessário
    const { data, error } = await supabase
      .from("task_attachments")
      .insert({
        task_id: params.taskId,
        file_url: params.fileUrl,
        file_name: params.fileName,
        file_type: params.fileType || null,
        file_size: params.fileSize || null,
        uploader_id: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error("Erro ao salvar anexo:", error);
      return {
        success: false,
        error: error.message,
      };
    }

    // Revalidar cache da página de tarefas
    revalidatePath("/tasks");

    return { success: true, data: data as TaskAttachment };
  } catch (error) {
    console.error("Erro inesperado ao salvar anexo:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro desconhecido",
    };
  }
}

/**
 * Deleta um anexo de tarefa (banco + Storage)
 * @param attachmentId - ID do anexo
 * @returns Sucesso ou erro
 */
export async function deleteAttachment(
  attachmentId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createServerActionClient();

    // Verificar autenticação
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error("Erro de autenticação:", authError);
      return { success: false, error: "Usuário não autenticado" };
    }

    // 1. Buscar o anexo para obter a URL do arquivo
    const { data: attachment, error: fetchError } = await supabase
      .from("task_attachments")
      .select("file_url")
      .eq("id", attachmentId)
      .single();

    if (fetchError || !attachment) {
      console.error("Erro ao buscar anexo:", fetchError);
      return {
        success: false,
        error: fetchError?.message || "Anexo não encontrado",
      };
    }

    // 2. Extrair o path do arquivo da URL
    // A URL do Supabase Storage geralmente é: 
    // https://[project].supabase.co/storage/v1/object/public/attachments/[path]
    // ou: https://[project].supabase.co/storage/v1/object/sign/attachments/[path]?token=...
    const fileUrl = attachment.file_url;
    let filePath: string | null = null;

    try {
      // Método 1: Tentar extrair usando split
      const urlParts = fileUrl.split("/attachments/");
      if (urlParts.length > 1) {
        // Remover query params se houver
        filePath = urlParts[1].split("?")[0];
      } else {
        // Método 2: Tentar usar regex na pathname
        const urlObj = new URL(fileUrl);
        const pathMatch = urlObj.pathname.match(/\/attachments\/(.+)$/);
        if (pathMatch) {
          filePath = pathMatch[1];
        }
      }

      // Validar que temos um path válido
      if (!filePath || filePath.trim() === "") {
        throw new Error("Path vazio após extração");
      }
    } catch (urlError) {
      console.warn("Não foi possível extrair o path da URL:", urlError);
      console.warn("URL do arquivo:", fileUrl);
      // Continuar mesmo assim - tentar deletar do banco
      // Mas vamos tentar deletar do Storage usando a URL completa como fallback
    }

    // 3. Deletar o arquivo físico do Storage (se tivermos o path)
    if (filePath) {
      const { error: storageError } = await supabase.storage
        .from("attachments")
        .remove([filePath]);

      if (storageError) {
        console.warn("Erro ao deletar arquivo do Storage:", storageError);
        console.warn("Tentando deletar do banco mesmo assim...");
        // Não falhar aqui - continuar para deletar do banco mesmo se o Storage falhar
        // (pode ser que o arquivo já não exista mais, ou o path esteja incorreto)
      } else {
        console.log(`✅ Arquivo deletado do Storage: ${filePath}`);
      }
    } else {
      console.warn("⚠️ Não foi possível extrair o path do arquivo da URL.");
      console.warn("URL:", fileUrl);
      console.warn("Apenas deletando referência do banco. O arquivo pode permanecer no Storage.");
    }

    // 4. Deletar a referência no banco de dados
    const { error: deleteError } = await supabase
      .from("task_attachments")
      .delete()
      .eq("id", attachmentId);

    if (deleteError) {
      console.error("Erro ao deletar anexo do banco:", deleteError);
      return {
        success: false,
        error: deleteError.message,
      };
    }

    // Revalidar cache da página de tarefas
    revalidatePath("/tasks");

    return { success: true };
  } catch (error) {
    console.error("Erro inesperado ao deletar anexo:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro desconhecido",
    };
  }
}

