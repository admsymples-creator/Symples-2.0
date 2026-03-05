"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useWorkspace } from "@/components/providers/SidebarProvider";

/**
 * MinifyWorkspaceSync
 *
 * Ponte Client-Side:
 * - Observa o workspace ativo no contexto (SidebarProvider)
 * - Mantém o primeiro segmento da URL em sincronia com o workspace atual
 * - Quando o usuário troca de workspace na sidebar, atualiza a URL:
 *   /[workspaceSlugOuId]/tasks/minify
 */
export function MinifyWorkspaceSync() {
  const { activeWorkspaceId, isLoaded } = useWorkspace();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Esperar o estado inicial da sidebar carregar
    if (!isLoaded) return;

    const nextW = activeWorkspaceId || null;

    // Se ainda não há workspace ativo, não faz nada
    if (!nextW) return;

    // Exemplo de pathname: /<workspaceSlug>/tasks/minify, /<id>/tasks/minify ou /tasks/minify
    const segments = pathname.split("/").filter(Boolean);

    // Se já existe um slug/ID no primeiro segmento que não é "tasks",
    // assumimos que a URL já está friendly (/symples-1/...) e não mexemos.
    if (segments.length > 0 && segments[0] !== "tasks") {
      return;
    }

    let newSegments = [...segments];

    if (segments.length === 0) {
      // Estamos em "/", redirecionar para "/<workspaceId>"
      newSegments = [nextW];
    } else {
      // Path começa com /tasks ou similar sem slug: prefixar o workspaceId
      newSegments = [nextW, ...segments];
    }

    const nextPath = "/" + newSegments.join("/");

    if (nextPath !== pathname) {
      router.push(nextPath);
    }
  }, [activeWorkspaceId, isLoaded, pathname, router]);

  return null;
}


