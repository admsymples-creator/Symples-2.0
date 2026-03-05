import { NextRequest, NextResponse } from 'next/server';
import { createServerActionClient } from '@/lib/supabase/server';
import type { AsaasWebhookEvent } from '@/lib/integrations/asaas/types';

/**
 * Webhook do Asaas para receber eventos de pagamento e assinatura
 * 
 * Configurar no painel do Asaas:
 * - URL: https://seu-dominio.com/api/webhooks/asaas
 * - Eventos: PAYMENT_*, SUBSCRIPTION_*
 */
export async function POST(request: NextRequest) {
  try {
    // Verificar token de autenticação do webhook (se configurado)
    const webhookToken = request.headers.get('x-asaas-webhook-token');
    const expectedToken = process.env.ASAAS_WEBHOOK_TOKEN;

    if (expectedToken && webhookToken !== expectedToken) {
      return NextResponse.json(
        { error: 'Token inválido' },
        { status: 401 }
      );
    }

    const event: AsaasWebhookEvent = await request.json();

    console.log('[Asaas Webhook] Evento recebido:', event.event);

    // Processar eventos de pagamento
    if (event.payment) {
      await handlePaymentEvent(event);
    }

    // Processar eventos de assinatura
    if (event.subscription) {
      await handleSubscriptionEvent(event);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[Asaas Webhook] Erro ao processar evento:', error);
    return NextResponse.json(
      { error: 'Erro ao processar webhook' },
      { status: 500 }
    );
  }
}

/**
 * Processa eventos de pagamento
 */
async function handlePaymentEvent(event: AsaasWebhookEvent) {
  if (!event.payment) return;

  const { payment } = event;
  const workspaceId = payment.externalReference;

  if (!workspaceId) {
    console.warn('[Asaas Webhook] Pagamento sem externalReference (workspaceId)');
    return;
  }

  const supabase = await createServerActionClient();

  // Mapear status do pagamento para status da assinatura
  let subscriptionStatus: 'trialing' | 'active' | 'past_due' | 'canceled' = 'trialing';

  switch (event.event) {
    case 'PAYMENT_CONFIRMED':
    case 'PAYMENT_RECEIVED':
      subscriptionStatus = 'active';
      break;
    case 'PAYMENT_OVERDUE':
      subscriptionStatus = 'past_due';
      break;
    case 'PAYMENT_DELETED':
    case 'PAYMENT_REFUNDED':
      // Não cancelar assinatura por causa de um pagamento, apenas marcar como past_due
      subscriptionStatus = 'past_due';
      break;
    default:
      // Outros eventos não alteram o status
      return;
  }

  // Atualizar status do workspace
  await supabase
    .from('workspaces')
    .update({
      subscription_status: subscriptionStatus,
    })
    .eq('id', workspaceId);

  console.log(`[Asaas Webhook] Workspace ${workspaceId} atualizado para status: ${subscriptionStatus}`);
}

/**
 * Processa eventos de assinatura
 */
async function handleSubscriptionEvent(event: AsaasWebhookEvent) {
  if (!event.subscription) return;

  const { subscription } = event;
  const workspaceId = subscription.externalReference;

  if (!workspaceId) {
    console.warn('[Asaas Webhook] Assinatura sem externalReference (workspaceId)');
    return;
  }

  const supabase = await createServerActionClient();

  // Mapear status da assinatura
  let subscriptionStatus: 'trialing' | 'active' | 'past_due' | 'canceled' = 'active';

  switch (subscription.status) {
    case 'ACTIVE':
      subscriptionStatus = 'active';
      break;
    case 'INACTIVE':
    case 'EXPIRED':
      subscriptionStatus = 'canceled';
      break;
    case 'OVERDUE':
      subscriptionStatus = 'past_due';
      break;
  }

  // Atualizar workspace
  await supabase
    .from('workspaces')
    .update({
      subscription_status: subscriptionStatus,
      subscription_id: subscription.id,
    })
    .eq('id', workspaceId);

  console.log(`[Asaas Webhook] Assinatura ${subscription.id} do workspace ${workspaceId} atualizada para: ${subscriptionStatus}`);
}

