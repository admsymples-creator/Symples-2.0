"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Target, Plus, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { GoalModal } from "./GoalModal";
import { getFinancialGoals, updateFinancialGoal, type FinancialGoal } from "@/lib/actions/finance";
import { useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface PlanningGoalsCardProps {
  workspaceId?: string;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

export function PlanningGoalsCard({ workspaceId }: PlanningGoalsCardProps) {
  const router = useRouter();
  const [goals, setGoals] = useState<FinancialGoal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<FinancialGoal | null>(null);

  React.useEffect(() => {
    async function loadGoals() {
      setIsLoading(true);
      const data = await getFinancialGoals(workspaceId);
      setGoals(data);
      setIsLoading(false);
    }
    loadGoals();
  }, [workspaceId]);

  const handleEdit = (goal: FinancialGoal) => {
    setEditingGoal(goal);
    setIsModalOpen(true);
  };

  const handleComplete = async (goalId: string) => {
    const result = await updateFinancialGoal(goalId, { status: "completed" });
    if (result.success) {
      router.refresh();
      const data = await getFinancialGoals(workspaceId);
      setGoals(data as FinancialGoal[]);
    }
  };

  return (
    <>
      <Card className="border-none shadow-sm ring-1 ring-gray-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Target className="w-4 h-4 text-gray-500" />
                Metas Financeiras
              </CardTitle>
              <CardDescription>
                Acompanhe suas metas de economia e limites de gasto
              </CardDescription>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setEditingGoal(null);
                setIsModalOpen(true);
              }}
            >
              <Plus className="w-4 h-4 mr-1" />
              Nova Meta
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center text-gray-400 py-4 text-sm">Carregando...</p>
          ) : goals.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-400 text-sm mb-2">
                Nenhuma meta definida ainda
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsModalOpen(true)}
              >
                <Plus className="w-4 h-4 mr-1" />
                Criar primeira meta
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {goals.map((goal) => {
                const percent = goal.target_amount > 0 
                  ? (goal.current_amount / goal.target_amount) * 100 
                  : 0;
                const isCompleted = percent >= 100 || goal.status === "completed";
                const isSavings = goal.type === "savings";

                return (
                  <div
                    key={goal.id}
                    className="border border-gray-200 rounded-lg p-4 space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-sm text-gray-900">
                            {goal.title}
                          </h4>
                          {isCompleted && (
                            <Badge variant="outline" className="text-xs border-green-500 text-green-700">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Concluída
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-xs">
                            {isSavings ? "Economia" : "Limite"}
                          </Badge>
                        </div>
                        {goal.description && (
                          <p className="text-xs text-gray-500 mb-2">
                            {goal.description}
                          </p>
                        )}
                        {goal.deadline && (
                          <p className="text-xs text-gray-400">
                            Prazo: {format(parseISO(goal.deadline), "dd/MM/yyyy", { locale: ptBR })}
                          </p>
                        )}
                      </div>
                      {!isCompleted && (
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2"
                            onClick={() => handleEdit(goal)}
                          >
                            Editar
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2"
                            onClick={() => handleComplete(goal.id)}
                          >
                            Concluir
                          </Button>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">
                          {formatCurrency(goal.current_amount)} / {formatCurrency(goal.target_amount)}
                        </span>
                        <span className={cn(
                          "font-medium",
                          isCompleted ? "text-green-600" : "text-gray-600"
                        )}>
                          {Math.min(percent, 100).toFixed(0)}%
                        </span>
                      </div>
                      <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all",
                            isCompleted ? "bg-green-500" :
                            isSavings ? "bg-blue-500" : "bg-orange-500"
                          )}
                          style={{ width: `${Math.min(percent, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <GoalModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        goal={editingGoal}
        workspaceId={workspaceId}
        onSuccess={() => {
          router.refresh();
          setIsModalOpen(false);
          setEditingGoal(null);
          getFinancialGoals(workspaceId).then(data => setGoals(data as FinancialGoal[]));
        }}
      />
    </>
  );
}

