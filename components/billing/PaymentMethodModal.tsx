"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CreditCard, QrCode, FileText } from "lucide-react";
import { toast } from "sonner";

interface PaymentMethodModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: 'starter' | 'pro' | 'business';
  planName: string;
  price: number;
  onConfirm: (billingType: "BOLETO" | "CREDIT_CARD" | "PIX") => void;
}

export function PaymentMethodModal({
  open,
  onOpenChange,
  plan,
  planName,
  price,
  onConfirm,
}: PaymentMethodModalProps) {
  const [selectedMethod, setSelectedMethod] = useState<"BOLETO" | "CREDIT_CARD" | "PIX">("PIX");

  const handleConfirm = () => {
    onConfirm(selectedMethod);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Escolha o método de pagamento</DialogTitle>
          <DialogDescription>
            Selecione como deseja pagar o plano {planName} (R$ {price.toFixed(2).replace('.', ',')}/mês)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 mt-4">
          <button
            onClick={() => setSelectedMethod("PIX")}
            className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
              selectedMethod === "PIX"
                ? "border-emerald-500 bg-emerald-50"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <div className="flex items-center gap-3">
              <QrCode className={`w-5 h-5 ${selectedMethod === "PIX" ? "text-emerald-600" : "text-gray-400"}`} />
              <div className="flex-1">
                <div className="font-semibold text-gray-900">PIX</div>
                <div className="text-sm text-gray-500">Aprovação imediata</div>
              </div>
              {selectedMethod === "PIX" && (
                <div className="w-4 h-4 rounded-full bg-emerald-500 border-2 border-white"></div>
              )}
            </div>
          </button>

          <button
            onClick={() => setSelectedMethod("CREDIT_CARD")}
            className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
              selectedMethod === "CREDIT_CARD"
                ? "border-emerald-500 bg-emerald-50"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <div className="flex items-center gap-3">
              <CreditCard className={`w-5 h-5 ${selectedMethod === "CREDIT_CARD" ? "text-emerald-600" : "text-gray-400"}`} />
              <div className="flex-1">
                <div className="font-semibold text-gray-900">Cartão de Crédito</div>
                <div className="text-sm text-gray-500">Cobrança automática mensal</div>
              </div>
              {selectedMethod === "CREDIT_CARD" && (
                <div className="w-4 h-4 rounded-full bg-emerald-500 border-2 border-white"></div>
              )}
            </div>
          </button>

          <button
            onClick={() => setSelectedMethod("BOLETO")}
            className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
              selectedMethod === "BOLETO"
                ? "border-emerald-500 bg-emerald-50"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <div className="flex items-center gap-3">
              <FileText className={`w-5 h-5 ${selectedMethod === "BOLETO" ? "text-emerald-600" : "text-gray-400"}`} />
              <div className="flex-1">
                <div className="font-semibold text-gray-900">Boleto Bancário</div>
                <div className="text-sm text-gray-500">Vencimento em 3 dias úteis</div>
              </div>
              {selectedMethod === "BOLETO" && (
                <div className="w-4 h-4 rounded-full bg-emerald-500 border-2 border-white"></div>
              )}
            </div>
          </button>
        </div>

        <div className="flex gap-3 mt-6">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700"
          >
            Confirmar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

