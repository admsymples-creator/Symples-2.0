"use client";

import React, { useState, useEffect, useTransition } from "react";
import {
  Calendar as CalendarIcon,
  PenLine,
  Tag,
  CheckCircle2,
  RefreshCw,
  Loader2,
  Link2,
  ChevronsUpDown,
  Check
} from "lucide-react";
import { format } from "date-fns";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { createTransaction, createClient } from "@/lib/actions/finance";
import { TaskDatePicker } from "@/components/tasks/pickers/TaskDatePicker";
import {
  DEFAULT_EXPENSE_CATEGORY,
  DEFAULT_INCOME_CATEGORY,
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
} from "@/lib/config/finance-categories";
import { useWorkspace } from "@/components/providers/SidebarProvider";
import { createBrowserClient } from "@/lib/supabase/client";

interface CreateTransactionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialRelatedTask?: { id: string; title: string };
  initialWorkspaceId?: string;
  onCreated?: () => void;
}

type TransactionType = "income" | "expense";

type TaskOption = { id: string; title: string };
type ClientOption = { id: string; name: string };

export function CreateTransactionModal({
  open,
  onOpenChange,
  initialRelatedTask,
  initialWorkspaceId,
  onCreated,
}: CreateTransactionModalProps) {
  const { activeWorkspaceId } = useWorkspace();
  const [isPending, startTransition] = useTransition();
  const [type, setType] = useState<TransactionType>("expense");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [clientId, setClientId] = useState<string | null>(null);
  const [category, setCategory] = useState("");
  const [date, setDate] = useState<Date | null>(new Date());
  const [dueDate, setDueDate] = useState<Date | null>(new Date());
  const [status, setStatus] = useState<"paid" | "pending">("paid");
  const [isRecurring, setIsRecurring] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [categoryQuery, setCategoryQuery] = useState("");
  const [taskOpen, setTaskOpen] = useState(false);
  const [taskQuery, setTaskQuery] = useState("");
  const [taskOptions, setTaskOptions] = useState<TaskOption[]>([]);
  const [taskLoading, setTaskLoading] = useState(false);
  const [linkedTask, setLinkedTask] = useState<TaskOption | null>(initialRelatedTask ?? null);
  const [clientOpen, setClientOpen] = useState(false);
  const [clientQuery, setClientQuery] = useState("");
  const [clientOptions, setClientOptions] = useState<ClientOption[]>([]);
  const [clientLoading, setClientLoading] = useState(false);
  const categoryOptions = type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const supabase = React.useMemo(() => createBrowserClient(), []);
  const effectiveWorkspaceId = initialWorkspaceId || activeWorkspaceId || null;

  // Reset form when modal opens/closes
  useEffect(() => {
    if (open) {
      setAmount("");
      setDescription("");
      setCategory("");
      setCategoryQuery("");
      setDate(new Date());
      setDueDate(new Date());
      setStatus("paid");
      setIsRecurring(false);
      setLinkedTask(initialRelatedTask ?? null);
      setTaskQuery("");
      setTaskOptions([]);
      setClientId(null);
      setClientQuery("");
      setClientOptions([]);
    }
  }, [open, initialRelatedTask]);

  useEffect(() => {
    if (!open || !taskOpen || !effectiveWorkspaceId) return;
    const query = taskQuery.trim();
    const timeout = setTimeout(async () => {
      setTaskLoading(true);
      const { data, error } = await supabase
        .from("tasks")
        .select("id,title")
        .eq("workspace_id", effectiveWorkspaceId)
        .ilike("title", `%${query}%`)
        .order("created_at", { ascending: false })
        .limit(8);
      if (error) {
        console.error("Erro ao buscar tarefas:", error);
        setTaskOptions([]);
      } else {
        setTaskOptions((data || []).map((item: any) => ({ id: item.id, title: item.title })));
      }
      setTaskLoading(false);
    }, 250);
    return () => clearTimeout(timeout);
  }, [open, taskOpen, taskQuery, effectiveWorkspaceId, supabase]);

  useEffect(() => {
    if (!open || !clientOpen || !effectiveWorkspaceId) return;
    const query = clientQuery.trim();
    const timeout = setTimeout(async () => {
      setClientLoading(true);
      const { data, error } = await supabase
        .from("clients")
        .select("id,name")
        .eq("workspace_id", effectiveWorkspaceId)
        .ilike("name", `%${query}%`)
        .order("name", { ascending: true })
        .limit(8);
      if (error) {
        console.error("Erro ao buscar clientes:", error);
        setClientOptions([]);
      } else {
        setClientOptions((data || []).map((item: any) => ({ id: item.id, name: item.name })));
      }
      setClientLoading(false);
    }, 250);
    return () => clearTimeout(timeout);
  }, [open, clientOpen, clientQuery, effectiveWorkspaceId, supabase]);

  useEffect(() => {
    if (categoryOpen && !categoryQuery.trim() && category) {
      setCategoryQuery(category);
    }
  }, [categoryOpen, categoryQuery, category]);

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
      const result = await createTransaction({
        amount: numericAmount,
        type,
        description,
        category: category || (type === "income" ? DEFAULT_INCOME_CATEGORY : DEFAULT_EXPENSE_CATEGORY),
        date: date || new Date(),
        due_date: dueDate,
        status,
        is_recurring: isRecurring,
        counterparty_name: null,
        related_task_id: linkedTask?.id || null,
        client_id: clientId || null,
        workspace_id: effectiveWorkspaceId || undefined,
      });

      if (result.success) {
        toast.success("Transação criada com sucesso!");
        onOpenChange(false);
        onCreated?.();
      } else {
        toast.error(result.error || "Erro ao criar transação");
      }
    });
  };

  const handleSelectTask = (option: TaskOption | null) => {
    setLinkedTask(option);
    setTaskOpen(false);
  };

  const handleSelectClient = (option: ClientOption | null) => {
    setClientId(option?.id || null);
    setClientOpen(false);
  };

  const handleCreateClient = async () => {
    if (!effectiveWorkspaceId) {
      toast.error("Workspace nao encontrado.");
      return;
    }
    const name = clientQuery.trim();
    if (!name) {
      toast.error("Informe o nome do cliente.");
      return;
    }
    const result = await createClient({ workspaceId: effectiveWorkspaceId, name });
    if (result.success && result.client) {
      setClientId(result.client.id);
      setClientOptions((prev) => {
        const exists = prev.some((item) => item.id === result.client?.id);
        return exists ? prev : [{ id: result.client.id, name: result.client.name }, ...prev];
      });
      setClientQuery("");
      setClientOpen(false);
      toast.success("Cliente criado!");
    } else {
      toast.error(result.error || "Erro ao criar cliente");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 border-none shadow-xl overflow-hidden bg-white">
        <DialogHeader className="sr-only">
          <DialogTitle>Nova transação</DialogTitle>
        </DialogHeader>
        
        <div className="px-6 pt-8 pb-6">
          {/* 1. TITULO DISCRETO */}
          <h2 className="text-center text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">
            Nova transação
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

            {/* Cliente cadastrado */}
            <div className="grid grid-cols-[100px_1fr] items-center gap-3 border-b border-gray-200 pb-3 last:border-0 last:pb-0">
              <div className="flex items-center gap-2">
                <Tag className="w-3.5 h-3.5 text-gray-400" />
                <Label className="text-xs font-medium text-gray-400">Cliente</Label>
              </div>
              <Popover open={clientOpen} onOpenChange={setClientOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    role="combobox"
                    className="w-full justify-between bg-transparent border-0 p-0 h-auto text-sm text-gray-900 hover:bg-transparent"
                  >
                    {clientId
                      ? clientOptions.find((option) => option.id === clientId)?.name || "Cliente selecionado"
                      : "Buscar cliente"}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-gray-400" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0 w-[280px]" align="start">
                  <Command shouldFilter={false}>
                    <CommandInput
                      placeholder="Buscar cliente..."
                      value={clientQuery}
                      onValueChange={setClientQuery}
                    />
                    <CommandList>
                      {clientLoading ? (
                        <CommandGroup heading="Carregando">
                          <CommandItem disabled value="loading">
                            Buscando clientes...
                          </CommandItem>
                        </CommandGroup>
                      ) : (
                        <>
                          <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
                          <CommandGroup heading="Clientes">
                            {clientOptions.map((option) => (
                              <CommandItem
                                key={option.id}
                                value={option.name}
                                onSelect={() => handleSelectClient(option)}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    clientId === option.id ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {option.name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                          {clientQuery.trim().length > 0 && (
                            <CommandGroup heading="Novo">
                              <CommandItem value={`create-${clientQuery}`} onSelect={handleCreateClient}>
                                Criar cliente "{clientQuery.trim()}"
                              </CommandItem>
                            </CommandGroup>
                          )}
                        </>
                      )}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Vincular tarefa */}
            <div className="grid grid-cols-[100px_1fr] items-center gap-3 border-b border-gray-200 pb-3 last:border-0 last:pb-0">
              <div className="flex items-center gap-2">
                <Link2 className="w-3.5 h-3.5 text-gray-400" />
                <Label className="text-xs font-medium text-gray-400">Tarefa</Label>
              </div>
              <Popover open={taskOpen} onOpenChange={setTaskOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    role="combobox"
                    className="w-full justify-between bg-transparent border-0 p-0 h-auto text-sm text-gray-900 hover:bg-transparent"
                  >
                    {linkedTask ? linkedTask.title : "Vincular tarefa"}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-gray-400" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0 w-[320px]" align="start">
                  <Command shouldFilter={false}>
                    <CommandInput
                      placeholder="Buscar tarefa..."
                      value={taskQuery}
                      onValueChange={setTaskQuery}
                    />
                    <CommandList>
                      {taskLoading ? (
                        <CommandGroup heading="Carregando">
                          <CommandItem disabled value="loading">
                            Buscando tarefas...
                          </CommandItem>
                        </CommandGroup>
                      ) : (
                        <>
                          <CommandEmpty>Nenhuma tarefa encontrada.</CommandEmpty>
                          <CommandGroup heading="Tarefas">
                            <CommandItem value="clear" onSelect={() => handleSelectTask(null)}>
                              Sem tarefa
                            </CommandItem>
                            {taskOptions.map((option) => (
                              <CommandItem
                                key={option.id}
                                value={option.title}
                                onSelect={() => handleSelectTask(option)}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    linkedTask?.id === option.id ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {option.title}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </>
                      )}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Categoria */}
            <div className="grid grid-cols-[100px_1fr] items-center gap-3 border-b border-gray-200 pb-3 last:border-0 last:pb-0">
              <div className="flex items-center gap-2">
                <Tag className="w-3.5 h-3.5 text-gray-400" />
                <Label className="text-xs font-medium text-gray-400">Categoria</Label>
              </div>
              <Popover open={categoryOpen} onOpenChange={setCategoryOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    role="combobox"
                    className="w-full justify-between bg-transparent border-0 p-0 h-auto text-sm text-gray-900 hover:bg-transparent"
                  >
                    {category
                      ? categoryOptions.find((option) => option.value === category)?.label || category
                      : "Selecione"}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-gray-400" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0 w-[240px]" align="start">
                  <Command shouldFilter={false}>
                    <CommandInput
                      placeholder="Buscar categoria..."
                      value={categoryQuery}
                      onValueChange={setCategoryQuery}
                    />
                    <CommandList>
                      <CommandEmpty>Nenhuma categoria encontrada.</CommandEmpty>
                      <CommandGroup heading="Categorias">
                        {categoryOptions
                          .filter((option) =>
                            option.label.toLowerCase().includes(categoryQuery.trim().toLowerCase())
                          )
                          .map((option) => (
                            <CommandItem
                              key={option.value}
                              value={option.value}
                              onSelect={() => {
                                setCategory(option.value);
                                setCategoryOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  category === option.value ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {option.label}
                            </CommandItem>
                          ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
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
                  className="border-gray-300 data-[state=checked]:bg-[#050815] data-[state=checked]:border-[#050815]"
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
              "Adicionar lançamento"
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

