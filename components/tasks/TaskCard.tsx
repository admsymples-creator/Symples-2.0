"use client";

import { Badge } from "@/components/ui/badge";
import { Avatar } from "./Avatar";
import { Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

interface TaskCardProps {
    id: string;
    title: string;
    completed: boolean;
    priority?: "low" | "medium" | "high" | "urgent";
    assignees?: Array<{ name: string; avatar?: string }>;
    dueDate?: string;
    tags?: string[];
    onClick?: () => void;
}

const priorityColors = {
    low: "bg-blue-500",
    medium: "bg-yellow-500",
    high: "bg-orange-500",
    urgent: "bg-red-500",
};

export function TaskCard({
    id,
    title,
    completed,
    priority = "medium",
    assignees = [],
    dueDate,
    tags = [],
    onClick,
}: TaskCardProps) {
    const isOverdue = dueDate && new Date(dueDate) < new Date() && !completed;

    return (
        <div
            className={cn(
                "bg-white rounded-lg border border-gray-200 shadow-sm p-3 cursor-pointer",
                "hover:shadow-md transition-shadow",
                "flex flex-col gap-3"
            )}
            onClick={onClick}
        >
            {/* Topo: Tags */}
            {tags.length > 0 && (
                <div className="flex items-center gap-1 flex-wrap">
                    {tags.map((tag, index) => (
                        <Badge
                            key={index}
                            variant="outline"
                            className="text-xs px-2 py-0 bg-gray-100 text-gray-600 border-gray-200"
                        >
                            {tag}
                        </Badge>
                    ))}
                </div>
            )}

            {/* Meio: Título */}
            <h4
                className={cn(
                    "font-medium text-gray-900 text-sm leading-snug",
                    completed && "line-through text-gray-500"
                )}
            >
                {title}
            </h4>

            {/* Baixo: Data e Responsável */}
            <div className="flex items-center justify-between mt-auto pt-2 border-t border-gray-100">
                {/* Data */}
                <div className="flex items-center gap-1.5">
                    {dueDate && (
                        <>
                            <Calendar
                                className={cn(
                                    "w-3.5 h-3.5",
                                    isOverdue ? "text-red-600" : "text-gray-400"
                                )}
                            />
                            <span
                                className={cn(
                                    "text-xs",
                                    isOverdue ? "text-red-600 font-medium" : "text-gray-500"
                                )}
                            >
                                {new Date(dueDate).toLocaleDateString("pt-BR", {
                                    day: "2-digit",
                                    month: "short",
                                })}
                            </span>
                        </>
                    )}
                </div>

                {/* Responsáveis */}
                <div className="flex items-center gap-1">
                    {assignees.length > 0 ? (
                        assignees.slice(0, 2).map((assignee, index) => (
                            <Avatar
                                key={index}
                                name={assignee.name}
                                avatar={assignee.avatar}
                                size="sm"
                                className="border border-white"
                            />
                        ))
                    ) : (
                        <div className="w-6 h-6" />
                    )}
                    {assignees.length > 2 && (
                        <div className="w-6 h-6 rounded-full bg-gray-100 border border-white flex items-center justify-center text-xs text-gray-600 font-medium">
                            +{assignees.length - 2}
                        </div>
                    )}
                </div>
            </div>

            {/* Linha de prioridade (opcional, sutil) */}
            <div className={cn("h-0.5 rounded-full", priorityColors[priority])} />
        </div>
    );
}

