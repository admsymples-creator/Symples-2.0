"use client";

import { useEffect } from "react";
import { useWorkspace } from "@/components/providers/SidebarProvider";

/**
 * Componente que sincroniza o workspace ativo após aceitar um convite.
 * Lê o cookie 'newly_accepted_workspace_id' setado pelo servidor e atualiza
 * o contexto do SidebarProvider.
 */
export function WorkspaceSyncAfterInvite() {
  const { setActiveWorkspaceId } = useWorkspace();

  useEffect(() => {
    // Função para ler cookie
    const getCookie = (name: string): string | null => {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) {
        return parts.pop()?.split(';').shift() || null;
      }
      return null;
    };

    // Ler cookie setado pelo servidor após aceitar convite
    const newlyAcceptedWorkspaceId = getCookie('newly_accepted_workspace_id');

    if (newlyAcceptedWorkspaceId) {
      // Atualizar workspace ativo no contexto (que também atualiza localStorage)
      setActiveWorkspaceId(newlyAcceptedWorkspaceId);

      // Limpar o cookie (já foi consumido)
      document.cookie = 'newly_accepted_workspace_id=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';

      console.log("✅ Workspace ativo atualizado para:", newlyAcceptedWorkspaceId);
    }
  }, [setActiveWorkspaceId]);

  return null; // Componente não renderiza nada
}






