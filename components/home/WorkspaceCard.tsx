"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface WorkspaceCardProps {
    name: string;
    pendingCount: number;
    totalCount: number;
}

export function WorkspaceCard({ name, pendingCount, totalCount }: WorkspaceCardProps) {
    const [isHovered, setIsHovered] = useState(false);
    const progress = totalCount > 0 ? ((totalCount - pendingCount) / totalCount) * 100 : 0;

    // Função para determinar a cor baseada no progresso (6 tons de verde)
    const getProgressColor = (value: number) => {
        if (value < 15) return "bg-green-200";
        if (value < 30) return "bg-green-300";
        if (value < 50) return "bg-green-400";
        if (value < 70) return "bg-green-500";
        if (value < 85) return "bg-green-600";
        return "bg-green-700";
    };

    return (
        <Card
            className="group p-4 rounded-xl border border-gray-200 bg-white hover:border-gray-300 hover:shadow-md transition-all duration-200 cursor-pointer relative overflow-hidden"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Arrow Icon - appears on hover */}
            <div
                className={cn(
                    "absolute top-4 right-4 transition-all duration-200",
                    isHovered ? "opacity-100 translate-x-0" : "opacity-0 translate-x-2"
                )}
            >
                <ArrowRight className={cn("w-5 h-5 transition-colors", getProgressColor(progress).replace("bg-", "text-"))} />
            </div>

            <div className="flex items-start gap-3 pr-6">
                {/* Icon */}
                <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-5 h-5 text-gray-600" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-900 truncate">{name}</h4>
                    <Badge variant="secondary" className="mt-1 text-xs bg-gray-100 text-gray-600 hover:bg-gray-200">
                        {pendingCount} pendentes
                    </Badge>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-3">
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                        className={cn("h-full rounded-full transition-all duration-300", getProgressColor(progress))}
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>
        </Card>
    );
}
