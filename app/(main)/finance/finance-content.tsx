"use server";

import React from "react";
import { startOfMonth, endOfMonth } from "date-fns";

import { getFinanceMetrics, getTransactions } from "@/lib/actions/finance";
import { FinanceTabsClient } from "@/components/finance/FinanceTabsClient";

type TransactionStatus = "paid" | "pending" | "overdue" | "scheduled" | "cancelled";

// --- MAIN PAGE COMPONENT ---

export async function FinanceContent({
  workspaceId,
  searchParams,
}: {
  workspaceId: string;
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  // Parse Date Params
  const currentDate = new Date();
  const monthParam = typeof searchParams.month === "string" ? parseInt(searchParams.month) : currentDate.getMonth() + 1;
  const yearParam = typeof searchParams.year === "string" ? parseInt(searchParams.year) : currentDate.getFullYear();

  // Fetch Transactions for the period (Visão Geral)
  const dateForRange = new Date(yearParam, monthParam - 1, 1);
  const startDate = startOfMonth(dateForRange).toISOString();
  const endDate = endOfMonth(dateForRange).toISOString();

  // OTIMIZAÇÃO: Buscar dados em paralelo
  const [metrics, rawTransactions] = await Promise.all([
    getFinanceMetrics(monthParam, yearParam, workspaceId),
    getTransactions({ startDate, endDate, workspaceId, limit: 200 }),
  ]);
  const typedTransactions = rawTransactions as any[];

  // OTIMIZAÇÃO: Processar transações em uma única passada
  const incomeTransactions: any[] = [];
  const expenseTransactions: any[] = [];
  const categoryTotals: Record<string, number> = {};

  typedTransactions.forEach((t: any) => {
    const tx = {
      id: t.id,
      due_date: t.due_date || new Date().toISOString(),
      created_at: t.created_at || new Date().toISOString(),
      description: t.description,
      amount: Number(t.amount) || 0,
      status: (t.status || "pending") as TransactionStatus,
      category: t.category || "Geral",
      type: t.type as "income" | "expense",
      is_recurring: t.is_recurring || false,
    };

    if (tx.type === "income") {
      incomeTransactions.push(tx);
    } else {
      expenseTransactions.push(tx);
      const cat = tx.category || "Outros";
      categoryTotals[cat] = (categoryTotals[cat] || 0) + tx.amount;
    }
  });

  const totalExpensesVal = metrics.totalExpense || 1; // Avoid division by zero
  const categories = Object.entries(categoryTotals)
    .map(([name, value], index) => {
      const numericValue = Number(value) || 0;
      const colors = ["bg-blue-500", "bg-indigo-500", "bg-purple-500", "bg-pink-500", "bg-orange-500"];
      return {
        name,
        value: numericValue,
        percent: Math.round((numericValue / totalExpensesVal) * 100),
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
        workspaceId={workspaceId}
        month={monthParam}
        year={yearParam}
        metrics={metrics}
        incomeTransactions={incomeTransactions}
        expenseTransactions={expenseTransactions}
        categories={categories}
        topCategory={topCategory}
        categoryTotals={categoryTotals}
      />
    </div>
  );
}
