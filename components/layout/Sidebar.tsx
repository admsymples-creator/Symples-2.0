"use client";

import React, { useState, useMemo, useCallback, useEffect, useRef, startTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Home, CheckSquare, DollarSign, Settings, Building2, Plus, ChevronsUpDown, Calendar, Folder, Users, ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
    DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { useSidebar, useWorkspace } from "@/components/providers/SidebarProvider";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { SubscriptionData } from "@/lib/types/subscription";
import { GlobalSearch } from "@/components/layout/GlobalSearch";
import { getWorkspaceTags } from "@/lib/actions/tasks";
import { isPersonalWorkspace } from "@/lib/utils/workspace-helpers";
import { setProjectIcon, getProjectIcons } from "@/lib/actions/projects";
import dynamic from "next/dynamic";
import { getIconComponent } from "@/components/projects/IconPicker";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface NavItem {
    label: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
}

const managementItemsBase: NavItem[] = [
    { label: "Home", href: "/home", icon: Home },
    { label: "Planner", href: "/planner", icon: Calendar },
    { label: "Tarefas", href: "/tasks", icon: CheckSquare },
    { label: "Financeiro", href: "/finance", icon: DollarSign },
    { label: "Time", href: "/team", icon: Users },
];

// projectTasksItem removido - Tarefas agora está em managementItemsBase

interface SidebarProps {
    workspaces?: { id: string; name: string; slug: string | null; logo_url?: string | null }[];
    initialSubscription?: Pick<SubscriptionData, 'id' | 'plan' | 'subscription_status' | 'trial_ends_at'> | null;
    initialProjectsTags?: string[];
    initialProjectsIcons?: Map<string, string>;
}

// Memoizar NavItemView para evitar re-renders desnecessários
const NavItemView = React.memo(function NavItemView({ item, isActive, isCollapsed }: { item: NavItem, isActive: boolean, isCollapsed: boolean }) {
    const Icon = item.icon;
    const router = useRouter();

    const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
        // Verificar se o href é válido
        if (!item.href || item.href.startsWith('/undefined') || item.href === '/') {
            e.preventDefault();
            e.stopPropagation();
            console.error('[Sidebar] Invalid href on click:', item.href);
            return;
        }
        
        try {
            sessionStorage.setItem("nav-click-ts", String(performance.now()));
            sessionStorage.setItem("nav-click-href", item.href);
        } catch {}
        
        // Log para debug apenas em desenvolvimento
        if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
            console.log('[Sidebar] Navigation click:', { href: item.href, label: item.label });
        }
        
        // Usar router.push como fallback se o Link não funcionar
        // Não prevenir o comportamento padrão do Link - deixar ele fazer a navegação
    };

    // Prefetch mais agressivo - usar router.prefetch do Next.js (mais eficiente)
    const handleMouseEnter = useCallback(() => {
        router.prefetch(item.href);
        
        // Pré-carregar componentes pesados específicos para rotas
        if (typeof window !== 'undefined') {
            if (item.href.includes('/tasks')) {
                import("@/components/tasks/TaskBoard").catch(() => {});
                import("@/components/tasks/TaskDetailModal").catch(() => {});
            } else if (item.href.includes('/planner')) {
                import("@/components/calendar/planner-calendar").catch(() => {});
            }
        }
    }, [item.href, router]);

    const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
        handleClick(e);
        // Se o href for inválido, já foi prevenido no handleClick
        // Se for válido, deixar o Link fazer a navegação normalmente
    };

    const linkElement = (
        <Link
            href={item.href}
            prefetch={true}
            onMouseEnter={handleMouseEnter}
            onClick={handleLinkClick}
            className={cn(
                "flex items-center gap-3 rounded-lg transition-colors duration-75 relative group whitespace-nowrap",
                isCollapsed ? "justify-center p-2 h-10 w-10 mx-auto" : "px-3 py-2 text-sm w-full",
                isActive
                    ? "bg-gray-50 text-gray-900 font-semibold"
                    : "text-gray-600 font-medium hover:bg-gray-50 hover:text-gray-900"
            )}
        >
            <Icon className={cn(
                "flex-shrink-0",
                isCollapsed ? "w-5 h-5" : "w-5 h-5",
                isActive ? "text-[#050815]" : "text-gray-500"
            )} />
            <span className={cn(
                "transition-all duration-150 overflow-hidden",
                isCollapsed ? "w-0 opacity-0 hidden" : "w-auto opacity-100"
            )}>
                {item.label}
            </span>
        </Link>
    );

    if (isCollapsed) {
        return (
            <Tooltip>
                <TooltipTrigger asChild>
                    {linkElement}
                </TooltipTrigger>
                <TooltipContent side="right" className="z-[100]">
                    {item.label}
                </TooltipContent>
            </Tooltip>
        );
    }

    return linkElement;
}, (prevProps, nextProps) => {
    // Comparação customizada para evitar re-renders desnecessários
    return (
        prevProps.item.href === nextProps.item.href &&
        prevProps.isActive === nextProps.isActive &&
        prevProps.isCollapsed === nextProps.isCollapsed
    );
});

function ToggleItemView({ label, icon, isActive, isCollapsed, isOpen, onToggle, className }: { label: string; icon: React.ComponentType<{ className?: string }>; isActive: boolean; isCollapsed: boolean; isOpen: boolean; onToggle: () => void; className?: string }) {
    const Icon = icon;

    const buttonElement = (
        <button
            type="button"
            onClick={onToggle}
            aria-expanded={isOpen}
            className={cn(
                "flex items-center gap-3 rounded-lg transition-colors duration-75 relative group whitespace-nowrap w-full",
                isCollapsed ? "justify-center p-2 h-10 w-10 mx-auto" : "px-3 py-2 text-sm",
                isActive
                    ? "bg-gray-50 text-gray-900 font-semibold"
                    : "text-gray-600 font-medium hover:bg-gray-50 hover:text-gray-900",
                className
            )}
        >
            <div className="w-6 h-6 rounded-md bg-[#050815] flex items-center justify-center flex-shrink-0">
                <Icon className="w-4 h-4 text-white" />
            </div>
            <span className={cn(
                "transition-all duration-150 overflow-hidden",
                isCollapsed ? "w-0 opacity-0 hidden" : "w-auto opacity-100"
            )}>
                {label}
            </span>
            {!isCollapsed && (
                <ChevronDown className={cn("ml-auto w-4 h-4 text-gray-400 transition-transform", !isOpen && "-rotate-90")} />
            )}
        </button>
    );

    if (isCollapsed) {
        return (
            <Tooltip>
                <TooltipTrigger asChild>
                    {buttonElement}
                </TooltipTrigger>
                <TooltipContent side="right" className="z-[100]">
                    {label}
                </TooltipContent>
            </Tooltip>
        );
    }

    return buttonElement;
}

// Componente otimizado para projetos com navegação rápida e prefetch - Memoizado
const ProjectToggleItem = React.memo(function ProjectToggleItem({ label, icon, href, isActive, isCollapsed, isOpen, onToggle }: { 
    label: string; 
    icon: React.ComponentType<{ className?: string }>; 
    href: string;
    isActive: boolean; 
    isCollapsed: boolean; 
    isOpen: boolean; 
    onToggle: () => void;
}) {
    const Icon = icon;
    const router = useRouter();

    const handleClick = useCallback((e: React.MouseEvent) => {
        // Se não estiver colapsado, expandir/colapsar
        if (!isCollapsed) {
            onToggle();
        }
        // Navegar diretamente para o projeto (não esperar expandir)
        e.preventDefault();
        startTransition(() => {
            router.push(href);
        });
    }, [href, router, isCollapsed, onToggle]);

    const handleMouseEnter = useCallback(() => {
        // Prefetch ao hover para carregar mais rápido
        router.prefetch(href);
    }, [href, router]);

    const buttonElement = (
        <button
            type="button"
            onClick={handleClick}
            onMouseEnter={handleMouseEnter}
            aria-expanded={isOpen}
            className={cn(
                "flex items-center gap-3 rounded-lg transition-colors duration-75 relative group whitespace-nowrap w-full",
                isCollapsed ? "justify-center p-2 h-10 w-10 mx-auto" : "px-3 py-2 text-sm",
                isActive
                    ? "bg-gray-50 text-gray-900 font-semibold"
                    : "text-gray-600 font-medium hover:bg-gray-50 hover:text-gray-900"
            )}
        >
            <div className="w-6 h-6 rounded-md bg-[#050815] flex items-center justify-center flex-shrink-0">
                <Icon className="w-4 h-4 text-white" />
            </div>
            <span className={cn(
                "transition-all duration-150 overflow-hidden",
                isCollapsed ? "w-0 opacity-0 hidden" : "w-auto opacity-100"
            )}>
                {label}
            </span>
            {!isCollapsed && (
                <ChevronDown className={cn("ml-auto w-4 h-4 text-gray-400 transition-transform", !isOpen && "-rotate-90")} />
            )}
        </button>
    );

    if (isCollapsed) {
        return (
            <Tooltip>
                <TooltipTrigger asChild>
                    {buttonElement}
                </TooltipTrigger>
                <TooltipContent side="right" className="z-[100]">
                    {label}
                </TooltipContent>
            </Tooltip>
        );
    }

    return buttonElement;
}, (prevProps, nextProps) => {
    // Comparação customizada para evitar re-renders desnecessários
    return (
        prevProps.label === nextProps.label &&
        prevProps.href === nextProps.href &&
        prevProps.isActive === nextProps.isActive &&
        prevProps.isCollapsed === nextProps.isCollapsed &&
        prevProps.isOpen === nextProps.isOpen
    );
});

function SidebarContent({ workspaces = [], initialSubscription = null, initialProjectsTags, initialProjectsIcons }: SidebarProps) {
    const pathname = usePathname();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { isCollapsed } = useSidebar();
    const { activeWorkspaceId, setActiveWorkspaceId } = useWorkspace();
    const [isSwitchingWorkspace, setIsSwitchingWorkspace] = useState(false);
    const [isProjectsOpen, setIsProjectsOpen] = useState(true); // Aberto por padrão
    // Inicializar com dados do servidor para exibição instantânea
    const [workspaceTags, setWorkspaceTags] = useState<string[]>(() => initialProjectsTags || []);
    const [openProjectTags, setOpenProjectTags] = useState<Record<string, boolean>>({});
    const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
    const [newProjectName, setNewProjectName] = useState("");
    const [selectedIcon, setSelectedIcon] = useState<string>("Folder");
    const [projectIcons, setProjectIcons] = useState<Map<string, string>>(() => initialProjectsIcons || new Map());
    const workspaceTagsCache = useRef<Map<string, { tags: string[]; ts: number }>>(new Map());
    const projectIconsCache = useRef<Map<string, { icons: Map<string, string>; ts: number }>>(new Map());
    const IconPicker = useMemo(
        () => dynamic(() => import("@/components/projects/IconPicker").then((mod) => mod.IconPicker), {
            loading: () => <div className="h-10" />,
        }),
        []
    );

    // Calcular dias restantes do trial (memoizado) - apenas lógica visual baseada em props
    const trialDaysRemaining = useMemo(() => {
        if (!initialSubscription?.trial_ends_at) return null;
        const trialEndsAt = new Date(initialSubscription.trial_ends_at);
        const now = new Date();
        const daysRemaining = Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return daysRemaining > 0 ? daysRemaining : 0;
    }, [initialSubscription?.trial_ends_at]);

    const isTrialing = initialSubscription?.subscription_status === 'trialing';

    const hasWorkspaces = React.useMemo(() => workspaces.length > 0, [workspaces.length]);

    // Set initial workspace if not set
    React.useEffect(() => {
        if (hasWorkspaces && !activeWorkspaceId) {
            setActiveWorkspaceId(workspaces[0].id);
        } else if (hasWorkspaces && activeWorkspaceId && !workspaces.find(w => w.id === activeWorkspaceId)) {
            // If active workspace is not in the list (e.g. user lost access), switch to first
            setActiveWorkspaceId(workspaces[0].id);
        }
    }, [workspaces, hasWorkspaces, activeWorkspaceId, setActiveWorkspaceId]);

    const currentWorkspace = React.useMemo(() => {
        // Se não temos activeWorkspaceId mas temos workspaces, usar o primeiro
        if (!activeWorkspaceId && workspaces.length > 0) {
            return workspaces[0];
        }
        return workspaces.find(w => w.id === activeWorkspaceId) || workspaces[0];
    }, [workspaces, activeWorkspaceId]);

    const workspacePrefix = useMemo(() => {
        // Garantir que sempre temos um workspace válido
        const workspace = currentWorkspace || (workspaces.length > 0 ? workspaces[0] : null);
        if (!workspace) {
            if (process.env.NODE_ENV === 'development') {
                console.warn('[Sidebar] No workspace available for prefix:', { 
                    currentWorkspace, 
                    activeWorkspaceId, 
                    workspaces: workspaces.length 
                });
            }
            return "";
        }
        
        const base = workspace.slug || workspace.id || "";
        const prefix = base ? `/${base}` : "";
        
        // Log para debug apenas em desenvolvimento
        if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
            if (!prefix) {
                console.warn('[Sidebar] workspacePrefix is empty:', { 
                    workspace, 
                    activeWorkspaceId, 
                    workspaces: workspaces.length,
                    base,
                    slug: workspace.slug,
                    id: workspace.id
                });
            }
        }
        
        return prefix;
    }, [currentWorkspace, activeWorkspaceId, workspaces]);

    const isPersonal = useMemo(() => {
        if (!currentWorkspace) return true;
        return isPersonalWorkspace(currentWorkspace, workspaces);
    }, [currentWorkspace, workspaces]);
    // OTIMIZAÇÃO: Usar dados iniciais imediatamente e só fazer fetch se workspace mudar
    useEffect(() => {
        if (!activeWorkspaceId || isPersonal) {
            setWorkspaceTags([]);
            setProjectIcons(new Map());
            return;
        }

        // Se temos dados iniciais, usar imediatamente e atualizar cache
        // Isso garante que os projetos apareçam instantaneamente
        if (initialProjectsTags !== undefined) {
            // Atualizar cache com dados iniciais para este workspace
            workspaceTagsCache.current.set(activeWorkspaceId, { tags: initialProjectsTags, ts: Date.now() });
            if (initialProjectsIcons) {
                projectIconsCache.current.set(activeWorkspaceId, { icons: initialProjectsIcons, ts: Date.now() });
            }
            // Garantir que os dados iniciais estão no estado
            setWorkspaceTags(initialProjectsTags);
            if (initialProjectsIcons) {
                setProjectIcons(initialProjectsIcons);
            }
            // Não fazer fetch se temos dados iniciais - eles já estão no estado
            return;
        }

        // Se não temos dados iniciais, verificar cache e fazer fetch se necessário
        let cancelled = false;
        const loadWorkspaceTags = async () => {
            try {
                const now = Date.now();
                const cachedTags = workspaceTagsCache.current.get(activeWorkspaceId);
                const cachedIcons = projectIconsCache.current.get(activeWorkspaceId);
                const tagsFresh = cachedTags && now - cachedTags.ts < 300000; // 5 minutos
                const iconsFresh = cachedIcons && now - cachedIcons.ts < 300000;

                // Mostrar cache imediatamente se disponível
                if (tagsFresh) {
                    setWorkspaceTags(cachedTags.tags);
                }
                if (iconsFresh) {
                    setProjectIcons(cachedIcons.icons);
                }

                // Buscar dados frescos em background (não bloquear UI)
                if (!tagsFresh || !iconsFresh) {
                    const promises: Promise<any>[] = [];
                    
                    if (!tagsFresh) {
                        promises.push(
                            getWorkspaceTags(activeWorkspaceId).then(tags => {
                                if (!cancelled) {
                                    workspaceTagsCache.current.set(activeWorkspaceId, { tags, ts: Date.now() });
                                    setWorkspaceTags(tags);
                                }
                            })
                        );
                    }

                    if (!iconsFresh) {
                        promises.push(
                            getProjectIcons(activeWorkspaceId).then(icons => {
                                if (!cancelled) {
                                    projectIconsCache.current.set(activeWorkspaceId, { icons, ts: Date.now() });
                                    setProjectIcons(icons);
                                }
                            })
                        );
                    }

                    // Executar em paralelo
                    Promise.all(promises).catch(error => {
                        console.error("Erro ao carregar tags do workspace:", error);
                        if (!cancelled) {
                            setWorkspaceTags([]);
                            setProjectIcons(new Map());
                        }
                    });
                }
            } catch (error) {
                console.error("Erro ao carregar tags do workspace:", error);
                if (!cancelled) {
                    setWorkspaceTags([]);
                    setProjectIcons(new Map());
                }
            }
        };

        // Carregar apenas se não temos dados iniciais
        loadWorkspaceTags();
        
        return () => {
            cancelled = true;
        };
    }, [activeWorkspaceId, isPersonal, initialProjectsTags, initialProjectsIcons]); // Adicionar dependências dos dados iniciais

    const managementItems = useMemo(() => {
        // Não gerar links se não temos workspace prefix válido
        if (!workspacePrefix || workspacePrefix === '/') {
            if (process.env.NODE_ENV === 'development') {
                console.warn('[Sidebar] workspacePrefix is invalid, returning empty managementItems:', { 
                    workspacePrefix, 
                    activeWorkspaceId,
                    currentWorkspace,
                    workspaces: workspaces.length
                });
            }
            return [];
        }
        
        const filtered = isPersonal
            ? managementItemsBase.filter((item) => item.href !== "/team" && item.href !== "/tasks")
            : managementItemsBase;
        const items = filtered.map((item) => ({
            ...item,
            href: `${workspacePrefix}${item.href}`,
        }));
        
        // Log para debug apenas em desenvolvimento
        if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
            if (items.some(item => !item.href || item.href.startsWith('/undefined'))) {
                console.error('[Sidebar] Invalid hrefs in managementItems:', { 
                    items, 
                    workspacePrefix, 
                    activeWorkspaceId,
                    currentWorkspace 
                });
            }
        }
        
        return items;
    }, [isPersonal, workspacePrefix, activeWorkspaceId, currentWorkspace, workspaces]);

    // Prefetch automático de todas as rotas principais quando workspace muda
    useEffect(() => {
        if (!workspacePrefix) return;
        
        // Prefetch todas as rotas de gestão em paralelo
        managementItems.forEach((item) => {
            router.prefetch(item.href);
        });
        
        // Prefetch settings também
        router.prefetch("/settings");
        
        // Prefetch de componentes pesados para rotas específicas
        if (typeof window !== 'undefined') {
            // Prefetch TaskBoard para /tasks
            const tasksHref = managementItems.find(item => item.href.includes('/tasks'))?.href;
            if (tasksHref) {
                // Pré-carregar módulo do TaskBoard em background
                import("@/components/tasks/TaskBoard").catch(() => {});
            }
            
            // Prefetch PlannerCalendar para /planner
            const plannerHref = managementItems.find(item => item.href.includes('/planner'))?.href;
            if (plannerHref) {
                import("@/components/calendar/planner-calendar").catch(() => {});
            }
        }
    }, [workspacePrefix, managementItems, router]);

    // projectTasksLink removido - Tarefas agora está em managementItems

    const showProjectsSection = hasWorkspaces && !isPersonal;

    // Memoizar pathname para evitar recálculos - usar useMemo para estabilizar referência
    const stablePathname = useMemo(() => pathname, [pathname]);
    
    // Memoizar resultados de isActive para cada href - evita recálculos durante render
    // Usar apenas pathname (sem searchParams) para evitar re-renders em cascata
    const activeStates = useMemo(() => {
        const states: Record<string, boolean> = {};
        const segments = stablePathname?.split("/").filter(Boolean) ?? [];

        const isWorkspaceScoped = (segment: string) => {
            if (!stablePathname) return false;
            if (stablePathname === `/${segment}` || stablePathname.startsWith(`/${segment}/`)) {
                return true;
            }
            return segments.length >= 2 && segments[1] === segment;
        };

        // Calcular todos os estados ativos de uma vez (sem searchParams para evitar cascata)
        const checkActive = (href: string) => {
            // Remover query params do href para comparação
            const hrefWithoutQuery = href.split("?")[0];
            
            const workspaceTargets = ["/home", "/planner", "/finance", "/team", "/tasks"];
            const match = workspaceTargets.find((target) => hrefWithoutQuery.endsWith(target));
            if (match) {
                return isWorkspaceScoped(match.slice(1));
            }

            // Fast path 1: comparação exata (mais comum)
            if (stablePathname === hrefWithoutQuery) return true;

            // Fast path 2: startsWith para rotas workspace (segundo mais comum)
            if (stablePathname?.startsWith(hrefWithoutQuery)) {
                // Rotas exatas não devem ativar com subpaths
                if (hrefWithoutQuery.endsWith("/home") || hrefWithoutQuery === "/settings") {
                    return false; // já verificamos === acima
                }
                // Para rotas workspace, verificar se é exatamente o prefixo ou subpath válido
                const remaining = stablePathname.slice(hrefWithoutQuery.length);
                return remaining === "" || remaining.startsWith("/");
            }

            return false;
        };

        managementItems.forEach(item => {
            states[item.href] = checkActive(item.href);
        });

        // Settings (verificação simples sem tab)
        states["/settings"] = stablePathname === "/settings";
        return states;
    }, [stablePathname, managementItems]);

    const currentTag = useMemo(() => searchParams.get("tag"), [searchParams]);

    // Função isActive simplificada - apenas retorna valor memoizado
    // Para /tasks, verifica se está na rota e se não há tag na URL (para não conflitar com projetos)
    const isActive = useCallback((href: string) => {
        const baseActive = activeStates[href] ?? false;
        
        // Se for /tasks (sem query params), só está ativo se não houver tag na URL (senão é um projeto)
        if (href.endsWith("/tasks") || (href.includes("/tasks") && !href.includes("?"))) {
            // Verificar se pathname corresponde ao href (sem query params)
            const hrefWithoutQuery = href.split("?")[0];
            const pathnameMatches = stablePathname === hrefWithoutQuery || stablePathname?.startsWith(hrefWithoutQuery + "/");
            return pathnameMatches && !currentTag;
        }
        
        return baseActive;
    }, [activeStates, currentTag, stablePathname]);

    // Função para verificar se uma tag está ativa (via query param)
    const isTagActive = useCallback((tag: string) => {
        return currentTag === tag;
    }, [currentTag]);

    // Função para criar novo projeto
    const handleCreateProject = useCallback(async () => {
        if (!newProjectName.trim() || !activeWorkspaceId) return;
        
        const projectName = newProjectName.trim();
        
        // Verificar se já existe
        if (workspaceTags.includes(projectName)) {
            alert("Este projeto já existe!");
            return;
        }

        // Salvar ícone do projeto
        const iconResult = await setProjectIcon(activeWorkspaceId, projectName, selectedIcon);
        if (!iconResult.success) {
            console.error("Erro ao salvar ícone do projeto:", iconResult.error);
            alert("Erro ao criar projeto. Tente novamente.");
            return;
        }

        // Recarregar tags do workspace (agora inclui projetos sem tarefas)
        try {
            const updatedTags = await getWorkspaceTags(activeWorkspaceId);
            setWorkspaceTags(updatedTags);
            if (activeWorkspaceId) {
                workspaceTagsCache.current.set(activeWorkspaceId, { tags: updatedTags, ts: Date.now() });
            }
            
            // Recarregar ícones
            const updatedIcons = await getProjectIcons(activeWorkspaceId);
            setProjectIcons(updatedIcons);
        } catch (error) {
            console.error("Erro ao recarregar tags:", error);
        }
        
        // Fechar modal e limpar input
        setIsCreateProjectOpen(false);
        setNewProjectName("");
        setSelectedIcon("Folder");
        
        // Navegar para a página de tarefas com a tag
        const tagHref = `${workspacePrefix}/tasks?tag=${encodeURIComponent(projectName)}`;
        router.push(tagHref);
    }, [newProjectName, workspaceTags, workspacePrefix, router, activeWorkspaceId, selectedIcon]);

    return (
        <aside
            className={cn(
                "bg-white border-r border-gray-200 flex flex-col h-screen fixed left-0 top-0 z-50 transition-all duration-300 ease-in-out",
                isCollapsed ? "w-[64px]" : "w-[260px]"
            )}
        >
            {/* Workspace Switcher */}
            <div className={cn(
                "h-16 flex items-center border-b border-gray-200 transition-all duration-300 relative",
                isCollapsed ? "justify-center px-0" : "px-4"
            )}>
                {/* Workspace Switcher */}
                {hasWorkspaces ? (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                className={cn(
                                    "gap-3 hover:bg-gray-100/80 transition-all group p-0 rounded-lg flex-1",
                                    isCollapsed ? "justify-center px-2 h-10 w-10" : "justify-start px-3 h-12"
                                )}
                            >
                                <div className={cn(
                                    "rounded-md bg-[#050815] flex items-center justify-center text-white flex-shrink-0 shadow-sm group-hover:shadow transition-shadow overflow-hidden",
                                    isCollapsed ? "w-8 h-8" : "w-8 h-8"
                                )}>
                                    {currentWorkspace?.logo_url ? (
                                        <img
                                            src={currentWorkspace.logo_url}
                                            alt={currentWorkspace.name}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <Building2 className={cn(isCollapsed ? "w-4 h-4" : "w-4 h-4")} />
                                    )}
                                </div>

                                {!isCollapsed && (
                                    <>
                                        <div className="flex flex-col items-start text-left flex-1 min-w-0">
                                            <div className="flex items-center gap-2 w-full">
                                                <span className="font-semibold text-sm text-gray-900 truncate">
                                                    {currentWorkspace?.name || "Selecione"}
                                                </span>
                                                {isTrialing && trialDaysRemaining !== null && trialDaysRemaining > 0 && (
                                                    <Link
                                                        href="/billing"
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="flex-shrink-0"
                                                    >
                                                        <Badge
                                                            variant="secondary"
                                                            className="text-[10px] px-1.5 h-4 bg-yellow-100 text-yellow-700 hover:bg-yellow-200 border-yellow-200 cursor-pointer transition-colors"
                                                        >
                                                            {trialDaysRemaining} {trialDaysRemaining === 1 ? "dia" : "dias"}
                                                        </Badge>
                                                    </Link>
                                                )}
                                            </div>
                                            <span className="text-[10px] text-gray-500 truncate group-hover:text-gray-700 transition-colors">
                                                {isTrialing ? "Plano Trial" : initialSubscription?.plan ? `Plano ${initialSubscription.plan.charAt(0).toUpperCase() + initialSubscription.plan.slice(1)}` : "Workspace"}
                                            </span>
                                        </div>

                                        <ChevronsUpDown className="w-4 h-4 text-gray-400 ml-auto opacity-50 group-hover:opacity-100" />
                                    </>
                                )}
                            </Button>
                        </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-[220px]" align="start" side={isCollapsed ? "right" : "bottom"}>
                                <DropdownMenuLabel className="text-xs text-gray-500 font-medium px-2 py-1.5">
                                    Trocar Workspace
                                </DropdownMenuLabel>
                                {workspaces.map((workspace) => (
                                    <DropdownMenuItem
                                        key={workspace.id}
                                        onMouseEnter={() => {
                                            // Prefetch route and subscription on hover for faster navigation
                                            const base = workspace.slug || workspace.id;
                                            if (base) {
                                                router.prefetch(`/${base}/home`);
                                                // Prefetch subscription data
                                                fetch(`/api/workspace/subscription?workspaceId=${workspace.id}`).catch(() => {});
                                            }
                                        }}
                                        onClick={() => {
                                            if (workspace.id === activeWorkspaceId) return;

                                            setIsSwitchingWorkspace(true);
                                            const base = workspace.slug || workspace.id;
                                            if (base) {
                                                startTransition(() => {
                                                    router.push(`/${base}/home`);
                                                    // Reset loading state after navigation
                                                    setTimeout(() => setIsSwitchingWorkspace(false), 500);
                                                });
                                            } else {
                                                setIsSwitchingWorkspace(false);
                                            }
                                        }}
                                        className={cn(
                                            "gap-2 cursor-pointer",
                                            isSwitchingWorkspace && workspace.id !== activeWorkspaceId && "opacity-50"
                                        )}
                                        disabled={isSwitchingWorkspace}
                                    >
                                        <div className="w-6 h-6 rounded bg-gray-100 flex items-center justify-center overflow-hidden">
                                            {workspace.logo_url ? (
                                                <img
                                                    src={workspace.logo_url}
                                                    alt={workspace.name}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <Building2 className="w-3 h-3 text-gray-500" />
                                            )}
                                        </div>
                                        <span className="flex-1 truncate">{workspace.name}</span>
                                        {workspace.id === activeWorkspaceId && (
                                            <div className="w-1.5 h-1.5 rounded-full bg-[#050815]" />
                                        )}
                                    </DropdownMenuItem>
                                ))}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem asChild className="cursor-pointer gap-2 text-[#050815] focus:text-[#050815] focus:bg-gray-50">
                                    <Link href="/onboarding" prefetch={false}>
                                        <Plus className="w-4 h-4" />
                                        Criar Novo Workspace
                                    </Link>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    ) : (
                        <Link
                            href="/onboarding"
                            prefetch={false}
                            className={cn(
                                "flex items-center justify-center gap-2 w-full h-10 text-sm border border-dashed border-gray-300 rounded-md text-gray-500 hover:text-[#050815] hover:border-[#050815] hover:bg-gray-50 transition-all",
                                isCollapsed ? "px-0" : ""
                            )}
                        >
                            <Plus className="w-4 h-4" />
                            {!isCollapsed && "Criar Workspace"}
                        </Link>
                    )}
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto p-4 overflow-x-hidden">
                {/* Global Search */}
                <div className={cn("mb-6", isCollapsed && "flex justify-center")}>
                    {isCollapsed ? (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-10 w-10 bg-muted/50 border-muted-foreground/20 hover:bg-muted/80"
                                    onClick={() => {
                                        // Trigger search dialog via GlobalSearch
                                        const event = new KeyboardEvent('keydown', {
                                            key: 'k',
                                            metaKey: true,
                                            ctrlKey: true,
                                            bubbles: true
                                        });
                                        document.dispatchEvent(event);
                                    }}
                                >
                                    <Search className="w-4 h-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="right" className="z-[100]">
                                Buscar (⌘K)
                            </TooltipContent>
                        </Tooltip>
                    ) : (
                        <GlobalSearch />
                    )}
                </div>

                {/* Gestao */}
                <div className="mt-6 mb-6">
                    {!isCollapsed && (
                        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-3">
                            GESTÃO
                        </h2>
                    )}
                    <ul className="space-y-1">
                        {managementItems
                            .filter(item => item.href && !item.href.startsWith('/undefined') && item.href !== '/')
                            .map((item) => (
                                <li key={item.href}>
                                    <NavItemView item={item} isActive={isActive(item.href)} isCollapsed={isCollapsed} />
                                </li>
                            ))}
                    </ul>
                </div>

                {showProjectsSection && (
                    <div className="mb-2">
                        <div className={cn("mb-2", isCollapsed ? "flex justify-center" : "px-3")}>
                            {isCollapsed ? (
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <button
                                            type="button"
                                            onClick={() => setIsProjectsOpen((prev) => !prev)}
                                            aria-expanded={isProjectsOpen}
                                            className="h-8 w-8 rounded-md text-gray-500 hover:bg-gray-50 flex items-center justify-center transition-colors"
                                        >
                                            <Folder className="w-4 h-4" />
                                        </button>
                                    </TooltipTrigger>
                                    <TooltipContent side="right" className="z-[100]">
                                        Projetos
                                    </TooltipContent>
                                </Tooltip>
                            ) : (
                                <div className="flex items-center w-full gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setIsProjectsOpen((prev) => !prev)}
                                        aria-expanded={isProjectsOpen}
                                        className="flex items-center flex-1 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-700"
                                    >
                                        <span>PROJETOS</span>
                                        <ChevronDown className={cn("ml-auto w-4 h-4 transition-transform", !isProjectsOpen && "-rotate-90")} />
                                    </button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 text-gray-400 hover:text-gray-600 flex-shrink-0"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            setIsCreateProjectOpen(true);
                                        }}
                                    >
                                        <Plus className="w-4 h-4" />
                                    </Button>
                                </div>
                            )}
                        </div>
                        {isProjectsOpen && (
                            <ul className="space-y-1">
                                {workspaceTags.length === 0 ? (
                                    <li className={cn(!isCollapsed && "px-3 py-2 text-xs text-gray-400")}>
                                        {!isCollapsed && "Nenhum projeto ainda"}
                                    </li>
                                ) : (
                                    workspaceTags.map((tag) => {
                                        const tagHref = `${workspacePrefix}/tasks?tag=${encodeURIComponent(tag)}`;
                                        const isTagOpen = openProjectTags[tag] ?? false;
                                        const isTagCurrentlyActive = isTagActive(tag);
                                        const iconName = projectIcons.get(tag) || "Folder";
                                        const ProjectIcon = getIconComponent(iconName);
                                        
                                        return (
                                            <li key={tag} className={cn(!isCollapsed && "pl-2")}>
                                                <ProjectToggleItem
                                                    href={tagHref}
                                                    label={tag}
                                                    icon={ProjectIcon}
                                                    isActive={isTagCurrentlyActive}
                                                    isCollapsed={isCollapsed}
                                                    isOpen={isTagOpen}
                                                    onToggle={() => setOpenProjectTags(prev => ({ ...prev, [tag]: !prev[tag] }))}
                                                />
                                                {isTagOpen && !isCollapsed && (
                                                    <ul className="pl-8">
                                                        <li>
                                                            <NavItemView
                                                                item={{
                                                                    label: "Tarefas",
                                                                    href: tagHref,
                                                                    icon: CheckSquare,
                                                                }}
                                                                isActive={isTagCurrentlyActive}
                                                                isCollapsed={isCollapsed}
                                                            />
                                                        </li>
                                                    </ul>
                                                )}
                                            </li>
                                        );
                                    })
                                )}
                            </ul>
                        )}
                    </div>
                )}
            </nav>

            {/* Footer */}
            <div className="p-4 border-t border-gray-200 mt-auto space-y-3">
                {/* Trial Upgrade Callout - Hide when collapsed and only show if trialing */}
                {!isCollapsed && isTrialing && trialDaysRemaining !== null && trialDaysRemaining > 0 && (
                    <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                        <h4 className="font-semibold text-[#050815] text-xs mb-1">
                            Trial - {trialDaysRemaining} {trialDaysRemaining === 1 ? 'dia restante' : 'dias restantes'}
                        </h4>
                        <p className="text-[10px] text-[#050815] mb-2 leading-snug">
                            Aproveite todos os recursos Pro do Symples.
                        </p>
                        <Button 
                            size="sm" 
                            className="w-full h-7 text-xs bg-[#050815] hover:bg-[#0a0f1f] text-white shadow-none"
                            onClick={() => router.push('/billing')}
                        >
                            Assinar Agora
                        </Button>
                    </div>
                )}

                <div className={cn("flex items-center", isCollapsed ? "justify-center flex-col gap-4" : "justify-between")}>
                    <NavItemView
                        item={{ label: "Configurações", href: "/settings", icon: Settings }}
                        isActive={isActive("/settings")}
                        isCollapsed={isCollapsed}
                    />
                </div>
            </div>

            {/* Modal de Criar Projeto */}
            <Dialog open={isCreateProjectOpen} onOpenChange={setIsCreateProjectOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Criar Novo Projeto</DialogTitle>
                        <DialogDescription>
                            Digite o nome do projeto. Ele será criado quando você adicionar a primeira tarefa.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="project-name">Nome do Projeto</Label>
                            <Input
                                id="project-name"
                                value={newProjectName}
                                onChange={(e) => setNewProjectName(e.target.value)}
                                placeholder="Ex: Coca-Cola, Site Redesign..."
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" && newProjectName.trim()) {
                                        handleCreateProject();
                                    }
                                }}
                                autoFocus
                            />
                        </div>
                        <IconPicker
                            selectedIcon={selectedIcon}
                            onIconSelect={setSelectedIcon}
                        />
                    </div>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                setIsCreateProjectOpen(false);
                                setNewProjectName("");
                                setSelectedIcon("Folder");
                            }}
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="button"
                            onClick={handleCreateProject}
                            disabled={!newProjectName.trim()}
                        >
                            Criar Projeto
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </aside>
    );
    
}

export function Sidebar(props: SidebarProps) {
    return <SidebarContent {...props} />;
}
