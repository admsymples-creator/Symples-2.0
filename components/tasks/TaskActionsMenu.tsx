"use client";

import { useState } from "react";
import { 
    MoreHorizontal, 
    Maximize2, 
    MessageCircle, 
    Zap, 
    AlertTriangle, 
    Copy, 
    Link, 
    Trash2,
    CheckCircle2,
    Calendar,
    User,
    ArrowUpCircle,
    ArrowDownCircle,
    MinusCircle,
    AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    DropdownMenuSub,
    DropdownMenuSubTrigger,
    DropdownMenuSubContent,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { createTask, updateTask, deleteTask, duplicateTask } from "@/lib/actions/tasks";
import { useRouter } from "next/navigation";
import { ConfirmModal } from "@/components/modals/confirm-modal";
import { TASK_CONFIG, mapLabelToStatus, ORDERED_STATUSES, STATUS_TO_LABEL } from "@/lib/config/tasks";
import { Avatar } from "@/components/tasks/Avatar";

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

interface Member {
    id: string;
    name: string;
    avatar?: string;
}

interface TaskActionsMenuProps {
    task: Task;
    isFocused?: boolean;
    isUrgent?: boolean;
    onOpenDetails?: () => void;
    onTaskUpdated?: () => void;
    onTaskDeleted?: () => void;
    className?: string;
    members?: Member[]; // Membros para atribuição rápida
}

// Função para obter datas
const getToday = (): Date => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
};

const getTomorrow = (): Date => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow;
};

const getNextWeek = (): Date => {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    nextWeek.setHours(0, 0, 0, 0);
    return nextWeek;
};

// Função para obter o próximo domingo (Foco)
const getNextSunday = (): Date => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysUntilSunday = dayOfWeek === 0 ? 7 : 7 - dayOfWeek;
    const nextSunday = new Date(today);
    nextSunday.setDate(today.getDate() + daysUntilSunday);
    nextSunday.setHours(0, 0, 0, 0);
    return nextSunday;
};

export function TaskActionsMenu({
    task,
    isFocused = false,
    isUrgent = false,
    onOpenDetails,
    onTaskUpdated,
    onTaskDeleted,
    className,
    members = [],
}: TaskActionsMenuProps) {
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

    // --- Handlers de Ação ---

    const handleStatusChange = async (newStatusLabel: string) => {
        if (isProcessing) return;
        setIsProcessing(true);
        
        const dbStatus = mapLabelToStatus(newStatusLabel);
        try {
            const result = await updateTask({
                id: task.id,
                status: dbStatus as any,
            });

            if (result.success) {
                toast.success(`Status alterado para ${newStatusLabel}`);
                onTaskUpdated?.();
            } else {
                toast.error("Erro ao atualizar status");
            }
        } catch (error) {
            toast.error("Erro ao atualizar status");
        } finally {
            setIsProcessing(false);
        }
    };

    const handlePriorityChange = async (newPriority: string) => {
        if (isProcessing) return;
        setIsProcessing(true);

        try {
            const result = await updateTask({
                id: task.id,
                priority: newPriority as any,
            });

            if (result.success) {
                toast.success("Prioridade atualizada");
                onTaskUpdated?.();
            } else {
                toast.error("Erro ao atualizar prioridade");
            }
        } catch (error) {
            toast.error("Erro ao atualizar prioridade");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDateChange = async (date: Date | null) => {
        if (isProcessing) return;
        setIsProcessing(true);

        try {
            const result = await updateTask({
                id: task.id,
                due_date: date ? date.toISOString() : null,
            });

            if (result.success) {
                toast.success(date ? "Data definida" : "Data removida");
                onTaskUpdated?.();
            } else {
                toast.error("Erro ao atualizar data");
            }
        } catch (error) {
            toast.error("Erro ao atualizar data");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleAssigneeChange = async (memberId: string | null) => {
        if (isProcessing) return;
        setIsProcessing(true);

        try {
            const result = await updateTask({
                id: task.id,
                assignee_id: memberId,
            });

            if (result.success) {
                const memberName = members.find(m => m.id === memberId)?.name || "usuário";
                toast.success(memberId ? `Atribuído a ${memberName}` : "Atribuição removida");
                onTaskUpdated?.();
            } else {
                toast.error("Erro ao atualizar responsável");
            }
        } catch (error) {
            toast.error("Erro ao atualizar responsável");
        } finally {
            setIsProcessing(false);
        }
    };

    // Ver no WhatsApp
    const handleWhatsApp = () => {
        if (!hasWhatsAppContext) {
            toast.error("Sem contexto de WhatsApp");
            return;
        }

        if (task.origin_context.audio_url) {
            window.open(task.origin_context.audio_url, "_blank");
        } else if (task.origin_context.sender_phone) {
            const phone = task.origin_context.sender_phone.replace(/\D/g, "");
            window.open(`https://wa.me/${phone}`, "_blank");
        } else {
            toast.error("Sem contexto de WhatsApp disponível");
        }
    };

    // Focar na Semana
    const handleToggleFocus = async () => {
        if (isProcessing) return;
        setIsProcessing(true);
        try {
            if (actualIsFocused) {
                const result = await updateTask({ id: task.id, due_date: null });
                if (result.success) {
                    toast.success("Foco removido");
                    onTaskUpdated?.();
                }
            } else {
                const nextSunday = getNextSunday();
                const result = await updateTask({ id: task.id, due_date: nextSunday.toISOString() });
                if (result.success) {
                    toast.success("Tarefa focada para a semana");
                    onTaskUpdated?.();
                }
            }
        } catch (error) {
            toast.error("Erro inesperado");
        } finally {
            setIsProcessing(false);
        }
    };

    // Toggle Urgente (Atalho)
    const handleToggleUrgent = async () => {
        if (isProcessing) return;
        setIsProcessing(true);
        try {
            if (actualIsUrgent) {
                const result = await updateTask({ id: task.id, priority: "medium" });
                if (result.success) {
                    toast.success("Urgência removida");
                    onTaskUpdated?.();
                }
            } else {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const result = await updateTask({ id: task.id, priority: "urgent", due_date: today.toISOString() });
                if (result.success) {
                    toast.success("Tarefa marcada como urgente");
                    onTaskUpdated?.();
                }
            }
        } catch (error) {
            toast.error("Erro inesperado");
        } finally {
            setIsProcessing(false);
        }
    };

    // Duplicar
    const handleDuplicate = async () => {
        if (isProcessing) return;
        setIsProcessing(true);
        try {
            const result = await duplicateTask(task.id);

            if (result.success) {
                toast.success("Tarefa duplicada com sucesso");
                onTaskUpdated?.();
            } else {
                toast.error(result.error || "Erro ao duplicar tarefa");
            }
        } catch (error) {
            console.error("Erro ao duplicar tarefa:", error);
            toast.error("Erro inesperado ao duplicar tarefa");
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
        }
    };

    // Excluir
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
        <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                        "h-6 w-6 opacity-50 hover:opacity-100 transition-opacity cursor-pointer",
                        className
                    )}
                    onClick={(e) => {
                        e.stopPropagation();
                    }}
                    onPointerDown={(e) => {
                        e.stopPropagation();
                    }}
                    onMouseDown={(e) => {
                        e.stopPropagation();
                    }}
                    disabled={isDeleting || isProcessing}
                >
                    <MoreHorizontal className="w-4 h-4 text-gray-500" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
                {/* Navegação */}
                {onOpenDetails && (
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onOpenDetails(); }} className="text-xs">
                        <Maximize2 className="w-4 h-4 mr-2" />
                        Abrir Detalhes
                    </DropdownMenuItem>
                )}
                {hasWhatsAppContext && (
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleWhatsApp(); }} className="text-xs text-green-600">
                        <MessageCircle className="w-4 h-4 mr-2" />
                        Ver no WhatsApp
                    </DropdownMenuItem>
                )}

                <DropdownMenuSeparator />

                {/* Status - Quick Edit */}
                <DropdownMenuSub>
                    <DropdownMenuSubTrigger className="text-xs">
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Alterar Status
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                        <DropdownMenuRadioGroup
                            value={STATUS_TO_LABEL[task.status as keyof typeof STATUS_TO_LABEL] || task.status}
                            onValueChange={handleStatusChange}
                        >
                            {ORDERED_STATUSES.map(status => (
                                <DropdownMenuRadioItem key={status} value={STATUS_TO_LABEL[status]} className="text-xs">
                                    {TASK_CONFIG[status].label}
                                </DropdownMenuRadioItem>
                            ))}
                        </DropdownMenuRadioGroup>
                    </DropdownMenuSubContent>
                </DropdownMenuSub>

                {/* Prioridade - Quick Edit */}
                <DropdownMenuSub>
                    <DropdownMenuSubTrigger className="text-xs">
                        <AlertCircle className="w-4 h-4 mr-2" />
                        Definir Prioridade
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                        <DropdownMenuRadioGroup value={task.priority || "medium"} onValueChange={handlePriorityChange}>
                            <DropdownMenuRadioItem value="urgent" className="text-xs text-red-600">Urgente</DropdownMenuRadioItem>
                            <DropdownMenuRadioItem value="high" className="text-xs text-orange-600">Alta</DropdownMenuRadioItem>
                            <DropdownMenuRadioItem value="medium" className="text-xs text-yellow-600">Média</DropdownMenuRadioItem>
                            <DropdownMenuRadioItem value="low" className="text-xs text-blue-600">Baixa</DropdownMenuRadioItem>
                        </DropdownMenuRadioGroup>
                    </DropdownMenuSubContent>
                </DropdownMenuSub>

                {/* Data - Quick Edit */}
                <DropdownMenuSub>
                    <DropdownMenuSubTrigger className="text-xs">
                        <Calendar className="w-4 h-4 mr-2" />
                        Definir Prazo
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                        <DropdownMenuItem onClick={() => handleDateChange(getToday())} className="text-xs">
                            Hoje
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDateChange(getTomorrow())} className="text-xs">
                            Amanhã
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDateChange(getNextWeek())} className="text-xs">
                            Próxima Semana
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleDateChange(null)} className="text-xs text-red-500">
                            Remover Prazo
                        </DropdownMenuItem>
                    </DropdownMenuSubContent>
                </DropdownMenuSub>

                {/* Responsável - Quick Edit */}
                {members.length > 0 && (
                    <DropdownMenuSub>
                        <DropdownMenuSubTrigger className="text-xs">
                            <User className="w-4 h-4 mr-2" />
                            Atribuir a...
                        </DropdownMenuSubTrigger>
                        <DropdownMenuSubContent className="max-h-60 overflow-y-auto">
                            <DropdownMenuItem onClick={() => handleAssigneeChange(null)} className="text-xs text-gray-500">
                                <MinusCircle className="w-3 h-3 mr-2" />
                                Sem responsável
                            </DropdownMenuItem>
                            {members.map(member => (
                                <DropdownMenuItem key={member.id} onClick={() => handleAssigneeChange(member.id)} className="text-xs">
                                    <Avatar name={member.name} avatar={member.avatar} size="sm" className="w-4 h-4 mr-2" />
                                    {member.name}
                                    {task.assignee_id === member.id && <CheckCircle2 className="w-3 h-3 ml-auto text-green-600" />}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuSubContent>
                    </DropdownMenuSub>
                )}

                <DropdownMenuSeparator />

                {/* Atalhos de Gestão */}
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleToggleFocus(); }} className="text-xs" disabled={isProcessing}>
                    <Zap className="w-4 h-4 mr-2" />
                    {actualIsFocused ? "Remover Foco" : "Focar na Semana"}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleToggleUrgent(); }} className="text-xs" disabled={isProcessing}>
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    {actualIsUrgent ? "Remover Urgência" : "Marcar Urgente"}
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                {/* Ações */}
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDuplicate(); }} className="text-xs" disabled={isProcessing}>
                    <Copy className="w-4 h-4 mr-2" />
                    Duplicar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleCopyLink(); }} className="text-xs">
                    <Link className="w-4 h-4 mr-2" />
                    Copiar Link
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                {/* Perigo */}
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDeleteClick(); }} className="text-xs text-red-600 focus:bg-red-50 focus:text-red-600" disabled={isDeleting}>
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

