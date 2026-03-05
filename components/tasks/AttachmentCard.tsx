import { useState } from "react";
import { FileImage, FileText, Trash2, Maximize2, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

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
    uploadProgress?: number;
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

export function AttachmentCard({ file, onDelete, onPreview, uploadProgress }: AttachmentCardProps) {
    const [imageError, setImageError] = useState(false);
    const isImage = isImageFile(file);
    const thumbnailUrl = isImage ? getThumbnailUrl(file.url) : undefined;
    const isUploading = uploadProgress !== undefined;

    // Variants para animação de entrada
    const cardVariants = {
        hidden: { opacity: 0, scale: 0.9, y: 10 },
        visible: { opacity: 1, scale: 1, y: 0 },
        exit: { opacity: 0, scale: 0.9 }
    };

    if (isImage && (thumbnailUrl || isUploading)) {
        return (
            <motion.div
                layout
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                transition={{ duration: 0.2 }}
                className={cn(
                    "relative h-32 rounded-lg border overflow-hidden group cursor-pointer bg-gray-50",
                    isUploading ? "border-blue-200" : "border-gray-100"
                )}
                onClick={() => !isUploading && onPreview?.()}
            >
                {/* Preview da Imagem */}
                {thumbnailUrl ? (
                    <img
                        src={thumbnailUrl}
                        alt={file.name}
                        className={cn(
                            "w-full h-full object-cover transition-all duration-500",
                            isUploading ? "blur-sm opacity-50" : "blur-0 opacity-100"
                        )}
                        onError={() => setImageError(true)}
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-100">
                        <FileImage className="w-8 h-8 text-gray-300" />
                    </div>
                )}

                {/* Botão de exclusão no canto superior direito */}
                {!isUploading && (
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
                )}

                {/* Overlay no Hover para preview */}
                {!isUploading && (
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
                )}

                {/* Loading State Overlay */}
                {isUploading && (
                    <div className="absolute inset-0 flex items-center justify-center z-20">
                        <div className="bg-white/80 backdrop-blur-sm rounded-full p-2 shadow-sm">
                            <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                        </div>
                    </div>
                )}

                {/* Nome do arquivo no rodapé / Barra de Progresso */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                    {isUploading ? (
                        <div className="space-y-1">
                            <div className="flex justify-between text-[10px] text-white font-medium">
                                <span className="truncate max-w-[70%]">{file.name}</span>
                                <span>{Math.round(uploadProgress!)}%</span>
                            </div>
                            <div className="h-1 bg-white/30 rounded-full overflow-hidden">
                                <motion.div
                                    className="h-full bg-blue-500 rounded-full"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${uploadProgress}%` }}
                                    transition={{ duration: 0.1 }}
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <p className="text-xs text-white truncate font-medium">{file.name}</p>
                            <p className="text-xs text-white/80">{file.size}</p>
                        </div>
                    )}
                </div>
            </motion.div>
        );
    }

    // Layout padrão para PDF e outros arquivos
    return (
        <motion.div
            layout
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className={cn(
                "relative h-32 flex items-center gap-2 p-3 bg-gray-50 rounded-lg border transition-colors group/item",
                isUploading ? "border-blue-200 bg-blue-50/30" : "border-gray-100 hover:bg-gray-100"
            )}
        >
            <div className="flex-shrink-0">
                {file.type === "pdf" ? (
                    <FileText className={cn("w-5 h-5", isUploading ? "text-blue-500" : "text-red-500")} />
                ) : (
                    <FileText className={cn("w-5 h-5", isUploading ? "text-blue-500" : "text-gray-500")} />
                )}
            </div>
            <div className="flex-1 min-w-0">
                {file.url && !isUploading ? (
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

                {isUploading ? (
                    <div className="mt-2 space-y-1">
                        <div className="h-1 bg-gray-200 rounded-full overflow-hidden w-full">
                            <motion.div
                                className="h-full bg-blue-500 rounded-full"
                                initial={{ width: 0 }}
                                animate={{ width: `${uploadProgress}%` }}
                                transition={{ duration: 0.1 }}
                            />
                        </div>
                        <p className="text-[10px] text-blue-600 font-medium text-right">{Math.round(uploadProgress!)}%</p>
                    </div>
                ) : (
                    <p className="text-xs text-gray-500">{file.size}</p>
                )}
            </div>

            {/* Botão de exclusão no canto superior direito */}
            {!isUploading && (
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute top-1 right-1 h-6 w-6 bg-gray-200/80 hover:bg-red-500 text-gray-600 hover:text-white opacity-0 group-hover/item:opacity-100 transition-opacity z-10"
                    onClick={() => onDelete(file.id)}
                >
                    <X className="h-3 w-3" />
                </Button>
            )}
        </motion.div>
    );
}

