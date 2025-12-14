import { Mic, Phone, Video, ArrowLeft, MoreVertical, Play, CheckCheck } from "lucide-react";
import React from "react";
import { MockMobileFrame } from "./MockMobileFrame";

export function MockChatInterface({ className }: { className?: string }) {
    return (
        <MockMobileFrame className={className}>
            {/* Header */}
            <div className="bg-[#008069] pt-8 pb-3 px-4 flex items-center justify-between shadow-sm z-10 shrink-0">
                <div className="flex items-center gap-2">
                    <ArrowLeft className="w-5 h-5 text-white" />
                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-[#008069] font-bold text-xs ring-2 ring-white/20">
                        SA
                    </div>
                    <div className="flex flex-col ml-1">
                        <span className="text-white font-semibold text-sm leading-tight">Symples AI</span>
                        <span className="text-white/80 text-[10px]">Business Account</span>
                    </div>
                </div>
                <div className="flex items-center gap-4 text-white">
                    <Video className="w-5 h-5" />
                    <Phone className="w-4 h-4" />
                    <MoreVertical className="w-4 h-4" />
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 bg-[#EFE7DE] relative flex flex-col p-3 gap-4 overflow-y-auto">
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-[0.4] bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-repeat mix-blend-multiply pointer-events-none grayscale"></div>

                {/* User Audio Message */}
                <div className="self-end max-w-[85%] z-10 w-full relative">
                    <div className="bg-[#E7FFDB] p-2 rounded-lg shadow-[0_1px_0.5px_rgba(0,0,0,0.13)] rounded-tr-none flex items-center gap-3 min-w-[200px]">
                        <div className="w-9 h-9 rounded-full bg-[#00A884] flex items-center justify-center pl-1 shrink-0 cursor-pointer hover:bg-[#008f6f] transition-colors">
                            <Play className="w-4 h-4 fill-white text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="h-6 flex items-center gap-[2px] opacity-70">
                                {/* Waveform Visualization */}
                                {[3, 8, 5, 12, 18, 10, 6, 8, 14, 10, 4, 8, 12, 16, 8, 4, 2].map((h, i) => (
                                    <div key={i} className="w-[3px] bg-[#54656f] rounded-full" style={{ height: `${h + 6}px` }}></div>
                                ))}
                            </div>
                            <div className="flex justify-between items-center text-[10px] text-[rgba(17,27,33,0.5)] mt-1 font-medium">
                                <span>0:09</span>
                                <div className="flex items-center gap-1">
                                    <span>14:32</span>
                                    <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb]" />
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="text-[10px] text-slate-500 text-right mt-1 px-1">
                        "Paguei R$ 1.200 pro designer e aprovei os criativos."
                    </div>
                </div>

                {/* System Response */}
                <div className="self-start max-w-[85%] z-10 relative">
                    <div className="bg-white p-3 rounded-lg shadow-[0_1px_0.5px_rgba(0,0,0,0.13)] rounded-tl-none">
                        <p className="text-sm text-[#111b21] leading-snug">
                            ✅ Saque de <span className="font-bold">R$ 1.200</span> registrado em 'Freelancers'.
                        </p>
                        <div className="my-2 p-2 bg-slate-50 rounded border border-slate-100 flex items-center gap-2">
                            <div className="w-1 h-8 bg-emerald-500 rounded-full"></div>
                            <div className="flex flex-col">
                                <span className="text-[10px] uppercase text-emerald-600 font-bold tracking-wide">Kanban Atualizado</span>
                                <span className="text-xs text-slate-700">Tarefa "Criativos" &rarr; <span className="font-semibold">Concluído</span></span>
                            </div>
                        </div>
                        <div className="flex justify-end text-[10px] text-[rgba(17,27,33,0.5)] font-medium mt-1">
                            14:32
                        </div>
                    </div>
                </div>
            </div>

            {/* Input Bar */}
            <div className="bg-[#F0F2F5] px-2 py-2 flex items-center gap-2 z-20 shrink-0 pb-5">
                <div className="bg-white flex-1 h-10 rounded-full px-4 flex items-center text-slate-400 text-sm shadow-sm border border-slate-100">
                    Mensagem
                </div>
                <div className="w-10 h-10 rounded-full bg-[#00A884] flex items-center justify-center text-white shadow-sm hover:scale-105 transition-transform cursor-pointer">
                    <Mic className="w-5 h-5" />
                </div>
            </div>

        </MockMobileFrame>
    );
}
