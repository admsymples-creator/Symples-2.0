"use client";

import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface WelcomeEmptyStateProps {
  workspaceName?: string;
  onAction: () => void;
}

export function WelcomeEmptyState({ workspaceName, onAction }: WelcomeEmptyStateProps) {
  const displayName = workspaceName || "Minha Semana";

  return (
    <Card className="bg-white border border-gray-200 shadow-sm p-12 max-w-2xl mx-auto">
      <div className="flex flex-col items-center text-center space-y-6">
        {/* Icon */}
        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-green-50">
          <Sparkles className="w-8 h-8 text-green-600" />
        </div>

        {/* Title */}
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-gray-900">
            Bem-vindo ao {displayName}!
          </h2>
          <p className="text-base text-gray-600">
            Tudo pronto para começar? Crie sua primeira tarefa ou explore o menu.
          </p>
        </div>

        {/* CTA Button */}
        <Button
          onClick={onAction}
          className="bg-green-600 hover:bg-green-700 text-white font-medium px-6 py-6 text-base"
        >
          Criar minha primeira tarefa
        </Button>
      </div>
    </Card>
  );
}

