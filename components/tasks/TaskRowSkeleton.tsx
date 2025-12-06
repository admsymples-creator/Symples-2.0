"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface TaskRowSkeletonProps {
    groupColor?: string;
}

export function TaskRowSkeleton({ groupColor }: TaskRowSkeletonProps) {
    const isHexColor = groupColor?.startsWith("#");
    const getGroupColorClass = (colorName?: string) => {
        if (!colorName || colorName.startsWith("#")) return null;
        const colorMap: Record<string, string> = {
            "red": "bg-red-500",
            "blue": "bg-blue-500",
            "green": "bg-green-500",
            "yellow": "bg-yellow-500",
            "purple": "bg-purple-500",
            "pink": "bg-pink-500",
            "orange": "bg-orange-500",
            "slate": "bg-slate-500",
            "cyan": "bg-cyan-500",
            "indigo": "bg-indigo-500",
        };
        return colorMap[colorName] || null;
    };
    
    const groupColorClass = getGroupColorClass(groupColor);

    return (
        <div
            className={cn(
                "group grid items-center h-11 border-b border-gray-100 bg-white w-full px-1 relative animate-pulse",
                "grid-cols-[40px_24px_1fr_90px_32px_130px_40px] gap-1"
            )}
        >
            {/* Barra Lateral Colorida (linha contínua) - APENAS Cor do Grupo */}
            {(groupColorClass || isHexColor) && (
                <div 
                    className={cn(
                        "absolute left-0 top-0 bottom-0 w-1 rounded-r-md",
                        groupColorClass
                    )}
                    style={isHexColor ? { backgroundColor: groupColor } : undefined}
                />
            )}

            {/* Drag Handle */}
            <div className="h-full flex items-center justify-center">
                <div className="w-4 h-4 rounded bg-gray-200" />
            </div>

            {/* Checkbox */}
            <div className="flex items-center justify-center">
                <div className="w-4 h-4 rounded border border-gray-200 bg-gray-100" />
            </div>

            {/* Título */}
            <div className="flex items-center min-w-0 pr-2 gap-2">
                <div className="flex-1 min-w-0">
                    <div className="h-4 bg-gray-200 rounded w-3/4" />
                </div>
            </div>

            {/* Data */}
            <div className="flex items-center justify-center">
                <div className="w-16 h-3 bg-gray-200 rounded" />
            </div>

            {/* Responsável */}
            <div className="flex items-center justify-center">
                <div className="w-6 h-6 rounded-full bg-gray-200" />
            </div>

            {/* Status */}
            <div className="flex items-center justify-center">
                <div className="w-20 h-5 bg-gray-200 rounded-full" />
            </div>

            {/* Menu Ações */}
            <div className="flex items-center justify-center">
                <div className="w-4 h-4 rounded bg-gray-200" />
            </div>
        </div>
    );
}

