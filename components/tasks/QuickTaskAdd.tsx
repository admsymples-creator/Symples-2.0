"use client";

import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
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
import { Avatar } from "./Avatar";
import { Calendar as CalendarIcon, User, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

interface Member {
    id: string;
    name: string;
    avatar?: string;
}

interface QuickTaskAddProps {
    placeholder?: string;
    onSubmit: (title: string, dueDate?: Date | null, assigneeId?: string | null) => Promise<void> | void;
    onCancel?: () => void;
    members?: Member[];
    defaultDueDate?: Date | null;
    defaultAssigneeId?: string | null;
    className?: string;
    variant?: "default" | "ghost";
    autoFocus?: boolean;
}

export function QuickTaskAdd({
    placeholder = "Adicionar tarefa aqui...",
    onSubmit,
    onCancel,
    members = [],
    defaultDueDate,
    defaultAssigneeId,
    className,
    variant = "default",
    autoFocus = false,
}: QuickTaskAddProps) {
    const [value, setValue] = useState("");
    const [selectedDate, setSelectedDate] = useState<Date | null>(defaultDueDate || null);
    const [selectedAssigneeId, setSelectedAssigneeId] = useState<string | null>(defaultAssigneeId || null);
    const [isDatePopoverOpen, setIsDatePopoverOpen] = useState(false);
    const [isAssigneePopoverOpen, setIsAssigneePopoverOpen] = useState(false);
    const [isCreatingBatch, setIsCreatingBatch] = useState(false);
    const [showBatchWarning, setShowBatchWarning] = useState(false);
    const [pendingTasks, setPendingTasks] = useState<string[]>([]);
    const [pendingDate, setPendingDate] = useState<Date | null>(null);
    const [pendingAssigneeId, setPendingAssigneeId] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Constantes para validação
    const BATCH_WARNING_LIMIT = 20; // linhas
    const CHAR_WARNING_LIMIT = 500; // caracteres

    const selectedMember = members.find((m) => m.id === selectedAssigneeId);

    // Funções para atalhos de data
    const getToday = () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return today;
    };

    const getTomorrow = () => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        return tomorrow;
    };

    const getNextWeekend = () => {
        const today = new Date();
        const dayOfWeek = today.getDay(); // 0 = Domingo, 6 = Sábado
        const daysUntilSaturday = dayOfWeek === 6 ? 7 : 6 - dayOfWeek;
        const nextSaturday = new Date(today);
        nextSaturday.setDate(today.getDate() + daysUntilSaturday);
        nextSaturday.setHours(0, 0, 0, 0);
        return nextSaturday;
    };

    /**
     * Limpa marcadores de lista comuns do início de uma linha
     */
    const cleanListItem = (line: string): string => {
        // Remove espaços em branco no início e fim
        let cleaned = line.trim();
        
        // Remove marcadores de lista comuns (regex)
        // - Hífen e espaço: "- "
        // - Asterisco e espaço: "* "
        // - Bullet point: "• "
        // - Números: "1. ", "2. ", etc.
        cleaned = cleaned.replace(/^[-*•]\s+/, ""); // Remove "- ", "* ", "• "
        cleaned = cleaned.replace(/^\d+\.\s+/, ""); // Remove "1. ", "2. ", etc.
        cleaned = cleaned.replace(/^[-\u2022\u2023\u25E6\u2043]\s+/, ""); // Remove outros bullets Unicode
        
        return cleaned.trim();
    };

    /**
     * Processa o texto e detecta se há múltiplas linhas
     */
    const processBatchInput = (text: string): string[] => {
        // Verificar se há quebras de linha
        if (!text.includes("\n") && !text.includes("\r")) {
            // Texto único, retornar como array com um item
            return [text.trim()].filter(Boolean);
        }

        // Dividir por quebras de linha (suporta \n, \r\n, \r)
        const lines = text.split(/\r?\n/);
        
        // Filtrar linhas vazias e limpar cada linha
        const cleanedLines = lines
            .map(cleanListItem)
            .filter((line) => line.length > 0);

        return cleanedLines;
    };

    const handleSubmit = async () => {
        const trimmedValue = value.trim();
        if (!trimmedValue) return;

        // Processar input (detectar batch ou single)
        const tasks = processBatchInput(trimmedValue);

        if (tasks.length === 0) {
            // Nenhuma tarefa válida após processamento
            setValue("");
            return;
        }

        // Validação de tamanho: verificar se precisa de confirmação
        const shouldWarn = tasks.length > BATCH_WARNING_LIMIT || trimmedValue.length > CHAR_WARNING_LIMIT;

        if (shouldWarn && tasks.length > 1) {
            // Mostrar dialog de confirmação (NÃO limpar input ainda)
            setPendingTasks(tasks);
            setPendingDate(selectedDate);
            setPendingAssigneeId(selectedAssigneeId);
            setShowBatchWarning(true);
            return;
        }

        // Processar criação (sem aviso ou single task)
        await processTaskCreation(tasks, selectedDate, selectedAssigneeId);
    };

    const processTaskCreation = async (
        tasks: string[],
        dueDate: Date | null,
        assigneeId: string | null
    ) => {
        if (tasks.length === 0) return;

        // Limpar input imediatamente (Optimistic UI)
        setValue("");
        setSelectedDate(null);
        setSelectedAssigneeId(null);

        try {
            if (tasks.length > 1) {
                // Batch create: criar todas as tarefas com await
                setIsCreatingBatch(true);
                
                // Converter onSubmit para Promise se necessário
                const promises = tasks.map((taskTitle) => {
                    const result = onSubmit(taskTitle, dueDate, assigneeId);
                    return Promise.resolve(result);
                });

                await Promise.all(promises);
                
                toast.success(`${tasks.length} tarefas criadas com sucesso`);
            } else {
                // Single create: comportamento original
                const result = onSubmit(tasks[0], dueDate, assigneeId);
                await Promise.resolve(result);
            }
        } catch (error) {
            console.error("Erro ao criar tarefas:", error);
            toast.error("Erro ao criar algumas tarefas");
        } finally {
            setIsCreatingBatch(false);
            // Manter foco no input
            inputRef.current?.focus();
        }
    };

    const handleConfirmBatch = async () => {
        setShowBatchWarning(false);
        await processTaskCreation(pendingTasks, pendingDate, pendingAssigneeId);
        setPendingTasks([]);
        setPendingDate(null);
        setPendingAssigneeId(null);
    };

    const handleCancelBatch = () => {
        setShowBatchWarning(false);
        // Manter o texto no input se o usuário cancelar (já não foi limpo)
        setPendingTasks([]);
        setPendingDate(null);
        setPendingAssigneeId(null);
        // Focar no input novamente
        inputRef.current?.focus();
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            e.preventDefault();
            handleSubmit();
        } else if (e.key === "Escape") {
            if (!value) {
                onCancel?.();
            }
            setValue("");
            setSelectedDate(null);
            setSelectedAssigneeId(null);
            inputRef.current?.blur();
        }
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
        const pastedText = e.clipboardData.getData("text");
        if (pastedText.includes("\n")) {
            e.preventDefault();
            setValue(pastedText);
            // Opcional: submeter automaticamente se desejar, mas o usuário pode querer revisar
            // handleSubmit(); 
        }
    };

    return (
        <>
            <div className={cn(
                "flex items-center transition-all relative w-full",
                variant === "default" && "bg-white border border-gray-200 rounded-xl shadow-sm px-3 py-1 focus-within:ring-2 focus-within:ring-gray-100 focus-within:border-gray-300",
                variant === "ghost" && "h-10 px-4 border-b border-transparent hover:bg-gray-50",
                isCreatingBatch && "opacity-50 pointer-events-none",
                className
            )}>
                {/* Ghost Mode Elements */}
                {variant === "ghost" && (
                    <>
                        {/* Ghost Drag Handle (Invisible placeholder) */}
                        <div className="w-[26px] flex-shrink-0" />
                        
                        {/* Ghost Checkbox */}
                        <div className="flex-shrink-0 mr-3">
                            <div className="w-4 h-4 rounded border border-gray-200 bg-transparent" />
                        </div>
                    </>
                )}

                {isCreatingBatch && (
                    <Loader2 className="size-4 text-gray-400 animate-spin mr-2" />
                )}
                <Input
                    ref={inputRef}
                    autoFocus={autoFocus}
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onPaste={handlePaste}
                    placeholder={placeholder}
                    disabled={isCreatingBatch}
                    className={cn(
                        "flex-1 bg-transparent border-none focus-visible:ring-0 p-0 text-sm placeholder:text-gray-400",
                        variant === "ghost" && "h-full"
                    )}
                />

            {/* Área de Ações */}
            <div className="flex items-center gap-1 ml-2">
                {/* Seletor de Data */}
                <Popover open={isDatePopoverOpen} onOpenChange={setIsDatePopoverOpen}>
                    <PopoverTrigger asChild>
                        <button
                            type="button"
                            className={cn(
                                "p-1 rounded hover:bg-gray-100 transition-colors box-content",
                                selectedDate && "text-green-600"
                            )}
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsDatePopoverOpen(!isDatePopoverOpen);
                            }}
                        >
                            {selectedDate ? (
                                <Badge variant="outline" className="text-xs px-1.5 py-0 h-5 text-green-600 border-green-200 bg-green-50">
                                    {format(selectedDate, "d MMM", { locale: ptBR })}
                                </Badge>
                            ) : (
                                <CalendarIcon className="size-4 text-gray-400" />
                            )}
                        </button>
                    </PopoverTrigger>
                    <PopoverContent className="p-0 w-auto rounded-xl" align="start">
                        <div className="p-2 space-y-2">
                            {/* Atalhos */}
                            <div className="flex gap-1 px-2">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-xs h-7"
                                    onClick={() => {
                                        setSelectedDate(getToday());
                                        setIsDatePopoverOpen(false);
                                    }}
                                >
                                    Hoje
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-xs h-7"
                                    onClick={() => {
                                        setSelectedDate(getTomorrow());
                                        setIsDatePopoverOpen(false);
                                    }}
                                >
                                    Amanhã
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-xs h-7"
                                    onClick={() => {
                                        setSelectedDate(getNextWeekend());
                                        setIsDatePopoverOpen(false);
                                    }}
                                >
                                    Próximo Fim de Semana
                                </Button>
                            </div>
                            <div className="border-t border-gray-200" />
                            {/* Calendar */}
                            <Calendar
                                mode="single"
                                selected={selectedDate || undefined}
                                onSelect={(date) => {
                                    setSelectedDate(date || null);
                                    setIsDatePopoverOpen(false);
                                }}
                                className="rounded-md border-0"
                            />
                            {/* Botão para limpar */}
                            {selectedDate && (
                                <>
                                    <div className="border-t border-gray-200" />
                                    <div className="px-2 pb-2">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-xs h-7 w-full text-red-600 hover:text-red-700 hover:bg-red-50"
                                            onClick={() => {
                                                setSelectedDate(null);
                                                setIsDatePopoverOpen(false);
                                            }}
                                        >
                                            <X className="size-3 mr-1" />
                                            Remover data
                                        </Button>
                                    </div>
                                </>
                            )}
                        </div>
                    </PopoverContent>
                </Popover>

                {/* Seletor de Responsável */}
                {members.length > 0 && (
                    <Popover open={isAssigneePopoverOpen} onOpenChange={setIsAssigneePopoverOpen}>
                        <PopoverTrigger asChild>
                            <button
                                type="button"
                                className={cn(
                                    "p-1 rounded hover:bg-gray-100 transition-colors box-content",
                                    selectedAssigneeId && "text-green-600"
                                )}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsAssigneePopoverOpen(!isAssigneePopoverOpen);
                                }}
                            >
                                {selectedMember ? (
                                    <Avatar
                                        name={selectedMember.name}
                                        avatar={selectedMember.avatar}
                                        size="sm"
                                        className="size-5"
                                    />
                                ) : (
                                    <User className="size-4 text-gray-400" />
                                )}
                            </button>
                        </PopoverTrigger>
                        <PopoverContent className="p-0 w-64 rounded-xl" align="start">
                            <Command>
                                <CommandInput placeholder="Buscar membro..." />
                                <CommandList>
                                    <CommandEmpty>Nenhum membro encontrado.</CommandEmpty>
                                    <CommandGroup>
                                        <CommandItem
                                            onSelect={() => {
                                                setSelectedAssigneeId(null);
                                                setIsAssigneePopoverOpen(false);
                                            }}
                                            className={cn(
                                                "flex items-center gap-2",
                                                !selectedAssigneeId && "bg-green-50"
                                            )}
                                        >
                                            <div className="size-6 rounded-full border border-dashed border-gray-300 flex items-center justify-center">
                                                <User className="size-3 text-gray-400" />
                                            </div>
                                            <span>Sem responsável</span>
                                        </CommandItem>
                                        {members.map((member) => (
                                            <CommandItem
                                                key={member.id}
                                                onSelect={() => {
                                                    setSelectedAssigneeId(
                                                        selectedAssigneeId === member.id ? null : member.id
                                                    );
                                                    setIsAssigneePopoverOpen(false);
                                                }}
                                                className={cn(
                                                    "flex items-center gap-2",
                                                    selectedAssigneeId === member.id && "bg-green-50"
                                                )}
                                            >
                                                <Avatar
                                                    name={member.name}
                                                    avatar={member.avatar}
                                                    size="sm"
                                                    className="size-6"
                                                />
                                                <span>{member.name}</span>
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>
                )}
            </div>
            </div>

            {/* Dialog de confirmação para batch grande */}
            <AlertDialog open={showBatchWarning} onOpenChange={(open) => {
                if (!open) {
                    // Se fechar sem confirmar, cancelar (manter texto)
                    handleCancelBatch();
                }
            }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirmar criação em lote</AlertDialogTitle>
                        <AlertDialogDescription>
                            Você está prestes a criar <strong>{pendingTasks.length} tarefas</strong> a partir deste texto.
                            {pendingTasks.length > BATCH_WARNING_LIMIT && (
                                <span className="block mt-2 text-amber-600">
                                    Isso é um número grande de tarefas. Tem certeza que deseja continuar?
                                </span>
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={handleCancelBatch}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleConfirmBatch}>
                            Criar {pendingTasks.length} tarefas
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}

