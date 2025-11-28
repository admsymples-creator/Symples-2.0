"use client";

import React, { useState, useEffect } from "react";
import { 
  Calendar as CalendarIcon,
  PenLine,
  Tag,
  CheckCircle2,
  RefreshCw
} from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";

interface CreateTransactionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type TransactionType = "income" | "expense";

export function CreateTransactionModal({ open, onOpenChange }: CreateTransactionModalProps) {
  const [type, setType] = useState<TransactionType>("expense");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [status, setStatus] = useState<"paid" | "pending">("paid");
  const [isRecurring, setIsRecurring] = useState(false);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (open) {
      setAmount("");
      setDescription("");
      setCategory("");
      setDate(new Date());
      setStatus("paid");
      setIsRecurring(false);
    }
  }, [open]);

  // Handle amount input (currency mask simulation)
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "");
    const numberValue = Number(value) / 100;
    setAmount(new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(numberValue));
  };

  const handleSubmit = () => {
    // TODO: Submit form
    console.log({ type, amount, description, category, date, status, isRecurring });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 border-none shadow-xl overflow-hidden bg-white">
        <DialogHeader className="sr-only">
          <DialogTitle>Nova transação</DialogTitle>
        </DialogHeader>
        
        {/* 1. SELETOR DE TIPO (SEGMENTED CONTROL) */}
        <div className="px-6 pt-6 pb-2">
          <Tabs 
            value={type} 
            onValueChange={(v) => setType(v as TransactionType)}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2 h-10 bg-gray-100 p-1 rounded-lg">
              <TabsTrigger 
                value="income"
                className="text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-green-600 data-[state=active]:shadow-sm transition-all"
              >
                Entrada
              </TabsTrigger>
              <TabsTrigger 
                value="expense"
                className="text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-red-600 data-[state=active]:shadow-sm transition-all"
              >
                Saída
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* 2. HERO INPUT (VALOR MONETÁRIO) - Calculadora Style */}
        <div className="px-6 py-8">
          <div className="relative flex items-center justify-center">
            <Input
              value={amount}
              onChange={handleAmountChange}
              placeholder="R$ 0,00"
              className={cn(
                "h-auto py-4 text-center text-6xl font-bold tracking-tighter border-none shadow-none focus-visible:ring-0 placeholder:text-gray-300 bg-transparent",
                type === "income" ? "text-green-600 caret-green-600" : "text-red-600 caret-red-600"
              )}
              style={{
                caretColor: type === "income" ? "#16a34a" : "#dc2626"
              }}
            />
          </div>
        </div>

        {/* 3. BLOCO DE DETALHES (AGRUPAMENTO) */}
        <div className="px-6 pb-6">
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

            {/* Data */}
            <div className="grid grid-cols-[100px_1fr] items-center gap-3 border-b border-gray-200 pb-3 last:border-0 last:pb-0">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-3.5 h-3.5 text-gray-400" />
                <Label className="text-xs font-medium text-gray-400">Data</Label>
              </div>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"ghost"}
                    className={cn(
                      "w-full justify-start text-left font-medium bg-transparent border-0 p-0 h-auto text-sm text-gray-900 hover:bg-transparent",
                      !date && "text-gray-400"
                    )}
                  >
                    {date ? format(date, "dd/MM/yyyy", { locale: ptBR }) : <span>Selecione</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    initialFocus
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Status */}
            <div className="grid grid-cols-[100px_1fr] items-center gap-3 border-b border-gray-200 pb-3 last:border-0 last:pb-0">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-gray-400" />
                <Label className="text-xs font-medium text-gray-400">Status</Label>
              </div>
              <Select 
                value={status} 
                onValueChange={(v) => setStatus(v as "paid" | "pending")}
              >
                <SelectTrigger className="bg-transparent border-0 border-b-0 focus:ring-0 shadow-none p-0 h-auto text-sm font-medium text-gray-900">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="paid">Pago</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
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
                  id="recurring" 
                  checked={isRecurring}
                  onCheckedChange={(checked) => setIsRecurring(checked as boolean)}
                  className="border-gray-300 data-[state=checked]:bg-slate-900 data-[state=checked]:border-slate-900"
                />
                <label
                  htmlFor="recurring"
                  className="text-sm font-medium text-gray-900 cursor-pointer select-none"
                >
                  Mensalmente
                </label>
              </div>
            </div>

          </div>
        </div>

        {/* 4. RODAPÉ (AÇÕES) */}
        <div className="px-6 pb-6 space-y-2">
          <Button 
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium h-12 shadow-sm"
            onClick={handleSubmit}
          >
            Adicionar lançamento
          </Button>
          <Button 
            variant="ghost"
            className="w-full h-9 text-xs text-gray-500 hover:text-gray-700"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
        </div>

      </DialogContent>
    </Dialog>
  );
}
