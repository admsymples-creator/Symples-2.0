"use client";

import { useEffect, useMemo, startTransition } from "react";
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

    // Memoizar cálculo do workspace da URL para evitar recálculos desnecessários
    const urlWorkspace = useMemo(() => {
        if (!isLoaded) return null;

        // Extrair o primeiro segmento da URL (workspaceSlug)
        const segments = pathname.split("/").filter(Boolean);
        
        // Se não há segmentos ou estamos em rotas sem workspace (/home, /settings)
        if (segments.length === 0 || segments[0] === "home" || segments[0] === "settings" || segments[0] === "assistant") {
            return null;
        }

        const urlWorkspaceSlug = segments[0];

        // Encontrar o workspace correspondente ao slug da URL
        return workspaces.find(
            (w) => w.slug === urlWorkspaceSlug || w.id === urlWorkspaceSlug
        ) || null;
    }, [pathname, workspaces, isLoaded]);

    useEffect(() => {
        // Guard: evitar atualização se workspace já está correto ou não há workspace na URL
        if (!isLoaded || !urlWorkspace || urlWorkspace.id === activeWorkspaceId) {
            return;
        }

        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/3cb1781a-45f3-4822-84f0-70123428e0e4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'WorkspaceUrlSync.tsx:48',message:'WorkspaceUrlSync updating activeWorkspaceId',data:{from:activeWorkspaceId,to:urlWorkspace.id,pathname},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'B'})}).catch(()=>{});
        // #endregion

        // Usar startTransition para tornar atualização não-bloqueante e evitar re-renders em cascata
        startTransition(() => {
            setActiveWorkspaceId(urlWorkspace.id);
        });
    }, [urlWorkspace, activeWorkspaceId, setActiveWorkspaceId, isLoaded, pathname]);

    return null;
}

