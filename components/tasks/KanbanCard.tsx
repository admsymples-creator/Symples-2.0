"use client";

import React, { useCallback, useState, useRef, useEffect, useMemo, memo } from "react";
import { 
  GitPullRequest, 
  MessageSquare, 
  User, 
  X, 
  Zap, 
  AlertTriangle, 
  Calendar as CalendarIcon,
  ChevronDown,
  CheckCircle2
} from "lucide-react";
import { useTaskPreload } from "@/hooks/use-task-preload";
import { Avatar, AvatarGroup } from "./Avatar";
import { cn } from "@/lib/utils";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { TaskActionsMenu } from "./TaskActionsMenu";
import { TASK_CONFIG, mapLabelToStatus, ORDERED_STATUSES } from "@/lib/config/tasks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { updateTask } from "@/lib/actions/tasks";
import { toast } from "sonner";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// --- Utilitários ---

function getTagColor(tag: string): string {
  const normalized = tag.toLowerCase();
  if (normalized.includes("urgente") || normalized.includes("alta")) return "bg-red-100 text-red-700";
  if (normalized.includes("backend") || normalized.includes("api")) return "bg-blue-100 text-blue-700";
  if (normalized.includes("frontend") || normalized.includes("ui")) return "bg-emerald-100 text-emerald-700";
  return "bg-gray-100 text-gray-600";
}

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

const isTodayFunc = (dateString?: string): boolean => {
  if (!dateString) return false;
  const date = new Date(dateString);
  const today = new Date();
  return date.toDateString() === today.toDateString();
};

const getNextSunday = (): Date => {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const daysUntilSunday = dayOfWeek === 0 ? 7 : 7 - dayOfWeek;
  const nextSunday = new Date(today);
  nextSunday.setDate(today.getDate() + daysUntilSunday);
  nextSunday.setHours(0, 0, 0, 0);
  return nextSunday;
};

// --- Tipagem ---

interface KanbanCardProps {
  id: string;
  title: string;
  completed?: boolean;
  status?: string;
  priority?: "low" | "medium" | "high" | "urgent";
  assignees?: Array<{ name: string; avatar?: string; id?: string }>;
  dueDate?: string;
  tags?: string[];
  groupColor?: string;
  subtasksCount?: number;
  commentsCount?: number;
  onClick?: () => void;
  onTaskUpdated?: () => void;
  onTaskUpdatedOptimistic?: (taskId: string, updates: Partial<{ title: string; status: string; dueDate?: string; assignees: Array<{ name: string; avatar?: string; id?: string }> }>) => void;
  onDelete?: () => void;
  onToggleComplete?: (taskId: string, completed: boolean) => void;
  members?: Array<{ id: string; name: string; avatar?: string }>;
  disabled?: boolean;
}

// --- Componente ---

function KanbanCardComponent({
  id,
  title,
  completed = false,
  status = "todo",
  priority = "medium",
  assignees = [],
  dueDate,
  tags = [],
  groupColor,
  subtasksCount = 0,
  commentsCount = 0,
  onClick,
  onTaskUpdated,
  onTaskUpdatedOptimistic,
  onDelete,
  onToggleComplete,
  members,
  disabled = false,
}: KanbanCardProps) {
  const { preloadTask, cancelPreload } = useTaskPreload();
  
  // Estado para edição de título
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(title);
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Estados para controlar abertura dos Popovers
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [isDateOpen, setIsDateOpen] = useState(false);
  const [isAssigneeOpen, setIsAssigneeOpen] = useState(false);

  // Sincronizar titleValue com prop title quando não estiver editando
  useEffect(() => {
    if (!isEditingTitle) {
      setTitleValue(title);
    }
  }, [title, isEditingTitle]);

  // Auto-focus no input de título
  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditingTitle]);
  
  // Memoizar cálculos de data (evitar recalcular a cada render)
  const dateCalculations = useMemo(() => {
    const isOverdue = dueDate && new Date(dueDate) < new Date() && !completed;
    const isToday = dueDate && isTodayFunc(dueDate);
    const isFocusActive = isNextSunday(dueDate);
    const isUrgentActive = isToday || priority === "high" || priority === "urgent";
    return { isOverdue, isToday, isFocusActive, isUrgentActive };
  }, [dueDate, completed, priority]);
  
  const { isOverdue, isToday, isFocusActive, isUrgentActive } = dateCalculations;

  // Memoizar configuração visual
  const statusConfig = useMemo(() => {
    const dbStatus = mapLabelToStatus(status);
    return TASK_CONFIG[dbStatus] || TASK_CONFIG.todo;
  }, [status]);

  // Memoizar cálculo de cor do grupo
  const groupColorInfo = useMemo(() => {
    const getGroupColorClass = (colorName?: string) => {
      if (!colorName || colorName.startsWith("#")) return null;
      const colorMap: Record<string, string> = {
        "red": "bg-red-500", "blue": "bg-blue-500", "green": "bg-green-500",
        "yellow": "bg-yellow-500", "purple": "bg-purple-500", "pink": "bg-pink-500",
        "orange": "bg-orange-500", "slate": "bg-slate-500", "cyan": "bg-cyan-500",
        "indigo": "bg-indigo-500",
      };
      return colorMap[colorName];
    };
    return {
      groupColorClass: getGroupColorClass(groupColor),
      isHexColor: groupColor?.startsWith("#")
    };
  }, [groupColor]);
  
  const { groupColorClass, isHexColor } = groupColorInfo;

  // Drag and Drop
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id, 
    disabled,
    data: { type: 'task', taskId: id }
  });

  // Memoizar estilo de drag (evitar recriar objeto a cada render)
  const dragStyle = useMemo(() => ({
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? 'none' : transition, // Sem transição durante drag para resposta instantânea
    opacity: isDragging ? 0.3 : disabled ? 0.75 : 1, // Opacidade menor no original quando arrasta (padrão Trello)
    willChange: 'transform' as const,
  }), [transform, transition, isDragging, disabled]);

  // Actions - Optimistic UI (memoizar callbacks)
  const handleDateUpdate = useCallback(async (date: Date | undefined) => {
    setIsDateOpen(false); // Fechar Popover imediatamente
    const previousDueDate = dueDate;
    onTaskUpdatedOptimistic?.(id, { dueDate: date ? date.toISOString() : undefined });

    try {
      const result = await updateTask({ 
        id, 
        due_date: date ? date.toISOString() : null 
      });
      
      if (!result.success) {
        onTaskUpdatedOptimistic?.(id, { dueDate: previousDueDate });
        toast.error("Erro ao atualizar data");
      } else {
        toast.success(date ? "Data atualizada" : "Data removida");
        onTaskUpdated?.();
      }
    } catch (error) {
      onTaskUpdatedOptimistic?.(id, { dueDate: previousDueDate });
      toast.error("Erro ao atualizar data");
    }
  }, [id, dueDate, onTaskUpdatedOptimistic, onTaskUpdated]);

  const handleAssigneeUpdate = useCallback(async (memberId: string | null) => {
    setIsAssigneeOpen(false); // Fechar Popover imediatamente
    const previousAssignees = assignees;
    const updatedAssignees = memberId && members 
      ? members.filter(m => m.id === memberId).map(m => ({ name: m.name, avatar: m.avatar, id: m.id }))
      : [];
    onTaskUpdatedOptimistic?.(id, { assignees: updatedAssignees });

    try {
      const result = await updateTask({ id, assignee_id: memberId });
      
      if (!result.success) {
        onTaskUpdatedOptimistic?.(id, { assignees: previousAssignees });
        toast.error("Erro ao atualizar responsável");
      } else {
        toast.success(memberId ? "Responsável atualizado" : "Responsável removido");
        onTaskUpdated?.();
      }
    } catch (error) {
      onTaskUpdatedOptimistic?.(id, { assignees: previousAssignees });
      toast.error("Erro ao atualizar responsável");
    }
  }, [id, assignees, members, onTaskUpdatedOptimistic, onTaskUpdated]);

  const handleTitleSave = useCallback(async (newTitle: string) => {
    if (newTitle.trim() === title) {
      setIsEditingTitle(false);
      return;
    }

    if (!newTitle.trim()) {
      toast.error("O título não pode estar vazio");
      setTitleValue(title);
      setIsEditingTitle(false);
      return;
    }

    const trimmedTitle = newTitle.trim();
    const previousTitle = title;
    
    onTaskUpdatedOptimistic?.(id, { title: trimmedTitle });
    setTitleValue(trimmedTitle);
    setIsEditingTitle(false);

    try {
      const result = await updateTask({ id, title: trimmedTitle });
      
      if (!result.success) {
        onTaskUpdatedOptimistic?.(id, { title: previousTitle });
        setTitleValue(previousTitle);
        toast.error("Erro ao atualizar título");
      } else {
        toast.success("Título atualizado");
        onTaskUpdated?.();
      }
    } catch (error) {
      onTaskUpdatedOptimistic?.(id, { title: previousTitle });
      setTitleValue(previousTitle);
      toast.error("Erro ao atualizar título");
    }
  }, [id, title, onTaskUpdatedOptimistic, onTaskUpdated]);

  const handleStatusUpdate = useCallback(async (newStatus: string) => {
    setIsStatusOpen(false); // Fechar Popover imediatamente
    const previousStatus = status;
    onTaskUpdatedOptimistic?.(id, { status: newStatus });

    try {
      const dbStatus = mapLabelToStatus(newStatus);
      const result = await updateTask({ id, status: dbStatus });
      
      if (!result.success) {
        onTaskUpdatedOptimistic?.(id, { status: previousStatus });
        toast.error("Erro ao atualizar status");
      } else {
        toast.success(`Status alterado para ${newStatus}`);
        onTaskUpdated?.();
      }
    } catch (error) {
      onTaskUpdatedOptimistic?.(id, { status: previousStatus });
      toast.error("Erro ao atualizar status");
    }
  }, [id, status, onTaskUpdatedOptimistic, onTaskUpdated]);

  const handleSmartTrigger = useCallback(async (type: 'focus' | 'urgent', e: React.MouseEvent) => {
    // IMPORTANTE: Stop propagation para não iniciar o drag ao clicar
    e.stopPropagation();
    e.preventDefault();
    
    const previousDueDate = dueDate;
    let updateData = {};
    let optimisticUpdates: Partial<{ dueDate?: string; priority?: string }> = {};
    
    if (type === 'focus') {
      const nextSunday = getNextSunday();
      updateData = { due_date: nextSunday.toISOString() };
      optimisticUpdates = { dueDate: nextSunday.toISOString() };
    } else {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      updateData = { priority: "urgent", due_date: today.toISOString() };
      optimisticUpdates = { dueDate: today.toISOString() };
    }
    
    onTaskUpdatedOptimistic?.(id, optimisticUpdates);

    try {
      const result = await updateTask({ id, ...updateData });
      
      if (!result.success) {
        onTaskUpdatedOptimistic?.(id, { dueDate: previousDueDate });
        toast.error(result.error || "Erro ao atualizar");
      } else {
        toast.success(type === 'focus' ? "Movido para Próximo Domingo" : "Marcado como Urgente");
        onTaskUpdated?.();
      }
    } catch (error) {
      onTaskUpdatedOptimistic?.(id, { dueDate: previousDueDate });
      toast.error("Erro ao atualizar tarefa");
    }
  }, [id, dueDate, onTaskUpdatedOptimistic, onTaskUpdated]);

  // Ref para rastrear se houve movimento antes do clique
  const hasMovedRef = useRef(false);
  const clickStartRef = useRef<{ x: number; y: number; time: number } | null>(null);

  // Handler de mouse down para detectar início do clique/drag
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Não capturar se for em elementos interativos
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input') || target.closest('[role="button"]') || target.closest('[data-inline-edit]')) {
      return;
    }
    
    clickStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      time: Date.now(),
    };
    hasMovedRef.current = false;
  }, []);

  // Handler de mouse move para detectar movimento
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (clickStartRef.current && !hasMovedRef.current) {
        const deltaX = Math.abs(e.clientX - clickStartRef.current.x);
        const deltaY = Math.abs(e.clientY - clickStartRef.current.y);
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        // Se moveu mais de 3px, considera como movimento (menor que distance do sensor)
        if (distance > 3) {
          hasMovedRef.current = true;
        }
      }
    };

    const handleMouseUp = () => {
      clickStartRef.current = null;
    };

    // Sempre adicionar listeners (não depender de clickStartRef.current)
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  // Resetar quando drag termina
  useEffect(() => {
    if (!isDragging) {
      clickStartRef.current = null;
      hasMovedRef.current = false;
    }
  }, [isDragging]);

  // Handler de clique no card (abre detalhes)
  const handleClick = useCallback(() => {
    // Não executar click se estiver arrastando ou se houve movimento
    if (!isDragging && !hasMovedRef.current) {
      onClick?.();
    }
  }, [onClick, isDragging]);

  // Memoizar objeto taskForMenu
  const taskForMenu = useMemo(() => ({
    id,
    title,
    description: null,
    status,
    priority,
    due_date: dueDate || null,
    assignee_id: assignees[0]?.id || null,
    workspace_id: null,
    origin_context: {},
  }), [id, title, status, priority, dueDate, assignees]);

  // Função helper para parar propagação (memoizada)
  const stopProp = useCallback((e: React.BaseSyntheticEvent) => {
    e.stopPropagation();
  }, []);

  // Memoizar handlers de mouse
  const handleMouseEnter = useCallback(() => {
    preloadTask(id, null);
  }, [id, preloadTask]);

  return (
    <div
      ref={setNodeRef}
      style={dragStyle}
      {...attributes}
      {...(disabled ? {} : listeners)} // Listeners de drag na raiz
      className={cn(
        "group bg-white rounded-xl p-3 border border-gray-200 w-full relative",
        "flex flex-col min-h-[112px]",
        // Remover transições durante drag para resposta instantânea
        !isDragging && "transition-all duration-200",
        disabled ? "opacity-75 cursor-default" : isDragging ? "cursor-grabbing" : "cursor-pointer",
        isDragging && "rotate-2 z-50 ring-2 ring-blue-500/20"
      )}
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={cancelPreload}
    >
      {/* Menu de Ações (Absoluto) */}
      <div 
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity z-30"
        onPointerDown={stopProp} // Impede drag
        onClick={stopProp} // Impede clique no card
      >
        <TaskActionsMenu
          task={taskForMenu}
          onOpenDetails={onClick}
          onTaskUpdated={onTaskUpdated}
          onTaskDeleted={onDelete}
        />
      </div>

      {/* Indicador de Grupo */}
      {(groupColorClass || isHexColor) && (
        <div 
          className={cn("w-[30px] h-[5px] rounded-full mb-3", groupColorClass)}
          style={isHexColor ? { backgroundColor: groupColor } : undefined}
        />
      )}

      {/* Header: Status com edição rápida */}
      <div className="flex items-center justify-between mb-2">
        <Popover open={isStatusOpen} onOpenChange={setIsStatusOpen}>
          <PopoverTrigger asChild>
            <Badge
              variant="outline"
              className={cn(
                "text-[10px] px-2 py-0.5 h-5 font-medium cursor-pointer hover:bg-gray-50 transition-colors",
                statusConfig.lightColor
              )}
              onClick={stopProp}
              onPointerDown={stopProp} // Crucial para não iniciar drag
            >
              <div className={cn("w-1.5 h-1.5 rounded-full mr-1.5", statusConfig.color.replace("fill-", "bg-"))} />
              {statusConfig.label}
              <ChevronDown className="w-3 h-3 ml-1 opacity-50" />
            </Badge>
          </PopoverTrigger>
          <PopoverContent className="p-0 w-48" align="start" onClick={stopProp} onPointerDown={stopProp}>
            <Command>
              <CommandList>
                <CommandGroup>
                  {ORDERED_STATUSES.map((statusKey) => {
                    const config = TASK_CONFIG[statusKey];
                    const isSelected = mapLabelToStatus(status) === statusKey;
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
      </div>

      {/* Body: Checkbox & Título */}
      <div className="mb-3 flex-1 flex flex-col min-h-0 relative z-20">
        <div className="flex gap-2">
          <div 
            className="pt-0.5 flex-shrink-0"
            onClick={stopProp}
            onPointerDown={stopProp} // Protege Checkbox
          >
            <Checkbox 
              checked={completed} 
              onCheckedChange={(checked) => onToggleComplete?.(id, checked === true)}
              className="border-gray-300 data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
            />
          </div>
          
          <div className="flex-1 min-w-0">
            {isEditingTitle ? (
              <Input
                ref={titleInputRef}
                value={titleValue}
                onChange={(e) => setTitleValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleTitleSave(titleValue);
                  } else if (e.key === "Escape") {
                    e.preventDefault();
                    setTitleValue(title);
                    setIsEditingTitle(false);
                  }
                }}
                onBlur={() => handleTitleSave(titleValue)}
                onClick={stopProp}
                onPointerDown={stopProp} // Protege Input de Drag
                className={cn(
                  "font-semibold text-gray-800 text-sm mb-2 leading-snug",
                  "border border-gray-300 focus-visible:ring-2 focus-visible:ring-gray-200",
                  "px-2 py-1 rounded",
                  completed && "line-through text-gray-500"
                )}
              />
            ) : (
              <h4 
                className={cn(
                  "font-semibold text-gray-800 text-sm mb-2 leading-snug line-clamp-3 transition-colors",
                  "cursor-text hover:bg-gray-50 rounded px-1 -mx-1",
                  completed && "line-through text-gray-500"
                )}
                onClick={(e) => {
                  e.stopPropagation(); // Impede abrir modal ao clicar para editar
                  setIsEditingTitle(true);
                }}
                // NOTA: Não colocamos stopProp no pointerDown aqui para permitir arrastar pelo título se não for edição
              >
                {title}
              </h4>
            )}
          </div>
        </div>
        
        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap flex-shrink-0 mt-1">
            {tags.map((tag, index) => (
              <span
                key={index}
                className={cn(
                  "text-[10px] px-1.5 py-0.5 rounded-md font-semibold uppercase tracking-wide",
                  getTagColor(tag)
                )}
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Footer: Meta & Ações */}
      <div className="mt-auto pt-3 border-t border-gray-50 flex justify-between items-center relative z-20">
        
        {/* Lado Esquerdo: Data & Smart Triggers */}
        <div className="flex items-center gap-2">
          {/* Data Picker */}
          <div 
            className="flex items-center gap-1.5 cursor-pointer hover:bg-gray-50 rounded px-1 -ml-1 transition-colors"
            onClick={stopProp}
            onPointerDown={stopProp}
          >
            <Popover open={isDateOpen} onOpenChange={setIsDateOpen}>
              <PopoverTrigger asChild>
                <div className="flex items-center gap-1.5">
                  {dueDate ? (
                    <>
                      <CalendarIcon className={cn("w-3.5 h-3.5", isOverdue ? "text-red-600" : isToday ? "text-green-600" : "text-gray-400")} />
                      <span className={cn("text-xs font-medium", 
                        isOverdue ? "text-red-600 bg-red-50 px-1.5 py-0.5 rounded" : 
                        isToday ? "text-green-600" : "text-gray-500"
                      )}>
                        {new Date(dueDate).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                      </span>
                    </>
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
                  selected={dueDate ? new Date(dueDate) : undefined}
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
          </div>

          {/* Smart Triggers (Raio e Exclamação) */}
          <TooltipProvider>
            <div 
              className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={stopProp}
              onPointerDown={stopProp}
            >
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={(e) => handleSmartTrigger('focus', e)}
                    className={cn(
                      "rounded p-0.5 transition-all",
                      isFocusActive ? "text-yellow-600 bg-yellow-50" : "text-gray-300 hover:text-yellow-500 hover:bg-yellow-50"
                    )}
                  >
                    <Zap className="w-3.5 h-3.5 fill-current" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom"><p className="text-xs">Mover para Próximo Domingo</p></TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={(e) => handleSmartTrigger('urgent', e)}
                    className={cn(
                      "rounded p-0.5 transition-all",
                      isUrgentActive ? "text-red-600 bg-red-50" : "text-gray-300 hover:text-red-500 hover:bg-red-50"
                    )}
                  >
                    <AlertTriangle className="w-3.5 h-3.5 fill-current" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom"><p className="text-xs">Marcar como Urgente</p></TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>
        </div>

        {/* Lado Direito: Social & Assignee */}
        <div className="flex items-center gap-2">
          {subtasksCount > 0 && (
            <div className="flex items-center gap-1 text-gray-400" title="Subtarefas">
              <GitPullRequest size={12} strokeWidth={2.5} />
              <span className="text-[10px] font-semibold">{subtasksCount}</span>
            </div>
          )}

          {commentsCount > 0 && (
            <div className="flex items-center gap-1 text-gray-400" title="Comentários">
              <MessageSquare size={12} strokeWidth={2.5} />
              <span className="text-[10px] font-semibold">{commentsCount}</span>
            </div>
          )}

          {/* Assignee Picker */}
          <div 
            onClick={stopProp}
            onPointerDown={stopProp}
          >
            <Popover open={isAssigneeOpen} onOpenChange={setIsAssigneeOpen}>
              <PopoverTrigger asChild>
                <button className="outline-none rounded-full transition-all hover:scale-105 hover:ring-2 hover:ring-gray-100">
                  {assignees.length > 0 ? (
                    <AvatarGroup
                      users={assignees}
                      max={3}
                      size="sm"
                    />
                  ) : (
                    <div className="size-6 rounded-full border border-dashed border-gray-300 flex items-center justify-center hover:border-gray-400 bg-white text-gray-300 hover:text-gray-400">
                      <User size={12} />
                    </div>
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent className="p-0 w-56" align="end" onClick={stopProp} onPointerDown={stopProp}>
                <Command>
                  <CommandInput placeholder="Buscar membro..." />
                  <CommandList>
                    <CommandEmpty>Nenhum membro encontrado.</CommandEmpty>
                    <CommandGroup>
                      <CommandItem
                        onSelect={() => handleAssigneeUpdate(null)}
                        className="text-xs text-gray-500 cursor-pointer"
                      >
                        <div className="size-5 rounded-full border border-dashed border-gray-300 flex items-center justify-center mr-2">
                          <User size={10} />
                        </div>
                        Sem responsável
                      </CommandItem>
                      {members?.map((member) => (
                        <CommandItem
                          key={member.id}
                          onSelect={() => handleAssigneeUpdate(member.id)}
                          className="text-xs cursor-pointer"
                        >
                          <Avatar
                            name={member.name}
                            avatar={member.avatar}
                            size="sm"
                            className="size-5 mr-2"
                          />
                          {member.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>
    </div>
  );
}

// Memoizar componente para evitar re-renders desnecessários
export const KanbanCard = memo(KanbanCardComponent, (prevProps, nextProps) => {
  // Comparação personalizada para otimizar re-renders
  return (
    prevProps.id === nextProps.id &&
    prevProps.title === nextProps.title &&
    prevProps.completed === nextProps.completed &&
    prevProps.status === nextProps.status &&
    prevProps.priority === nextProps.priority &&
    prevProps.dueDate === nextProps.dueDate &&
    prevProps.disabled === nextProps.disabled &&
    prevProps.groupColor === nextProps.groupColor &&
    prevProps.subtasksCount === nextProps.subtasksCount &&
    prevProps.commentsCount === nextProps.commentsCount &&
    prevProps.onClick === nextProps.onClick &&
    prevProps.onTaskUpdated === nextProps.onTaskUpdated &&
    prevProps.onTaskUpdatedOptimistic === nextProps.onTaskUpdatedOptimistic &&
    prevProps.onDelete === nextProps.onDelete &&
    prevProps.onToggleComplete === nextProps.onToggleComplete &&
    JSON.stringify(prevProps.assignees) === JSON.stringify(nextProps.assignees) &&
    JSON.stringify(prevProps.tags) === JSON.stringify(nextProps.tags) &&
    JSON.stringify(prevProps.members) === JSON.stringify(nextProps.members)
  );
});