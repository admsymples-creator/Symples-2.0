"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useWorkspace } from "@/components/providers/SidebarProvider";
import { useWorkspacesManager } from "@/components/providers/WorkspacesProvider";
import { getUserWorkspaces } from "@/lib/actions/user";

/**
 * Componente que sincroniza o workspace ativo após aceitar um convite.
 * Lê o cookie 'newly_accepted_workspace_id' setado pelo servidor e atualiza
 * o contexto do SidebarProvider.
 */
export function WorkspaceSyncAfterInvite() {
  const { activeWorkspaceId, setActiveWorkspaceId } = useWorkspace();
  const { setWorkspaces } = useWorkspacesManager();
  const pathname = usePathname();

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
      if (newlyAcceptedWorkspaceId !== activeWorkspaceId) {
        // Atualizar workspace ativo no contexto (que tambem atualiza localStorage)
        setActiveWorkspaceId(newlyAcceptedWorkspaceId);
        console.log("Workspace ativo atualizado para:", newlyAcceptedWorkspaceId);
      }

      getUserWorkspaces()
        .then((nextWorkspaces) => setWorkspaces(nextWorkspaces || []))
        .catch((error) => {
          console.error("Erro ao atualizar lista de workspaces:", error);
        });

      // Limpar o cookie (ja foi consumido)
      document.cookie = 'newly_accepted_workspace_id=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    }
  }, [activeWorkspaceId, pathname, setActiveWorkspaceId, setWorkspaces]);

  return null; // Componente não renderiza nada
}






