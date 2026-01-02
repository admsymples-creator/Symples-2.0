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

        // Extrair segmentos da URL
        const segments = pathname.split("/").filter(Boolean);
        
        // Se não há segmentos, não há workspace na URL
        if (segments.length === 0) return null;
        
        // Rotas que não têm workspace no primeiro segmento
        const nonWorkspaceRoutes = new Set(["settings", "assistant", "team", "planner", "finance", "tasks"]);
        
        // Caso especial: /home pode estar em /[workspaceSlug]/home ou apenas /home
        if (segments[0] === "home") {
            // Se há apenas "home", não há workspace na URL - usar contexto (retornar null para não sobrescrever)
            if (segments.length === 1) return null;
            // Se há mais segmentos, não deveria acontecer com /home
            return null;
        }
        
        // Se há 2+ segmentos, verificar se o primeiro é workspace e o segundo é rota conhecida
        // Ex: /[workspaceSlug]/home, /[workspaceSlug]/tasks
        if (segments.length >= 2) {
            const firstSegment = segments[0];
            const secondSegment = segments[1];
            
            // Se o segundo segmento é uma rota conhecida, o primeiro é workspace slug
            if (nonWorkspaceRoutes.has(secondSegment) || secondSegment === "home") {
                const urlWorkspaceSlug = firstSegment;
                return workspaces.find(
                    (w) => w.slug === urlWorkspaceSlug || w.id === urlWorkspaceSlug
                ) || null;
            }
        }
        
        // Se o primeiro segmento não é uma rota conhecida e não há segundo segmento,
        // assumir que é workspace slug (ex: /[workspaceSlug])
        if (!nonWorkspaceRoutes.has(segments[0])) {
            const urlWorkspaceSlug = segments[0];
            return workspaces.find(
                (w) => w.slug === urlWorkspaceSlug || w.id === urlWorkspaceSlug
            ) || null;
        }
        
        return null;
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

