"use client";

import { useState, createContext, useContext, ReactNode } from "react";
import { HomeActionBar } from "./HomeActionBar";
import { HomeTasksSection } from "./HomeTasksSection";
import { HomeInboxSection } from "./HomeInboxSection";

type PeriodContextType = {
  period: "week" | "month";
  setPeriod: (period: "week" | "month") => void;
};

const PeriodContext = createContext<PeriodContextType | undefined>(undefined);

export function usePeriod() {
  const context = useContext(PeriodContext);
  if (!context) {
    throw new Error("usePeriod must be used within HomeActionBarWrapper");
  }
  return context;
}

interface HomeActionBarWrapperProps {
  children?: ReactNode;
}

export function HomeActionBarWrapper({ children }: HomeActionBarWrapperProps) {
  const [period, setPeriod] = useState<"week" | "month">("week");

  return (
    <PeriodContext.Provider value={{ period, setPeriod }}>
      <div className="space-y-6">
        <HomeActionBar 
          period={period} 
          onPeriodChange={setPeriod}
        />
        {children}
      </div>
    </PeriodContext.Provider>
  );
}

export function HomeTasksAndInboxCards() {
  const { period } = usePeriod();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <HomeTasksSection period={period} />
      <HomeInboxSection />
    </div>
  );
}

