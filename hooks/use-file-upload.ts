"use client";

import { useState } from "react";
import { createBrowserClient } from "@/lib/supabase";

export interface UploadProgress {
  fileName: string;
  progress: number;
  status: "uploading" | "success" | "error";
  error?: string;
}

export interface UploadResult {
  url: string;
  path: string;
}

/**
 * Hook para fazer upload de arquivos para o Supabase Storage
 */
export function useFileUpload() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<Record<string, UploadProgress>>({});

  /**
   * Faz upload de um arquivo para o Supabase Storage
   * @param file - Arquivo a ser enviado
   * @param bucket - Nome do bucket (padrão: 'attachments')
   * @returns URL pública do arquivo ou erro
   */
  const uploadToStorage = async (
    file: File,
    bucket: string = "task-files"
  ): Promise<{ success: boolean; url?: string; path?: string; error?: string }> => {
    try {
      setUploading(true);
      
      // Gerar nome único para o arquivo
      // Sanitizar o nome do arquivo para evitar problemas
      const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(2, 15);
      const fileName = `${timestamp}-${randomStr}-${sanitizedFileName}`;
      const filePath = `${fileName}`;

      // Criar cliente Supabase
      const supabase = createBrowserClient();

      // Verificar se o bucket existe (tentando listar)
      const { data: buckets, error: listError } = await supabase.storage.listBuckets();
      
      if (listError) {
        console.warn("Erro ao listar buckets:", listError);
      } else {
        const bucketExists = buckets?.some((b) => b.name === bucket);
        if (!bucketExists) {
          const errorMsg = `Bucket '${bucket}' não encontrado. Buckets disponíveis: ${buckets?.map((b) => b.name).join(", ") || "nenhum"}. Por favor, crie o bucket '${bucket}' no Supabase Dashboard (Storage > New bucket).`;
          setProgress((prev) => ({
            ...prev,
            [file.name]: {
              fileName: file.name,
              progress: 0,
              status: "error",
              error: errorMsg,
            },
          }));
          return { success: false, error: errorMsg };
        }
      }

      // Determinar tipo de arquivo
      const fileType = getFileType(file.type || file.name);

      // Inicializar progresso
      setProgress((prev) => ({
        ...prev,
        [file.name]: {
          fileName: file.name,
          progress: 0,
          status: "uploading",
        },
      }));

      // Fazer upload do arquivo
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (error) {
        console.error("Erro ao fazer upload:", error);
        
        // Mensagem de erro mais amigável
        let errorMessage = error.message;
        if (error.message.includes("Bucket not found") || error.message.includes("bucket not found")) {
          errorMessage = `Bucket '${bucket}' não encontrado. Por favor, crie o bucket no Supabase Dashboard (Storage > New bucket). Veja docs/STORAGE_SETUP.md para instruções.`;
        } else if (error.message.includes("new row violates row-level security") || error.message.includes("RLS")) {
          errorMessage = "Permissão negada. Verifique as políticas RLS do Storage. Veja supabase/storage_setup.sql para configurar.";
        }
        
        setProgress((prev) => ({
          ...prev,
          [file.name]: {
            fileName: file.name,
            progress: 0,
            status: "error",
            error: errorMessage,
          },
        }));
        return { success: false, error: errorMessage };
      }

      // Obter URL pública do arquivo
      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl;

      // Atualizar progresso para sucesso
      setProgress((prev) => ({
        ...prev,
        [file.name]: {
          fileName: file.name,
          progress: 100,
          status: "success",
        },
      }));

      return {
        success: true,
        url: publicUrl,
        path: filePath, // Retornar o path para facilitar deleção futura
      };
    } catch (error) {
      console.error("Erro inesperado ao fazer upload:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Erro desconhecido";
      
      setProgress((prev) => ({
        ...prev,
        [file.name]: {
          fileName: file.name,
          progress: 0,
          status: "error",
          error: errorMessage,
        },
      }));

      return { success: false, error: errorMessage };
    } finally {
      setUploading(false);
    }
  };

  /**
   * Faz upload de múltiplos arquivos
   */
  const uploadMultiple = async (
    files: File[],
    bucket: string = "task-files"
  ): Promise<Array<{ success: boolean; url?: string; path?: string; error?: string; fileName: string }>> => {
    const results = await Promise.all(
      files.map(async (file) => {
        const result = await uploadToStorage(file, bucket);
        return { ...result, fileName: file.name };
      })
    );

    return results;
  };

  /**
   * Limpa o progresso de um arquivo específico
   */
  const clearProgress = (fileName: string) => {
    setProgress((prev) => {
      const newProgress = { ...prev };
      delete newProgress[fileName];
      return newProgress;
    });
  };

  /**
   * Limpa todo o progresso
   */
  const clearAllProgress = () => {
    setProgress({});
  };

  return {
    uploadToStorage,
    uploadMultiple,
    uploading,
    progress,
    clearProgress,
    clearAllProgress,
  };
}

/**
 * Determina o tipo de arquivo baseado no MIME type ou extensão
 */
function getFileType(mimeTypeOrFileName: string): string {
  const mimeType = mimeTypeOrFileName.toLowerCase();
  const fileName = mimeTypeOrFileName.toLowerCase();

  if (mimeType.startsWith("image/")) {
    return "image";
  }
  if (mimeType.startsWith("video/")) {
    return "video";
  }
  if (mimeType.startsWith("audio/")) {
    return "audio";
  }
  if (
    mimeType.includes("pdf") ||
    mimeType.includes("document") ||
    mimeType.includes("word") ||
    mimeType.includes("excel") ||
    mimeType.includes("spreadsheet") ||
    fileName.endsWith(".pdf") ||
    fileName.endsWith(".doc") ||
    fileName.endsWith(".docx") ||
    fileName.endsWith(".xls") ||
    fileName.endsWith(".xlsx")
  ) {
    return "document";
  }
  return "other";
}

