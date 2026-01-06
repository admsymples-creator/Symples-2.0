"use client";

import { Check, X, MessageCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { updateSubscription } from "@/lib/actions/billing";
import { useWorkspace } from "@/components/providers/SidebarProvider";
import { PaymentMethodModal } from "./PaymentMethodModal";
import { useState } from "react";
import { toast } from "sonner";

interface PricingTableProps {
  currentPlan?: 'starter' | 'pro' | 'business' | 'agency' | null;
  onSelectPlan?: (plan: 'starter' | 'pro' | 'business') => void;
  isAdmin?: boolean;
}

export function PricingTable({ currentPlan, onSelectPlan, isAdmin = false }: PricingTableProps) {
  const { activeWorkspaceId } = useWorkspace();
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<{
    id: 'starter' | 'pro' | 'business';
    name: string;
    price: number;
  } | null>(null);

  const handleSelectPlanClick = (plan: { id: 'starter' | 'pro' | 'business'; name: string; price: number }) => {
    if (!activeWorkspaceId) {
      toast.error("Nenhum workspace selecionado");
      return;
    }
    setSelectedPlan(plan);
    setPaymentModalOpen(true);
  };

  const handleAgencyWhatsApp = (whatsappNumber: string) => {
    const message = encodeURIComponent(
      `Olá! Tenho interesse no plano Agency do Symples.\n\n` +
      `Gostaria de saber mais sobre preços e condições.`
    );
    window.open(`https://wa.me/${whatsappNumber}?text=${message}`, "_blank");
  };

  const handleConfirmPayment = async (billingType: "BOLETO" | "CREDIT_CARD" | "PIX") => {
    if (!activeWorkspaceId || !selectedPlan) {
      return;
    }

    setIsUpdating(selectedPlan.id);
    
    try {
      const result = await updateSubscription(activeWorkspaceId, selectedPlan.id, billingType);
      
      if (result.success) {
        // Se houver checkoutUrl (cartão de crédito), redirecionar
        if (result.checkoutUrl) {
          window.location.href = result.checkoutUrl;
          return;
        }

        toast.success(`Plano ${selectedPlan.name} selecionado com sucesso!`);
        onSelectPlan?.(selectedPlan.id);
        
        // Recarregar página para atualizar dados
        window.location.reload();
      } else {
        toast.error(result.error || "Erro ao atualizar plano");
      }
    } catch (error) {
      console.error("Erro ao selecionar plano:", error);
      toast.error("Erro ao selecionar plano. Tente novamente.");
    } finally {
      setIsUpdating(null);
      setPaymentModalOpen(false);
      setSelectedPlan(null);
    }
  };

  const plans = [
    {
      id: 'starter' as const,
      name: 'Pessoal',
      price: 49,
      description: 'Para uso individual com workspace pessoal',
      features: {
        members: '1 (Você)',
        workspaces: '1 (Pessoal)',
        extraMemberCost: 'N/A (Upgrade obrigatório)',
        whatsapp: true,
        aiTasks: '50/mês',
        financial: 'Básico',
        storage: '500 MB',
        permissions: 'Dono Apenas',
        support: 'Email'
      },
      highlight: false
    },
    {
      id: 'pro' as const,
      name: 'Pro',
      price: 69,
      description: 'Para pequenos times e sócios',
      features: {
        members: 'Até 5',
        workspaces: '2 (1 Pessoal + 1 Profissional)',
        extraMemberCost: 'N/A (Upgrade obrigatório)',
        whatsapp: true,
        aiTasks: 'Ilimitado',
        financial: 'Completo',
        storage: '5 GB',
        permissions: 'Dono/Membro',
        support: 'Email Rápido'
      },
      highlight: true
    },
    {
      id: 'business' as const,
      name: 'Business',
      price: 129,
      description: 'Para agências consolidadas',
      features: {
        members: 'Até 15',
        workspaces: '2 (1 Pessoal + 1 Profissional)',
        extraMemberCost: '+ R$ 15/mês (Opcional)',
        whatsapp: true,
        aiTasks: 'Ilimitado',
        financial: 'Completo + Exportação',
        storage: '20 GB',
        permissions: 'Admin/Viewer/Membro',
        support: 'WhatsApp VIP'
      },
      highlight: false
    },
    {
      id: 'agency' as const,
      name: 'Agency',
      price: null,
      description: 'Para agências com múltiplos clientes',
      features: {
        members: 'Ilimitado',
        workspaces: 'Vários (a combinar)',
        aiTasks: 'Ilimitado',
        financial: 'Completo + Exportação',
        storage: '20 GB por workspace',
        permissions: 'Admin/Viewer/Membro',
        support: 'WhatsApp VIP + Account Manager'
      },
      highlight: false,
      isCustomPrice: true,
      whatsappNumber: '5511999999999' // TODO: Mover para variável de ambiente
    }
  ];

  return (
    <>
      <PaymentMethodModal
        open={paymentModalOpen}
        onOpenChange={setPaymentModalOpen}
        plan={selectedPlan?.id || 'starter'}
        planName={selectedPlan?.name || ''}
        price={selectedPlan?.price || 0}
        onConfirm={handleConfirmPayment}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 mt-8">
        {plans.map((plan) => {
        const isCurrent = currentPlan === plan.id;
        
        return (
          <Card 
            key={plan.id} 
            className={`relative ${plan.highlight ? 'border-2 border-blue-500 shadow-lg' : ''} ${isCurrent ? 'bg-blue-50' : ''}`}
          >
            {plan.highlight && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-blue-500 text-white">Recomendado</Badge>
              </div>
            )}
            
            <CardHeader>
              <CardTitle className="text-2xl">{plan.name}</CardTitle>
              <CardDescription>{plan.description}</CardDescription>
              <div className="mt-4">
                {plan.price !== null ? (
                  <>
                    <span className="text-4xl font-bold">R$ {plan.price}</span>
                    <span className="text-gray-500">/mês</span>
                  </>
                ) : (
                  <span className="text-2xl font-semibold text-gray-700">Sob consulta</span>
                )}
              </div>
            </CardHeader>
            
            <CardContent>
              <ul className="space-y-3">
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">
                    <strong>Membros:</strong> {plan.features.members}
                  </span>
                </li>
                {'workspaces' in plan.features && (
                  <li className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">
                      <strong>Workspaces:</strong> {plan.features.workspaces}
                    </span>
                  </li>
                )}
                {'extraMemberCost' in plan.features && (
                  <li className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">
                      <strong>Custo Extra:</strong> {plan.features.extraMemberCost}
                    </span>
                  </li>
                )}
                {'whatsapp' in plan.features && (
                  <li className="flex items-start gap-2">
                    {plan.features.whatsapp ? (
                      <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    ) : (
                      <X className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                    )}
                    <span className="text-sm">Input via WhatsApp</span>
                  </li>
                )}
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm"><strong>Tarefas com IA:</strong> {plan.features.aiTasks}</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm"><strong>Financeiro:</strong> {plan.features.financial}</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm"><strong>Armazenamento:</strong> {plan.features.storage}</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm"><strong>Permissões:</strong> {plan.features.permissions}</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm"><strong>Suporte:</strong> {plan.features.support}</span>
                </li>
              </ul>
            </CardContent>
            
            <CardFooter>
              {isCurrent ? (
                <Button className="w-full" variant="outline" disabled>
                  Plano Atual
                </Button>
              ) : ('isCustomPrice' in plan && plan.isCustomPrice && 'whatsappNumber' in plan && plan.whatsappNumber) ? (
                isAdmin ? (
                  <Button 
                    className="w-full bg-blue-500 hover:bg-blue-600 text-white" 
                    onClick={() => handleAgencyWhatsApp(plan.whatsappNumber as string)}
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Ativar Agency (Admin)
                  </Button>
                ) : (
                  <Button 
                    className="w-full bg-green-500 hover:bg-green-600 text-white" 
                    onClick={() => handleAgencyWhatsApp(plan.whatsappNumber as string)}
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Falar no WhatsApp
                  </Button>
                )
              ) : (
                <Button 
                  className="w-full" 
                  variant={plan.highlight ? "default" : "outline"}
                  onClick={() => handleSelectPlanClick(plan as { id: 'starter' | 'pro' | 'business'; name: string; price: number })}
                  disabled={isUpdating === plan.id}
                >
                  {isUpdating === plan.id ? "Processando..." : `Escolher ${plan.name}`}
                </Button>
              )}
            </CardFooter>
          </Card>
        );
      })}
      </div>
    </>
  );
}

