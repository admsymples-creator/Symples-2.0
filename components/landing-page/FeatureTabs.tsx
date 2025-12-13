"use client";

import { AnimatePresence, motion } from "framer-motion";
import { MessageSquare, Layout, Sparkles } from "lucide-react";
import React, { useState } from "react";
import { MockChatInterface } from "@/components/ui-mocks/MockChatInterface";
import { MockKanbanCard } from "@/components/ui-mocks/MockKanbanCard";
import { MockAIAssistant } from "@/components/ui-mocks/MockAIAssistant";
import { cn } from "@/lib/utils";

const tabs = [
    {
        id: "input",
        label: "Input",
        icon: MessageSquare,
        title: "Você envia áudios ou prints",
        description: "Sem formulários chatos. Use o WhatsApp como interface principal de entrada de dados.",
        color: "emerald"
    },
    {
        id: "processing",
        label: "Processamento",
        icon: Sparkles,
        title: "A IA categoriza e estrutura",
        description: "O Symples entende o contexto, define prioridades e distribui para o setor correto.",
        color: "indigo"
    },
    {
        id: "management",
        label: "Gestão",
        icon: Layout,
        title: "Sua operação roda sozinha",
        description: "Tarefas organizadas em cards, prazos definidos e notificações automáticas.",
        color: "blue"
    }
];

export function FeatureTabs() {
    const [activeTab, setActiveTab] = useState("input");

    return (
        <section className="py-24 bg-white">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">

                <div className="text-center max-w-3xl mx-auto mb-16">
                    <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl mb-4">
                        Do caos à ordem. Automaticamente.
                    </h2>
                    <p className="text-lg text-slate-600">
                        Três passos simples para recuperar o controle do seu tempo.
                    </p>
                </div>

                <div className="flex flex-col lg:flex-row gap-12 lg:gap-24 items-center">

                    {/* Tabs Navigation (Left) */}
                    <div className="w-full lg:w-1/3 flex flex-col gap-4">
                        {tabs.map((tab) => {
                            const isActive = activeTab === tab.id;
                            const Icon = tab.icon;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={cn(
                                        "group flex flex-col items-start text-left p-6 rounded-2xl transition-all duration-300 border",
                                        isActive
                                            ? "bg-slate-50 border-slate-200 shadow-md shadow-slate-200/20"
                                            : "bg-white border-transparent hover:bg-slate-50"
                                    )}
                                >
                                    <div className={cn(
                                        "flex items-center gap-3 mb-2 font-semibold",
                                        isActive ? "text-slate-900" : "text-slate-500 group-hover:text-slate-700"
                                    )}>
                                        <div className={cn(
                                            "p-2 rounded-lg transition-colors",
                                            isActive ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-500 group-hover:bg-slate-200"
                                        )}>
                                            <Icon className="w-5 h-5" />
                                        </div>
                                        {tab.label}
                                    </div>
                                    <p className={cn(
                                        "text-lg font-medium transition-colors mt-2 mb-1",
                                        isActive ? "text-slate-900" : "text-slate-400 group-hover:text-slate-600"
                                    )}>
                                        {tab.title}
                                    </p>
                                    {isActive && (
                                        <motion.p
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: "auto" }}
                                            className="text-sm text-slate-600 leading-relaxed"
                                        >
                                            {tab.description}
                                        </motion.p>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* Visual Display (Right) */}
                    <div className="w-full lg:w-2/3 h-[550px] relative bg-slate-900 rounded-[2.5rem] p-8 lg:p-12 overflow-hidden flex items-center justify-center shadow-2xl shadow-slate-900/20">

                        {/* Background Effects */}
                        <div className="absolute inset-0 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:24px_24px] opacity-20" />
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none" />

                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeTab}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 1.05 }}
                                transition={{ duration: 0.4 }}
                                className="relative z-10"
                            >
                                {activeTab === "input" && (
                                    <MockChatInterface className="shadow-2xl ring-4 ring-slate-800" />
                                )}

                                {activeTab === "processing" && (
                                    <MockAIAssistant className="shadow-2xl ring-4 ring-slate-800" />
                                )}

                                {activeTab === "management" && (
                                    <div className="flex flex-col gap-6 scale-110">
                                        <MockKanbanCard className="" />
                                        <MockKanbanCard className="opacity-60 blur-[1px]" />
                                    </div>
                                )}
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </section>
    );
}
