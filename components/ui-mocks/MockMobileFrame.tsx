import { Battery, Wifi } from "lucide-react";
import React from "react";
import { cn } from "@/lib/utils";

interface MockMobileFrameProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
}

export function MockMobileFrame({ children, className, ...props }: MockMobileFrameProps) {
    return (
        <div
            className={cn(
                "relative mx-auto bg-slate-900 rounded-[2.5rem] border-[8px] border-slate-900 h-full overflow-hidden shadow-2xl ring-1 ring-slate-900/50",
                "aspect-[9/19] max-w-[300px] w-full",
                className
            )}
            {...props}
        >
            {/* Screen Content Wrapper */}
            <div className="w-full h-full bg-white overflow-hidden relative rounded-[2rem] flex flex-col">

                {/* Status Bar */}
                <div className="h-7 w-full bg-transparent absolute top-0 z-50 flex items-center justify-between px-6 text-[10px] font-semibold text-slate-800 pointer-events-none select-none mix-blend-difference filter invert">
                    <span>9:41</span>
                    <div className="flex items-center gap-1.5">
                        <Wifi className="w-3 h-3" />
                        <Battery className="w-4 h-4" />
                    </div>
                </div>

                {/* Notch Area (Visual Only) */}
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-[35%] h-[24px] bg-slate-900 rounded-b-xl z-50 flex justify-center items-start pt-1">
                    <div className="w-12 h-1 rounded-full bg-slate-800"></div>
                </div>

                {/* Main Content */}
                <div className="flex-1 flex flex-col relative">
                    {children}
                </div>

                {/* Home Indicator */}
                <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-[35%] h-1 bg-slate-900/20 rounded-full z-50"></div>
            </div>
        </div>
    );
}
