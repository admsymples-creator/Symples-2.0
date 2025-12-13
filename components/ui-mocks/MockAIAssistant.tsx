import { Zap, Menu, Send, ArrowUp } from "lucide-react";
import React from "react";
import { MockMobileFrame } from "./MockMobileFrame";

export function MockAIAssistant({ className }: { className?: string }) {
    return (
        <MockMobileFrame className={className}>
            <div className="flex flex-col h-full bg-white font-sans">

                {/* Minimal Header */}
                <div className="flex items-center justify-between px-4 py-4 border-b border-slate-50 bg-white/80 backdrop-blur-md sticky top-0 z-20">
                    <Menu className="w-5 h-5 text-slate-400" />
                    <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-900 tracking-tight text-sm">Symples AI</span>
                        <Zap className="w-3.5 h-3.5 text-emerald-500 fill-emerald-500" />
                    </div>
                    <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200" />
                </div>

                {/* Chat Thread */}
                <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6">

                    {/* User Query */}
                    <div className="self-end max-w-[90%]">
                        <div className="bg-slate-100 text-slate-900 text-[13px] px-4 py-3 rounded-2xl rounded-tr-sm font-medium">
                            Como está o fluxo de caixa?
                        </div>
                    </div>

                    {/* AI Response */}
                    <div className="self-start w-full">
                        <div className="flex items-start gap-3">
                            <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center text-white shrink-0 mt-1 shadow-md shadow-emerald-200 ring-2 ring-white">
                                <Zap className="w-3.5 h-3.5 fill-white" />
                            </div>

                            <div className="flex-1 space-y-3">
                                <div className="bg-emerald-50/50 border border-emerald-100/60 rounded-2xl p-4 shadow-sm">
                                    <p className="text-sm font-medium text-slate-700 mb-1">Positivo, Júlio.</p>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-2xl font-bold text-slate-900 tracking-tight">R$ 15.000</span>
                                        <span className="text-sm text-slate-500 font-medium">hoje</span>
                                    </div>

                                    <div className="mt-4 flex items-end justify-between gap-2 h-16 w-full">
                                        {/* Mon */}
                                        <div className="flex flex-col items-center gap-1 flex-1 group">
                                            <div className="w-full bg-emerald-200/50 rounded-t-sm h-[40%] group-hover:bg-emerald-300 transition-colors"></div>
                                            <span className="text-[9px] font-bold text-slate-400 uppercase">Seg</span>
                                        </div>
                                        {/* Tue */}
                                        <div className="flex flex-col items-center gap-1 flex-1 group">
                                            <div className="w-full bg-emerald-200/50 rounded-t-sm h-[60%] group-hover:bg-emerald-300 transition-colors"></div>
                                            <span className="text-[9px] font-bold text-slate-400 uppercase">Ter</span>
                                        </div>
                                        {/* Wed (Today) */}
                                        <div className="flex flex-col items-center gap-1 flex-1 group">
                                            <div className="w-full bg-emerald-500 rounded-t-sm h-[85%] shadow-lg shadow-emerald-200 relative">
                                                <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[9px] px-1.5 py-0.5 rounded font-bold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                                    15k
                                                </div>
                                            </div>
                                            <span className="text-[9px] font-bold text-emerald-600 uppercase">Qua</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Floating Input */}
                <div className="px-4 pb-6 pt-2 bg-gradient-to-t from-white via-white to-transparent">
                    <div className="relative shadow-lg shadow-slate-200/50 rounded-full">
                        <input
                            type="text"
                            placeholder="Pergunte..."
                            className="w-full h-11 pl-5 pr-12 rounded-full bg-white border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none font-medium placeholder:text-slate-400"
                            readOnly
                        />
                        <button className="absolute right-1.5 top-1.5 w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center text-white hover:bg-emerald-600 transition-colors shadow-md shadow-emerald-200">
                            <Send className="w-3.5 h-3.5 ml-0.5 fill-white" />
                        </button>
                    </div>
                </div>

            </div>
        </MockMobileFrame>
    );
}
