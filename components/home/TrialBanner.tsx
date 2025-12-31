"use client";

import { AlertCircle, Clock, Zap } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useWorkspace } from "@/components/providers/SidebarProvider";

interface WorkspaceSubscription {
  id: string;
  plan: 'starter' | 'pro' | 'business' | null;
  subscription_status: 'trialing' | 'active' | 'past_due' | 'canceled' | null;
  trial_ends_at: string | null;
}

interface TrialBannerProps {
  workspace?: WorkspaceSubscription | null;
}

export function TrialBanner({ workspace }: TrialBannerProps) {
  const { activeWorkspaceId } = useWorkspace();
  const [subscriptionData, setSubscriptionData] = useState<WorkspaceSubscription | null>(workspace || null);

  // Buscar dados de subscription se não foram passados como prop
  useEffect(() => {
    if (!activeWorkspaceId || workspace) return;

    const fetchSubscription = async () => {
      try {
        const response = await fetch(`/api/workspace/subscription?workspaceId=${activeWorkspaceId}`);
        if (response.ok) {
          const data = await response.json();
          setSubscriptionData(data);
        }
      } catch (error) {
        console.error("Erro ao buscar dados de subscription:", error);
      }
    };

    fetchSubscription();
  }, [activeWorkspaceId, workspace]);

  // Se não há workspace ou não está em trial, não mostrar banner
  if (!subscriptionData || subscriptionData.subscription_status !== 'trialing') {
    return null;
  }

  const trialEndsAt = subscriptionData.trial_ends_at 
    ? new Date(subscriptionData.trial_ends_at) 
    : null;
  
  if (!trialEndsAt) {
    return null;
  }

  const now = new Date();
  const daysRemaining = Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const isExpired = daysRemaining <= 0;
  const isWarning = daysRemaining <= 3 && daysRemaining > 0;

  // Determinar cor e mensagem baseado em dias restantes
  let bgColor = "bg-blue-50";
  let borderColor = "border-blue-200";
  let textColor = "text-blue-900";
  let iconColor = "text-blue-600";
  let icon = <Zap className={`w-5 h-5 ${iconColor}`} />;
  let message = "Você está testando o Symples Business";

  if (isExpired) {
    bgColor = "bg-red-50";
    borderColor = "border-red-200";
    textColor = "text-red-900";
    iconColor = "text-red-600";
    icon = <AlertCircle className={`w-5 h-5 ${iconColor}`} />;
    message = "Trial expirado. Escolha um plano para continuar";
  } else if (isWarning) {
    bgColor = "bg-yellow-50";
    borderColor = "border-yellow-200";
    textColor = "text-yellow-900";
    iconColor = "text-yellow-600";
    icon = <Clock className={`w-5 h-5 ${iconColor}`} />;
    message = `Seu teste acaba em breve${daysRemaining === 1 ? ' (amanhã)' : ` (${daysRemaining} dias)`}`;
  }

  return (
    <div className={`${bgColor} ${borderColor} border-l-4 px-4 py-3 mb-6 rounded-r-md`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {icon}
          <p className={`${textColor} font-medium`}>
            {message}
          </p>
        </div>
        <Link
          href="/billing"
          className={`${textColor} hover:underline text-sm font-semibold`}
        >
          Ver Planos →
        </Link>
      </div>
    </div>
  );
}

