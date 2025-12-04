"use client";

import React, { memo, useMemo } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

interface TaskRowMinifyProps {
  task: {
    id: string | number;
    title: string;
    status?: string;
  };
  containerId?: string;
  isOverlay?: boolean;
  onActionClick?: () => void;
  onClick?: (taskId: string | number) => void;
}

function TaskRowMinifyComponent({ task, containerId, isOverlay = false, onActionClick, onClick }: TaskRowMinifyProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: String(task.id), data: { containerId } }); // Normaliza ID para string

  // Usar Translate para performance durante o drag
  const style = {
    transform: CSS.Translate.toString(transform),
    transition: isDragging ? undefined : transition,
    opacity: isDragging || isOverlay ? 0.85 : 1,
    zIndex: isDragging ? 50 : 1,
    position: "relative" as const,
  };

  const menuTriggerId = useMemo(() => `menu-${String(task.id)}`, [task.id]);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group flex items-center h-14 border-b border-gray-100 bg-white hover:bg-gray-50 transition-colors w-full px-1",
        (isDragging || isOverlay) && "ring-2 ring-primary/20 bg-gray-50 z-50 shadow-sm"
      )}
      onClick={() => onClick?.(task.id)}
    >
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        suppressHydrationWarning
        className="h-full flex items-center px-3 cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-600 outline-none touch-none"
      >
        <GripVertical className="w-4 h-4" />
      </div>

      {/* Conteúdo mínimo */}
      <div className="flex-1 flex items-center min-w-0 pr-2">
        <span className="truncate font-medium text-gray-700 text-sm">
          {task.title}
        </span>
      </div>

      {/* Trigger do menu de ações com supressão de hidratação */}
      <button
        type="button"
        id={menuTriggerId}
        suppressHydrationWarning
        className="ml-auto mr-2 rounded p-1 text-gray-300 hover:text-gray-600 hover:bg-gray-100 transition-colors"
        aria-label="Abrir ações da tarefa"
        onClick={(e) => {
          e.stopPropagation();
          onActionClick?.();
        }}
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>
    </div>
  );
}

// Memo para estabilidade do DND
export const TaskRowMinify = memo(
  TaskRowMinifyComponent,
  (prev, next) => {
    return (
      prev.task.id === next.task.id &&
      prev.task.title === next.task.title &&
      prev.task.status === next.task.status &&
      prev.isOverlay === next.isOverlay &&
      prev.onClick === next.onClick &&
      prev.onActionClick === next.onActionClick
    );
  }
);
