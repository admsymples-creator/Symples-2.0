"use client";

import React, { createContext, useContext, useEffect, useState, useRef } from "react";

type AppContextType = {
    isCollapsed: boolean;
    toggleSidebar: () => void;
    activeWorkspaceId: string | null;
    setActiveWorkspaceId: (id: string) => void;
    isLoaded: boolean;
    isSwitchingWorkspace: boolean;
    setIsSwitchingWorkspace: (value: boolean) => void;
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
    // --- ESTADOS ---
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);
    const [isSwitchingWorkspace, setIsSwitchingWorkspace] = useState(true); // Começa TRUE (Loading inicial)
    const [isMounted, setIsMounted] = useState(false);

    // --- REFS DE CONTROLE (O Segredo da Estabilidade) ---
    const isSwitchingRef = useRef(true);

    // TIMESTAMP LOCK: Guarda o tempo absoluto (Unix ms) de quando o loading deve ser libertado.
    // Imune a re-renders do React.
    const unlockTimeRef = useRef<number>(0);

    // 1. Hidratação Inicial
    useEffect(() => {
        const savedSidebar = localStorage.getItem("sidebar-state");
        if (savedSidebar) setIsCollapsed(savedSidebar === "true");

        const savedWorkspace = localStorage.getItem("active-workspace-id");
        if (savedWorkspace) {
            setActiveWorkspaceId(savedWorkspace);
            // AUMENTADO PARA 3500ms: Garante que o usuário veja a marca e o app tenha tempo de sobra para hidratar
            unlockTimeRef.current = Date.now() + 3500;
            console.log(`[Symples UX] Load inicial: Lock ativado por 3500ms`);
        } else {
            // Se não tem workspace, não estamos a carregar nada (ex: Login page)
            setIsSwitchingWorkspace(false);
            isSwitchingRef.current = false;
        }

        setIsMounted(true);
    }, []);

    const toggleSidebar = () => {
        const newState = !isCollapsed;
        setIsCollapsed(newState);
        localStorage.setItem("sidebar-state", String(newState));
    };

    // 2. Função de Troca de Workspace (Ativa o Lock)
    const handleSetWorkspace = (id: string) => {
        // Ignora se for o mesmo ID (a menos que seja o primeiro load null->id)
        if (id === activeWorkspaceId && activeWorkspaceId !== null) return;

        const now = Date.now();

        // --- CALIBRAÇÃO DE TEMPO (UX) - AUMENTADO PARA SENSATION DE ROBUSTEZ ---
        // Primeiro Load (null -> ID): 3500ms (Cold start - garante hidratação completa)
        // Troca (ID -> ID): 2000ms (Pausa deliberada para limpar contexto mental)
        const lockDuration = activeWorkspaceId === null ? 3500 : 2000;

        // Define a hora exata do futuro para desbloqueio
        unlockTimeRef.current = now + lockDuration;

        console.log(`[Symples UX] Lock ativado por ${lockDuration}ms`);

        // Trava a UI imediatamente
        setIsSwitchingWorkspace(true);
        isSwitchingRef.current = true;

        // Atualiza o estado
        setActiveWorkspaceId(id);
        localStorage.setItem("active-workspace-id", id);
    };

    // 3. O RELEASER (O único useEffect autorizado a remover o loading)
    useEffect(() => {
        // Se a UI não está travada, não fazemos nada
        if (!isSwitchingWorkspace) return;

        const checkLock = () => {
            const now = Date.now();

            // Proteção para F5: Se unlockTime for 0 mas estamos carregando, força 2500ms
            if (unlockTimeRef.current === 0) {
                unlockTimeRef.current = now + 2500;
                console.log(`[Symples UX] Fallback: Lock ativado por 2500ms (refresh F5)`);
            }

            const timeRemaining = unlockTimeRef.current - now;

            // LOG DE CONTAGEM REGRESSIVA (Debug visual)
            // Log a cada ~500ms para não poluir o console
            // Verifica se está próximo de múltiplos de 500ms (3500, 3000, 2500, 2000, 1500, 1000, 500)
            if (timeRemaining > 0) {
                const remainder = timeRemaining % 500;
                // Log quando estiver próximo de múltiplos de 500ms (com margem de 50ms)
                if (remainder < 50 || remainder > 450) {
                    console.log(`⏳ [Symples Loading] Restam: ~${Math.round(timeRemaining)}ms`);
                }
            }

            if (timeRemaining <= 0) {
                // O TEMPO ACABOU -> LIBERTAR UI
                console.log("✅ [Symples Loading] Tempo esgotado. Abrindo app.");
                setIsSwitchingWorkspace(false);
                isSwitchingRef.current = false;
                unlockTimeRef.current = 0; // Reset
            } else {
                // AINDA FALTA TEMPO -> REAGENDAR
                // Isso cria um loop recursivo que sobrevive a re-renders
                timeoutId = setTimeout(checkLock, timeRemaining);
            }
        };

        let timeoutId = setTimeout(checkLock, 50); // Tick inicial

        return () => clearTimeout(timeoutId);
    }, [isSwitchingWorkspace]); // Dependência mínima

    // 4. Emergency Eject (Segurança contra bugs)
    useEffect(() => {
        if (isSwitchingWorkspace) {
            const emergencyTimer = setTimeout(() => {
                if (isSwitchingRef.current) {
                    console.warn("[Symples] Emergency Eject: Loading removido por timeout (4s).");
                    setIsSwitchingWorkspace(false);
                    isSwitchingRef.current = false;
                }
            }, 4000); // 4s é o limite máximo tolerável (ajustado para cobrir o novo tempo de 3.5s)
            return () => clearTimeout(emergencyTimer);
        }
    }, [isSwitchingWorkspace]);

    return (
        <AppContext.Provider value={{
            isCollapsed,
            toggleSidebar,
            activeWorkspaceId,
            setActiveWorkspaceId: handleSetWorkspace,
            isLoaded: isMounted,
            isSwitchingWorkspace,
            setIsSwitchingWorkspace
        }}>
            {children}
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
    if (!context) throw new Error("useWorkspace must be used within a SidebarProvider");
    return {
        activeWorkspaceId: context.activeWorkspaceId,
        setActiveWorkspaceId: context.setActiveWorkspaceId,
        isLoaded: context.isLoaded,
        isSwitchingWorkspace: context.isSwitchingWorkspace,
        setIsSwitchingWorkspace: context.setIsSwitchingWorkspace
    };
}