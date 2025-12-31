"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { type Projection } from "@/lib/actions/finance";

interface PlanningProjectionsCardProps {
  projections: Projection[];
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

export function PlanningProjectionsCard({ projections }: PlanningProjectionsCardProps) {
  if (!projections || projections.length === 0) {
    return (
      <Card className="border-none shadow-sm ring-1 ring-gray-200">
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-gray-500" />
            Projeções Futuras
          </CardTitle>
          <CardDescription>
            Previsão de receitas e despesas dos próximos meses
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-gray-400 py-4 text-sm">
            Nenhuma projeção disponível
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-none shadow-sm ring-1 ring-gray-200">
      <CardHeader>
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-gray-500" />
          Projeções Futuras
        </CardTitle>
        <CardDescription>
          Previsão de receitas e despesas dos próximos {projections.length} meses
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {projections.map((projection, index) => (
            <div
              key={`${projection.year}-${projection.month}`}
              className="border border-gray-200 rounded-lg p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-sm text-gray-900 capitalize">
                  {projection.monthName}
                </h4>
                <div className={cn(
                  "text-sm font-bold",
                  projection.balance >= 0 ? "text-green-600" : "text-red-600"
                )}>
                  {projection.balance >= 0 ? "+" : ""}{formatCurrency(projection.balance)}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <TrendingUp className="w-3 h-3 text-green-600" />
                    Receitas
                  </div>
                  <div className="text-sm font-medium text-green-600">
                    {formatCurrency(projection.income)}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <TrendingDown className="w-3 h-3 text-red-600" />
                    Despesas
                  </div>
                  <div className="text-sm font-medium text-red-600">
                    {formatCurrency(projection.expense)}
                  </div>
                </div>
              </div>

              {index < projections.length - 1 && (
                <div className="border-t border-gray-100 pt-0" />
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

