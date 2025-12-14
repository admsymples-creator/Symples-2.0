import { Check } from "lucide-react";
import React from "react";

const pricingPlans = [
    {
        name: "Starter",
        price: "Grátis",
        period: "/sempre",
        description: "Para quem está começando a organizar a casa.",
        features: ["Até 1 usuário", "Gestão de Tarefas Básica", "IA Limitada (10 msg/dia)"],
        cta: "Começar Agora",
        highlight: false
    },
    {
        name: "Pro",
        price: "R$ 97",
        period: "/mês",
        description: "Para quem quer sair do operacional.",
        features: ["IA Ilimitada", "Conexão WhatsApp Oficial", "Dashboard Financeiro", "Automação de Tarefas", "Suporte Prioritário"],
        cta: "Assinar Pro",
        highlight: true
    },
    {
        name: "Enterprise",
        price: "Sob Consulta",
        period: "",
        description: "Para operações complexas e times grandes.",
        features: ["Múltiplos WhatsApps", "API Dedicada", "Onboarding Assistido", "SLA Garantido"],
        cta: "Falar com Vendas",
        highlight: false
    }
];

export function PricingFAQ() {
    return (
        <section className="py-24 bg-white" id="pricing">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">

                <div className="text-center max-w-3xl mx-auto mb-16">
                    <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl mb-4">
                        Preço simples. Retorno imediato.
                    </h2>
                    <p className="text-lg text-slate-600">
                        Quanto vale recuperar 10 horas da sua semana?
                    </p>
                </div>

                <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                    {pricingPlans.map((plan) => (
                        <div
                            key={plan.name}
                            className={`relative bg-white rounded-3xl p-8 flex flex-col border ${plan.highlight
                                    ? "border-emerald-500 shadow-2xl shadow-emerald-900/10 scale-105 z-10"
                                    : "border-slate-100 shadow-sm hover:shadow-md transition-shadow"
                                }`}
                        >
                            {plan.highlight && (
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-emerald-500 text-white px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wide shadow-lg shadow-emerald-500/30">
                                    Mais Popular
                                </div>
                            )}

                            <div className="mb-6">
                                <h3 className="text-lg font-bold text-slate-900">{plan.name}</h3>
                                <div className="mt-4 flex items-baseline gap-1">
                                    <span className="text-4xl font-extrabold text-slate-900 tracking-tight">{plan.price}</span>
                                    <span className="text-slate-500 text-sm font-medium">{plan.period}</span>
                                </div>
                                <p className="mt-4 text-sm text-slate-600 font-medium">{plan.description}</p>
                            </div>

                            <div className="h-px bg-slate-100 mb-6" />

                            <ul className="mb-8 space-y-4 flex-1">
                                {plan.features.map((feature) => (
                                    <li key={feature} className="flex items-start gap-3 text-sm text-slate-600">
                                        <div className={`p-0.5 rounded-full ${plan.highlight ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                                            <Check className="w-3.5 h-3.5 shrink-0" />
                                        </div>
                                        <span>{feature}</span>
                                    </li>
                                ))}
                            </ul>

                            <button
                                className={`w-full py-4 px-6 rounded-xl text-sm font-bold transition-all ${plan.highlight
                                        ? "bg-slate-900 text-white hover:bg-slate-800 shadow-lg shadow-slate-900/20 hover:scale-[1.02]"
                                        : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                    }`}
                            >
                                {plan.cta}
                            </button>
                        </div>
                    ))}
                </div>

            </div>
        </section>
    );
}
