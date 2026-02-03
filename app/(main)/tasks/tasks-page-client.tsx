"use client";

import { useState, useMemo, useEffect, useLayoutEffect, useCallback, useRef, memo } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { toast } from "sonner";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { TaskGroup } from "@/components/tasks/TaskGroup";
import { GhostGroup } from "@/components/tasks/GhostGroup";
import dynamic from "next/dynamic";
import { CalendarViewMenu } from "@/components/calendar/CalendarViewMenu";
import { TasksPageSkeleton } from "@/components/tasks/TasksPageSkeleton";
import { Search, Filter, Plus, List, LayoutGrid, CheckSquare, CircleDashed, Archive, ArrowUpDown, Loader2, Save, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
    DndContext,
    closestCenter,
    pointerWithin,
    rectIntersection,
    MouseSensor,
    PointerSensor,
    TouchSensor,
    useSensor,
    useSensors,
    DragEndEvent,
    DragOverEvent,
    DragStartEvent,
    DragOverlay,
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
    getTasks,
    createTask,
    updateTask,
    updateTaskPosition,
    updateTaskPositionsBulk,
    getWorkspaceMembers,
    deleteTask,
    bulkArchiveTasks,
    type Task as TaskFromDB
} from "@/lib/actions/tasks";
import { updateTaskGroup, deleteTaskGroup, createTaskGroup, getTaskGroups, reorderTaskGroup } from "@/lib/actions/task-groups";
import { getTaskDetails, updateTaskTags } from "@/lib/actions/task-details";
import { mapStatusToLabel, mapLabelToStatus, STATUS_TO_LABEL, ORDERED_STATUSES } from "@/lib/config/tasks";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useWorkspace } from "@/components/providers/SidebarProvider";
import { useWorkspaces } from "@/components/providers/WorkspacesProvider";
import { useTasks, invalidateTasksCache } from "@/hooks/use-tasks";
import type { TaskWithDetails } from "@/lib/actions/tasks";
import type { WorkspaceGroup } from "@/lib/group-actions";
import { getProjectIcon } from "@/lib/actions/projects";
import { getIconComponent } from "@/components/projects/IconPicker";
import { buildProjectTags } from "@/lib/utils/project-tags";

type ViewMode = "list" | "kanban" | "calendar";
type GroupBy = "status" | "priority" | "assignee" | "date";
type ViewOption = "group" | "status" | "date" | "priority" | "assignee" | "project";

const DATE_COLOR_MAP: Record<string, string> = {
    "Atrasadas": "#ef4444",
    "Hoje": "#16a34a",
    "Amanhã": "#eab308",
    "Semana": "#2563eb",
    "Futuro": "#475569",
    "Sem data": "#cbd5e1",
};
const STATUS_COLOR_MAP: Record<string, string> = {
    "Não iniciada": "#cbd5e1",
    "Em progresso": "#3b82f6",
    "Revisão": "#f59e0b",
    "Correção": "#ef4444",
    "Bloqueado": "#ef4444",
    "Finalizado": "#22c55e",
};

import { GroupingMenu } from "@/components/tasks/ViewOptions";
import { SortMenu } from "@/components/tasks/SortMenu";
const TaskBoard = dynamic(() => import("@/components/tasks/TaskBoard").then((mod) => mod.TaskBoard), {
    loading: () => <div className="min-h-[200px]" />,
});
const TaskDetailModal = dynamic(() => import("@/components/tasks/TaskDetailModal").then((mod) => mod.TaskDetailModal), {
    loading: () => null,
});
const PlannerCalendar = dynamic(() => import("@/components/calendar/planner-calendar").then((mod) => mod.PlannerCalendar), {
    loading: () => <div className="min-h-[400px]" />,
});

const preloadTaskBoard = () => import("@/components/tasks/TaskBoard");
const preloadPlannerCalendar = () => import("@/components/calendar/planner-calendar");

interface Task {
    id: string;
    title: string;
    completed: boolean;
    priority?: "low" | "medium" | "high" | "urgent";
    status: string;
    assignees?: Array<{ name: string; avatar?: string; id?: string }>;
    assigneeId?: string | null; // ID do responsÃ¡vel atual
    dueDate?: string;
    tags?: string[];
    hasUpdates?: boolean;
    workspaceId?: string | null;
    group?: { id: string; name: string; color?: string }; // compatÃ­vel com TaskBoard
    hasComments?: boolean;
    commentCount?: number;
    position?: number; // Posição para ordenação (drag & drop)
    isPending?: boolean; // ? Marca tarefas otimistas que ainda estão sendo criadas
}

interface TasksPageProps {
    initialTasks?: TaskWithDetails[];
    initialGroups?: WorkspaceGroup[];
    workspaceId?: string;
}

const TASKS_LAST_FILTER_KEY = "tasksLastFilter";

function getLastFilterFromStorage(): { group: ViewOption; sort: string } | null {
    if (typeof window === "undefined") return null;
    try {
        const s = localStorage.getItem(TASKS_LAST_FILTER_KEY);
        if (!s) return null;
        const p = JSON.parse(s);
        if (!p || typeof p.group !== "string" || typeof p.sort !== "string") return null;
        const validGroups: ViewOption[] = ["group", "status", "priority", "date", "assignee", "project"];
        const validSorts = ["status", "priority", "assignee", "title", "position"];
        if (!validGroups.includes(p.group) || !validSorts.includes(p.sort)) return null;
        return { group: p.group, sort: p.sort };
    } catch {
        return null;
    }
}

// ? Função auxiliar para mapear parâmetro group da URL para ViewOption
// Trata todos os edge cases: "none", null, undefined -> "group" (padrão)
function getInitialViewOption(groupParam: string | null, hasProjectFilter: boolean): ViewOption {
    if (groupParam === "status") return "status";
    if (groupParam === "priority") return "priority";
    if (groupParam === "date") return "date";
    if (groupParam === "assignee") return "assignee";
    if (groupParam === "project") return "project";
    // "none", null ou undefined -> "group" (padrão personalizado)
    // Também trata qualquer outro valor inválido como "group"
    if (groupParam === "group" || groupParam === "none") return "group";
    return "group";
}

export default function TasksPage({ initialTasks, initialGroups, workspaceId: propWorkspaceId }: TasksPageProps = {}) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const taskIdParam = searchParams.get("taskId");

    // Ler da URL (localStorage só no cliente para evitar hydration mismatch)
    const groupParam = searchParams.get("group");
    const sortParam = (searchParams.get("sort") as "status" | "priority" | "assignee" | "title" | "position") || "position";

    // Ler tag da URL para filtro de projeto (decodificar se presente)
    const tagParam = searchParams.get("tag");
    const tagFilter = tagParam ? decodeURIComponent(tagParam) : null;
    const searchParam = searchParams.get("search");
    const decodedSearch = searchParam ? decodeURIComponent(searchParam) : "";

    const initialViewOption = getInitialViewOption(groupParam, !!tagFilter);

    const activeTab = "todas" as const;
    const [viewMode, setViewMode] = useState<ViewMode>("list");
    const [viewOption, setViewOption] = useState<ViewOption>(initialViewOption);
    const [sortBy, setSortBy] = useState<"status" | "priority" | "assignee" | "title" | "position">(sortParam);
    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isCreateGroupModalOpen, setIsCreateGroupModalOpen] = useState(false);
    const [newGroupName, setNewGroupName] = useState("");
    const [newGroupColor, setNewGroupColor] = useState("#e5e7eb");
    const [isCreatingGroup, setIsCreatingGroup] = useState(false);
    const [activeTask, setActiveTask] = useState<Task | null>(null);
    const [taskDetails, setTaskDetails] = useState<any>(null);
    const [isLoadingTaskDetails, setIsLoadingTaskDetails] = useState(false);
    const [searchQuery, setSearchQuery] = useState(decodedSearch);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [calendarControls, setCalendarControls] = useState<{
        handlePrev: () => void;
        handleNext: () => void;
        handleToday: () => void;
        handleViewChange: (view: string) => void;
        monthYearTitle: string;
        currentView: string;
        reloadEvents?: () => void;
    } | null>(null);
    const shouldReduceMotion = useReducedMotion();

    // Portal do DragOverlay só após mount (evita parentNode null quando document.body não existe)
    const [portalTargetReady, setPortalTargetReady] = useState(false);
    useEffect(() => {
        setPortalTargetReady(true);
    }, []);

    // Ref para throttling do handleDragOver
    const dragOverThrottleRef = useRef<number | null>(null);
    const lastDragOverStateRef = useRef<string>("");
    const dragStartGroupKeyRef = useRef<string | null>(null);
    const initialTaskIdRef = useRef<string | null>(null);
    const [groupColors, setGroupColors] = useState<Record<string, string>>({});
    const [workspaceMembers, setWorkspaceMembers] = useState<Array<{ id: string; name: string; avatar?: string }>>([]);
    // Backlog (inbox) sempre colapsado por padrão
    const [collapsedGroupIds, setCollapsedGroupIds] = useState<Set<string>>(() => new Set(["inbox"]));

    const handleToggleGroupCollapse = useCallback((groupId: string) => {
        setCollapsedGroupIds((prev) => {
            const next = new Set(prev);
            if (next.has(groupId)) next.delete(groupId);
            else next.add(groupId);
            return next;
        });
    }, []);

    // Ref do input de "adicionar tarefa" por grupo (para foco no próximo após adicionar)
    const registerAddInputRef = useCallback((groupId: string, el: HTMLInputElement | null) => {
        addInputRefs.current[groupId] = el;
    }, []);

    // ? CORREÇÃO: Inicializar availableGroups com initialGroups se disponível (evita flicker)
    const [availableGroups, setAvailableGroups] = useState<Array<{ id: string; name: string; color: string | null }>>(() => {
        if (initialGroups && initialGroups.length > 0) {
            return initialGroups.map(g => ({
                id: g.id,
                name: g.name,
                color: g.color
            }));
        }
        return [];
    });

    // ? CORREÇÃO: Inicializar groupOrder com base em initialGroups ou localStorage (evita flicker)
    const [groupOrder, setGroupOrder] = useState<string[]>(() => {
        if (initialViewOption === "group") {
            if (initialGroups && initialGroups.length > 0) {
                // Tentar carregar ordem salva do localStorage
                if (typeof window !== "undefined") {
                    const savedOrder = localStorage.getItem("taskGroupOrder");
                    if (savedOrder) {
                        try {
                            const parsed = JSON.parse(savedOrder);
                            // Validar que todos os IDs existem em initialGroups
                            const groupIds = new Set(initialGroups.map(g => g.id));
                            const validOrder = parsed.filter((id: string) => id === "inbox" || groupIds.has(id));
                            // Adicionar grupos novos que não estão na ordem salva
                            const newGroups = initialGroups
                                .map(g => g.id)
                                .filter(id => !validOrder.includes(id));
                            if (validOrder.length > 0 || newGroups.length > 0) {
                                return ["inbox", ...validOrder.filter((id: string) => id !== "inbox"), ...newGroups];
                            }
                        } catch (e) {
                            // Fallback para ordem padrão
                        }
                    }
                }
                // Ordem padrão: inbox primeiro, depois grupos do banco
                return ["inbox", ...initialGroups.map(g => g.id)];
            }
        }
        return [];
    });
    const [projectOrder, setProjectOrder] = useState<string[]>(() => {
        if (initialViewOption === "project") {
            if (typeof window !== "undefined") {
                const savedOrder = localStorage.getItem("taskProjectOrder");
                if (savedOrder) {
                    try {
                        const parsed = JSON.parse(savedOrder);
                        if (Array.isArray(parsed)) {
                            return parsed;
                        }
                    } catch (e) {
                        // Fallback para ordem padrão
                    }
                }
            }
        }
        return [];
    });
    const { activeWorkspaceId, isLoaded } = useWorkspace();
    const workspaces = useWorkspaces();
    const localTasksRef = useRef<Task[]>([]);
    const listGroupsRef = useRef<Array<{ id: string; title: string; tasks: Task[]; groupColor?: string }>>([]);
    const addInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
    const previousGroupOrderRef = useRef<string[]>([]);
    const urlDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [projectIconName, setProjectIconName] = useState<string | null>(null);
    const searchParamsString = searchParams.toString();

    // âœ… NOVO: Usar workspaceId da prop se fornecido, senÃ£o usar do contexto
    const effectiveWorkspaceId = propWorkspaceId ?? activeWorkspaceId;

    // âœ… NOVO: Se initialTasks foi fornecido, nÃ£o usar o hook para buscar dados iniciais
    // O hook sÃ³ serÃ¡ usado para refetch quando necessÃ¡rio
    const shouldUseHook = !initialTasks;

    // Usar hook customizado para gerenciar tarefas (apenas se nÃ£o tiver initialTasks)
    const { tasks: tasksFromHook, isLoading: isLoadingTasks, error: tasksError, refetch: refetchTasks } = useTasks({
        workspaceId: effectiveWorkspaceId,
        tab: activeTab,
        enabled: isLoaded && shouldUseHook, // âœ… Desabilitar hook se initialTasks foi fornecido
        tag: tagFilter || undefined,
    });

    // FunÃ§Ã£o para mapear dados do banco para interface local (mantida para compatibilidade com outras partes do cÃ³digo)
    const mapTaskFromDB = (task: TaskFromDB | TaskWithDetails): Task => {
        // Extrair tags do origin_context se existir
        const tags: string[] = [];
        if ((task as any).tags && Array.isArray((task as any).tags)) {
            tags.push(...(task as any).tags);
        } else if (task.origin_context && typeof task.origin_context === 'object' && 'tags' in task.origin_context && Array.isArray((task.origin_context as any).tags)) {
            tags.push(...(task.origin_context as any).tags);
        }

        // Mapear assignees - usar array assignees se disponível (inclui task_members), senão usar assignee
        let assignees: Array<{ name: string; avatar?: string; id?: string }> = [];
        if ((task as any).assignees && Array.isArray((task as any).assignees)) {
            // Usar array assignees que já vem transformado das queries
            assignees = (task as any).assignees;
        } else {
            // Fallback para assignee antigo (compatibilidade)
            const assigneeData = (task as any).assignee;
            if (assigneeData) {
                assignees = [{
                    name: assigneeData.full_name || assigneeData.email || "Sem nome",
                    avatar: assigneeData.avatar_url || undefined,
                    id: task.assignee_id || undefined
                }];
            }
        }

        return {
            id: task.id,
            title: task.title,
            completed: task.status === "done",
            priority: (task.priority as "low" | "medium" | "high" | "urgent") || "medium",
            status: mapStatusToLabel(task.status || "todo"),
            assignees,
            assigneeId: task.assignee_id || null,
            dueDate: task.due_date || undefined,
            tags,
            hasUpdates: false,
            workspaceId: task.workspace_id || null,
            group: (task as any).group
                ? {
                    id: (task as any).group.id,
                    name: (task as any).group.name,
                    color: (task as any).group.color || undefined,
                }
                : undefined,
            // Contar comentÃ¡rios
            hasComments: ((task as any).comment_count || 0) > 0,
            commentCount: (task as any).comment_count || 0,
            position: (task as any).position ?? (task as any).order ?? undefined,
        };
    };

    // Manter estado local para atualizaÃ§Ãµes otimistas
    const [localTasks, setLocalTasks] = useState<Task[]>(() => {
        // âœ… NOVO: Inicializar com initialTasks se fornecido
        if (initialTasks) {
            const mapped = initialTasks.map(mapTaskFromDB);
            // ✅ Filtro adicional no cliente como fallback (caso o servidor não tenha filtrado)
            // Isso garante que mesmo se houver problema no filtro do servidor, o cliente filtra
            if (tagFilter) {
                const filtered = mapped.filter(task => {
                    const hasTag = task.tags?.some(tag => tag === tagFilter);
                    return hasTag;
                });
                // Debug log
                if (process.env.NODE_ENV === 'development') {
                    console.log('[TasksPage] Filtro cliente aplicado:', {
                        tagFilter,
                        total: mapped.length,
                        filtered: filtered.length,
                        sampleTags: mapped.slice(0, 3).map(t => t.tags)
                    });
                }
                return filtered;
            }
            return mapped;
        }
        return [];
    });

    // ✅ Sincronizar localTasks quando initialTasks ou tagFilter mudarem (mudança de projeto)
    const prevInitialTasksRef = useRef<string>('');
    const prevTagFilterRef = useRef<string | null>(null);
    useEffect(() => {
        if (initialTasks) {
            // Criar string de IDs ordenados para comparação estável
            const currentTaskIds = initialTasks
                .map(t => t.id)
                .sort()
                .join(',');

            // Verificar se initialTasks ou tagFilter mudaram
            const tasksChanged = prevInitialTasksRef.current !== currentTaskIds;
            const tagFilterChanged = prevTagFilterRef.current !== tagFilter;

            if (tasksChanged || tagFilterChanged) {
                prevInitialTasksRef.current = currentTaskIds;
                prevTagFilterRef.current = tagFilter;

                // Mapear e filtrar tarefas
                const mapped = initialTasks.map(mapTaskFromDB);
                if (tagFilter) {
                    const filtered = mapped.filter(task => {
                        const hasTag = task.tags?.some(tag => tag === tagFilter);
                        return hasTag;
                    });
                    if (process.env.NODE_ENV === 'development') {
                        console.log('[TasksPage] Atualizando tarefas por mudança de projeto:', {
                            tagFilter,
                            total: mapped.length,
                            filtered: filtered.length
                        });
                    }
                    setLocalTasks(filtered);
                } else {
                    setLocalTasks(mapped);
                }
            }
        }
    }, [initialTasks, tagFilter, mapTaskFromDB]);

    // ✅ Buscar ícone do projeto quando tagFilter mudar
    useEffect(() => {
        const loadProjectIcon = async () => {
            if (tagFilter && effectiveWorkspaceId) {
                try {
                    const iconName = await getProjectIcon(effectiveWorkspaceId, tagFilter);
                    setProjectIconName(iconName);
                } catch (error) {
                    console.error("Erro ao buscar ícone do projeto:", error);
                    setProjectIconName(null);
                }
            } else {
                setProjectIconName(null);
            }
        };

        loadProjectIcon();
    }, [tagFilter, effectiveWorkspaceId]);

    // ✅ Forçar atualização quando searchParams mudar (mudança de projeto)
    useEffect(() => {
        // Quando a tag na URL muda, forçar recarregamento dos dados do servidor
        if (tagFilter !== prevTagFilterRef.current && tagFilter !== null) {
            router.refresh();
        }
    }, [tagFilter, router]);

    useEffect(() => {
        if (decodedSearch !== searchQuery) {
            setSearchQuery(decodedSearch);
        }
    }, [decodedSearch]);

    // âœ… CORREÃ‡ÃƒO: ComparaÃ§Ã£o profunda baseada em IDs para evitar loops infinitos
    // Compara apenas os IDs das tarefas, nÃ£o as referÃªncias dos arrays
    const prevTaskIdsRef = useRef<string>('');
    useEffect(() => {
        // âœ… NOVO: Se initialTasks foi fornecido, nÃ£o sincronizar com hook
        if (initialTasks) {
            return;
        }

        // Criar string de IDs ordenados para comparaÃ§Ã£o estÃ¡vel
        const currentTaskIds = tasksFromHook
            .map(t => t.id)
            .sort()
            .join(',');

        // SÃ³ atualizar se os IDs realmente mudaram (evita re-renders desnecessÃ¡rios)
        if (prevTaskIdsRef.current !== currentTaskIds) {
            prevTaskIdsRef.current = currentTaskIds;
            setLocalTasks(tasksFromHook);
        }
    }, [tasksFromHook, initialTasks]);

    // Sensores para drag & drop (otimizados para resposta mais rápida)
    // useSensors já memoiza internamente, então não precisamos de useMemo adicional
    const sensors = useSensors(
        useSensor(MouseSensor, {
            activationConstraint: { distance: 10 },
        }),
        useSensor(TouchSensor, {
            activationConstraint: { delay: 250, tolerance: 5 },
        }),
        useSensor(PointerSensor, {
            activationConstraint: { distance: 10 },
        })
    );

    // rectIntersection é ainda melhor que pointerWithin para áreas grandes, pois detecta
    // interseção entre o retângulo arrastado e o alvo, não apenas o cursor.
    // Isso torna o drop muito mais "magnético" e indulgente.
    const collisionDetectionStrategy = rectIntersection;


    // Handler para criar grupo
    const handleCreateGroup = async () => {
        if (!newGroupName.trim()) {
            toast.error("Digite o nome do grupo");
            return;
        }

        setIsCreatingGroup(true);

        try {
            let targetWorkspaceId: string | null = effectiveWorkspaceId;

            // Se nÃ£o encontrou (improvÃ¡vel com o novo Sidebar), usar o primeiro workspace do contexto
            if (!targetWorkspaceId && workspaces.length > 0) {
                targetWorkspaceId = workspaces[0].id;
            }

            if (!targetWorkspaceId) {
                toast.error("NÃ£o foi possÃ­vel identificar o workspace. Certifique-se de que vocÃª Ã© membro de um workspace.");
                setIsCreatingGroup(false);
                return;
            }

            const result = await createTaskGroup(newGroupName.trim(), targetWorkspaceId, newGroupColor);

            if (result.success) {
                const newGroupId = result.data?.id;
                toast.success("Grupo criado com sucesso!");
                setNewGroupName("");
                setNewGroupColor("#e5e7eb");
                setIsCreateGroupModalOpen(false);
                // Último grupo criado sempre no topo, logo após o backlog
                if (newGroupId) {
                    setGroupOrder((prev) => {
                        const rest = prev.filter((id) => id !== "inbox" && id !== newGroupId);
                        const next = ["inbox", newGroupId, ...rest];
                        if (typeof window !== "undefined") {
                            localStorage.setItem("taskGroupOrder", JSON.stringify(next));
                        }
                        return next;
                    });
                }
                await loadGroups();
                await reloadTasks();
            } else {
                console.error("Erro ao criar grupo:", result.error);
                toast.error("Erro ao criar grupo: " + (result.error || "Erro desconhecido"));
            }
        } catch (err) {
            console.error("Erro ao criar grupo:", err);
            toast.error("Erro ao criar grupo");
        } finally {
            setIsCreatingGroup(false);
        }
    };

    // FunÃ§Ã£o para recarregar tarefas (com proteÃ§Ã£o contra loops)
    // FunÃ§Ã£o para recarregar tarefas (usa o hook ou recarrega via prop)
    const reloadTasks = useCallback(async () => {
        if (initialTasks) {
            // âœ… NOVO: Se initialTasks foi fornecido, nÃ£o usar hook
            // A pÃ¡gina Server Component deve ser recarregada via router.refresh()
            invalidateTasksCache(effectiveWorkspaceId, activeTab);
            router.refresh();
            return;
        }
        // Invalidar cache e refetch
        invalidateTasksCache(effectiveWorkspaceId, activeTab);
        await refetchTasks();
    }, [effectiveWorkspaceId, activeTab, refetchTasks, initialTasks, router]);

    // Callbacks memoizados para evitar re-renders infinitos
    const handleTaskUpdated = useCallback(() => {
        // Invalidar cache e recarregar tarefas apÃ³s atualizaÃ§Ã£o
        invalidateTasksCache(effectiveWorkspaceId, activeTab);
        if (!initialTasks) {
            refetchTasks();
        }
    }, [effectiveWorkspaceId, activeTab, refetchTasks, initialTasks]);

    const handleTaskDeleted = useCallback(() => {
        // Recarregar apÃ³s deletar
        invalidateTasksCache(effectiveWorkspaceId, activeTab);
        if (!initialTasks) {
            refetchTasks();
        }
    }, [effectiveWorkspaceId, activeTab, refetchTasks, initialTasks]);

    // Refs para acessar valores atuais sem causar re-renders
    const viewOptionRef = useRef(viewOption);
    viewOptionRef.current = viewOption;
    useEffect(() => {
        localTasksRef.current = localTasks;
    }, [localTasks]);
    const groupColorsRef = useRef(groupColors);
    groupColorsRef.current = groupColors;
    const availableGroupsRef = useRef(availableGroups);
    availableGroupsRef.current = availableGroups;
    const refetchTasksRef = useRef(refetchTasks);
    refetchTasksRef.current = refetchTasks;

    // Callbacks memoizados para TaskGroup - usar refs para evitar dependÃªncias
    const handleRenameGroup = useCallback(async (groupId: string, newTitle: string) => {
        const currentViewOption = viewOptionRef.current;
        const currentLocalTasks = localTasksRef.current;
        const currentLoadGroups = loadGroups;

        if (currentViewOption !== "group") {
            toast.error("NÃ£o Ã© possÃ­vel editar o nome de grupos automÃ¡ticos.");
            return;
        }

        if (groupId === "inbox" || groupId === "Inbox") {
            toast.error("O grupo padrao BACKLOG/INBOX nao pode ser renomeado.");
            return;
        }

        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(groupId)) {
            toast.error("ID de grupo invÃ¡lido");
            return;
        }

        const oldTasks = [...currentLocalTasks];
        setLocalTasks((prev) => prev.map((t) =>
            t.group?.id === groupId ? { ...t, group: { ...t.group!, name: newTitle } } : t
        ));

        try {
            const result = await updateTaskGroup(groupId, { name: newTitle });
            if (result.success) {
                toast.success("Grupo renomeado com sucesso");
                if (currentLoadGroups) await currentLoadGroups();
                invalidateTasksCache(effectiveWorkspaceId, activeTab);
                refetchTasksRef.current();
            } else {
                setLocalTasks(oldTasks);
                toast.error(result.error || "Erro ao renomear grupo");
            }
        } catch (error) {
            setLocalTasks(oldTasks);
            toast.error("Erro ao renomear grupo");
        }
    }, [effectiveWorkspaceId, activeTab]);

    const handleColorChange = useCallback(async (groupId: string, color: string) => {
        const currentViewOption = viewOptionRef.current;
        const currentLocalTasks = localTasksRef.current;
        const currentGroupColors = groupColorsRef.current;
        const currentLoadGroups = loadGroups;

        if (currentViewOption !== "group") return;
        if (groupId === "inbox" || groupId === "Inbox") return;

        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(groupId)) {
            toast.error("ID de grupo invÃ¡lido");
            return;
        }

        const oldTasks = [...currentLocalTasks];
        const oldGroupColors = { ...currentGroupColors };

        setLocalTasks((prev) => prev.map((t) =>
            t.group?.id === groupId ? { ...t, group: { ...t.group!, color } } : t
        ));
        setGroupColors((prev) => ({ ...prev, [groupId]: color }));

        try {
            const result = await updateTaskGroup(groupId, { color });
            if (result.success) {
                toast.success("Cor do grupo atualizada");
                if (currentLoadGroups) await currentLoadGroups();
                invalidateTasksCache(effectiveWorkspaceId, activeTab);
                refetchTasksRef.current();
            } else {
                setLocalTasks(oldTasks);
                setGroupColors(oldGroupColors);
                toast.error(result.error || "Erro ao atualizar cor do grupo");
            }
        } catch (error) {
            setLocalTasks(oldTasks);
            setGroupColors(oldGroupColors);
            toast.error("Erro ao atualizar cor do grupo");
        }
    }, [effectiveWorkspaceId, activeTab]);

    const handleDeleteGroup = useCallback(async (groupId: string) => {
        const currentViewOption = viewOptionRef.current;
        const currentLoadGroups = loadGroups;

        if (currentViewOption !== "group") return;
        if (groupId === "inbox" || groupId === "Inbox") {
            toast.error("O grupo BACKLOG/INBOX nao pode ser deletado.");
            return;
        }

        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(groupId)) {
            toast.error("ID de grupo invÃ¡lido");
            return;
        }

        try {
            const result = await deleteTaskGroup(groupId);
            if (result.success) {
                toast.success("Grupo deletado com sucesso");
                if (currentLoadGroups) await currentLoadGroups();
                invalidateTasksCache(effectiveWorkspaceId, activeTab);
                refetchTasksRef.current();
            } else {
                toast.error(result.error || "Erro ao deletar grupo");
            }
        } catch (error) {
            toast.error("Erro ao deletar grupo");
        }
    }, [effectiveWorkspaceId, activeTab]);

    // ? Optimistic Create: Adiciona tarefa instantaneamente ao estado local
    const handleTaskCreatedOptimistic = useCallback((taskData: {
        id: string; // ID temporário ou real
        title: string;
        status: string;
        priority?: "low" | "medium" | "high" | "urgent";
        assignees?: Array<{ name: string; avatar?: string; id?: string }>;
        dueDate?: string;
        groupId?: string | null;
        workspaceId?: string | null;
        tags?: string[];
        position?: number;
        isPending?: boolean; // ? Marca se está sendo criada (para mostrar skeleton)
    }) => {
        const resolvedPosition = typeof taskData.position === "number" ? taskData.position : undefined;
        const newTask: Task = {
            id: taskData.id,
            title: taskData.title,
            completed: taskData.status === "done",
            priority: taskData.priority || "medium",
            status: taskData.status,
            assignees: taskData.assignees || [],
            assigneeId: taskData.assignees?.[0]?.id || null,
            dueDate: taskData.dueDate,
            tags: taskData.tags || [],
            hasUpdates: false,
            workspaceId: taskData.workspaceId || null,
            group: taskData.groupId ? {
                id: taskData.groupId,
                name: availableGroups.find(g => g.id === taskData.groupId)?.name || "Grupo",
                color: availableGroups.find(g => g.id === taskData.groupId)?.color || undefined
            } : undefined,
            hasComments: false,
            commentCount: 0,
            position: resolvedPosition,
            isPending: taskData.isPending ?? true, // ? Por padrão, tarefas otimistas estão pending
        };

        setLocalTasks((prev) => {
            // ? Seguir ordem existente: adicionar no final
            // Isso mantém consistência com ordenação (position, priority, etc.)
            // e permite criação rápida sem quebrar o fluxo visual
            // O QuickTaskAdd está no final, então faz sentido a tarefa aparecer logo acima dele
            if (sortBy === "position") {
                // Quando ordenado por position: calcular última posição e adicionar no final
                // Filtrar tarefas do mesmo grupo se viewOption === "group"
                const tasksInSameGroup = viewOption === "group" && taskData.groupId
                    ? prev.filter(t => (t.group?.id || null) === taskData.groupId)
                    : prev;

                const maxPosition = tasksInSameGroup.length > 0
                    ? Math.max(...tasksInSameGroup.map(t => t.position ?? 0))
                    : 0;

                const taskWithPosition = {
                    ...newTask,
                    position: resolvedPosition ?? (maxPosition + 1000) // Adicionar no final da lista/grupo
                };

                // Adicionar no final do array completo (a ordenação será reaplicada)
                return [...prev, taskWithPosition];
            } else {
                // Outras ordenações: adicionar no final também para manter consistência
                // A ordenação será reaplicada automaticamente pelo useMemo
                return [...prev, newTask];
            }
        });
    }, [availableGroups, sortBy, viewOption]); // ? Adicionar sortBy e viewOption nas dependências

    const getNextPosition = useCallback((groupId?: string | null) => {
        const allTasks = localTasksRef.current;
        const tasksInSameGroup = viewOption === "group" && groupId
            ? allTasks.filter(t => (t.group?.id || null) === groupId)
            : allTasks;
        const maxPosition = tasksInSameGroup.length > 0
            ? Math.max(...tasksInSameGroup.map(t => t.position ?? 0))
            : 0;

        return maxPosition + 1000;
    }, [viewOption]);

    // ? Optimistic Delete: Remove tarefa instantaneamente do estado local
    const handleOptimisticDelete = useCallback((taskId: string | number) => {
        const id = String(taskId);
        setLocalTasks((prev) => {
            return prev.filter(t => String(t.id) !== id);
        });
    }, []);

    // Handler para adicionar tarefa em grupo (usado no TaskGroup) com Optimistic UI
    const handleAddTaskToGroup = useCallback(async (
        groupId: string,
        title: string,
        dueDate?: Date | null,
        assigneeId?: string | null,
        tags?: string[]
    ) => {
        // ? 1. Snapshot do estado anterior (para rollback)
        const previousTasks = [...localTasksRef.current];

        // Mapear status/priority baseado no viewOption e groupId (columnId)
        const statusMap: Record<string, "todo" | "in_progress" | "review" | "correction" | "blocked" | "done"> = {
            "Não iniciada": "todo",
            "Em progresso": "in_progress",
            "Revisão": "review",
            "Correção": "correction",
            "Bloqueado": "blocked",
            "Finalizado": "done",
            // Aliases para compatibilidade
            "Backlog": "todo",
            "Triagem": "todo",
            "Execução": "in_progress",
        };

        let dbStatus: "todo" | "in_progress" | "review" | "correction" | "blocked" | "done" | undefined = "todo";
        let priority: "low" | "medium" | "high" | "urgent" | undefined;
        let finalGroupId: string | null | undefined = null;
        let statusLabel: string = STATUS_TO_LABEL.todo;

        if (viewOption === "status") {
            dbStatus = statusMap[groupId] || "todo";
            statusLabel = groupId;
        } else if (viewOption === "priority") {
            priority = groupId as "low" | "medium" | "high" | "urgent";
            dbStatus = "todo";
            statusLabel = STATUS_TO_LABEL.todo;
        } else if (viewOption === "group") {
            // Se estiver na visão de grupos, usar o groupId recebido
            // Se for "inbox", groupId é null (explicitamente)
            if (groupId === "inbox" || groupId === "Inbox") {
                finalGroupId = null;
            } else {
                // Validar: só enviar group_id se o grupo ainda existir em availableGroups (evita FK violation)
                const groupExists = availableGroups.some((g) => g.id === groupId);
                if (!groupExists) {
                    toast.info("Grupo não encontrado; tarefa adicionada ao Backlog.");
                    finalGroupId = null;
                } else {
                    finalGroupId = groupId;
                }
            }
            dbStatus = "todo";
            statusLabel = STATUS_TO_LABEL.todo;
        } else if (viewOption === "assignee") {
            // Encontrar o membro pelo nome para obter o ID
            if (groupId === "Sem responsável") {
                assigneeId = null;
            } else {
                const member = workspaceMembers.find(m => m.name === groupId);
                if (member) {
                    assigneeId = member.id;
                }
            }
            dbStatus = "todo";
            statusLabel = STATUS_TO_LABEL.todo;
        }

        // ? 2. Atualização otimista: adicionar tarefa ao estado local imediatamente
        const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const assignee = assigneeId ? workspaceMembers.find(m => m.id === assigneeId) : undefined;

        // ✅ Incluir tags do projeto baseado no contexto
        const projectTags =
            viewOption === "project"
                ? (groupId === "inbox" || groupId === "Inbox" ? [] : [groupId])
                : undefined;
        const finalTags = tags || projectTags || (tagFilter ? [tagFilter] : []);
        const nextPosition = getNextPosition(finalGroupId);

        handleTaskCreatedOptimistic({
            id: tempId,
            title,
            status: statusLabel,
            priority: priority,
            assignees: assignee ? [{
                id: assignee.id,
                name: assignee.name,
                avatar: assignee.avatar
            }] : undefined,
            dueDate: dueDate ? dueDate.toISOString() : undefined,
            groupId: finalGroupId,
            workspaceId: effectiveWorkspaceId || null,
            tags: finalTags,
            position: nextPosition,
        });

        try {
            // ? 3. Backend em background
            const result = await createTask({
                title,
                status: dbStatus as any,
                priority: priority,
                assignee_id: assigneeId || undefined,
                due_date: dueDate ? dueDate.toISOString() : undefined,
                workspace_id: effectiveWorkspaceId || null,
                group_id: finalGroupId,
                tags: finalTags.length > 0 ? finalTags : undefined,
                position: nextPosition,
            });

            if (result.success && 'data' in result && result.data) {
                // ? 4. Sucesso: atualizar tarefa otimista com ID real do backend e remover pending
                const createdTask = result.data;
                setLocalTasks((prev) => {
                    return prev.map((task) => {
                        if (task.id === tempId) {
                            return {
                                ...task,
                                id: createdTask.id,
                                status: createdTask.status ? mapStatusToLabel(createdTask.status as string) || task.status : task.status,
                                priority: (createdTask.priority as "low" | "medium" | "high" | "urgent") || task.priority,
                                dueDate: createdTask.due_date || task.dueDate,
                                isPending: false, // ? Marcar como não pending após sucesso
                            } as Task;
                        }
                        return task;
                    });
                });
                // Foco no input do próximo grupo após adicionar tarefa (setTimeout para rodar após QuickTaskAdd)
                setTimeout(() => {
                    const groups = listGroupsRef.current;
                    const idx = groups.findIndex((g) => g.id === groupId);
                    if (idx >= 0 && idx < groups.length - 1) {
                        const nextId = groups[idx + 1].id;
                        addInputRefs.current[nextId]?.focus();
                    }
                }, 0);
            } else {
                // ? 5. Erro: rollback - remover tarefa otimista
                setLocalTasks(previousTasks);
                console.error("Erro ao criar tarefa:", result.error);
                if (result.error === "Usuário não autenticado") {
                    router.push("/login");
                } else {
                    toast.error("Erro ao criar tarefa: " + (result.error || "Erro desconhecido"));
                }
            }
        } catch (error) {
            // ? 5. Erro: rollback - remover tarefa otimista
            setLocalTasks(previousTasks);
            console.error("Erro ao criar tarefa:", error);
            toast.error("Erro ao criar tarefa");
        }
    }, [viewOption, effectiveWorkspaceId, activeTab, router, workspaceMembers, handleTaskCreatedOptimistic, availableGroups, tagFilter, getNextPosition]);

    // Handler para adicionar tarefa no kanban (TaskBoard) com Optimistic UI
    // Reutiliza a mesma lógica do handleAddTaskToGroup
    const handleAddTaskToKanban = useCallback(async (
        columnId: string,
        title: string,
        dueDate?: Date | null,
        assigneeId?: string | null,
        tags?: string[]
    ) => {
        // Usar o mesmo handler que funciona para TaskGroup
        // O columnId funciona da mesma forma que groupId
        return handleAddTaskToGroup(columnId, title, dueDate, assigneeId, tags);
    }, [handleAddTaskToGroup]);

    // ? Handler para excluir tarefa com Optimistic UI e rollback
    const handleDeleteTaskWithOptimistic = useCallback(async (taskId: string | number) => {
        const id = String(taskId);

        // ? 1. Snapshot do estado anterior (para rollback)
        const previousTasks = [...localTasksRef.current];

        // ? 2. Optimistic UI: Remover tarefa do estado local imediatamente
        handleOptimisticDelete(id);

        try {
            // ? 3. Backend em background
            const result = await deleteTask(id);

            if (result.success) {
                // ? 4. Sucesso: Tarefa já foi removida otimisticamente
                toast.success("Tarefa excluída com sucesso");
                // Invalidar cache para sincronizar
                invalidateTasksCache(effectiveWorkspaceId, activeTab);
            } else {
                // ? 5. Erro: Rollback - restaurar tarefa
                setLocalTasks(previousTasks);
                console.error("Erro ao excluir tarefa:", result.error);
                if (result.error === "Usuário não autenticado") {
                    router.push("/login");
                } else {
                    toast.error("Erro ao excluir tarefa: " + (result.error || "Erro desconhecido"));
                }
            }
        } catch (error) {
            // ? 5. Erro: Rollback - restaurar tarefa
            setLocalTasks(previousTasks);
            console.error("Erro ao excluir tarefa:", error);
            toast.error("Erro ao excluir tarefa");
        }
    }, [handleOptimisticDelete, effectiveWorkspaceId, activeTab, router]);

    // Ref para groupedData (serÃ¡ atualizado apÃ³s groupedData ser definido)
    const groupedDataRef = useRef<Record<string, Task[]>>({});

    const handleClearGroup = useCallback(async (groupId: string, type?: "all" | "completed") => {
        const currentGroupedData = groupedDataRef.current; // Usar ref (atualizado após groupedData)
        const currentLocalTasks = localTasksRef.current;

        let groupTasks = currentGroupedData[groupId] || [];

        // Filtrar tarefas baseado no tipo de limpeza
        if (type === "completed") {
            groupTasks = groupTasks.filter((t: Task) => t.completed === true);
        }

        if (groupTasks.length === 0) {
            const message = type === "completed"
                ? "Nenhuma tarefa concluída para limpar neste grupo"
                : "Nenhuma tarefa para limpar neste grupo";
            toast.info(message);
            return;
        }

        const previousTasks = [...currentLocalTasks];
        const taskIdsToArchive = groupTasks.map((t: Task) => t.id);

        // Optimistic UI: Remove tasks immediately
        setLocalTasks((prev) => prev.filter((t: Task) => {
            if (taskIdsToArchive.includes(t.id)) {
                return false;
            }
            return true;
        }));

        try {
            // ✅ Use server-side bulk action for performance
            // Normalize groupId "Inbox" -> "inbox" just in case, though the action handles both
            const normalizedGroupId = (groupId === "Inbox" || groupId === "inbox") ? "inbox" : groupId;

            const result = await bulkArchiveTasks(effectiveWorkspaceId!, {
                groupId: normalizedGroupId,
                completedOnly: type === "completed"
            });

            if (result.success) {
                invalidateTasksCache(effectiveWorkspaceId, activeTab);
                refetchTasksRef.current();

                const count = result.count ?? groupTasks.length;
                const message = type === "completed"
                    ? `${count} tarefa${count !== 1 ? 's' : ''} concluída${count !== 1 ? 's' : ''} arquivada${count !== 1 ? 's' : ''} com sucesso`
                    : `${count} tarefa${count !== 1 ? 's' : ''} arquivada${count !== 1 ? 's' : ''} com sucesso`;
                toast.success(message);
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error("Erro ao limpar grupo:", error);
            setLocalTasks(previousTasks); // Rollback
            invalidateTasksCache(effectiveWorkspaceId, activeTab);
            refetchTasksRef.current();
            toast.error("Erro ao limpar grupo");
        }
    }, [effectiveWorkspaceId, activeTab]);

    // Carregar cores dos grupos do localStorage
    useEffect(() => {
        const savedColors = localStorage.getItem("taskGroupColors");
        if (savedColors) {
            try {
                setGroupColors(JSON.parse(savedColors));
            } catch (e) {
                console.error("Erro ao carregar cores dos grupos:", e);
            }
        }
    }, []);

    // Salvar cores dos grupos no localStorage
    useEffect(() => {
        if (Object.keys(groupColors).length > 0) {
            localStorage.setItem("taskGroupColors", JSON.stringify(groupColors));
        }
    }, [groupColors]);

    // Limpar cores de grupos que nÃ£o existem mais quando viewOption muda
    useEffect(() => {
        // SÃ³ faz sentido limpar se groupColors estiver sendo usado para viewOption
        // Por seguranÃ§a, vamos manter o estado anterior se nÃ£o for "group"
        // Mas se mudarmos para "status", os IDs mudam, entÃ£o as cores antigas nÃ£o servem
        // Melhor deixar o usuÃ¡rio redefinir cores se necessÃ¡rio ou manter cache

        // const currentGroupIds = Object.keys(groupedData);
        // setGroupColors((prev) => {
        //     const cleaned: Record<string, string> = {};
        //     currentGroupIds.forEach((id) => {
        //         if (prev[id]) {
        //             cleaned[id] = prev[id];
        //         }
        //     });
        //     return cleaned;
        // });
    }, [viewOption]); // eslint-disable-line react-hooks/exhaustive-deps

    // FunÃ§Ã£o para carregar grupos
    const loadGroups = useCallback(async () => {
        try {
            // Usar workspace ativo do contexto diretamente
            // NÃ£o fazer fallback para getUserWorkspaces aqui - isso adiciona latÃªncia desnecessÃ¡ria
            // Se nÃ£o houver workspace, simplesmente retornar grupos vazios
            const targetWorkspaceId: string | null = effectiveWorkspaceId;

            const result = await getTaskGroups(targetWorkspaceId);
            if (result.success && result.data) {
                const groupsData = result.data;
                setAvailableGroups(groupsData);

                // Preservar ordem existente ou inicializar se não existir
                // Usar funÃ§Ã£o de callback do setState para acessar o valor atual de groupOrder
                setGroupOrder((currentOrder) => {
                    if (viewOption === "group") {
                        const groupIds = new Set(groupsData.map((g: any) => g.id));
                        // Tentar ordem salva primeiro quando não há ordem atual (ex.: troca de workspace)
                        let baseOrder = currentOrder;
                        if (currentOrder.length === 0 && typeof window !== "undefined") {
                            const savedOrder = localStorage.getItem("taskGroupOrder");
                            if (savedOrder) {
                                try {
                                    const parsed = JSON.parse(savedOrder);
                                    baseOrder = parsed.filter((id: string) => id === "inbox" || groupIds.has(id));
                                } catch {
                                    baseOrder = [];
                                }
                            }
                        }
                        // Sanitizar: manter só "inbox" e ids que existem em groupsData (evita colunas fantasma / FK violation)
                        const validOrder = baseOrder.filter((id: string) => id === "inbox" || groupIds.has(id));
                        const newGroups = groupsData
                            .map((g: any) => g.id)
                            .filter((id: string) => !validOrder.includes(id));
                        const updatedOrder = ["inbox", ...validOrder.filter((id: string) => id !== "inbox"), ...newGroups];
                        if (typeof window !== "undefined") {
                            localStorage.setItem("taskGroupOrder", JSON.stringify(updatedOrder));
                        }
                        return updatedOrder;
                    }
                    return currentOrder;
                });
            } else {
                // Se nÃ£o houver grupos, limpar lista
                setAvailableGroups([]);
            }
        } catch (error) {
            console.error("Erro ao carregar grupos:", error);
            setAvailableGroups([]);
        }
    }, [effectiveWorkspaceId, viewOption]);

    // Ref para saber se workspace/tab mudou (evita limpar ao só trocar viewOption)
    const prevWorkspaceTabRef = useRef({ workspaceId: effectiveWorkspaceId, tab: activeTab });

    // Carregar grupos quando workspace/tab mudar (não limpar ao trocar para "Personalizado" — evita delay em grupos vazios)
    useEffect(() => {
        if (!isLoaded) return;

        const workspaceOrTabChanged =
            prevWorkspaceTabRef.current.workspaceId !== effectiveWorkspaceId ||
            prevWorkspaceTabRef.current.tab !== activeTab;
        if (workspaceOrTabChanged) {
            prevWorkspaceTabRef.current = { workspaceId: effectiveWorkspaceId, tab: activeTab };
            setAvailableGroups([]);
            setGroupOrder([]); // evita manter ids de grupos do workspace anterior (FK violation)
        }

        // Carregar grupos em background (não bloqueia a UI)
        loadGroups().catch((err) => {
            console.error("Erro ao carregar grupos:", err);
        });
    }, [effectiveWorkspaceId, activeTab, isLoaded, loadGroups]);

    // Ao voltar para "Personalizado" com groupOrder vazio, restaurar ordem do localStorage imediatamente (evita flicker)
    useLayoutEffect(() => {
        if (viewOption !== "group") return;
        if (groupOrder.length > 0) return;
        if (availableGroups.length === 0) return;
        if (typeof window === "undefined") return;
        try {
            const savedOrder = localStorage.getItem("taskGroupOrder");
            if (!savedOrder) {
                setGroupOrder(["inbox", ...availableGroups.map((g) => g.id)]);
                return;
            }
            const parsed = JSON.parse(savedOrder);
            const groupIds = new Set(availableGroups.map((g) => g.id));
            const validOrder = parsed.filter((id: string) => id === "inbox" || groupIds.has(id));
            const newGroups = availableGroups.map((g) => g.id).filter((id) => !validOrder.includes(id));
            const finalOrder = ["inbox", ...validOrder.filter((id: string) => id !== "inbox"), ...newGroups];
            if (finalOrder.length > 0) setGroupOrder(finalOrder);
        } catch {
            setGroupOrder(["inbox", ...availableGroups.map((g) => g.id)]);
        }
    }, [viewOption, groupOrder.length, availableGroups]);

    // Buscar membros do workspace
    useEffect(() => {
        const loadMembers = async () => {
            // Se nÃ£o houver workspace ativo, limpar lista e nÃ£o buscar
            if (!effectiveWorkspaceId) {
                setWorkspaceMembers([]);
                return;
            }

            try {
                const members = await getWorkspaceMembers(effectiveWorkspaceId);
                const mappedMembers = members.map((m: any) => ({
                    id: m.id || m.email || "",
                    name: m.full_name || m.email || "UsuÃ¡rio",
                    avatar: m.avatar_url || undefined,
                }));
                setWorkspaceMembers(mappedMembers);
            } catch (error) {
                console.error("Erro ao carregar membros:", error);
            }
        };
        loadMembers();
    }, [effectiveWorkspaceId]);

    // ? Atualização otimista: atualiza estado local imediatamente (Optimistic UI)
    const updateLocalTask = useCallback((taskId: string | number, updates: Partial<Task>) => {
        const id = String(taskId);
        setLocalTasks((prev) => {
            const taskIndex = prev.findIndex(t => String(t.id) === id);
            if (taskIndex === -1) {
                console.warn("[updateLocalTask] Tarefa não encontrada:", id);
                return prev;
            }

            const updated = prev.map((task, index) => {
                if (index === taskIndex) {
                    return { ...task, ...updates };
                }
                return task;
            });

            return updated;
        });
    }, []);

    const handleReorderGroup = useCallback(async (groupId: string, direction: "up" | "down" | "top" | "bottom") => {
        const currentViewOption = viewOptionRef.current;

        if (currentViewOption !== "group") return;
        if (groupId === "inbox" || groupId === "Inbox") {
            toast.error("O grupo BACKLOG/INBOX nao pode ser reordenado.");
            return;
        }

        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(groupId)) {
            toast.error("Grupo inválido.");
            return;
        }

        if (!activeWorkspaceId) {
            toast.error("Workspace não encontrado.");
            return;
        }

        // Optimistic UI: reordenar groupOrder localmente
        setGroupOrder((currentOrder) => {
            previousGroupOrderRef.current = [...currentOrder]; // Salvar para rollback
            const previousOrder = [...currentOrder];
            const currentIndex = previousOrder.findIndex(id => id === groupId);

            if (currentIndex === -1) {
                toast.error("Grupo não encontrado.");
                return currentOrder;
            }

            // Calcular índice mínimo (após inbox se existir)
            const minIndex = previousOrder[0] === "inbox" ? 1 : 0;
            const maxIndex = previousOrder.length - 1;

            // Verificar limites e calcular novo índice
            let newIndex: number;

            if (direction === "top") {
                // Mover para o topo (após inbox se existir)
                if (currentIndex === minIndex) {
                    return currentOrder; // Já está no topo permitido
                }
                newIndex = minIndex;
            } else if (direction === "bottom") {
                // Mover para o final
                if (currentIndex === maxIndex) {
                    return currentOrder; // Já está no final
                }
                newIndex = maxIndex;
            } else if (direction === "up") {
                // Mover para cima
                if (currentIndex <= minIndex) {
                    return currentOrder; // Já está no topo permitido
                }
                newIndex = currentIndex - 1;
            } else { // direction === "down"
                // Mover para baixo
                if (currentIndex === maxIndex) {
                    return currentOrder; // Já está no final
                }
                newIndex = currentIndex + 1;
            }

            // Reordenar localmente
            const reorderedOrder = [...previousOrder];
            const [movedGroupId] = reorderedOrder.splice(currentIndex, 1);
            reorderedOrder.splice(newIndex, 0, movedGroupId);

            // Salvar no localStorage
            if (typeof window !== "undefined") {
                localStorage.setItem("taskGroupOrder", JSON.stringify(reorderedOrder));
            }

            return reorderedOrder;
        });

        try {
            // Para "top" e "bottom", fazer múltiplas chamadas de "up" ou "down"
            // até chegar na posição desejada
            if (direction === "top" || direction === "bottom") {
                const currentOrder = previousGroupOrderRef.current;
                const currentIndex = currentOrder.findIndex(id => id === groupId);
                const minIndex = currentOrder[0] === "inbox" ? 1 : 0;
                const maxIndex = currentOrder.length - 1;

                if (direction === "top") {
                    // Mover para o topo: fazer múltiplas chamadas "up"
                    const steps = currentIndex - minIndex;
                    let lastSuccessfulOrder = [...currentOrder];

                    for (let i = 0; i < steps; i++) {
                        const result = await reorderTaskGroup(groupId, "up", activeWorkspaceId);
                        if (!result.success) {
                            // Se o erro for "já está no topo", significa que chegamos na posição desejada
                            if (result.error?.includes("já está no topo") || result.error?.includes("já está no final")) {
                                // Já está na posição desejada - sucesso!
                                break;
                            }
                            // Rollback em caso de outro erro
                            setGroupOrder(previousGroupOrderRef.current);
                            if (typeof window !== "undefined") {
                                localStorage.setItem("taskGroupOrder", JSON.stringify(previousGroupOrderRef.current));
                            }
                            toast.error(result.error || "Erro ao reordenar grupo");
                            return;
                        }

                        // Atualizar ordem local após cada chamada bem-sucedida
                        setGroupOrder((prevOrder) => {
                            const updatedOrder = [...prevOrder];
                            const groupIndex = updatedOrder.findIndex(id => id === groupId);
                            if (groupIndex > minIndex) {
                                const [movedGroup] = updatedOrder.splice(groupIndex, 1);
                                updatedOrder.splice(groupIndex - 1, 0, movedGroup);
                                lastSuccessfulOrder = updatedOrder;
                                if (typeof window !== "undefined") {
                                    localStorage.setItem("taskGroupOrder", JSON.stringify(updatedOrder));
                                }
                            }
                            return updatedOrder;
                        });

                        // Pequeno delay para garantir que a mudança foi processada
                        await new Promise(resolve => setTimeout(resolve, 100));
                    }
                } else { // direction === "bottom"
                    // Mover para o final: fazer múltiplas chamadas "down"
                    const steps = maxIndex - currentIndex;
                    let lastSuccessfulOrder = [...currentOrder];

                    for (let i = 0; i < steps; i++) {
                        const result = await reorderTaskGroup(groupId, "down", activeWorkspaceId);
                        if (!result.success) {
                            // Se o erro for "já está no final", significa que chegamos na posição desejada
                            if (result.error?.includes("já está no final") || result.error?.includes("já está no topo")) {
                                // Já está na posição desejada - sucesso!
                                break;
                            }
                            // Rollback em caso de outro erro
                            setGroupOrder(previousGroupOrderRef.current);
                            if (typeof window !== "undefined") {
                                localStorage.setItem("taskGroupOrder", JSON.stringify(previousGroupOrderRef.current));
                            }
                            toast.error(result.error || "Erro ao reordenar grupo");
                            return;
                        }

                        // Atualizar ordem local após cada chamada bem-sucedida
                        setGroupOrder((prevOrder) => {
                            const updatedOrder = [...prevOrder];
                            const groupIndex = updatedOrder.findIndex(id => id === groupId);
                            if (groupIndex < maxIndex) {
                                const [movedGroup] = updatedOrder.splice(groupIndex, 1);
                                updatedOrder.splice(groupIndex + 1, 0, movedGroup);
                                lastSuccessfulOrder = updatedOrder;
                                if (typeof window !== "undefined") {
                                    localStorage.setItem("taskGroupOrder", JSON.stringify(updatedOrder));
                                }
                            }
                            return updatedOrder;
                        });

                        // Pequeno delay para garantir que a mudança foi processada
                        await new Promise(resolve => setTimeout(resolve, 100));
                    }
                }

                // Não recarregar grupos aqui - a ordem já foi atualizada otimisticamente
                // e as múltiplas chamadas já atualizaram o servidor
                toast.success("Grupo reordenado");
            } else {
                // Para "up" e "down", fazer chamada única
                const result = await reorderTaskGroup(groupId, direction, activeWorkspaceId);
                if (!result.success) {
                    // Rollback em caso de erro
                    const previousOrder = previousGroupOrderRef.current;
                    setGroupOrder(previousOrder);
                    if (typeof window !== "undefined") {
                        localStorage.setItem("taskGroupOrder", JSON.stringify(previousOrder));
                    }
                    toast.error(result.error || "Erro ao reordenar grupo");
                } else {
                    // Recarregar grupos do servidor para garantir sincronização
                    await loadGroups();
                    toast.success("Grupo reordenado");
                }
            }
        } catch (error) {
            // Rollback em caso de exceção
            const previousOrder = previousGroupOrderRef.current;
            setGroupOrder(previousOrder);
            if (typeof window !== "undefined") {
                localStorage.setItem("taskGroupOrder", JSON.stringify(previousOrder));
            }
            console.error("Erro ao reordenar grupo:", error);
            toast.error("Erro ao reordenar grupo");
        }
    }, [activeWorkspaceId, loadGroups]);

    // ? Callback memoizado para optimistic updates
    const handleOptimisticUpdate = useCallback((taskId: string | number, updates: Partial<{
        title?: string;
        status?: string;
        dueDate?: string;
        priority?: string;
        assignees?: Array<{ name: string; avatar?: string; id?: string }>;
        tags?: string[];
        group?: { id: string; name: string; color?: string };
    }>) => {
        const localUpdates: Partial<Task> = {};
        if (updates.title) localUpdates.title = updates.title;
        if (updates.status) {
            localUpdates.status = updates.status;
        }
        if (updates.dueDate !== undefined) localUpdates.dueDate = updates.dueDate || undefined;
        if (updates.priority) localUpdates.priority = updates.priority as "low" | "medium" | "high" | "urgent";
        if (updates.assignees) {
            localUpdates.assignees = updates.assignees;
            // ? Também atualizar assigneeId para manter consistência
            localUpdates.assigneeId = updates.assignees[0]?.id || null;
        }
        if (updates.tags !== undefined) localUpdates.tags = updates.tags;
        if (updates.group) localUpdates.group = updates.group;

        updateLocalTask(taskId, localUpdates);
    }, [updateLocalTask]);


    // Filtrar tarefas por busca
    // FunÃ§Ã£o para alternar status de conclusÃ£o
    const handleToggleComplete = async (taskId: string, completed: boolean) => {
        // AtualizaÃ§Ã£o otimista no estado local
        setLocalTasks((prevTasks) =>
            prevTasks.map((task) =>
                task.id === taskId
                    ? { ...task, completed }
                    : task
            )
        );

        // Persistir no backend de forma assÃ­ncrona
        try {
            const result = await updateTask({
                id: taskId,
                status: completed ? "done" : "todo",
            });

            if (!result.success) {
                // Reverter em caso de erro
                setLocalTasks((prevTasks) =>
                    prevTasks.map((task) =>
                        task.id === taskId
                            ? { ...task, completed: !completed }
                            : task
                    )
                );
                console.error("Erro ao atualizar tarefa:", result.error);
                toast.error("Erro ao atualizar tarefa");
            }
            // Sucesso - não há dados retornados pelo updateTask (retorna { success: true, data: null })
            // A atualização otimista já foi feita acima, então não precisamos fazer nada aqui
        } catch (error) {
            // Reverter em caso de erro
            setLocalTasks((prevTasks) =>
                prevTasks.map((task) =>
                    task.id === taskId
                        ? { ...task, completed: !completed }
                        : task
                )
            );
            console.error("Erro ao atualizar tarefa:", error);
            toast.error("Erro ao atualizar tarefa");
        }
    };

    const filteredTasks = useMemo(() => {
        if (!searchQuery.trim()) {
            return localTasks;
        }

        const query = searchQuery.toLowerCase().trim();
        return localTasks.filter((task) => {
            return (
                task.title.toLowerCase().includes(query) ||
                task.tags?.some((tag) => tag.toLowerCase().includes(query)) ||
                task.assignees?.some((assignee) => assignee.name.toLowerCase().includes(query))
            );
        });
    }, [localTasks, searchQuery]);

    // Função de agrupamento dinâmico
    const groupedData = useMemo(() => {
        const groups: Record<string, Task[]> = {};
        const opt = viewOption;

        // Mapeamento de prioridades para portuguÃªs
        const priorityLabels: Record<string, string> = {
            "urgent": "Urgente",
            "high": "Alta",
            "medium": "MÃ©dia",
            "low": "Baixa",
        };

        if (opt === "group") {
            // Sempre inicializar Inbox
            groups["inbox"] = [];

            // Inicializar todos os grupos disponíveis
            availableGroups.forEach(group => {
                groups[group.id] = [];
            });
        } else if (opt === "status") {
            const statusOrder = ["todo", "in_progress", "review", "correction", "blocked", "done", "archived"];
            statusOrder.forEach(status => {
                const label = STATUS_TO_LABEL[status as keyof typeof STATUS_TO_LABEL];
                if (label) groups[label] = [];
            });
        } else if (opt === "priority") {
            ["Urgente", "Alta", priorityLabels["medium"], "Baixa"].forEach(label => { groups[label] = []; });
        } else if (opt === "date") {
            ["Atrasadas", "Hoje", "Amanhã", "Semana", "Futuro", "Sem data"].forEach(label => { groups[label] = []; });
        } else if (opt === "assignee") {
            groups["Sem responsável"] = [];
            workspaceMembers.forEach(m => {
                const name = (m.name || "").trim();
                if (name) groups[name] = [];
            });
        } else if (opt === "project") {
            // Sempre inicializar Inbox no modo projeto
            groups["Inbox"] = [];
        }

        filteredTasks.forEach((task) => {
            let groupKey = "Inbox";

            switch (opt) {
                case "group":
                    // Usar ID do grupo como chave para permitir ediÃ§Ã£o
                    if (task.group && task.group.id) {
                        groupKey = task.group.id;
                    } else {
                        groupKey = "inbox";
                    }

                    // Garantir que o grupo existe (caso nÃ£o tenha sido inicializado ou seja um novo grupo)
                    if (!groups[groupKey]) {
                        // Se for um ID de grupo vÃ¡lido do banco que nÃ£o estava em availableGroups
                        // (pode acontecer se availableGroups estiver desatualizado)
                        groups[groupKey] = [];
                    }
                    break;
                case "status":
                    groupKey = task.status || "Sem Status";
                    break;
                case "priority":
                    const priority = task.priority || "medium";
                    groupKey = priorityLabels[priority] || priority;
                    break;
                case "date":
                    if (!task.dueDate) {
                        groupKey = "Sem data";
                    } else {
                        const date = new Date(task.dueDate);
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        const tomorrow = new Date(today);
                        tomorrow.setDate(tomorrow.getDate() + 1);
                        const nextWeek = new Date(today);
                        nextWeek.setDate(nextWeek.getDate() + 7);

                        // Normalizar data da tarefa para comparaÃ§Ã£o (sem hora)
                        const taskDate = new Date(date);
                        taskDate.setHours(0, 0, 0, 0);

                        if (taskDate < today && !task.completed) {
                            groupKey = "Atrasadas";
                        } else if (taskDate.getTime() === today.getTime()) {
                            groupKey = "Hoje";
                        } else if (taskDate.getTime() === tomorrow.getTime()) {
                            groupKey = "Amanhã";
                        } else if (taskDate > tomorrow && taskDate <= nextWeek) {
                            groupKey = "Semana";
                        } else {
                            groupKey = "Futuro";
                        }
                    }
                    break;
                case "assignee":
                    // Agrupar por nome do primeiro responsável
                    const assigneeName = task.assignees?.[0]?.name;
                    groupKey = assigneeName ? assigneeName.trim() : "Sem responsável";
                    break;
                case "project":
                    // Agrupar por TAG (que representa o projeto)
                    if (task.tags && task.tags.length > 0) {
                        groupKey = task.tags[0]; // Considera a primeira tag como o projeto principal
                    } else {
                        groupKey = "Inbox";
                    }
                    break;
                default:
                    groupKey = "Inbox";
            }

            if (!groups[groupKey]) {
                groups[groupKey] = [];
            }
            groups[groupKey].push(task);
        });

        return groups;
    }, [viewOption, filteredTasks, availableGroups, workspaceMembers]);

    // ✅ Atualizar ref para groupedData quando mudar (garantir sincronização)
    useEffect(() => {
        groupedDataRef.current = groupedData;
        if (process.env.NODE_ENV === 'development' && tagFilter) {
            console.log('🔍 [groupedDataRef] Atualizado:', {
                tagFilter,
                groupedDataKeys: Object.keys(groupedData),
                totalTasks: Object.values(groupedData).reduce((sum, tasks) => sum + tasks.length, 0)
            });
        }
    }, [groupedData, tagFilter]);

    // ✅ Manter ordem estável dos projetos
    useEffect(() => {
        if (viewOption !== "project") return;

        const keys = Object.keys(groupedData);
        if (keys.length === 0) return;

        setProjectOrder((current) => {
            const existing = current.filter((key) => keys.includes(key));
            const missing = keys.filter((key) => !existing.includes(key));
            let next = [...existing, ...missing];

            if (keys.includes("Inbox")) {
                next = ["Inbox", ...next.filter((key) => key !== "Inbox")];
            }

            if (next.length > 0) {
                localStorage.setItem("taskProjectOrder", JSON.stringify(next));
            }

            if (next.length === current.length && next.every((key, index) => key === current[index])) {
                return current;
            }
            return next;
        });
    }, [groupedData, viewOption]);

    // ? CORREÇÃO: Reordenar grupos quando viewOption === "group" baseado em groupOrder
    const orderedGroupedData = useMemo(() => {
        if (viewOption === "group") {
            // Sempre usar groupOrder se disponível, mesmo que esteja vazio inicialmente
            // Isso garante que a ordem seja preservada desde o início
            if (groupOrder.length > 0) {
                // Criar um novo objeto ordenado baseado em groupOrder
                const ordered: Record<string, Task[]> = {};

                // Primeiro, adicionar grupos na ordem especificada
                groupOrder.forEach(groupId => {
                    if (groupedData[groupId]) {
                        ordered[groupId] = groupedData[groupId];
                    }
                });

                // Depois, adicionar grupos que não estão em groupOrder (caso existam)
                Object.keys(groupedData).forEach(key => {
                    if (!ordered[key]) {
                        ordered[key] = groupedData[key];
                    }
                });

                return ordered;
            }
            // Se groupOrder está vazio mas temos groupedData, retornar groupedData
            // mas isso só deve acontecer no primeiro render antes de groupOrder ser inicializado
            return groupedData;
        }
        if (viewOption === "project") {
            if (projectOrder.length > 0) {
                const ordered: Record<string, Task[]> = {};
                projectOrder.forEach((key) => {
                    if (groupedData[key]) {
                        ordered[key] = groupedData[key];
                    }
                });
                Object.keys(groupedData).forEach((key) => {
                    if (!ordered[key]) {
                        ordered[key] = groupedData[key];
                    }
                });
                return ordered;
            }
            return groupedData;
        }
        return groupedData;
    }, [groupedData, viewOption, groupOrder, projectOrder]);

    // Converter grupos para formato de colunas (Kanban)
    const kanbanColumns = useMemo(() => {
        const opt = viewOption;
        const dataToUse = opt === "group" || opt === "project" ? orderedGroupedData : groupedData;

        if (!dataToUse || Object.keys(dataToUse).length === 0) {
            return [];
        }

        const columns = Object.entries(dataToUse)
            .filter(([key, tasks]) => {
                if (opt === "group" && key !== "inbox") {
                    const groupExists = availableGroups.some(g => g.id === key);
                    // Se o grupo não existe mais e não há tarefas, filtrar
                    if (!groupExists && tasks.length === 0) {
                        return false;
                    }
                }
                return true;
            })
            .map(([key, tasks]) => {
                let title = key;
                let color: string | undefined;

                if (opt === "group") {
                    if (key === "inbox") {
                        title = "BACKLOG/INBOX";
                        color = "#64748b"; // Slate 500 para Inbox
                    } else {
                        // Tentar primeiro das tarefas
                        const groupFromTask = tasks[0]?.group;
                        if (groupFromTask) {
                            title = groupFromTask.name || "Sem Nome";
                            color = groupFromTask.color || undefined;
                        } else {
                            // Se nÃ£o hÃ¡ tarefas, buscar do availableGroups
                            const groupFromDB = availableGroups.find(g => g.id === key);
                            if (groupFromDB) {
                                title = groupFromDB.name || "Sem Nome";
                                color = groupFromDB.color || undefined;
                            } else {
                                title = "Sem Nome";
                            }
                        }

                        // Fallback para cor do mapa de cores se disponÃ­vel
                        if (groupColors[key] && groupColors[key] !== color) {
                            color = groupColors[key];
                        }
                    }
                } else if (key === "Inbox") {
                    title = "BACKLOG/INBOX";
                } else if (opt === "date") {
                    color = DATE_COLOR_MAP[title] || color;
                } else if (opt === "status") {
                    color = STATUS_COLOR_MAP[title] || color;
                }

                return {
                    id: key,
                    title,
                    tasks,
                    color,
                };
            });

        if (opt === "status") {
            const statusOrder = ORDERED_STATUSES.map(s => STATUS_TO_LABEL[s]);
            return columns.sort((a, b) => {
                const aIndex = statusOrder.indexOf(a.title);
                const bIndex = statusOrder.indexOf(b.title);
                if (aIndex === -1 && bIndex === -1) return 0;
                if (aIndex === -1) return 1;
                if (bIndex === -1) return -1;
                return aIndex - bIndex;
            });
        }

        if (opt === "priority") {
            const priorityOrder = ["Urgente", "Alta", "MÃ©dia", "Baixa"];
            return columns.sort((a, b) => {
                const aIndex = priorityOrder.indexOf(a.title);
                const bIndex = priorityOrder.indexOf(b.title);
                if (aIndex === -1 && bIndex === -1) return 0;
                if (aIndex === -1) return 1;
                if (bIndex === -1) return -1;
                return aIndex - bIndex;
            });
        }

        if (opt === "date") {
            const dateOrder = ["Atrasadas", "Hoje", "Amanhã", "Semana", "Futuro", "Sem data"];
            return columns.sort((a, b) => {
                const aIndex = dateOrder.indexOf(a.title);
                const bIndex = dateOrder.indexOf(b.title);
                if (aIndex === -1 && bIndex === -1) return 0;
                if (aIndex === -1) return 1;
                if (bIndex === -1) return -1;
                return aIndex - bIndex;
            });
        }

        if (opt === "assignee") {
            // Ordenar por nome alfabeticamente, com "Sem responsável" no final
            return columns.sort((a, b) => {
                if (a.title === "Sem responsável") return 1;
                if (b.title === "Sem responsável") return -1;
                return a.title.localeCompare(b.title, undefined, { sensitivity: "base" });
            });
        }

        return columns;
    }, [groupedData, orderedGroupedData, viewOption, availableGroups, groupColors]);

    // Converter grupos para formato de lista (TaskGroup) com ordenação
    const listGroups = useMemo(() => {
        const opt = viewOption;
        const sort = sortBy;
        const dataToUse = opt === "group" || opt === "project" ? orderedGroupedData : groupedData;
        const groups = Object.entries(dataToUse).map(([key, tasks]) => {
            const sortedTasks = [...tasks].sort((a, b) => {
                if (sort === "position") {
                    const posA = a.position ?? 0;
                    const posB = b.position ?? 0;
                    return posA - posB;
                }
                if (sort === "status") {
                    const statusOrder = ORDERED_STATUSES;
                    const mapStatus = (s: string) => {
                        const index = Object.values(STATUS_TO_LABEL).indexOf(s);
                        if (index === -1) return 999;
                        const key = Object.keys(STATUS_TO_LABEL)[index];
                        return statusOrder.indexOf(key as any);
                    };

                    const aIndex = mapStatus(a.status);
                    const bIndex = mapStatus(b.status);
                    return aIndex - bIndex;
                }
                if (sort === "priority") {
                    const priorityOrder = ["urgent", "high", "medium", "low"];
                    const aIndex = priorityOrder.indexOf(a.priority || "medium");
                    const bIndex = priorityOrder.indexOf(b.priority || "medium");
                    return aIndex - bIndex;
                }
                if (sort === "assignee") {
                    const aName = a.assignees?.[0]?.name || "zzzz";
                    const bName = b.assignees?.[0]?.name || "zzzz";
                    return aName.localeCompare(bName);
                }
                if (sort === "title") {
                    return (a.title || "").localeCompare(b.title || "", undefined, { numeric: true, sensitivity: "base" });
                }
                return 0;
            });

            let title = key;
            let groupColor = undefined;

            if (opt === "group") {
                if (key === "inbox") {
                    title = "BACKLOG/INBOX";
                } else {
                    // Tentar primeiro das tarefas
                    const groupFromTask = tasks[0]?.group;
                    if (groupFromTask) {
                        title = groupFromTask.name || "Sem Nome";
                        groupColor = groupFromTask.color || undefined;
                    } else {
                        // Se nÃ£o hÃ¡ tarefas, buscar do availableGroups
                        const groupFromDB = availableGroups.find(g => g.id === key);
                        if (groupFromDB) {
                            title = groupFromDB.name || "Sem Nome";
                            groupColor = groupFromDB.color || undefined;
                        } else {
                            title = "Sem Nome";
                        }
                    }
                }
            } else if (key === "Inbox") {
                title = "BACKLOG/INBOX";
            } else if (opt === "date") {
                groupColor = DATE_COLOR_MAP[title] || groupColor;
            } else if (opt === "status") {
                groupColor = STATUS_COLOR_MAP[title] || groupColor;
            }

            return {
                id: key,
                title,
                tasks: sortedTasks,
                // Passar a cor do grupo vindo do banco se disponÃ­vel, senÃ£o usa o local/padrÃ£o
                groupColor,
            };
        });

        if (opt === "status") {
            const statusOrder = ORDERED_STATUSES.map(s => STATUS_TO_LABEL[s]);
            return groups.sort((a, b) => {
                const aIndex = statusOrder.indexOf(a.title);
                const bIndex = statusOrder.indexOf(b.title);
                if (aIndex === -1 && bIndex === -1) return 0;
                if (aIndex === -1) return 1;
                if (bIndex === -1) return -1;
                return aIndex - bIndex;
            });
        }

        if (opt === "priority") {
            const priorityOrder = ["Urgente", "Alta", "MÃ©dia", "Baixa"];
            return groups.sort((a, b) => {
                const aIndex = priorityOrder.indexOf(a.title);
                const bIndex = priorityOrder.indexOf(b.title);
                if (aIndex === -1 && bIndex === -1) return a.title.localeCompare(b.title);
                if (aIndex === -1) return 1;
                if (bIndex === -1) return -1;
                return aIndex - bIndex;
            });
        }

        if (opt === "date") {
            const dateOrder = ["Atrasadas", "Hoje", "Amanhã", "Semana", "Futuro", "Sem data"];
            return groups.sort((a, b) => {
                const aIndex = dateOrder.indexOf(a.title);
                const bIndex = dateOrder.indexOf(b.title);
                if (aIndex === -1 && bIndex === -1) return 0;
                if (aIndex === -1) return 1;
                if (bIndex === -1) return -1;
                return aIndex - bIndex;
            });
        }

        if (opt === "assignee") {
            return groups.sort((a, b) => {
                if (a.title === "Sem responsável") return 1;
                if (b.title === "Sem responsável") return -1;
                return a.title.localeCompare(b.title, undefined, { sensitivity: "base" });
            });
        }

        if (opt === "group" && groupOrder.length > 0) {
            return groups.sort((a, b) => {
                const aIndex = groupOrder.indexOf(a.id);
                const bIndex = groupOrder.indexOf(b.id);
                if (aIndex === -1 && bIndex === -1) return 0;
                if (aIndex === -1) return 1;
                if (bIndex === -1) return -1;
                return aIndex - bIndex;
            });
        }
        if (opt === "project" && projectOrder.length > 0) {
            return groups.sort((a, b) => {
                const aIndex = projectOrder.indexOf(a.id);
                const bIndex = projectOrder.indexOf(b.id);
                if (aIndex === -1 && bIndex === -1) return 0;
                if (aIndex === -1) return 1;
                if (bIndex === -1) return -1;
                return aIndex - bIndex;
            });
        }

        return groups;
    }, [groupedData, orderedGroupedData, viewOption, sortBy, groupColors, availableGroups.length, groupOrder, projectOrder]);

    // Atualizar ref quando listGroups mudar
    useEffect(() => {
        listGroupsRef.current = listGroups;
    }, [listGroups]);

    const shouldShowLoadingSkeleton = !initialTasks
        && localTasks.length === 0
        && (!isLoaded || !effectiveWorkspaceId || isLoadingTasks);
    // Mapear status customizÃ¡veis para status do banco (usando config centralizado)
    const mapStatusToDb = (status: string): "todo" | "in_progress" | "done" | "archived" => {
        return mapLabelToStatus(status) as "todo" | "in_progress" | "done" | "archived";
    };

    // Mapear prioridade do banco para label em portuguÃªs
    const getPriorityLabel = (priority: string | undefined): string => {
        const priorityLabels: Record<string, string> = {
            "urgent": "Urgente",
            "high": "Alta",
            "medium": "MÃ©dia",
            "low": "Baixa",
        };
        return priorityLabels[priority || "medium"] || priority || "MÃ©dia";
    };

    // FunÃ§Ã£o auxiliar para obter groupKey de uma tarefa (usada no Drag & Drop)
    const getTaskGroupKey = (task: Task): string => {
        switch (viewOption) {
            case "group":
                // Retornar ID do grupo para permitir comparaÃ§Ã£o correta
                return task.group?.id || "inbox";
            case "status":
                return task.status || "Sem Status";
            case "priority":
                return getPriorityLabel(task.priority);
            case "date":
                if (!task.dueDate) return "Sem data";
                // ... lÃ³gica de data repetida ...
                return "Inbox"; // Simplificado para evitar complexidade excessiva aqui, idealmente refatorar lÃ³gica de data para funÃ§Ã£o reutilizÃ¡vel
            case "assignee":
                const assigneeName = task.assignees?.[0]?.name;
                return assigneeName ? assigneeName.trim() : "Sem responsável";
            case "project":
                return task.tags && task.tags.length > 0 ? task.tags[0] : "Inbox";
            default:
                return "Inbox";
        }
    };

    const findGroupKeyForId = useCallback((id: string): string | null => {
        const currentGroupedData = groupedDataRef.current;
        if (Object.keys(currentGroupedData).includes(id)) return id;
        const entry = Object.entries(currentGroupedData).find(([_, tasks]) =>
            tasks.some((t) => String(t.id) === id)
        );
        const result = entry ? entry[0] : null;

        // ✅ DEBUG: Log quando tarefa não é encontrada
        if (process.env.NODE_ENV === 'development' && !result && tagFilter) {
            console.warn('⚠️ [findGroupKeyForId] Tarefa não encontrada:', {
                id,
                tagFilter,
                groupedDataKeys: Object.keys(currentGroupedData),
                allTaskIds: Object.values(currentGroupedData).flat().map(t => String(t.id)).slice(0, 10),
                taskInLocalTasks: localTasksRef.current.find(t => String(t.id) === id) ? 'sim' : 'não'
            });
        }

        return result;
    }, [tagFilter]);

    // Sincronizar sortBy quando URL mudar (só quando URL tem "sort" para não sobrescrever restore ao voltar da Home)
    useEffect(() => {
        if (searchParams.has("sort")) setSortBy(sortParam);
    }, [sortParam, searchParams]);

    // ? Sincronizar viewOption quando parâmetro group da URL mudar (só quando URL tem "group" para não sobrescrever restore)
    useEffect(() => {
        if (!searchParams.has("group")) return;
        const groupParam = searchParams.get("group");
        const newViewOption = getInitialViewOption(groupParam, !!tagFilter);
        setViewOption((current) => (current !== newViewOption ? newViewOption : current));
    }, [searchParams, tagFilter]);

    // Restaurar último filtro do localStorage quando URL não tiver group/sort (ex.: voltar da Home)
    // useLayoutEffect para rodar antes do efeito que sincroniza URL, evitando sobrescrever com defaults
    useLayoutEffect(() => {
        const groupParam = searchParams.get("group");
        const sortParamFromUrl = searchParams.get("sort");
        if (groupParam != null && sortParamFromUrl != null) return;
        const last = getLastFilterFromStorage();
        if (!last) return;
        if (groupParam == null) setViewOption(last.group);
        if (sortParamFromUrl == null) setSortBy(last.sort as "status" | "priority" | "assignee" | "title" | "position");
        // Ao restaurar "Personalizado", restaurar ordem dos grupos no mesmo tick (evita flicker)
        if (last.group === "group" && availableGroups.length > 0 && typeof window !== "undefined") {
            try {
                const savedOrder = localStorage.getItem("taskGroupOrder");
                if (savedOrder) {
                    const parsed = JSON.parse(savedOrder);
                    const groupIds = new Set(availableGroups.map((g) => g.id));
                    const validOrder = parsed.filter((id: string) => id === "inbox" || groupIds.has(id));
                    const newGroups = availableGroups.map((g) => g.id).filter((id) => !validOrder.includes(id));
                    const finalOrder = ["inbox", ...validOrder.filter((id: string) => id !== "inbox"), ...newGroups];
                    if (finalOrder.length > 0) setGroupOrder(finalOrder);
                } else {
                    setGroupOrder(["inbox", ...availableGroups.map((g) => g.id)]);
                }
            } catch {
                setGroupOrder(["inbox", ...availableGroups.map((g) => g.id)]);
            }
        }
    }, [searchParams, availableGroups]);

    // Persistir último filtro no localStorage quando agrupar/ordenar mudar
    useEffect(() => {
        if (typeof window === "undefined") return;
        try {
            localStorage.setItem(TASKS_LAST_FILTER_KEY, JSON.stringify({ group: viewOption, sort: sortBy }));
        } catch {
            // ignore
        }
    }, [viewOption, sortBy]);

    // Atualização imediata de filtros (estado síncrono para resposta rápida), URL em segundo plano
    const handleViewOptionChange = useCallback((value: ViewOption) => {
        setViewOption(value);
        // Ao voltar para "Personalizado", restaurar ordem do localStorage no mesmo tick (evita flicker)
        if (value === "group") {
            const groups = availableGroupsRef.current;
            if (groups.length > 0 && typeof window !== "undefined") {
                try {
                    const savedOrder = localStorage.getItem("taskGroupOrder");
                    if (savedOrder) {
                        const parsed = JSON.parse(savedOrder);
                        const groupIds = new Set(groups.map((g) => g.id));
                        const validOrder = parsed.filter((id: string) => id === "inbox" || groupIds.has(id));
                        const newGroups = groups.map((g) => g.id).filter((id) => !validOrder.includes(id));
                        const finalOrder = ["inbox", ...validOrder.filter((id: string) => id !== "inbox"), ...newGroups];
                        if (finalOrder.length > 0) setGroupOrder(finalOrder);
                    } else {
                        setGroupOrder(["inbox", ...groups.map((g) => g.id)]);
                    }
                } catch {
                    setGroupOrder(["inbox", ...groups.map((g) => g.id)]);
                }
            }
        }
        if (urlDebounceRef.current) clearTimeout(urlDebounceRef.current);
        urlDebounceRef.current = setTimeout(() => {
            const params = new URLSearchParams(searchParams.toString());
            params.set("group", value);
            router.replace(`${pathname}?${params.toString()}`, { scroll: false });
            urlDebounceRef.current = null;
        }, 300);
    }, [pathname, router, searchParams]);

    const handleSortByChange = useCallback((value: "status" | "priority" | "assignee" | "title" | "position") => {
        setSortBy(value);
        if (urlDebounceRef.current) clearTimeout(urlDebounceRef.current);
        urlDebounceRef.current = setTimeout(() => {
            const params = new URLSearchParams(searchParams.toString());
            if (value === "position") params.delete("sort");
            else params.set("sort", value);
            const nextUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
            router.replace(nextUrl, { scroll: false });
            urlDebounceRef.current = null;
        }, 300);
    }, [pathname, router, searchParams]);

    // ? Sincronizar URL com estado (ou último filtro do localStorage ao voltar da Home) quando não houver group/sort na URL
    useEffect(() => {
        const params = new URLSearchParams(searchParamsString);
        const hasGroup = params.has("group");
        const hasSort = params.has("sort");
        if (hasGroup && hasSort) return;
        // Ao voltar da Home (URL sem params), preferir localStorage para não sobrescrever antes do restore
        const last = !hasGroup || !hasSort ? getLastFilterFromStorage() : null;
        let changed = false;
        if (!hasGroup) {
            params.set("group", last?.group ?? viewOption);
            changed = true;
        }
        if (!hasSort) {
            const sort = last?.sort ?? sortBy;
            if (sort === "position") params.delete("sort");
            else params.set("sort", sort);
            changed = true;
        }
        if (changed) {
            const nextUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
            router.replace(nextUrl, { scroll: false });
        }
    }, [searchParamsString, tagFilter, pathname, router, viewOption, sortBy]);

    // Aplica ordenação visualmente quando sortBy mudar (vindo da URL)
    useEffect(() => {
        if (sortBy === "position") {
            return;
        }

        const compare = (a: Task, b: Task) => {
            if (sortBy === "status") {
                const statusOrder = ORDERED_STATUSES;
                const mapStatus = (s: string) => {
                    const index = Object.values(STATUS_TO_LABEL).indexOf(s);
                    return index === -1 ? statusOrder.length : index;
                };
                return mapStatus(a.status) - mapStatus(b.status);
            }
            if (sortBy === "priority") {
                const priorityOrder = ["urgent", "high", "medium", "low"];
                const aIndex = priorityOrder.indexOf(a.priority || "medium");
                const bIndex = priorityOrder.indexOf(b.priority || "medium");
                return aIndex - bIndex;
            }
            if (sortBy === "assignee") {
                const aName = a.assignees?.[0]?.name || "zzzz";
                const bName = b.assignees?.[0]?.name || "zzzz";
                return aName.localeCompare(bName);
            }
            if (sortBy === "title") {
                return (a.title || "").localeCompare(b.title || "", undefined, { numeric: true, sensitivity: "base" });
            }
            return 0;
        };

        let recalculatedRef: Task[] = [];
        setLocalTasks((prev) => {
            const groupedByKey: Record<string, Task[]> = {};
            prev.forEach((task) => {
                const key = getTaskGroupKey(task);
                if (!groupedByKey[key]) groupedByKey[key] = [];
                groupedByKey[key].push(task);
            });

            const recalculated: Task[] = [];
            Object.entries(groupedByKey).forEach(([_, tasks]) => {
                const sorted = [...tasks].sort(compare);
                let pos = 0;
                sorted.forEach((task) => {
                    pos += 1;
                    recalculated.push({ ...task, position: pos * 1000 });
                });
            });

            recalculatedRef = recalculated;
            return recalculated;
        });

        if (recalculatedRef.length) {
            localTasksRef.current = recalculatedRef;
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sortBy, viewOption]);

    // Função para persistir a ordem visual atual no banco
    const handlePersistSortOrder = useCallback(async () => {
        // Pega as tarefas na ordem visual atual (como aparecem na tela)
        // Precisamos usar a ordem dos grupos para garantir que pegamos na ordem correta
        const currentTasks = localTasksRef.current.length > 0 ? localTasksRef.current : localTasks;

        if (currentTasks.length === 0) {
            toast.info("Nenhuma tarefa para salvar");
            return;
        }

        // Se há ordenação aplicada, precisamos reordenar as tarefas conforme a ordem visual
        // A ordem visual é determinada pelo sortBy e pelos grupos
        let tasksInVisualOrder: Task[] = [];

        if (sortBy !== "position") {
            // Aplicar a mesma lógica de ordenação que é usada no listGroups
            const compare = (a: Task, b: Task) => {
                if (sortBy === "status") {
                    const statusOrder = ORDERED_STATUSES;
                    const mapStatus = (s: string) => {
                        const index = Object.values(STATUS_TO_LABEL).indexOf(s);
                        return index === -1 ? statusOrder.length : index;
                    };
                    return mapStatus(a.status) - mapStatus(b.status);
                }
                if (sortBy === "priority") {
                    const priorityOrder = ["urgent", "high", "medium", "low"];
                    const aIndex = priorityOrder.indexOf(a.priority || "medium");
                    const bIndex = priorityOrder.indexOf(b.priority || "medium");
                    return aIndex - bIndex;
                }
                if (sortBy === "assignee") {
                    const aName = a.assignees?.[0]?.name || "zzzz";
                    const bName = b.assignees?.[0]?.name || "zzzz";
                    return aName.localeCompare(bName);
                }
                if (sortBy === "title") {
                    return (a.title || "").localeCompare(b.title || "", undefined, { numeric: true, sensitivity: "base" });
                }
                return 0;
            };

            // Agrupar por grupo (se aplicável) e ordenar dentro de cada grupo
            const groupedByKey: Record<string, Task[]> = {};
            currentTasks.forEach((task) => {
                const key = getTaskGroupKey(task);
                if (!groupedByKey[key]) groupedByKey[key] = [];
                groupedByKey[key].push(task);
            });

            // Ordenar dentro de cada grupo e depois juntar tudo
            Object.entries(groupedByKey).forEach(([_, tasks]) => {
                const sorted = [...tasks].sort(compare);
                tasksInVisualOrder.push(...sorted);
            });
        } else {
            // Se sortBy é "position", usar a ordem atual (já ordenada por position)
            tasksInVisualOrder = [...currentTasks].sort((a, b) => {
                const posA = a.position ?? 0;
                const posB = b.position ?? 0;
                return posA - posB;
            });
        }

        // Recalcula índices limpos (1000, 2000, 3000...)
        // Isso "reseta" a bagunça dos floats e deixa tudo espaçado novamente
        const bulkUpdates = tasksInVisualOrder.map((task, index) => ({
            id: String(task.id),
            position: (index + 1) * 1000
        }));

        // Executa o bulk update com feedback visual via toast.promise
        const bulkPromise = updateTaskPositionsBulk(bulkUpdates);

        toast.promise(bulkPromise, {
            loading: "Reorganizando tarefas no banco...",
            success: "Nova ordem salva com sucesso!",
            error: "Erro ao salvar ordem. Tente novamente.",
        });

        try {
            const result = await bulkPromise;

            if (result?.success) {
                // Atualizar estado local com as novas posições
                setLocalTasks((prev) => {
                    return prev.map((task) => {
                        const update = bulkUpdates.find((u) => u.id === String(task.id));
                        if (update) {
                            return { ...task, position: update.position };
                        }
                        return task;
                    });
                });

                // Atualizar ref também com as tarefas na ordem correta
                localTasksRef.current = tasksInVisualOrder.map((task) => {
                    const update = bulkUpdates.find((u) => u.id === String(task.id));
                    if (update) {
                        return { ...task, position: update.position };
                    }
                    return task;
                });

                // Voltar para ordenação manual (position) após salvar
                setSortBy("position");

                // Invalidar cache e recarregar se necessário
                invalidateTasksCache(effectiveWorkspaceId, activeTab);
            }
        } catch (error) {
            console.error("Erro ao persistir ordem:", error);
        }
    }, [effectiveWorkspaceId, activeTab, sortBy, viewOption]);
    // Handler para quando o drag comeca
    const resetDragState = () => {
        dragStartGroupKeyRef.current = null;
        lastDragOverStateRef.current = "";
        if (dragOverThrottleRef.current !== null) {
            cancelAnimationFrame(dragOverThrottleRef.current);
            dragOverThrottleRef.current = null;
        }
    };

    const handleDragStart = (event: DragStartEvent) => {
        // ? Guard Clause: Verificar se drag está habilitado para este viewOption
        // ? CORREÇÃO: Validar se viewOption existe antes de comparar
        if (!viewOption) {
            console.warn("?? [handleDragStart] viewOption está undefined. Bloqueando drag.");
            return;
        }

        // ✅ DEBUG: Log quando há tagFilter para verificar se a tarefa está sendo encontrada
        if (process.env.NODE_ENV === 'development' && tagFilter) {
            const activeIdStr = String(event.active.id);
            const taskInRef = localTasksRef.current.find((t) => String(t.id) === activeIdStr);
            const taskInState = localTasks.find((t) => String(t.id) === activeIdStr);
            console.log('🔍 [handleDragStart] DEBUG - tagFilter:', {
                tagFilter,
                activeIdStr,
                taskInRef: !!taskInRef,
                taskInState: !!taskInState,
                localTasksRefCount: localTasksRef.current.length,
                localTasksCount: localTasks.length
            });
        }

        const isDragEnabled = viewOption === 'status' || viewOption === 'priority' || viewOption === 'group' || viewOption === 'project';
        if (!isDragEnabled) {
            toast.info('O arrastar e soltar está desabilitado nesta visualização. Use "Status", "Prioridade", "Grupos" ou "Projeto" para reorganizar tarefas.');
            return; // Evita iniciar o drag
        }

        const { active } = event;
        // ? CORREÇÃO: Normalizar ID para string
        const activeIdStr = String(active.id);
        // ✅ CORREÇÃO: Usar localTasks como fallback se localTasksRef estiver vazio (pode acontecer com tagFilter)
        const currentTasks = localTasksRef.current.length > 0 ? localTasksRef.current : localTasks;
        const task = currentTasks.find((t) => String(t.id) === activeIdStr);

        if (!task) {
            // ✅ DEBUG: Log quando tarefa não é encontrada
            if (process.env.NODE_ENV === 'development') {
                console.warn("?? [handleDragStart] Tarefa não encontrada para ID:", {
                    activeIdStr,
                    tagFilter,
                    localTasksRefCount: localTasksRef.current.length,
                    localTasksCount: localTasks.length,
                    usingLocalTasks: localTasksRef.current.length === 0
                });
            }
            return;
        }

        dragStartGroupKeyRef.current = getTaskGroupKey(task);
        lastDragOverStateRef.current = "";
        if (dragOverThrottleRef.current !== null) {
            cancelAnimationFrame(dragOverThrottleRef.current);
            dragOverThrottleRef.current = null;
        }

        setActiveTask(task);
    };

    // REMOVIDO: handleDragOver estava causando delay de 0.5-1.5s devido a setState bloqueante
    // O dnd-kit já fornece feedback visual nativo sem necessidade de atualizar estado durante o drag
    // A atualização de estado acontece apenas no handleDragEnd quando o usuário solta o card

    const handleDragOver = useCallback((event: DragOverEvent) => {
        if (!viewOption) {
            return;
        }

        const isDragEnabled = viewOption === "status" || viewOption === "priority" || viewOption === "group" || viewOption === "project";
        if (!isDragEnabled) {
            return;
        }

        const { active, over } = event;
        if (!over || !active) return;

        const activeIdStr = String(active.id);
        const overIdStr = String(over.id);
        if (activeIdStr === overIdStr) return;

        const stateKey = `${activeIdStr}|${overIdStr}`;
        if (lastDragOverStateRef.current === stateKey) return;
        lastDragOverStateRef.current = stateKey;

        if (dragOverThrottleRef.current !== null) {
            cancelAnimationFrame(dragOverThrottleRef.current);
        }

        dragOverThrottleRef.current = requestAnimationFrame(() => {
            dragOverThrottleRef.current = null;

            // ✅ CORREÇÃO: Usar localTasks como fallback se localTasksRef estiver vazio (pode acontecer com tagFilter)
            const current = localTasksRef.current.length > 0 ? localTasksRef.current : localTasks;
            const activeIndex = current.findIndex((t) => String(t.id) === activeIdStr);
            if (activeIndex === -1) {
                if (process.env.NODE_ENV === 'development' && tagFilter) {
                    console.warn('⚠️ [handleDragOver] Tarefa não encontrada:', {
                        activeIdStr,
                        tagFilter,
                        localTasksRefCount: localTasksRef.current.length,
                        localTasksCount: localTasks.length
                    });
                }
                return;
            }

            const currentGroupKey = findGroupKeyForId(activeIdStr) || dragStartGroupKeyRef.current;
            const destinationGroupKey = findGroupKeyForId(overIdStr);
            if (!currentGroupKey || !destinationGroupKey) return;

            const moving = { ...current[activeIndex] };
            const isSameGroup = currentGroupKey === destinationGroupKey;

            if (!isSameGroup) {
                if (viewOption === "status") {
                    moving.status = destinationGroupKey;
                } else if (viewOption === "priority") {
                    const normalizedPriority = destinationGroupKey
                        .toLowerCase()
                        .normalize("NFD")
                        .replace(/[\u0300-\u036f]/g, "");
                    const priorityMap: Record<string, "low" | "medium" | "high" | "urgent"> = {
                        urgente: "urgent",
                        alta: "high",
                        media: "medium",
                        baixa: "low",
                    };
                    const mapped = priorityMap[normalizedPriority];
                    if (mapped) moving.priority = mapped;
                } else if (viewOption === "group") {
                    if (destinationGroupKey === "inbox" || destinationGroupKey === "Inbox") {
                        moving.group = undefined;
                    } else {
                        const groupFromDB = availableGroups.find((g) => g.id === destinationGroupKey);
                        moving.group = {
                            id: destinationGroupKey,
                            name: groupFromDB?.name || moving.group?.name || "Grupo",
                            color: groupFromDB?.color || moving.group?.color,
                        };
                    }
                }
            }

            const groupsInOrder: string[] = [];
            const groupMap = new Map<string, Task[]>();
            current.forEach((task) => {
                const key = getTaskGroupKey(task);
                if (!groupMap.has(key)) {
                    groupMap.set(key, []);
                    groupsInOrder.push(key);
                }
                groupMap.get(key)?.push(task);
            });

            if (isSameGroup) {
                const groupTasks = groupMap.get(destinationGroupKey) ?? [];
                const activeIndexInGroup = groupTasks.findIndex((task) => String(task.id) === activeIdStr);
                let overIndexInGroup = groupTasks.findIndex((task) => String(task.id) === overIdStr);

                if (overIndexInGroup === -1) {
                    overIndexInGroup = groupTasks.length - 1;
                }

                if (activeIndexInGroup === -1 || overIndexInGroup === -1 || activeIndexInGroup === overIndexInGroup) {
                    return;
                }

                const reorderedGroupTasks = arrayMove(groupTasks, activeIndexInGroup, overIndexInGroup);
                groupMap.set(destinationGroupKey, reorderedGroupTasks);

                const next = groupsInOrder.flatMap((key) => groupMap.get(key) || []);
                localTasksRef.current = next;
                setLocalTasks(next);
                return;
            }

            const sourceTasks = groupMap.get(currentGroupKey) ?? [];
            const destTasks = groupMap.get(destinationGroupKey) ?? [];

            const newSourceTasks = sourceTasks.filter((task) => String(task.id) !== activeIdStr);
            const destWithoutActive = destTasks.filter((task) => String(task.id) !== activeIdStr);
            const overIndexInDest = destWithoutActive.findIndex((task) => String(task.id) === overIdStr);
            const insertIndex = overIndexInDest >= 0 ? overIndexInDest : destWithoutActive.length;

            const newDestTasks = [...destWithoutActive];
            newDestTasks.splice(insertIndex, 0, moving);

            groupMap.set(currentGroupKey, newSourceTasks);
            groupMap.set(destinationGroupKey, newDestTasks);

            if (!groupsInOrder.includes(destinationGroupKey)) {
                groupsInOrder.push(destinationGroupKey);
            }

            const next = groupsInOrder.flatMap((key) => groupMap.get(key) || []);
            localTasksRef.current = next;
            setLocalTasks(next);
        });
    }, [availableGroups, findGroupKeyForId, getTaskGroupKey, viewOption]);

    // Handler para quando o drag termina
    const handleDragEnd = (event: DragEndEvent) => {
        // ? Guard Clause: Verificar se drag está habilitado para este viewOption
        // ? CORREÇÃO: Validar se viewOption existe antes de comparar
        if (!viewOption) {
            console.warn("?? [handleDragEnd] viewOption está undefined. Bloqueando drag.");
            setActiveTask(null);
            resetDragState();
            return;
        }

        const isDragEnabled = viewOption === 'status' || viewOption === 'priority' || viewOption === 'group' || viewOption === 'project';
        if (!isDragEnabled) {
            toast.info('O arrastar e soltar está desabilitado nesta visualização. Use "Status", "Prioridade", "Grupos" ou "Projeto" para reorganizar tarefas.');
            setActiveTask(null);
            resetDragState();
            return; // Bloqueia a ação lógica se estiver nas views apenas de leitura
        }

        const { active, over } = event;
        setActiveTask(null);

        // ? CORREÇÃO: Validar se over existe e tem ID válido
        if (!over) {
            console.log("?? [handleDragEnd] Drag cancelado: over é null/undefined");
            resetDragState();
            return;
        }

        // ? CORREÇÃO: Validar se active existe
        if (!active) {
            console.warn("?? [handleDragEnd] active é null/undefined");
            resetDragState();
            return;
        }

        const activeIdStr = String(active.id);
        const overIdStr = String(over.id);

        // ✅ DEBUG: Logs para identificar problema com tagFilter
        if (process.env.NODE_ENV === 'development') {
            const activeTaskInRef = localTasksRef.current.find((t) => String(t.id) === activeIdStr);
            const activeTaskInState = localTasks.find((t) => String(t.id) === activeIdStr);
            console.log("🔍 [handleDragEnd] DEBUG - tagFilter:", {
                tagFilter,
                activeIdStr,
                activeTaskInRef: !!activeTaskInRef,
                activeTaskInState: !!activeTaskInState,
                activeTaskTags: activeTaskInRef?.tags || activeTaskInState?.tags || [],
                localTasksRefCount: localTasksRef.current.length,
                localTasksCount: localTasks.length,
                groupedDataKeys: Object.keys(groupedData),
                groupedDataTaskCount: Object.values(groupedData).reduce((sum, tasks) => sum + tasks.length, 0)
            });
        }

        const sourceGroupKey = dragStartGroupKeyRef.current || findGroupKeyForId(activeIdStr);
        let destinationGroupKey = findGroupKeyForId(overIdStr);

        // ? CORREÇÃO: Validação melhorada com logs
        if (!sourceGroupKey) {
            console.error("? [handleDragEnd] Grupo de origem não encontrado para tarefa:", activeIdStr);
            if (process.env.NODE_ENV === 'development') {
                console.error("❌ [handleDragEnd] DEBUG - Tarefa não encontrada em groupedData:", {
                    activeIdStr,
                    tagFilter,
                    groupedDataKeys: Object.keys(groupedData),
                    allTaskIds: Object.values(groupedData).flat().map(t => String(t.id))
                });
            }
            toast.error("Erro: Tarefa de origem não encontrada. Recarregue a página.");
            resetDragState();
            return;
        }

        if (!destinationGroupKey) {
            // ? CORREÇÃO: Verificar diretamente se o ID é uma chave de grupo (funciona para Kanban e Lista)
            // Usando ref para garantir dados mais recentes
            const currentGroupedData = groupedDataRef.current;

            // Log para debug do erro no Kanban
            console.log("🔍 [handleDragEnd] Verificando colunas:", {
                overIdStr,
                viewMode,
                isKey: Object.keys(currentGroupedData).includes(overIdStr),
                keys: Object.keys(currentGroupedData)
            });

            if (Object.keys(currentGroupedData).includes(overIdStr)) {
                destinationGroupKey = overIdStr;
            } else if (viewMode === "kanban") {
                // FALLBACK ROBUSTO PARA KANBAN
                // Se o dnd-kit detectou collision com overIdStr, e não é uma tarefa (já verificado antes),
                // e estamos no Kanban, ENTÃO overIdStr SÓ PODE SER uma coluna.
                // Mesmo que groupedDataRef esteja desatualizado (race condition), confie no dnd-kit.
                console.warn("⚠️ [handleDragEnd] Usando fallback de Kanban para coluna:", overIdStr);
                destinationGroupKey = overIdStr;
            }
        }

        if (!destinationGroupKey) {
            console.error("❌ [handleDragEnd] Falha fatal: Destino inválido", {
                overIdStr,
                viewMode,
                validKeys: Object.keys(groupedDataRef.current)
            });
            toast.error("Erro: Destino inválido. Tente arrastar para uma coluna válida.");
            resetDragState();
            return;
        }

        const destinationTasks = groupedData[destinationGroupKey] || [];

        // ? CORREÇÃO: Se overIdStr é o ID de uma coluna (não uma tarefa), adicionar no final
        // Se overIdStr é uma chave de groupedData, significa que arrastou para a coluna vazia
        const isOverColumn = Object.keys(groupedData).includes(overIdStr);
        let overIndex = -1;

        if (isOverColumn) {
            // Arrastou para a coluna vazia, adicionar no final
            overIndex = -1;
        } else {
            // Arrastou sobre uma tarefa, encontrar o índice
            overIndex = destinationTasks.findIndex((t) => String(t.id) === overIdStr);
        }

        const targetIndex = overIndex >= 0 ? overIndex : destinationTasks.length;

        const isSameGroup = sourceGroupKey === destinationGroupKey;
        let nextProjectTag: string | null = null;

        const updateData: {
            status?: "todo" | "in_progress" | "done" | "archived" | "review" | "correction";
            priority?: "low" | "medium" | "high" | "urgent";
            group_id?: string | null;
            assignee_id?: string | null;
            tags?: string[];
        } = {};

        if (!isSameGroup) {
            // Type narrowing: após a guard clause, viewOption só pode ser "status", "priority" ou "group"
            if (viewOption === "status" || viewOption === "priority" || viewOption === "group" || viewOption === "project") {
                switch (viewOption) {
                    case "status":
                        updateData.status = mapLabelToStatus(destinationGroupKey) as any;
                        break;
                    case "priority": {
                        const priorityMap: Record<string, "low" | "medium" | "high" | "urgent"> = {
                            "Urgente": "urgent",
                            "Alta": "high",
                            "Média": "medium",
                            "Baixa": "low",
                            "urgente": "urgent",
                            "alta": "high",
                            "média": "medium",
                            "media": "medium",
                            "baixa": "low",
                        };
                        const mapped = priorityMap[destinationGroupKey] || (destinationGroupKey as any);
                        if (mapped) updateData.priority = mapped;
                        break;
                    }
                    case "group":
                        updateData.group_id =
                            destinationGroupKey === "inbox" || destinationGroupKey === "Inbox"
                                ? null
                                : destinationGroupKey;
                        break;
                    case "project": {
                        const normalizedKey = destinationGroupKey.toLowerCase();
                        const isEmptyProject = normalizedKey === "sem projeto" || normalizedKey === "inbox";
                        nextProjectTag = isEmptyProject ? null : destinationGroupKey;
                        break;
                    }
                }
            }
        } else if (viewOption === "group") {
            // Mesmo grupo: ainda envia group_id para garantir que o RLS permita o update
            updateData.group_id =
                destinationGroupKey === "inbox" || destinationGroupKey === "Inbox"
                    ? null
                    : destinationGroupKey;
        }

        // Reordenar lista local e recalcular posições por grupo
        let finalState: Task[] = [];
        // ✅ CORREÇÃO: Usar localTasks se localTasksRef estiver vazio (pode acontecer com tagFilter)
        const sourceForRollback = localTasksRef.current.length > 0 ? localTasksRef.current : localTasks;
        const rollbackState = sourceForRollback.map((t) => ({ ...t }));

        // ? Calcular posição ANTES de atualizar o estado (para usar fora do setState)
        // ✅ CORREÇÃO: Usar localTasks se localTasksRef estiver vazio (pode acontecer com tagFilter)
        const current = localTasksRef.current.length > 0 ? [...localTasksRef.current] : [...localTasks];
        const movingIndex = current.findIndex((t) => String(t.id) === activeIdStr);
        if (movingIndex === -1) {
            // ✅ DEBUG: Log quando tarefa não é encontrada
            if (process.env.NODE_ENV === 'development') {
                console.error("❌ [handleDragEnd] Tarefa não encontrada em localTasksRef/localTasks:", {
                    activeIdStr,
                    tagFilter,
                    localTasksRefCount: localTasksRef.current.length,
                    localTasksRefIds: localTasksRef.current.map(t => t.id).slice(0, 5),
                    localTasksCount: localTasks.length,
                    localTasksIds: localTasks.map(t => t.id).slice(0, 5),
                    usingLocalTasks: localTasksRef.current.length === 0
                });
            }
            toast.error("Erro: Tarefa não encontrada. Recarregue a página.");
            resetDragState();
            return;
        }

        const moving = { ...current[movingIndex] };
        const currentWithoutMoving = [...current];
        currentWithoutMoving.splice(movingIndex, 1);

        // aplicar alterações de grupo/status/priority se mudou de grupo
        if (!isSameGroup) {
            if (viewOption === "project") {
                updateData.tags = buildProjectTags(moving.tags, nextProjectTag);
            }
            if (updateData.status) {
                const statusLabel =
                    STATUS_TO_LABEL[updateData.status as keyof typeof STATUS_TO_LABEL] || moving.status;
                moving.status = statusLabel;
            }
            if (updateData.priority) moving.priority = updateData.priority;
            if (updateData.group_id !== undefined) {
                moving.group = updateData.group_id
                    ? {
                        id: updateData.group_id,
                        name:
                            availableGroups.find((g) => g.id === updateData.group_id)?.name ||
                            moving.group?.name ||
                            "Grupo",
                        color: availableGroups.find((g) => g.id === updateData.group_id)?.color || moving.group?.color,
                    }
                    : undefined;
            }
            if (updateData.assignee_id !== undefined) {
                // Atualizar assignees no estado local
                if (updateData.assignee_id === null) {
                    moving.assignees = [];
                    moving.assigneeId = null;
                } else {
                    const member = workspaceMembers.find(m => m.id === updateData.assignee_id);
                    if (member) {
                        moving.assignees = [{
                            name: member.name,
                            avatar: member.avatar,
                            id: member.id
                        }];
                        moving.assigneeId = member.id;
                    }
                }
            }
            if (updateData.tags) {
                moving.tags = updateData.tags;
            }
        }

        const destList = currentWithoutMoving.filter((t) => getTaskGroupKey(t) === destinationGroupKey);
        const otherList = currentWithoutMoving.filter((t) => getTaskGroupKey(t) !== destinationGroupKey);

        const insertIndex = targetIndex > destList.length ? destList.length : targetIndex;
        const newDest = [...destList];
        newDest.splice(insertIndex, 0, moving);

        // MIDPOINT CALCULATION: Calcular posi??o apenas para o item movido
        const prevTask = newDest[insertIndex - 1];
        const nextTask = newDest[insertIndex + 1];

        let calculatedPosition: number;
        const BASE_POSITION = 10000;

        if (!prevTask && !nextTask) {
            calculatedPosition = BASE_POSITION;
        } else if (!prevTask) {
            const nextPos = nextTask.position ?? 0;
            calculatedPosition = nextPos > 0 ? nextPos / 2 : BASE_POSITION / 2;
            if (calculatedPosition <= 0) calculatedPosition = BASE_POSITION / 2;
        } else if (!nextTask) {
            const prevPos = prevTask.position ?? 0;
            calculatedPosition = prevPos > 0 ? prevPos + BASE_POSITION : BASE_POSITION * 2;
            if (calculatedPosition <= prevPos) calculatedPosition = prevPos + BASE_POSITION;
        } else {
            const prevPos = prevTask.position ?? 0;
            const nextPos = nextTask.position ?? 0;
            calculatedPosition = nextPos <= prevPos ? prevPos + 1 : (prevPos + nextPos) / 2;
        }

        const recomposed = [...otherList, ...newDest];

        // Atualizar apenas o item movido com a nova posição calculada
        finalState = recomposed.map((t) => {
            if (String(t.id) === activeIdStr) {
                return { ...t, position: calculatedPosition };
            }
            // Manter posições existentes dos outros itens
            return t;
        });

        // Atualizar estado local
        setLocalTasks(finalState);

        // ✅ CORREÇÃO: Sempre atualizar localTasksRef após drag (garantir sincronização)
        localTasksRef.current = finalState;

        // ? Obter posição calculada do item movido
        const movingFinal = finalState.find((t) => String(t.id) === activeIdStr);

        const finalGroupId = viewOption === "group"
            ? (destinationGroupKey === "inbox" || destinationGroupKey === "Inbox" ? null : destinationGroupKey)
            : (isSameGroup ? undefined : updateData.group_id);

        const rollback = (message: string) => {
            setLocalTasks(rollbackState);
            localTasksRef.current = rollbackState;
            toast.error(message);
        };

        console.log("?? [handleDragEnd] Enviando update para tarefa ativa:", {
            taskId: activeIdStr,
            calculatedPosition,
            status: isSameGroup ? undefined : updateData.status,
            priority: isSameGroup ? undefined : updateData.priority,
            group_id: finalGroupId,
            viewOption,
            isSameGroup,
            destinationGroupKey,
            sourceGroupKey,
        });

        const tagUpdatePromise: Promise<{ success: boolean; error?: string }> = updateData.tags
            ? updateTaskTags(activeIdStr, updateData.tags)
            : Promise.resolve({ success: true });

        const persistPromise = Promise.all([
            updateTaskPosition({
            taskId: activeIdStr,
            newPosition: calculatedPosition,
            status: isSameGroup ? undefined : updateData.status,
            priority: isSameGroup ? undefined : updateData.priority,
            group_id: finalGroupId,
            assignee_id: isSameGroup ? undefined : updateData.assignee_id,
            workspace_id: movingFinal?.workspaceId ?? null,
            }),
            tagUpdatePromise,
        ]);

        void persistPromise
            .then(([positionResult, tagsResult]) => {
                if (!positionResult?.success || !tagsResult?.success) {
                    console.error("? [handleDragEnd] Falha ao salvar posição:", {
                        positionError: positionResult?.error,
                        tagsError: tagsResult?.error,
                    });
                    rollback("Erro ao salvar a nova ordem. Tente novamente.");
                    return;
                }

                console.log("? [handleDragEnd] Tarefa ativa salva com sucesso:", {
                    taskId: activeIdStr,
                    calculatedPosition,
                });

                if (sortBy !== "position") {
                    setSortBy("position");
                    const params = new URLSearchParams(searchParams.toString());
                    params.delete("sort");
                    const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
                    router.push(newUrl);
                }
            })
            .catch((error) => {
                console.error("? [handleDragEnd] Erro ao chamar updateTaskPosition:", error);
                rollback("Erro ao salvar a nova ordem. Tente novamente.");
            });

        resetDragState();
    };

    const handleDragCancel = () => {
        setActiveTask(null);
        resetDragState();
    };

    const handleTaskClick = useCallback(async (taskId: string | number) => {
        setSelectedTaskId(String(taskId));
        setIsModalOpen(true);
        setIsLoadingTaskDetails(true);

        try {
            // Buscar dados completos da tarefa usando getTaskDetails
            const taskDetails = await getTaskDetails(String(taskId));

            if (!taskDetails) {
                console.error("Tarefa nÃ£o encontrada");
                setIsModalOpen(false);
                return;
            }

            // Converter status do banco para formato do modal
            const statusMap: Record<string, "todo" | "in_progress" | "done"> = {
                "todo": "todo",
                "in_progress": "in_progress",
                "done": "done",
                "archived": "done",
            };
            const modalStatus = statusMap[taskDetails.status] || "todo";

            // Mapear origin_context para contextMessage e tags
            let contextMessage: any = undefined;
            let tags: string[] = [];
            if (taskDetails.origin_context) {
                const context = taskDetails.origin_context as any;
                if (context.audio_url) {
                    contextMessage = {
                        type: "audio" as const,
                        content: context.message || "Mensagem de Ã¡udio",
                        timestamp: context.timestamp || taskDetails.created_at,
                    };
                } else if (context.message) {
                    contextMessage = {
                        type: "text" as const,
                        content: context.message,
                        timestamp: context.timestamp || taskDetails.created_at,
                    };
                }
                // Extrair tags do origin_context
                if (context.tags && Array.isArray(context.tags)) {
                    tags = context.tags;
                }
            }

            // Mapear comentÃ¡rios para atividades
            const activities = taskDetails.comments
                .filter((c) => c.type === "log" || c.type === "comment")
                .map((comment) => {
                    let activityType: "created" | "commented" | "updated" | "file_shared" = "commented";
                    if (comment.type === "log") {
                        const action = comment.metadata?.action;
                        if (action === "status_changed" || action === "updated") {
                            activityType = "updated";
                        } else if (action === "created") {
                            activityType = "created";
                        }
                    } else if (comment.type === "file") {
                        activityType = "file_shared";
                    }

                    return {
                        id: comment.id,
                        type: activityType,
                        user: comment.user?.full_name || comment.user?.email || "Sem nome",
                        message: comment.content,
                        timestamp: new Date(comment.created_at).toLocaleString("pt-BR"),
                    };
                });

            // Mapear anexos
            const mappedAttachments = taskDetails.attachments.map((att) => ({
                id: att.id,
                name: att.file_name,
                type: (att.file_type || "other") as "image" | "pdf" | "other",
                size: att.file_size ? `${(att.file_size / 1024 / 1024).toFixed(1)} MB` : "0 MB",
            }));

            // Construir breadcrumbs
            const breadcrumbs: string[] = [];
            if (taskDetails.workspace?.name) {
                breadcrumbs.push(taskDetails.workspace.name);
            }
            breadcrumbs.push("Tarefas");
            if ((taskDetails.origin_context as any)?.tags?.[0]) {
                breadcrumbs.push((taskDetails.origin_context as any).tags[0]);
            } else {
                breadcrumbs.push("Geral");
            }

            setTaskDetails({
                id: taskDetails.id,
                title: taskDetails.title,
                description: taskDetails.description || "",
                status: modalStatus,
                assignee: taskDetails.assignee
                    ? {
                        name: taskDetails.assignee.full_name || taskDetails.assignee.email || "Sem nome",
                        avatar: taskDetails.assignee.avatar_url || undefined,
                    }
                    : undefined,
                dueDate: taskDetails.due_date
                    ? new Date(taskDetails.due_date).toISOString().split("T")[0]
                    : undefined,
                tags,
                breadcrumbs,
                contextMessage,
                subTasks: [], // Subtarefas nÃ£o estÃ£o implementadas no schema ainda
                activities,
                attachments: mappedAttachments,
                workspaceId: taskDetails.workspace_id || null, // ? Adicionar workspaceId
            });
        } catch (error) {
            console.error("Erro ao carregar detalhes da tarefa:", error);
        } finally {
            setIsLoadingTaskDetails(false);
        }
    }, []);

    useEffect(() => {
        if (!taskIdParam) return;
        if (initialTaskIdRef.current === taskIdParam) return;
        initialTaskIdRef.current = taskIdParam;
        handleTaskClick(taskIdParam);
    }, [taskIdParam, handleTaskClick]);

    // ? Variável para controlar se drag está habilitado
    const isDragDisabled = viewOption !== 'status' && viewOption !== 'priority' && viewOption !== 'group' && viewOption !== 'project';

    const handleViewModeChange = useCallback((value: string) => {
        if (value === "kanban") {
            preloadTaskBoard().catch(() => { });
        } else if (value === "calendar") {
            preloadPlannerCalendar().catch(() => { });
        }

        setViewMode(value as ViewMode);
    }, []);

    if (shouldShowLoadingSkeleton) {
        return <TasksPageSkeleton />;
    }

    return (
        <div
            className={cn(
                "bg-white",
                viewMode === "kanban"
                    ? "h-screen flex flex-col overflow-hidden"
                    : "min-h-screen pb-20"
            )}
            suppressHydrationWarning
        >
            {/* HEADER AREA - LINE 1 */}
            <div className="bg-white border-b border-gray-200 px-6 py-3 sticky top-0 z-10">
                <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row md:items-stretch justify-between gap-4">
                    <div className="flex items-center gap-4">
                        {/* Ícone do Projeto - proporção 1:1 */}
                        {tagFilter && projectIconName && (() => {
                            const ProjectIcon = getIconComponent(projectIconName);
                            return (
                                <div className="flex items-center">
                                    <div className="w-10 h-10 rounded-lg bg-[#050815] flex items-center justify-center flex-shrink-0">
                                        <ProjectIcon className="w-5 h-5 text-white" />
                                    </div>
                                </div>
                            );
                        })()}
                        <div className="flex flex-col justify-center">
                            <h1 className="text-2xl font-bold text-gray-900">
                                {tagFilter || "Tarefas"}
                            </h1>
                            <p className="text-sm text-gray-500">
                                {tagFilter
                                    ? "Gerencie as tarefas de um projeto aqui"
                                    : "Gerencie o trabalho do dia a dia."}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Barra Inferior: Filtros e Ações */}
            <div className="border-b border-gray-200 bg-white px-6">
                <div className="max-w-[1600px] mx-auto py-3">
                    <div className="flex flex-1 items-center justify-between gap-2 flex-wrap">
                        {/* Lado Esquerdo */}
                        <div className="flex items-center gap-4">
                            <Tabs value={viewMode} onValueChange={handleViewModeChange}>
                                <TabsList variant="default">
                                    <TabsTrigger value="list" variant="default" className="flex items-center gap-1">
                                        <List className="w-4 h-4" />
                                        <span className="text-sm font-medium">Lista</span>
                                    </TabsTrigger>
                                    <TabsTrigger
                                        value="kanban"
                                        variant="default"
                                        className="flex items-center gap-1"
                                        onMouseEnter={() => {
                                            preloadTaskBoard().catch(() => { });
                                        }}
                                        onFocus={() => {
                                            preloadTaskBoard().catch(() => { });
                                        }}
                                    >
                                        <LayoutGrid className="w-4 h-4" />
                                        <span className="text-sm font-medium">Quadro</span>
                                    </TabsTrigger>
                                    <TabsTrigger
                                        value="calendar"
                                        variant="default"
                                        className="flex items-center gap-1"
                                        onMouseEnter={() => {
                                            preloadPlannerCalendar().catch(() => { });
                                        }}
                                        onFocus={() => {
                                            preloadPlannerCalendar().catch(() => { });
                                        }}
                                    >
                                        <Calendar className="w-4 h-4" />
                                        <span className="text-sm font-medium">Calendário</span>
                                    </TabsTrigger>
                                </TabsList>
                            </Tabs>
                            {/* Controles do Calendário - apenas na view de calendário */}
                            {viewMode === "calendar" && calendarControls && (
                                <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg h-9 w-fit">
                                    <button
                                        onClick={calendarControls.handlePrev}
                                        className="px-2 py-1.5 rounded-md transition-all flex items-center justify-center text-gray-500 hover:text-gray-900"
                                        title="Anterior"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={calendarControls.handleToday}
                                        className="px-2 py-1.5 rounded-md transition-all flex items-center text-sm font-medium text-gray-500 hover:text-gray-900"
                                        title="Hoje"
                                    >
                                        Hoje
                                    </button>
                                    <button
                                        onClick={calendarControls.handleNext}
                                        className="px-2 py-1.5 rounded-md transition-all flex items-center justify-center text-gray-500 hover:text-gray-900"
                                        title="Próximo"
                                    >
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                    <div className="mx-2 h-4 w-[1px] bg-gray-300" />
                                    <span className="px-2 text-sm font-medium text-gray-900 capitalize">
                                        {calendarControls.monthYearTitle}
                                    </span>
                                </div>
                            )}

                        </div>

                        {/* Lado Direito: Busca e Filtros */}
                        <div className="flex flex-1 items-center justify-end gap-2">
                            {/* Filtros - apenas Lista e Quadro */}
                            {(viewMode === "list" || viewMode === "kanban") && (
                                <>
                                    {/* Busca - apenas ícone (sempre visível) */}
                                    {!isSearchOpen ? (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-9 w-9 text-gray-500 hover:text-gray-900"
                                            onClick={() => setIsSearchOpen(true)}
                                        >
                                            <Search className="w-4 h-4" />
                                        </Button>
                                    ) : (
                                        <div className="relative flex items-center transition-all duration-200 ease-out">
                                            <Search className="absolute left-1.5 w-4 h-4 text-gray-400 pointer-events-none" />
                                            <Input
                                                placeholder="Buscar tarefas..."
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                onBlur={() => {
                                                    if (!searchQuery) {
                                                        setIsSearchOpen(false);
                                                    }
                                                }}
                                                autoFocus
                                                className="pl-7 pr-2 w-[280px] h-9 bg-transparent border-0 shadow-none rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 transition-all duration-200 ease-out"
                                            />
                                        </div>
                                    )}
                                    <SortMenu
                                        sortBy={sortBy}
                                        onSortChange={handleSortByChange}
                                        onPersistSortOrder={handlePersistSortOrder}
                                    />
                                    <GroupingMenu value={viewOption} onGroupChange={(v) => handleViewOptionChange(v as ViewOption)} />
                                </>
                            )}
                            {/* Filtro de Visualiza??o - apenas Calendário */}
                            {viewMode === "calendar" && calendarControls && (
                                <>
                                    <CalendarViewMenu
                                        currentView={calendarControls.currentView as "dayGridMonth" | "timeGridWeek" | "listDay"}
                                        onViewChange={(view) => calendarControls.handleViewChange(view)}
                                    />
                                    {/* Busca - apenas ícone (sempre visível) */}
                                    {!isSearchOpen ? (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-9 w-9 text-gray-500 hover:text-gray-900"
                                            onClick={() => setIsSearchOpen(true)}
                                        >
                                            <Search className="w-4 h-4" />
                                        </Button>
                                    ) : (
                                        <div className="relative flex items-center transition-all duration-200 ease-out">
                                            <Search className="absolute left-1.5 w-4 h-4 text-gray-400 pointer-events-none" />
                                            <Input
                                                placeholder="Buscar tarefas..."
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                onBlur={() => {
                                                    if (!searchQuery) {
                                                        setIsSearchOpen(false);
                                                    }
                                                }}
                                                autoFocus
                                                className="pl-7 pr-2 w-[280px] h-9 bg-transparent border-0 shadow-none rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 transition-all duration-200 ease-out"
                                            />
                                        </div>
                                    )}
                                </>
                            )}
                            <Button
                                onClick={() => {
                                    setIsCreateGroupModalOpen(true);
                                }}
                                className="bg-green-600 hover:bg-green-700 text-white"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Novo Grupo
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Conteúdo Principal */}
            <div
                className={cn(
                    "w-full bg-white px-6",
                    viewMode === "kanban" ? "flex-1 min-h-0 overflow-hidden" : ""
                )}
            >
                <div className={cn("mx-auto w-full max-w-[1600px]", viewMode === "kanban" && "h-full")}>
                    <div className="relative h-full w-full py-3">
                        {/* Overlay de carregamento ao trocar de workspace / filtros */}
                        {isLoadingTasks && (
                            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/60 backdrop-blur-[1px] pointer-events-none">
                                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white shadow-sm border border-gray-200">
                                    <Loader2 className="w-4 h-4 animate-spin text-green-600" />
                                    <span className="text-xs font-medium text-gray-600">
                                        Atualizando tarefas...
                                    </span>
                                </div>
                            </div>
                        )}

                        <AnimatePresence mode="sync" initial={false}>
                            <motion.div
                                key={viewMode}
                                initial={shouldReduceMotion ? false : { opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: shouldReduceMotion ? 1 : 0 }}
                                transition={shouldReduceMotion ? undefined : { duration: 0.15 }}
                                className="h-full"
                            >
                                {viewMode === "list" ? (
                                    <div className="h-full">
                                        <DndContext
                                            sensors={sensors}
                                            collisionDetection={collisionDetectionStrategy}
                                            onDragStart={handleDragStart}
                                            onDragOver={handleDragOver}
                                            onDragEnd={handleDragEnd}
                                            onDragCancel={handleDragCancel}
                                        >
                                            {viewOption === "group" && groupOrder.length > 0 ? (
                                                <SortableContext
                                                    items={groupOrder}
                                                    strategy={verticalListSortingStrategy}
                                                >
                                                    <div className="space-y-0">
                                                        {listGroups.length === 0 && (
                                                            <div className="h-[calc(100vh-200px)] flex items-center justify-center">
                                                                <EmptyState
                                                                    icon={CheckSquare}
                                                                    title="Nenhuma tarefa encontrada"
                                                                    description="Que tal criar sua primeira tarefa agora?"
                                                                    actionLabel="Criar Tarefa"
                                                                    onClick={() => setIsModalOpen(true)}
                                                                />
                                                            </div>
                                                        )}
                                                        {listGroups.map((group, index) => {
                                                            // Calcular posições para ordenação baseado em groupOrder
                                                            let canMoveToTop = false;
                                                            let canMoveToBottom = false;
                                                            if (viewOption === "group") {
                                                                const groupIndexInOrder = groupOrder.findIndex(id => id === group.id);
                                                                if (groupIndexInOrder !== -1) {
                                                                    const minIndex = groupOrder[0] === "inbox" || groupOrder[0] === "Inbox" ? 1 : 0;
                                                                    const maxIndex = groupOrder.length - 1;
                                                                    canMoveToTop = groupIndexInOrder > minIndex;
                                                                    canMoveToBottom = groupIndexInOrder < maxIndex;
                                                                }
                                                            }
                                                            const minIndex = groupOrder[0] === "inbox" || groupOrder[0] === "Inbox" ? 1 : 0;
                                                            const groupIndexInOrder = groupOrder.findIndex(id => id === group.id);
                                                            const canMoveUp = viewOption === "group" ? (groupIndexInOrder > minIndex) : true;
                                                            const maxIndex = groupOrder.length - 1;
                                                            const canMoveDown = viewOption === "group" ? (groupIndexInOrder < maxIndex && groupIndexInOrder !== -1) : true;

                                                            return (
                                                                <TaskGroup
                                                                    key={`${effectiveWorkspaceId}-${viewOption}-${group.id}`}
                                                                    id={group.id}
                                                                    title={group.title}
                                                                    tasks={group.tasks}
                                                                    groupColor={group.groupColor || groupColors[group.id]}
                                                                    workspaceId={effectiveWorkspaceId || null}
                                                                    onTaskClick={handleTaskClick}
                                                                    isDragDisabled={isDragDisabled}
                                                                    onTaskUpdated={handleTaskUpdated}
                                                                    onTaskUpdatedOptimistic={handleOptimisticUpdate}
                                                                    onTaskDeletedOptimistic={handleOptimisticDelete}
                                                                    onTaskCreatedOptimistic={handleTaskCreatedOptimistic}
                                                                    members={workspaceMembers}
                                                                    onRenameGroup={viewOption === "group" ? handleRenameGroup : undefined}
                                                                    onColorChange={viewOption === "group" ? handleColorChange : undefined}
                                                                    onDeleteGroup={viewOption === "group" ? handleDeleteGroup : undefined}
                                                                    onClearGroup={viewOption === "group" ? handleClearGroup : undefined}
                                                                    onReorderGroup={viewOption === "group" ? handleReorderGroup : undefined}
                                                                    canMoveUp={canMoveUp}
                                                                    canMoveDown={canMoveDown}
                                                                    canMoveToTop={canMoveToTop}
                                                                    canMoveToBottom={canMoveToBottom}
                                                                    showGroupActions={viewOption === "group"}
                                                                    onAddTask={viewOption === "group" || viewOption === "project" || viewOption === "status" ? handleAddTaskToGroup : undefined}
                                                                    showProjectTag={true}
                                                                    tagFilter={tagFilter || undefined}
                                                                    collapsed={collapsedGroupIds.has(group.id)}
                                                                    onToggleCollapse={handleToggleGroupCollapse}
                                                                    registerAddInputRef={registerAddInputRef}
                                                                />
                                                            );
                                                        })}
                                                        {/* Ghost Group para criação rápida - apenas na visão de grupos */}
                                                        {viewOption === "group" && (
                                                            <GhostGroup onClick={() => setIsCreateGroupModalOpen(true)} />
                                                        )}
                                                    </div>
                                                </SortableContext>
                                            ) : (
                                                <div className="space-y-0">
                                                    {listGroups.length === 0 && (
                                                        <div className="h-[calc(100vh-200px)] flex items-center justify-center">
                                                            <EmptyState
                                                                icon={CheckSquare}
                                                                title="Nenhuma tarefa encontrada"
                                                                description="Que tal criar sua primeira tarefa agora?"
                                                                actionLabel="Criar Tarefa"
                                                                onClick={() => setIsModalOpen(true)}
                                                            />
                                                        </div>
                                                    )}
                                                    {listGroups.map((group, index) => {
                                                        // Calcular posições para ordenação baseado em groupOrder
                                                        let canMoveToTop = false;
                                                        let canMoveToBottom = false;
                                                        let canMoveUp = true;
                                                        let canMoveDown = true;
                                                        if (viewOption === "group") {
                                                            const groupIndexInOrder = groupOrder.findIndex(id => id === group.id);
                                                            if (groupIndexInOrder !== -1) {
                                                                const minIndex = groupOrder[0] === "inbox" || groupOrder[0] === "Inbox" ? 1 : 0;
                                                                const maxIndex = groupOrder.length - 1;
                                                                canMoveToTop = groupIndexInOrder > minIndex;
                                                                canMoveToBottom = groupIndexInOrder < maxIndex;
                                                                canMoveUp = groupIndexInOrder > minIndex;
                                                                canMoveDown = groupIndexInOrder < maxIndex;
                                                            }
                                                        }

                                                        return (
                                                            <TaskGroup
                                                                key={group.id}
                                                                id={group.id}
                                                                title={group.title}
                                                                tasks={group.tasks}
                                                                groupColor={group.groupColor || groupColors[group.id]}
                                                                workspaceId={effectiveWorkspaceId || null}
                                                                onTaskClick={handleTaskClick}
                                                                isDragDisabled={isDragDisabled}
                                                                onTaskUpdated={handleTaskUpdated}
                                                                onTaskUpdatedOptimistic={handleOptimisticUpdate}
                                                                onTaskDeletedOptimistic={handleOptimisticDelete}
                                                                onTaskCreatedOptimistic={handleTaskCreatedOptimistic}
                                                                members={workspaceMembers}
                                                                onRenameGroup={viewOption === "group" ? handleRenameGroup : undefined}
                                                                onColorChange={viewOption === "group" ? handleColorChange : undefined}
                                                                onDeleteGroup={viewOption === "group" ? handleDeleteGroup : undefined}
                                                                onClearGroup={viewOption === "group" ? handleClearGroup : undefined}
                                                                onReorderGroup={viewOption === "group" ? handleReorderGroup : undefined}
                                                                canMoveUp={canMoveUp}
                                                                canMoveDown={canMoveDown}
                                                                canMoveToTop={canMoveToTop}
                                                                canMoveToBottom={canMoveToBottom}
                                                                showGroupActions={viewOption === "group"}
                                                                onAddTask={viewOption === "group" || viewOption === "project" || viewOption === "status" ? handleAddTaskToGroup : undefined}
                                                                showProjectTag={true}
                                                                tagFilter={tagFilter || undefined}
                                                                collapsed={collapsedGroupIds.has(group.id)}
                                                                onToggleCollapse={handleToggleGroupCollapse}
                                                                registerAddInputRef={registerAddInputRef}
                                                            />
                                                        );
                                                    })}
                                                    {/* Ghost Group para criação rápida - apenas na visão de grupos */}
                                                    {viewOption === "group" && (
                                                        <GhostGroup onClick={() => setIsCreateGroupModalOpen(true)} />
                                                    )}
                                                </div>
                                            )}
                                            {portalTargetReady && typeof document !== "undefined" && document.body
                                                ? createPortal(
                                                    <DragOverlay
                                                        adjustScale={false}
                                                        dropAnimation={{ duration: 180, easing: "cubic-bezier(0.2, 0.9, 0.2, 1)" }}
                                                    >
                                                        {activeTask ? (
                                                            <div className="bg-white rounded-lg border border-gray-200 p-3 shadow-2xl rotate-2 scale-105 cursor-grabbing">
                                                                <div className="font-medium text-gray-900 text-sm">{activeTask.title}</div>
                                                            </div>
                                                        ) : null}
                                                    </DragOverlay>,
                                                    document.body
                                                )
                                                : null}
                                        </DndContext>
                                    </div>
                                ) : viewMode === "calendar" ? (
                                    <div className="h-[calc(100vh-300px)]" key={`calendar-${effectiveWorkspaceId}`}>
                                        <PlannerCalendar
                                            workspaceId={effectiveWorkspaceId}
                                            hideHeader={true}
                                            onControlsReady={setCalendarControls}
                                        />
                                    </div>
                                ) : (
                                    <div className="h-full min-h-0" key={`kanban-${effectiveWorkspaceId}-${viewOption}`}>
                                        {/* ? CORREÇÃO CRÍTICA: TaskBoard precisa estar dentro de DndContext para drag funcionar */}
                                        <DndContext
                                            sensors={sensors}
                                            collisionDetection={collisionDetectionStrategy}
                                            onDragStart={handleDragStart}
                                            onDragOver={handleDragOver}
                                            onDragEnd={handleDragEnd}
                                            onDragCancel={handleDragCancel}
                                        >
                                            <TaskBoard
                                                columns={kanbanColumns}
                                                onTaskClick={handleTaskClick}
                                                onTaskMoved={reloadTasks}
                                                onToggleComplete={handleToggleComplete}
                                                onTaskUpdatedOptimistic={handleOptimisticUpdate}
                                                isDragDisabled={isDragDisabled}
                                                onRenameGroup={viewOption === "group" ? handleRenameGroup : undefined}
                                                onColorChange={viewOption === "group" ? handleColorChange : undefined}
                                                onDeleteGroup={viewOption === "group" ? handleDeleteGroup : undefined}
                                                onClearGroup={viewOption === "group" ? handleClearGroup : undefined}
                                                showGroupActions={viewOption === "group"}
                                                viewOption={viewOption}
                                                onAddTask={handleAddTaskToKanban}
                                                onCreateGroup={viewOption === "group" ? () => setIsCreateGroupModalOpen(true) : undefined}
                                                members={workspaceMembers}
                                                groupBy={viewOption}
                                            />
                                            {portalTargetReady && typeof document !== "undefined" && document.body
                                                ? createPortal(
                                                    <DragOverlay
                                                        adjustScale={false}
                                                        dropAnimation={{ duration: 180, easing: "cubic-bezier(0.2, 0.9, 0.2, 1)" }}
                                                    >
                                                        {activeTask ? (
                                                            <div className="bg-white rounded-lg border border-gray-200 shadow-2xl p-3 rotate-2 scale-105 cursor-grabbing">
                                                                <div className="font-medium text-gray-900 text-sm">{activeTask.title}</div>
                                                            </div>
                                                        ) : null}
                                                    </DragOverlay>,
                                                    document.body
                                                )
                                                : null}
                                        </DndContext>
                                    </div>
                                )}
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    {/* Modal de Detalhes */}
                    {isModalOpen && (
                        <TaskDetailModal
                            key={selectedTaskId}
                            open={isModalOpen}
                            onOpenChange={(open) => {
                                setIsModalOpen(open);
                                if (!open) {
                                    setTaskDetails(null);
                                    setSelectedTaskId(null);
                                }
                            }}
                            task={taskDetails}
                            mode={selectedTaskId ? "edit" : "create"}
                            initialTags={!selectedTaskId && tagFilter ? [tagFilter] : undefined}
                            onTaskCreated={async () => {
                                await reloadTasks();
                                // Recarregar calend rio se estiver na view de calend rio
                                // Usar setTimeout para garantir que o reloadTasks terminou
                                setTimeout(() => {
                                    if (viewMode === "calendar" && calendarControls?.reloadEvents) {
                                        calendarControls.reloadEvents();
                                    }
                                }, 300);
                            }}
                            onTaskUpdated={handleTaskUpdated}
                            onTaskUpdatedOptimistic={handleOptimisticUpdate}
                        />
                    )}

                    {/* Modal de CriaÃ§Ã£o de Grupo */}
                    <Dialog open={isCreateGroupModalOpen} onOpenChange={setIsCreateGroupModalOpen}>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Novo Grupo de Tarefas</DialogTitle>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                    <label htmlFor="group-name" className="text-sm font-medium">
                                        Nome do Grupo
                                    </label>
                                    <Input
                                        id="group-name"
                                        value={newGroupName}
                                        onChange={(e) => setNewGroupName(e.target.value)}
                                        placeholder="Ex: Marketing, Design, Sprint 1..."
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter" && !isCreatingGroup) {
                                                e.preventDefault();
                                                handleCreateGroup();
                                            }
                                        }}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <label className="text-sm font-medium">
                                        Cor do Grupo
                                    </label>
                                    <div className="flex flex-wrap gap-2">
                                        {[
                                            { name: "Vermelho", value: "#ef4444", class: "bg-red-500" },
                                            { name: "Azul", value: "#3b82f6", class: "bg-blue-500" },
                                            { name: "Verde", value: "#22c55e", class: "bg-green-500" },
                                            { name: "Amarelo", value: "#eab308", class: "bg-yellow-500" },
                                            { name: "Roxo", value: "#a855f7", class: "bg-purple-500" },
                                            { name: "Rosa", value: "#ec4899", class: "bg-pink-500" },
                                            { name: "Laranja", value: "#f97316", class: "bg-orange-500" },
                                            { name: "Cinza", value: "#64748b", class: "bg-slate-500" },
                                            { name: "Ciano", value: "#06b6d4", class: "bg-cyan-500" },
                                            { name: "Índigo", value: "#6366f1", class: "bg-indigo-500" },
                                        ].map((color) => (
                                            <button
                                                key={color.value}
                                                type="button"
                                                onClick={() => setNewGroupColor(color.value)}
                                                className={cn(
                                                    "w-8 h-8 rounded-full border-2 transition-all",
                                                    color.class,
                                                    newGroupColor === color.value
                                                        ? "border-gray-900 scale-110 ring-2 ring-offset-2 ring-gray-400"
                                                        : "border-gray-300 hover:border-gray-400"
                                                )}
                                                title={color.name}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setIsCreateGroupModalOpen(false);
                                        setNewGroupName("");
                                        setNewGroupColor("#e5e7eb");
                                    }}
                                    disabled={isCreatingGroup}
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    onClick={handleCreateGroup}
                                    disabled={isCreatingGroup || !newGroupName.trim()}
                                >
                                    {isCreatingGroup ? "Criando..." : "Criar Grupo"}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>
        </div>
    );
}
