"use client";

import { useState } from "react";
import { 
    MoreHorizontal, 
    Maximize2, 
    Copy, 
    Share2,
    Trash2,
} from "lucide-react";
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
import { deleteTask, duplicateTask, getTaskRecurrenceInfo } from "@/lib/actions/tasks";
import { ConfirmModal } from "@/components/modals/confirm-modal";
import { DeleteRecurringTaskModal } from "@/components/modals/delete-recurring-task-modal";

interface Task {
    id: string;
    title: string;
    recurrence_type?: string | null;
    recurrence_parent_id?: string | null;
    [key: string]: any;
}

interface TaskActionsMenuProps {
    task: Task;
    onOpenDetails?: () => void;
    onTaskUpdated?: () => void;
    onTaskDeleted?: () => void;
    onTaskDeletedOptimistic?: (taskId: string) => void;
    onTaskDuplicatedOptimistic?: (duplicatedTask: any) => void;
    className?: string;
}

export function TaskActionsMenu({
    task,
    onOpenDetails,
    onTaskUpdated,
    onTaskDeleted,
    onTaskDeletedOptimistic,
    onTaskDuplicatedOptimistic,
    className,
}: TaskActionsMenuProps) {
    // Log para debug - verificar se callbacks estão chegando
    console.log("🟣 [TaskActionsMenu] Props recebidas:", {
        taskId: task.id,
        hasOnTaskDeletedOptimistic: !!onTaskDeletedOptimistic,
        hasOnTaskDuplicatedOptimistic: !!onTaskDuplicatedOptimistic,
        hasOnTaskUpdated: !!onTaskUpdated,
        hasOnTaskDeleted: !!onTaskDeleted,
    });
    
    const [isDeleting, setIsDeleting] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isRecurringDeleteModalOpen, setIsRecurringDeleteModalOpen] = useState(false);
    const [isRecurring, setIsRecurring] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    // Duplicar
    const handleDuplicate = async () => {
        if (isProcessing) return;
        setIsProcessing(true);
        console.log("🟢 [TaskActionsMenu] handleDuplicate chamado para task:", task.id);
        try {
            const result = await duplicateTask(task.id);
            console.log("🟢 [TaskActionsMenu] duplicateTask result:", result);

            if (result.success) {
                // ✅ Optimistic UI: Adicionar tarefa duplicada instantaneamente
                console.log("🟢 [TaskActionsMenu] onTaskDuplicatedOptimistic existe?", !!onTaskDuplicatedOptimistic);
                console.log("🟢 [TaskActionsMenu] result.data existe?", !!result.data);
                if (result.data && onTaskDuplicatedOptimistic) {
                    console.log("🟢 [TaskActionsMenu] Chamando onTaskDuplicatedOptimistic com:", result.data);
                    onTaskDuplicatedOptimistic(result.data);
                } else {
                    console.warn("🟡 [TaskActionsMenu] onTaskDuplicatedOptimistic não disponível ou result.data vazio");
                }
                toast.success("Tarefa duplicada com sucesso");
                onTaskUpdated?.();
            } else {
                toast.error(result.error || "Erro ao duplicar tarefa");
            }
        } catch (error) {
            console.error("🔴 [TaskActionsMenu] Erro ao duplicar tarefa:", error);
            toast.error("Erro inesperado ao duplicar tarefa");
        } finally {
            setIsProcessing(false);
        }
    };

    // Compartilhar (Copiar link)
    const handleShare = async () => {
        try {
            const url = `${window.location.origin}/tasks?taskId=${task.id}`;
            await navigator.clipboard.writeText(url);
            toast.success("Link copiado para a área de transferência");
        } catch (error) {
            toast.error("Erro ao copiar link");
        }
    };

    // Excluir
    const confirmDelete = async (deleteAll: boolean = false) => {
        setIsDeleting(true);
        console.log("🔴 [TaskActionsMenu] confirmDelete chamado para task:", task.id, "deleteAll:", deleteAll);
        
        // ✅ Optimistic UI: Remover tarefa(s) instantaneamente ANTES de chamar o backend
        console.log("🔴 [TaskActionsMenu] onTaskDeletedOptimistic existe?", !!onTaskDeletedOptimistic);
        if (onTaskDeletedOptimistic) {
            console.log("🔴 [TaskActionsMenu] Chamando onTaskDeletedOptimistic com taskId:", task.id);
            onTaskDeletedOptimistic(task.id);
            // Se deleteAll, precisaríamos remover todas as relacionadas também, mas isso é complexo
            // Por enquanto, removemos apenas a atual e deixamos o refresh lidar com o resto
        } else {
            console.warn("🟡 [TaskActionsMenu] onTaskDeletedOptimistic não disponível");
        }
        
        try {
            const result = await deleteTask(task.id, deleteAll);
            console.log("🔴 [TaskActionsMenu] deleteTask result:", result);
            if (result.success) {
                toast.success(deleteAll ? "Tarefas excluídas com sucesso" : "Tarefa excluída com sucesso");
                onTaskDeleted?.();
            } else {
                // ❌ Rollback: Recarregar para restaurar estado em caso de erro
                console.warn("🟡 [TaskActionsMenu] Erro ao excluir, fazendo rollback");
                toast.error(result.error || "Erro ao excluir tarefa");
                onTaskUpdated?.(); // Recarregar para restaurar estado
            }
        } catch (error) {
            // ❌ Rollback: Recarregar para restaurar estado em caso de erro
            console.error("🔴 [TaskActionsMenu] Erro inesperado ao excluir:", error);
            toast.error("Erro inesperado");
            onTaskUpdated?.(); // Recarregar para restaurar estado
        } finally {
            setIsDeleting(false);
            setIsDeleteModalOpen(false);
            setIsRecurringDeleteModalOpen(false);
        }
    };

    const handleDeleteClick = async () => {
        // Verificar se a tarefa é recorrente
        const recurrenceInfo = await getTaskRecurrenceInfo(task.id);
        
        if (recurrenceInfo.isRecurring && recurrenceInfo.relatedTasksCount > 1) {
            setIsRecurring(true);
            setIsRecurringDeleteModalOpen(true);
        } else {
            setIsRecurring(false);
            setIsDeleteModalOpen(true);
        }
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
                <DropdownMenuContent align="end" className="w-48">
                    {/* Abrir */}
                    {onOpenDetails && (
                        <DropdownMenuItem 
                            onClick={(e) => { 
                                e.stopPropagation(); 
                                onOpenDetails(); 
                            }} 
                            className="text-xs"
                        >
                            <Maximize2 className="w-4 h-4 mr-2" />
                            Abrir
                        </DropdownMenuItem>
                    )}

                    <DropdownMenuSeparator />

                    {/* Duplicar */}
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

                    {/* Compartilhar */}
                    <DropdownMenuItem 
                        onClick={(e) => { 
                            e.stopPropagation(); 
                            handleShare(); 
                        }} 
                        className="text-xs"
                    >
                        <Share2 className="w-4 h-4 mr-2" />
                        Compartilhar
                    </DropdownMenuItem>

                    <DropdownMenuSeparator />

                    {/* Excluir */}
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
                onConfirm={() => confirmDelete(false)}
            />
            <DeleteRecurringTaskModal
                open={isRecurringDeleteModalOpen}
                onOpenChange={setIsRecurringDeleteModalOpen}
                taskTitle={task.title}
                onConfirm={confirmDelete}
                isLoading={isDeleting}
            />
        </>
    );
}
