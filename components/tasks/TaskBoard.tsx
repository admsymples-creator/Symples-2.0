"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TaskCard } from "./TaskCard";
import { Plus } from "lucide-react";

interface Task {
    id: string;
    title: string;
    completed: boolean;
    priority?: "low" | "medium" | "high" | "urgent";
    status: string;
    assignees?: Array<{ name: string; avatar?: string }>;
    dueDate?: string;
    tags?: string[];
}

interface Column {
    id: string;
    title: string;
    tasks: Task[];
}

interface TaskBoardProps {
    columns: Column[];
    onTaskClick?: (taskId: string) => void;
    onAddTask?: (columnId: string) => void;
}

export function TaskBoard({ columns, onTaskClick, onAddTask }: TaskBoardProps) {
    return (
        <div className="flex h-[calc(100vh-200px)] overflow-x-auto gap-6 p-4">
            {columns.map((column) => (
                <div
                    key={column.id}
                    className="bg-gray-50/50 rounded-xl p-2 w-[300px] flex-none flex flex-col"
                >
                    {/* Header da Coluna */}
                    <div className="flex items-center justify-between mb-3 px-2">
                        <div className="flex items-center gap-2">
                            <h3 className="text-sm font-semibold text-gray-900">{column.title}</h3>
                            <Badge
                                variant="outline"
                                className="text-xs px-2 py-0 bg-white text-gray-600 border-gray-200"
                            >
                                {column.tasks.length}
                            </Badge>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-gray-500 hover:text-gray-900 hover:bg-white"
                            onClick={() => onAddTask?.(column.id)}
                        >
                            <Plus className="w-4 h-4" />
                        </Button>
                    </div>

                    {/* Corpo da Coluna (Scroll) */}
                    <div className="flex-1 overflow-y-auto space-y-2 px-1 min-h-0">
                        {column.tasks.length === 0 ? (
                            <div className="py-8 text-center text-sm text-gray-400">
                                Nenhuma tarefa
                            </div>
                        ) : (
                            column.tasks.map((task) => (
                                <TaskCard
                                    key={task.id}
                                    {...task}
                                    onClick={() => onTaskClick?.(task.id)}
                                />
                            ))
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}

