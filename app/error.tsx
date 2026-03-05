"use client";

import { AlertTriangle } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

function isChunkLoadError(error: Error): boolean {
  const msg = error?.message ?? "";
  return (
    msg.includes("Failed to load chunk") ||
    msg.includes("Loading chunk") ||
    msg.includes("ChunkLoadError")
  );
}

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

  const isChunkError = isChunkLoadError(error);

  const handleRetry = () => {
    if (isChunkError) {
      window.location.reload();
    } else {
      reset();
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="p-4 rounded-full mb-6 bg-red-50">
        <AlertTriangle className="size-16 text-red-600" />
      </div>

      <h1 className="text-2xl font-bold text-gray-900 mb-2">Algo deu errado</h1>
      <p className="text-gray-500 max-w-md mx-auto mb-8">
        {isChunkError
          ? "Uma atualização do app pode ter deixado esta página desatualizada. Recarregue para carregar a versão mais recente."
          : "Encontramos um erro inesperado ao processar sua solicitação."}
      </p>

      <Button variant="destructive" onClick={handleRetry}>
        {isChunkError ? "Recarregar página" : "Tentar novamente"}
      </Button>
    </div>
  );
}


