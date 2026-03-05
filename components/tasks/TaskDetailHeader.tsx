"use client";

import { memo } from "react";
import { ChevronRight, Loader2, Check, AlertTriangle, Share2, Maximize2, Minimize2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SaveState } from "./task-detail-types";

interface TaskDetailHeaderProps {
    breadcrumbs: string[] | undefined;
    isCreateMode: boolean;
    saveState: SaveState;
    isMaximized: boolean;
    onShare: () => void;
    onMaximize: () => void;
    onClose: () => void;
}

function TaskDetailHeaderComponent({
    breadcrumbs,
    isCreateMode,
    saveState,
    isMaximized,
    onShare,
    onMaximize,
    onClose,
}: TaskDetailHeaderProps) {
    return (
        <div className="px-6 py-4 border-b border-gray-100 shrink-0 bg-white">
            <div className="flex items-center justify-between">
                {!isCreateMode && breadcrumbs && breadcrumbs.length > 0 && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                        {breadcrumbs.map((crumb, i) => (
                            <div key={i} className="flex items-center gap-2">
                                <span>{crumb}</span>
                                {i < breadcrumbs.length - 1 && <ChevronRight className="w-4 h-4 text-gray-400" />}
                            </div>
                        ))}
                    </div>
                )}
                {isCreateMode && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span>Nova Tarefa</span>
                    </div>
                )}

                <div className="flex items-center gap-2 ml-auto">
                    {!isCreateMode && saveState !== "idle" && (
                        <div className="flex items-center gap-1.5 text-xs text-gray-500 mr-2">
                            {saveState === "saving" && <Loader2 className="w-3 h-3 animate-spin" />}
                            {saveState === "saved" && <Check className="w-3 h-3 text-green-600" />}
                            {saveState === "error" && <AlertTriangle className="w-3 h-3 text-red-600" />}
                            <span>
                                {saveState === "saving" && "Salvando..."}
                                {saveState === "saved" && "Edições salvas"}
                                {saveState === "error" && "Erro ao salvar"}
                            </span>
                        </div>
                    )}
                    {!isCreateMode && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={onShare}
                            title="Compartilhar tarefa"
                        >
                            <Share2 className="h-4 w-4" />
                        </Button>
                    )}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={onMaximize}
                    >
                        {isMaximized ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={onClose}
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
}

export const TaskDetailHeader = memo(TaskDetailHeaderComponent);
