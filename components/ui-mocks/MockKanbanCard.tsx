import { Calendar, Clock, MoreHorizontal } from "lucide-react";
import React from "react";
import { cn } from "@/lib/utils";

export function MockKanbanCard({ className }: { className?: string }) {
    return (
        <div
            className={cn(
                "flex flex-col bg-white p-3.5 rounded-[16px] shadow-[0_2px_12px_-4px_rgba(0,0,0,0.08)] border border-slate-100 w-full max-w-[280px] hover:shadow-md transition-all active:scale-[0.98]",
                "relative overflow-hidden group",
                className
            )}
        >
            {/* Priority Indicator Stripe */}
            <div className="absolute top-0 left-0 bottom-0 w-[4px] bg-emerald-500"></div>

            {/* Header */}
            <div className="flex justify-between items-start mb-2 pl-2">
                <div className="flex gap-1.5">
                    <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md text-[9px] font-bold tracking-wide uppercase border border-slate-200/50">
                        Marketing
                    </span>
                    <span className="bg-red-50 text-red-600 px-2 py-0.5 rounded-md text-[9px] font-bold tracking-wide uppercase border border-red-100/50 flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        Urgente
                    </span>
                </div>
                <MoreHorizontal className="w-4 h-4 text-slate-300 cursor-pointer hover:text-slate-500 transition-colors" />
            </div>

            <h3 className="font-semibold text-slate-800 text-[13px] leading-snug mb-3 pl-2 pr-1">
                Lançamento Black Friday
            </h3>

            {/* Footer */}
            <div className="flex items-center justify-between mt-auto pt-2.5 border-t border-slate-50 pl-2">
                <div className="flex items-center text-slate-400 gap-1.5">
                    <Calendar className="w-3 h-3" />
                    <span className="text-[10px] font-semibold tracking-tight">15 Nov</span>
                </div>

                <div className="flex -space-x-2 pl-2">
                    <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center ring-2 ring-white z-20 shadow-sm overflow-hidden">
                        <div className="w-full h-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-[9px] font-bold">
                            J
                        </div>
                    </div>
                    <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center ring-2 ring-white z-10 shadow-sm overflow-hidden">
                        <div className="w-full h-full bg-emerald-100 flex items-center justify-center text-emerald-700 text-[9px] font-bold">
                            A
                        </div>
                    </div>
                    <div className="w-6 h-6 rounded-full bg-slate-50 flex items-center justify-center ring-2 ring-white z-0 text-[9px] font-bold text-slate-400 border border-slate-100">
                        +2
                    </div>
                </div>
            </div>
        </div>
    );
}
