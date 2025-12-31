"use client";

import React, { useState, useEffect, useTransition } from "react";
import { Loader2, Target } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TaskDatePicker } from "@/components/tasks/pickers/TaskDatePicker";
import { createFinancialGoal, updateFinancialGoal } from "@/lib/actions/finance";

interface GoalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal?: { id: string; title: string; description?: string | null; target_amount: number; current_amount: number; type: "savings" | "spending_limit"; deadline?: string | null } | null;
  workspaceId?: string;
  onSuccess: () => void;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

export function GoalModal({
  open,
  onOpenChange,
  goal,
  workspaceId,
  onSuccess,
}: GoalModalProps) {
  const [isPending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [currentAmount, setCurrentAmount] = useState("");
  const [type, setType] = useState<"savings" | "spending_limit">("savings");
  const [deadline, setDeadline] = useState<Date | undefined>(undefined);

  useEffect(() => {
    if (open) {
      if (goal) {
        setTitle(goal.title);
        setDescription(goal.description || "");
        setTargetAmount(goal.target_amount.toString().replace(".", ","));
        setCurrentAmount(goal.current_amount.toString().replace(".", ","));
        setType(goal.type);
        setDeadline(goal.deadline ? new Date(goal.deadline) : undefined);
      } else {
        setTitle("");
        setDescription("");
        setTargetAmount("");
        setCurrentAmount("");
        setType("savings");
        setDeadline(undefined);
      }
    }
  }, [open, goal]);

  const handleAmountChange = (value: string, setter: (v: string) => void) => {
    const numericValue = value.replace(/\D/g, "");
    const numberValue = Number(numericValue) / 100;
    setter(new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(numberValue));
  };

  const parseAmount = (value: string): number => {
    return parseFloat(
      value
        .replace("R$", "")
        .replace(/\./g, "")
        .replace(",", ".")
        .trim()
    );
  };

  const handleSubmit = () => {
    if (!title || !targetAmount) {
      toast.error("Preencha o título e o valor alvo");
      return;
    }

    const numericTarget = parseAmount(targetAmount);
    const numericCurrent = currentAmount ? parseAmount(currentAmount) : 0;

    if (isNaN(numericTarget) || numericTarget <= 0) {
      toast.error("Valor alvo inválido");
      return;
    }

    if (isNaN(numericCurrent) || numericCurrent < 0) {
      toast.error("Valor atual inválido");
      return;
    }

    startTransition(async () => {
      if (goal) {
        const result = await updateFinancialGoal(goal.id, {
          title,
          description: description || undefined,
          target_amount: numericTarget,
          current_amount: numericCurrent,
          deadline: deadline,
        });

        if (result.success) {
          toast.success("Meta atualizada com sucesso!");
          onSuccess();
        } else {
          toast.error(result.error || "Erro ao atualizar meta");
        }
      } else {
        const result = await createFinancialGoal({
          title,
          description: description || undefined,
          target_amount: numericTarget,
          current_amount: numericCurrent,
          type,
          deadline: deadline,
          workspace_id: workspaceId,
        });

        if (result.success) {
          toast.success("Meta criada com sucesso!");
          onSuccess();
        } else {
          toast.error(result.error || "Erro ao criar meta");
        }
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="w-4 h-4" />
            {goal ? "Editar Meta" : "Nova Meta Financeira"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Economizar para férias"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição (opcional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Adicione uma descrição..."
              rows={3}
            />
          </div>

          {!goal && (
            <div className="space-y-2">
              <Label>Tipo de Meta</Label>
              <Tabs value={type} onValueChange={(v) => setType(v as "savings" | "spending_limit")}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="savings">Economia</TabsTrigger>
                  <TabsTrigger value="spending_limit">Limite de Gasto</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="targetAmount">Valor Alvo</Label>
            <Input
              id="targetAmount"
              value={targetAmount}
              onChange={(e) => handleAmountChange(e.target.value, setTargetAmount)}
              placeholder="R$ 0,00"
              className="text-lg"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="currentAmount">Valor Atual (opcional)</Label>
            <Input
              id="currentAmount"
              value={currentAmount}
              onChange={(e) => handleAmountChange(e.target.value, setCurrentAmount)}
              placeholder="R$ 0,00"
            />
          </div>

          <div className="space-y-2">
            <Label>Prazo (opcional)</Label>
            <TaskDatePicker
              date={deadline || null}
              onSelect={(d) => setDeadline(d || undefined)}
              align="start"
              side="bottom"
              trigger={
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  {deadline ? format(deadline, "dd/MM/yyyy", { locale: ptBR }) : "Selecione uma data"}
                </Button>
              }
            />
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isPending}
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              goal ? "Atualizar" : "Criar"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

