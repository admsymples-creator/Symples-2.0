"use client";

import { useEffect, useState, useRef } from "react";

/**
 * Hook para detectar quando uma página está realmente pronta para uso
 * Verifica:
 * 1. DOM está pronto
 * 2. Elementos principais renderizaram
 * 3. Componentes client-side montaram
 */
export function usePageReady(isSwitching: boolean, pathname: string) {
  const [isReady, setIsReady] = useState(false);
  const previousPathnameRef = useRef(pathname);
  const checkCountRef = useRef(0);
  const maxChecks = 20; // Máximo de 2 segundos (20 * 100ms)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isCheckingRef = useRef(false);

  useEffect(() => {
    // Limpar qualquer timeout pendente
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    // Se não está trocando, resetar tudo e não verificar
    if (!isSwitching) {
      setIsReady(false);
      checkCountRef.current = 0;
      isCheckingRef.current = false;
      previousPathnameRef.current = pathname;
      return;
    }
    
    // Se o pathname mudou, atualizar a referência
    const pathnameChanged = pathname !== previousPathnameRef.current;

    // CRÍTICO: Só começar a verificar DEPOIS que o pathname mudou
    // Se está trocando mas o pathname ainda não mudou, aguardar
    if (isSwitching && !pathnameChanged) {
      // Reset mas não iniciar verificação ainda
      setIsReady(false);
      checkCountRef.current = 0;
      isCheckingRef.current = false;
      // Atualizar referência do pathname para detectar mudança futura
      previousPathnameRef.current = pathname;
      return; // Aguardar pathname mudar
    }

    // Reset quando pathname muda ou quando começa a trocar (e pathname já mudou)
    setIsReady(false);
    checkCountRef.current = 0;
    isCheckingRef.current = false;
    
    // Atualizar referência do pathname se mudou
    if (pathnameChanged) {
      previousPathnameRef.current = pathname;
    }
    
    // Não iniciar nova verificação se já está verificando
    if (isCheckingRef.current) {
      return;
    }
    
    // CRÍTICO: Só verificar se está trocando E pathname já mudou
    // Isso garante que verificamos a NOVA página, não a antiga
    if (!isSwitching) {
      return;
    }

    // Função para verificar se a página está pronta
    const checkPageReady = () => {
      // Verificar se ainda está trocando (pode ter mudado durante a verificação)
      if (!isSwitching) {
        setIsReady(false);
        isCheckingRef.current = false;
        return;
      }
      
      // CRÍTICO: Verificar se o pathname ainda corresponde ao pathname atual
      // Se mudou durante a verificação, resetar e começar de novo
      if (pathname !== previousPathnameRef.current) {
        // Pathname mudou durante verificação, resetar
        previousPathnameRef.current = pathname;
        checkCountRef.current = 0;
        // Continuar verificando com novo pathname
      }
      
      checkCountRef.current++;

      // Verificações de prontidão
      const checks = {
        // 1. DOM está pronto
        domReady: document.readyState === "complete" || document.readyState === "interactive",
        
        // 2. Elemento main existe e tem conteúdo
        mainExists: document.querySelector("main") !== null,
        mainHasContent: (document.querySelector("main")?.children.length || 0) > 0,
        
        // 3. Verificar se componentes principais renderizaram (baseado na rota)
        hasPageContent: (() => {
          const main = document.querySelector("main");
          if (!main) return false;
          
          if (pathname.includes("/home")) {
            // Para home, verificar se tem cards ou seções principais
            // Verificar por classes específicas ou elementos esperados
            return (
              main.querySelector('[class*="card-surface"]') !== null ||
              main.querySelector('h1') !== null || // Header da home
              main.querySelector('[class*="HomeTasksSection"]') !== null ||
              main.textContent?.trim().length > 100 // Conteúdo significativo
            );
          } else if (pathname.includes("/tasks")) {
            // Para tasks, verificar se tem lista ou board
            return (
              main.querySelector('[class*="TaskList"]') !== null ||
              main.querySelector('[class*="TaskBoard"]') !== null ||
              main.querySelector('[class*="tasks-view"]') !== null ||
              main.textContent?.trim().length > 100
            );
          } else if (pathname.includes("/planner")) {
            // Para planner, verificar se tem calendário
            return (
              main.querySelector('[class*="calendar"]') !== null ||
              main.querySelector('[class*="PlannerCalendar"]') !== null ||
              main.querySelector('[class*="WeeklyView"]') !== null ||
              main.textContent?.trim().length > 100
            );
          }
          // Para outras rotas, verificar se tem qualquer conteúdo significativo
          return main.textContent?.trim().length > 50;
        })(),
        
        // 4. Verificar se não há spinners de loading visíveis (exceto o nosso overlay)
        noLoadingSpinners: (() => {
          const spinners = document.querySelectorAll('[class*="animate-spin"]');
          // Filtrar spinners que não são do nosso overlay
          const visibleSpinners = Array.from(spinners).filter(spinner => {
            const el = spinner as HTMLElement;
            // Ignorar spinners que estão dentro do overlay de workspace switching
            return el.closest('[class*="WorkspaceLoadingOverlay"]') === null && 
                   el.offsetParent !== null;
          });
          return visibleSpinners.length === 0;
        })(),
      };

      const allChecksPass = Object.values(checks).every(check => check === true);

      if (allChecksPass) {
        // Todos os checks passaram, aguardar um pouco mais para garantir que componentes client-side renderizaram
        timeoutRef.current = setTimeout(() => {
          // Verificar novamente se ainda está trocando
          if (!isSwitching) {
            setIsReady(false);
            isCheckingRef.current = false;
            return;
          }
          
          // Verificação final: garantir que não há mais spinners de loading
          const finalSpinners = document.querySelectorAll('[class*="animate-spin"]');
          const visibleFinalSpinners = Array.from(finalSpinners).filter(spinner => {
            const el = spinner as HTMLElement;
            // Ignorar spinners do overlay de workspace switching
            return el.closest('[class*="WorkspaceLoadingOverlay"]') === null && 
                   el.offsetParent !== null;
          });
          
          if (visibleFinalSpinners.length === 0) {
            setIsReady(true);
            isCheckingRef.current = false;
          } else {
            // Ainda há spinners, tentar mais uma vez se não excedeu o limite
            if (checkCountRef.current < maxChecks) {
              timeoutRef.current = setTimeout(checkPageReady, 150);
            } else {
              // Timeout após muitas tentativas, considerar pronto mesmo assim
              setIsReady(true);
              isCheckingRef.current = false;
            }
          }
        }, 600); // 600ms de delay adicional para garantir que tudo renderizou completamente
      } else if (checkCountRef.current >= maxChecks) {
        // Excedeu o limite de tentativas, considerar pronto mesmo assim
        timeoutRef.current = setTimeout(() => {
          if (isSwitching) {
            setIsReady(true);
          }
          isCheckingRef.current = false;
        }, 200);
      } else {
        // Tentar novamente em 100ms
        timeoutRef.current = setTimeout(checkPageReady, 100);
      }
    };

    // Marcar que está verificando
    isCheckingRef.current = true;
    
    // CRÍTICO: Aguardar mais tempo para garantir que a NOVA página renderizou
    // Aumentar delay inicial para dar tempo da navegação completar e DOM atualizar
    timeoutRef.current = setTimeout(() => {
      checkPageReady();
    }, 300); // Aumentado de 150ms para 300ms para garantir que nova página renderizou

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      isCheckingRef.current = false;
    };
  }, [isSwitching, pathname]);

  return isReady;
}

