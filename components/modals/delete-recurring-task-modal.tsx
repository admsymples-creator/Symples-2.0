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
import { Loader2 } from "lucide-react";

interface DeleteRecurringTaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskTitle: string;
  onConfirm: (deleteAll: boolean) => void | Promise<void>;
  isLoading?: boolean;
}

export function DeleteRecurringTaskModal({
  open,
  onOpenChange,
  taskTitle,
  onConfirm,
  isLoading = false,
}: DeleteRecurringTaskModalProps) {
  const handleConfirmSingle = async (e: React.MouseEvent) => {
    e.preventDefault();
    await onConfirm(false);
  };

  const handleConfirmAll = async (e: React.MouseEvent) => {
    e.preventDefault();
    await onConfirm(true);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir Tarefa Recorrente?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta tarefa faz parte de uma série recorrente. O que você deseja fazer?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel disabled={isLoading}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirmSingle}
            disabled={isLoading}
            className="bg-gray-600 hover:bg-gray-700 focus:ring-gray-600"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Excluindo...
              </>
            ) : (
              "Excluir apenas esta"
            )}
          </AlertDialogAction>
          <AlertDialogAction
            onClick={handleConfirmAll}
            disabled={isLoading}
            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Excluindo...
              </>
            ) : (
              "Excluir todas"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

