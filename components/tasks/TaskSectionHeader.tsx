"use client";

import { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface TaskSectionHeaderProps {
    title: string;
    count: number;
    color?: string;
    actions?: ReactNode;
    leftContent?: ReactNode; // Para botão de collapse, ícone, etc.
}

export function TaskSectionHeader({
    title,
    count,
    color,
    actions,
    leftContent,
}: TaskSectionHeaderProps) {
    return (
        <div className="flex items-center justify-between h-8 mb-2 select-none px-1 group">
            {/* Esquerda (Info) */}
            <div className="flex items-center gap-2">
                {leftContent}
                {color && (
                    <div 
                        className="w-2 h-2 rounded-full mr-0.5" 
                        style={{ backgroundColor: color }}
                    />
                )}
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                    {title}
                </h3>
                <Badge
                    variant="outline"
                    className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-[10px] min-w-[1.5rem] text-center border-gray-200"
                >
                    {count}
                </Badge>
                {/* Actions next to title */}
                {actions && <div className="ml-1">{actions}</div>}
            </div>

            {/* Direita (Espaçador se necessário) */}
            <div></div>
        </div>
    );
}

