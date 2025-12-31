"use client";

import React, { useState, useEffect, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface BudgetModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  month: number;
  year: number;
  budget?: { id: string; category: string; amount: number } | null;
  onSave: (category: string, amount: number) => Promise<void>;
  existingCategories: string[];
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

export function BudgetModal({
  open,
  onOpenChange,
  month,
  year,
  budget,
  onSave,
  existingCategories,
}: BudgetModalProps) {
  const [isPending, startTransition] = useTransition();
  const [category, setCategory] = useState(budget?.category || "");
  const [amount, setAmount] = useState("");

  useEffect(() => {
    if (open) {
      if (budget) {
        setCategory(budget.category);
        setAmount(budget.amount.toString().replace(".", ","));
      } else {
        setCategory("");
        setAmount("");
      }
    }
  }, [open, budget]);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "");
    const numberValue = Number(value) / 100;
    setAmount(new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(numberValue));
  };

  const handleSubmit = () => {
    if (!category || !amount) {
      toast.error("Preencha a categoria e o valor");
      return;
    }

    // Convert formatted string back to number
    const numericAmount = parseFloat(
      amount
        .replace("R$", "")
        .replace(/\./g, "")
        .replace(",", ".")
        .trim()
    );

    if (isNaN(numericAmount) || numericAmount <= 0) {
      toast.error("Valor inválido");
      return;
    }

    startTransition(async () => {
      await onSave(category, numericAmount);
    });
  };

  const monthNames = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  const allCategories = [
    "marketing",
    "services",
    "software",
    "infrastructure",
    "salary",
    "personal",
    "other",
    "Geral",
  ];

  const availableCategories = allCategories.filter(
    cat => !existingCategories.includes(cat) || cat === category
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {budget ? "Editar Orçamento" : "Definir Orçamento"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Mês/Ano</Label>
            <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
              {monthNames[month - 1]} {year}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Categoria</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger id="category">
                <SelectValue placeholder="Selecione a categoria" />
              </SelectTrigger>
              <SelectContent>
                {availableCategories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat === "marketing" ? "Marketing" :
                     cat === "services" ? "Serviços" :
                     cat === "software" ? "Software" :
                     cat === "infrastructure" ? "Infraestrutura" :
                     cat === "salary" ? "Salário" :
                     cat === "personal" ? "Pessoal" :
                     cat === "other" ? "Outros" :
                     cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Valor do Orçamento</Label>
            <Input
              id="amount"
              value={amount}
              onChange={handleAmountChange}
              placeholder="R$ 0,00"
              className="text-lg"
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
              budget ? "Atualizar" : "Salvar"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

