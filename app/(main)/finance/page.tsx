import React, { Suspense } from "react";
import {
  TrendingUp,
  AlertTriangle,
  AlertOctagon,
  ArrowUpCircle,
  ArrowDownCircle,
  Wallet,
  Calendar
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getFinanceMetrics, getTransactions, getProjections, getCashFlowForecast } from "@/lib/actions/finance";
import { startOfMonth, endOfMonth } from "date-fns";
import { FinanceTransactionsList } from "@/components/finance/FinanceTransactionsList";
import { getUserWorkspaces } from "@/lib/actions/user";
import { PlanningBudgetCard } from "@/components/finance/PlanningBudgetCard";
import { PlanningProjectionsCard } from "@/components/finance/PlanningProjectionsCard";
import { PlanningGoalsCard } from "@/components/finance/PlanningGoalsCard";
import { PlanningCashFlowCard } from "@/components/finance/PlanningCashFlowCard";
import { FinanceTabsClient } from "@/components/finance/FinanceTabsClient";

// --- TYPES ---

type TransactionStatus = "paid" | "pending" | "overdue" | "scheduled" | "cancelled";

// --- HELPER COMPONENTS ---

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};


const FinancialHealthCard = ({ data }: { data: any }) => {
  const themes = {
    healthy: {
      bg: "bg-green-50",
      border: "border-green-200",
      text: "text-green-800",
      icon: TrendingUp,
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
      icon: AlertOctagon,
      iconColor: "text-red-600",
      message: "Crítico: Despesas superam as receitas.",
    },
  };

  const status = (data.status as "healthy" | "warning" | "critical") || "healthy";
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

const CategoryProgressBar = ({ category }: { category: any }) => (
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

async function RecurringTransactionsSection({ workspaceId }: { workspaceId?: string }) {
  const allRecurringTransactions = await getTransactions({ isRecurring: true, workspaceId });

  const recurringTransactions = allRecurringTransactions
    .map(t => {
      const tx = t as any; // Type assertion para acessar campos que podem não estar nos tipos gerados
      return {
        id: tx.id,
        due_date: tx.due_date || new Date().toISOString(),
        created_at: tx.created_at || new Date().toISOString(),
        description: tx.description,
        amount: Number(tx.amount) || 0,
        status: (tx.status || "pending") as TransactionStatus,
        category: tx.category || "Geral",
        type: tx.type as "income" | "expense",
        is_recurring: true,
      };
    });

  return (
    <div className="space-y-1">
      {recurringTransactions.length === 0 ? (
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
    </div>
  );
}

async function PlanningForecastSection({ workspaceId }: { workspaceId?: string }) {
  const [projections, cashFlowForecast] = await Promise.all([
    getProjections(6, workspaceId),
    getCashFlowForecast(6, workspaceId),
  ]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <PlanningProjectionsCard projections={projections} />
      <PlanningCashFlowCard forecast={cashFlowForecast} />
    </div>
  );
}
// --- MAIN PAGE COMPONENT ---

export default async function FinancePage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const searchParams = await props.searchParams;
  // Parse Date Params
  const currentDate = new Date();
  const monthParam = typeof searchParams.month === "string" ? parseInt(searchParams.month) : currentDate.getMonth() + 1;
  const yearParam = typeof searchParams.year === "string" ? parseInt(searchParams.year) : currentDate.getFullYear();

  // Get workspace (use first workspace as default)
  const workspaces = await getUserWorkspaces();
  const workspaceId = workspaces.length > 0 ? workspaces[0].id : undefined;

  // Fetch Transactions for the period (Visão Geral)
  const dateForRange = new Date(yearParam, monthParam - 1, 1);
  const startDate = startOfMonth(dateForRange).toISOString();
  const endDate = endOfMonth(dateForRange).toISOString();

  const [metrics, rawTransactions] = await Promise.all([
    getFinanceMetrics(monthParam, yearParam, workspaceId),
    getTransactions({ startDate, endDate, workspaceId, limit: 200 }),
  ]);

  // Process Transactions for UI (using due_date instead of date)
  const incomeTransactions = rawTransactions
    .filter(t => t.type === "income")
    .map(t => {
      const tx = t as any; // Type assertion para acessar campos que podem não estar nos tipos gerados
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

  const expenseTransactions = rawTransactions
    .filter(t => t.type === "expense")
    .map(t => {
      const tx = t as any; // Type assertion para acessar campos que podem não estar nos tipos gerados
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
  // Process Categories (garantir conversão numérica)
  const categoryTotals = rawTransactions
    .filter(t => t.type === "expense")
    .reduce((acc, curr) => {
      const cat = curr.category || "Outros";
      const amount = Number(curr.amount) || 0;
      acc[cat] = (acc[cat] || 0) + amount;
      return acc;
    }, {} as Record<string, number>);

  const totalExpensesVal = metrics.totalExpense || 1; // Avoid division by zero
  const categories = Object.entries(categoryTotals)
    .map(([name, value], index) => {
      const colors = ["bg-blue-500", "bg-indigo-500", "bg-purple-500", "bg-pink-500", "bg-orange-500"];
      return {
        name,
        value,
        percent: Math.round((value / totalExpensesVal) * 100),
        color: colors[index % colors.length]
      };
    })
    .sort((a, b) => b.value - a.value)
    .slice(0, 5); // Top 5

  // Find max expense category
  const topCategory = categories.length > 0 ? categories[0] : { name: "-", value: 0 };

  return (
    <div className="min-h-screen bg-white pb-20">
      {/* HEADER AREA - LINE 1 */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 sticky top-0 z-10">
        <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Financeiro</h1>
            <p className="text-sm text-gray-500">Gestão inteligente do seu fluxo de caixa</p>
          </div>
        </div>
      </div>
      <FinanceTabsClient
        overview={
          <div className="space-y-8">
            {/* DIAGNOSTIC SECTION */}
            <FinancialHealthCard data={metrics} />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* LEFT COLUMN: TABLES (SPAN 2) */}
              <div className="lg:col-span-2 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* INCOME CARD */}
                  <FinanceTransactionsList
                    transactions={incomeTransactions}
                    type="income"
                    title="Entradas"
                    icon={<div className="p-1.5 bg-green-100 rounded-full"><ArrowUpCircle className="w-4 h-4 text-green-600" /></div>}
                    totalAmount={metrics.totalIncome}
                  />

                  {/* EXPENSES CARD */}
                  <FinanceTransactionsList
                    transactions={expenseTransactions}
                    type="expense"
                    title="Sa¡das"
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
                    <CardDescription>Distribui‡Æo dos seus gastos</CardDescription>
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
                      <p className="text-xs text-gray-500 mb-1">Maior gasto este mˆs</p>
                      <p className="font-semibold text-gray-900">{topCategory.name}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        }
        recurring={
          <div className="space-y-8">
            <Card className="border-none shadow-sm ring-1 ring-gray-200">
              <CardHeader>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <div className="p-1.5 bg-blue-100 rounded-full">
                    <Calendar className="w-4 h-4 text-blue-600" />
                  </div>
                  Transa‡äes Recorrentes
                </CardTitle>
                <CardDescription>
                  Lista de todas as receitas e despesas marcadas como recorrentes (mensais).
                </CardDescription>
              </CardHeader>
              <CardContent className="px-0">
                <Suspense fallback={<div className="p-6 min-h-[160px]" />}>
                  <RecurringTransactionsSection workspaceId={workspaceId} />
                </Suspense>
              </CardContent>
            </Card>
          </div>
        }
        planning={
          <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Or‡amento por Categoria */}
              <PlanningBudgetCard
                month={monthParam}
                year={yearParam}
                workspaceId={workspaceId}
                categoryExpenses={categoryTotals}
              />

              {/* Metas Financeiras */}
              <PlanningGoalsCard
                workspaceId={workspaceId}
              />
            </div>

            <Suspense fallback={<div className="min-h-[200px]" />}>
              <PlanningForecastSection workspaceId={workspaceId} />
            </Suspense>
          </div>
        }
      />
    </div>
  );
}
