"use client";

import React, { useState } from "react";
import { 
  TrendingUp, 
  AlertTriangle, 
  AlertOctagon, 
  Calendar, 
  ArrowUpCircle, 
  ArrowDownCircle,
  Wallet,
  MoreHorizontal,
  PlusCircle
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

// --- MOCKS & TYPES ---

type TransactionStatus = "paid" | "pending" | "overdue";

interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  status: TransactionStatus;
  category: string;
}

const MOCK_DATA = {
  month: "Novembro 2025",
  financialHealth: {
    status: "healthy" as const, // 'healthy' | 'warning' | 'critical'
    score: 85,
    message: "Excelente! Seu saldo está positivo e suas reservas estão crescendo.",
    balance: 12450.00,
    projection: 15000.00
  },
  income: [
    { id: "1", date: "05/11", description: "Salário Mensal", amount: 15000.00, status: "paid", category: "Salário" },
    { id: "2", date: "15/11", description: "Freelance Design", amount: 2500.00, status: "paid", category: "Serviços" },
    { id: "3", date: "20/11", description: "Reembolso", amount: 350.00, status: "pending", category: "Outros" },
  ] as Transaction[],
  expenses: [
    { id: "1", date: "10/11", description: "Aluguel Escritório", amount: 2500.00, status: "paid", category: "Infraestrutura" },
    { id: "2", date: "12/11", description: "Licença Software", amount: 450.00, status: "paid", category: "Software" },
    { id: "3", date: "25/11", description: "Marketing Google Ads", amount: 1200.00, status: "pending", category: "Marketing" },
    { id: "4", date: "28/11", description: "Servidor AWS", amount: 850.00, status: "pending", category: "Infraestrutura" },
  ] as Transaction[],
  categories: [
    { name: "Infraestrutura", value: 3350.00, percent: 45, color: "bg-blue-500" },
    { name: "Software", value: 450.00, percent: 10, color: "bg-indigo-500" },
    { name: "Marketing", value: 1200.00, percent: 25, color: "bg-purple-500" },
    { name: "Equipe", value: 1500.00, percent: 20, color: "bg-pink-500" },
  ]
};

import { CreateTransactionModal } from "@/components/finance/CreateTransactionModal";

// --- HELPER COMPONENTS ---

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

const StatusBadge = ({ status }: { status: TransactionStatus }) => {
  const styles = {
    paid: "bg-green-100 text-green-700 hover:bg-green-100 border-green-200",
    pending: "bg-gray-100 text-gray-700 hover:bg-gray-100 border-gray-200",
    overdue: "bg-orange-100 text-orange-700 hover:bg-orange-100 border-orange-200",
  };

  const labels = {
    paid: "Pago",
    pending: "Pendente",
    overdue: "Atrasado",
  };

  return (
    <Badge variant="outline" className={`${styles[status]} border font-normal`}>
      {labels[status]}
    </Badge>
  );
};

const FinancialHealthCard = ({ data }: { data: typeof MOCK_DATA.financialHealth }) => {
  const themes = {
    healthy: {
      bg: "bg-green-50",
      border: "border-green-200",
      text: "text-green-800",
      icon: TrendingUp,
      iconColor: "text-green-600",
    },
    warning: {
      bg: "bg-yellow-50",
      border: "border-yellow-200",
      text: "text-yellow-800",
      icon: AlertTriangle,
      iconColor: "text-yellow-600",
    },
    critical: {
      bg: "bg-red-50",
      border: "border-red-200",
      text: "text-red-800",
      icon: AlertOctagon,
      iconColor: "text-red-600",
    },
  };

  const theme = themes[data.status];
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
            {data.message}
          </p>
        </div>
        <div className="text-right">
          <p className={`text-sm ${theme.text} opacity-80`}>Saldo Atual</p>
          <h2 className={`text-3xl font-bold ${theme.text}`}>{formatCurrency(data.balance)}</h2>
        </div>
      </div>
      
      {/* Mini Dashboard inside card */}
      <div className="mt-4 flex gap-4 border-t border-black/5 pt-4">
        <div>
          <p className="text-xs uppercase tracking-wider opacity-60 font-semibold text-gray-600">Projeção Fim do Mês</p>
          <p className="font-medium text-gray-800">{formatCurrency(data.projection)}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider opacity-60 font-semibold text-gray-600">Score</p>
          <p className="font-medium text-gray-800">{data.score}/100</p>
        </div>
      </div>
    </div>
  );
};

const CategoryProgressBar = ({ category }: { category: typeof MOCK_DATA.categories[0] }) => (
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

export default function FinancePage() {
  const [selectedMonth, setSelectedMonth] = useState("nov-2025");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Calculate totals
  const totalIncome = MOCK_DATA.income.reduce((acc, curr) => acc + curr.amount, 0);
  const totalExpenses = MOCK_DATA.expenses.reduce((acc, curr) => acc + curr.amount, 0);

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
            
            <Button 
              className="bg-green-600 hover:bg-green-700 text-white shadow-sm h-10"
              onClick={() => setIsCreateModalOpen(true)}
            >
              <PlusCircle className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Nova Transação</span>
              <span className="sm:hidden">Novo</span>
            </Button>
          </div>
        </div>
      </div>

      <CreateTransactionModal 
        open={isCreateModalOpen} 
        onOpenChange={setIsCreateModalOpen} 
      />

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
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-[180px] bg-white">
                  <Calendar className="w-4 h-4 mr-2 text-gray-500" />
                  <SelectValue placeholder="Selecione o mês" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="out-2025">Outubro 2025</SelectItem>
                  <SelectItem value="nov-2025">Novembro 2025</SelectItem>
                  <SelectItem value="dez-2025">Dezembro 2025</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon">
                 <MoreHorizontal className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <TabsContent value="overview" className="space-y-8 mt-0">
            
            {/* DIAGNOSTIC SECTION */}
            <FinancialHealthCard data={MOCK_DATA.financialHealth} />

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
                          {formatCurrency(totalIncome)}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-4 px-0">
                      <div className="space-y-1">
                        {MOCK_DATA.income.map((item) => (
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
                        ))}
                      </div>
                      <div className="px-4 pt-4">
                        <Button variant="ghost" className="w-full text-xs text-gray-500 hover:text-gray-900 h-8">
                          Ver todas as entradas
                        </Button>
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
                          {formatCurrency(totalExpenses)}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-4 px-0">
                      <div className="space-y-1">
                        {MOCK_DATA.expenses.map((item) => (
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
                        ))}
                      </div>
                      <div className="px-4 pt-4">
                        <Button variant="ghost" className="w-full text-xs text-gray-500 hover:text-gray-900 h-8">
                          Ver todas as saídas
                        </Button>
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
                    {MOCK_DATA.categories.map((cat) => (
                      <CategoryProgressBar key={cat.name} category={cat} />
                    ))}
                    
                    <Separator className="my-4" />
                    
                    <div className="rounded-lg bg-gray-50 p-4 text-center">
                      <p className="text-xs text-gray-500 mb-1">Maior gasto este mês</p>
                      <p className="font-semibold text-gray-900">Infraestrutura</p>
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
