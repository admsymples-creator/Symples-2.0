import React from "react";
import { HeroSection } from "@/components/landing-page/HeroSection";
import { FeatureTabs } from "@/components/landing-page/FeatureTabs";
import { BentoGrid } from "@/components/landing-page/BentoGrid";
import { PricingFAQ } from "@/components/landing-page/PricingFAQ";
import { MockComparison } from "@/components/ui-mocks/MockComparison";

export default function LandingPage() {
    return (
        <main className="min-h-screen bg-white font-sans selection:bg-emerald-100 selection:text-emerald-900 overflow-x-hidden">
            <HeroSection />

            <FeatureTabs />

            <BentoGrid />

            {/* Comparison Section */}
            <section className="py-24 bg-slate-50/50">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center max-w-3xl mx-auto mb-12">
                        <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl mb-4">
                            Pare de trabalhar para a ferramenta.
                        </h2>
                        <p className="text-lg text-slate-600">
                            Softwares de gestão tradicionais exigem que você seja um bibliotecário. O Symples exige apenas que você fale.
                        </p>
                    </div>

                    <div className="flex justify-center mb-6">
                        <MockComparison />
                    </div>

                    <div className="text-center">
                        <p className="text-xs text-slate-400 italic mb-6">* Comparativo baseado no tempo médio de input de tarefas.</p>
                        <a href="#pricing" className="text-emerald-600 font-semibold hover:text-emerald-700 hover:underline underline-offset-4 transition-all">
                            Ver a diferença na prática →
                        </a>
                    </div>
                </div>
            </section>

            <PricingFAQ />

            {/* Footer */}
            <footer className="bg-slate-900 border-t border-slate-800 py-16">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center">
                    <div className="flex items-center gap-2 mb-8">
                        <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold text-sm">
                            S
                        </div>
                        <span className="text-white font-semibold text-lg">Symples</span>
                    </div>

                    <div className="flex gap-8 mb-8 text-sm font-medium text-slate-400">
                        <a href="#" className="hover:text-white transition-colors">Sobre</a>
                        <a href="#" className="hover:text-white transition-colors">Blog</a>
                        <a href="#" className="hover:text-white transition-colors">Carreiras</a>
                        <a href="#" className="hover:text-white transition-colors">Contato</a>
                    </div>

                    <div className="text-sm text-slate-600">
                        Symples Tecnologia 2025 ® | Todos os direitos reservados.
                    </div>
                </div>
            </footer>
        </main>
    );
}
