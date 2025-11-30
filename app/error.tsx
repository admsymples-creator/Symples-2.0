"use client";

import { StatePage } from "@/components/ui/StatePage";
import { AlertTriangle } from "lucide-react";
import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <StatePage
      icon={AlertTriangle}
      title="Algo deu errado"
      description="Encontramos um erro inesperado ao processar sua solicitação."
      actionLabel="Tentar novamente"
      onAction={reset}
      variant="danger"
    />
  );
}


