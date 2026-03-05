import { CheckCircle2, XCircle, MousePointer, Mic, User, Sparkles, Clock, Zap, FileSpreadsheet, Wallet } from "lucide-react";
import React from "react";
import { cn } from "@/lib/utils";

const comparisonData = [
    {
        category: "Input de Dados",
        traditional: { label: "Formulários e botões manuais", icon: MousePointer },
        symples: { label: "Áudio e texto no WhatsApp", icon: Mic },
    },
    {
        category: "Organização",
        traditional: { label: "Você categoriza tudo sozinho", icon: User },
        symples: { label: "IA categoriza e etiqueta automaticamente", icon: Sparkles },
    },
    {
        category: "Curva de Aprendizado",
        traditional: { label: "Semanas de treinamento", icon: Clock },
        symples: { label: "Zero. É só mandar mensagem", icon: Zap },
    },
    {
        category: "Financeiro",
        traditional: { label: "Software separado ou planilha", icon: FileSpreadsheet },
        symples: { label: "Integrado na conversa", icon: Wallet },
    },
];

export function MockComparison() {
    return (
        <div className="w-full max-w-4xl mx-auto p-6 bg-white/60 backdrop-blur-xl border border-white/50 rounded-3xl shadow-xl shadow-slate-200/40">
            {/* Mobile / Stacked Layout */}
            <div className="grid md:grid-cols-2 gap-8 md:gap-0">

                {/* Traditional Column */}
                <div className="md:pr-8 md:border-r border-slate-200">
                    <div className="mb-6 pb-4 border-b border-slate-100">
                        <h3 className="font-semibold text-slate-500 text-lg">Outras Ferramentas</h3>
                    </div>
                    <div className="space-y-8">
                        {comparisonData.map((item, i) => (
                            <div key={i} className="flex items-start gap-4 opacity-70">
                                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                                    <item.traditional.icon className="w-5 h-5 text-slate-500" />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">{item.category}</p>
                                    <p className="text-sm font-medium text-slate-600 leading-snug">{item.traditional.label}</p>
                                </div>
                                <XCircle className="w-5 h-5 text-slate-300 ml-auto mt-2" />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Symples Column */}
                <div className="md:pl-8 relative">
                    <div className="absolute inset-0 bg-emerald-50/50 -m-6 rounded-3xl -z-10 mix-blend-multiply border border-emerald-100/50 hidden md:block" />

                    <div className="mb-6 pb-4 border-b border-emerald-100/50 flex justify-between items-center">
                        <h3 className="font-bold text-emerald-900 text-lg">Symples</h3>
                        <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide">
                            Recomendado
                        </span>
                    </div>

                    <div className="space-y-8">
                        {comparisonData.map((item, i) => (
                            <div key={i} className="flex items-start gap-4">
                                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 shadow-sm shadow-emerald-100">
                                    <item.symples.icon className="w-5 h-5 text-emerald-600" />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-emerald-600/60 uppercase tracking-wide mb-1">{item.category}</p>
                                    <p className="text-sm font-bold text-emerald-950 leading-snug">{item.symples.label}</p>
                                </div>
                                <CheckCircle2 className="w-5 h-5 text-emerald-500 ml-auto mt-2" />
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </div>
    );
}
