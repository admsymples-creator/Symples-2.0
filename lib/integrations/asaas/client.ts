import { AsaasCustomer, AsaasSubscription, AsaasSubscriptionResponse } from "./types";

// Detecção automática de ambiente: sandbox para dev, produção para prod
const ASAAS_API_URL = process.env.ASAAS_API_URL || 
  (process.env.NODE_ENV === "production" 
    ? "https://api.asaas.com/v3" 
    : "https://sandbox.asaas.com/api/v3");
const ASAAS_API_KEY = process.env.ASAAS_API_KEY;

if (!ASAAS_API_KEY) {
  console.warn("⚠️ ASAAS_API_KEY não configurada. Integração com Asaas desabilitada.");
}

/**
 * Cliente para integração com Asaas API
 */
class AsaasClient {
  private apiKey: string | undefined;
  private baseUrl: string;

  constructor() {
    this.apiKey = ASAAS_API_KEY;
    this.baseUrl = ASAAS_API_URL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    if (!this.apiKey) {
      throw new Error("ASAAS_API_KEY não configurada");
    }

    const url = `${this.baseUrl}${endpoint}`;
    
    // Asaas API v3 usa o header 'access_token' para autenticação
    // Alternativa: usar 'Authorization: Bearer {token}' se a primeira não funcionar
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        "access_token": this.apiKey || "",
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: "Erro desconhecido" }));
      throw new Error(`Asaas API Error: ${error.message || response.statusText}`);
    }

    return response.json();
  }

  /**
   * Cria ou atualiza um cliente no Asaas
   */
  async createOrUpdateCustomer(customer: AsaasCustomer): Promise<string> {
    // Se já tem ID, atualiza
    if (customer.id) {
      await this.request(`/customers/${customer.id}`, {
        method: "PUT",
        body: JSON.stringify(customer),
      });
      return customer.id;
    }

    // Verifica se cliente já existe pelo email
    try {
      const existing = await this.request<{ data: Array<{ id: string }> }>(
        `/customers?email=${encodeURIComponent(customer.email)}`
      );

      if (existing.data && existing.data.length > 0) {
        // Atualiza cliente existente
        await this.request(`/customers/${existing.data[0].id}`, {
          method: "PUT",
          body: JSON.stringify(customer),
        });
        return existing.data[0].id;
      }
    } catch (error) {
      // Se não encontrar cliente, continua para criar novo
      console.log("Cliente não encontrado, criando novo:", error);
    }

    // Cria novo cliente
    const newCustomer = await this.request<{ id: string }>("/customers", {
      method: "POST",
      body: JSON.stringify(customer),
    });

    return newCustomer.id;
  }

  /**
   * Cria uma assinatura no Asaas
   */
  async createSubscription(
    subscription: AsaasSubscription
  ): Promise<AsaasSubscriptionResponse> {
    return this.request<AsaasSubscriptionResponse>("/subscriptions", {
      method: "POST",
      body: JSON.stringify(subscription),
    });
  }

  /**
   * Atualiza uma assinatura no Asaas
   */
  async updateSubscription(
    subscriptionId: string,
    updates: Partial<AsaasSubscription>
  ): Promise<AsaasSubscriptionResponse> {
    return this.request<AsaasSubscriptionResponse>(`/subscriptions/${subscriptionId}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    });
  }

  /**
   * Cancela uma assinatura no Asaas
   */
  async cancelSubscription(subscriptionId: string): Promise<void> {
    await this.request(`/subscriptions/${subscriptionId}`, {
      method: "DELETE",
    });
  }

  /**
   * Busca uma assinatura pelo ID
   */
  async getSubscription(subscriptionId: string): Promise<AsaasSubscriptionResponse> {
    return this.request<AsaasSubscriptionResponse>(`/subscriptions/${subscriptionId}`);
  }
}

export const asaasClient = new AsaasClient();

