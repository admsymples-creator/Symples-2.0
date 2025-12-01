"use client";

import { useState } from "react";
import { FileImage, FileText, Trash2, Maximize2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AttachmentCardProps {
    file: {
        id: string;
        name: string;
        type: "image" | "pdf" | "other";
        size: string;
        url?: string;
    };
    onDelete: (id: string) => void;
    onPreview?: () => void;
}

// Função para verificar se é imagem baseado no tipo ou extensão
const isImageFile = (file: { type: string; name: string }): boolean => {
    if (file.type === "image") return true;
    const imageExtensions = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg"];
    const extension = file.name.toLowerCase().substring(file.name.lastIndexOf("."));
    return imageExtensions.includes(extension);
};

// Função para gerar URL de thumbnail do Supabase Storage
const getThumbnailUrl = (url: string | undefined): string | undefined => {
    if (!url) return undefined;
    
    // Se já for uma URL do Supabase Storage, adiciona transformação
    if (url.includes("/storage/v1/object/public/")) {
        // Remove query params existentes e adiciona transformação
        const baseUrl = url.split("?")[0];
        return `${baseUrl}?width=300&height=300&resize=cover`;
    }
    
    // Se não for Supabase, retorna URL original (para compatibilidade)
    return url;
};

// Função para obter URL original (sem transformação)
const getOriginalUrl = (url: string | undefined): string | undefined => {
    if (!url) return undefined;
    // Remove query params de transformação se existirem
    return url.split("?")[0];
};

export function AttachmentCard({ file, onDelete, onPreview }: AttachmentCardProps) {
    const [imageError, setImageError] = useState(false);
    const isImage = isImageFile(file);
    const thumbnailUrl = isImage ? getThumbnailUrl(file.url) : undefined;

    if (isImage && thumbnailUrl) {
        return (
            <>
                <div 
                    className="relative h-32 rounded-lg border border-gray-100 overflow-hidden group cursor-pointer bg-gray-50"
                    onClick={() => onPreview?.()}
                >
                    {/* Preview da Imagem */}
                    <img
                        src={thumbnailUrl}
                        alt={file.name}
                        className="w-full h-full object-cover"
                        onError={() => setImageError(true)}
                    />
                    
                    {/* Botão de exclusão no canto superior direito */}
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute top-1 right-1 h-6 w-6 bg-black/50 hover:bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity z-10"
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete(file.id);
                        }}
                    >
                        <X className="h-3 w-3" />
                    </Button>

                    {/* Overlay no Hover para preview */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 bg-white/90 hover:bg-white text-gray-700"
                            onClick={(e) => {
                                e.stopPropagation();
                                onPreview?.();
                            }}
                        >
                            <Maximize2 className="h-4 w-4" />
                        </Button>
                    </div>

                    {/* Nome do arquivo no rodapé */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <p className="text-xs text-white truncate font-medium">{file.name}</p>
                        <p className="text-xs text-white/80">{file.size}</p>
                    </div>
                </div>
            </>
        );
    }

    // Layout padrão para PDF e outros arquivos
    return (
        <div className="relative h-32 flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-100 hover:bg-gray-100 transition-colors group/item">
            <div className="flex-shrink-0">
                {file.type === "pdf" ? (
                    <FileText className="w-5 h-5 text-red-500" />
                ) : (
                    <FileText className="w-5 h-5 text-gray-500" />
                )}
            </div>
            <div className="flex-1 min-w-0">
                {file.url ? (
                    <a
                        href={file.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block"
                    >
                        <p className="text-xs font-medium text-gray-700 truncate hover:text-blue-600 transition-colors">
                            {file.name}
                        </p>
                    </a>
                ) : (
                    <p className="text-xs font-medium text-gray-700 truncate">
                        {file.name}
                    </p>
                )}
                <p className="text-xs text-gray-500">{file.size}</p>
            </div>
            {/* Botão de exclusão no canto superior direito */}
            <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute top-1 right-1 h-6 w-6 bg-gray-200/80 hover:bg-red-500 text-gray-600 hover:text-white opacity-0 group-hover/item:opacity-100 transition-opacity z-10"
                onClick={() => onDelete(file.id)}
            >
                <X className="h-3 w-3" />
            </Button>
        </div>
    );
}

