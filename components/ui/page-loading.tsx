"use client";

import { Loader2 } from "lucide-react";

export function PageLoading() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-gray-400" />
        <p className="text-sm text-gray-500">Carregando...</p>
      </div>
    </div>
  );
}

