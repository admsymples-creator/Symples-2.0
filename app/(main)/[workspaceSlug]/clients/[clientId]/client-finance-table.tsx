"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { EditTransactionModal } from "@/components/finance/EditTransactionModal";
import { PenLine } from "lucide-react";
import { updateTransaction } from "@/lib/actions/finance";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type Transaction = {
  id: string;
  description: string;
  category: string;
  status: "paid" | "pending" | "scheduled" | "cancelled";
  amount: number;
  type: "income" | "expense";
  due_date?: string | null;
  created_at?: string | null;
  is_recurring?: boolean;
  counterparty_name?: string | null;
  client_id?: string | null;
  workspace_id?: string | null;
};

const STATUS_LABELS: Record<Transaction["status"], string> = {
  paid: "Pago",
  pending: "Pendente",
  scheduled: "Agendado",
  cancelled: "Cancelado",
};

const STATUS_BADGE_CLASSES: Record<Transaction["status"], string> = {
  paid: "bg-green-100 text-green-700 hover:bg-green-200 border-green-200",
  pending: "bg-yellow-100 text-yellow-700 hover:bg-yellow-200 border-yellow-200",
  scheduled: "bg-blue-100 text-blue-700 hover:bg-blue-200 border-blue-200",
  cancelled: "bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-200",
};

interface ClientFinanceTableProps {
  transactions: Transaction[];
}

export function ClientFinanceTable({ transactions }: ClientFinanceTableProps) {
  const [items, setItems] = useState<Transaction[]>(transactions);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const currencyFormatter = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  const handleStatusChange = async (id: string, nextStatus: Transaction["status"]) => {
    const previous = items.find((t) => t.id === id);
    if (!previous || previous.status === nextStatus) return;

    setItems((prev) => prev.map((t) => (t.id === id ? { ...t, status: nextStatus } : t)));
    setSavingId(id);

    const result = await updateTransaction(id, { status: nextStatus });
    if (!result.success) {
      setItems((prev) => prev.map((t) => (t.id === id ? { ...t, status: previous.status } : t)));
      toast.error(result.error || "Erro ao atualizar status");
    } else {
      toast.success("Status atualizado");
    }

    setSavingId(null);
  };

  const handleEdit = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setEditOpen(true);
  };

  const handleEditSuccess = (updated?: Transaction) => {
    if (updated) {
      setItems((prev) => prev.map((t) => (t.id === updated.id ? { ...t, ...updated } : t)));
    }
    setEditOpen(false);
  };

  const formatDateSafe = (value?: string | null) => {
    if (!value) return "--";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "--";
    return format(date, "dd/MM/yyyy", { locale: ptBR });
  };

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-100">
            <tr>
              <th className="px-4 py-3">Data</th>
              <th className="px-4 py-3">Descrição</th>
              <th className="px-4 py-3">Categoria</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Ações</th>
              <th className="px-4 py-3 text-right">Valor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.map((t) => (
              <tr key={t.id} className="hover:bg-gray-50/50 transition-colors h-[52px]">
                <td className="px-4 py-3 text-gray-600">
                  {formatDateSafe(t.due_date || t.created_at)}
                </td>
                <td className="px-4 py-3 font-medium text-gray-900">{t.description}</td>
                <td className="px-4 py-3 text-gray-500">
                  <Badge variant="outline" className="font-normal text-xs">
                    {t.category}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <Select
                    value={t.status}
                    onValueChange={(value) => handleStatusChange(t.id, value as Transaction["status"])}
                    disabled={savingId === t.id}
                  >
                    <SelectTrigger className="h-7 w-[130px] text-xs">
                      <SelectValue>
                        <Badge className={`font-normal text-xs capitalize ${STATUS_BADGE_CLASSES[t.status]}`} variant="outline">
                          {STATUS_LABELS[t.status]}
                        </Badge>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {(["paid", "pending", "scheduled", "cancelled"] as Transaction["status"][]).map((status) => (
                        <SelectItem key={status} value={status}>
                          {STATUS_LABELS[status]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
                <td className="px-4 py-3 text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => handleEdit(t)}
                    aria-label="Editar transação"
                  >
                    <PenLine className="h-3.5 w-3.5" />
                  </Button>
                </td>
              <td className={`px-4 py-3 text-right font-medium ${t.type === "income" ? "text-green-600" : "text-red-600"}`}>
                {t.type === "income" ? "+" : "-"}
                {currencyFormatter.format(Number(t.amount))}
              </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <EditTransactionModal
        open={editOpen}
        onOpenChange={setEditOpen}
        transaction={selectedTransaction as any}
        onSuccess={handleEditSuccess}
      />
    </>
  );
}
