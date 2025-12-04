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
import { Search, Filter, Plus, List, LayoutGrid, ChevronDown, CheckSquare, FolderPlus, CircleDashed, Archive, ArrowUpDown, Loader2 } from "lucide-react";
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
    getWorkspaceMembers,
    type Task as TaskFromDB 
} from "@/lib/actions/tasks";
import { updateTaskGroup, deleteTaskGroup, createTaskGroup, getTaskGroups } from "@/lib/actions/task-groups";
import { getTaskDetails } from "@/lib/actions/task-details";
import { mapStatusToLabel, mapLabelToStatus, STATUS_TO_LABEL, ORDERED_STATUSES } from "@/lib/config/tasks";
import { useRouter } from "next/navigation";
import { getUserWorkspaces } from "@/lib/actions/user";
import { useWorkspace } from "@/components/providers/SidebarProvider";
import { useTasks, invalidateTasksCache } from "@/hooks/use-tasks";

type ContextTab = "minhas" | "time" | "todas";
type ViewMode = "list" | "kanban";
type GroupBy = "status" | "priority" | "assignee";

import { ViewOptions, ViewOption } from "@/components/tasks/ViewOptions";

interface Task {
    id: string;
    title: string;
    completed: boolean;
    priority?: "low" | "medium" | "high" | "urgent";
    status: string;
    assignees?: Array<{ name: string; avatar?: string; id?: string }>;
    assigneeId?: string | null; // ID do responsável atual
    dueDate?: string;
    tags?: string[];
    hasUpdates?: boolean;
    workspaceId?: string | null;
    group?: { id: string; name: string; color?: string }; // compatível com TaskBoard
    hasComments?: boolean;
    commentCount?: number;
}

export default function TasksPage() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<ContextTab>("todas");
    const [viewMode, setViewMode] = useState<ViewMode>("list");
    const [viewOption, setViewOption] = useState<ViewOption>("group");
    const [sortBy, setSortBy] = useState<"status" | "priority" | "assignee">("status");
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

    // Usar hook customizado para gerenciar tarefas
    const { tasks: tasksFromHook, isLoading: isLoadingTasks, error: tasksError, refetch: refetchTasks } = useTasks({
        workspaceId: activeWorkspaceId,
        tab: activeTab,
        enabled: isLoaded,
    });
    
    // Manter estado local para atualizações otimistas
    const [localTasks, setLocalTasks] = useState<Task[]>([]);
    
    // ✅ CORREÇÃO: Comparação profunda baseada em IDs para evitar loops infinitos
    // Compara apenas os IDs das tarefas, não as referências dos arrays
    const prevTaskIdsRef = useRef<string>('');
    useEffect(() => {
        // Criar string de IDs ordenados para comparação estável
        const currentTaskIds = tasksFromHook
            .map(t => t.id)
            .sort()
            .join(',');
        
        // Só atualizar se os IDs realmente mudaram (evita re-renders desnecessários)
        if (prevTaskIdsRef.current !== currentTaskIds) {
            prevTaskIdsRef.current = currentTaskIds;
            setLocalTasks(tasksFromHook);
        }
    }, [tasksFromHook]);

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

    // Função para mapear dados do banco para interface local (mantida para compatibilidade com outras partes do código)
    const mapTaskFromDB = (task: TaskFromDB): Task => {
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
            // Contar comentários
            hasComments: ((task as any).comment_count || 0) > 0,
            commentCount: (task as any).comment_count || 0,
        };
    };

    // Handler para criar grupo
    const handleCreateGroup = async () => {
        if (!newGroupName.trim()) {
            toast.error("Digite o nome do grupo");
            return;
        }
        
        setIsCreatingGroup(true);
        
        try {
            let targetWorkspaceId: string | null = activeWorkspaceId;
            
            // Se não encontrou (improvável com o novo Sidebar), buscar do primeiro workspace do usuário
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
                toast.error("Não foi possível identificar o workspace. Certifique-se de que você é membro de um workspace.");
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

    // Função para recarregar tarefas (com proteção contra loops)
    // Função para recarregar tarefas (usa o hook)
    const reloadTasks = useCallback(async () => {
        // Invalidar cache e refetch
        invalidateTasksCache(activeWorkspaceId, activeTab);
        await refetchTasks();
    }, [activeWorkspaceId, activeTab, refetchTasks]);

    // Callbacks memoizados para evitar re-renders infinitos
    const handleTaskUpdated = useCallback(() => {
        // Invalidar cache e recarregar tarefas após atualização
        invalidateTasksCache(activeWorkspaceId, activeTab);
        refetchTasks();
    }, [activeWorkspaceId, activeTab, refetchTasks]);

    const handleTaskDeleted = useCallback(() => {
        // Recarregar após deletar
        invalidateTasksCache(activeWorkspaceId, activeTab);
        refetchTasks();
    }, [activeWorkspaceId, activeTab, refetchTasks]);

    // Refs para acessar valores atuais sem causar re-renders
    const viewOptionRef = useRef(viewOption);
    viewOptionRef.current = viewOption;
    const localTasksRef = useRef(localTasks);
    localTasksRef.current = localTasks;
    const groupColorsRef = useRef(groupColors);
    groupColorsRef.current = groupColors;
    const availableGroupsRef = useRef(availableGroups);
    availableGroupsRef.current = availableGroups;
    const refetchTasksRef = useRef(refetchTasks);
    refetchTasksRef.current = refetchTasks;

    // Callbacks memoizados para TaskGroup - usar refs para evitar dependências
    const handleRenameGroup = useCallback(async (groupId: string, newTitle: string) => {
        const currentViewOption = viewOptionRef.current;
        const currentLocalTasks = localTasksRef.current;
        const currentLoadGroups = loadGroups;

        if (currentViewOption !== "group") {
            toast.error("Não é possível editar o nome de grupos automáticos.");
            return;
        }
        
        if (groupId === "inbox" || groupId === "Inbox") {
            toast.error("O grupo padrão Inbox não pode ser renomeado.");
            return;
        }

        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(groupId)) {
            toast.error("ID de grupo inválido");
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
                invalidateTasksCache(activeWorkspaceId, activeTab);
                refetchTasksRef.current();
            } else {
                setLocalTasks(oldTasks);
                toast.error(result.error || "Erro ao renomear grupo");
            }
        } catch (error) {
            setLocalTasks(oldTasks);
            toast.error("Erro ao renomear grupo");
        }
    }, [activeWorkspaceId, activeTab]);

    const handleColorChange = useCallback(async (groupId: string, color: string) => {
        const currentViewOption = viewOptionRef.current;
        const currentLocalTasks = localTasksRef.current;
        const currentGroupColors = groupColorsRef.current;
        const currentLoadGroups = loadGroups;

        if (currentViewOption !== "group") return;
        if (groupId === "inbox" || groupId === "Inbox") return;

        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(groupId)) {
            toast.error("ID de grupo inválido");
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
                invalidateTasksCache(activeWorkspaceId, activeTab);
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
    }, [activeWorkspaceId, activeTab]);

    const handleDeleteGroup = useCallback(async (groupId: string) => {
        const currentViewOption = viewOptionRef.current;
        const currentLoadGroups = loadGroups;

        if (currentViewOption !== "group") return;
        if (groupId === "inbox" || groupId === "Inbox") {
            toast.error("O grupo Inbox não pode ser deletado.");
            return;
        }

        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(groupId)) {
            toast.error("ID de grupo inválido");
            return;
        }

        try {
            const result = await deleteTaskGroup(groupId);
            if (result.success) {
                toast.success("Grupo deletado com sucesso");
                if (currentLoadGroups) await currentLoadGroups();
                invalidateTasksCache(activeWorkspaceId, activeTab);
                refetchTasksRef.current();
            } else {
                toast.error(result.error || "Erro ao deletar grupo");
            }
        } catch (error) {
            toast.error("Erro ao deletar grupo");
        }
    }, [activeWorkspaceId, activeTab]);

    // Ref para groupedData (será atualizado após groupedData ser definido)
    const groupedDataRef = useRef<Record<string, Task[]>>({});

    const handleClearGroup = useCallback(async (groupId: string) => {
        const currentViewOption = viewOptionRef.current;
        const currentGroupedData = groupedDataRef.current; // Usar ref (atualizado após groupedData)
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
    }, [activeWorkspaceId, activeTab]);

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

    // Limpar cores de grupos que não existem mais quando viewOption muda
    useEffect(() => {
        // Comentado por enquanto - manter comportamento atual
    }, [viewOption]); // eslint-disable-line react-hooks/exhaustive-deps

    // Função para carregar grupos
    const loadGroups = useCallback(async () => {
        try {
            const targetWorkspaceId: string | null = activeWorkspaceId;

            const result = await getTaskGroups(targetWorkspaceId);
            if (result.success && result.data) {
                const groupsData = result.data;
                setAvailableGroups(groupsData);
                
                // Inicializar ordem dos grupos se não existir
                setGroupOrder((currentOrder) => {
                    if (viewOption === "group" && currentOrder.length === 0) {
                        const savedOrder = localStorage.getItem("taskGroupOrder");
                        if (savedOrder) {
                            try {
                                const parsed = JSON.parse(savedOrder);
                                return parsed;
                            } catch (e) {
                                console.error("Erro ao carregar ordem dos grupos:", e);
                                return ["inbox", ...groupsData.map((g: any) => g.id)];
                            }
                        } else {
                            return ["inbox", ...groupsData.map((g: any) => g.id)];
                        }
                    }
                    return currentOrder;
                });
            } else {
                setAvailableGroups([]);
            }
        } catch (error) {
            console.error("Erro ao carregar grupos:", error);
            setAvailableGroups([]);
        }
    }, [activeWorkspaceId, viewOption]);

    // Carregar grupos quando workspace mudar (tarefas são gerenciadas pelo hook useTasks)
    useEffect(() => {
        if (!isLoaded) return;

        // Limpar grupos quando workspace/tab mudar
        setAvailableGroups([]);

        // Carregar grupos em background (não bloqueia a UI)
        loadGroups().catch((err) => {
            console.error("Erro ao carregar grupos:", err);
        });
    }, [activeWorkspaceId, activeTab, isLoaded, loadGroups]);

    // Buscar membros do workspace
    useEffect(() => {
        const loadMembers = async () => {
            if (!activeWorkspaceId) {
                setWorkspaceMembers([]);
                return;
            }

            try {
                const members = await getWorkspaceMembers(activeWorkspaceId);
                const mappedMembers = members.map((m: any) => ({
                    id: m.id || m.email || "",
                    name: m.full_name || m.email || "Usuário",
                    avatar: m.avatar_url || undefined,
                }));
                setWorkspaceMembers(mappedMembers);
            } catch (error) {
                console.error("Erro ao carregar membros:", error);
            }
        };
        loadMembers();
    }, [activeWorkspaceId]);

    // Função para alternar status de conclusão
    const handleToggleComplete = async (taskId: string, completed: boolean) => {
        // Atualização otimista no estado local
        setLocalTasks((prevTasks) =>
            prevTasks.map((task) =>
                task.id === taskId
                    ? { ...task, completed }
                    : task
            )
        );

        // Persistir no backend de forma assíncrona
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
            } else if (result.data) {
                // Atualizar com dados do servidor para garantir sincronização
                const updatedTask = mapTaskFromDB(result.data);
                setLocalTasks((prevTasks) =>
                    prevTasks.map((task) =>
                        task.id === taskId ? updatedTask : task
                    )
                );
            }
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

        // Mapeamento de prioridades para português
        const priorityLabels: Record<string, string> = {
            "urgent": "Urgente",
            "high": "Alta",
            "medium": "Média",
            "low": "Baixa",
        };

        // Se viewOption for "group", inicializar grupos vazios do banco
        if (viewOption === "group") {
            groups["inbox"] = [];
            
            availableGroups.forEach((group) => {
                groups[group.id] = [];
            });
        }

        filteredTasks.forEach((task) => {
            let groupKey = "Inbox";

            switch (viewOption) {
                case "group":
                    if (task.group && task.group.id) {
                        groupKey = task.group.id;
                    } else {
                        groupKey = "inbox";
                    }
                    
                    if (!groups[groupKey]) {
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

                        const taskDate = new Date(date);
                        taskDate.setHours(0,0,0,0);

                        if (taskDate < today && !task.completed) {
                            groupKey = "Atrasadas";
                        } else if (taskDate.getTime() === today.getTime()) {
                            groupKey = "Hoje";
                        } else if (taskDate.getTime() === tomorrow.getTime()) {
                            groupKey = "Amanhã";
                        } else if (taskDate > tomorrow && taskDate <= nextWeek) {
                            groupKey = "Próximos 7 dias";
                        } else {
                            groupKey = "Futuro";
                        }
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
    }, [viewOption, filteredTasks, availableGroups]);

    // Atualizar ref para groupedData
    groupedDataRef.current = groupedData;

    // Reordenar grupos quando viewOption === "group" baseado em groupOrder
    const orderedGroupedData = useMemo(() => {
        if (viewOption !== "group") {
            return groupedData;
        }
        
        const groups = { ...groupedData };
        const ordered: Record<string, Task[]> = {};
        
        if (groupOrder && groupOrder.length > 0) {
            groupOrder.forEach((groupId) => {
                if (groups[groupId]) {
                    ordered[groupId] = groups[groupId];
                    delete groups[groupId];
                }
            });
        }
        
        if (groups["inbox"]) {
            ordered["inbox"] = groups["inbox"];
            delete groups["inbox"];
        }
        
        Object.keys(groups).forEach((groupId) => {
            ordered[groupId] = groups[groupId];
        });
        
        return ordered;
    }, [groupedData, groupOrder, viewOption]);

    // Converter grupos para formato de colunas (Kanban)
    const kanbanColumns = useMemo(() => {
        const dataToUse = viewOption === "group" ? orderedGroupedData : groupedData;
        const columns = Object.entries(dataToUse).map(([key, tasks]) => {
            let title = key;
            let color: string | undefined;
            
            if (viewOption === "group") {
                if (key === "inbox") {
                    title = "Inbox";
                    color = "#64748b";
                } else {
                    const groupFromTask = tasks[0]?.group;
                    if (groupFromTask) {
                        title = groupFromTask.name || "Sem Nome";
                        color = groupFromTask.color || undefined;
                    } else {
                        const groupFromDB = availableGroups.find(g => g.id === key);
                        if (groupFromDB) {
                            title = groupFromDB.name || "Sem Nome";
                            color = groupFromDB.color || undefined;
                        } else {
                            title = "Sem Nome";
                        }
                    }
                    
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
            const priorityOrder = ["Urgente", "Alta", "Média", "Baixa"];
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
            const dateOrder = ["Atrasadas", "Hoje", "Amanhã", "Próximos 7 dias", "Futuro", "Sem data"];
            return columns.sort((a, b) => {
                const aIndex = dateOrder.indexOf(a.title);
                const bIndex = dateOrder.indexOf(b.title);
                if (aIndex === -1 && bIndex === -1) return 0;
                if (aIndex === -1) return 1;
                if (bIndex === -1) return -1;
                return aIndex - bIndex;
            });
        }

        return columns;
    }, [groupedData, viewOption]);

    // Converter grupos para formato de lista (TaskGroup) com ordenação
    const listGroups = useMemo(() => {
        const dataToUse = viewOption === "group" ? orderedGroupedData : groupedData;
        const groups = Object.entries(dataToUse).map(([key, tasks]) => {
            const sortedTasks = [...tasks].sort((a, b) => {
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
                return 0;
            });

            let title = key;
            let groupColor = undefined;
            
            if (viewOption === "group") {
                if (key === "inbox") {
                    title = "Inbox";
                } else {
                    const groupFromTask = tasks[0]?.group;
                    if (groupFromTask) {
                        title = groupFromTask.name || "Sem Nome";
                        groupColor = groupFromTask.color || undefined;
                    } else {
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
                groupColor,
            };
        });

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
            const priorityOrder = ["Urgente", "Alta", "Média", "Baixa"];
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
            const dateOrder = ["Atrasadas", "Hoje", "Amanhã", "Próximos 7 dias", "Futuro", "Sem data"];
            return groups.sort((a, b) => {
                const aIndex = dateOrder.indexOf(a.title);
                const bIndex = dateOrder.indexOf(b.title);
                if (aIndex === -1 && bIndex === -1) return 0;
                if (aIndex === -1) return 1;
                if (bIndex === -1) return -1;
                return aIndex - bIndex;
            });
        }

        return groups;
    }, [groupedData, orderedGroupedData, viewOption, sortBy, groupColors, availableGroups.length]);

    // Mapear status customizáveis para status do banco (usando config centralizado)
    const mapStatusToDb = (status: string): "todo" | "in_progress" | "done" | "archived" => {
        return mapLabelToStatus(status) as "todo" | "in_progress" | "done" | "archived";
    };

    // Mapear prioridade do banco para label em português
    const getPriorityLabel = (priority: string | undefined): string => {
        const priorityLabels: Record<string, string> = {
            "urgent": "Urgente",
            "high": "Alta",
            "medium": "Média",
            "low": "Baixa",
        };
        return priorityLabels[priority || "medium"] || priority || "Média";
    };

    // Função auxiliar para obter groupKey de uma tarefa (usada no Drag & Drop)
    const getTaskGroupKey = (task: Task): string => {
        switch (viewOption) {
            case "group":
                return task.group?.id || "inbox";
            case "status":
                return task.status || "Sem Status";
            case "priority":
                return getPriorityLabel(task.priority);
            case "date":
                if (!task.dueDate) return "Sem data";
                return "Inbox"; // Simplificado
            default:
                return "Inbox";
        }
    };

    // Handler para quando o drag começa
    const handleDragStart = (event: DragStartEvent) => {
        const { active } = event;
        const task = localTasks.find((t) => t.id === active.id);
        setActiveTask(task || null);
    };

    // Handler para quando o drag termina
    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveTask(null);

        if (!over) {
            return;
        }

        // Verificar se está arrastando um grupo (quando viewOption === "group")
        if (viewOption === "group" && groupOrder.includes(active.id as string)) {
            const oldIndex = groupOrder.indexOf(active.id as string);
            
            let targetGroupId: string | undefined;
            
            if (groupOrder.includes(over.id as string)) {
                targetGroupId = over.id as string;
            } else {
                const targetGroup = Object.entries(groupedData).find(([_, tasks]) =>
                    tasks.some((t) => t.id === over.id)
                );
                targetGroupId = targetGroup?.[0];
            }
            
            if (!targetGroupId) {
                return;
            }
            
            const newIndex = groupOrder.indexOf(targetGroupId);
            
            if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
                const newOrder = arrayMove(groupOrder, oldIndex, newIndex);
                setGroupOrder(newOrder);
                localStorage.setItem("taskGroupOrder", JSON.stringify(newOrder));
            }
            return;
        }

        // Encontrar grupo de origem
        const sourceGroup = Object.entries(groupedData).find(([_, tasks]) =>
            tasks.some((task) => task.id === active.id)
        );

        if (!sourceGroup) {
            return;
        }

        const [sourceGroupKey, sourceTasks] = sourceGroup;
        const sourceTaskIndex = sourceTasks.findIndex((task) => task.id === active.id);
        const task = sourceTasks[sourceTaskIndex];

        if (sourceTaskIndex === -1 || !task) {
            return;
        }

        // Verificar se está arrastando para um grupo (drop zone) ou para uma tarefa
        let destinationGroupKey: string | undefined;

        const isGroupId = Object.keys(groupedData).includes(over.id as string);
        if (isGroupId) {
            destinationGroupKey = over.id as string;
        } else {
            destinationGroupKey = Object.entries(groupedData).find(([_, tasks]) =>
                tasks.some((t) => t.id === over.id)
            )?.[0];
        }

        if (!destinationGroupKey) {
            return;
        }

        // Se está no mesmo grupo, apenas reordenar
        if (sourceGroupKey === destinationGroupKey) {
            const destinationTasks = groupedData[destinationGroupKey];
            const overTaskIndex = destinationTasks.findIndex((t) => t.id === over.id);
            const newIndex = overTaskIndex === -1 ? destinationTasks.length - 1 : overTaskIndex;

            if (sourceTaskIndex === newIndex) {
                return;
            }

            const newTasks = [...localTasks];
            const tasksInGroup = newTasks.filter((t) => {
                return getTaskGroupKey(t) === destinationGroupKey;
            });

            const groupTaskIds = tasksInGroup.map((t) => t.id);
            const oldGroupIndex = groupTaskIds.indexOf(active.id as string);
            const newGroupIndex = overTaskIndex === -1 ? groupTaskIds.length - 1 : groupTaskIds.indexOf(over.id as string);

            if (oldGroupIndex === -1 || newGroupIndex === -1) {
                return;
            }

            const reorderedGroupTasks = arrayMove(tasksInGroup, oldGroupIndex, newGroupIndex);
            
            let groupStartIndex = 0;
            for (let i = 0; i < newTasks.length; i++) {
                let groupKey: string;
                switch (viewOption) {
                    case "status":
                        groupKey = newTasks[i].status || "Sem Status";
                        break;
                    case "priority":
                        const priorityLabels: Record<string, string> = {
                            "urgent": "Urgente",
                            "high": "Alta",
                            "medium": "Média",
                            "low": "Baixa",
                        };
                        const priority = newTasks[i].priority || "medium";
                        groupKey = priorityLabels[priority] || priority;
                        break;
                    case "group":
                        groupKey = newTasks[i].group?.name || "Inbox";
                        break;
                    case "date":
                        if (!newTasks[i].dueDate) {
                            groupKey = "Sem data";
                        } else {
                            const date = new Date(newTasks[i].dueDate!);
                            const today = new Date();
                            today.setHours(0,0,0,0);
                            if (date < today && !newTasks[i].completed) groupKey = "Atrasadas";
                            else groupKey = "Futuro";
                        }
                        break;
                    default:
                        groupKey = newTasks[i].status || "Sem Status";
                }
                if (groupKey === destinationGroupKey) {
                    groupStartIndex = i;
                    break;
                }
            }

            const tasksOutsideGroup = newTasks.filter((t) => {
                return getTaskGroupKey(t) !== destinationGroupKey;
            });

            const finalTasks = [
                ...tasksOutsideGroup.slice(0, groupStartIndex),
                ...reorderedGroupTasks,
                ...tasksOutsideGroup.slice(groupStartIndex),
            ];

            setLocalTasks(finalTasks);

            try {
                const { updateTaskPosition } = await import("@/lib/actions/tasks");
                const result = await updateTaskPosition({
                    taskId: active.id as string,
                    newPosition: newIndex + 1,
                });

                if (!result.success) {
                    await reloadTasks();
                    throw new Error(result.error || "Erro ao atualizar posição");
                }
            } catch (error) {
                console.error("Erro ao atualizar posição:", error);
                await reloadTasks();
            }
        } else {
            const newTasks = [...localTasks];
            const taskToUpdate = newTasks.find((t) => t.id === active.id);
            const previousTasksState = [...localTasks];

            if (!taskToUpdate) {
                return;
            }

            let updateData: { 
                status?: "todo" | "in_progress" | "done" | "archived";
                priority?: "low" | "medium" | "high" | "urgent";
                assignee_id?: string | null;
                group_id?: string | null;
            } = {};

            switch (viewOption) {
                case "status":
                    updateData.status = mapStatusToDb(destinationGroupKey);
                    break;
                case "priority":
                    const priorityMapReverse: Record<string, "low" | "medium" | "high" | "urgent"> = {
                        "urgente": "urgent",
                        "alta": "high",
                        "média": "medium",
                        "baixa": "low",
                    };
                    const priority = priorityMapReverse[destinationGroupKey.toLowerCase()];
                    if (priority) {
                        updateData.priority = priority;
                    }
                    break;
                case "group":
                    if (destinationGroupKey === "inbox") {
                        updateData.group_id = null;
                    } else {
                        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                        if (uuidRegex.test(destinationGroupKey)) {
                            updateData.group_id = destinationGroupKey;
                        }
                    }
                    break;
            }

            if (updateData.status) {
                const statusMapReverse: Record<string, string> = {
                    todo: "Não iniciada",
                    in_progress: "Em progresso",
                    review: "Revisão",
                    correction: "Correção",
                    done: "Finalizado",
                    archived: "Arquivado",
                };
                taskToUpdate.status = statusMapReverse[updateData.status] || taskToUpdate.status;
            }
            if (updateData.priority) {
                taskToUpdate.priority = updateData.priority;
            }

            setLocalTasks(newTasks);

            try {
                const { updateTaskPosition } = await import("@/lib/actions/tasks");
                const result = await updateTaskPosition({
                    taskId: active.id as string,
                    newPosition: 1,
                    status: updateData.status,
                    priority: updateData.priority,
                    assignee_id: updateData.assignee_id,
                    group_id: updateData.group_id,
                });

                if (result.success) {
                    if (viewOption === "group" && updateData.group_id !== undefined) {
                        await reloadTasks();
                    }
                } else {
                    setLocalTasks(previousTasksState);
                    throw new Error(result.error || "Erro ao atualizar tarefa");
                }
            } catch (error) {
                console.error("Erro ao atualizar posição e status:", error);
                setLocalTasks(previousTasksState);
                await reloadTasks();
            }
        }
    };

    // Handler para quando o drag é cancelado
    const handleDragCancel = () => {
        setActiveTask(null);
    };

    const handleTaskClick = async (taskId: string) => {
        setSelectedTaskId(taskId);
        setIsModalOpen(true);
        setIsLoadingTaskDetails(true);

        try {
            const taskDetails = await getTaskDetails(taskId);
            
            if (!taskDetails) {
                console.error("Tarefa não encontrada");
                setIsModalOpen(false);
                return;
            }

            const statusMap: Record<string, "todo" | "in_progress" | "done"> = {
                "todo": "todo",
                "in_progress": "in_progress",
                "done": "done",
                "archived": "done",
            };
            const modalStatus = statusMap[taskDetails.status] || "todo";

            let contextMessage: any = undefined;
            let tags: string[] = [];
            if (taskDetails.origin_context) {
                const context = taskDetails.origin_context as any;
                if (context.audio_url) {
                    contextMessage = {
                        type: "audio" as const,
                        content: context.message || "Mensagem de áudio",
                        timestamp: context.timestamp || taskDetails.created_at,
                    };
                } else if (context.message) {
                    contextMessage = {
                        type: "text" as const,
                        content: context.message,
                        timestamp: context.timestamp || taskDetails.created_at,
                    };
                }
                if (context.tags && Array.isArray(context.tags)) {
                    tags = context.tags;
                }
            }

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

            const mappedAttachments = taskDetails.attachments.map((att) => ({
                id: att.id,
                name: att.file_name,
                type: (att.file_type || "other") as "image" | "pdf" | "other",
                size: att.file_size ? `${(att.file_size / 1024 / 1024).toFixed(1)} MB` : "0 MB",
            }));

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
                subTasks: [],
                activities,
                attachments: mappedAttachments,
            });
        } catch (error) {
            console.error("Erro ao carregar detalhes da tarefa:", error);
        } finally {
            setIsLoadingTaskDetails(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50/50 pb-20">
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
                        <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
                            <SelectTrigger className="w-[140px] h-9 px-3 rounded-lg border-solid border-gray-200 bg-white hover:bg-gray-50 text-sm font-medium text-gray-700 shadow-sm transition-colors">
                                <div className="flex items-center gap-2">
                                    <ArrowUpDown className="w-4 h-4 text-gray-500" />
                                    <span>Ordenar</span>
                                </div>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="status">Status</SelectItem>
                                <SelectItem value="priority">Prioridade</SelectItem>
                                <SelectItem value="assignee">Responsável</SelectItem>
                            </SelectContent>
                        </Select>

                        {/* Agrupar por */}
                        <Select value={viewOption} onValueChange={(value) => setViewOption(value as ViewOption)}>
                            <SelectTrigger className={cn(
                                "w-[140px] h-9 px-3 rounded-lg border-solid text-sm font-medium shadow-sm transition-colors",
                                viewOption !== "group"
                                    ? "border-green-500 bg-green-50 text-green-700"
                                    : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                            )}>
                                <div className="flex items-center gap-2">
                                    <LayoutGrid className={cn("w-4 h-4", viewOption !== "group" ? "text-green-600" : "text-gray-500")} />
                                    <span>Agrupar</span>
                                </div>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="group">Personalizado</SelectItem>
                                <SelectItem value="status">Status</SelectItem>
                                <SelectItem value="priority">Prioridade</SelectItem>
                                <SelectItem value="date">Data</SelectItem>
                            </SelectContent>
                        </Select>

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

                {/* Conteúdo Principal */}
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
                            key={`${activeWorkspaceId}-${viewOption}-${group.id}`}
                                 id={group.id}
                            title={group.title}
                            tasks={group.tasks}
                                 groupColor={group.groupColor || groupColors[group.id]}
                            onTaskClick={handleTaskClick}
                                onRenameGroup={handleRenameGroup}
                                onColorChange={handleColorChange}
                                 onDeleteGroup={handleDeleteGroup}
                                 onClearGroup={handleClearGroup}
                                 onTaskUpdated={handleTaskUpdated}
                                 onTaskDeleted={handleTaskDeleted}
                                 onToggleComplete={async (taskId, completed) => {
                                     // Atualização otimista no estado local
                                     setLocalTasks((prevTasks) =>
                                         prevTasks.map((task) =>
                                             task.id === taskId
                                                 ? { ...task, completed }
                                                 : task
                                         )
                                     );

                                     // Persistir no backend de forma assíncrona
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
                                         } else if (result.data) {
                                             // Atualizar com dados do servidor para garantir sincronização
                                             const updatedTask = mapTaskFromDB(result.data);
                                             setLocalTasks((prevTasks) =>
                                                 prevTasks.map((task) =>
                                                     task.id === taskId ? updatedTask : task
                                                 )
                                             );
                                         }
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
                                     }
                                 }}
                                    onAddTask={async (title, context) => {
                                        try {
                                            // Mapear status customizável para status do banco
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
                                            
                                            const dbStatus = context.status 
                                                ? statusMap[context.status] || "todo"
                                                : undefined;

                                            // Se viewOption for "group", usar o ID do grupo atual
                                            const groupId = viewOption === "group" && group.id !== "inbox" && group.id !== "Inbox" 
                                                ? group.id 
                                                : undefined;

                                            const result = await createTask({
                                                title,
                                                status: dbStatus as any, // Inclui "review" e "correction"
                                                priority: context.priority as any,
                                                // Se estiver na aba "minhas", tarefa pessoal (sem workspace)
                                                // Caso contrário, associar ao workspace ativo
                                                workspace_id: activeTab === "minhas" ? null : (activeWorkspaceId || null),
                                                assignee_id: context.assigneeId,
                                                due_date: context.dueDate ? context.dueDate.toISOString() : undefined,
                                                group_id: groupId,
                                            });

                                        if (result.success && result.data) {
                                            // Recarregar tarefas do banco para garantir sincronização
                                            await reloadTasks();
                                        } else {
                                            console.error("Erro ao criar tarefa:", result.error);
                                            if (result.error === "Usuário não autenticado") {
                                                router.push("/login");
                                            }
                                        }
                                    } catch (error) {
                                        console.error("Erro ao criar tarefa:", error);
                                    }
                            }}
                            groupBy={viewOption}
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
                                                isGroupSortable={viewOption === "group"}
                                                onRenameGroup={handleRenameGroup}
                                                onColorChange={handleColorChange}
                                                onDeleteGroup={handleDeleteGroup}
                                 onClearGroup={handleClearGroup}
                                 onTaskUpdated={handleTaskUpdated}
                                 onTaskDeleted={handleTaskDeleted}
                                 onToggleComplete={async (taskId, completed) => {
                                     // Atualização otimista no estado local
                                     setLocalTasks((prevTasks) =>
                                         prevTasks.map((task) =>
                                             task.id === taskId
                                                 ? { ...task, completed }
                                                 : task
                                         )
                                     );

                                     // Persistir no backend de forma assíncrona
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
                                         } else if (result.data) {
                                             // Atualizar com dados do servidor para garantir sincronização
                                             const updatedTask = mapTaskFromDB(result.data);
                                             setLocalTasks((prevTasks) =>
                                                 prevTasks.map((task) =>
                                                     task.id === taskId ? updatedTask : task
                                                 )
                                             );
                                         }
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
                                     }
                                 }}
                                    onAddTask={async (title, context) => {
                                        try {
                                            // Mapear status customizável para status do banco
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
                                            
                                            const dbStatus = context.status 
                                                ? statusMap[context.status] || "todo"
                                                : undefined;

                                            // Se viewOption for "group", usar o ID do grupo atual
                                            const groupId = viewOption === "group" && group.id !== "inbox" && group.id !== "Inbox" 
                                                ? group.id 
                                                : undefined;

                                            const result = await createTask({
                                                title,
                                                status: dbStatus as any, // Inclui "review" e "correction"
                                                priority: context.priority as any,
                                                // Se estiver na aba "minhas", tarefa pessoal (sem workspace)
                                                // Caso contrário, associar ao workspace ativo
                                                workspace_id: activeTab === "minhas" ? null : (activeWorkspaceId || null),
                                                assignee_id: context.assigneeId,
                                                due_date: context.dueDate ? context.dueDate.toISOString() : undefined,
                                                group_id: groupId,
                                            });

                                        if (result.success && result.data) {
                                            // Recarregar tarefas do banco para garantir sincronização
                                            await reloadTasks();
                                        } else {
                                            console.error("Erro ao criar tarefa:", result.error);
                                            if (result.error === "Usuário não autenticado") {
                                                router.push("/login");
                                            }
                                        }
                                    } catch (error) {
                                        console.error("Erro ao criar tarefa:", error);
                                    }
                            }}
                            groupBy={viewOption}
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
                            <div className="h-full" key={`kanban-${activeWorkspaceId}-${viewOption}`}>
                                <TaskBoard
                                    columns={kanbanColumns}
                                    onTaskClick={handleTaskClick}
                                    onTaskMoved={reloadTasks}
                                    onToggleComplete={handleToggleComplete}
                                    onAddTask={async (columnId, title, dueDate, assigneeId) => {
                                        try {
                                            // Mapear status/priority baseado no viewOption e columnId
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

                                            let dbStatus: "todo" | "in_progress" | "review" | "correction" | "done" | undefined;
                                            let priority: "low" | "medium" | "high" | "urgent" | undefined;
                                            let groupId: string | null | undefined;

                                            if (viewOption === "status") {
                                                dbStatus = statusMap[columnId] || "todo";
                                            } else if (viewOption === "priority") {
                                                priority = columnId as "low" | "medium" | "high" | "urgent";
                                            } else if (viewOption === "group") {
                                                if (columnId === "inbox" || columnId === "Inbox") {
                                                    groupId = null;
                                                } else {
                                                    groupId = columnId;
                                                }
                                                dbStatus = "todo";
                                            }

                                            const result = await createTask({
                                                title,
                                                status: dbStatus as any, // Inclui "review" e "correction"
                                                priority: priority,
                                                assignee_id: assigneeId || undefined,
                                                due_date: dueDate ? dueDate.toISOString() : undefined,
                                                workspace_id: activeTab === "minhas" ? null : (activeWorkspaceId || null),
                                                group_id: groupId,
                                            });

                                            if (result.success && result.data) {
                                                await reloadTasks();
                                            } else {
                                                console.error("Erro ao criar tarefa:", result.error);
                                                if (result.error === "Usuário não autenticado") {
                                                    router.push("/login");
                                                }
                                            }
                                        } catch (error) {
                                            console.error("Erro ao criar tarefa:", error);
                                        }
                                    }}
                                    members={workspaceMembers}
                                    groupBy={viewOption}
                                />
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

            {/* Modal de Criação de Grupo */}
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
    );
}


