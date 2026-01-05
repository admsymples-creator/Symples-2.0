"use client";

import { useState, useMemo, useEffect, useCallback, useRef, memo } from "react";
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
import { Search, Filter, Plus, List, LayoutGrid, ChevronDown, CheckSquare, FolderPlus, CircleDashed, Archive, ArrowUpDown, Loader2, Save, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
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
import { getTaskDetails } from "@/lib/actions/task-details";
import { mapStatusToLabel, mapLabelToStatus, STATUS_TO_LABEL, ORDERED_STATUSES } from "@/lib/config/tasks";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useWorkspace } from "@/components/providers/SidebarProvider";
import { useWorkspaces } from "@/components/providers/WorkspacesProvider";
import { useTasks, invalidateTasksCache } from "@/hooks/use-tasks";
import type { TaskWithDetails } from "@/lib/actions/tasks";
import type { WorkspaceGroup } from "@/lib/group-actions";
import { getProjectIcon } from "@/lib/actions/projects";
import { getIconComponent } from "@/components/projects/IconPicker";

type ViewMode = "list" | "kanban" | "calendar";
type GroupBy = "status" | "priority" | "assignee" | "date";
type ViewOption = "group" | "status" | "date" | "priority" | "assignee";

const DATE_COLOR_MAP: Record<string, string> = {
    "Atrasadas": "#ef4444",
    "Hoje": "#16a34a",
    "Amanh├ú": "#eab308",
    "Semana": "#2563eb",
    "Futuro": "#475569",
    "Sem data": "#cbd5e1",
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
    assigneeId?: string | null; // ID do respons├â┬ível atual
    dueDate?: string;
    tags?: string[];
    hasUpdates?: boolean;
    workspaceId?: string | null;
    group?: { id: string; name: string; color?: string }; // compat├â┬¡vel com TaskBoard
    hasComments?: boolean;
    commentCount?: number;
    position?: number; // Posi├º├úo para ordena├º├úo (drag & drop)
    isPending?: boolean; // ? Marca tarefas otimistas que ainda est├úo sendo criadas
}

interface TasksPageProps {
    initialTasks?: TaskWithDetails[];
    initialGroups?: WorkspaceGroup[];
    workspaceId?: string;
}

// ? Fun├º├úo auxiliar para mapear par├ómetro group da URL para ViewOption
// Trata todos os edge cases: "none", null, undefined -> "group" (padr├úo)
function getInitialViewOption(groupParam: string | null): ViewOption {
    if (groupParam === "status") return "status";
    if (groupParam === "priority") return "priority";
    if (groupParam === "date") return "date";
    if (groupParam === "assignee") return "assignee";
    // "none", null ou undefined -> "group" (padr├úo: grupos do banco)
    // Tamb├®m trata qualquer outro valor inv├ílido como "group"
    return "group";
}

export default function TasksPage({ initialTasks, initialGroups, workspaceId: propWorkspaceId }: TasksPageProps = {}) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const pathname = usePathname();

    // Ler sortBy da URL, com fallback para "position"
    const urlSort = (searchParams.get("sort") as "status" | "priority" | "assignee" | "title" | "position") || "position";

    // Ler tag da URL para filtro de projeto (decodificar se presente)
    const tagParam = searchParams.get("tag");
    const tagFilter = tagParam ? decodeURIComponent(tagParam) : null;

    // ? Inicializar viewOption da URL (Lazy Initialization para evitar flicker)
    const initialViewOption = getInitialViewOption(searchParams.get("group"));

    const activeTab = "todas" as const;
    const [viewMode, setViewMode] = useState<ViewMode>("list");
    const [viewOption, setViewOption] = useState<ViewOption>(initialViewOption);
    const [sortBy, setSortBy] = useState<"status" | "priority" | "assignee" | "title" | "position">(urlSort);
    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isCreateGroupModalOpen, setIsCreateGroupModalOpen] = useState(false);
    const [newGroupName, setNewGroupName] = useState("");
    const [newGroupColor, setNewGroupColor] = useState("#e5e7eb");
    const [isCreatingGroup, setIsCreatingGroup] = useState(false);
    const [activeTask, setActiveTask] = useState<Task | null>(null);
    const [taskDetails, setTaskDetails] = useState<any>(null);
    const [isLoadingTaskDetails, setIsLoadingTaskDetails] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
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

    // Ref para throttling do handleDragOver
    const dragOverThrottleRef = useRef<number | null>(null);
    const lastDragOverStateRef = useRef<string>("");
    const dragStartGroupKeyRef = useRef<string | null>(null);
    const [groupColors, setGroupColors] = useState<Record<string, string>>({});
    const [workspaceMembers, setWorkspaceMembers] = useState<Array<{ id: string; name: string; avatar?: string }>>([]);

    // ? CORRE├ç├âO: Inicializar availableGroups com initialGroups se dispon├¡vel (evita flicker)
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

    // ? CORRE├ç├âO: Inicializar groupOrder com base em initialGroups ou localStorage (evita flicker)
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
                            // Adicionar grupos novos que n├úo est├úo na ordem salva
                            const newGroups = initialGroups
                                .map(g => g.id)
                                .filter(id => !validOrder.includes(id));
                            if (validOrder.length > 0 || newGroups.length > 0) {
                                return ["inbox", ...validOrder.filter((id: string) => id !== "inbox"), ...newGroups];
                            }
                        } catch (e) {
                            // Fallback para ordem padr├úo
                        }
                    }
                }
                // Ordem padr├úo: inbox primeiro, depois grupos do banco
                return ["inbox", ...initialGroups.map(g => g.id)];
            }
        }
        return [];
    });
    const { activeWorkspaceId, isLoaded } = useWorkspace();
    const workspaces = useWorkspaces();
    const localTasksRef = useRef<Task[]>([]);
    const listGroupsRef = useRef<Array<{ id: string; title: string; tasks: Task[]; groupColor?: string }>>([]);
    const previousGroupOrderRef = useRef<string[]>([]);
    const [projectIconName, setProjectIconName] = useState<string | null>(null);

    // ├ó┼ôÔÇª NOVO: Usar workspaceId da prop se fornecido, sen├â┬úo usar do contexto
    const effectiveWorkspaceId = propWorkspaceId ?? activeWorkspaceId;

    // ├ó┼ôÔÇª NOVO: Se initialTasks foi fornecido, n├â┬úo usar o hook para buscar dados iniciais
    // O hook s├â┬│ ser├â┬í usado para refetch quando necess├â┬írio
    const shouldUseHook = !initialTasks;

    // Usar hook customizado para gerenciar tarefas (apenas se n├â┬úo tiver initialTasks)
    const { tasks: tasksFromHook, isLoading: isLoadingTasks, error: tasksError, refetch: refetchTasks } = useTasks({
        workspaceId: effectiveWorkspaceId,
        tab: activeTab,
        enabled: isLoaded && shouldUseHook, // ├ó┼ôÔÇª Desabilitar hook se initialTasks foi fornecido
        tag: tagFilter || undefined,
    });

    // Fun├â┬º├â┬úo para mapear dados do banco para interface local (mantida para compatibilidade com outras partes do c├â┬│digo)
    const mapTaskFromDB = (task: TaskFromDB | TaskWithDetails): Task => {
        // Extrair tags do origin_context se existir
        const tags: string[] = [];
        if (task.origin_context && typeof task.origin_context === 'object' && 'tags' in task.origin_context && Array.isArray((task.origin_context as any).tags)) {
            tags.push(...(task.origin_context as any).tags);
        } else if ((task as any).tags && Array.isArray((task as any).tags)) {
            tags.push(...(task as any).tags);
        }

        // Mapear assignees - usar array assignees se dispon├¡vel (inclui task_members), sen├úo usar assignee
        let assignees: Array<{ name: string; avatar?: string; id?: string }> = [];
        if ((task as any).assignees && Array.isArray((task as any).assignees)) {
            // Usar array assignees que j├í vem transformado das queries
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
            // Contar coment├â┬írios
            hasComments: ((task as any).comment_count || 0) > 0,
            commentCount: (task as any).comment_count || 0,
            position: (task as any).position ?? (task as any).order ?? undefined,
        };
    };

    // Manter estado local para atualiza├â┬º├â┬Áes otimistas
    const [localTasks, setLocalTasks] = useState<Task[]>(() => {
        // ├ó┼ôÔÇª NOVO: Inicializar com initialTasks se fornecido
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

    // ├ó┼ôÔÇª CORRE├âÔÇí├âãÆO: Compara├â┬º├â┬úo profunda baseada em IDs para evitar loops infinitos
    // Compara apenas os IDs das tarefas, n├â┬úo as refer├â┬¬ncias dos arrays
    const prevTaskIdsRef = useRef<string>('');
    useEffect(() => {
        // ├ó┼ôÔÇª NOVO: Se initialTasks foi fornecido, n├â┬úo sincronizar com hook
        if (initialTasks) {
            return;
        }

        // Criar string de IDs ordenados para compara├â┬º├â┬úo est├â┬ível
        const currentTaskIds = tasksFromHook
            .map(t => t.id)
            .sort()
            .join(',');

        // S├â┬│ atualizar se os IDs realmente mudaram (evita re-renders desnecess├â┬írios)
        if (prevTaskIdsRef.current !== currentTaskIds) {
            prevTaskIdsRef.current = currentTaskIds;
            setLocalTasks(tasksFromHook);
        }
    }, [tasksFromHook, initialTasks]);

    // Sensores para drag & drop (otimizados para resposta mais r├ípida)
    // useSensors j├í memoiza internamente, ent├úo n├úo precisamos de useMemo adicional
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

    const collisionDetectionStrategy = useCallback((args: Parameters<typeof pointerWithin>[0]) => {
        // ✅ CORREÇÃO: Usar localTasks como fallback se localTasksRef estiver vazio
        const currentTasks = localTasksRef.current.length > 0 ? localTasksRef.current : localTasks;
        const taskIds = new Set(currentTasks.map((task) => String(task.id)));

        // ✅ CORREÇÃO: Incluir IDs dos grupos como containers válidos
        // Isso garante que grupos vazios sejam detectados como targets de drop
        const groupIds = Object.keys(groupedDataRef.current);
        const validIds = new Set([...taskIds, ...groupIds, "inbox", "Inbox"]);

        // ✅ DEBUG: Log se tiver tagFilter
        if (process.env.NODE_ENV === 'development' && tagFilter && taskIds.size === 0) {
            console.warn('⚠️ [collisionDetectionStrategy] taskIds vazio com tagFilter:', {
                tagFilter,
                localTasksRefCount: localTasksRef.current.length,
                localTasksCount: localTasks.length,
                usingLocalTasks: localTasksRef.current.length === 0,
                groupIds
            });
        }

        const pointerCollisions = pointerWithin(args);
        if (pointerCollisions.length > 0) {
            // Permitir colisão com tasks E grupos
            const validCollisions = pointerCollisions.filter((collision) => validIds.has(String(collision.id)));
            if (validCollisions.length > 0) {
                return validCollisions;
            }
        }

        const taskContainers = args.droppableContainers.filter((container) =>
            validIds.has(String(container.id))
        );
        if (taskContainers.length > 0) {
            const taskRects = new Map(
                Array.from(args.droppableRects.entries()).filter(([id]) => validIds.has(String(id)))
            );
            return closestCenter({
                ...args,
                droppableContainers: taskContainers,
                droppableRects: taskRects,
            });
        }

        return closestCenter(args);
    }, [localTasks, tagFilter]);


    // Handler para criar grupo
    const handleCreateGroup = async () => {
        if (!newGroupName.trim()) {
            toast.error("Digite o nome do grupo");
            return;
        }

        setIsCreatingGroup(true);

        try {
            let targetWorkspaceId: string | null = effectiveWorkspaceId;

            // Se n├â┬úo encontrou (improv├â┬ível com o novo Sidebar), usar o primeiro workspace do contexto
            if (!targetWorkspaceId && workspaces.length > 0) {
                targetWorkspaceId = workspaces[0].id;
            }

            if (!targetWorkspaceId) {
                toast.error("N├â┬úo foi poss├â┬¡vel identificar o workspace. Certifique-se de que voc├â┬¬ ├â┬® membro de um workspace.");
                setIsCreatingGroup(false);
                return;
            }

            const result = await createTaskGroup(newGroupName.trim(), targetWorkspaceId, newGroupColor);

            if (result.success) {
                toast.success("Grupo criado com sucesso!");
                setNewGroupName("");
                setNewGroupColor("#e5e7eb");
                setIsCreateGroupModalOpen(false);
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

    // Fun├â┬º├â┬úo para recarregar tarefas (com prote├â┬º├â┬úo contra loops)
    // Fun├â┬º├â┬úo para recarregar tarefas (usa o hook ou recarrega via prop)
    const reloadTasks = useCallback(async () => {
        if (initialTasks) {
            // ├ó┼ôÔÇª NOVO: Se initialTasks foi fornecido, n├â┬úo usar hook
            // A p├â┬ígina Server Component deve ser recarregada via router.refresh()
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
        // Invalidar cache e recarregar tarefas ap├â┬│s atualiza├â┬º├â┬úo
        invalidateTasksCache(effectiveWorkspaceId, activeTab);
        if (!initialTasks) {
            refetchTasks();
        }
    }, [effectiveWorkspaceId, activeTab, refetchTasks, initialTasks]);

    const handleTaskDeleted = useCallback(() => {
        // Recarregar ap├â┬│s deletar
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

    // Callbacks memoizados para TaskGroup - usar refs para evitar depend├â┬¬ncias
    const handleRenameGroup = useCallback(async (groupId: string, newTitle: string) => {
        const currentViewOption = viewOptionRef.current;
        const currentLocalTasks = localTasksRef.current;
        const currentLoadGroups = loadGroups;

        if (currentViewOption !== "group") {
            toast.error("N├â┬úo ├â┬® poss├â┬¡vel editar o nome de grupos autom├â┬íticos.");
            return;
        }

        if (groupId === "inbox" || groupId === "Inbox") {
            toast.error("O grupo padr├â┬úo Inbox n├â┬úo pode ser renomeado.");
            return;
        }

        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(groupId)) {
            toast.error("ID de grupo inv├â┬ílido");
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
            toast.error("ID de grupo inv├â┬ílido");
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
            toast.error("O grupo Inbox n├â┬úo pode ser deletado.");
            return;
        }

        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(groupId)) {
            toast.error("ID de grupo inv├â┬ílido");
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
        id: string; // ID tempor├írio ou real
        title: string;
        status: string;
        priority?: "low" | "medium" | "high" | "urgent";
        assignees?: Array<{ name: string; avatar?: string; id?: string }>;
        dueDate?: string;
        groupId?: string | null;
        workspaceId?: string | null;
        tags?: string[];
        isPending?: boolean; // ? Marca se est├í sendo criada (para mostrar skeleton)
    }) => {
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
            position: undefined,
            isPending: taskData.isPending ?? true, // ? Por padr├úo, tarefas otimistas est├úo pending
        };

        setLocalTasks((prev) => {
            // ? Seguir ordem existente: adicionar no final
            // Isso mant├®m consist├¬ncia com ordena├º├úo (position, priority, etc.)
            // e permite cria├º├úo r├ípida sem quebrar o fluxo visual
            // O QuickTaskAdd est├í no final, ent├úo faz sentido a tarefa aparecer logo acima dele
            if (sortBy === "position") {
                // Quando ordenado por position: calcular ├║ltima posi├º├úo e adicionar no final
                // Filtrar tarefas do mesmo grupo se viewOption === "group"
                const tasksInSameGroup = viewOption === "group" && taskData.groupId
                    ? prev.filter(t => (t.group?.id || null) === taskData.groupId)
                    : prev;

                const maxPosition = tasksInSameGroup.length > 0
                    ? Math.max(...tasksInSameGroup.map(t => t.position ?? 0))
                    : 0;

                const taskWithPosition = {
                    ...newTask,
                    position: maxPosition + 1000 // Adicionar no final da lista/grupo
                };

                // Adicionar no final do array completo (a ordena├º├úo ser├í reaplicada)
                return [...prev, taskWithPosition];
            } else {
                // Outras ordena├º├Áes: adicionar no final tamb├®m para manter consist├¬ncia
                // A ordena├º├úo ser├í reaplicada automaticamente pelo useMemo
                return [...prev, newTask];
            }
        });
    }, [availableGroups, sortBy, viewOption]); // ? Adicionar sortBy e viewOption nas depend├¬ncias

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
            "N├úo iniciada": "todo",
            "Em progresso": "in_progress",
            "Revis├úo": "review",
            "Corre├º├úo": "correction",
            "Bloqueado": "blocked",
            "Finalizado": "done",
            // Aliases para compatibilidade
            "Backlog": "todo",
            "Triagem": "todo",
            "Execu├º├úo": "in_progress",
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
            // Se estiver na vis├úo de grupos, usar o groupId recebido
            // Se for "inbox", groupId ├® null (explicitamente)
            if (groupId === "inbox" || groupId === "Inbox") {
                finalGroupId = null;
            } else {
                finalGroupId = groupId;
            }
            dbStatus = "todo";
            statusLabel = STATUS_TO_LABEL.todo;
        } else if (viewOption === "assignee") {
            // Encontrar o membro pelo nome para obter o ID
            if (groupId === "Sem respons├ível") {
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

        // ? 2. Atualiza├º├úo otimista: adicionar tarefa ao estado local imediatamente
        const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const assignee = assigneeId ? workspaceMembers.find(m => m.id === assigneeId) : undefined;

        // ✅ Incluir tags do projeto se houver tagFilter
        const finalTags = tags || (tagFilter ? [tagFilter] : []);

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
                                isPending: false, // ? Marcar como n├úo pending ap├│s sucesso
                            } as Task;
                        }
                        return task;
                    });
                });
            } else {
                // ? 5. Erro: rollback - remover tarefa otimista
                setLocalTasks(previousTasks);
                console.error("Erro ao criar tarefa:", result.error);
                if (result.error === "Usu├írio n├úo autenticado") {
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
    }, [viewOption, effectiveWorkspaceId, activeTab, router, workspaceMembers, handleTaskCreatedOptimistic, availableGroups, tagFilter]);

    // Handler para adicionar tarefa no kanban (TaskBoard) com Optimistic UI
    // Reutiliza a mesma l├│gica do handleAddTaskToGroup
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
                // ? 4. Sucesso: Tarefa j├í foi removida otimisticamente
                toast.success("Tarefa exclu├¡da com sucesso");
                // Invalidar cache para sincronizar
                invalidateTasksCache(effectiveWorkspaceId, activeTab);
            } else {
                // ? 5. Erro: Rollback - restaurar tarefa
                setLocalTasks(previousTasks);
                console.error("Erro ao excluir tarefa:", result.error);
                if (result.error === "Usu├írio n├úo autenticado") {
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

    // Ref para groupedData (ser├â┬í atualizado ap├â┬│s groupedData ser definido)
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

    // Limpar cores de grupos que n├â┬úo existem mais quando viewOption muda
    useEffect(() => {
        // S├â┬│ faz sentido limpar se groupColors estiver sendo usado para viewOption
        // Por seguran├â┬ºa, vamos manter o estado anterior se n├â┬úo for "group"
        // Mas se mudarmos para "status", os IDs mudam, ent├â┬úo as cores antigas n├â┬úo servem
        // Melhor deixar o usu├â┬írio redefinir cores se necess├â┬írio ou manter cache

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

    // Fun├â┬º├â┬úo para carregar grupos
    const loadGroups = useCallback(async () => {
        try {
            // Usar workspace ativo do contexto diretamente
            // N├â┬úo fazer fallback para getUserWorkspaces aqui - isso adiciona lat├â┬¬ncia desnecess├â┬íria
            // Se n├â┬úo houver workspace, simplesmente retornar grupos vazios
            const targetWorkspaceId: string | null = effectiveWorkspaceId;

            const result = await getTaskGroups(targetWorkspaceId);
            if (result.success && result.data) {
                const groupsData = result.data;
                setAvailableGroups(groupsData);

                // Preservar ordem existente ou inicializar se n├úo existir
                // Usar fun├â┬º├â┬úo de callback do setState para acessar o valor atual de groupOrder
                setGroupOrder((currentOrder) => {
                    if (viewOption === "group") {
                        // Se j├í existe ordem, apenas adicionar grupos novos ao final (preservar ordem existente)
                        if (currentOrder.length > 0) {
                            const groupIds = new Set(groupsData.map((g: any) => g.id));
                            const existingIds = new Set(currentOrder);
                            const newGroups = groupsData
                                .map((g: any) => g.id)
                                .filter((id: string) => !existingIds.has(id));
                            if (newGroups.length > 0) {
                                // Adicionar novos grupos ao final, preservando a ordem existente
                                const updatedOrder = [...currentOrder, ...newGroups];
                                // Salvar no localStorage
                                if (typeof window !== "undefined") {
                                    localStorage.setItem("taskGroupOrder", JSON.stringify(updatedOrder));
                                }
                                return updatedOrder;
                            }
                            // Ordem j├í est├í completa, n├úo precisa modificar
                            return currentOrder;
                        }

                        // Se n├úo existe ordem, tentar carregar do localStorage primeiro
                        if (typeof window !== "undefined") {
                            const savedOrder = localStorage.getItem("taskGroupOrder");
                            if (savedOrder) {
                                try {
                                    const parsed = JSON.parse(savedOrder);
                                    // Validar que todos os IDs existem nos grupos carregados
                                    const groupIds = new Set(groupsData.map((g: any) => g.id));
                                    const validOrder = parsed.filter((id: string) => id === "inbox" || groupIds.has(id));
                                    // Adicionar grupos novos que n├úo est├úo na ordem salva
                                    const newGroups = groupsData
                                        .map((g: any) => g.id)
                                        .filter((id: string) => !validOrder.includes(id));
                                    if (validOrder.length > 0 || newGroups.length > 0) {
                                        const finalOrder = ["inbox", ...validOrder.filter((id: string) => id !== "inbox"), ...newGroups];
                                        // Garantir que est├í salvo no localStorage
                                        localStorage.setItem("taskGroupOrder", JSON.stringify(finalOrder));
                                        return finalOrder;
                                    }
                                } catch (e) {
                                    console.error("Erro ao carregar ordem dos grupos:", e);
                                }
                            }
                        }
                        // Ordem padr├â┬úo: inbox primeiro, depois grupos do banco
                        const defaultOrder = ["inbox", ...groupsData.map((g: any) => g.id)];
                        // Salvar no localStorage
                        if (typeof window !== "undefined") {
                            localStorage.setItem("taskGroupOrder", JSON.stringify(defaultOrder));
                        }
                        return defaultOrder;
                    }
                    return currentOrder;
                });
            } else {
                // Se n├â┬úo houver grupos, limpar lista
                setAvailableGroups([]);
            }
        } catch (error) {
            console.error("Erro ao carregar grupos:", error);
            setAvailableGroups([]);
        }
    }, [effectiveWorkspaceId, viewOption]);

    // Carregar grupos quando workspace mudar (tarefas s├â┬úo gerenciadas pelo hook useTasks)
    useEffect(() => {
        if (!isLoaded) return;

        // Limpar grupos quando workspace/tab mudar
        setAvailableGroups([]);

        // Carregar grupos em background (n├â┬úo bloqueia a UI)
        loadGroups().catch((err) => {
            console.error("Erro ao carregar grupos:", err);
        });
    }, [effectiveWorkspaceId, activeTab, isLoaded, loadGroups]);

    // Buscar membros do workspace
    useEffect(() => {
        const loadMembers = async () => {
            // Se n├â┬úo houver workspace ativo, limpar lista e n├â┬úo buscar
            if (!effectiveWorkspaceId) {
                setWorkspaceMembers([]);
                return;
            }

            try {
                const members = await getWorkspaceMembers(effectiveWorkspaceId);
                const mappedMembers = members.map((m: any) => ({
                    id: m.id || m.email || "",
                    name: m.full_name || m.email || "Usu├â┬írio",
                    avatar: m.avatar_url || undefined,
                }));
                setWorkspaceMembers(mappedMembers);
            } catch (error) {
                console.error("Erro ao carregar membros:", error);
            }
        };
        loadMembers();
    }, [effectiveWorkspaceId]);

    // ? Atualiza├º├úo otimista: atualiza estado local imediatamente (Optimistic UI)
    const updateLocalTask = useCallback((taskId: string | number, updates: Partial<Task>) => {
        const id = String(taskId);
        setLocalTasks((prev) => {
            const taskIndex = prev.findIndex(t => String(t.id) === id);
            if (taskIndex === -1) {
                console.warn("[updateLocalTask] Tarefa n├úo encontrada:", id);
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
            toast.error("O grupo Inbox n├úo pode ser reordenado.");
            return;
        }

        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(groupId)) {
            toast.error("Grupo inv├ílido.");
            return;
        }

        if (!activeWorkspaceId) {
            toast.error("Workspace n├úo encontrado.");
            return;
        }

        // Optimistic UI: reordenar groupOrder localmente
        setGroupOrder((currentOrder) => {
            previousGroupOrderRef.current = [...currentOrder]; // Salvar para rollback
            const previousOrder = [...currentOrder];
            const currentIndex = previousOrder.findIndex(id => id === groupId);

            if (currentIndex === -1) {
                toast.error("Grupo n├úo encontrado.");
                return currentOrder;
            }

            // Calcular ├¡ndice m├¡nimo (ap├│s inbox se existir)
            const minIndex = previousOrder[0] === "inbox" ? 1 : 0;
            const maxIndex = previousOrder.length - 1;

            // Verificar limites e calcular novo ├¡ndice
            let newIndex: number;

            if (direction === "top") {
                // Mover para o topo (ap├│s inbox se existir)
                if (currentIndex === minIndex) {
                    return currentOrder; // J├í est├í no topo permitido
                }
                newIndex = minIndex;
            } else if (direction === "bottom") {
                // Mover para o final
                if (currentIndex === maxIndex) {
                    return currentOrder; // J├í est├í no final
                }
                newIndex = maxIndex;
            } else if (direction === "up") {
                // Mover para cima
                if (currentIndex <= minIndex) {
                    return currentOrder; // J├í est├í no topo permitido
                }
                newIndex = currentIndex - 1;
            } else { // direction === "down"
                // Mover para baixo
                if (currentIndex === maxIndex) {
                    return currentOrder; // J├í est├í no final
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
            // Para "top" e "bottom", fazer m├║ltiplas chamadas de "up" ou "down"
            // at├® chegar na posi├º├úo desejada
            if (direction === "top" || direction === "bottom") {
                const currentOrder = previousGroupOrderRef.current;
                const currentIndex = currentOrder.findIndex(id => id === groupId);
                const minIndex = currentOrder[0] === "inbox" ? 1 : 0;
                const maxIndex = currentOrder.length - 1;

                if (direction === "top") {
                    // Mover para o topo: fazer m├║ltiplas chamadas "up"
                    const steps = currentIndex - minIndex;
                    let lastSuccessfulOrder = [...currentOrder];

                    for (let i = 0; i < steps; i++) {
                        const result = await reorderTaskGroup(groupId, "up", activeWorkspaceId);
                        if (!result.success) {
                            // Se o erro for "j├í est├í no topo", significa que chegamos na posi├º├úo desejada
                            if (result.error?.includes("j├í est├í no topo") || result.error?.includes("j├í est├í no final")) {
                                // J├í est├í na posi├º├úo desejada - sucesso!
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

                        // Atualizar ordem local ap├│s cada chamada bem-sucedida
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

                        // Pequeno delay para garantir que a mudan├ºa foi processada
                        await new Promise(resolve => setTimeout(resolve, 100));
                    }
                } else { // direction === "bottom"
                    // Mover para o final: fazer m├║ltiplas chamadas "down"
                    const steps = maxIndex - currentIndex;
                    let lastSuccessfulOrder = [...currentOrder];

                    for (let i = 0; i < steps; i++) {
                        const result = await reorderTaskGroup(groupId, "down", activeWorkspaceId);
                        if (!result.success) {
                            // Se o erro for "j├í est├í no final", significa que chegamos na posi├º├úo desejada
                            if (result.error?.includes("j├í est├í no final") || result.error?.includes("j├í est├í no topo")) {
                                // J├í est├í na posi├º├úo desejada - sucesso!
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

                        // Atualizar ordem local ap├│s cada chamada bem-sucedida
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

                        // Pequeno delay para garantir que a mudan├ºa foi processada
                        await new Promise(resolve => setTimeout(resolve, 100));
                    }
                }

                // N├úo recarregar grupos aqui - a ordem j├í foi atualizada otimisticamente
                // e as m├║ltiplas chamadas j├í atualizaram o servidor
                toast.success("Grupo reordenado");
            } else {
                // Para "up" e "down", fazer chamada ├║nica
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
                    // Recarregar grupos do servidor para garantir sincroniza├º├úo
                    await loadGroups();
                    toast.success("Grupo reordenado");
                }
            }
        } catch (error) {
            // Rollback em caso de exce├º├úo
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
    const handleOptimisticUpdate = useCallback((taskId: string | number, updates: Partial<{ title?: string; status?: string; dueDate?: string; priority?: string; assignees?: Array<{ name: string; avatar?: string; id?: string }> }>) => {
        const localUpdates: Partial<Task> = {};
        if (updates.title) localUpdates.title = updates.title;
        if (updates.status) {
            localUpdates.status = updates.status;
        }
        if (updates.dueDate !== undefined) localUpdates.dueDate = updates.dueDate || undefined;
        if (updates.priority) localUpdates.priority = updates.priority as "low" | "medium" | "high" | "urgent";
        if (updates.assignees) {
            localUpdates.assignees = updates.assignees;
            // ? Tamb├®m atualizar assigneeId para manter consist├¬ncia
            localUpdates.assigneeId = updates.assignees[0]?.id || null;
        }
        updateLocalTask(taskId, localUpdates);
    }, [updateLocalTask]);


    // Filtrar tarefas por busca
    // Fun├â┬º├â┬úo para alternar status de conclus├â┬úo
    const handleToggleComplete = async (taskId: string, completed: boolean) => {
        // Atualiza├â┬º├â┬úo otimista no estado local
        setLocalTasks((prevTasks) =>
            prevTasks.map((task) =>
                task.id === taskId
                    ? { ...task, completed }
                    : task
            )
        );

        // Persistir no backend de forma ass├â┬¡ncrona
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
            // Sucesso - n├úo h├í dados retornados pelo updateTask (retorna { success: true, data: null })
            // A atualiza├º├úo otimista j├í foi feita acima, ent├úo n├úo precisamos fazer nada aqui
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

    // Fun├â┬º├â┬úo de agrupamento din├â┬ómico
    const groupedData = useMemo(() => {
        const groups: Record<string, Task[]> = {};

        // Mapeamento de prioridades para portugu├â┬¬s
        const priorityLabels: Record<string, string> = {
            "urgent": "Urgente",
            "high": "Alta",
            "medium": "M├â┬®dia",
            "low": "Baixa",
        };

        // ✅ CORREÇÃO: Inicializar grupos vazios se viewOption for "group"
        if (viewOption === "group") {
            // Sempre inicializar Inbox
            groups["inbox"] = [];

            // Inicializar todos os grupos disponíveis
            availableGroups.forEach(group => {
                groups[group.id] = [];
            });
        } else if (viewOption === "status") {
            // Inicializar status padrão
            const statusOrder = ["todo", "in_progress", "review", "correction", "blocked", "done", "archived"];
            statusOrder.forEach(status => {
                const label = STATUS_TO_LABEL[status as keyof typeof STATUS_TO_LABEL];
                if (label) groups[label] = [];
            });
        }

        filteredTasks.forEach((task) => {
            let groupKey = "Inbox";

            switch (viewOption) {
                case "group":
                    // Usar ID do grupo como chave para permitir edi├â┬º├â┬úo
                    if (task.group && task.group.id) {
                        groupKey = task.group.id;
                    } else {
                        groupKey = "inbox";
                    }

                    // Garantir que o grupo existe (caso n├â┬úo tenha sido inicializado ou seja um novo grupo)
                    if (!groups[groupKey]) {
                        // Se for um ID de grupo v├â┬ílido do banco que n├â┬úo estava em availableGroups
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

                        // Normalizar data da tarefa para compara├â┬º├â┬úo (sem hora)
                        const taskDate = new Date(date);
                        taskDate.setHours(0, 0, 0, 0);

                        if (taskDate < today && !task.completed) {
                            groupKey = "Atrasadas";
                        } else if (taskDate.getTime() === today.getTime()) {
                            groupKey = "Hoje";
                        } else if (taskDate.getTime() === tomorrow.getTime()) {
                            groupKey = "Amanh├ú";
                        } else if (taskDate > tomorrow && taskDate <= nextWeek) {
                            groupKey = "Semana";
                        } else {
                            groupKey = "Futuro";
                        }
                    }
                    break;
                case "assignee":
                    // Agrupar por nome do primeiro respons├ível
                    const assigneeName = task.assignees?.[0]?.name;
                    groupKey = assigneeName ? assigneeName.trim() : "Sem respons├ível";
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

    // ? CORRE├ç├âO: Reordenar grupos quando viewOption === "group" baseado em groupOrder
    const orderedGroupedData = useMemo(() => {
        if (viewOption === "group") {
            // Sempre usar groupOrder se dispon├¡vel, mesmo que esteja vazio inicialmente
            // Isso garante que a ordem seja preservada desde o in├¡cio
            if (groupOrder.length > 0) {
                // Criar um novo objeto ordenado baseado em groupOrder
                const ordered: Record<string, Task[]> = {};

                // Primeiro, adicionar grupos na ordem especificada
                groupOrder.forEach(groupId => {
                    if (groupedData[groupId]) {
                        ordered[groupId] = groupedData[groupId];
                    }
                });

                // Depois, adicionar grupos que n├úo est├úo em groupOrder (caso existam)
                Object.keys(groupedData).forEach(key => {
                    if (!ordered[key]) {
                        ordered[key] = groupedData[key];
                    }
                });

                return ordered;
            }
            // Se groupOrder est├í vazio mas temos groupedData, retornar groupedData
            // mas isso s├│ deve acontecer no primeiro render antes de groupOrder ser inicializado
            return groupedData;
        }
        return groupedData;
    }, [groupedData, viewOption, groupOrder]);

    // Converter grupos para formato de colunas (Kanban)
    // Otimizado: usa refer├¬ncias est├íveis e evita recria├º├úo quando dados n├úo mudam
    const kanbanColumns = useMemo(() => {
        const dataToUse = viewOption === "group" ? orderedGroupedData : groupedData;

        // Early return se n├úo h├í dados
        if (!dataToUse || Object.keys(dataToUse).length === 0) {
            return [];
        }

        const columns = Object.entries(dataToUse)
            .filter(([key, tasks]) => {
                // ? Filtrar grupos deletados: se viewOption === "group" e n├úo for "inbox",
                // verificar se o grupo ainda existe em availableGroups
                if (viewOption === "group" && key !== "inbox") {
                    const groupExists = availableGroups.some(g => g.id === key);
                    // Se o grupo n├úo existe mais e n├úo h├í tarefas, filtrar
                    if (!groupExists && tasks.length === 0) {
                        return false;
                    }
                }
                return true;
            })
            .map(([key, tasks]) => {
                let title = key;
                let color: string | undefined;

                // Recuperar t├â┬¡tulo real se a chave for um ID (modo group)
                if (viewOption === "group") {
                    if (key === "inbox") {
                        title = "Inbox";
                        color = "#64748b"; // Slate 500 para Inbox
                    } else {
                        // Tentar primeiro das tarefas
                        const groupFromTask = tasks[0]?.group;
                        if (groupFromTask) {
                            title = groupFromTask.name || "Sem Nome";
                            color = groupFromTask.color || undefined;
                        } else {
                            // Se n├â┬úo h├â┬í tarefas, buscar do availableGroups
                            const groupFromDB = availableGroups.find(g => g.id === key);
                            if (groupFromDB) {
                                title = groupFromDB.name || "Sem Nome";
                                color = groupFromDB.color || undefined;
                            } else {
                                title = "Sem Nome";
                            }
                        }

                        // Fallback para cor do mapa de cores se dispon├â┬¡vel
                        if (groupColors[key] && groupColors[key] !== color) {
                            color = groupColors[key];
                        }
                    }
                } else if (viewOption === "date") {
                    color = DATE_COLOR_MAP[title] || color;
                }

                return {
                    id: key,
                    title,
                    tasks,
                    color,
                };
            });

        if (viewOption === "status") {
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

        if (viewOption === "priority") {
            const priorityOrder = ["Urgente", "Alta", "M├â┬®dia", "Baixa"];
            return columns.sort((a, b) => {
                const aIndex = priorityOrder.indexOf(a.title);
                const bIndex = priorityOrder.indexOf(b.title);
                if (aIndex === -1 && bIndex === -1) return 0;
                if (aIndex === -1) return 1;
                if (bIndex === -1) return -1;
                return aIndex - bIndex;
            });
        }

        if (viewOption === "date") {
            const dateOrder = ["Atrasadas", "Hoje", "Amanh├ú", "Semana", "Futuro", "Sem data"];
            return columns.sort((a, b) => {
                const aIndex = dateOrder.indexOf(a.title);
                const bIndex = dateOrder.indexOf(b.title);
                if (aIndex === -1 && bIndex === -1) return 0;
                if (aIndex === -1) return 1;
                if (bIndex === -1) return -1;
                return aIndex - bIndex;
            });
        }

        if (viewOption === "assignee") {
            // Ordenar por nome alfabeticamente, com "Sem respons├ível" no final
            return columns.sort((a, b) => {
                if (a.title === "Sem respons├ível") return 1;
                if (b.title === "Sem respons├ível") return -1;
                return a.title.localeCompare(b.title, undefined, { sensitivity: "base" });
            });
        }

        return columns;
    }, [groupedData, orderedGroupedData, viewOption, availableGroups, groupColors]);

    // Converter grupos para formato de lista (TaskGroup) com ordena├â┬º├â┬úo
    const listGroups = useMemo(() => {
        const dataToUse = viewOption === "group" ? orderedGroupedData : groupedData;
        const groups = Object.entries(dataToUse).map(([key, tasks]) => {
            // Ordenar tarefas dentro do grupo
            const sortedTasks = [...tasks].sort((a, b) => {
                if (sortBy === "position") {
                    const posA = a.position ?? 0;
                    const posB = b.position ?? 0;
                    return posA - posB;
                }
                if (sortBy === "status") {
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
            });

            let title = key;
            let groupColor = undefined;

            // Recuperar t├â┬¡tulo e cor real se a chave for um ID (modo group)
            if (viewOption === "group") {
                if (key === "inbox") {
                    title = "Inbox";
                } else {
                    // Tentar primeiro das tarefas
                    const groupFromTask = tasks[0]?.group;
                    if (groupFromTask) {
                        title = groupFromTask.name || "Sem Nome";
                        groupColor = groupFromTask.color || undefined;
                    } else {
                        // Se n├â┬úo h├â┬í tarefas, buscar do availableGroups
                        const groupFromDB = availableGroups.find(g => g.id === key);
                        if (groupFromDB) {
                            title = groupFromDB.name || "Sem Nome";
                            groupColor = groupFromDB.color || undefined;
                        } else {
                            title = "Sem Nome";
                        }
                    }
                }
            } else if (viewOption === "date") {
                groupColor = DATE_COLOR_MAP[title] || groupColor;
            }

            return {
                id: key,
                title,
                tasks: sortedTasks,
                // Passar a cor do grupo vindo do banco se dispon├â┬¡vel, sen├â┬úo usa o local/padr├â┬úo
                groupColor,
            };
        });

        // Ordenar grupos conforme o tipo de agrupamento
        if (viewOption === "status") {
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

        if (viewOption === "priority") {
            const priorityOrder = ["Urgente", "Alta", "M├â┬®dia", "Baixa"];
            return groups.sort((a, b) => {
                const aIndex = priorityOrder.indexOf(a.title);
                const bIndex = priorityOrder.indexOf(b.title);
                if (aIndex === -1 && bIndex === -1) return a.title.localeCompare(b.title);
                if (aIndex === -1) return 1;
                if (bIndex === -1) return -1;
                return aIndex - bIndex;
            });
        }

        if (viewOption === "date") {
            const dateOrder = ["Atrasadas", "Hoje", "Amanh├ú", "Semana", "Futuro", "Sem data"];
            return groups.sort((a, b) => {
                const aIndex = dateOrder.indexOf(a.title);
                const bIndex = dateOrder.indexOf(b.title);
                if (aIndex === -1 && bIndex === -1) return 0;
                if (aIndex === -1) return 1;
                if (bIndex === -1) return -1;
                return aIndex - bIndex;
            });
        }

        if (viewOption === "assignee") {
            // Ordenar por nome alfabeticamente, com "Sem respons├ível" no final
            return groups.sort((a, b) => {
                if (a.title === "Sem respons├ível") return 1;
                if (b.title === "Sem respons├ível") return -1;
                return a.title.localeCompare(b.title, undefined, { sensitivity: "base" });
            });
        }

        // ? CORRE├ç├âO: Ordenar grupos baseado em groupOrder quando viewOption === "group"
        if (viewOption === "group" && groupOrder.length > 0) {
            return groups.sort((a, b) => {
                const aIndex = groupOrder.indexOf(a.id);
                const bIndex = groupOrder.indexOf(b.id);
                if (aIndex === -1 && bIndex === -1) return 0;
                if (aIndex === -1) return 1;
                if (bIndex === -1) return -1;
                return aIndex - bIndex;
            });
        }

        return groups;
    }, [groupedData, orderedGroupedData, viewOption, sortBy, groupColors, availableGroups.length, groupOrder]); // ? Adicionar groupOrder para recalcular quando a ordem mudar

    // Atualizar ref quando listGroups mudar
    useEffect(() => {
        listGroupsRef.current = listGroups;
    }, [listGroups]);

    const shouldShowLoadingSkeleton = !initialTasks
        && localTasks.length === 0
        && (!isLoaded || !effectiveWorkspaceId || isLoadingTasks);
    // Mapear status customiz├â┬íveis para status do banco (usando config centralizado)
    const mapStatusToDb = (status: string): "todo" | "in_progress" | "done" | "archived" => {
        return mapLabelToStatus(status) as "todo" | "in_progress" | "done" | "archived";
    };

    // Mapear prioridade do banco para label em portugu├â┬¬s
    const getPriorityLabel = (priority: string | undefined): string => {
        const priorityLabels: Record<string, string> = {
            "urgent": "Urgente",
            "high": "Alta",
            "medium": "M├â┬®dia",
            "low": "Baixa",
        };
        return priorityLabels[priority || "medium"] || priority || "M├â┬®dia";
    };

    // Fun├â┬º├â┬úo auxiliar para obter groupKey de uma tarefa (usada no Drag & Drop)
    const getTaskGroupKey = (task: Task): string => {
        switch (viewOption) {
            case "group":
                // Retornar ID do grupo para permitir compara├â┬º├â┬úo correta
                return task.group?.id || "inbox";
            case "status":
                return task.status || "Sem Status";
            case "priority":
                return getPriorityLabel(task.priority);
            case "date":
                if (!task.dueDate) return "Sem data";
                // ... l├â┬│gica de data repetida ...
                return "Inbox"; // Simplificado para evitar complexidade excessiva aqui, idealmente refatorar l├â┬│gica de data para fun├â┬º├â┬úo reutiliz├â┬ível
            case "assignee":
                const assigneeName = task.assignees?.[0]?.name;
                return assigneeName ? assigneeName.trim() : "Sem respons├ível";
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

    // Sincronizar sortBy quando URL mudar
    useEffect(() => {
        setSortBy(urlSort);
    }, [urlSort]);

    // ? Sincronizar viewOption quando par├ómetro group da URL mudar
    useEffect(() => {
        const groupParam = searchParams.get("group");
        const newViewOption = getInitialViewOption(groupParam);
        // S├│ atualizar se o valor realmente mudou para evitar re-renders desnecess├írios
        setViewOption((current) => {
            if (current !== newViewOption) {
                return newViewOption;
            }
            return current;
        });
    }, [searchParams]);

    // Aplica ordena├º├úo visualmente quando sortBy mudar (vindo da URL)
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

    // Fun├º├úo para persistir a ordem visual atual no banco
    const handlePersistSortOrder = useCallback(async () => {
        // Pega as tarefas na ordem visual atual (como aparecem na tela)
        // Precisamos usar a ordem dos grupos para garantir que pegamos na ordem correta
        const currentTasks = localTasksRef.current.length > 0 ? localTasksRef.current : localTasks;

        if (currentTasks.length === 0) {
            toast.info("Nenhuma tarefa para salvar");
            return;
        }

        // Se h├í ordena├º├úo aplicada, precisamos reordenar as tarefas conforme a ordem visual
        // A ordem visual ├® determinada pelo sortBy e pelos grupos
        let tasksInVisualOrder: Task[] = [];

        if (sortBy !== "position") {
            // Aplicar a mesma l├│gica de ordena├º├úo que ├® usada no listGroups
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

            // Agrupar por grupo (se aplic├ível) e ordenar dentro de cada grupo
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
            // Se sortBy ├® "position", usar a ordem atual (j├í ordenada por position)
            tasksInVisualOrder = [...currentTasks].sort((a, b) => {
                const posA = a.position ?? 0;
                const posB = b.position ?? 0;
                return posA - posB;
            });
        }

        // Recalcula ├¡ndices limpos (1000, 2000, 3000...)
        // Isso "reseta" a bagun├ºa dos floats e deixa tudo espa├ºado novamente
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
                // Atualizar estado local com as novas posi├º├Áes
                setLocalTasks((prev) => {
                    return prev.map((task) => {
                        const update = bulkUpdates.find((u) => u.id === String(task.id));
                        if (update) {
                            return { ...task, position: update.position };
                        }
                        return task;
                    });
                });

                // Atualizar ref tamb├®m com as tarefas na ordem correta
                localTasksRef.current = tasksInVisualOrder.map((task) => {
                    const update = bulkUpdates.find((u) => u.id === String(task.id));
                    if (update) {
                        return { ...task, position: update.position };
                    }
                    return task;
                });

                // Voltar para ordena├º├úo manual (position) ap├│s salvar
                setSortBy("position");

                // Invalidar cache e recarregar se necess├írio
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
        // ? Guard Clause: Verificar se drag est├í habilitado para este viewOption
        // ? CORRE├ç├âO: Validar se viewOption existe antes de comparar
        if (!viewOption) {
            console.warn("?? [handleDragStart] viewOption est├í undefined. Bloqueando drag.");
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

        const isDragEnabled = viewOption === 'status' || viewOption === 'priority' || viewOption === 'group';
        if (!isDragEnabled) {
            toast.info('O arrastar e soltar est├í desabilitado nesta visualiza├º├úo. Use "Status", "Prioridade" ou "Grupos" para reorganizar tarefas.');
            return; // Evita iniciar o drag
        }

        const { active } = event;
        // ? CORRE├ç├âO: Normalizar ID para string
        const activeIdStr = String(active.id);
        // ✅ CORREÇÃO: Usar localTasks como fallback se localTasksRef estiver vazio (pode acontecer com tagFilter)
        const currentTasks = localTasksRef.current.length > 0 ? localTasksRef.current : localTasks;
        const task = currentTasks.find((t) => String(t.id) === activeIdStr);

        if (!task) {
            // ✅ DEBUG: Log quando tarefa não é encontrada
            if (process.env.NODE_ENV === 'development') {
                console.warn("?? [handleDragStart] Tarefa n├úo encontrada para ID:", {
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
    // O dnd-kit j├í fornece feedback visual nativo sem necessidade de atualizar estado durante o drag
    // A atualiza├º├úo de estado acontece apenas no handleDragEnd quando o usu├írio solta o card

    const handleDragOver = useCallback((event: DragOverEvent) => {
        if (!viewOption) {
            return;
        }

        const isDragEnabled = viewOption === "status" || viewOption === "priority" || viewOption === "group";
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
        // ? Guard Clause: Verificar se drag est├í habilitado para este viewOption
        // ? CORRE├ç├âO: Validar se viewOption existe antes de comparar
        if (!viewOption) {
            console.warn("?? [handleDragEnd] viewOption est├í undefined. Bloqueando drag.");
            setActiveTask(null);
            resetDragState();
            return;
        }

        const isDragEnabled = viewOption === 'status' || viewOption === 'priority' || viewOption === 'group';
        if (!isDragEnabled) {
            toast.info('O arrastar e soltar est├í desabilitado nesta visualiza├º├úo. Use "Status", "Prioridade" ou "Grupos" para reorganizar tarefas.');
            setActiveTask(null);
            resetDragState();
            return; // Bloqueia a a├º├úo l├│gica se estiver nas views apenas de leitura
        }

        const { active, over } = event;
        setActiveTask(null);

        // ? CORRE├ç├âO: Validar se over existe e tem ID v├ílido
        if (!over) {
            console.log("?? [handleDragEnd] Drag cancelado: over ├® null/undefined");
            resetDragState();
            return;
        }

        // ? CORRE├ç├âO: Validar se active existe
        if (!active) {
            console.warn("?? [handleDragEnd] active ├® null/undefined");
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

        // ? CORRE├ç├âO: Valida├º├úo melhorada com logs
        if (!sourceGroupKey) {
            console.error("? [handleDragEnd] Grupo de origem n├úo encontrado para tarefa:", activeIdStr);
            if (process.env.NODE_ENV === 'development') {
                console.error("❌ [handleDragEnd] DEBUG - Tarefa não encontrada em groupedData:", {
                    activeIdStr,
                    tagFilter,
                    groupedDataKeys: Object.keys(groupedData),
                    allTaskIds: Object.values(groupedData).flat().map(t => String(t.id))
                });
            }
            toast.error("Erro: Tarefa de origem n├úo encontrada. Recarregue a p├ígina.");
            resetDragState();
            return;
        }

        // ? CORRE├ç├âO: Se overIdStr ├® uma coluna (n├úo uma tarefa), usar diretamente
        // No modo kanban, o over.id pode ser o ID da coluna (DroppableColumn)
        if (!destinationGroupKey) {
            // Verificar se ├® uma coluna do kanban
            if (viewMode === "kanban") {
                const kanbanColumn = kanbanColumns.find(col => col.id === overIdStr);
                if (kanbanColumn) {
                    destinationGroupKey = kanbanColumn.id;
                } else if (Object.keys(groupedData).includes(overIdStr)) {
                    destinationGroupKey = overIdStr;
                }
            } else if (Object.keys(groupedData).includes(overIdStr)) {
                destinationGroupKey = overIdStr;
            }
        }

        if (!destinationGroupKey) {
            toast.error("Erro: Destino inv├ílido. Tente arrastar para uma coluna v├ílida.");
            resetDragState();
            return;
        }

        const destinationTasks = groupedData[destinationGroupKey] || [];

        // ? CORRE├ç├âO: Se overIdStr ├® o ID de uma coluna (n├úo uma tarefa), adicionar no final
        // Se overIdStr ├® uma chave de groupedData, significa que arrastou para a coluna vazia
        const isOverColumn = Object.keys(groupedData).includes(overIdStr);
        let overIndex = -1;

        if (isOverColumn) {
            // Arrastou para a coluna vazia, adicionar no final
            overIndex = -1;
        } else {
            // Arrastou sobre uma tarefa, encontrar o ├¡ndice
            overIndex = destinationTasks.findIndex((t) => String(t.id) === overIdStr);
        }

        const targetIndex = overIndex >= 0 ? overIndex : destinationTasks.length;

        const isSameGroup = sourceGroupKey === destinationGroupKey;

        const updateData: {
            status?: "todo" | "in_progress" | "done" | "archived" | "review" | "correction";
            priority?: "low" | "medium" | "high" | "urgent";
            group_id?: string | null;
            assignee_id?: string | null;
        } = {};

        if (!isSameGroup) {
            // Type narrowing: ap├│s a guard clause, viewOption s├│ pode ser "status", "priority" ou "group"
            if (viewOption === "status" || viewOption === "priority" || viewOption === "group") {
                switch (viewOption) {
                    case "status":
                        updateData.status = mapLabelToStatus(destinationGroupKey) as any;
                        break;
                    case "priority": {
                        const priorityMap: Record<string, "low" | "medium" | "high" | "urgent"> = {
                            "Urgente": "urgent",
                            "Alta": "high",
                            "M├®dia": "medium",
                            "Baixa": "low",
                            "urgente": "urgent",
                            "alta": "high",
                            "m├®dia": "medium",
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
                }
            }
        } else if (viewOption === "group") {
            // Mesmo grupo: ainda envia group_id para garantir que o RLS permita o update
            updateData.group_id =
                destinationGroupKey === "inbox" || destinationGroupKey === "Inbox"
                    ? null
                    : destinationGroupKey;
        }

        // Reordenar lista local e recalcular posi├º├Áes por grupo
        let finalState: Task[] = [];
        // ✅ CORREÇÃO: Usar localTasks se localTasksRef estiver vazio (pode acontecer com tagFilter)
        const sourceForRollback = localTasksRef.current.length > 0 ? localTasksRef.current : localTasks;
        const rollbackState = sourceForRollback.map((t) => ({ ...t }));

        // ? Calcular posi├º├úo ANTES de atualizar o estado (para usar fora do setState)
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

        // aplicar altera├º├Áes de grupo/status/priority se mudou de grupo
        if (!isSameGroup) {
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

        // Atualizar apenas o item movido com a nova posi├º├úo calculada
        finalState = recomposed.map((t) => {
            if (String(t.id) === activeIdStr) {
                return { ...t, position: calculatedPosition };
            }
            // Manter posi├º├Áes existentes dos outros itens
            return t;
        });

        // Atualizar estado local
        setLocalTasks(finalState);

        // ✅ CORREÇÃO: Sempre atualizar localTasksRef após drag (garantir sincronização)
        localTasksRef.current = finalState;

        // ? Obter posi├º├úo calculada do item movido
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

        const persistPromise = updateTaskPosition({
            taskId: activeIdStr,
            newPosition: calculatedPosition,
            status: isSameGroup ? undefined : updateData.status,
            priority: isSameGroup ? undefined : updateData.priority,
            group_id: finalGroupId,
            assignee_id: isSameGroup ? undefined : updateData.assignee_id,
            workspace_id: movingFinal?.workspaceId ?? null,
        });

        void persistPromise
            .then((res) => {
                if (!res?.success) {
                    console.error("? [handleDragEnd] Falha ao salvar posi??o:", res?.error);
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

    const handleTaskClick = async (taskId: string | number) => {
        setSelectedTaskId(String(taskId));
        setIsModalOpen(true);
        setIsLoadingTaskDetails(true);

        try {
            // Buscar dados completos da tarefa usando getTaskDetails
            const taskDetails = await getTaskDetails(String(taskId));

            if (!taskDetails) {
                console.error("Tarefa n├â┬úo encontrada");
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
                        content: context.message || "Mensagem de ├â┬íudio",
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

            // Mapear coment├â┬írios para atividades
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
                subTasks: [], // Subtarefas n├â┬úo est├â┬úo implementadas no schema ainda
                activities,
                attachments: mappedAttachments,
                workspaceId: taskDetails.workspace_id || null, // ? Adicionar workspaceId
            });
        } catch (error) {
            console.error("Erro ao carregar detalhes da tarefa:", error);
        } finally {
            setIsLoadingTaskDetails(false);
        }
    };

    // ? Vari├ível para controlar se drag est├í habilitado
    const isDragDisabled = viewOption !== 'status' && viewOption !== 'priority' && viewOption !== 'group';

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

            {/* Barra Superior: Modo de Visualiza├º├úo */}
            <div className="border-b border-gray-200 bg-white px-6 py-3">
                <div className="max-w-[1600px] mx-auto">
                    <div className="flex items-center justify-between gap-4">
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
                                    <span className="text-sm font-medium">Calend├írio</span>
                                </TabsTrigger>
                            </TabsList>
                        </Tabs>

                    </div>
                </div>
            </div>

            {/* Barra Inferior: Filtros e A├º├Áes */}
            <div className="border-b border-gray-200 bg-white px-6">
                <div className="max-w-[1600px] mx-auto py-3">
                    <div className="flex flex-1 items-center justify-between gap-2 flex-wrap">
                        {/* Lado Esquerdo */}
                        <div className="flex items-center gap-4">
                            {/* Bot├úo Novo */}
                            <div className="flex items-center border border-green-600 rounded-lg overflow-hidden">
                                <Button
                                    onClick={() => {
                                        setSelectedTaskId(null);
                                        setTaskDetails(null);
                                        setIsModalOpen(true);
                                    }}
                                    className="bg-green-600 hover:bg-green-700 text-white rounded-r-none border-r border-green-700"
                                >
                                    <Plus className="w-4 h-4 mr-2" />
                                    Adicionar uma tarefa
                                </Button>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            className="bg-green-600 hover:bg-green-700 text-white rounded-l-none px-2 border-0"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                            }}
                                        >
                                            <ChevronDown className="w-4 h-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="start" className="w-48">
                                        <DropdownMenuItem
                                            onClick={() => {
                                                setSelectedTaskId(null);
                                                setTaskDetails(null);
                                                setIsModalOpen(true);
                                            }}
                                        >
                                            <CheckSquare className="w-4 h-4 mr-2" />
                                            Tarefa
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            onClick={() => {
                                                setIsCreateGroupModalOpen(true);
                                            }}
                                        >
                                            <FolderPlus className="w-4 h-4 mr-2" />
                                            Grupo
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>

                            {/* Controles do Calend├írio - apenas na view de calend├írio */}
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
                                        title="Pr├│ximo"
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
                        <div className="flex items-center gap-2">
                            {/* Filtros - apenas Lista e Quadro */}
                            {(viewMode === "list" || viewMode === "kanban") && (
                                <>
                                    <SortMenu onPersistSortOrder={handlePersistSortOrder} />
                                    <GroupingMenu />
                                </>
                            )}
                            {/* Filtro de Visualiza├º├úo - apenas Calend├írio */}
                            {viewMode === "calendar" && calendarControls && (
                                <CalendarViewMenu
                                    currentView={calendarControls.currentView as "dayGridMonth" | "timeGridWeek" | "listDay"}
                                    onViewChange={(view) => calendarControls.handleViewChange(view)}
                                />
                            )}

                            {/* Separador */}
                            {(viewMode === "list" || viewMode === "kanban") && (
                                <div className="h-4 w-[1px] bg-gray-300" />
                            )}

                            {/* Busca - apenas ├¡cone (sempre vis├¡vel) */}
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
                                <div className="relative flex items-center">
                                    <Search className="absolute left-3 w-4 h-4 text-gray-400 pointer-events-none" />
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
                                        className="pl-9 w-[240px] h-9 bg-white rounded-lg border-gray-200"
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Conte├║do Principal */}
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
                                                            // Calcular posi├º├Áes para ordena├º├úo baseado em groupOrder
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
                                                                    onAddTask={viewOption === "group" ? handleAddTaskToGroup : undefined}
                                                                    showProjectTag={true}
                                                                    tagFilter={tagFilter || undefined}
                                                                />
                                                            );
                                                        })}
                                                        {/* Ghost Group para cria├º├úo r├ípida - apenas na vis├úo de grupos */}
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
                                                        // Calcular posi├º├Áes para ordena├º├úo baseado em groupOrder
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
                                                                onAddTask={viewOption === "group" ? handleAddTaskToGroup : undefined}
                                                                showProjectTag={!!tagFilter}
                                                                tagFilter={tagFilter || undefined}
                                                            />
                                                        );
                                                    })}
                                                    {/* Ghost Group para cria├º├úo r├ípida - apenas na vis├úo de grupos */}
                                                    {viewOption === "group" && (
                                                        <GhostGroup onClick={() => setIsCreateGroupModalOpen(true)} />
                                                    )}
                                                </div>
                                            )}
                                            {typeof document !== "undefined"
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
                                        {/* ? CORRE├ç├âO CR├ìTICA: TaskBoard precisa estar dentro de DndContext para drag funcionar */}
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
                                            {typeof document !== "undefined"
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
                                // Recarregar calend┬ário se estiver na view de calend┬ário
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

                    {/* Modal de Cria├â┬º├â┬úo de Grupo */}
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
                                            { name: "├â┬ìndigo", value: "#6366f1", class: "bg-indigo-500" },
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
