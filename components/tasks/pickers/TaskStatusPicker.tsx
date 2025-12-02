"use client";

import React, { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { ORDERED_STATUSES, STATUS_TO_LABEL, TASK_CONFIG, mapLabelToStatus, TaskStatus } from "@/lib/config/tasks";

interface TaskStatusPickerProps {
    status: string; // Status atual (pode ser label ou status do banco)
    onSelect: (status: TaskStatus) => void;
    trigger?: React.ReactElement; // Trigger customizado
    align?: "start" | "center" | "end";
    side?: "top" | "bottom" | "left" | "right";
}

export function TaskStatusPicker({
    status,
    onSelect,
    trigger,
    align = "end",
    side = "bottom",
}: TaskStatusPickerProps) {
    const [isOpen, setIsOpen] = useState(false);

    // Converter status para formato do banco se necessário
    const dbStatus = mapLabelToStatus(status) as TaskStatus;
    const statusConfig = TASK_CONFIG[dbStatus] || TASK_CONFIG.todo;

    const handleSelect = (newStatus: TaskStatus) => {
        onSelect(newStatus);
        setIsOpen(false);
    };

    // Trigger padrão se não houver children
    const defaultTrigger = (
        <button
            type="button"
            className={cn(
                "group flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs whitespace-nowrap transition-all cursor-pointer",
                "hover:opacity-90 hover:shadow-sm",
                statusConfig.lightColor
            )}
        >
            <div className={cn("w-2 h-2 rounded-full flex-shrink-0", statusConfig.color.replace("fill-", "bg-"))} />
            <span>{statusConfig.label}</span>
            <ChevronDown className={cn(
                "w-3 h-3 opacity-0 transition-opacity ml-0.5 text-gray-400",
                "group-hover:opacity-50"
            )} />
        </button>
    );

    // Garantir que sempre temos um único elemento válido ANTES de renderizar
    const triggerElement = React.isValidElement(trigger) ? trigger : defaultTrigger;

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                {triggerElement}
            </PopoverTrigger>
            <PopoverContent className="w-48 p-1" align={align} side={side}>
                <div className="flex flex-col gap-0.5">
                    {ORDERED_STATUSES.map((s) => {
                        const config = TASK_CONFIG[s];
                        const isSelected = s === dbStatus;
                        
                        return (
                            <button
                                key={s}
                                className={cn(
                                    "text-left px-2 py-1.5 text-sm rounded hover:bg-gray-100 transition-colors flex items-center justify-between",
                                    isSelected && "bg-gray-50 font-medium"
                                )}
                                onClick={() => handleSelect(s)}
                            >
                                <div className="flex items-center gap-2">
                                    <div className={cn("w-2 h-2 rounded-full flex-shrink-0", config.color.replace("fill-", "bg-"))} />
                                    <span>{STATUS_TO_LABEL[s]}</span>
                                </div>
                                {isSelected && <Check className="h-3 w-3 text-green-600" />}
                            </button>
                        );
                    })}
                </div>
            </PopoverContent>
        </Popover>
    );
}

