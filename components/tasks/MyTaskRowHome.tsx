"use client";

import React, { memo, useMemo, useState, useEffect, useCallback } from "react";
import { Calendar as CalendarIcon, X, ChevronDown, CheckCircle2, User, Zap, AlertTriangle, MessageSquare, Loader2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { createBrowserClient } from "@/lib/supabase/client";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { updateTask } from "@/lib/actions/tasks";
import { toast } from "sonner";
import { TASK_CONFIG, mapLabelToStatus, ORDERED_STATUSES, TASK_STATUS, type TaskStatus } from "@/lib/config/tasks";
import { Avatar } from "./Avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { TaskActionsMenu } from "./TaskActionsMenu";
import { InlineTextEdit } from "@/components/ui/inline-text-edit";
import { TaskMembersPicker } from "./pickers/TaskMembersPicker";
import { AvatarGroup } from "./Avatar";
import { addTaskMember, removeTaskMember } from "@/lib/actions/task-members";

interface MyTaskRowHomeProps {
  task: {
    id: string | number;
    title: string;
    status?: string;
    dueDate?: string;
    completed?: boolean;
    priority?: "low" | "medium" | "high" | "urgent";
    assignees?: Array<{ name: string; avatar?: string; id?: string }>;
    workspace_id?: string | null;
    commentCount?: number;
    commentsCount?: number;
    isPending?: boolean;
    recurrence_type?: string | null;
    recurrence_parent_id?: string | null;
    tags?: string[];
  };
  disabled?: boolean;
  groupColor?: string;
  onActionClick?: () => void;
  onClick?: (taskId: string | number) => void;
  onTaskUpdated?: () => void;
  onTaskDeleted?: () => void;
  onTaskUpdatedOptimistic?: (taskId: string | number, updates: Partial<{ title?: string; dueDate?: string; status?: string; priority?: string; assignees?: Array<{ name: string; avatar?: string; id?: string }> }>) => void;
  onTaskDeletedOptimistic?: (taskId: string) => void;
  onTaskDuplicatedOptimistic?: (duplicatedTask: any) => void;
  members?: Array<{ id: string; name: string; avatar?: string }>;
  showWorkspaceBadge?: boolean;
  workspaceName?: string;
  showProjectTag?: boolean;
}

type CurrentUser = { id: string; name: string; avatar?: string };

let currentUserCache: CurrentUser | null = null;
let currentUserLoaded = false;
let currentUserPromise: Promise<CurrentUser | null> | null = null;

const loadCurrentUser = async (): Promise<CurrentUser | null> => {
  if (currentUserLoaded) {
    return currentUserCache;
  }
  if (!currentUserPromise) {
    currentUserPromise = (async () => {
      const supabase = createBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        currentUserLoaded = true;
        currentUserCache = null;
        return null;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("id, full_name, email, avatar_url")
        .eq("id", user.id)
        .single();

      if (!profile) {
        currentUserLoaded = true;
        currentUserCache = null;
        return null;
      }

      currentUserCache = {
        id: profile.id,
        name: profile.full_name || profile.email || "Usuario",
        avatar: profile.avatar_url || undefined,
      };
      currentUserLoaded = true;
      return currentUserCache;
    })().finally(() => {
      currentUserPromise = null;
    });
  }
  return currentUserPromise;
};

// Função auxiliar para verificar se é hoje
const isTodayFunc = (dateString?: string): boolean => {
  if (!dateString) return false;
  const date = new Date(dateString);
  const today = new Date();
  return date.toDateString() === today.toDateString();
};

// Função auxiliar para verificar se a data é o próximo domingo
const isNextSunday = (dateString?: string): boolean => {
  if (!dateString) return false;
  const date = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const dayOfWeek = today.getDay();
  const daysUntilSunday = dayOfWeek === 0 ? 7 : 7 - dayOfWeek;
  const nextSunday = new Date(today);
  nextSunday.setDate(today.getDate() + daysUntilSunday);
  nextSunday.setHours(0, 0, 0, 0);
  
  const taskDate = new Date(date);
  taskDate.setHours(0, 0, 0, 0);
  
  return taskDate.getTime() === nextSunday.getTime();
};

// Função auxiliar para obter o próximo domingo
const getNextSunday = (): Date => {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const daysUntilSunday = dayOfWeek === 0 ? 7 : 7 - dayOfWeek;
  const nextSunday = new Date(today);
  nextSunday.setDate(today.getDate() + daysUntilSunday);
  nextSunday.setHours(0, 0, 0, 0);
  return nextSunday;
};

function MyTaskRowHomeComponent({ task, disabled = false, groupColor, onActionClick, onClick, onTaskUpdated, onTaskDeleted, onTaskUpdatedOptimistic, onTaskDeletedOptimistic, onTaskDuplicatedOptimistic, members, showWorkspaceBadge = false, workspaceName, showProjectTag = false }: MyTaskRowHomeProps) {
  // Estados para controlar abertura dos Popovers
  const [isDateOpen, setIsDateOpen] = useState(false);
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Evitar erro de hidratação renderizando Popovers apenas após montagem
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  // Estado para armazenar o usuário atual
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string; avatar?: string } | null>(null);

  // Buscar usuário atual
  useEffect(() => {
    let isActive = true;

    loadCurrentUser().then((user) => {
      if (isActive && user) {
        setCurrentUser(user);
      }
    });

    return () => {
      isActive = false;
    };
  }, []);

  // Garantir que o usuário atual esteja na lista de membros
  const membersWithCurrentUser = useMemo(() => {
    if (!members) return currentUser ? [currentUser] : [];
    
    const hasCurrentUser = currentUser && members.some(m => m.id === currentUser.id);
    if (hasCurrentUser || !currentUser) {
      return members;
    }
    
    // Adicionar usuário atual no início da lista
    return [currentUser, ...members];
  }, [members, currentUser]);

  // Grid columns sem drag handle (para home)
  const gridColumnsClass = "grid-cols-[24px_1fr_auto_90px_130px_40px]";

  // Lógica de Data
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && !task.completed;
  const isToday = task.dueDate && isTodayFunc(task.dueDate);
  const isFocusActive = isNextSunday(task.dueDate);
  const isUrgentActive = isToday || task.priority === "high" || task.priority === "urgent";

  // Mapear cor do grupo se existir
  const getGroupColorClass = (colorName?: string) => {
    if (!colorName) return null;
    if (colorName.startsWith("#")) return null;

    const colorMap: Record<string, string> = {
      "red": "bg-red-500",
      "blue": "bg-blue-500",
      "green": "bg-green-500",
      "yellow": "bg-yellow-500",
      "purple": "bg-purple-500",
      "pink": "bg-pink-500",
      "orange": "bg-orange-500",
      "slate": "bg-slate-500",
      "cyan": "bg-cyan-500",
      "indigo": "bg-indigo-500",
    };
    return colorMap[colorName] || null;
  };
  
  const groupColorClass = getGroupColorClass(groupColor);
  const isHexColor = groupColor?.startsWith("#");

  // Configuração Visual do Status
  const rawStatus = task.status || "todo";
  const dbStatus = (rawStatus in TASK_CONFIG) ? rawStatus as TaskStatus : mapLabelToStatus(rawStatus);
  const statusConfig = TASK_CONFIG[dbStatus] || TASK_CONFIG.todo;
  
  // Verificar se a tarefa está concluída
  const isCompleted = dbStatus === TASK_STATUS.DONE || task.completed === true;

  // Memoizar objeto task para TaskActionsMenu
  const taskForActionsMenu = useMemo(() => ({
    id: String(task.id),
    title: task.title,
  }), [task.id, task.title]);

  // Memoizar callback para abrir detalhes
  const handleOpenDetails = useCallback(() => {
    onClick?.(task.id);
  }, [onClick, task.id]);

  // Função para parar propagação de eventos
  const stopProp = (e: React.MouseEvent | React.PointerEvent) => {
    e.stopPropagation();
  };

  // Handler para atualizar data
  const handleDateUpdate = async (date: Date | undefined) => {
    setIsDateOpen(false);
    const previousDueDate = task.dueDate;
    onTaskUpdatedOptimistic?.(task.id, { dueDate: date ? date.toISOString() : undefined });

    try {
      const result = await updateTask({ 
        id: String(task.id), 
        due_date: date ? date.toISOString() : null 
      });
      
      if (!result.success) {
        onTaskUpdatedOptimistic?.(task.id, { dueDate: previousDueDate });
        toast.error("Erro ao atualizar data");
      } else {
        toast.success(date ? "Data atualizada" : "Data removida");
        onTaskUpdated?.();
      }
    } catch (error) {
      onTaskUpdatedOptimistic?.(task.id, { dueDate: previousDueDate });
      toast.error("Erro ao atualizar data");
    }
  };

  // Handler para atualizar status
  const handleStatusUpdate = async (newStatus: string) => {
    setIsStatusOpen(false);
    const previousStatus = task.status || "Não iniciado";
    onTaskUpdatedOptimistic?.(task.id, { status: newStatus });

    try {
      const dbStatus = mapLabelToStatus(newStatus);
      const result = await updateTask({ id: String(task.id), status: dbStatus });
      
      if (!result.success) {
        onTaskUpdatedOptimistic?.(task.id, { status: previousStatus });
        toast.error("Erro ao atualizar status");
      } else {
        toast.success(`Status alterado para ${newStatus}`);
        onTaskUpdated?.();
      }
    } catch (error) {
      onTaskUpdatedOptimistic?.(task.id, { status: previousStatus });
      toast.error("Erro ao atualizar status");
    }
  };

  // Handler para atualizar membros
  const handleMembersChange = async (memberIds: string[]) => {
    const previousAssignees = task.assignees || [];
    const previousMemberIds = previousAssignees.map((a: any) => a.id).filter(Boolean);
    
    const added = memberIds.filter(id => !previousMemberIds.includes(id));
    const removed = previousMemberIds.filter(id => !memberIds.includes(id));

    const updatedAssignees = memberIds && members 
      ? memberIds.map(id => {
          const member = members.find(m => m.id === id);
          return member ? { name: member.name, avatar: member.avatar, id: member.id } : null;
        }).filter(Boolean) as Array<{ name: string; avatar?: string; id: string }>
      : [];

    onTaskUpdatedOptimistic?.(task.id, { assignees: updatedAssignees });

    try {
      const addPromises = added.map(userId => addTaskMember(String(task.id), userId));
      const removePromises = removed.map(userId => removeTaskMember(String(task.id), userId));

      const results = await Promise.all([...addPromises, ...removePromises]);
      const hasError = results.some(r => !r.success);

      if (hasError) {
        onTaskUpdatedOptimistic?.(task.id, { assignees: previousAssignees });
        toast.error("Erro ao atualizar membros");
      } else {
        const changeCount = added.length + removed.length;
        if (changeCount > 0) {
          toast.success(changeCount === 1 ? "Membro atualizado" : `${changeCount} membros atualizados`);
        }
        onTaskUpdated?.();
      }
    } catch (error) {
      onTaskUpdatedOptimistic?.(task.id, { assignees: previousAssignees });
      toast.error("Erro ao atualizar membros");
    }
  };

  const currentMemberIds = task.assignees?.map((a: any) => a.id).filter(Boolean) || [];

  // Handler para Smart Triggers (Focus e Urgente)
  const handleSmartTrigger = async (type: 'focus' | 'urgent', e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    const previousDueDate = task.dueDate;
    let updateData: any = {};
    let optimisticUpdates: Partial<{ dueDate?: string; priority?: string }> = {};
    
    if (type === 'focus') {
      const nextSunday = getNextSunday();
      updateData = { due_date: nextSunday.toISOString() };
      optimisticUpdates = { dueDate: nextSunday.toISOString() };
    } else {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      updateData = { priority: "urgent", due_date: today.toISOString() };
      optimisticUpdates = { dueDate: today.toISOString(), priority: "urgent" };
    }
    
    onTaskUpdatedOptimistic?.(task.id, optimisticUpdates);

    try {
      const result = await updateTask({ id: String(task.id), ...updateData });
      
      if (!result.success) {
        onTaskUpdatedOptimistic?.(task.id, { dueDate: previousDueDate });
        toast.error(result.error || "Erro ao atualizar");
      } else {
        toast.success(type === 'focus' ? "Movido para Próximo Domingo" : "Marcado como Urgente");
        onTaskUpdated?.();
      }
    } catch (error) {
      onTaskUpdatedOptimistic?.(task.id, { dueDate: previousDueDate });
      toast.error("Erro ao atualizar tarefa");
    }
  };

  // Handler para toggle de conclusão
  const handleToggleComplete = async (checked: boolean) => {
    const previousStatus = task.status || "Não iniciado";
    const previousDbStatus = mapLabelToStatus(previousStatus);
    
    const newStatus = checked ? TASK_STATUS.DONE : (previousDbStatus === TASK_STATUS.DONE ? TASK_STATUS.TODO : previousDbStatus);
    const newStatusLabel = TASK_CONFIG[newStatus]?.label || (checked ? "Concluido" : previousStatus);
    
    onTaskUpdatedOptimistic?.(task.id, { status: newStatusLabel });
    
    try {
      const result = await updateTask({
        id: String(task.id),
        status: newStatus,
      });
      
      if (result.success) {
        toast.success(checked ? "Tarefa concluída" : "Tarefa reaberta");
        onTaskUpdated?.();
      } else {
        onTaskUpdatedOptimistic?.(task.id, { status: previousStatus });
        toast.error(result.error || "Erro ao atualizar tarefa");
      }
    } catch (error) {
      onTaskUpdatedOptimistic?.(task.id, { status: previousStatus });
      toast.error("Erro ao atualizar tarefa");
    }
  };

  // Handler para atualizar título
  const handleTitleUpdate = async (newTitle: string) => {
    if (!newTitle.trim()) {
      toast.error("O título não pode estar vazio");
      return;
    }

    const trimmedTitle = newTitle.trim();
    
    if (trimmedTitle === task.title) {
      return;
    }

    const previousTitle = task.title;
    
    onTaskUpdatedOptimistic?.(task.id, { title: trimmedTitle });

    try {
      const result = await updateTask({
        id: String(task.id),
        title: trimmedTitle,
      });

      if (result.success) {
        onTaskUpdated?.();
      } else {
        onTaskUpdatedOptimistic?.(task.id, { title: previousTitle });
        toast.error(result.error || "Erro ao atualizar título");
      }
    } catch (error) {
      onTaskUpdatedOptimistic?.(task.id, { title: previousTitle });
      toast.error("Erro ao atualizar título");
    }
  };

  return (
    <div
      className={cn(
        "group grid items-center h-11 border-b border-gray-100 bg-white hover:bg-gray-50 transition-colors w-full px-1 relative pl-3",
        gridColumnsClass,
        "gap-1",
        disabled && "opacity-75",
        task.isPending && "opacity-60"
      )}
      onClick={(e) => {
        const target = e.target as HTMLElement;
        const isTitleClick = target.closest('[data-inline-edit="true"]') ||
                           target.closest('.cursor-text') || 
                           target.closest('input') ||
                           target.closest('[role="textbox"]') ||
                           target.classList.contains('cursor-text') ||
                           target.hasAttribute('data-inline-edit');
        
        if (!isTitleClick && onClick) {
          onClick(task.id);
        }
      }}
    >
      {/* Barra Lateral Colorida - sempre mostra (cinza padrão ou cor do grupo) */}
      <div 
        className={cn(
          "absolute left-0 top-0 bottom-0 w-1 rounded-r-md",
          groupColorClass || isHexColor 
            ? (groupColorClass || "") 
            : "bg-gray-200"
        )}
        style={isHexColor ? { backgroundColor: groupColor } : undefined}
      />

      {/* Checkbox */}
      <div 
        onClick={stopProp}
        onPointerDown={stopProp}
        className="flex items-center justify-center"
      >
        <Checkbox 
          checked={isCompleted} 
          onCheckedChange={handleToggleComplete}
          className="border-gray-200 hover:border-gray-300 transition-colors data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
        />
      </div>

      {/* Título com indicadores no hover */}
      <div className="flex items-center min-w-0 gap-2 pr-2 overflow-hidden">
        <div className="flex items-center gap-2 flex-1 min-w-0 overflow-hidden">
          {task.isPending && (
            <Loader2 className="w-3 h-3 text-gray-400 animate-spin flex-shrink-0" />
          )}
          {/* Ícone de recorrência */}
          {(task.recurrence_type || task.recurrence_parent_id) && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <RefreshCw className="w-3 h-3 text-blue-500 flex-shrink-0" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Tarefa recorrente {task.recurrence_type ? `(${task.recurrence_type === 'daily' ? 'Diária' : task.recurrence_type === 'weekly' ? 'Semanal' : task.recurrence_type === 'monthly' ? 'Mensal' : 'Personalizada'})` : ''}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          <div className="flex-1 min-w-0 overflow-hidden">
            <InlineTextEdit
              value={task.title}
              onSave={handleTitleUpdate}
              className={cn(
                "text-sm font-medium text-gray-700",
                isCompleted && "line-through text-gray-500",
                task.isPending && "opacity-75"
              )}
              inputClassName="text-sm font-medium text-gray-700"
              disabled={task.isPending}
              maxLength={100}
            />
          </div>
          {/* Badge de Projeto (tag) ou Workspace */}
          {showProjectTag && task.tags && task.tags.length > 0 ? (
            <Badge variant="secondary" className="text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-100 flex-shrink-0">
              {task.tags[0]}
            </Badge>
          ) : showWorkspaceBadge && workspaceName ? (
            <Badge variant="secondary" className="text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-100 flex-shrink-0">
              {workspaceName}
            </Badge>
          ) : null}
        </div>
        
        {/* Comentários - aparece apenas no hover */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          {(task.commentCount && task.commentCount > 0) || (task.commentsCount && task.commentsCount > 0) ? (
            <div 
              className="flex items-center gap-1 text-gray-400 cursor-pointer hover:text-gray-600 transition-colors"
              title="Comentários"
              onClick={(e) => {
                e.stopPropagation();
                onClick?.(task.id);
              }}
            >
              <MessageSquare size={12} strokeWidth={2.5} />
              <span className="text-[10px] font-semibold">{task.commentCount || task.commentsCount || 0}</span>
            </div>
          ) : null}
        </div>
      </div>

      {/* Coluna: Responsável */}
      <div 
        className="flex items-center justify-center"
        onClick={stopProp}
        onPointerDown={stopProp}
      >
        {isMounted ? (
          <TaskMembersPicker
            memberIds={currentMemberIds}
            onChange={handleMembersChange}
            workspaceId={task.workspace_id || undefined}
            members={membersWithCurrentUser}
            align="end"
            trigger={
              <button className="outline-none rounded-full transition-all hover:scale-105 hover:ring-2 hover:ring-gray-100" onClick={stopProp} onPointerDown={stopProp}>
                {task.assignees && task.assignees.length > 0 ? (
                  <AvatarGroup
                    users={task.assignees}
                    max={3}
                    size="sm"
                  />
                ) : (
                  <div className="size-6 rounded-full border border-dashed border-gray-300 flex items-center justify-center hover:border-gray-400 bg-white text-gray-300 hover:text-gray-400">
                    <User size={12} />
                  </div>
                )}
              </button>
            }
          />
        ) : (
          <button className="outline-none rounded-full" disabled>
            {task.assignees && task.assignees.length > 0 ? (
              <AvatarGroup
                users={task.assignees}
                max={3}
                size="sm"
              />
            ) : (
              <div className="size-6 rounded-full border border-dashed border-gray-300 flex items-center justify-center bg-white text-gray-300">
                <User size={12} />
              </div>
            )}
          </button>
        )}
      </div>

      {/* Coluna: Data com indicadores Focus e Urgente */}
      <div 
        className="flex items-center justify-center gap-1 cursor-pointer hover:bg-gray-50 rounded px-1 transition-colors"
        onClick={stopProp}
        onPointerDown={stopProp}
      >
        {/* Indicadores Focus e Urgente */}
        <div className="flex items-center gap-0.5">
          {/* Focus */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSmartTrigger('focus', e);
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                  className={cn(
                    "rounded p-0.5 transition-all",
                    isFocusActive 
                      ? "text-yellow-600 bg-yellow-50 opacity-100" 
                      : "text-gray-300 opacity-0 group-hover:opacity-100 hover:text-yellow-500 hover:bg-yellow-50"
                  )}
                >
                  <Zap className="w-3.5 h-3.5 fill-current" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom"><p className="text-xs">Mover para Próximo Domingo</p></TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Urgente */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSmartTrigger('urgent', e);
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                  className={cn(
                    "rounded p-0.5 transition-all",
                    isUrgentActive 
                      ? "text-red-600 bg-red-50 opacity-100" 
                      : "text-gray-300 opacity-0 group-hover:opacity-100 hover:text-red-500 hover:bg-red-50"
                  )}
                >
                  <AlertTriangle className="w-3.5 h-3.5 fill-current" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom"><p className="text-xs">Marcar como Urgente</p></TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {isMounted ? (
          <Popover open={isDateOpen} onOpenChange={setIsDateOpen}>
            <PopoverTrigger asChild>
              <div className="flex items-center gap-1.5">
                {task.dueDate ? (
                  <span className={cn("text-xs font-medium whitespace-nowrap",
                    isOverdue ? "text-red-600 bg-red-50 px-1.5 py-0.5 rounded" : 
                    isToday ? "text-green-600" : 
                    "text-gray-500"
                  )}>
                    {new Date(task.dueDate).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                  </span>
                ) : (
                  <span className="text-xs text-gray-400 flex items-center gap-1 hover:text-gray-600">
                    <CalendarIcon className="w-3.5 h-3.5" />
                  </span>
                )}
              </div>
            </PopoverTrigger>
            <PopoverContent className="p-0 w-auto" align="start" onClick={stopProp} onPointerDown={stopProp}>
              <Calendar
                mode="single"
                selected={task.dueDate ? new Date(task.dueDate) : undefined}
                onSelect={handleDateUpdate}
                initialFocus
              />
              <div className="p-2 border-t">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full text-xs h-7 text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={() => handleDateUpdate(undefined)}
                >
                  <X className="w-3 h-3 mr-2" />
                  Remover data
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        ) : (
          <div className="flex items-center gap-1.5">
            {task.dueDate ? (
              <span className={cn("text-xs font-medium whitespace-nowrap",
                isOverdue ? "text-red-600 bg-red-50 px-1.5 py-0.5 rounded" : 
                isToday ? "text-green-600" : 
                "text-gray-500"
              )}>
                {new Date(task.dueDate).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
              </span>
            ) : (
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <CalendarIcon className="w-3.5 h-3.5" />
              </span>
            )}
          </div>
        )}
      </div>

      {/* Coluna: Status */}
      <div className="flex items-center justify-center">
        {isMounted ? (
          <Popover open={isStatusOpen} onOpenChange={setIsStatusOpen}>
            <PopoverTrigger asChild>
              <div
                onClick={stopProp}
                onPointerDown={stopProp}
              >
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[10px] px-2 py-0.5 h-5 font-medium cursor-pointer hover:bg-gray-50 transition-colors",
                    statusConfig.lightColor
                  )}
                >
                  <div className={cn("w-1.5 h-1.5 rounded-full mr-1.5", statusConfig.color.replace("fill-", "bg-"))} />
                  {statusConfig.label}
                  <ChevronDown className="w-3 h-3 ml-1 opacity-50" />
                </Badge>
              </div>
            </PopoverTrigger>
            <PopoverContent className="p-0 w-48" align="start" onClick={stopProp} onPointerDown={stopProp}>
              <Command>
                <CommandList>
                  <CommandGroup>
                    {ORDERED_STATUSES.map((statusKey) => {
                      const config = TASK_CONFIG[statusKey];
                      const isSelected = dbStatus === statusKey;
                      return (
                        <CommandItem
                          key={statusKey}
                          onSelect={() => handleStatusUpdate(config.label)}
                          className={cn(
                            "text-xs cursor-pointer",
                            isSelected && "bg-gray-100"
                          )}
                        >
                          <div className={cn("w-1.5 h-1.5 rounded-full mr-2", config.color.replace("fill-", "bg-"))} />
                          {config.label}
                          {isSelected && <CheckCircle2 className="w-3 h-3 ml-auto text-green-600" />}
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        ) : (
          <Badge
            variant="outline"
            className={cn(
              "text-[10px] px-2 py-0.5 h-5 font-medium",
              statusConfig.lightColor
            )}
          >
            <div className={cn("w-1.5 h-1.5 rounded-full mr-1.5", statusConfig.color.replace("fill-", "bg-"))} />
            {statusConfig.label}
            <ChevronDown className="w-3 h-3 ml-1 opacity-50" />
          </Badge>
        )}
      </div>

      {/* Coluna: Menu Ações */}
      <div className="flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
        <TaskActionsMenu
          task={taskForActionsMenu}
          onOpenDetails={handleOpenDetails}
          onTaskUpdated={onTaskUpdated}
          onTaskDeleted={onTaskDeleted}
          onTaskDeletedOptimistic={onTaskDeletedOptimistic}
          onTaskDuplicatedOptimistic={onTaskDuplicatedOptimistic}
          className="opacity-50 hover:opacity-100 transition-opacity"
        />
      </div>
    </div>
  );
}

// Memo para performance
export const MyTaskRowHome = memo(
  MyTaskRowHomeComponent,
  (prev, next) => {
    return (
      prev.task.id === next.task.id &&
      prev.task.title === next.task.title &&
      prev.task.status === next.task.status &&
      prev.task.dueDate === next.task.dueDate &&
      prev.task.completed === next.task.completed &&
      (mapLabelToStatus(prev.task.status || "Não iniciado") === TASK_STATUS.DONE) === (mapLabelToStatus(next.task.status || "Não iniciado") === TASK_STATUS.DONE) &&
      prev.task.priority === next.task.priority &&
      (prev.task.commentCount || 0) === (next.task.commentCount || 0) &&
      (prev.task.commentsCount || 0) === (next.task.commentsCount || 0) &&
      JSON.stringify(prev.task.assignees) === JSON.stringify(next.task.assignees) &&
      prev.groupColor === next.groupColor &&
      prev.members === next.members &&
      prev.disabled === next.disabled &&
      prev.onClick === next.onClick &&
      prev.onActionClick === next.onActionClick &&
      prev.onTaskUpdated === next.onTaskUpdated &&
      prev.onTaskDeleted === next.onTaskDeleted &&
      prev.onTaskUpdatedOptimistic === next.onTaskUpdatedOptimistic &&
      prev.onTaskDeletedOptimistic === next.onTaskDeletedOptimistic &&
      prev.onTaskDuplicatedOptimistic === next.onTaskDuplicatedOptimistic
    );
  }
);

