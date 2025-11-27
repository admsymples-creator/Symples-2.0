"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, Plus } from "lucide-react";
import { TaskRow } from "./TaskRow";
import { cn } from "@/lib/utils";

interface Task {
    id: string;
    title: string;
    completed: boolean;
    priority?: "low" | "medium" | "high" | "urgent";
    status: string;
    assignees?: Array<{ name: string; avatar?: string }>;
    dueDate?: string;
    tags?: string[];
    hasUpdates?: boolean;
}

interface TaskGroupProps {
    title: string;
    icon?: string;
    tasks: Task[];
    onTaskClick?: (taskId: string) => void;
    onAddTask?: () => void;
    defaultCollapsed?: boolean;
}

export function TaskGroup({
    title,
    icon,
    tasks,
    onTaskClick,
    onAddTask,
    defaultCollapsed = false,
}: TaskGroupProps) {
    const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
    const [isHovered, setIsHovered] = useState(false);

    const completedCount = tasks.filter((t) => t.completed).length;
    const totalCount = tasks.length;

    return (
        <div
            className="mb-6"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Header do Grupo */}
            <div className="flex items-center justify-between mb-2 px-1">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="p-1 hover:bg-gray-100 rounded transition-colors"
                    >
                        {isCollapsed ? (
                            <ChevronRight className="w-4 h-4 text-gray-500" />
                        ) : (
                            <ChevronDown className="w-4 h-4 text-gray-500" />
                        )}
                    </button>
                    <div className="flex items-center gap-2">
                        {icon && <span className="text-xs">{icon}</span>}
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">{title}</h3>
                        <Badge variant="outline" className="text-xs px-2 py-0 bg-gray-100 text-gray-600 border-gray-200">
                            {completedCount}/{totalCount}
                        </Badge>
                    </div>
                </div>

                {/* Botão Adicionar (visível no hover) */}
                {isHovered && !isCollapsed && (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs text-gray-600 hover:text-gray-900"
                        onClick={(e) => {
                            e.stopPropagation();
                            onAddTask?.();
                        }}
                    >
                        <Plus className="w-3 h-3 mr-1" />
                        Adicionar
                    </Button>
                )}
            </div>

            {/* Lista de Tarefas */}
            {!isCollapsed && (
                <div className="bg-white border border-gray-100 rounded-lg overflow-hidden">
                    {tasks.length === 0 ? (
                        <div className="py-8 text-center text-sm text-gray-500">
                            Nenhuma tarefa neste grupo
                        </div>
                    ) : (
                        tasks.map((task, index) => (
                            <TaskRow
                                key={task.id}
                                {...task}
                                onClick={() => onTaskClick?.(task.id)}
                                isLast={index === tasks.length - 1}
                            />
                        ))
                    )}
                </div>
            )}
        </div>
    );
}

