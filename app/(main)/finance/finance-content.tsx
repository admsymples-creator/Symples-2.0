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

  const [metrics, rawTransactions] = await Promise.all([
    getFinanceMetrics(monthParam, yearParam, workspaceId),
    getTransactions({ startDate, endDate, workspaceId, limit: 200 }),
  ]);
  const typedTransactions = rawTransactions as any[];

  // Process Transactions for UI (using due_date instead of date)
  const incomeTransactions = typedTransactions
    .filter((t: any) => t.type === "income")
    .map((t: any) => {
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

  const expenseTransactions = typedTransactions
    .filter((t: any) => t.type === "expense")
    .map((t: any) => {
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
  const categoryTotals = typedTransactions
    .filter((t: any) => t.type === "expense")
    .reduce((acc, curr: any) => {
      const cat = curr.category || "Outros";
      const amount = Number(curr.amount) || 0;
      acc[cat] = (acc[cat] || 0) + amount;
      return acc;
    }, {} as Record<string, number>);

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
