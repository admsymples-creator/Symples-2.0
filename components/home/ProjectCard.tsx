"use client";

import { useState, useEffect } from "react";
import { MoreHorizontal, MessageSquare, CheckSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useWorkspace } from "@/components/providers/SidebarProvider";
import { useWorkspaces } from "@/components/providers/WorkspacesProvider";
import { getIconComponent } from "@/components/projects/IconPicker";

interface ProjectCardProps {
    tag: string;
    pendingCount: number;
    totalCount: number;
    overallPendingCount?: number;
    overallTotalCount?: number;
    iconName?: string;
    isFirst?: boolean;
}

export function ProjectCard({ tag, pendingCount, totalCount, overallPendingCount, overallTotalCount, iconName, isFirst = false }: ProjectCardProps) {
    const ProjectIcon = getIconComponent(iconName || "Folder");
    const router = useRouter();
    const searchParams = useSearchParams();
    const { activeWorkspaceId, setActiveWorkspaceId } = useWorkspace();
    const workspaces = useWorkspaces();
    const pathname = usePathname();
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
    const weeklyProgress = totalCount > 0 ? ((totalCount - pendingCount) / totalCount) * 100 : 0;
    const completedCount = totalCount - pendingCount;
    const overallTotal = overallTotalCount ?? totalCount;
    const overallPending = overallPendingCount ?? pendingCount;
    const overallProgress = overallTotal > 0 ? ((overallTotal - overallPending) / overallTotal) * 100 : 0;

    const handleCardClick = () => {
        // Navegar para as tarefas do workspace atual (evita cair no pessoal)
        const segments = pathname.split("/").filter(Boolean);
        const workspaceSegment = segments.length > 0 && segments[0] !== "home" ? segments[0] : null;
        const workspaceFromSlug = workspaceSegment
            ? workspaces.find((ws) => ws.slug === workspaceSegment || ws.id === workspaceSegment) || null
            : null;

        const workspaceId = workspaceFromSlug?.id || activeWorkspaceId || null;
        if (workspaceId) {
            setActiveWorkspaceId(workspaceId);
        }

        const baseSegment = workspaceSegment || workspaceFromSlug?.slug || workspaceFromSlug?.id || activeWorkspaceId || "";
        const base = baseSegment ? `/${baseSegment}` : "";
        router.push(`${base}/tasks?tag=${encodeURIComponent(tag)}`);
    };

    // Mock Data Generator (Deterministic based on tag length)
    const seed = tag.length;
    const commentsCount = (seed * 3) % 12;

    return (
        <div
            onClick={handleCardClick}
            className={cn(
                "group bg-white rounded-xl p-5 border-none shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer relative flex flex-col h-full",
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
                    <span className="text-gray-600">Progresso da Semana</span>
                    <span className="font-medium text-gray-900">{Math.round(weeklyProgress)}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                        className="bg-gradient-to-r from-green-400 to-green-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${weeklyProgress}%` }}
                    />
                </div>
                <div className="mt-3">
                    <div className="flex items-center justify-between text-[11px] mb-1.5">
                        <span className="text-gray-500">Progresso total</span>
                        <span className="font-medium text-gray-800">{Math.round(overallProgress)}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                        <div
                            className="bg-green-300 h-1.5 rounded-full transition-all duration-300"
                            style={{ width: `${overallProgress}%` }}
                        />
                    </div>
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

