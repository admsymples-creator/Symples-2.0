"use client";

import React, { useCallback } from "react";
import { 
  GitPullRequest, 
  MessageSquare, 
  User, 
  X, 
  Zap, 
  AlertTriangle, 
  Calendar as CalendarIcon 
} from "lucide-react";
import { useTaskPreload } from "@/hooks/use-task-preload";
import { Avatar } from "./Avatar";
import { cn } from "@/lib/utils";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { TaskActionsMenu } from "./TaskActionsMenu";
import { TASK_CONFIG, mapLabelToStatus } from "@/lib/config/tasks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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

// --- Utilitários (Movidos para fora para performance) ---

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
  onDelete,
  onToggleComplete,
  members,
  disabled = false,
}: KanbanCardProps) {
  const { preloadTask, cancelPreload } = useTaskPreload();
  
  // Lógica de Data
  const isOverdue = dueDate && new Date(dueDate) < new Date() && !completed;
  const isToday = dueDate && isTodayFunc(dueDate);
  const isFocusActive = isNextSunday(dueDate);
  const isUrgentActive = isToday || priority === "high" || priority === "urgent";

  // Configuração Visual
  const dbStatus = mapLabelToStatus(status);
  const statusConfig = TASK_CONFIG[dbStatus] || TASK_CONFIG.todo;

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
  
  const groupColorClass = getGroupColorClass(groupColor);
  const isHexColor = groupColor?.startsWith("#");

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

  const dragStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : disabled ? 0.75 : 1,
  };

  // Actions
  const handleDateUpdate = async (date: Date | undefined) => {
    try {
      const result = await updateTask({ 
        id, 
        due_date: date ? date.toISOString() : null 
      });
      if (result.success) {
        onTaskUpdated?.();
        toast.success(date ? "Data atualizada" : "Data removida");
      } else {
        toast.error("Erro ao atualizar data");
      }
    } catch {
      toast.error("Erro ao atualizar data");
    }
  };

  const handleAssigneeUpdate = async (memberId: string | null) => {
    try {
      const result = await updateTask({ id, assignee_id: memberId });
      if (result.success) {
        onTaskUpdated?.();
        toast.success(memberId ? "Responsável atualizado" : "Responsável removido");
      } else {
        toast.error("Erro ao atualizar responsável");
      }
    } catch {
      toast.error("Erro ao atualizar responsável");
    }
  };

  const handleSmartTrigger = async (type: 'focus' | 'urgent', e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      let updateData = {};
      
      if (type === 'focus') {
        const nextSunday = getNextSunday();
        updateData = { due_date: nextSunday.toISOString() };
      } else {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        updateData = { priority: "urgent", due_date: today.toISOString() };
      }

      const result = await updateTask({ id, ...updateData });
      
      if (result.success) {
        toast.success(type === 'focus' ? "Movido para Próximo Domingo" : "Marcado como Urgente");
        onTaskUpdated?.();
      } else {
        toast.error(result.error || "Erro ao atualizar");
      }
    } catch {
      toast.error("Erro ao atualizar tarefa");
    }
  };

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (isDragging) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    onClick?.();
  }, [onClick, isDragging]);

  // Objeto reconstruído para o menu (Idealmente deveria vir via props, mantido para compatibilidade)
  const taskForMenu = {
    id,
    title,
    description: null,
    status,
    priority,
    due_date: dueDate || null,
    assignee_id: assignees[0]?.id || null,
    workspace_id: null,
    origin_context: {},
  };

  return (
    <div
      ref={setNodeRef}
      style={dragStyle}
      {...attributes}
      {...(disabled ? {} : listeners)}
      className={cn(
        "group bg-white rounded-xl p-3 border border-gray-200 shadow-sm w-full relative",
        "hover:shadow-md transition-all duration-200 flex flex-col min-h-[112px]",
        disabled ? "cursor-default opacity-75" : "cursor-grab active:cursor-grabbing",
        isDragging && "shadow-lg rotate-1 z-50"
      )}
      onClick={handleClick}
      onMouseEnter={() => preloadTask(id, null)}
      onMouseLeave={cancelPreload}
    >
      {/* Menu de Ações (Absoluto) */}
      <div 
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity z-30"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <TaskActionsMenu
          task={taskForMenu}
          onOpenDetails={onClick}
          onTaskUpdated={onTaskUpdated}
          onTaskDeleted={onDelete}
          members={members}
        />
      </div>

      {/* Indicador de Grupo */}
      {(groupColorClass || isHexColor) && (
        <div 
          className={cn("w-[30px] h-[5px] rounded-full mb-3", groupColorClass)}
          style={isHexColor ? { backgroundColor: groupColor } : undefined}
        />
      )}

      {/* Header: Status */}
      <div className="flex items-center justify-between mb-2">
        <Badge
          variant="outline"
          className={cn("text-[10px] px-2 py-0.5 h-5 font-medium", statusConfig.lightColor)}
        >
          <div className={cn("w-1.5 h-1.5 rounded-full mr-1.5", statusConfig.color.replace("fill-", "bg-"))} />
          {statusConfig.label}
        </Badge>
      </div>

      {/* Body: Checkbox & Título */}
      <div className="mb-3 flex-1 flex flex-col min-h-0 relative z-20">
        <div className="flex gap-2">
          <div 
            className="pt-0.5 flex-shrink-0"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <Checkbox 
              checked={completed} 
              onCheckedChange={(checked) => onToggleComplete?.(id, checked === true)}
              className="border-gray-300 data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
            />
          </div>
          
          <div className="flex-1 min-w-0">
            <h4 className={cn(
              "font-semibold text-gray-800 text-sm mb-2 leading-snug line-clamp-3 transition-colors",
              completed && "line-through text-gray-500"
            )}>
              {title}
            </h4>
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
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <Popover>
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
              <PopoverContent className="p-0 w-auto" align="start">
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
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={(e) => handleSmartTrigger('focus', e)}
                    className={cn(
                      "rounded p-0.5 transition-all",
                      isFocusActive ? "text-yellow-600 bg-yellow-50" : "text-gray-300 hover:text-yellow-500 hover:bg-yellow-50"
                    )}
                    onPointerDown={(e) => e.stopPropagation()}
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
                    onPointerDown={(e) => e.stopPropagation()}
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
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <Popover>
              <PopoverTrigger asChild>
                <button className="outline-none rounded-full transition-all hover:scale-105 hover:ring-2 hover:ring-gray-100">
                  {assignees.length > 0 ? (
                    <Avatar
                      name={assignees[0].name}
                      avatar={assignees[0].avatar}
                      size="sm"
                      className="border border-white shadow-sm"
                    />
                  ) : (
                    <div className="size-6 rounded-full border border-dashed border-gray-300 flex items-center justify-center hover:border-gray-400 bg-white text-gray-300 hover:text-gray-400">
                      <User size={12} />
                    </div>
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent className="p-0 w-56" align="end">
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

// Exportar sem memo temporariamente para debug (similar ao TaskCard)
export const KanbanCard = KanbanCardComponent;