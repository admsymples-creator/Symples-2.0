"use client";

import { motion } from "framer-motion";
import React from "react";
import { MockChatInterface } from "@/components/ui-mocks/MockChatInterface";
import { MockKanbanCard } from "@/components/ui-mocks/MockKanbanCard";
import { MockAIAssistant } from "@/components/ui-mocks/MockAIAssistant";
import { Play } from "lucide-react";

export function HeroSection() {
    return (
        <section className="relative overflow-hidden bg-white pt-20 pb-32 lg:pt-32 lg:pb-40">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center">

                {/* Copywriting */}
                <div className="max-w-4xl text-center mb-16 z-10 relative">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                    >
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-emerald-200 text-emerald-700 text-xs font-bold uppercase tracking-wider mb-8 shadow-sm hover:shadow-md transition-shadow cursor-default">
                            O Sistema Operacional do Empreendedor Digital
                        </div>

                        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-slate-900 mb-6 leading-[1.1]">
                            Gerir uma empresa tem que ser <span className="text-emerald-500">Symples</span>.
                        </h1>

                        <p className="text-xl text-slate-600 mb-10 leading-relaxed max-w-2xl mx-auto">
                            A única plataforma que une a rapidez do WhatsApp com a organização de um ERP. Fale o que precisa ser feito, a IA faz o resto.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                            <button className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white bg-emerald-600 rounded-full hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 hover:scale-105 active:scale-95">
                                Começar Grátis
                            </button>
                            <button className="inline-flex items-center justify-center px-8 py-4 text-base font-medium text-slate-600 hover:text-slate-900 bg-transparent hover:bg-slate-50 rounded-full transition-colors gap-2">
                                <Play className="w-4 h-4 fill-current" />
                                Ver Demo
                            </button>
                        </div>
                    </motion.div>
                </div>

                {/* Visual Composition */}
                <div className="relative w-full max-w-[1000px] h-[500px] sm:h-[600px] flex items-center justify-center perspective-[2000px]">
                    {/* Background Glow */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-emerald-100/50 via-white to-indigo-100/50 blur-3xl opacity-50 -z-10 rounded-full transform scale-90" />

                    {/* Center: AI Assistant (The Brain) */}
                    <motion.div
                        className="absolute z-20"
                        initial={{ y: 50, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ duration: 0.8, delay: 0.2, type: "spring" }}
                        whileHover={{ y: -10 }}
                    >
                        <MockAIAssistant className="shadow-2xl shadow-emerald-900/10 scale-100 lg:scale-110" />
                    </motion.div>

                    {/* Left: Chat Interface (Input) */}
                    <motion.div
                        className="absolute left-0 lg:left-10 lg:top-20 z-10 hidden sm:block"
                        initial={{ x: -50, opacity: 0, rotate: -5 }}
                        animate={{ x: 0, opacity: 1, rotate: -6 }}
                        transition={{ duration: 0.8, delay: 0.4 }}
                        whileHover={{ rotate: 0, scale: 1.02 }}
                    >
                        <MockChatInterface className="shadow-xl shadow-slate-900/10 scale-90" />
                    </motion.div>

                    {/* Right: Kanban List (Output) */}
                    <motion.div
                        className="absolute right-0 lg:right-10 lg:top-20 z-10 hidden sm:block"
                        initial={{ x: 50, opacity: 0, rotate: 5 }}
                        animate={{ x: 0, opacity: 1, rotate: 6 }}
                        transition={{ duration: 0.8, delay: 0.6 }}
                        whileHover={{ rotate: 0, scale: 1.02 }}
                    >
                        <div className="bg-white/40 backdrop-blur-md p-4 rounded-[2.5rem] border border-white/50 shadow-xl shadow-slate-900/5 max-w-[320px]">
                            <div className="flex flex-col gap-4">
                                <MockKanbanCard className="rotate-2" />
                                <MockKanbanCard className="-rotate-1 translate-x-2" />
                            </div>
                        </div>
                    </motion.div>

                </div>

            </div>
        </section>
    );
}
