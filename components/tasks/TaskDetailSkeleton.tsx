"use client";

import { memo } from "react";

function TaskDetailSkeletonComponent() {
    return (
        <div className="space-y-6 animate-pulse">
            <div className="h-12 bg-gray-200 rounded w-3/4" />
            <div className="grid grid-cols-3 gap-6">
                <div className="space-y-2">
                    <div className="h-3 bg-gray-200 rounded w-16" />
                    <div className="h-8 bg-gray-200 rounded w-24" />
                </div>
                <div className="space-y-2">
                    <div className="h-3 bg-gray-200 rounded w-20" />
                    <div className="h-8 bg-gray-200 rounded w-32" />
                </div>
                <div className="space-y-2">
                    <div className="h-3 bg-gray-200 rounded w-16" />
                    <div className="h-8 bg-gray-200 rounded w-28" />
                </div>
            </div>
            <div className="space-y-2">
                <div className="h-3 bg-gray-200 rounded w-24" />
                <div className="h-32 bg-gray-100 rounded" />
            </div>
            <div className="space-y-2">
                <div className="h-3 bg-gray-200 rounded w-20" />
                <div className="h-32 bg-gray-100 rounded border-2 border-dashed border-gray-200" />
            </div>
            <div className="space-y-2">
                <div className="h-3 bg-gray-200 rounded w-24" />
                <div className="space-y-2">
                    <div className="h-10 bg-gray-100 rounded" />
                    <div className="h-10 bg-gray-100 rounded" />
                </div>
            </div>
        </div>
    );
}

export const TaskDetailSkeleton = memo(TaskDetailSkeletonComponent);
