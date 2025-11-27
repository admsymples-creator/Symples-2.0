"use client";

import { useState } from "react";
import { Clock, FolderOpen } from "lucide-react";
import { Input } from "@/components/ui/input";
import { TaskRow } from "@/components/home/TaskRow";
import { cn } from "@/lib/utils";

interface Task {
    id: string;
    title: string;
    status: "todo" | "in_progress" | "done";
    isQuickAdd?: boolean;
    workspaceColor?: string;
}

interface DayColumnProps {
    dayName: string;
    date: string;
    tasks: Task[];
    isToday?: boolean;
    onAddTask?: (title: string) => void;
}

export function DayColumn({ dayName, date, tasks, isToday, onAddTask }: DayColumnProps) {
    const [quickAddValue, setQuickAddValue] = useState("");
    const [isQuickAddFocused, setIsQuickAddFocused] = useState(false);

    const handleQuickAddSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (quickAddValue.trim() && onAddTask) {
            onAddTask(quickAddValue.trim());
            setQuickAddValue("");
        }
    };

    // Determinar cor de fundo baseada no estado
    const bgColor = isToday ? "bg-green-50/20" : "bg-gray-50/50";

    return (
        <div
            className={`h-[600px] rounded-xl flex flex-col relative overflow-hidden ${isToday
                    ? "border-2 border-green-500"
                    : "border border-gray-200"
                } ${bgColor}`}
        >
            {/* Header - Flex None (Altura Fixa) */}
            <div className="flex-none p-5 pb-2">
                <h3 className="font-medium text-gray-900 text-sm">{dayName}</h3>
                <p className="text-xs text-gray-500 mt-0.5">{date}</p>
            </div>

            {/* Tasks List - Flex-1 (Ocupa espaço restante) com Scroll */}
            <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0 flex flex-col px-3">
                <div className="flex-1">
                    {tasks.length > 0 ? (
                        <div className="px-2">
                            {tasks.map((task) => (
                                <TaskRow
                                    key={task.id}
                                    id={task.id}
                                    title={task.title}
                                    status={task.status}
                                    isQuickAdd={task.isQuickAdd}
                                    workspaceColor={task.workspaceColor}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-32 px-2">
                            <FolderOpen className="w-12 h-12 text-gray-200 mb-2" />
                            <p className="text-xs text-gray-400">Sem tarefas</p>
                        </div>
                    )}
                </div>

                {/* Quick Add Input - Integrado ao Scroll, estilo linha */}
                <div className="px-2 pb-2 mt-6">
                    <form onSubmit={handleQuickAddSubmit}>
                        <div className={cn(
                            "relative py-2 border-b border-transparent hover:border-gray-200 transition-colors",
                            isQuickAddFocused && "border-green-500"
                        )}>
                            <div className="flex items-center gap-3 pl-2">
                                <div className="w-4 h-4 flex-shrink-0" />
                                <input
                                    type="text"
                                    placeholder="+ Adicionar item..."
                                    value={quickAddValue}
                                    onChange={(e) => setQuickAddValue(e.target.value)}
                                    onFocus={() => setIsQuickAddFocused(true)}
                                    onBlur={() => setIsQuickAddFocused(false)}
                                    className="text-sm h-8 flex-1 bg-transparent border-0 outline-none placeholder:text-gray-400 text-gray-700 focus:placeholder:text-gray-300"
                                />
                                {isQuickAddFocused && (
                                    <button
                                        type="button"
                                        className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors pr-2"
                                        aria-label="Definir horário"
                                    >
                                        <Clock className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
