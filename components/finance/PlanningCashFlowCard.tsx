"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface CashFlowForecast {
  month: number;
  year: number;
  monthName: string;
  income: number;
  expense: number;
  balance: number;
}

interface PlanningCashFlowCardProps {
  forecast: CashFlowForecast[];
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

export function PlanningCashFlowCard({ forecast }: PlanningCashFlowCardProps) {
  if (!forecast || forecast.length === 0) {
    return (
      <Card className="border-none shadow-sm ring-1 ring-gray-200">
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-gray-500" />
            Previsão de Fluxo de Caixa
          </CardTitle>
          <CardDescription>
            Projeção do saldo dos próximos meses
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-gray-400 py-4 text-sm">
            Nenhuma previsão disponível
          </p>
        </CardContent>
      </Card>
    );
  }

  // Calcular valores máximos para escala
  const maxBalance = Math.max(...forecast.map(f => Math.abs(f.balance)));
  const maxIncome = Math.max(...forecast.map(f => f.income), 1);
  const maxExpense = Math.max(...forecast.map(f => f.expense), 1);

  return (
    <Card className="border-none shadow-sm ring-1 ring-gray-200">
      <CardHeader>
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-gray-500" />
          Previsão de Fluxo de Caixa
        </CardTitle>
        <CardDescription>
          Projeção do saldo dos próximos {forecast.length} meses
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {forecast.map((item, index) => {
            const isNegative = item.balance < 0;
            const balancePercent = maxBalance > 0 
              ? (Math.abs(item.balance) / maxBalance) * 100 
              : 0;
            const incomePercent = maxIncome > 0 ? (item.income / maxIncome) * 100 : 0;
            const expensePercent = maxExpense > 0 ? (item.expense / maxExpense) * 100 : 0;

            return (
              <div key={`${item.year}-${item.month}`} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-sm text-gray-900">
                    {item.monthName}
                  </h4>
                  <div className={cn(
                    "text-sm font-bold flex items-center gap-1",
                    isNegative ? "text-red-600" : "text-green-600"
                  )}>
                    {isNegative && <AlertTriangle className="w-4 h-4" />}
                    {item.balance >= 0 ? "+" : ""}{formatCurrency(item.balance)}
                  </div>
                </div>

                {/* Gráfico de barras simples */}
                <div className="space-y-2">
                  {/* Receitas */}
                  {item.income > 0 && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-600 flex items-center gap-1">
                          <TrendingUp className="w-3 h-3 text-green-600" />
                          Receitas
                        </span>
                        <span className="text-green-600 font-medium">
                          {formatCurrency(item.income)}
                        </span>
                      </div>
                      <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500 rounded-full transition-all"
                          style={{ width: `${incomePercent}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Despesas */}
                  {item.expense > 0 && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-600 flex items-center gap-1">
                          <TrendingDown className="w-3 h-3 text-red-600" />
                          Despesas
                        </span>
                        <span className="text-red-600 font-medium">
                          {formatCurrency(item.expense)}
                        </span>
                      </div>
                      <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-red-500 rounded-full transition-all"
                          style={{ width: `${expensePercent}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Saldo */}
                  <div className="space-y-1 pt-2 border-t border-gray-100">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-600 font-medium">Saldo Final</span>
                      <span className={cn(
                        "font-bold",
                        isNegative ? "text-red-600" : "text-green-600"
                      )}>
                        {item.balance >= 0 ? "+" : ""}{formatCurrency(item.balance)}
                      </span>
                    </div>
                    <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          isNegative ? "bg-red-500" : "bg-green-500"
                        )}
                        style={{ width: `${Math.min(balancePercent, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>

                {index < forecast.length - 1 && (
                  <div className="border-t border-gray-100 pt-4" />
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

