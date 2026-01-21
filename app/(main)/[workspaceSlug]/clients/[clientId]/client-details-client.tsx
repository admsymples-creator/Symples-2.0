"use client";

import { useState } from "react";
import { CreateTransactionModal } from "@/components/finance/CreateTransactionModal";
import { useRouter } from "next/navigation";

interface ClientDetailsClientProps {
  clientId: string;
  workspaceId: string;
  children: (props: { onOpenModal: () => void }) => React.ReactNode;
}

export function ClientDetailsClient({ clientId, workspaceId, children }: ClientDetailsClientProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const router = useRouter();

  const handleCreated = () => {
    router.refresh(); // Recarrega os dados da página
  };

  return (
    <>
      {children({ onOpenModal: () => setIsModalOpen(true) })}
      
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
