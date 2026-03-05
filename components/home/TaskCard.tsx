"use client";

import { User } from "lucide-react";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface TaskCardProps {
    id: string;
    title: string;
    status: "todo" | "in_progress" | "done";
    isQuickAdd?: boolean; // Tarefa rápida (pessoal) vs Workspace (oficial)
    workspaceColor?: string; // Cor do workspace para badge
}

export function TaskCard({ id, title, status, isQuickAdd = false, workspaceColor = "#22C55E" }: TaskCardProps) {
    const statusColors = {
        done: "bg-green-500",
        in_progress: "bg-yellow-500",
        todo: "bg-gray-300",
    };

    // Se for tarefa rápida (Quick Add), usa estilo leve
    if (isQuickAdd) {
        return (
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <div
                            className="h-14 p-3 rounded-lg bg-gray-50 border border-dashed border-gray-200 hover:border-gray-300 cursor-pointer transition-all flex items-center gap-2"
                        >
                            <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            <p className="text-sm font-medium text-gray-700 truncate flex-1">{title}</p>
                            <div
                                className={cn(
                                    "w-2 h-2 rounded-full flex-shrink-0",
                                    statusColors[status]
                                )}
                            />
                        </div>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>{title}</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        );
    }

    // Tarefa de Workspace (oficial) - estilo completo
    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div
                        className="h-14 p-3 rounded-lg bg-white border border-gray-100 shadow-sm hover:shadow-md hover:border-green-200 cursor-pointer transition-all flex items-center gap-2"
                    >
                        {/* Workspace Badge Color */}
                        <div
                            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: workspaceColor }}
                        />
                        <p className="text-sm font-medium text-gray-700 truncate flex-1">{title}</p>
                        <div
                            className={cn(
                                "w-2 h-2 rounded-full flex-shrink-0",
                                statusColors[status]
                            )}
                        />
                    </div>
                </TooltipTrigger>
                <TooltipContent>
                    <p>{title}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}

