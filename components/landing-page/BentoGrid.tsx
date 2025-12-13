import React from "react";
import { MockAIAssistant } from "@/components/ui-mocks/MockAIAssistant";
import { Zap, Wallet, Users } from "lucide-react";

export function BentoGrid() {
    return (
        <section className="py-24 bg-slate-50">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">

                <div className="text-center mb-16">
                    <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl mb-4">
                        O Sistema Operacional
                    </h2>
                    <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                        Recursos poderosos escondidos atrás de uma interface simples.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">

                    {/* Card 1: Seu Segundo Cérebro (Large) */}
                    <div className="lg:col-span-2 bg-white rounded-3xl p-8 border border-slate-200 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                        <div className="flex flex-col h-full relative z-10">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                                    <Zap className="w-5 h-5" />
                                </div>
                                <h3 className="text-xl font-bold text-slate-900">Seu Segundo Cérebro</h3>
                            </div>
                            <p className="text-slate-600 max-w-md mb-8">
                                Esqueça onde salvou aquele arquivo ou qual o prazo do projeto. Pergunte ao Symples e tenha respostas contextuais instantâneas.
                            </p>

                            <div className="mt-auto flex justify-center lg:justify-start">
                                <MockAIAssistant className="max-w-[280px] w-full shadow-2xl -mb-32 lg:-mb-16 mx-auto lg:mx-0 lg:ml-8 border-t-8 border-slate-100 rounded-t-[2.5rem]" />
                            </div>
                        </div>
                        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-[80px]" />
                    </div>

                    {/* Right Column Stack */}
                    <div className="flex flex-col gap-8">

                        {/* Card 2: Financeiro Invisível */}
                        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm flex-1 relative overflow-hidden group hover:shadow-md transition-all">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                                    <Wallet className="w-5 h-5" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-900">Financeiro Invisível</h3>
                            </div>
                            <p className="text-slate-600 text-sm mb-6">
                                Transações extraídas automaticamente das suas conversas e comprovantes.
                            </p>
                            {/* Micro Visual */}
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="font-medium text-slate-700">AWS Services</span>
                                    <span className="text-red-500 font-semibold">- R$ 450,00</span>
                                </div>
                                <div className="h-px bg-slate-200" />
                                <div className="flex justify-between items-center text-sm">
                                    <span className="font-medium text-slate-700">Entrada Cliente X</span>
                                    <span className="text-emerald-500 font-semibold">+ R$ 2.500,00</span>
                                </div>
                            </div>
                        </div>

                        {/* Card 3: Multi-Agência */}
                        <div className="bg-slate-900 rounded-3xl p-8 border border-slate-800 shadow-sm flex-1 relative overflow-hidden group">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-white border border-slate-700">
                                    <Users className="w-5 h-5" />
                                </div>
                                <h3 className="text-lg font-bold text-white">Multi-Agência</h3>
                            </div>
                            <p className="text-slate-400 text-sm mb-6">
                                Gerencie múltiplos clientes ou empresas sem sair do mesmo número de WhatsApp.
                            </p>
                            <div className="flex items-center gap-2 bg-slate-800 p-2 rounded-lg border border-slate-700 self-start">
                                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                                <span className="text-xs text-white font-mono">Cliente A</span>
                                <div className="w-px h-3 bg-slate-600 mx-1" />
                                <div className="w-3 h-3 rounded-full bg-slate-600" />
                                <span className="text-xs text-slate-500 font-mono">Cliente B</span>
                            </div>
                        </div>

                    </div>

                </div>
            </div>
        </section>
    );
}
