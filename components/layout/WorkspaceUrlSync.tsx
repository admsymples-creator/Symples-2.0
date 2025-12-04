"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useWorkspace } from "@/components/providers/SidebarProvider";

interface WorkspaceUrlSyncProps {
    workspaces: { id: string; name: string; slug: string | null; logo_url?: string | null }[];
}

/**
 * WorkspaceUrlSync
 * 
 * Sincroniza o workspace ativo no contexto com o workspace da URL.
 * 
 * Fluxo:
 * 1. Detecta o workspace da URL (pelo slug no primeiro segmento)
 * 2. Encontra o workspace correspondente na lista de workspaces
 * 3. Atualiza o activeWorkspaceId do contexto se for diferente
 * 
 * Isso resolve o problema onde o sidebar mostra um workspace (do localStorage)
 * mas a URL mostra outro workspace (da rota).
 */
export function WorkspaceUrlSync({ workspaces }: WorkspaceUrlSyncProps) {
    const pathname = usePathname();
    const { activeWorkspaceId, setActiveWorkspaceId, isLoaded } = useWorkspace();

    useEffect(() => {
        // Esperar o estado inicial carregar
        if (!isLoaded) return;

        // Extrair o primeiro segmento da URL (workspaceSlug)
        const segments = pathname.split("/").filter(Boolean);
        
        // Se não há segmentos ou estamos em rotas sem workspace (/home, /settings)
        if (segments.length === 0 || segments[0] === "home" || segments[0] === "settings" || segments[0] === "assistant") {
            return;
        }

        const urlWorkspaceSlug = segments[0];

        // Encontrar o workspace correspondente ao slug da URL
        const urlWorkspace = workspaces.find(
            (w) => w.slug === urlWorkspaceSlug || w.id === urlWorkspaceSlug
        );

        // Se encontrou um workspace na URL e é diferente do ativo, sincronizar
        if (urlWorkspace && urlWorkspace.id !== activeWorkspaceId) {
            setActiveWorkspaceId(urlWorkspace.id);
        }
    }, [pathname, workspaces, activeWorkspaceId, setActiveWorkspaceId, isLoaded]);

    return null;
}

