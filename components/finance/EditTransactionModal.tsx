"use client";

import React, { useState, useEffect, useTransition } from "react";
import { 
  Calendar as CalendarIcon,
  PenLine,
  Tag,
  CheckCircle2,
  RefreshCw,
  Loader2,
  Building2
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
import { ClientSelector } from "@/components/finance/ClientSelector";
import {
  DEFAULT_EXPENSE_CATEGORY,
  DEFAULT_INCOME_CATEGORY,
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
} from "@/lib/config/finance-categories";

interface Transaction {
  id: string;
  amount: number;
  type: "income" | "expense";
  description: string;
  category: string;
  due_date: string | null; // Data de vencimento
  created_at?: string; // Data de criação
  status: "paid" | "pending" | "scheduled" | "cancelled";
  is_recurring: boolean;
  counterparty_name?: string | null;
  client_id?: string | null;
  workspace_id?: string | null;
}

interface EditTransactionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: Transaction | null;
  onSuccess?: (updated?: Transaction) => void;
}

type TransactionType = "income" | "expense";

export function EditTransactionModal({ open, onOpenChange, transaction, onSuccess }: EditTransactionModalProps) {
  const [isPending, startTransition] = useTransition();
  const [type, setType] = useState<TransactionType>("expense");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [clientId, setClientId] = useState<string | null>(null);
  const [category, setCategory] = useState("");
  const [date, setDate] = useState<Date | null>(new Date());
  const [dueDate, setDueDate] = useState<Date | null>(new Date());
  const [status, setStatus] = useState<"paid" | "pending" | "scheduled" | "cancelled">("paid");
  const [isRecurring, setIsRecurring] = useState(false);
  const categoryOptions = type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  // Preencher form quando transaction mudar ou modal abrir
  useEffect(() => {
    if (open && transaction) {
      console.log("[EditTransactionModal] Modal aberto. Transaction:", {
        workspace_id: transaction.workspace_id,
        client_id: transaction.client_id
      });
      setType(transaction.type);
      setDescription(transaction.description);
      setClientId(transaction.client_id || null);
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
        const parsedDueDate = transaction.due_date ? parseISO(transaction.due_date) : null;
        setDueDate(parsedDueDate);
      } catch {
        setDate(new Date());
        setDueDate(null);
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
        category: category || (type === "income" ? DEFAULT_INCOME_CATEGORY : DEFAULT_EXPENSE_CATEGORY),
        date: date || new Date(),
        due_date: dueDate,
        status,
        is_recurring: isRecurring,
        client_id: clientId,
      });

      if (result.success) {
        toast.success("Transação atualizada com sucesso!");
        onOpenChange(false);
        onSuccess?.({
          id: transaction.id,
          amount: numericAmount,
          type,
          description,
          category: category || (type === "income" ? DEFAULT_INCOME_CATEGORY : DEFAULT_EXPENSE_CATEGORY),
          due_date: dueDate ? dueDate.toISOString() : null,
          created_at: (date || new Date()).toISOString(),
          status,
          is_recurring: isRecurring,
          counterparty_name: transaction.counterparty_name ?? null,
          client_id: clientId,
          workspace_id: transaction.workspace_id ?? null,
        });
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

            {/* Cliente */}
            <div className="grid grid-cols-[100px_1fr] items-center gap-3 border-b border-gray-200 pb-3 last:border-0 last:pb-0">
              <div className="flex items-center gap-2">
                <Building2 className="w-3.5 h-3.5 text-gray-400" />
                <Label className="text-xs font-medium text-gray-400">Cliente</Label>
              </div>
              <div className="flex-1">
                <ClientSelector
                  clientId={clientId}
                  onSelect={(id) => {
                    console.log("[EditTransactionModal] Cliente selecionado:", id);
                    setClientId(id);
                  }}
                  workspaceId={transaction?.workspace_id}
                  triggerClassName="w-full justify-start bg-transparent hover:bg-transparent border-0 px-0 py-0 h-auto text-sm text-gray-900 font-medium"
                />
              </div>
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
                  {categoryOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
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
                onSelect={(d) => setDate(d ?? null)}
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
                onSelect={(d) => setDueDate(d ?? null)}
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
                    {dueDate ? format(dueDate, "dd/MM/yyyy", { locale: ptBR }) : <span>Sem vencimento</span>}
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
                  className="border-gray-300 data-[state=checked]:bg-[#050815] data-[state=checked]:border-[#050815]"
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
            className="w-full bg-[#050815] hover:bg-slate-800 text-white font-medium h-12 shadow-sm"
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

