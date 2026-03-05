"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useWorkspace } from "@/components/providers/SidebarProvider";

/**
 * MinifyWorkspaceSync
 *
 * Bridge Client-Server:
 * - Observa o workspace ativo no contexto (SidebarProvider)
 * - Mantém o parâmetro ?w=WORKSPACE_ID da URL sempre em sincronia
 * - Quando o usuário troca de workspace na sidebar, a URL é atualizada
 *   e a página Minify (Server Component) recarrega com o workspace correto.
 */
export function MinifyWorkspaceSync() {
  const { activeWorkspaceId } = useWorkspace();
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  useEffect(() => {
    // Se ainda não carregou workspace, não fazer nada
    if (activeWorkspaceId === undefined) return;

    const currentW = searchParams.get("w") || null;

    // Se o ID atual já está em sincronia, não faz nada
    if (currentW === (activeWorkspaceId || null)) return;

    const params = new URLSearchParams(searchParams.toString());

    if (activeWorkspaceId) {
      params.set("w", activeWorkspaceId);
    } else {
      // Se workspaceId for null, removemos o parâmetro
      params.delete("w");
    }

    const queryString = params.toString();
    const nextUrl = queryString ? `${pathname}?${queryString}` : pathname;

    router.push(nextUrl);
  }, [activeWorkspaceId, searchParams, pathname, router]);

  return null;
}




