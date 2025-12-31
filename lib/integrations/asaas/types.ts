// Tipos para integração com Asaas API

export interface AsaasCustomer {
  id?: string;
  name: string;
  email: string;
  phone?: string;
  cpfCnpj?: string;
  postalCode?: string;
  address?: string;
  addressNumber?: string;
  complement?: string;
  province?: string;
  city?: string;
  state?: string;
}

export interface AsaasSubscription {
  id?: string;
  customer: string; // ID do cliente no Asaas
  billingType: "BOLETO" | "CREDIT_CARD" | "PIX" | "DEBIT_CARD";
  value: number;
  nextDueDate: string; // YYYY-MM-DD
  cycle: "WEEKLY" | "BIWEEKLY" | "MONTHLY" | "QUARTERLY" | "SEMIANNUALLY" | "YEARLY";
  description?: string;
  externalReference?: string; // ID do workspace
  split?: Array<{
    walletId: string;
    totalValue: number;
    percentualValue?: number;
    fixedValue?: number;
  }>;
}

export interface AsaasSubscriptionResponse {
  id: string;
  customer: string;
  billingType: string;
  value: number;
  nextDueDate: string;
  cycle: string;
  description: string;
  status: "ACTIVE" | "INACTIVE" | "EXPIRED" | "OVERDUE";
  externalReference: string;
  createdAt: string;
  updatedAt: string;
}

export interface AsaasWebhookEvent {
  event: 
    | "PAYMENT_CREATED"
    | "PAYMENT_UPDATED"
    | "PAYMENT_CONFIRMED"
    | "PAYMENT_RECEIVED"
    | "PAYMENT_OVERDUE"
    | "PAYMENT_DELETED"
    | "PAYMENT_RESTORED"
    | "PAYMENT_REFUNDED"
    | "PAYMENT_CHARGEBACK_REQUESTED"
    | "PAYMENT_CHARGEBACK_DISPUTE"
    | "PAYMENT_AWAITING_RISK_ANALYSIS"
    | "PAYMENT_APPROVED_BY_RISK_ANALYSIS"
    | "PAYMENT_REPROVED_BY_RISK_ANALYSIS"
    | "PAYMENT_PENDING_REFUND"
    | "PAYMENT_REFUNDED"
    | "PAYMENT_REFUND_FAILED"
    | "PAYMENT_CHARGEBACK_LOST"
    | "PAYMENT_CHARGEBACK_REVERSED"
    | "PAYMENT_ANTICIPATION_REQUESTED"
    | "PAYMENT_ANTICIPATION_APPROVED"
    | "PAYMENT_ANTICIPATION_REJECTED"
    | "SUBSCRIPTION_CREATED"
    | "SUBSCRIPTION_UPDATED"
    | "SUBSCRIPTION_DELETED";
  payment?: {
    id: string;
    customer: string;
    subscription?: string;
    billingType: string;
    value: number;
    netValue: number;
    originalValue: number;
    interestValue: number;
    description: string;
    status: string;
    dueDate: string;
    originalDueDate: string;
    paymentDate?: string;
    clientPaymentDate?: string;
    invoiceUrl: string;
    bankSlipUrl?: string;
    transactionReceiptUrl?: string;
    invoiceNumber: string;
    externalReference: string;
  };
  subscription?: {
    id: string;
    customer: string;
    billingType: string;
    value: number;
    nextDueDate: string;
    cycle: string;
    description: string;
    status: string;
    externalReference: string;
  };
}

