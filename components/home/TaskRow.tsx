"use client";

import { useState } from "react";
import { Edit2, Trash2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { Database } from "@/types/database.types";

type Task = Database["public"]["Tables"]["tasks"]["Row"];

interface TaskRowProps {
  task: Task;
  onToggle?: (id: string, checked: boolean) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export function TaskRow({
  task,
  onToggle,
  onEdit,
  onDelete,
}: TaskRowProps) {
  const [isChecked, setIsChecked] = useState(task.status === "done");

  const handleToggle = (checked: boolean) => {
    setIsChecked(checked);
    if (onToggle) {
      onToggle(task.id, checked);
    }
  };

  // Determinar se é tarefa pessoal (Quick Add)
  const isPersonal = task.is_personal || !task.workspace_id;

  // Gerar cor baseada no workspace_id (hash simples)
  // Se não tiver workspace_id, não renderiza barra
  const getWorkspaceColor = (workspaceId: string | null): string => {
    if (!workspaceId) return "#22C55E"; // Verde padrão (não deve ser usado)

    // Hash simples baseado no ID para gerar cor consistente
    let hash = 0;
    for (let i = 0; i < workspaceId.length; i++) {
      hash = workspaceId.charCodeAt(i) + ((hash << 5) - hash);
    }

    // Gerar cores vibrantes mas não muito claras/escuras
    const hue = Math.abs(hash % 360);
    const saturation = 60 + (Math.abs(hash) % 20); // 60-80%
    const lightness = 45 + (Math.abs(hash) % 15); // 45-60%

    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  };

  const workspaceColor = task.workspace_id
    ? getWorkspaceColor(task.workspace_id)
    : "#22C55E";

  return (
    <div
      className={cn(
        "relative w-full flex items-center justify-between py-2 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors group"
      )}
    >
      {/* Workspace Bar Vertical - Apenas para tarefas de Workspace */}
      {!isPersonal && (
        <div
          className="absolute left-0 top-0 bottom-0 w-1 rounded-r"
          style={{ backgroundColor: workspaceColor }}
        />
      )}

      {/* Conteúdo Esquerda */}
      <div
        className={cn(
          "flex items-center flex-1 min-w-0",
          !isPersonal ? "pl-4" : "pl-2"
        )}
      >
        <Checkbox
          checked={isChecked}
          onCheckedChange={handleToggle}
          className="flex-shrink-0"
        />
        <p
          className={cn(
            "text-sm truncate ml-3 flex-1",
            isChecked
              ? "line-through text-gray-500"
              : "text-gray-700"
          )}
        >
          {task.title}
        </p>
      </div>

      {/* Ações Direita - Apenas no hover */}
      <div className="flex items-center gap-1 pr-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => onEdit?.(task.id)}
          className="p-1.5 rounded hover:bg-gray-200 transition-colors"
          aria-label="Editar tarefa"
        >
          <Edit2 className="w-3.5 h-3.5 text-gray-500" />
        </button>
        <button
          onClick={() => onDelete?.(task.id)}
          className="p-1.5 rounded hover:bg-red-50 hover:text-red-600 transition-colors"
          aria-label="Excluir tarefa"
        >
          <Trash2 className="w-3.5 h-3.5 text-gray-500" />
        </button>
      </div>
    </div>
  );
}
