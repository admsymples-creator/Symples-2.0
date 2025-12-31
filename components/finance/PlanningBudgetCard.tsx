"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Wallet, Plus, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { BudgetModal } from "./BudgetModal";
import { getBudgets, createBudget, type Budget } from "@/lib/actions/finance";
import { useRouter } from "next/navigation";

interface PlanningBudgetCardProps {
  month: number;
  year: number;
  workspaceId?: string;
  categoryExpenses: Record<string, number>; // Categoria -> Gasto atual
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

export function PlanningBudgetCard({ 
  month, 
  year, 
  workspaceId,
  categoryExpenses 
}: PlanningBudgetCardProps) {
  const router = useRouter();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);

  React.useEffect(() => {
    async function loadBudgets() {
      setIsLoading(true);
      const data = await getBudgets(month, year, workspaceId);
      setBudgets(data);
      setIsLoading(false);
    }
    loadBudgets();
  }, [month, year, workspaceId]);

  const handleSaveBudget = async (category: string, amount: number) => {
    const result = await createBudget({
      category,
      amount,
      month,
      year,
      workspace_id: workspaceId,
    });

    if (result.success) {
      router.refresh();
      setIsModalOpen(false);
      setEditingBudget(null);
      // Recarregar budgets
      const data = await getBudgets(month, year, workspaceId);
      setBudgets(data as Budget[]);
    }
  };

  const handleEdit = (budget: Budget) => {
    setEditingBudget(budget);
    setIsModalOpen(true);
  };

  // Categorias únicas (das transações + orçamentos)
  const allCategories = new Set([
    ...Object.keys(categoryExpenses),
    ...budgets.map(b => b.category),
  ]);

  const budgetItems = Array.from(allCategories).map(category => {
    const budget = budgets.find(b => b.category === category);
    const spent = categoryExpenses[category] || 0;
    const limit = budget?.amount || 0;
    const percent = limit > 0 ? (spent / limit) * 100 : 0;
    const isOverBudget = percent > 100;
    const isWarning = percent >= 80 && percent <= 100;

    return {
      category,
      budget: limit,
      spent,
      percent: Math.min(percent, 100),
      isOverBudget,
      isWarning,
      budgetId: budget?.id,
    };
  }).sort((a, b) => b.spent - a.spent);

  return (
    <>
      <Card className="border-none shadow-sm ring-1 ring-gray-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Wallet className="w-4 h-4 text-gray-500" />
                Orçamento por Categoria
              </CardTitle>
              <CardDescription>
                Controle de gastos mensais por categoria
              </CardDescription>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setEditingBudget(null);
                setIsModalOpen(true);
              }}
            >
              <Plus className="w-4 h-4 mr-1" />
              Definir
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center text-gray-400 py-4 text-sm">Carregando...</p>
          ) : budgetItems.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-400 text-sm mb-2">
                Nenhum orçamento definido ainda
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsModalOpen(true)}
              >
                <Plus className="w-4 h-4 mr-1" />
                Criar primeiro orçamento
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {budgetItems.map((item) => (
                <div key={item.category} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-gray-900">
                        {item.category}
                      </span>
                      {item.isOverBudget && (
                        <Badge variant="destructive" className="text-xs">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          Ultrapassado
                        </Badge>
                      )}
                      {item.isWarning && !item.isOverBudget && (
                        <Badge variant="outline" className="text-xs border-yellow-500 text-yellow-700">
                          Atenção
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-xs text-gray-500">
                          {formatCurrency(item.spent)} / {formatCurrency(item.budget)}
                        </div>
                        <div className={cn(
                          "text-xs font-medium",
                          item.isOverBudget ? "text-red-600" : 
                          item.isWarning ? "text-yellow-600" : "text-gray-600"
                        )}>
                          {item.percent.toFixed(0)}%
                        </div>
                      </div>
                      {item.budgetId && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2"
                          onClick={() => handleEdit(budgets.find(b => b.id === item.budgetId)!)}
                        >
                          Editar
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        item.isOverBudget ? "bg-red-500" :
                        item.isWarning ? "bg-yellow-500" : "bg-blue-500"
                      )}
                      style={{ width: `${Math.min(item.percent, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <BudgetModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        month={month}
        year={year}
        budget={editingBudget}
        onSave={handleSaveBudget}
        existingCategories={budgetItems.map(b => b.category)}
      />
    </>
  );
}

