"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface DeleteRecurringTaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (deleteAll: boolean) => void;
  isLoading: boolean;
  taskTitle: string;
  /** Quando true, oculta "Excluir apenas esta" (ex.: ocorrência virtual/projetada) */
  hideOnlyThisOption?: boolean;
}

export function DeleteRecurringTaskModal({
  open,
  onOpenChange,
  onConfirm,
  isLoading,
  taskTitle,
  hideOnlyThisOption = false,
}: DeleteRecurringTaskModalProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir tarefa recorrente?</AlertDialogTitle>
          <AlertDialogDescription>
            {hideOnlyThisOption
              ? `Esta é uma prévia de recorrência. Para remover, exclua a tarefa recorrente "${taskTitle}".`
              : `Você está excluindo uma ocorrência de "${taskTitle}".`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex flex-col gap-2 py-4">
          {!hideOnlyThisOption && (
            <Button
              variant="outline"
              onClick={() => onConfirm(false)}
              disabled={isLoading}
              className="justify-start"
            >
              Excluir apenas esta (Pular ocorrência)
            </Button>
          )}
          <Button
            variant="destructive"
            onClick={() => onConfirm(true)}
            disabled={isLoading}
            className="justify-start"
          >
            Excluir tarefa recorrente (Encerrar série)
          </Button>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancelar</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
