"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface WorkspaceSkeletonProps {
    isCollapsed?: boolean;
}

/**
 * WorkspaceSkeleton
 * 
 * Componente estático que simula o layout macro do app durante o loading.
 * Serve como fundo estático para evitar Layout Shift durante a troca de workspace.
 */
export function WorkspaceSkeleton({ isCollapsed = false }: WorkspaceSkeletonProps) {
    return (
        <div className="min-h-screen bg-gray-50">
            {/* Sidebar Skeleton */}
            <div 
                className={cn(
                    "fixed left-0 top-0 h-full bg-white border-r border-gray-200 z-40",
                    isCollapsed ? "w-16" : "w-[260px]"
                )}
            >
                <div className="p-4 space-y-4">
                    {/* Workspace Switcher Skeleton */}
                    <Skeleton className="h-10 w-full" />
                    
                    {/* Navigation Items Skeleton */}
                    <div className="space-y-2">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <Skeleton key={i} className="h-10 w-full" />
                        ))}
                    </div>
                    
                    {/* Projects Section Skeleton */}
                    <div className="mt-8 space-y-2">
                        <Skeleton className="h-4 w-20" />
                        {[1, 2, 3].map((i) => (
                            <Skeleton key={i} className="h-8 w-full" />
                        ))}
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div 
                className={cn(
                    "flex flex-col min-h-screen transition-all duration-300 ease-in-out",
                    isCollapsed ? "pl-[64px]" : "pl-[260px]"
                )}
            >
                {/* Header Skeleton */}
                <div className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
                    <Skeleton className="h-8 w-48" />
                    <div className="flex items-center gap-4">
                        <Skeleton className="h-8 w-8 rounded-full" />
                        <Skeleton className="h-8 w-24" />
                    </div>
                </div>

                {/* Content Area Skeleton */}
                <main className="flex-1 overflow-auto p-6">
                    <div className="space-y-6">
                        {/* Page Title Skeleton */}
                        <Skeleton className="h-8 w-64" />
                        
                        {/* Content Cards Skeleton */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {[1, 2, 3, 4, 5, 6].map((i) => (
                                <div key={i} className="space-y-3">
                                    <Skeleton className="h-48 w-full rounded-lg" />
                                </div>
                            ))}
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}




