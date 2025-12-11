"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";

interface OnboardingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAction: () => void;
}

const WELCOME_SEEN_KEY = 'symples-welcome-seen';

export function OnboardingModal({ open, onOpenChange, onAction }: OnboardingModalProps) {
  const handleClose = () => {
    // Marcar como visto no localStorage
    localStorage.setItem(WELCOME_SEEN_KEY, 'true');
    onOpenChange(false);
  };

  const handleAction = () => {
    // Marcar como visto quando o usuário clica no botão de ação
    localStorage.setItem(WELCOME_SEEN_KEY, 'true');
    onAction();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[540px] p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="text-2xl font-bold text-gray-900 text-center">
            Sua operação, finalmente sob controle
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 pb-6 space-y-6">
          {/* Illustration */}
          <div className="flex items-center justify-center">
            <div className="relative w-full h-[200px] rounded-lg overflow-hidden flex items-center justify-center">
              <img 
                src="/welcome-popup.svg" 
                alt="Organização de dados"
                className="w-full h-full object-contain p-4"
              />
            </div>
          </div>

          {/* Body Copy */}
          <DialogDescription className="text-center text-base text-gray-600 leading-relaxed px-4">
            Chega de perder demandas no WhatsApp. O Symples centraliza seu caos em clareza. Vamos criar sua primeira demanda?
          </DialogDescription>

          {/* CTA Button */}
          <div className="flex justify-center pt-2">
            <Button
              onClick={handleAction}
              className="bg-green-600 hover:bg-green-700 text-white font-medium px-8 py-6 text-base"
            >
              Fechar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Hook para verificar se o modal deve ser exibido
export function useShouldShowOnboarding(hasTasks: boolean, inviteAccepted?: boolean): boolean {
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    // ✅ CORREÇÃO CRÍTICA: Se um convite foi aceito, NUNCA mostrar onboarding
    // Usuários convidados não devem ver o onboarding modal
    if (inviteAccepted) {
      setShouldShow(false);
      return;
    }
    
    // Verificar também o cookie de invite recém-aceito
    const getCookie = (name: string) => {
      if (typeof document === 'undefined') return null;
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop()?.split(';').shift();
      return null;
    };
    
    const newlyAcceptedWorkspaceId = getCookie('newly_accepted_workspace_id');
    if (newlyAcceptedWorkspaceId) {
      setShouldShow(false);
      return;
    }
    
    if (hasTasks) {
      setShouldShow(false);
      return;
    }

    // Verificar se já foi visto
    // Se não tem tarefas e não foi visto, mostrar o modal
    const seen = localStorage.getItem(WELCOME_SEEN_KEY);
    setShouldShow(seen !== 'true');
  }, [hasTasks, inviteAccepted]);

  return shouldShow;
}
