"use client";

import { AlertTriangle } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

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
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="p-4 rounded-full mb-6 bg-red-50">
        <AlertTriangle className="size-16 text-red-600" />
      </div>

      <h1 className="text-2xl font-bold text-gray-900 mb-2">Algo deu errado</h1>
      <p className="text-gray-500 max-w-md mx-auto mb-8">
        Encontramos um erro inesperado ao processar sua solicitação.
      </p>

      <Button variant="destructive" onClick={reset}>
        Tentar novamente
      </Button>
    </div>
  );
}


