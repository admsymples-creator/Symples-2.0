"use client";

import { useEffect, useMemo, useRef } from "react";
import { usePathname } from "next/navigation";
import { useWorkspace, useWorkspaceLoading } from "@/components/providers/SidebarProvider";

interface WorkspaceUrlSyncProps {
    workspaces: { id: string; name: string; slug: string | null; logo_url?: string | null }[];
}

export function WorkspaceUrlSync({ workspaces }: WorkspaceUrlSyncProps) {
    const pathname = usePathname();
    const {
        activeWorkspaceId,
        setActiveWorkspaceId,
        isLoaded,
    } = useWorkspace();
    const { isSwitchingWorkspace, setIsSwitchingWorkspace } = useWorkspaceLoading();

    // Memoizar cálculo do workspace da URL
    const urlWorkspace = useMemo(() => {
        if (!isLoaded) return null;
        const segments = pathname.split("/").filter(Boolean);
        if (segments.length === 0) return null;

        const nonWorkspaceRoutes = new Set(["login", "register", "onboarding", "invite", "auth"]);
        if (nonWorkspaceRoutes.has(segments[0])) return null;

        const slugOrId = segments[0];
        return workspaces.find(w => w.id === slugOrId || w.slug === slugOrId) || null;
    }, [pathname, isLoaded, workspaces]);

    useEffect(() => {
        // --- A REGRA DE OURO (CLÁUSULA DE SILÊNCIO) ---
        // Se o SidebarProvider (Mestre) já ativou o loading para uma troca,
        // o Sync (Escravo) deve ficar QUIETO.
        // Isso impede conflitos de estado e piscadas.
        if (!isLoaded || !urlWorkspace) return;

        // --- A REGRA DE OURO REVISADA ---
        // Se for o primeiro render (activeWorkspaceId is null), permitimos o sync mesmo com loading ativo (Splash Screen).
        // Caso contrário, respeitamos o loading do provider.

        // Se detectamos divergência
        if (urlWorkspace.id !== activeWorkspaceId) {

            // Se for o primeiro render (mount) ou o workspace ativo estiver vazio (null), não mostramos o loading.
            // Assumimos que o SSR já entregou a página correta (hydration), então apenas atualizamos o estado silenciosamente.
            if (!activeWorkspaceId) {
                console.debug("[WorkspaceUrlSync] Initial sync (silent)", urlWorkspace.id);
                setActiveWorkspaceId(urlWorkspace.id);
                return;
            }

            // Se o Provider já está trocando, abortamos (exceto initial sync acima)
            if (isSwitchingWorkspace) return;

            // Ativa o bloqueio visual

            // Ativa o bloqueio visual
            setIsSwitchingWorkspace(true);

            // Usa requestAnimationFrame para garantir que a UI bloqueou ANTES de trocar o ID
            requestAnimationFrame(() => {
                setActiveWorkspaceId(urlWorkspace.id);
            });
        }
    }, [
        urlWorkspace,
        activeWorkspaceId,
        isLoaded,
        isSwitchingWorkspace, // Importante: Reage se o loading terminar
        setIsSwitchingWorkspace,
        setActiveWorkspaceId
    ]);

    return null;
}