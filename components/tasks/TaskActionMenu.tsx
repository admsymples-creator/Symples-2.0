"use client";

import { useState } from "react";
import { MoreHorizontal, Maximize2, MessageCircle, Zap, AlertTriangle, Copy, Link, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { createTask, updateTask, deleteTask } from "@/lib/actions/tasks";
import { useRouter } from "next/navigation";

interface Task {
    id: string;
    title: string;
    description?: string | null;
    status?: string;
    priority?: "low" | "medium" | "high" | "urgent";
    due_date?: string | null;
    assignee_id?: string | null;
    workspace_id?: string | null;
    origin_context?: any;
    [key: string]: any;
}

interface TaskActionMenuProps {
    task: Task; // Objeto completo da tarefa
    isFocused?: boolean; // Se está focado na semana
    isUrgent?: boolean; // Se está marcado como urgente
    onOpenDetails?: () => void;
    onTaskUpdated?: () => void; // Callback para atualizar a lista após mudanças
    onTaskDeleted?: () => void; // Callback após exclusão
    className?: string;
}

// Função para obter o próximo domingo
const getNextSunday = (): Date => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysUntilSunday = dayOfWeek === 0 ? 7 : 7 - dayOfWeek;
    const nextSunday = new Date(today);
    nextSunday.setDate(today.getDate() + daysUntilSunday);
    nextSunday.setHours(0, 0, 0, 0);
    return nextSunday;
};

import { ConfirmModal } from "@/components/modals/confirm-modal";

export function TaskActionMenu({
    task,
    isFocused = false,
    isUrgent = false,
    onOpenDetails,
    onTaskUpdated,
    onTaskDeleted,
    className,
}: TaskActionMenuProps) {
    const router = useRouter();
    const [isDeleting, setIsDeleting] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    // Verificar se tem contexto do WhatsApp
    const hasWhatsAppContext = task.origin_context && (
        task.origin_context.audio_url ||
        task.origin_context.sender_phone ||
        task.origin_context.message_id
    );

    // Verificar se está focado (data é próximo domingo)
    const checkIsFocused = (): boolean => {
        if (!task.due_date) return false;
        const dueDate = new Date(task.due_date);
        const nextSunday = getNextSunday();
        return dueDate.getTime() === nextSunday.getTime();
    };

    // Verificar se está urgente
    const checkIsUrgent = (): boolean => {
        return task.priority === "urgent" || task.priority === "high";
    };

    const actualIsFocused = isFocused ?? checkIsFocused();
    const actualIsUrgent = isUrgent ?? checkIsUrgent();

    // Ver no WhatsApp
    const handleWhatsApp = () => {
        if (!hasWhatsAppContext) {
            toast.error("Sem contexto de WhatsApp");
            return;
        }

        // Tentar abrir o link do WhatsApp se houver
        if (task.origin_context.audio_url) {
            // Se houver um link, abrir
            window.open(task.origin_context.audio_url, "_blank");
        } else if (task.origin_context.sender_phone) {
            // Abrir conversa no WhatsApp
            const phone = task.origin_context.sender_phone.replace(/\D/g, "");
            window.open(`https://wa.me/${phone}`, "_blank");
        } else {
            toast.error("Sem contexto de WhatsApp disponível");
        }
    };

    // Focar na Semana (mover para próximo domingo)
    const handleToggleFocus = async () => {
        if (isProcessing) return;

        setIsProcessing(true);
        try {
            if (actualIsFocused) {
                // Remover foco - limpar data
                const result = await updateTask({
                    id: task.id,
                    due_date: null,
                });

                if (result.success) {
                    toast.success("Foco removido");
                    onTaskUpdated?.();
                } else {
                    toast.error(result.error || "Erro ao remover foco");
                }
            } else {
                // Adicionar foco - definir para próximo domingo
                const nextSunday = getNextSunday();
                const result = await updateTask({
                    id: task.id,
                    due_date: nextSunday.toISOString(),
                });

                if (result.success) {
                    toast.success("Tarefa focada para a semana");
                    onTaskUpdated?.();
                } else {
                    toast.error(result.error || "Erro ao focar tarefa");
                }
            }
        } catch (error) {
            toast.error("Erro inesperado");
            console.error(error);
        } finally {
            setIsProcessing(false);
        }
    };

    // Marcar como Urgente
    const handleToggleUrgent = async () => {
        if (isProcessing) return;

        setIsProcessing(true);
        try {
            if (actualIsUrgent) {
                // Remover urgência
                const result = await updateTask({
                    id: task.id,
                    priority: "medium",
                });

                if (result.success) {
                    toast.success("Urgência removida");
                    onTaskUpdated?.();
                } else {
                    toast.error(result.error || "Erro ao remover urgência");
                }
            } else {
                // Marcar como urgente
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                const result = await updateTask({
                    id: task.id,
                    priority: "urgent",
                    due_date: today.toISOString(),
                });

                if (result.success) {
                    toast.success("Tarefa marcada como urgente");
                    onTaskUpdated?.();
                } else {
                    toast.error(result.error || "Erro ao marcar como urgente");
                }
            }
        } catch (error) {
            toast.error("Erro inesperado");
            console.error(error);
        } finally {
            setIsProcessing(false);
        }
    };

    // Duplicar tarefa
    const handleDuplicate = async () => {
        if (isProcessing) return;

        setIsProcessing(true);
        try {
            const result = await createTask({
                title: `${task.title} (Cópia)`,
                description: task.description || undefined,
                status: task.status as any,
                priority: task.priority,
                assignee_id: task.assignee_id || undefined,
                workspace_id: task.workspace_id || undefined,
                due_date: task.due_date || undefined,
            });

            if (result.success) {
                toast.success("Tarefa duplicada com sucesso");
                onTaskUpdated?.();
            } else {
                toast.error(result.error || "Erro ao duplicar tarefa");
            }
        } catch (error) {
            toast.error("Erro inesperado");
            console.error(error);
        } finally {
            setIsProcessing(false);
        }
    };

    // Copiar link
    const handleCopyLink = async () => {
        try {
            const url = `${window.location.origin}/tasks?taskId=${task.id}`;
            await navigator.clipboard.writeText(url);
            toast.success("Link copiado para a área de transferência");
        } catch (error) {
            toast.error("Erro ao copiar link");
            console.error(error);
        }
    };

    // Excluir tarefa
    const confirmDelete = async () => {
        setIsDeleting(true);
        try {
            const result = await deleteTask(task.id);

            if (result.success) {
                toast.success("Tarefa excluída com sucesso");
                onTaskDeleted?.();
            } else {
                toast.error(result.error || "Erro ao excluir tarefa");
            }
        } catch (error) {
            toast.error("Erro inesperado");
            console.error(error);
        } finally {
            setIsDeleting(false);
            setIsDeleteModalOpen(false);
        }
    };

    const handleDeleteClick = () => {
        setIsDeleteModalOpen(true);
    };

    return (
        <>
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                        "h-6 w-6 opacity-50 hover:opacity-100 transition-opacity",
                        className
                    )}
                    onClick={(e) => {
                        e.stopPropagation();
                    }}
                    disabled={isDeleting || isProcessing}
                >
                    <MoreHorizontal className="w-4 h-4 text-gray-500" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
                {/* Grupo 1: Navegação */}
                {onOpenDetails && (
                    <DropdownMenuItem
                        onClick={(e) => {
                            e.stopPropagation();
                            onOpenDetails();
                        }}
                        className="text-xs"
                    >
                        <Maximize2 className="w-4 h-4 mr-2" />
                        Abrir Detalhes
                    </DropdownMenuItem>
                )}
                {hasWhatsAppContext && (
                    <DropdownMenuItem
                        onClick={(e) => {
                            e.stopPropagation();
                            handleWhatsApp();
                        }}
                        className="text-xs text-green-600"
                    >
                        <MessageCircle className="w-4 h-4 mr-2" />
                        Ver no WhatsApp
                    </DropdownMenuItem>
                )}

                <DropdownMenuSeparator />

                {/* Grupo 2: Gestão */}
                <DropdownMenuItem
                    onClick={(e) => {
                        e.stopPropagation();
                        handleToggleFocus();
                    }}
                    className="text-xs"
                    disabled={isProcessing}
                >
                    <Zap className="w-4 h-4 mr-2" />
                    {actualIsFocused ? "Remover Foco" : "Focar na Semana"}
                </DropdownMenuItem>
                <DropdownMenuItem
                    onClick={(e) => {
                        e.stopPropagation();
                        handleToggleUrgent();
                    }}
                    className="text-xs"
                    disabled={isProcessing}
                >
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    {actualIsUrgent ? "Remover Urgência" : "Marcar Urgente"}
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                {/* Grupo 3: Ações */}
                <DropdownMenuItem
                    onClick={(e) => {
                        e.stopPropagation();
                        handleDuplicate();
                    }}
                    className="text-xs"
                    disabled={isProcessing}
                >
                    <Copy className="w-4 h-4 mr-2" />
                    Duplicar
                </DropdownMenuItem>
                <DropdownMenuItem
                    onClick={(e) => {
                        e.stopPropagation();
                        handleCopyLink();
                    }}
                    className="text-xs"
                >
                    <Link className="w-4 h-4 mr-2" />
                    Copiar Link
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                {/* Grupo 4: Perigo */}
                <DropdownMenuItem
                    onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteClick();
                    }}
                    className="text-xs text-red-600 focus:bg-red-50 focus:text-red-600"
                    disabled={isDeleting}
                >
                    <Trash2 className="w-4 h-4 mr-2" />
                    {isDeleting ? "Excluindo..." : "Excluir"}
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>

        <ConfirmModal
            open={isDeleteModalOpen}
            onOpenChange={setIsDeleteModalOpen}
            title="Excluir Tarefa?"
            description="Esta ação não pode ser desfeita."
            confirmText="Excluir Tarefa"
            isLoading={isDeleting}
            onConfirm={confirmDelete}
        />
    </>
    );
}
