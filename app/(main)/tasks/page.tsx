"use client";

import { useState, useMemo, useEffect, useCallback, useRef, memo } from "react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { TaskBoard } from "@/components/tasks/TaskBoard";
import { TaskDetailModal } from "@/components/tasks/TaskDetailModal";
import { Search, Filter, Plus, List, LayoutGrid, ChevronDown, CheckSquare, FolderPlus, CircleDashed, Archive, ArrowUpDown, Loader2, Save } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
    DragStartEvent,
    DragOverlay,
} from "@dnd-kit/core";
import {
    arrayMove,
    sortableKeyboardCoordinates,
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
    type Task as TaskFromDB 
} from "@/lib/actions/tasks";
import { updateTaskGroup, deleteTaskGroup, createTaskGroup, getTaskGroups } from "@/lib/actions/task-groups";
import { getTaskDetails } from "@/lib/actions/task-details";
import { mapStatusToLabel, mapLabelToStatus, STATUS_TO_LABEL, ORDERED_STATUSES } from "@/lib/config/tasks";
import { useRouter, useSearchParams } from "next/navigation";
import { getUserWorkspaces } from "@/lib/actions/user";
import { useWorkspace } from "@/components/providers/SidebarProvider";
import { useTasks, invalidateTasksCache } from "@/hooks/use-tasks";
import type { TaskWithDetails } from "@/lib/actions/tasks";
import type { WorkspaceGroup } from "@/lib/group-actions";

type ContextTab = "minhas" | "time" | "todas";
type ViewMode = "list" | "kanban";
type GroupBy = "status" | "priority" | "assignee";
type ViewOption = "group" | "status" | "date" | "priority" | "assignee";

import { GroupingMenu } from "@/components/tasks/ViewOptions";
import { SortMenu } from "@/components/tasks/SortMenu";

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
}

interface TasksPageProps {
    initialTasks?: TaskWithDetails[];
    initialGroups?: WorkspaceGroup[];
    workspaceId?: string;
}

// ✅ Função auxiliar para mapear parâmetro group da URL para ViewOption
// Trata todos os edge cases: "none", null, undefined -> "group" (padrão)
function getInitialViewOption(groupParam: string | null): ViewOption {
    if (groupParam === "status") return "status";
    if (groupParam === "priority") return "priority";
    if (groupParam === "date") return "date";
    if (groupParam === "assignee") return "assignee";
    // "none", null ou undefined -> "group" (padrão: grupos do banco)
    // Também trata qualquer outro valor inválido como "group"
    return "group";
}

export default function TasksPage({ initialTasks, initialGroups, workspaceId: propWorkspaceId }: TasksPageProps = {}) {
    const router = useRouter();
    const searchParams = useSearchParams();
    
    // Ler sortBy da URL, com fallback para "position"
    const urlSort = (searchParams.get("sort") as "status" | "priority" | "assignee" | "title" | "position") || "position";
    
    // ✅ Inicializar viewOption da URL (Lazy Initialization para evitar flicker)
    const initialViewOption = getInitialViewOption(searchParams.get("group"));
    
    const [activeTab, setActiveTab] = useState<ContextTab>("todas");
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
    const [groupColors, setGroupColors] = useState<Record<string, string>>({});
    const [workspaceMembers, setWorkspaceMembers] = useState<Array<{ id: string; name: string; avatar?: string }>>([]);
    const [availableGroups, setAvailableGroups] = useState<Array<{ id: string; name: string; color: string | null }>>([]);
    const [groupOrder, setGroupOrder] = useState<string[]>([]); // Ordem dos grupos quando viewOption === "group"
    const { activeWorkspaceId, isLoaded } = useWorkspace();
    const localTasksRef = useRef<Task[]>([]);
    
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
    });
    
    // FunÃ§Ã£o para mapear dados do banco para interface local (mantida para compatibilidade com outras partes do cÃ³digo)
    const mapTaskFromDB = (task: TaskFromDB | TaskWithDetails): Task => {
        // Extrair tags do origin_context se existir
        const tags: string[] = [];
        if (task.origin_context && typeof task.origin_context === 'object' && 'tags' in task.origin_context && Array.isArray((task.origin_context as any).tags)) {
            tags.push(...(task.origin_context as any).tags);
        } else if ((task as any).tags && Array.isArray((task as any).tags)) {
             tags.push(...(task as any).tags);
        }

        // Mapear assignees
        const assigneeData = (task as any).assignee;
        const assignees = assigneeData ? [{
             name: assigneeData.full_name || assigneeData.email || "Sem nome",
             avatar: assigneeData.avatar_url || undefined,
             id: task.assignee_id || undefined
        }] : [];

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
            return initialTasks.map(mapTaskFromDB);
        }
        return [];
    });
    
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

    // Sensores para drag & drop
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );


    // Handler para criar grupo
    const handleCreateGroup = async () => {
        if (!newGroupName.trim()) {
            toast.error("Digite o nome do grupo");
            return;
        }
        
        setIsCreatingGroup(true);
        
        try {
            let targetWorkspaceId: string | null = effectiveWorkspaceId;
            
            // Se nÃ£o encontrou (improvÃ¡vel com o novo Sidebar), buscar do primeiro workspace do usuÃ¡rio
            if (!targetWorkspaceId) {
                try {
                    const workspaces = await getUserWorkspaces();
                    if (workspaces.length > 0) {
                        targetWorkspaceId = workspaces[0].id;
                    }
                } catch (err) {
                    console.error("Erro ao buscar workspaces:", err);
                }
            }
            
            if (!targetWorkspaceId) {
                toast.error("NÃ£o foi possÃ­vel identificar o workspace. Certifique-se de que vocÃª Ã© membro de um workspace.");
                setIsCreatingGroup(false);
                return;
            }

            console.log("Criando grupo:", { name: newGroupName.trim(), workspaceId: targetWorkspaceId, color: newGroupColor });
            const result = await createTaskGroup(newGroupName.trim(), targetWorkspaceId, newGroupColor);
            console.log("Resultado criar grupo:", result);
            
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

    // FunÃ§Ã£o para recarregar tarefas (com proteÃ§Ã£o contra loops)
    // FunÃ§Ã£o para recarregar tarefas (usa o hook ou recarrega via prop)
    const reloadTasks = useCallback(async () => {
        if (initialTasks) {
            // âœ… NOVO: Se initialTasks foi fornecido, nÃ£o usar hook
            // A pÃ¡gina Server Component deve ser recarregada via router.refresh() ou similar
            // Por enquanto, apenas invalidar cache
            invalidateTasksCache(effectiveWorkspaceId, activeTab);
            // TODO: Implementar recarregamento via router.refresh() ou window.location.reload()
            return;
        }
        // Invalidar cache e refetch
        invalidateTasksCache(effectiveWorkspaceId, activeTab);
        await refetchTasks();
    }, [effectiveWorkspaceId, activeTab, refetchTasks, initialTasks]);

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
            toast.error("O grupo padrÃ£o Inbox nÃ£o pode ser renomeado.");
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
            toast.error("O grupo Inbox nÃ£o pode ser deletado.");
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

    // ✅ Optimistic Create: Adiciona tarefa instantaneamente ao estado local
    const handleTaskCreatedOptimistic = useCallback((taskData: {
        id: string; // ID temporário ou real
        title: string;
        status: string;
        priority?: "low" | "medium" | "high" | "urgent";
        assignees?: Array<{ name: string; avatar?: string; id?: string }>;
        dueDate?: string;
        groupId?: string | null;
        workspaceId?: string | null;
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
            tags: [],
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
        };

        setLocalTasks((prev) => {
            return [newTask, ...prev];
        });
    }, [availableGroups]);

    // ✅ Optimistic Delete: Remove tarefa instantaneamente do estado local
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
        assigneeId?: string | null
    ) => {
        // ✅ 1. Snapshot do estado anterior (para rollback)
        const previousTasks = [...localTasksRef.current];

        // Mapear status/priority baseado no viewOption e groupId (columnId)
        const statusMap: Record<string, "todo" | "in_progress" | "review" | "correction" | "done"> = {
            "Não iniciada": "todo",
            "Em progresso": "in_progress",
            "Revisão": "review",
            "Correção": "correction",
            "Finalizado": "done",
            // Aliases para compatibilidade
            "Backlog": "todo",
            "Triagem": "todo",
            "Execução": "in_progress",
        };

        let dbStatus: "todo" | "in_progress" | "review" | "correction" | "done" | undefined = "todo";
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
                finalGroupId = groupId;
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

        // ✅ 2. Atualização otimista: adicionar tarefa ao estado local imediatamente
        const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const assignee = assigneeId ? workspaceMembers.find(m => m.id === assigneeId) : undefined;
        
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
            workspaceId: activeTab === "minhas" ? null : (effectiveWorkspaceId || null),
        });

        try {
            // ✅ 3. Backend em background
            const result = await createTask({
                title,
                status: dbStatus as any,
                priority: priority,
                assignee_id: assigneeId || undefined,
                due_date: dueDate ? dueDate.toISOString() : undefined,
                workspace_id: activeTab === "minhas" ? null : (effectiveWorkspaceId || null),
                group_id: finalGroupId,
            });

            if (result.success && 'data' in result && result.data) {
                // ✅ 4. Sucesso: atualizar tarefa otimista com ID real do backend
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
                            } as Task;
                        }
                        return task;
                    });
                });
            } else {
                // ✅ 5. Erro: rollback - remover tarefa otimista
                setLocalTasks(previousTasks);
                console.error("Erro ao criar tarefa:", result.error);
                if (result.error === "Usuário não autenticado") {
                    router.push("/login");
                } else {
                    toast.error("Erro ao criar tarefa: " + (result.error || "Erro desconhecido"));
                }
            }
        } catch (error) {
            // ✅ 5. Erro: rollback - remover tarefa otimista
            setLocalTasks(previousTasks);
            console.error("Erro ao criar tarefa:", error);
            toast.error("Erro ao criar tarefa");
        }
    }, [viewOption, effectiveWorkspaceId, activeTab, router, workspaceMembers, handleTaskCreatedOptimistic, availableGroups]);

    // Handler para adicionar tarefa no kanban (TaskBoard) com Optimistic UI
    // Reutiliza a mesma lógica do handleAddTaskToGroup
    const handleAddTaskToKanban = useCallback(async (
        columnId: string,
        title: string,
        dueDate?: Date | null,
        assigneeId?: string | null
    ) => {
        // Usar o mesmo handler que funciona para TaskGroup
        // O columnId funciona da mesma forma que groupId
        return handleAddTaskToGroup(columnId, title, dueDate, assigneeId);
    }, [handleAddTaskToGroup]);

    // ✅ Handler para excluir tarefa com Optimistic UI e rollback
    const handleDeleteTaskWithOptimistic = useCallback(async (taskId: string | number) => {
        const id = String(taskId);
        
        // ✅ 1. Snapshot do estado anterior (para rollback)
        const previousTasks = [...localTasksRef.current];
        
        // ✅ 2. Optimistic UI: Remover tarefa do estado local imediatamente
        handleOptimisticDelete(id);

        try {
            // ✅ 3. Backend em background
            const result = await deleteTask(id);

            if (result.success) {
                // ✅ 4. Sucesso: Tarefa já foi removida otimisticamente
                toast.success("Tarefa excluída com sucesso");
                // Invalidar cache para sincronizar
                invalidateTasksCache(effectiveWorkspaceId, activeTab);
            } else {
                // ✅ 5. Erro: Rollback - restaurar tarefa
                setLocalTasks(previousTasks);
                console.error("Erro ao excluir tarefa:", result.error);
                if (result.error === "Usuário não autenticado") {
                    router.push("/login");
                } else {
                    toast.error("Erro ao excluir tarefa: " + (result.error || "Erro desconhecido"));
                }
            }
        } catch (error) {
            // ✅ 5. Erro: Rollback - restaurar tarefa
            setLocalTasks(previousTasks);
            console.error("Erro ao excluir tarefa:", error);
            toast.error("Erro ao excluir tarefa");
        }
    }, [handleOptimisticDelete, effectiveWorkspaceId, activeTab, router]);

    // Ref para groupedData (serÃ¡ atualizado apÃ³s groupedData ser definido)
    const groupedDataRef = useRef<Record<string, Task[]>>({});

    const handleClearGroup = useCallback(async (groupId: string) => {
        const currentViewOption = viewOptionRef.current;
        const currentGroupedData = groupedDataRef.current; // Usar ref (atualizado apÃ³s groupedData)
        const currentLocalTasks = localTasksRef.current;

        const groupTasks = currentGroupedData[groupId] || [];
        if (groupTasks.length === 0) {
            toast.info("Nenhuma tarefa para limpar neste grupo");
            return;
        }

        const previousTasks = [...currentLocalTasks];
        const taskIdsToArchive = groupTasks.map((t: Task) => t.id);
        
        setLocalTasks((prev) => prev.filter((t: Task) => {
            if (currentViewOption === "group") {
                if (groupId === "inbox") {
                    return t.group?.id !== null && t.group?.id !== undefined;
                }
                return t.group?.id !== groupId;
            }
            // Para outros viewOptions, usar getTaskGroupKey
            const taskGroupKey = getTaskGroupKey(t);
            return taskGroupKey !== groupId;
        }));

        try {
            await Promise.all(taskIdsToArchive.map((taskId: string) =>
                updateTask({ id: taskId, status: "archived" })
            ));
            invalidateTasksCache(activeWorkspaceId, activeTab);
            refetchTasksRef.current();
            toast.success(`${groupTasks.length} tarefa${groupTasks.length > 1 ? 's' : ''} arquivada${groupTasks.length > 1 ? 's' : ''} com sucesso`);
        } catch (error) {
            setLocalTasks(previousTasks);
            invalidateTasksCache(activeWorkspaceId, activeTab);
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
                
                // Inicializar ordem dos grupos se nÃ£o existir
                // Usar funÃ§Ã£o de callback do setState para acessar o valor atual de groupOrder
                setGroupOrder((currentOrder) => {
                    if (viewOption === "group" && currentOrder.length === 0) {
                        const savedOrder = localStorage.getItem("taskGroupOrder");
                        if (savedOrder) {
                            try {
                                const parsed = JSON.parse(savedOrder);
                                return parsed;
                            } catch (e) {
                                console.error("Erro ao carregar ordem dos grupos:", e);
                                // Ordem padrÃ£o: inbox primeiro, depois grupos do banco
                                return ["inbox", ...groupsData.map((g: any) => g.id)];
                            }
                        } else {
                            // Ordem padrÃ£o: inbox primeiro, depois grupos do banco
                            return ["inbox", ...groupsData.map((g: any) => g.id)];
                        }
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

    // Carregar grupos quando workspace mudar (tarefas sÃ£o gerenciadas pelo hook useTasks)
    useEffect(() => {
        if (!isLoaded) return;

        // Limpar grupos quando workspace/tab mudar
        setAvailableGroups([]);

        // Carregar grupos em background (nÃ£o bloqueia a UI)
        loadGroups().catch((err) => {
            console.error("Erro ao carregar grupos:", err);
        });
    }, [effectiveWorkspaceId, activeTab, isLoaded, loadGroups]);

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

    // ✅ Atualização otimista: atualiza estado local imediatamente (Optimistic UI)
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

    // ✅ Callback memoizado para optimistic updates
    const handleOptimisticUpdate = useCallback((taskId: string | number, updates: Partial<{ title?: string; status?: string; dueDate?: string; priority?: string; assignees?: Array<{ name: string; avatar?: string; id?: string }> }>) => {
        const localUpdates: Partial<Task> = {};
        if (updates.title) localUpdates.title = updates.title;
        if (updates.status) {
            localUpdates.status = updates.status;
        }
        if (updates.dueDate !== undefined) localUpdates.dueDate = updates.dueDate || undefined;
        if (updates.priority) localUpdates.priority = updates.priority as "low" | "medium" | "high" | "urgent";
        if (updates.assignees) localUpdates.assignees = updates.assignees;
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

    // FunÃ§Ã£o de agrupamento dinÃ¢mico
    const groupedData = useMemo(() => {
        const groups: Record<string, Task[]> = {};

        // Mapeamento de prioridades para portuguÃªs
        const priorityLabels: Record<string, string> = {
            "urgent": "Urgente",
            "high": "Alta",
            "medium": "MÃ©dia",
            "low": "Baixa",
        };

        // ✅ Buckets First: Inicializar grupos vazios baseado no viewOption
        if (viewOption === "group") {
            // Inicializar grupo "Inbox" (tarefas sem grupo)
            groups["inbox"] = [];
            
            // Inicializar grupos do banco (mesmo que vazios)
            availableGroups.forEach((group) => {
                groups[group.id] = [];
            });
        } else if (viewOption === "assignee") {
            // Inicializar grupos para todos os membros (mesmo sem tarefas)
            workspaceMembers.forEach((member) => {
                const memberName = member.name || "Membro";
                groups[memberName] = [];
            });
            // Grupo para tarefas sem responsável
            groups["Sem responsável"] = [];
        }

        filteredTasks.forEach((task) => {
            let groupKey = "Inbox";

            switch (viewOption) {
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
                        taskDate.setHours(0,0,0,0);

                        if (taskDate < today && !task.completed) {
                            groupKey = "Atrasadas";
                        } else if (taskDate.getTime() === today.getTime()) {
                            groupKey = "Hoje";
                        } else if (taskDate.getTime() === tomorrow.getTime()) {
                            groupKey = "AmanhÃ£";
                        } else if (taskDate > tomorrow && taskDate <= nextWeek) {
                            groupKey = "PrÃ³ximos 7 dias";
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

    // Atualizar ref para groupedData (apÃ³s groupedData ser definido)
    groupedDataRef.current = groupedData;

    // Reordenar grupos quando viewOption === "group" baseado em groupOrder
    const orderedGroupedData = useMemo(() => {
        return groupedData;
    }, [groupedData]);

    // Converter grupos para formato de colunas (Kanban)
    const kanbanColumns = useMemo(() => {
        const dataToUse = viewOption === "group" ? orderedGroupedData : groupedData;
        const columns = Object.entries(dataToUse)
            .filter(([key, tasks]) => {
                // ✅ Filtrar grupos deletados: se viewOption === "group" e não for "inbox",
                // verificar se o grupo ainda existe em availableGroups
                if (viewOption === "group" && key !== "inbox") {
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
            
            // Recuperar tÃ­tulo real se a chave for um ID (modo group)
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

        if (viewOption === "date") {
            const dateOrder = ["Atrasadas", "Hoje", "AmanhÃ£", "PrÃ³ximos 7 dias", "Futuro", "Sem data"];
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
            // Ordenar por nome alfabeticamente, com "Sem responsável" no final
            return columns.sort((a, b) => {
                if (a.title === "Sem responsável") return 1;
                if (b.title === "Sem responsável") return -1;
                return a.title.localeCompare(b.title, undefined, { sensitivity: "base" });
            });
        }

        return columns;
    }, [groupedData, orderedGroupedData, viewOption, availableGroups]);

    // Converter grupos para formato de lista (TaskGroup) com ordenaÃ§Ã£o
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
            
            // Recuperar tÃ­tulo e cor real se a chave for um ID (modo group)
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
            }

            return {
                id: key,
                title,
                tasks: sortedTasks,
                // Passar a cor do grupo vindo do banco se disponÃ­vel, senÃ£o usa o local/padrÃ£o
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

        if (viewOption === "date") {
            const dateOrder = ["Atrasadas", "Hoje", "AmanhÃ£", "PrÃ³ximos 7 dias", "Futuro", "Sem data"];
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
            // Ordenar por nome alfabeticamente, com "Sem responsável" no final
            return groups.sort((a, b) => {
                if (a.title === "Sem responsável") return 1;
                if (b.title === "Sem responsável") return -1;
                return a.title.localeCompare(b.title, undefined, { sensitivity: "base" });
            });
        }

        return groups;
    }, [groupedData, orderedGroupedData, viewOption, sortBy, groupColors, availableGroups.length]); // Usar .length para evitar re-renders quando o conteÃºdo muda mas o tamanho Ã© o mesmo


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
            default:
                return "Inbox";
        }
    };

    // Sincronizar sortBy quando URL mudar
    useEffect(() => {
        setSortBy(urlSort);
    }, [urlSort]);

    // ✅ Sincronizar viewOption quando parâmetro group da URL mudar
    useEffect(() => {
        const groupParam = searchParams.get("group");
        const newViewOption = getInitialViewOption(groupParam);
        // Só atualizar se o valor realmente mudou para evitar re-renders desnecessários
        setViewOption((current) => {
            if (current !== newViewOption) {
                return newViewOption;
            }
            return current;
        });
    }, [searchParams]);

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
    const handleDragStart = (event: DragStartEvent) => {
        // ✅ Guard Clause: Verificar se drag está habilitado para este viewOption
        // ✅ CORREÇÃO: Validar se viewOption existe antes de comparar
        if (!viewOption) {
            console.warn("⚠️ [handleDragStart] viewOption está undefined. Bloqueando drag.");
            return;
        }
        
        const isDragEnabled = viewOption === 'status' || viewOption === 'priority' || viewOption === 'group';
        if (!isDragEnabled) {
            toast.info('O arrastar e soltar está desabilitado nesta visualização. Use "Status", "Prioridade" ou "Grupos" para reorganizar tarefas.');
            return; // Evita iniciar o drag
        }

        const { active } = event;
        // ✅ CORREÇÃO: Normalizar ID para string
        const activeIdStr = String(active.id);
        const task = localTasks.find((t) => String(t.id) === activeIdStr);
        
        if (!task) {
            console.warn("⚠️ [handleDragStart] Tarefa não encontrada para ID:", activeIdStr);
            return;
        }
        
        setActiveTask(task);
    };

    // Handler para quando o drag termina
    const handleDragEnd = async (event: DragEndEvent) => {
        // ✅ Guard Clause: Verificar se drag está habilitado para este viewOption
        // ✅ CORREÇÃO: Validar se viewOption existe antes de comparar
        if (!viewOption) {
            console.warn("⚠️ [handleDragEnd] viewOption está undefined. Bloqueando drag.");
            setActiveTask(null);
            return;
        }
        
        const isDragEnabled = viewOption === 'status' || viewOption === 'priority' || viewOption === 'group';
        if (!isDragEnabled) {
            toast.info('O arrastar e soltar está desabilitado nesta visualização. Use "Status", "Prioridade" ou "Grupos" para reorganizar tarefas.');
            setActiveTask(null);
            return; // Bloqueia a ação lógica se estiver nas views apenas de leitura
        }

        const { active, over } = event;
        setActiveTask(null);
        
        // ✅ CORREÇÃO: Validar se over existe e tem ID válido
        if (!over) {
            console.log("ℹ️ [handleDragEnd] Drag cancelado: over é null/undefined");
            return;
        }
        
        // ✅ CORREÇÃO: Validar se active existe
        if (!active) {
            console.warn("⚠️ [handleDragEnd] active é null/undefined");
            return;
        }

        const activeIdStr = String(active.id);
        const overIdStr = String(over.id);
        
        // ✅ CORREÇÃO: Log de debug para diagnóstico
        console.log("🎯 [handleDragEnd] Iniciando processamento:", {
            activeId: activeIdStr,
            overId: overIdStr,
            viewOption,
            viewMode,
            groupedDataKeys: Object.keys(groupedData),
            kanbanColumnsIds: viewMode === "kanban" ? kanbanColumns.map(c => c.id) : []
        });

        const findGroupKeyForId = (id: string): string | null => {
            // ✅ CORREÇÃO: Verificar se o ID é uma chave de grupo diretamente
            if (Object.keys(groupedData).includes(id)) return id;
            
            // ✅ CORREÇÃO: Buscar em todas as tarefas agrupadas
            const entry = Object.entries(groupedData).find(([_, tasks]) =>
                tasks.some((t) => String(t.id) === id)
            );
            return entry ? entry[0] : null;
        };

        const sourceGroupKey = findGroupKeyForId(activeIdStr);
        let destinationGroupKey = findGroupKeyForId(overIdStr);
        
        // ✅ CORREÇÃO: Validação melhorada com logs
        if (!sourceGroupKey) {
            console.error("❌ [handleDragEnd] Grupo de origem não encontrado para tarefa:", activeIdStr);
            toast.error("Erro: Tarefa de origem não encontrada. Recarregue a página.");
            return;
        }
        
        // ✅ CORREÇÃO: Se overIdStr é uma coluna (não uma tarefa), usar diretamente
        // No modo kanban, o over.id pode ser o ID da coluna (DroppableColumn)
        if (!destinationGroupKey) {
            // Verificar se é uma coluna do kanban
            if (viewMode === "kanban") {
                const kanbanColumn = kanbanColumns.find(col => col.id === overIdStr);
                if (kanbanColumn) {
                    destinationGroupKey = kanbanColumn.id;
                    console.log("ℹ️ [handleDragEnd] Detectado ID de coluna kanban como destino:", destinationGroupKey);
                } else if (Object.keys(groupedData).includes(overIdStr)) {
                    destinationGroupKey = overIdStr;
                    console.log("ℹ️ [handleDragEnd] Usando ID de coluna como destino:", destinationGroupKey);
                }
            } else if (Object.keys(groupedData).includes(overIdStr)) {
                destinationGroupKey = overIdStr;
                console.log("ℹ️ [handleDragEnd] Usando ID de coluna como destino:", destinationGroupKey);
            }
        }
        
        if (!destinationGroupKey) {
            console.error("❌ [handleDragEnd] Grupo de destino não encontrado para ID:", overIdStr);
            console.error("❌ [handleDragEnd] Debug info:", {
                overIdStr,
                groupedDataKeys: Object.keys(groupedData),
                kanbanColumnsIds: viewMode === "kanban" ? kanbanColumns.map(c => c.id) : [],
                viewMode
            });
            toast.error("Erro: Destino inválido. Tente arrastar para uma coluna válida.");
            return;
        }

        const destinationTasks = groupedData[destinationGroupKey] || [];
        
        // ✅ CORREÇÃO: Se overIdStr é o ID de uma coluna (não uma tarefa), adicionar no final
        // Se overIdStr é uma chave de groupedData, significa que arrastou para a coluna vazia
        const isOverColumn = Object.keys(groupedData).includes(overIdStr);
        let overIndex = -1;
        
        if (isOverColumn) {
            // Arrastou para a coluna vazia, adicionar no final
            overIndex = -1;
            console.log("ℹ️ [handleDragEnd] Arrastou para coluna vazia, adicionando no final");
        } else {
            // Arrastou sobre uma tarefa, encontrar o índice
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
            // Type narrowing: após a guard clause, viewOption só pode ser "status", "priority" ou "group"
            if (viewOption === "status" || viewOption === "priority" || viewOption === "group") {
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
        const prevLocal = localTasksRef.current;
        
        // ✅ Calcular posição ANTES de atualizar o estado (para usar fora do setState)
        const current = [...localTasksRef.current];
        const movingIndex = current.findIndex((t) => String(t.id) === activeIdStr);
        if (movingIndex === -1) return;

        const moving = { ...current[movingIndex] };
        const currentWithoutMoving = [...current];
        currentWithoutMoving.splice(movingIndex, 1);

        // aplicar alterações de grupo/status/priority se mudou de grupo
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

        // ✅ MIDPOINT CALCULATION: Calcular posição apenas para o item movido
        // Identificar vizinhos na nova posição
        const prevTask = newDest[insertIndex - 1];
        const nextTask = newDest[insertIndex + 1];

        // Calcular nova posição usando média entre vizinhos
        const MIN_DELTA = 0.00001; // Precisão mínima antes de forçar re-index
        let calculatedPosition: number;

        if (!prevTask && !nextTask) {
            // Lista estava vazia ou é o único item
            calculatedPosition = 1000;
        } else if (!prevTask) {
            // Moveu para o TOPO (antes do primeiro)
            const nextPos = nextTask.position ?? 0;
            calculatedPosition = nextPos > 0 ? nextPos / 2 : 500;
            // Garantir que não seja zero ou negativo
            if (calculatedPosition <= 0) calculatedPosition = 500;
        } else if (!nextTask) {
            // Moveu para o FINAL (depois do último)
            const prevPos = prevTask.position ?? 0;
            calculatedPosition = prevPos > 0 ? prevPos + 1000 : 2000;
            // Garantir que seja maior que a posição anterior
            if (calculatedPosition <= prevPos) calculatedPosition = prevPos + 1000;
        } else {
            // Moveu para o MEIO (entre A e B)
            const prevPos = prevTask.position ?? 0;
            const nextPos = nextTask.position ?? 0;
            
            // ✅ CORREÇÃO: Validar se há espaço suficiente entre prevPos e nextPos
            if (nextPos <= prevPos) {
                // Colisão detectada: usar posição baseada no índice
                calculatedPosition = prevPos + 500;
            } else {
                calculatedPosition = (prevPos + nextPos) / 2;
                // ✅ CORREÇÃO: Garantir que a posição calculada seja única
                if (calculatedPosition <= prevPos || calculatedPosition >= nextPos) {
                    // Se o cálculo resultou em colisão, usar posição intermediária segura
                    calculatedPosition = prevPos + (nextPos - prevPos) / 2;
                }
            }
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

        if (finalState.length) {
            localTasksRef.current = finalState;
        }

        // ✅ Obter posição calculada do item movido
        const movingFinal = finalState.find((t) => String(t.id) === activeIdStr);

        // ✅ Identificar vizinhos para validação de colisão
        const destListFinal = finalState.filter((t) => getTaskGroupKey(t) === destinationGroupKey);
        const movingIndexInDest = destListFinal.findIndex((t) => String(t.id) === activeIdStr);
        const prevTaskFinal = destListFinal[movingIndexInDest - 1];
        const nextTaskFinal = destListFinal[movingIndexInDest + 1];

        // ✅ Validação de Colisão (Se o espaço ficou pequeno demais)
        const gap = nextTaskFinal && prevTaskFinal ? (nextTaskFinal.position || 0) - (prevTaskFinal.position || 0) : 1000;
        const needsRebalance = gap < MIN_DELTA;

        console.log("🎯 [handleDragEnd] Dados do movimento:", {
            activeId: activeIdStr,
            targetIndex,
            destinationTasksLength: destinationTasks.length,
            calculatedPosition,
            prevTaskPosition: prevTaskFinal?.position,
            nextTaskPosition: nextTaskFinal?.position,
            gap,
            needsRebalance,
            isSameGroup,
            sourceGroupKey,
            destinationGroupKey
        });

        try {
            if (needsRebalance) {
                // ✅ CASO RARO: O espaço acabou. Precisamos re-indexar tudo (Bulk Update).
                console.log("⚠️ Espaço esgotado. Re-indexando lista do grupo de destino...");
                
                const rebalancedUpdates = destListFinal.map((t, i) => ({
                    id: String(t.id),
                    position: (i + 1) * 1000
                }));

                // Atualizar estado local com posições rebalanceadas
                setLocalTasks((prev) => {
                    return prev.map((t) => {
                        const rebalanced = rebalancedUpdates.find(u => u.id === String(t.id));
                        if (rebalanced) {
                            return { ...t, position: rebalanced.position };
                        }
                        return t;
                    });
                });

                // ✅ CORREÇÃO: Adicionar tratamento de erro mais robusto para server actions
                let resBulk;
                try {
                    resBulk = await updateTaskPositionsBulk(rebalancedUpdates);
                } catch (error: any) {
                    console.error("❌ [handleDragEnd] Erro ao chamar updateTaskPositionsBulk:", error);
                    toast.error("Erro ao sincronizar a nova ordem. Tente novamente.");
                    await reloadTasks();
                    return;
                }
                
                if (!resBulk?.success) {
                    console.error("❌ Erro fatal no Rebalanceamento:", resBulk?.error);
                    toast.error("Erro ao sincronizar a nova ordem. Tente novamente.");
                    await reloadTasks();
                } else {
                    console.log(`✅ Rebalanceamento concluído! ${rebalancedUpdates.length} tarefas atualizadas.`);
                }
            } else {
                // ✅ CASO PADRÃO (99% das vezes): Salva APENAS o item movido.
                console.log(`🎯 Posição Calculada: ${calculatedPosition} (Entre ${prevTask?.position || 'início'} e ${nextTask?.position || 'fim'})`);
                
                // ✅ CORREÇÃO CRÍTICA: Sempre enviar group_id quando viewOption === "group" para garantir RLS
                // Mesmo dentro do mesmo grupo, precisamos do group_id para validação de permissões
                // Preparar group_id: se viewOption é "group", sempre enviar (mesmo se mesmo grupo)
                const finalGroupId = viewOption === "group" 
                    ? (destinationGroupKey === "inbox" || destinationGroupKey === "Inbox" 
                        ? null 
                        : destinationGroupKey)
                    : (isSameGroup ? undefined : updateData.group_id);
                
                // Atualizar item arrastado (inclui status/priority/group quando muda de grupo)
                console.log("📤 [handleDragEnd] Enviando update para tarefa ativa:", {
                    taskId: activeIdStr,
                    calculatedPosition,
                    status: isSameGroup ? undefined : updateData.status,
                    priority: isSameGroup ? undefined : updateData.priority,
                    group_id: finalGroupId,
                    viewOption,
                    isSameGroup,
                    destinationGroupKey,
                    sourceGroupKey
                });
                
                // ✅ CORREÇÃO: Adicionar tratamento de erro mais robusto para server actions
                let resMain;
                try {
                    resMain = await updateTaskPosition({
                        taskId: activeIdStr,
                        newPosition: calculatedPosition,
                        status: isSameGroup ? undefined : updateData.status,
                        priority: isSameGroup ? undefined : updateData.priority,
                        group_id: finalGroupId,
                        assignee_id: isSameGroup ? undefined : updateData.assignee_id,
                        workspace_id: movingFinal?.workspaceId ?? null,
                    });
                } catch (error: any) {
                    console.error("❌ [handleDragEnd] Erro ao chamar updateTaskPosition:", error);
                    toast.error("Erro ao salvar a nova ordem. Tente novamente.");
                    await reloadTasks();
                    return;
                }
                
                if (!resMain?.success) {
                    console.error("❌ [handleDragEnd] Falha ao salvar posição (item ativo):", resMain?.error);
                    toast.error("Erro ao salvar a nova ordem. Tente novamente.");
                    await reloadTasks();
                } else {
                    console.log("✅ [handleDragEnd] Tarefa ativa salva com sucesso:", {
                        taskId: activeIdStr,
                        calculatedPosition
                    });
                }
            }
        } catch (error) {
            console.error("Erro ao atualizar posição:", error);
            await reloadTasks();
        }
    };

    const handleDragCancel = () => {
        setActiveTask(null);
    };

    const handleTaskClick = async (taskId: string | number) => {
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
            });
        } catch (error) {
            console.error("Erro ao carregar detalhes da tarefa:", error);
        } finally {
            setIsLoadingTaskDetails(false);
        }
    };

    // ✅ Variável para controlar se drag está habilitado
    const isDragDisabled = viewOption !== 'status' && viewOption !== 'priority' && viewOption !== 'group';

    return (
        <div className="min-h-screen bg-gray-50/50 pb-20" suppressHydrationWarning>
            {/* HEADER AREA - LINE 1 */}
            <div className="bg-white border-b px-6 py-5 sticky top-0 z-10">
                <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Tarefas</h1>
                        <p className="text-sm text-gray-500">Gerencie o trabalho do dia a dia.</p>
                        </div>

                    <div className="flex items-center gap-3">
                        {/* Nova Tarefa - Dropdown Menu */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button className="bg-green-600 hover:bg-green-700 text-white">
                                    <Plus className="w-4 h-4 mr-2" />
                                    Novo
                                    <ChevronDown className="w-3 h-3 ml-2" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem
                                    onClick={() => {
                                        setSelectedTaskId(null);
                                        setTaskDetails(null);
                                        setIsModalOpen(true);
                                    }}
                                >
                                    <CheckSquare className="w-4 h-4 mr-2" />
                                    Nova Tarefa
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() => {
                                        if (activeTab === "minhas") {
                                            toast.error("Crie grupos dentro de um Workspace (aba 'Time' ou 'Todas').");
                                            return;
                                        }
                                        setIsCreateGroupModalOpen(true);
                                    }}
                                >
                                    <FolderPlus className="w-4 h-4 mr-2" />
                                    Novo Grupo
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </div>

            <div className="max-w-[1600px] mx-auto px-6 py-8 space-y-6">
                {/* NAVIGATION & FILTERS - LINE 2 */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    {/* Lado Esquerdo: Tabs de Contexto */}
                    <Tabs
                        value={activeTab}
                        onValueChange={(value) => setActiveTab(value as ContextTab)}
                        className="w-auto"
                    >
                        <TabsList className="bg-white border">
                            <TabsTrigger value="minhas">Minhas</TabsTrigger>
                            <TabsTrigger value="time">Time</TabsTrigger>
                            <TabsTrigger value="todas">Todas</TabsTrigger>
                        </TabsList>
                    </Tabs>

                    {/* Lado Direito: Ferramentas */}
                    <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
                        {/* Busca */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                            <Input
                                placeholder="Buscar tarefas..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 w-[240px] h-9 bg-white rounded-lg border-gray-200 shadow-sm"
                            />
                        </div>

                        {/* Ordenar Por */}
                        <SortMenu onPersistSortOrder={handlePersistSortOrder} />

                        {/* Agrupar por */}
                        <GroupingMenu />

                        <div className="hidden md:block w-px h-6 bg-gray-200 mx-1" />

                        {/* View Switcher */}
                        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg h-9">
                            <button
                                onClick={() => setViewMode("list")}
                                className={cn(
                                    "p-1.5 rounded-md transition-all",
                                    viewMode === "list"
                                        ? "bg-white text-gray-900 shadow-sm"
                                        : "text-gray-500 hover:text-gray-900"
                                )}
                                title="Lista"
                            >
                                <List className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setViewMode("kanban")}
                                className={cn(
                                    "p-1.5 rounded-md transition-all",
                                    viewMode === "kanban"
                                        ? "bg-white text-gray-900 shadow-sm"
                                        : "text-gray-500 hover:text-gray-900"
                                )}
                                title="Kanban"
                            >
                                <LayoutGrid className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* ConteÃºdo Principal */}
                <div className="relative h-full w-full">
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

                    <AnimatePresence mode="wait">
                        {viewMode === "list" ? (
                            <div className="h-full">
                                <DndContext
                                    sensors={sensors}
                                    collisionDetection={closestCenter}
                                    onDragStart={handleDragStart}
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
                                            {listGroups.map((group) => (
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
                                                    showGroupActions={viewOption === "group"}
                                                    onAddTask={viewOption === "group" ? handleAddTaskToGroup : undefined}
                                                />
                                            ))}
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
                                        {listGroups.map((group) => (
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
                                                showGroupActions={viewOption === "group"}
                                                onAddTask={viewOption === "group" ? handleAddTaskToGroup : undefined}
                                            />
                                        ))}
                                    </div>
                                )}
                    <DragOverlay>
                        {activeTask ? (
                            <div className="bg-white rounded-lg border border-gray-200 shadow-lg p-3 rotate-2 opacity-90">
                                <div className="font-medium text-gray-900 text-sm">{activeTask.title}</div>
                            </div>
                        ) : null}
                    </DragOverlay>
                                </DndContext>
                            </div>
                        ) : (
                            <div className="h-full" key={`kanban-${effectiveWorkspaceId}-${viewOption}`}>
                                {/* ✅ CORREÇÃO CRÍTICA: TaskBoard precisa estar dentro de DndContext para drag funcionar */}
                                <DndContext
                                    sensors={sensors}
                                    collisionDetection={closestCenter}
                                    onDragStart={handleDragStart}
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
                                    members={workspaceMembers}
                                    groupBy={viewOption}
                                />
                                    <DragOverlay>
                                        {activeTask ? (
                                            <div className="bg-white rounded-lg border border-gray-200 shadow-lg p-3 rotate-2 opacity-90">
                                                <div className="font-medium text-gray-900 text-sm">{activeTask.title}</div>
                                            </div>
                                        ) : null}
                                    </DragOverlay>
                                </DndContext>
                            </div>
                        )}
                    </AnimatePresence>
                </div>

            {/* Modal de Detalhes */}
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
                onTaskCreated={reloadTasks}
                onTaskUpdated={handleTaskUpdated}
            />

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
                                    { name: "Ãndigo", value: "#6366f1", class: "bg-indigo-500" },
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
    );
}



