"use client";

import { MoreHorizontal, MessageSquare, CheckSquare } from "lucide-react";
import { cn } from "@/lib/utils";

interface WorkspaceCardProps {
    name: string;
    pendingCount: number;
    totalCount: number;
}

export function WorkspaceCard({ name, pendingCount, totalCount }: WorkspaceCardProps) {
    // Calculate progress
    const progress = totalCount > 0 ? ((totalCount - pendingCount) / totalCount) * 100 : 0;

    // Mock Data Generator (Deterministic based on name length)
    const seed = name.length;
    const commentsCount = (seed * 3) % 12;
    
    // Workspace Image (Mock based on seed)
    // Using Unsplash source for consistent, nice-looking workspace/office/tech images
    const workspaceImages = [
        "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=150&h=150&q=80", // Office
        "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&w=150&h=150&q=80", // Meeting
        "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=150&h=150&q=80", // Tech
        "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=150&h=150&q=80"  // Creative
    ];
    const workspaceImage = workspaceImages[seed % workspaceImages.length];

    return (
        <div className="group bg-white rounded-xl p-5 border border-gray-200 shadow-sm hover:shadow-md hover:border-green-200 transition-all duration-200 cursor-pointer relative flex flex-col h-full">
            {/* 2. Header (Topo) */}
            <div className="flex justify-between items-start mb-4">
                {/* Workspace Image */}
                <div className="h-12 w-12 rounded-lg overflow-hidden border border-gray-100 shadow-sm">
                    <img 
                        src={workspaceImage} 
                        alt={name}
                        className="h-full w-full object-cover"
                    />
                </div>
                
                <button className="text-gray-300 hover:text-gray-600 transition-colors p-1 rounded-md hover:bg-gray-50">
                    <MoreHorizontal size={16} />
                </button>
            </div>

            {/* 3. Corpo (Info Principal) */}
            <div className="mb-auto">
                <h3 className="font-bold text-gray-900 text-base leading-tight group-hover:text-green-700 transition-colors">
                    {name}
                </h3>
            </div>

            {/* 4. Indicador de Progresso */}
            <div className="mt-6">
                <div className="flex justify-between items-end mb-2">
                    <span className="text-[11px] text-gray-400 font-medium uppercase tracking-wider">Progresso do Time</span>
                    <span className="text-xs font-bold text-gray-700">{Math.round(progress)}%</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden w-full">
                    <div
                        className="h-full bg-green-500 rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>

            {/* 5. Rodapé (Meta & Social) */}
            <div className="flex justify-between items-center mt-5 pt-4 border-t border-gray-50">
                {/* Avatar Group */}
                <div className="flex -space-x-2 overflow-hidden pl-1">
                    {[1, 2, 3].map((i) => (
                        <div 
                            key={i} 
                            className="relative inline-block h-6 w-6 rounded-full ring-2 ring-white bg-gray-100"
                        >
                            <img
                                className="h-full w-full rounded-full object-cover"
                                src={`https://i.pravatar.cc/150?img=${(seed + i * 5) % 70}`}
                                alt="Member"
                            />
                        </div>
                    ))}
                </div>

                {/* Metrics */}
                <div className="flex items-center gap-3.5">
                    <div className="flex items-center gap-1.5 text-gray-400 hover:text-gray-600 transition-colors" title="Tarefas pendentes">
                        <CheckSquare size={14} strokeWidth={2.5} />
                        <span className="text-xs font-semibold">{pendingCount}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-gray-400 hover:text-gray-600 transition-colors" title="Comentários">
                        <MessageSquare size={14} strokeWidth={2.5} />
                        <span className="text-xs font-semibold">{commentsCount}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
