"use client";

import { useState } from "react";
import { CreateTransactionModal } from "@/components/finance/CreateTransactionModal";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface ClientDetailsClientProps {
  clientId: string;
  workspaceId: string;
}

export function ClientDetailsClient({ clientId, workspaceId }: ClientDetailsClientProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const router = useRouter();

  const handleCreated = () => {
    router.refresh(); // Recarrega os dados da página
  };

  return (
    <>
      <Button
        size="sm"
        className="bg-green-600 hover:bg-green-700 text-white"
        onClick={() => setIsModalOpen(true)}
      >
        Nova Transação
      </Button>

      <CreateTransactionModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        initialClientId={clientId}
        initialWorkspaceId={workspaceId}
        onCreated={handleCreated}
      />
    </>
  );
}
