"use client";

import { useState, useEffect } from "react";
import { MoreHorizontal, MessageSquare, CheckSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSearchParams, useRouter } from "next/navigation";
import { useWorkspace } from "@/components/providers/SidebarProvider";
import { getIconComponent } from "@/components/projects/IconPicker";

interface ProjectCardProps {
    tag: string;
    pendingCount: number;
    totalCount: number;
    iconName?: string;
    isFirst?: boolean;
}

export function ProjectCard({ tag, pendingCount, totalCount, iconName, isFirst = false }: ProjectCardProps) {
    const ProjectIcon = getIconComponent(iconName || "Folder");
    const router = useRouter();
    const searchParams = useSearchParams();
    const { activeWorkspaceId } = useWorkspace();
    const [isMounted, setIsMounted] = useState(false);

    // Evitar erro de hidratação renderizando DropdownMenu apenas após montagem
    useEffect(() => {
        setIsMounted(true);
    }, []);

    const isTutorial = searchParams.get('tutorial') === 'true';
    const highlightTargetTag = searchParams.get('highlight_project');

    // Check if THIS card is the one to highlight
    const isHighlighted = isMounted && isTutorial && (
        highlightTargetTag
            ? highlightTargetTag === tag
            : isFirst // Fallback to first if no tag specified
    );

    // Calculate progress
    const progress = totalCount > 0 ? ((totalCount - pendingCount) / totalCount) * 100 : 0;
    const completedCount = totalCount - pendingCount;

    const handleCardClick = () => {
        // Navegar para a página de tarefas com a tag do projeto
        // Usar apenas /tasks pois o WorkspaceUrlSync já gerencia o workspace na URL
        router.push(`/tasks?tag=${encodeURIComponent(tag)}`);
    };

    // Mock Data Generator (Deterministic based on tag length)
    const seed = tag.length;
    const commentsCount = (seed * 3) % 12;

    return (
        <div
            onClick={handleCardClick}
            className={cn(
                "group bg-white rounded-xl p-5 border border-gray-200 shadow-sm hover:shadow-md hover:border-green-200 transition-all duration-300 cursor-pointer relative flex flex-col h-full",
                // Highlight Styles
                isHighlighted && "ring-4 ring-green-400 ring-offset-2"
            )}
        >
            {/* Header: Project Name & Menu */}
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-[#050815] flex items-center justify-center">
                        <ProjectIcon className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate">{tag}</h3>
                        <p className="text-xs text-gray-500">Projeto</p>
                    </div>
                </div>
            </div>

            {/* Stats: Progress Bar */}
            <div className="mb-4">
                <div className="flex items-center justify-between text-xs mb-2">
                    <span className="text-gray-600">Progresso</span>
                    <span className="font-medium text-gray-900">{Math.round(progress)}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                        className="bg-gradient-to-r from-green-400 to-green-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>

            {/* Footer: Counts */}
            <div className="mt-auto pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5 text-gray-600">
                            <CheckSquare className="w-4 h-4" />
                            <span>{completedCount}/{totalCount}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-gray-600">
                            <MessageSquare className="w-4 h-4" />
                            <span>{commentsCount}</span>
                        </div>
                    </div>
                    <div className="text-xs font-medium text-gray-500">
                        {pendingCount} pendente{pendingCount !== 1 ? 's' : ''}
                    </div>
                </div>
            </div>
        </div>
    );
}

