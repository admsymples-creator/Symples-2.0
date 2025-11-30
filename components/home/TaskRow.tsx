"use client";

import { useState, useRef, useEffect } from "react";
import { Edit2, Trash2, Building2, ArrowRight, CornerUpRight } from "lucide-react";
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
  workspaces?: { id: string; name: string }[];
  onToggle?: (id: string, checked: boolean) => void;
  onEdit?: (id: string, newTitle: string) => Promise<void>;
  onDelete?: (id: string) => void;
  onMoveToWorkspace?: (id: string, workspaceId: string) => void;
}

export function TaskRow({
  task,
  workspaces = [],
  onToggle,
  onEdit,
  onDelete,
  onMoveToWorkspace,
}: TaskRowProps) {
  const [isChecked, setIsChecked] = useState(task.status === "done");
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(task.title);
  const inputRef = useRef<HTMLInputElement>(null);

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
    setEditValue(task.title);
  };

  const saveEdit = async () => {
    if (!editValue.trim() || editValue === task.title) {
      setIsEditing(false);
      setEditValue(task.title);
      return;
    }

    if (onEdit) {
      await onEdit(task.id, editValue.trim());
    }
    setIsEditing(false);
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
            <TooltipProvider>
                <Tooltip delayDuration={500}>
                    <TooltipTrigger asChild>
                        <p
                            onDoubleClick={startEditing}
                            className={cn(
                                "text-sm ml-3 flex-1 truncate leading-snug select-none cursor-default",
                                isChecked
                                    ? "line-through text-gray-500"
                                    : "text-gray-700"
                            )}
                        >
                            {task.title}
                        </p>
                    </TooltipTrigger>
                    <TooltipContent side="top" align="start" className="max-w-[300px] break-words">
                        <p>{task.title}</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
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
            
            <button
              onClick={() => onDelete?.(task.id)}
              className="p-1 rounded hover:bg-red-50 transition-colors text-gray-400 hover:text-red-600"
              aria-label="Excluir"
            >
              <Trash2 className="w-3 h-3" />
            </button>

            {workspaces.length > 0 && (
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
