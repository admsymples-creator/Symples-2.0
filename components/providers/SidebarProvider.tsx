"use client";

import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

type AppContextType = {
    isCollapsed: boolean;
    toggleSidebar: () => void;
    activeWorkspaceId: string | null;
    setActiveWorkspaceId: (id: string) => void;
    isLoaded: boolean;
};

const AppContext = createContext<AppContextType | undefined>(undefined);
const UIContext = createContext<{
    isSwitchingWorkspace: boolean;
    setIsSwitchingWorkspace: (value: boolean) => void;
} | undefined>(undefined);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
    // --- ESTADOS ---
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);
    const [isSwitchingWorkspace, setIsSwitchingWorkspace] = useState(true); // Default TRUE para Splash Screen imediata
    const [isMounted, setIsMounted] = useState(false);

    // Hooks de navegação para detectar quando a rota mudou
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // Ref para rastrear o pathname anterior e detectar mudanças reais
    const prevPathnameRef = useRef(pathname);

    // 1. Hidratação Inicial
    useEffect(() => {
        const savedSidebar = localStorage.getItem("sidebar-state");
        if (savedSidebar) setIsCollapsed(savedSidebar === "true");

        const savedWorkspace = localStorage.getItem("active-workspace-id");
        if (savedWorkspace) {
            // Usa update funcional para não sobrescrever se o URLSync já definiu o workspace correto
            setActiveWorkspaceId(prev => prev || savedWorkspace);
        }

        setIsMounted(true);

        // Desligar o Splash Screen inicial após hidratação e pequeno delay
        // Isso garante que o usuário veja o loading antes de qualquer conteúdo
        const timer = setTimeout(() => {
            setIsSwitchingWorkspace(false);
        }, 800);

        return () => clearTimeout(timer);
    }, []);

    const toggleSidebar = () => {
        const newState = !isCollapsed;
        setIsCollapsed(newState);
        localStorage.setItem("sidebar-state", String(newState));
    };

    // 2. Monitorar mudanças de rota para desligar o loading
    useEffect(() => {
        // Se o pathname mudou, significa que a navegação do Next.js completou
        if (pathname !== prevPathnameRef.current) {
            if (isSwitchingWorkspace) {
                // Pequeno delay para garantir que o render aconteceu
                // Isso evita "flash" de conteúdo antigo antes do novo pintar
                // Pequeno delay para garantir que a UI estabilize e mascarar esqueletos
                // 800ms é rápido o suficiente para parecer responsivo, mas lento o suficiente para cobrir o paint inicial
                // 3500ms cobre o tempo total de render (3.5s) visto nos logs de pior caso
                // Isso garante que NUNCA mostremos esqueletos na troca
                setTimeout(() => {
                    setIsSwitchingWorkspace(false);
                }, 3500);
            }
            prevPathnameRef.current = pathname;
        }
    }, [pathname, isSwitchingWorkspace]);

    // 3. Função de Troca de Workspace
    const handleSetWorkspace = (id: string) => {
        // Ignora se for o mesmo ID
        if (id === activeWorkspaceId) return;

        // Ativa o loading imediatamente
        setIsSwitchingWorkspace(true);

        // Atualiza o estado
        setActiveWorkspaceId(id);
        localStorage.setItem("active-workspace-id", id);
    };

    // 4. Emergency Eject (Segurança contra bugs de navegação)
    // Se por algum motivo a navegação falhar ou não disparar mudança de rota
    useEffect(() => {
        if (isSwitchingWorkspace) {
            const emergencyTimer = setTimeout(() => {
                if (isSwitchingWorkspace) {
                    console.warn("[Symples] Emergency Eject: Loading removido por timeout (8s).");
                    setIsSwitchingWorkspace(false);
                }
            }, 8000); // 8s timeout de segurança
            return () => clearTimeout(emergencyTimer);
        }
    }, [isSwitchingWorkspace]);

    const contextValue = React.useMemo(() => ({
        isCollapsed,
        toggleSidebar,
        activeWorkspaceId,
        setActiveWorkspaceId: handleSetWorkspace,
        isLoaded: isMounted,
        isSwitchingWorkspace, // Mantendo por compatibilidade temporária mas hooks devem migrar
        setIsSwitchingWorkspace // Mantendo por compatibilidade temporária
    }), [isCollapsed, activeWorkspaceId, isMounted, isSwitchingWorkspace, handleSetWorkspace]); // Include handleSetWorkspace in deps or keep it stable

    // Contexto UI separado para evitar re-renders na Sidebar principal
    const uiContextValue = React.useMemo(() => ({
        isSwitchingWorkspace,
        setIsSwitchingWorkspace
    }), [isSwitchingWorkspace]);

    return (
        <AppContext.Provider value={contextValue}>
            <UIContext.Provider value={uiContextValue}>
                {children}
            </UIContext.Provider>
        </AppContext.Provider>
    );
}

export function useSidebar() {
    const context = useContext(AppContext);
    if (!context) throw new Error("useSidebar must be used within a SidebarProvider");
    return context;
}

export function useWorkspace() {
    const context = useContext(AppContext);

    // Tentar pegar do UIContext se disponível para componentes otimizados
    // Hooks devem ser chamados incondicionalmente
    const uiContext = useContext(UIContext);

    if (!context) throw new Error("useWorkspace must be used within a SidebarProvider");

    return {
        activeWorkspaceId: context.activeWorkspaceId,
        setActiveWorkspaceId: context.setActiveWorkspaceId,
        isLoaded: context.isLoaded,
    };
}

// Hook otimizado APENAS para quem precisa saber do loading (Overlay, Switcher)
export function useWorkspaceLoading() {
    const context = useContext(UIContext);
    if (!context) throw new Error("useWorkspaceLoading must be used within a SidebarProvider");
    return context;
}