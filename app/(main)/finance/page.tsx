import React from "react";
import { 
  TrendingUp, 
  AlertTriangle, 
  AlertOctagon, 
  ArrowUpCircle, 
  ArrowDownCircle,
  Wallet,
  MoreHorizontal,
  Calendar
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { getFinanceMetrics, getTransactions } from "@/lib/actions/finance";
import { startOfMonth, endOfMonth } from "date-fns";
import { NewTransactionButton, MonthSelector } from "@/components/finance/FinanceClientComponents";

// --- TYPES ---

type TransactionStatus = "paid" | "pending" | "overdue";

interface Transaction {
  id: string;
  date: string; // Formatted for UI
  description: string;
  amount: number;
  status: TransactionStatus;
  category: string;
}

// --- HELPER COMPONENTS ---

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

const StatusBadge = ({ status }: { status: string }) => {
  const styles: Record<string, string> = {
    paid: "bg-green-100 text-green-700 hover:bg-green-100 border-green-200",
    pending: "bg-gray-100 text-gray-700 hover:bg-gray-100 border-gray-200",
    overdue: "bg-orange-100 text-orange-700 hover:bg-orange-100 border-orange-200",
  };

  const labels: Record<string, string> = {
    paid: "Pago",
    pending: "Pendente",
    overdue: "Atrasado",
  };

  // Fallback for unknown status
  const safeStatus = styles[status] ? status : "pending";

  return (
    <Badge variant="outline" className={`${styles[safeStatus]} border font-normal`}>
      {labels[safeStatus] || status}
    </Badge>
  );
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

// --- MAIN PAGE COMPONENT ---

export default async function FinancePage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const searchParams = await props.searchParams;
  // Parse Date Params
  const currentDate = new Date();
  const monthParam = typeof searchParams.month === 'string' ? parseInt(searchParams.month) : currentDate.getMonth() + 1;
  const yearParam = typeof searchParams.year === 'string' ? parseInt(searchParams.year) : currentDate.getFullYear();
  
  // Fetch Metrics
  const metrics = await getFinanceMetrics(monthParam, yearParam);

  // Fetch Transactions for the period
  const dateForRange = new Date(yearParam, monthParam - 1, 1);
  const startDate = startOfMonth(dateForRange).toISOString();
  const endDate = endOfMonth(dateForRange).toISOString();
  
  const rawTransactions = await getTransactions({ startDate, endDate });

  // Process Transactions for UI
  const incomeTransactions = rawTransactions
    .filter(t => t.type === 'income')
    .map(t => ({
      id: t.id,
      date: format(parseISO(t.date!), "dd/MM"),
      description: t.description,
      amount: t.amount,
      status: (t.status as TransactionStatus) || 'pending',
      category: t.category || 'Geral'
    }));

  const expenseTransactions = rawTransactions
    .filter(t => t.type === 'expense')
    .map(t => ({
      id: t.id,
      date: format(parseISO(t.date!), "dd/MM"),
      description: t.description,
      amount: t.amount,
      status: (t.status as TransactionStatus) || 'pending',
      category: t.category || 'Geral'
    }));

  // Process Categories
  const categoryTotals = rawTransactions
    .filter(t => t.type === 'expense')
    .reduce((acc, curr) => {
      const cat = curr.category || 'Outros';
      acc[cat] = (acc[cat] || 0) + curr.amount;
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
    <div className="min-h-screen bg-gray-50/50 pb-20">
      {/* HEADER AREA */}
      <div className="bg-white border-b px-6 py-5 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto">
          {/* Título Principal e Botão de Ação */}
          <div className="flex items-center justify-between mb-1">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Financeiro</h1>
              <p className="text-sm text-gray-500">Gestão inteligente do seu fluxo de caixa</p>
            </div>
            
            <NewTransactionButton />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        
        {/* NAVIGATION & CONTROLS */}
        <Tabs defaultValue="overview" className="w-full">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
            <TabsList className="bg-white border">
              <TabsTrigger value="overview">Visão Geral</TabsTrigger>
              <TabsTrigger value="recurring">Recorrentes (Fixos)</TabsTrigger>
              <TabsTrigger value="planning">Planejamento</TabsTrigger>
            </TabsList>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <MonthSelector />
              <Button variant="outline" size="icon">
                 <MoreHorizontal className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <TabsContent value="overview" className="space-y-8 mt-0">
            
            {/* DIAGNOSTIC SECTION */}
            <FinancialHealthCard data={metrics} />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* LEFT COLUMN: TABLES (SPAN 2) */}
              <div className="lg:col-span-2 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* INCOME CARD */}
                  <Card className="border-none shadow-sm ring-1 ring-gray-200">
                    <CardHeader className="pb-3 border-b border-gray-50">
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-base font-semibold flex items-center gap-2">
                          <div className="p-1.5 bg-green-100 rounded-full">
                            <ArrowUpCircle className="w-4 h-4 text-green-600" />
                          </div>
                          Entradas
                        </CardTitle>
                        <span className="text-green-600 font-bold text-sm">
                          {formatCurrency(metrics.totalIncome)}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-4 px-0">
                      <div className="space-y-1">
                        {incomeTransactions.length === 0 ? (
                          <p className="text-center text-gray-400 py-4 text-sm">Nenhuma entrada neste mês</p>
                        ) : (
                          incomeTransactions.map((item) => (
                            <div key={item.id} className="flex items-center justify-between py-3 px-4 hover:bg-gray-50 transition-colors group">
                              <div className="flex flex-col gap-0.5">
                                <span className="text-xs text-gray-400 font-mono">{item.date}</span>
                                <span className="font-medium text-sm text-gray-900">{item.description}</span>
                              </div>
                              <div className="flex flex-col items-end gap-1">
                                <span className="font-semibold text-sm text-green-600">
                                  + {formatCurrency(item.amount)}
                                </span>
                                <StatusBadge status={item.status} />
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* EXPENSES CARD */}
                  <Card className="border-none shadow-sm ring-1 ring-gray-200">
                    <CardHeader className="pb-3 border-b border-gray-50">
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-base font-semibold flex items-center gap-2">
                          <div className="p-1.5 bg-red-100 rounded-full">
                            <ArrowDownCircle className="w-4 h-4 text-red-600" />
                          </div>
                          Saídas
                        </CardTitle>
                        <span className="text-red-600 font-bold text-sm">
                          {formatCurrency(metrics.totalExpense)}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-4 px-0">
                      <div className="space-y-1">
                        {expenseTransactions.length === 0 ? (
                          <p className="text-center text-gray-400 py-4 text-sm">Nenhuma saída neste mês</p>
                        ) : (
                          expenseTransactions.map((item) => (
                            <div key={item.id} className="flex items-center justify-between py-3 px-4 hover:bg-gray-50 transition-colors">
                              <div className="flex flex-col gap-0.5">
                                <span className="text-xs text-gray-400 font-mono">{item.date}</span>
                                <span className="font-medium text-sm text-gray-900">{item.description}</span>
                              </div>
                              <div className="flex flex-col items-end gap-1">
                                <span className="font-semibold text-sm text-gray-900">
                                  - {formatCurrency(item.amount)}
                                </span>
                                <StatusBadge status={item.status} />
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </CardContent>
                  </Card>

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

          <TabsContent value="recurring">
            <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-xl border border-dashed">
               <div className="bg-gray-50 p-4 rounded-full mb-4">
                  <Calendar className="w-8 h-8 text-gray-400" />
               </div>
               <h3 className="text-lg font-semibold text-gray-900">Gestão de Recorrentes</h3>
               <p className="text-gray-500 max-w-sm">
                 Visualize suas assinaturas e contas fixas em um só lugar. 
                 (Feature em desenvolvimento)
               </p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
