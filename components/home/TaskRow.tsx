"use client";

import { useState, useRef, useEffect } from "react";
import { Edit2, Trash2, Building2, ArrowRight, CornerUpRight, Eye, Clock, Calendar as CalendarIcon, RefreshCw } from "lucide-react";
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
  /** Atualização otimista: chamado antes do servidor para a UI refletir na hora */
  onDateUpdateOptimistic?: (taskId: string, dueDate: string | null) => void;
  onOpenDetails?: (id: string) => void;
}

export function TaskRow({
  task,
  workspaces = [],
  onToggle,
  onEdit,
  onDelete,
  onMoveToWorkspace,
  onDateUpdate,
  onDateUpdateOptimistic,
  onOpenDetails,
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
    if ((task as any).is_virtual) {
      // toast imported via hook usually or generic toast
      // Assuming generic toast is unavailable directly here without import, ignoring for now or using alert
      // Better: just return or use console log, as TaskRow doesn't seem to import toast in the visible snippet provided earlier
      // Checking imports... standard shadcn toast usually used.
      // Let's just return for now to prevent error.
      return;
    }
    setIsChecked(checked);
    if (onToggle) {
      onToggle(task.id, checked);
    }
  };

  const startEditing = () => {
    if ((task as any).is_virtual) return;
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

  // Tarefa está no quadro de tarefas (visível para o time)
  const isOnBoard = (task as any).visible_on_board === true;

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

  // Verificar existência de tags (Projeto)
  const hasProjectTags = (() => {
    const taskWithTags = task as any;
    if (taskWithTags.tags && Array.isArray(taskWithTags.tags) && taskWithTags.tags.length > 0) return true;
    if (task.origin_context && typeof task.origin_context === 'object' && 'tags' in task.origin_context) {
      const contextTags = (task.origin_context as any).tags;
      if (Array.isArray(contextTags) && contextTags.length > 0) return true;
    }
    return false;
  })();

  const workspaceColor = task.workspace_id
    ? (hasProjectTags ? "#050815" : "#E5E7EB") // Se tem projeto: Escuro. Sem projeto: Cinza muito claro (Light Gray)
    : "#22C55E";

  // Encontrar workspace correspondente
  const workspace = task.workspace_id
    ? workspaces.find((ws) => ws.id === task.workspace_id)
    : null;

  // Verificar se a tarefa tem hora específica (não apenas data)
  // IMPORTANTE: Usar UTC para verificar porque due_date pode estar em UTC
  // Verificar tanto em UTC quanto em local para garantir compatibilidade
  const hasSpecificTime = (() => {
    if (!task.due_date) return false;
    const date = new Date(task.due_date);
    // Verificar em UTC primeiro (mais confiável para datas armazenadas)
    const utcHours = date.getUTCHours();
    const utcMinutes = date.getUTCMinutes();
    const localHours = date.getHours();
    const localMinutes = date.getMinutes();

    // Log para debugar tarefas virtuais/recorrentes
    if ((task as any).is_virtual || (task as any).recurrence_type) {
      console.log(`[TaskRow] Debug Time: ${task.title} (${task.id})`, {
        due_date: task.due_date,
        local: `${localHours}:${localMinutes}`,
        hasSpecificTime: (localHours !== 0 || localMinutes !== 0)
      });
    }

    // Tem hora específica se NÃO for meia-noite (local)
    // Se data foi salva como 00:00 local, assumimos que é apenas data
    return (localHours !== 0 || localMinutes !== 0);
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

  // Handler para atualizar data/hora da tarefa (otimista: UI atualiza na hora, servidor em background)
  const handleDateUpdate = async (date: Date | null) => {
    const newDueDate = date ? date.toISOString() : null;
    onDateUpdateOptimistic?.(task.id, newDueDate);

    try {
      const result = await updateTask({
        id: task.id,
        due_date: newDueDate,
      });

      if (result.success) {
        onDateUpdate?.();
      } else {
        console.error("Erro ao atualizar data:", result.error);
        onDateUpdate?.();
      }
    } catch (error) {
      console.error("Erro ao atualizar data:", error);
      onDateUpdate?.();
    }
  };

  // Data atual da tarefa para o picker
  const currentDueDate = task.due_date ? new Date(task.due_date) : null;

  // Handler para navegar para detalhes da tarefa no workspace (bloqueado para ocorrências virtuais)
  const handleGoToTaskDetails = () => {
    if ((task as any).is_virtual) return;
    if (onOpenDetails) {
      onOpenDetails(task.id);
      return;
    }
    if (!task.workspace_id) return;

    // Encontrar o workspace para obter o slug
    const taskWorkspace = workspaces.find((ws) => ws.id === task.workspace_id);

    // Construir URL: /[workspaceSlug]/tasks?taskId=[taskId]
    // Fallback: se não tiver o workspace na lista, usar o próprio workspace_id
    const workspaceSlug = taskWorkspace?.slug || taskWorkspace?.id || task.workspace_id;
    const url = `/${workspaceSlug}/tasks?taskId=${task.id}`;
    router.push(url);
  };

  // Verificar se é tarefa virtual (projeção futura)
  const isVirtual = (task as any).is_virtual;

  return (
    <div
      className={cn(
        "relative w-full flex items-center justify-between py-0.5 min-h-7 border-b border-gray-50 last:border-0 transition-colors group",
        isVirtual ? "opacity-50 bg-gray-50/50 hover:bg-gray-50 cursor-default" : "hover:bg-gray-50"
      )}
    >
      {/* Barra esquerda: preta = no quadro de tarefas; cor do workspace = não no quadro */}
      {!isPersonal && (
        <div
          className="absolute left-0 top-0 bottom-0 w-1 rounded-r"
          style={{ backgroundColor: isOnBoard ? "#000" : workspaceColor }}
          title={isOnBoard ? "No quadro de tarefas" : undefined}
        />
      )}

      {/* Conteúdo Esquerda */}
      <div
        className={cn(
          "flex items-center flex-1 min-w-0 pr-2",
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
            className="text-xs ml-3 flex-1 bg-white border border-green-500 rounded-sm px-1.5 py-0.5 outline-none text-gray-900 shadow-sm h-6"
          />
        ) : (
          <div className="flex items-center gap-2 ml-3 flex-1 min-w-0">
            <TooltipProvider>
              <Tooltip delayDuration={500}>
                <TooltipTrigger asChild>
                  <p
                    onDoubleClick={startEditing}
                    className={cn(
                      "text-xs flex-1 truncate leading-snug select-none cursor-default",
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
            {/* Indicador de Horário - Logo após o título */}
            {hasSpecificTime && task.due_date && (
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
            {(!hasSpecificTime || !task.due_date) && ((task as any).recurrence_type || (task as any).recurrence_parent_id) && (
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
            {/* Tag: nome do projeto (só exibe quando há projeto; não usar fallback "Quadro") */}
            {workspace && !isPersonal && (() => {
              const taskWithTags = task as any;
              let tags: string[] = [];
              if (taskWithTags.tags && Array.isArray(taskWithTags.tags)) {
                tags = taskWithTags.tags;
              } else if (task.origin_context && typeof task.origin_context === 'object' && 'tags' in task.origin_context) {
                const contextTags = (task.origin_context as any).tags;
                if (Array.isArray(contextTags)) {
                  tags = contextTags;
                }
              }
              const projectName = tags.length > 0 ? tags[0] : null;

              if (projectName) {
                return (
                  <span
                    className={cn(
                      "flex-shrink-0 font-medium py-0.5 rounded truncate max-w-[100px] text-white",
                      isOnBoard ? "text-[9px] px-1" : "text-[10px] px-1.5"
                    )}
                    style={{ backgroundColor: isOnBoard ? "#000" : workspaceColor }}
                    title={isOnBoard ? `Projeto: ${projectName} · No quadro` : projectName}
                  >
                    {projectName}
                  </span>
                );
              }
              return null;
            })()}
          </div>
        )}
      </div>

      {/* Ações Direita (Flutuante com Gradiente e Animação) */}
      {!isEditing && !isVirtual && (
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

          {/* Ícone de olho: abre a tarefa (modal no planner ou página de tarefas) */}
          {(onOpenDetails || task.workspace_id) && !(task as any).is_virtual && (
            <button
              onClick={() => onOpenDetails ? onOpenDetails(task.id) : handleGoToTaskDetails()}
              className="p-1 rounded hover:bg-gray-200 transition-colors text-gray-400 hover:text-gray-600"
              aria-label="Abrir tarefa"
              title="Abrir tarefa"
            >
              <Eye className="w-3 h-3" />
            </button>
          )}

          {isMounted && workspaces.length > 0 && !(task as any).is_virtual && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="p-1 rounded hover:bg-gray-200 transition-colors text-gray-400 hover:text-gray-600"
                  aria-label="Enviar para quadro de tarefas"
                  onClick={(e) => e.stopPropagation()}
                >
                  <CornerUpRight className="w-3 h-3" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Enviar para quadro de tarefas</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {workspaces.map(ws => {
                  // Desabilitar apenas se já está no workspace E já está no quadro
                  const alreadyOnBoard = task.workspace_id === ws.id && isOnBoard;
                  return (
                    <DropdownMenuItem
                      key={ws.id}
                      onClick={() => onMoveToWorkspace?.(task.id, ws.id)}
                      className="cursor-pointer"
                      disabled={alreadyOnBoard}
                    >
                      <Building2 className="w-3 h-3 mr-2 text-gray-400" />
                      <span className="truncate">{ws.name}</span>
                      {alreadyOnBoard && <ArrowRight className="w-3 h-3 ml-auto" />}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      )}
    </div>
  );
}
