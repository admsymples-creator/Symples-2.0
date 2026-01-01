"use client";

import React, { useState, useEffect, useTransition } from "react";
import { 
  Calendar as CalendarIcon,
  PenLine,
  Tag,
  CheckCircle2,
  RefreshCw,
  Loader2
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
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
import { cn } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { updateTransaction } from "@/lib/actions/finance";
import { TaskDatePicker } from "@/components/tasks/pickers/TaskDatePicker";

interface Transaction {
  id: string;
  amount: number;
  type: "income" | "expense";
  description: string;
  category: string;
  due_date: string; // Data de vencimento
  created_at?: string; // Data de criação
  status: "paid" | "pending" | "scheduled" | "cancelled";
  is_recurring: boolean;
}

interface EditTransactionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: Transaction | null;
  onSuccess?: () => void;
}

type TransactionType = "income" | "expense";

export function EditTransactionModal({ open, onOpenChange, transaction, onSuccess }: EditTransactionModalProps) {
  const [isPending, startTransition] = useTransition();
  const [type, setType] = useState<TransactionType>("expense");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [dueDate, setDueDate] = useState<Date | undefined>(new Date());
  const [status, setStatus] = useState<"paid" | "pending" | "scheduled" | "cancelled">("paid");
  const [isRecurring, setIsRecurring] = useState(false);

  // Preencher form quando transaction mudar ou modal abrir
  useEffect(() => {
    if (open && transaction) {
      setType(transaction.type);
      setDescription(transaction.description);
      setCategory(transaction.category);
      setStatus(transaction.status as "paid" | "pending" | "scheduled" | "cancelled");
      setIsRecurring(transaction.is_recurring || false);
      
      // Formatar valor monetário
      const formattedAmount = new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
      }).format(Number(transaction.amount));
      setAmount(formattedAmount);

      // Parse das datas
      try {
        // Data da transação (created_at)
        const parsedDate = transaction.created_at ? parseISO(transaction.created_at) : new Date();
        setDate(parsedDate);
        
        // Data de vencimento (due_date)
        const parsedDueDate = transaction.due_date ? parseISO(transaction.due_date) : new Date();
        setDueDate(parsedDueDate);
      } catch {
        setDate(new Date());
        setDueDate(new Date());
      }
    }
  }, [open, transaction]);

  // Handle amount input (currency mask simulation)
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "");
    const numberValue = Number(value) / 100;
    setAmount(new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(numberValue));
  };

  const handleSubmit = async () => {
    if (!transaction) return;

    if (!amount || !description) {
      toast.error("Preencha o valor e a descrição");
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
      const result = await updateTransaction(transaction.id, {
        amount: numericAmount,
        type,
        description,
        category: category || (type === "income" ? "Outros" : "Geral"),
        date: date || new Date(),
        due_date: dueDate || new Date(),
        status,
        is_recurring: isRecurring,
      });

      if (result.success) {
        toast.success("Transação atualizada com sucesso!");
        onOpenChange(false);
        onSuccess?.();
      } else {
        toast.error(result.error || "Erro ao atualizar transação");
      }
    });
  };

  if (!transaction) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 border-none shadow-xl overflow-hidden bg-white">
        <DialogHeader className="sr-only">
          <DialogTitle>Editar transação</DialogTitle>
        </DialogHeader>
        
        <div className="px-6 pt-8 pb-6">
          {/* 1. TITULO DISCRETO */}
          <h2 className="text-center text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">
            Editar transação
          </h2>

          {/* 2. HERO INPUT (VALOR MONETÁRIO) - TOPO ABSOLUTO */}
          <div className="relative flex items-center justify-center mb-4">
            <Input
              value={amount}
              onChange={handleAmountChange}
              placeholder="R$ 0,00"
              className={cn(
                "h-auto py-2 text-center text-[64px] font-bold tracking-tighter border-none shadow-none focus-visible:ring-0 placeholder:text-gray-300 bg-transparent p-0",
                type === "income" ? "text-green-600 caret-green-600" : "text-red-600 caret-red-600"
              )}
              style={{
                caretColor: type === "income" ? "#16a34a" : "#dc2626"
              }}
            />
          </div>

          {/* 3. SELETOR DE TIPO (TABS) - ABAIXO DO VALOR */}
          <div className="flex justify-center mb-8">
             <Tabs 
              value={type} 
              onValueChange={(v) => setType(v as TransactionType)}
              className="w-fit"
            >
              <TabsList variant="pill" className="grid grid-cols-2 w-[200px]">
                <TabsTrigger 
                  value="income"
                  variant="pill"
                  className="data-[state=active]:text-green-600 transition-all"
                >
                  Entrada
                </TabsTrigger>
                <TabsTrigger 
                  value="expense"
                  variant="pill"
                  className="data-[state=active]:text-red-600 transition-all"
                >
                  Saída
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* 4. BLOCO DE DETALHES (AGRUPAMENTO) */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-4">
            
            {/* Descrição */}
            <div className="grid grid-cols-[100px_1fr] items-center gap-3 border-b border-gray-200 pb-3 last:border-0 last:pb-0">
              <div className="flex items-center gap-2">
                <PenLine className="w-3.5 h-3.5 text-gray-400" />
                <Label className="text-xs font-medium text-gray-400">Descrição</Label>
              </div>
              <Input 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: Assinatura Adobe" 
                className="bg-transparent border-0 border-b-0 focus-visible:ring-0 p-0 h-auto text-sm font-medium text-gray-900 placeholder:text-gray-400" 
              />
            </div>

            {/* Categoria */}
            <div className="grid grid-cols-[100px_1fr] items-center gap-3 border-b border-gray-200 pb-3 last:border-0 last:pb-0">
              <div className="flex items-center gap-2">
                <Tag className="w-3.5 h-3.5 text-gray-400" />
                <Label className="text-xs font-medium text-gray-400">Categoria</Label>
              </div>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="bg-transparent border-0 border-b-0 focus:ring-0 shadow-none p-0 h-auto text-sm font-medium text-gray-900">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Geral">Geral</SelectItem>
                  <SelectItem value="marketing">Marketing</SelectItem>
                  <SelectItem value="services">Serviços</SelectItem>
                  <SelectItem value="software">Software</SelectItem>
                  <SelectItem value="infrastructure">Infraestrutura</SelectItem>
                  <SelectItem value="salary">Salário</SelectItem>
                  <SelectItem value="personal">Pessoal</SelectItem>
                  <SelectItem value="other">Outros</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Data da Transação */}
            <div className="grid grid-cols-[100px_1fr] items-center gap-3 border-b border-gray-200 pb-3 last:border-0 last:pb-0">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-3.5 h-3.5 text-gray-400" />
                <Label className="text-xs font-medium text-gray-400">Data</Label>
              </div>
              <TaskDatePicker
                date={date || null}
                onSelect={(d) => setDate(d || undefined)}
                align="start"
                side="bottom"
                trigger={
                  <Button
                    variant={"ghost"}
                    className={cn(
                      "w-full justify-start text-left font-medium bg-transparent border-0 p-0 h-auto text-sm text-gray-900 hover:bg-transparent",
                      !date && "text-gray-400"
                    )}
                  >
                    {date ? format(date, "dd/MM/yyyy", { locale: ptBR }) : <span>Selecione</span>}
                  </Button>
                }
              />
            </div>

            {/* Data de Vencimento */}
            <div className="grid grid-cols-[100px_1fr] items-center gap-3 border-b border-gray-200 pb-3 last:border-0 last:pb-0">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-3.5 h-3.5 text-gray-400" />
                <Label className="text-xs font-medium text-gray-400">Vencimento</Label>
              </div>
              <TaskDatePicker
                date={dueDate || null}
                onSelect={(d) => setDueDate(d || undefined)}
                align="start"
                side="bottom"
                trigger={
                  <Button
                    variant={"ghost"}
                    className={cn(
                      "w-full justify-start text-left font-medium bg-transparent border-0 p-0 h-auto text-sm text-gray-900 hover:bg-transparent",
                      !dueDate && "text-gray-400"
                    )}
                  >
                    {dueDate ? format(dueDate, "dd/MM/yyyy", { locale: ptBR }) : <span>Selecione</span>}
                  </Button>
                }
              />
            </div>

            {/* Status */}
            <div className="grid grid-cols-[100px_1fr] items-center gap-3 border-b border-gray-200 pb-3 last:border-0 last:pb-0">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-gray-400" />
                <Label className="text-xs font-medium text-gray-400">Status</Label>
              </div>
              <Select 
                value={status} 
                onValueChange={(v) => setStatus(v as "paid" | "pending" | "scheduled" | "cancelled")}
              >
                <SelectTrigger className="bg-transparent border-0 border-b-0 focus:ring-0 shadow-none p-0 h-auto text-sm font-medium text-gray-900">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="paid">Pago</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="scheduled">Agendado</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Recorrência */}
            <div className="grid grid-cols-[100px_1fr] items-center gap-3">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 text-gray-400" />
                <Label className="text-xs font-medium text-gray-400">Repetir?</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox 
                  id="recurring-edit" 
                  checked={isRecurring}
                  onCheckedChange={(checked) => setIsRecurring(checked as boolean)}
                  className="border-gray-300 data-[state=checked]:bg-slate-900 data-[state=checked]:border-slate-900"
                />
                <label
                  htmlFor="recurring-edit"
                  className="text-sm font-medium text-gray-900 cursor-pointer select-none"
                >
                  Mensalmente
                </label>
              </div>
            </div>

          </div>
        </div>

        {/* 5. RODAPÉ (AÇÕES) */}
        <div className="px-6 pb-6 space-y-2">
          <Button 
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium h-12 shadow-sm"
            onClick={handleSubmit}
            disabled={isPending}
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              "Salvar alterações"
            )}
          </Button>
          <Button 
            variant="ghost"
            className="w-full h-9 text-xs text-gray-500 hover:text-gray-700"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancelar
          </Button>
        </div>

      </DialogContent>
    </Dialog>
  );
}

