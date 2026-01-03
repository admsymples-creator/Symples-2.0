"use client";

import React from "react";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  AlertTriangle,
  Calendar,
  Wallet,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { FinanceTransactionsList } from "@/components/finance/FinanceTransactionsList";
import { PlanningBudgetCard } from "@/components/finance/PlanningBudgetCard";
import { PlanningGoalsCard } from "@/components/finance/PlanningGoalsCard";
import { PlanningProjectionsCard } from "@/components/finance/PlanningProjectionsCard";
import { PlanningCashFlowCard } from "@/components/finance/PlanningCashFlowCard";
import { NewTransactionButton, MonthSelector } from "@/components/finance/FinanceClientComponents";
import { getTransactions, getProjections, getCashFlowForecast } from "@/lib/actions/finance";

type TransactionStatus = "paid" | "pending" | "overdue" | "scheduled" | "cancelled";

type FinanceTransaction = {
  id: string;
  due_date: string;
  created_at: string;
  description: string;
  amount: number;
  status: TransactionStatus;
  category: string;
  type: "income" | "expense";
  is_recurring: boolean;
};

type FinanceMetrics = {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  burnRate: number;
  healthStatus?: "healthy" | "warning" | "critical";
  status?: "healthy" | "warning" | "critical";
};

type CategorySummary = {
  name: string;
  value: number;
  percent: number;
  color: string;
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

const FinancialHealthCard = ({ data }: { data: FinanceMetrics }) => {
  const themes = {
    healthy: {
      bg: "bg-green-50",
      border: "border-green-200",
      text: "text-green-800",
      icon: ArrowUpCircle,
      iconColor: "text-green-600",
      message: "Excelente! Seu saldo está positivo.",
    },
    warning: {
      bg: "bg-yellow-50",
      border: "border-yellow-200",
      text: "text-yellow-800",
      icon: AlertTriangle,
      iconColor: "text-yellow-600",
      message: "Atenção: Seu saldo está baixo.",
    },
    critical: {
      bg: "bg-red-50",
      border: "border-red-200",
      text: "text-red-800",
      icon: AlertTriangle,
      iconColor: "text-red-600",
      message: "Crítico: Despesas superam as receitas.",
    },
  };

  const status = (data.healthStatus || data.status || "healthy") as "healthy" | "warning" | "critical";
  const theme = themes[status];
  const Icon = theme.icon;

  return (
    <div className={`rounded-xl border ${theme.border} ${theme.bg} p-6 transition-all duration-200`}>
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className={`p-2 rounded-full bg-white/60 ${theme.iconColor}`}>
              <Icon size={24} />
            </div>
            <h3 className={`font-semibold text-lg ${theme.text}`}>Saúde Financeira</h3>
          </div>
          <p className={`${theme.text} text-sm mb-4 opacity-90 max-w-md`}>
            {theme.message}
          </p>
        </div>
        <div className="text-right">
          <p className={`text-sm ${theme.text} opacity-80`}>Saldo Atual</p>
          <h2 className={`text-3xl font-bold ${theme.text}`}>{formatCurrency(data.balance)}</h2>
        </div>
      </div>

      <div className="mt-4 flex gap-4 border-t border-black/5 pt-4">
        <div>
          <p className="text-xs uppercase tracking-wider opacity-60 font-semibold text-gray-600">Burn Rate (Fixo)</p>
          <p className="font-medium text-gray-800">{formatCurrency(data.burnRate)}</p>
        </div>
      </div>
    </div>
  );
};

const CategoryProgressBar = ({ category }: { category: CategorySummary }) => (
  <div className="space-y-2">
    <div className="flex justify-between text-sm">
      <span className="font-medium text-gray-700">{category.name}</span>
      <span className="text-gray-500">{category.percent}%</span>
    </div>
    <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full ${category.color}`}
        style={{ width: `${category.percent}%` }}
      />
    </div>
    <p className="text-xs text-gray-400 text-right">{formatCurrency(category.value)}</p>
  </div>
);

const mapTransactions = (transactions: any[]): FinanceTransaction[] => {
  return transactions.map((t) => {
    const tx = t as any;
    return {
      id: tx.id,
      due_date: tx.due_date || new Date().toISOString(),
      created_at: tx.created_at || new Date().toISOString(),
      description: tx.description,
      amount: Number(tx.amount) || 0,
      status: (tx.status || "pending") as TransactionStatus,
      category: tx.category || "Geral",
      type: tx.type as "income" | "expense",
      is_recurring: tx.is_recurring || false,
    };
  });
};

interface FinanceTabsClientProps {
  workspaceId: string;
  month: number;
  year: number;
  metrics: FinanceMetrics;
  incomeTransactions: FinanceTransaction[];
  expenseTransactions: FinanceTransaction[];
  categories: CategorySummary[];
  topCategory: { name: string; value: number };
  categoryTotals: Record<string, number>;
}

export function FinanceTabsClient({
  workspaceId,
  month,
  year,
  metrics,
  incomeTransactions,
  expenseTransactions,
  categories,
  topCategory,
  categoryTotals,
}: FinanceTabsClientProps) {
  const [activeTab, setActiveTab] = React.useState("overview");

  const [recurringTransactions, setRecurringTransactions] = React.useState<FinanceTransaction[]>([]);
  const [recurringLoading, setRecurringLoading] = React.useState(false);
  const [recurringLoaded, setRecurringLoaded] = React.useState(false);

  const [projections, setProjections] = React.useState<any[]>([]);
  const [cashFlowForecast, setCashFlowForecast] = React.useState<any[]>([]);
  const [planningLoading, setPlanningLoading] = React.useState(false);
  const [planningLoaded, setPlanningLoaded] = React.useState(false);

  React.useEffect(() => {
    if (activeTab !== "recurring" || recurringLoaded || recurringLoading) return;

    const loadRecurring = async () => {
      setRecurringLoading(true);
      try {
        const data = await getTransactions({ isRecurring: true, workspaceId });
        setRecurringTransactions(mapTransactions(data || []));
        setRecurringLoaded(true);
      } catch (error) {
        console.error("Erro ao carregar recorrentes:", error);
        setRecurringTransactions([]);
      } finally {
        setRecurringLoading(false);
      }
    };

    loadRecurring();
  }, [activeTab, recurringLoaded, recurringLoading, workspaceId]);

  React.useEffect(() => {
    if (activeTab !== "planning" || planningLoaded || planningLoading) return;

    const loadPlanning = async () => {
      setPlanningLoading(true);
      try {
        const [projectionsData, cashFlowData] = await Promise.all([
          getProjections(6, workspaceId),
          getCashFlowForecast(6, workspaceId),
        ]);
        setProjections(projectionsData || []);
        setCashFlowForecast(cashFlowData || []);
        setPlanningLoaded(true);
      } catch (error) {
        console.error("Erro ao carregar planejamento:", error);
        setProjections([]);
        setCashFlowForecast([]);
      } finally {
        setPlanningLoading(false);
      }
    };

    loadPlanning();
  }, [activeTab, planningLoaded, planningLoading, workspaceId]);

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
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
          <div className="py-3 space-y-8">
            <TabsContent value="overview" className="space-y-8 mt-0">
              <FinancialHealthCard data={metrics} />

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* LEFT COLUMN: TABLES (SPAN 2) */}
                <div className="lg:col-span-2 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FinanceTransactionsList
                      transactions={incomeTransactions}
                      type="income"
                      title="Entradas"
                      icon={<div className="p-1.5 bg-green-100 rounded-full"><ArrowUpCircle className="w-4 h-4 text-green-600" /></div>}
                      totalAmount={metrics.totalIncome}
                    />

                    <FinanceTransactionsList
                      transactions={expenseTransactions}
                      type="expense"
                      title="Saídas"
                      icon={<div className="p-1.5 bg-red-100 rounded-full"><ArrowDownCircle className="w-4 h-4 text-red-600" /></div>}
                      totalAmount={metrics.totalExpense}
                    />
                  </div>
                </div>

                {/* RIGHT COLUMN: CATEGORIES */}
                <div className="lg:col-span-1">
                  <Card className="h-full border-none shadow-sm ring-1 ring-gray-200">
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Wallet className="w-4 h-4 text-gray-500" />
                        Por Categoria
                      </CardTitle>
                      <CardDescription>Distribuição dos seus gastos</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {categories.length === 0 ? (
                        <p className="text-gray-400 text-sm text-center">Sem dados de categorias</p>
                      ) : (
                        categories.map((cat) => (
                          <CategoryProgressBar key={cat.name} category={cat} />
                        ))
                      )}

                      <Separator className="my-4" />

                      <div className="rounded-lg bg-gray-50 p-4 text-center">
                        <p className="text-xs text-gray-500 mb-1">Maior gasto este mês</p>
                        <p className="font-semibold text-gray-900">{topCategory.name}</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="recurring" className="space-y-8 mt-0">
              <Card className="border-none shadow-sm ring-1 ring-gray-200">
                <CardHeader>
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <div className="p-1.5 bg-blue-100 rounded-full">
                      <Calendar className="w-4 h-4 text-blue-600" />
                    </div>
                    Transações Recorrentes
                  </CardTitle>
                  <CardDescription>
                    Lista de todas as receitas e despesas marcadas como recorrentes (mensais).
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-0">
                  {recurringLoading ? (
                    <div className="p-6 min-h-[160px]" />
                  ) : recurringTransactions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="bg-gray-50 p-4 rounded-full mb-4">
                        <Calendar className="w-8 h-8 text-gray-400" />
                      </div>
                      <p className="text-gray-500 max-w-sm text-sm">
                        Nenhuma transação recorrente encontrada.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
                      {recurringTransactions.filter(t => t.type === "income").length > 0 && (
                        <FinanceTransactionsList
                          transactions={recurringTransactions.filter(t => t.type === "income")}
                          type="income"
                          title="Recorrentes - Entradas"
                          icon={<div className="p-1.5 bg-green-100 rounded-full"><ArrowUpCircle className="w-4 h-4 text-green-600" /></div>}
                          totalAmount={recurringTransactions.filter(t => t.type === "income").reduce((acc, t) => acc + t.amount, 0)}
                        />
                      )}
                      {recurringTransactions.filter(t => t.type === "expense").length > 0 && (
                        <FinanceTransactionsList
                          transactions={recurringTransactions.filter(t => t.type === "expense")}
                          type="expense"
                          title="Recorrentes - Saídas"
                          icon={<div className="p-1.5 bg-red-100 rounded-full"><ArrowDownCircle className="w-4 h-4 text-red-600" /></div>}
                          totalAmount={recurringTransactions.filter(t => t.type === "expense").reduce((acc, t) => acc + t.amount, 0)}
                        />
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="planning" className="space-y-8 mt-0">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <PlanningBudgetCard
                  month={month}
                  year={year}
                  workspaceId={workspaceId}
                  categoryExpenses={categoryTotals}
                />

                <PlanningGoalsCard workspaceId={workspaceId} />
              </div>

              {planningLoading ? (
                <div className="min-h-[200px]" />
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <PlanningProjectionsCard projections={projections} />
                  <PlanningCashFlowCard forecast={cashFlowForecast} />
                </div>
              )}
            </TabsContent>
          </div>
        </div>
      </div>
    </Tabs>
  );
}
