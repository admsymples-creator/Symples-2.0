"use client";

import { useState, useRef, useEffect } from "react";
import { Edit2, Trash2, Building2, ArrowRight, CornerUpRight, Clock, Calendar as CalendarIcon, RefreshCw } from "lucide-react";
import { TaskDateTimePicker } from "@/components/tasks/pickers/TaskDateTimePicker";
import { updateTask } from "@/lib/actions/tasks";
import { useRouter } from "next/navigation";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { Database } from "@/types/database.types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type Task = Database["public"]["Tables"]["tasks"]["Row"];

interface TaskRowProps {
  task: Task;
  workspaces?: { id: string; name: string; slug?: string | null }[];
  onToggle?: (id: string, checked: boolean) => void;
  onEdit?: (id: string, newTitle: string) => Promise<void>;
  onDelete?: (id: string) => void;
  onMoveToWorkspace?: (id: string, workspaceId: string) => void;
  onDateUpdate?: () => void;
}

export function TaskRow({
  task,
  workspaces = [],
  onToggle,
  onEdit,
  onDelete,
  onMoveToWorkspace,
  onDateUpdate,
}: TaskRowProps) {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [isChecked, setIsChecked] = useState(task.status === "done");
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(task.title);
  // Estado local para evitar flash de conteúdo antigo enquanto o pai atualiza
  const [optimisticTitle, setOptimisticTitle] = useState(task.title);
  const inputRef = useRef<HTMLInputElement>(null);

  // Garantir que renderiza apenas no cliente para evitar problemas de hidratação
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  // Sincronizar título quando a prop mudar (confirmação do servidor ou optimistic do pai)
  useEffect(() => {
    setOptimisticTitle(task.title);
    setEditValue(task.title);
  }, [task.title]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleToggle = (checked: boolean) => {
    setIsChecked(checked);
    if (onToggle) {
      onToggle(task.id, checked);
    }
  };

  const startEditing = () => {
    setIsEditing(true);
    setEditValue(optimisticTitle);
  };

  const saveEdit = async () => {
    if (!editValue.trim() || editValue === optimisticTitle) {
      setIsEditing(false);
      setEditValue(optimisticTitle);
      return;
    }

    // Optimistic update local imediato
    const newValue = editValue.trim();
    setOptimisticTitle(newValue);
    setIsEditing(false);

    if (onEdit) {
      // Fire and forget - não esperamos a resposta para não travar a UI
      onEdit(task.id, newValue).catch(err => {
        // Reverter em caso de erro (opcional, mas boa prática)
        console.error("Failed to update task title", err);
        setOptimisticTitle(task.title); 
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      saveEdit();
    } else if (e.key === "Escape") {
      setIsEditing(false);
      setEditValue(task.title);
    }
  };

  // Determinar se é tarefa pessoal (Quick Add)
  const isPersonal = task.is_personal || !task.workspace_id;

  // Gerar cor baseada no workspace_id (hash simples)
  const getWorkspaceColor = (workspaceId: string | null): string => {
    if (!workspaceId) return "#22C55E"; 

    let hash = 0;
    for (let i = 0; i < workspaceId.length; i++) {
      hash = workspaceId.charCodeAt(i) + ((hash << 5) - hash);
    }

    const hue = Math.abs(hash % 360);
    const saturation = 60 + (Math.abs(hash) % 20); 
    const lightness = 45 + (Math.abs(hash) % 15); 

    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  };

  const workspaceColor = task.workspace_id
    ? getWorkspaceColor(task.workspace_id)
    : "#22C55E";

  // Encontrar workspace correspondente
  const workspace = task.workspace_id
    ? workspaces.find((ws) => ws.id === task.workspace_id)
    : null;

  // Verificar se a tarefa tem hora específica (não apenas data)
  const hasSpecificTime = (() => {
    if (!task.due_date) return false;
    const date = new Date(task.due_date);
    const hours = date.getHours();
    const minutes = date.getMinutes();
    // Se não for meia-noite (00:00), tem hora específica
    return hours !== 0 || minutes !== 0;
  })();

  // Formatar hora para exibição
  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  // Handler para atualizar data/hora da tarefa
  const handleDateUpdate = async (date: Date | null) => {
    try {
      const result = await updateTask({
        id: task.id,
        due_date: date ? date.toISOString() : null,
      });

      if (result.success) {
        onDateUpdate?.();
      } else {
        console.error("Erro ao atualizar data:", result.error);
      }
    } catch (error) {
      console.error("Erro ao atualizar data:", error);
    }
  };

  // Data atual da tarefa para o picker
  const currentDueDate = task.due_date ? new Date(task.due_date) : null;

  // Handler para navegar para detalhes da tarefa no workspace
  const handleGoToTaskDetails = () => {
    if (!task.workspace_id) return;
    
    // Encontrar o workspace para obter o slug
    const taskWorkspace = workspaces.find((ws) => ws.id === task.workspace_id);
    if (!taskWorkspace) return;

    // Construir URL: /[workspaceSlug]/tasks?taskId=[taskId]
    const workspaceSlug = taskWorkspace.slug || taskWorkspace.id;
    const url = `/${workspaceSlug}/tasks?taskId=${task.id}`;
    router.push(url);
  };

  return (
    <div
      className={cn(
        "relative w-full flex items-start justify-between py-0.5 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors group min-h-[28px]"
      )}
    >
      {/* Workspace Bar Vertical */}
      {!isPersonal && (
        <div
          className="absolute left-0 top-0 bottom-0 w-1 rounded-r"
          style={{ backgroundColor: workspaceColor }}
        />
      )}

      {/* Conteúdo Esquerda */}
      <div
        className={cn(
          "flex items-center flex-1 min-w-0 pt-0.5 pr-2 h-full",
          !isPersonal ? "pl-4" : "pl-2"
        )}
      >
        <Checkbox
          checked={isChecked}
          onCheckedChange={handleToggle}
          className="flex-shrink-0 mt-0 w-3.5 h-3.5" 
        />
        
        {isEditing ? (
            <input
                ref={inputRef}
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={saveEdit}
                onKeyDown={handleKeyDown}
                className="text-sm ml-3 flex-1 bg-white border border-green-500 rounded-sm px-1.5 py-0.5 outline-none text-gray-900 shadow-sm h-6"
            />
        ) : (
            <div className="flex items-center gap-2 ml-3 flex-1 min-w-0">
                <TooltipProvider>
                    <Tooltip delayDuration={500}>
                        <TooltipTrigger asChild>
                            <p
                                onDoubleClick={startEditing}
                                className={cn(
                                    "text-sm flex-1 truncate leading-snug select-none cursor-default",
                                    isChecked
                                        ? "line-through text-gray-500"
                                        : "text-gray-700"
                                )}
                            >
                                {optimisticTitle}
                            </p>
                        </TooltipTrigger>
                        <TooltipContent side="top" align="start" className="max-w-[300px] break-words">
                            <p>{optimisticTitle}</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
                {/* Indicador de Horário para Tarefas Pessoais - Logo após o título */}
                {isPersonal && hasSpecificTime && task.due_date && (
                    <div className="flex items-center gap-1 flex-shrink-0">
                        {/* Ícone de recorrência à esquerda do horário */}
                        {((task as any).recurrence_type || (task as any).recurrence_parent_id) && (
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <RefreshCw className="w-3 h-3 text-blue-500 flex-shrink-0" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Tarefa recorrente {(task as any).recurrence_type ? `(${(task as any).recurrence_type === 'daily' ? 'Diária' : (task as any).recurrence_type === 'weekly' ? 'Semanal' : (task as any).recurrence_type === 'monthly' ? 'Mensal' : 'Personalizada'})` : ''}</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        )}
                        <span
                            className="text-[10px] font-medium text-gray-600 px-1.5 py-0.5 rounded bg-gray-100"
                            title={`Horário: ${formatTime(task.due_date)}`}
                        >
                            {formatTime(task.due_date)}
                        </span>
                    </div>
                )}
                {/* Ícone de recorrência para tarefas sem horário específico */}
                {isPersonal && (!hasSpecificTime || !task.due_date) && ((task as any).recurrence_type || (task as any).recurrence_parent_id) && (
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <RefreshCw className="w-3 h-3 text-blue-500 flex-shrink-0" />
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Tarefa recorrente {(task as any).recurrence_type ? `(${(task as any).recurrence_type === 'daily' ? 'Diária' : (task as any).recurrence_type === 'weekly' ? 'Semanal' : (task as any).recurrence_type === 'monthly' ? 'Mensal' : 'Personalizada'})` : ''}</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                )}
                {/* Badge do Workspace */}
                {workspace && !isPersonal && (
                    <span
                        className="flex-shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded text-white truncate max-w-[100px]"
                        style={{ backgroundColor: workspaceColor }}
                        title={workspace.name}
                    >
                        {workspace.name}
                    </span>
                )}
            </div>
        )}
      </div>

      {/* Ações Direita (Flutuante com Gradiente e Animação) */}
      {!isEditing && (
          <div 
            className={cn(
              "absolute right-0 top-0 bottom-0 pl-12 pr-1 flex items-center gap-0.5",
              "opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0",
              "transition-all duration-200 ease-in-out",
              // Gradiente mais intenso e largo
              "bg-gradient-to-l from-gray-50 via-gray-50 via-60% to-transparent"
            )}
          >
            <button
              onClick={startEditing}
              className="p-1 rounded hover:bg-gray-200 transition-colors text-gray-400 hover:text-gray-600"
              aria-label="Editar"
            >
              <Edit2 className="w-3 h-3" />
            </button>
            
            {/* Botão de Calendário para editar data/hora (apenas tarefas pessoais) */}
            {isPersonal && isMounted && (
              <TaskDateTimePicker
                date={currentDueDate}
                onSelect={handleDateUpdate}
                align="end"
                side="top"
                trigger={
                  <button
                    type="button"
                    className="p-1 rounded hover:bg-gray-200 transition-colors text-gray-400 hover:text-gray-600"
                    aria-label="Editar data e hora"
                  >
                    <CalendarIcon className="w-3 h-3" />
                  </button>
                }
              />
            )}
            
            <button
              onClick={() => onDelete?.(task.id)}
              className="p-1 rounded hover:bg-red-50 transition-colors text-gray-400 hover:text-red-600"
              aria-label="Excluir"
            >
              <Trash2 className="w-3 h-3" />
            </button>

            {/* Botão "Ir" para detalhes da tarefa (apenas tarefas de workspace) */}
            {!isPersonal && task.workspace_id && (
              <button
                onClick={handleGoToTaskDetails}
                className="p-1 rounded hover:bg-gray-200 transition-colors text-gray-400 hover:text-gray-600"
                aria-label="Ir para detalhes da tarefa"
                title="Ir para detalhes da tarefa"
              >
                <ArrowRight className="w-3 h-3" />
              </button>
            )}

            {isMounted && workspaces.length > 0 && (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button
                            className="p-1 rounded hover:bg-gray-200 transition-colors text-gray-400 hover:text-gray-600"
                            aria-label="Mover para Workspace"
                        >
                            <CornerUpRight className="w-3 h-3" />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuLabel>Mover para Workspace</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {workspaces.map(ws => (
                            <DropdownMenuItem 
                                key={ws.id} 
                                onClick={() => onMoveToWorkspace?.(task.id, ws.id)}
                                className="cursor-pointer"
                                disabled={task.workspace_id === ws.id}
                            >
                                <Building2 className="w-3 h-3 mr-2 text-gray-400" />
                                <span className="truncate">{ws.name}</span>
                                {task.workspace_id === ws.id && <ArrowRight className="w-3 h-3 ml-auto" />}
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>
            )}
          </div>
      )}
    </div>
  );
}
