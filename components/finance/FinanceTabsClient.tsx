"use client";

import { useCallback, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NewTransactionButton, MonthSelector } from "@/components/finance/FinanceClientComponents";

type FinanceTab = "overview" | "recurring" | "planning";

interface FinanceTabsClientProps {
  overview: ReactNode;
  recurring: ReactNode;
  planning: ReactNode;
}

export function FinanceTabsClient({ overview, recurring, planning }: FinanceTabsClientProps) {
  const [activeTab, setActiveTab] = useState<FinanceTab>("overview");
  const shouldReduceMotion = useReducedMotion();

  const handleTabChange = useCallback((value: string) => {
    setActiveTab(value as FinanceTab);
  }, []);

  const content = activeTab === "overview" ? overview : activeTab === "recurring" ? recurring : planning;

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
      {/* Barra Superior: Modo de Visualização */}
      <div className="border-b border-gray-200 bg-white px-6">
        <div className="max-w-[1600px] mx-auto py-3">
          <TabsList variant="default">
            <TabsTrigger value="overview" variant="default">
              Visão Geral
            </TabsTrigger>
            <TabsTrigger value="recurring" variant="default">
              Recorrentes (Fixos)
            </TabsTrigger>
            <TabsTrigger value="planning" variant="default">
              Planejamento
            </TabsTrigger>
          </TabsList>
        </div>
      </div>

      {/* Barra Inferior: Filtros e Ações */}
      <div className="border-b border-gray-200 bg-white px-6">
        <div className="max-w-[1600px] mx-auto py-3">
          <div className="flex flex-1 items-center justify-between gap-2 flex-wrap">
            {/* Lado Esquerdo: Botão Novo */}
            <div className="flex items-center gap-4">
              <NewTransactionButton />
            </div>

            {/* Lado Direito: Filtros */}
            <div className="flex items-center gap-2 flex-wrap">
              <MonthSelector />
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo Principal */}
      <div className="w-full bg-white px-6">
        <div className="max-w-[1600px] mx-auto">
          <div className="relative h-full w-full py-3">
            <AnimatePresence mode="sync" initial={false}>
              <motion.div
                key={activeTab}
                initial={shouldReduceMotion ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: shouldReduceMotion ? 1 : 0 }}
                transition={shouldReduceMotion ? undefined : { duration: 0.15 }}
                className="h-full"
              >
                {content}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </Tabs>
  );
}
