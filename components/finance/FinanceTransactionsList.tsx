"use client";

import React, { useState } from "react";
import { format, parseISO } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ArrowUpCircle, ArrowDownCircle } from "lucide-react";
import { TransactionActionsMenu } from "./TransactionActionsMenu";
import { EditTransactionModal } from "./EditTransactionModal";
import { useRouter } from "next/navigation";

type TransactionStatus = "paid" | "pending" | "overdue" | "scheduled" | "cancelled";

interface Transaction {
  id: string;
  due_date: string; // Data de vencimento
  created_at?: string; // Data de criação
  description: string;
  amount: number;
  status: TransactionStatus;
  category: string;
  type: "income" | "expense";
  is_recurring?: boolean;
}

interface FinanceTransactionsListProps {
  transactions: Transaction[];
  type: "income" | "expense";
  title: string;
  icon: React.ReactNode;
  totalAmount: number;
}

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
    scheduled: "bg-blue-100 text-blue-700 hover:bg-blue-100 border-blue-200",
    cancelled: "bg-red-100 text-red-700 hover:bg-red-100 border-red-200",
  };

  const labels: Record<string, string> = {
    paid: "Pago",
    pending: "Pendente",
    overdue: "Atrasado",
    scheduled: "Agendado",
    cancelled: "Cancelado",
  };

  const safeStatus = styles[status] ? status : "pending";

  return (
    <Badge variant="outline" className={`${styles[safeStatus]} border font-normal text-xs`}>
      {labels[safeStatus] || status}
    </Badge>
  );
};

export function FinanceTransactionsList({
  transactions,
  type,
  title,
  icon,
  totalAmount,
}: FinanceTransactionsListProps) {
  const router = useRouter();
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setIsEditModalOpen(true);
  };

  const handleEditSuccess = () => {
    setIsEditModalOpen(false);
    setEditingTransaction(null);
    router.refresh();
  };

  const handleDelete = () => {
    router.refresh();
  };

          const processedTransactions = transactions.map(t => ({
            ...t,
            dueDate: format(parseISO(t.due_date), "dd/MM"),
            createdDate: t.created_at ? format(parseISO(t.created_at), "dd/MM/yyyy") : undefined,
          }));

  return (
    <>
      <Card className="border-none shadow-sm ring-1 ring-gray-200">
        <CardHeader className="pb-3 border-b border-gray-50">
          <div className="flex justify-between items-center">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              {icon}
              {title}
            </CardTitle>
            <span className={cn(
              "font-bold text-sm",
              type === "income" ? "text-green-600" : "text-red-600"
            )}>
              {formatCurrency(totalAmount)}
            </span>
          </div>
        </CardHeader>
        <CardContent className="pt-4 px-0">
          <div className="space-y-1">
            {processedTransactions.length === 0 ? (
              <p className="text-center text-gray-400 py-4 text-sm">
                Nenhuma {type === "income" ? "entrada" : "saída"} neste mês
              </p>
            ) : (
              processedTransactions.map((item) => (
                <div 
                  key={item.id} 
                  className="flex items-center justify-between py-3 px-4 hover:bg-gray-50 transition-colors group"
                >
                  <div className="flex flex-col gap-0.5 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400 font-mono">Venc: {item.dueDate}</span>
                      {item.createdDate && (
                        <span className="text-xs text-gray-300 font-mono">• Criado: {item.createdDate}</span>
                      )}
                    </div>
                    <span className="font-medium text-sm text-gray-900">{item.description}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex flex-col items-end gap-1">
                      <span className={cn(
                        "font-semibold text-sm",
                        type === "income" ? "text-green-600" : "text-gray-900"
                      )}>
                        {type === "income" ? "+" : "-"} {formatCurrency(item.amount)}
                      </span>
                      <StatusBadge status={item.status} />
                    </div>
                    <TransactionActionsMenu
                      transaction={item}
                      onEdit={() => handleEdit(item)}
                      onDeleted={handleDelete}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {editingTransaction && (
        <EditTransactionModal
          open={isEditModalOpen}
          onOpenChange={setIsEditModalOpen}
          transaction={editingTransaction as any}
          onSuccess={handleEditSuccess}
        />
      )}
    </>
  );
}

