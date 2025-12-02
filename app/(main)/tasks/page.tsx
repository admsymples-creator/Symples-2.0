"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
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
    const [localTasks, setLocalTasks] = useState<Task[]>([]);
    const [activeTask, setActiveTask] = useState<Task | null>(null);
    const [isLoadingTasks, setIsLoadingTasks] = useState(false);
    const [taskDetails, setTaskDetails] = useState<any>(null);
    const [isLoadingTaskDetails, setIsLoadingTaskDetails] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [groupColors, setGroupColors] = useState<Record<string, string>>({});
    const [workspaceMembers, setWorkspaceMembers] = useState<Array<{ id: string; name: string; avatar?: string }>>([]);
    const [availableGroups, setAvailableGroups] = useState<Array<{ id: string; name: string; color: string | null }>>([]);
    const [groupOrder, setGroupOrder] = useState<string[]>([]); // Ordem dos grupos quando viewOption === "group"
    const { activeWorkspaceId, isLoaded } = useWorkspace();

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

    // Função para mapear dados do banco para interface local
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

    // Função para recarregar tarefas
    const reloadTasks = useCallback(async () => {
        setIsLoadingTasks(true);
        try {
            // Determinar filtros baseado na aba ativa
            let filters: { 
                workspaceId?: string | null;
                assigneeId?: string | null | "current";
                dueDateStart?: string;
                dueDateEnd?: string;
            } = {};

            // Aplicar filtro de workspace baseado na aba ativa
            // "Minhas": Tarefas atribuídas ao usuário (global, sem filtro de workspace)
            // "Time": Tarefas do workspace ativo da semana
            // "Todas": Tarefas do workspace ativo (incluindo inbox isolado por workspace)
            if (activeTab === "minhas") {
                // Minhas: Tudo que eu estou atribuído (sem filtro de workspace)
                filters.assigneeId = "current";
            } else {
                // Time e Todas: Filtrar por workspace ativo (inbox também é isolado por workspace)
                filters.workspaceId = activeWorkspaceId || null;
                
                if (activeTab === "time") {
                    // Time: Tarefas da semana (até o próximo domingo)
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const nextSunday = new Date(today);
                    const dayOfWeek = today.getDay();
                    const daysUntilSunday = dayOfWeek === 0 ? 7 : 7 - dayOfWeek;
                    nextSunday.setDate(today.getDate() + daysUntilSunday);
                    nextSunday.setHours(23, 59, 59, 999);
                    
                    filters.dueDateStart = today.toISOString();
                    filters.dueDateEnd = nextSunday.toISOString();
                }
            }

            const tasksFromDB = await getTasks(filters);
            // Filtrar tarefas arquivadas para não aparecerem na lista principal
            const activeTasks = tasksFromDB.filter(t => t.status !== "archived");
            const mappedTasks = activeTasks.map(mapTaskFromDB);
            setLocalTasks(mappedTasks);
        } catch (error) {
            console.error("Erro ao carregar tarefas:", error);
        } finally {
            setIsLoadingTasks(false);
        }
    }, [activeTab, activeWorkspaceId]);

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
        // Só faz sentido limpar se groupColors estiver sendo usado para viewOption
        // Por segurança, vamos manter o estado anterior se não for "group"
        // Mas se mudarmos para "status", os IDs mudam, então as cores antigas não servem
        // Melhor deixar o usuário redefinir cores se necessário ou manter cache
        
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

    // Função para carregar grupos
    const loadGroups = useCallback(async () => {
        try {
            // Usar workspace ativo do contexto
            let targetWorkspaceId: string | null = activeWorkspaceId;
            
            // Se não tiver workspace ativo, tentar buscar o primeiro (fallback)
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

            const result = await getTaskGroups(targetWorkspaceId);
            if (result.success && result.data) {
                setAvailableGroups(result.data);
                
                // Inicializar ordem dos grupos se não existir
                // Usar função de callback do setState para acessar o valor atual de groupOrder
                setGroupOrder((currentOrder) => {
                    if (viewOption === "group" && currentOrder.length === 0) {
                        const savedOrder = localStorage.getItem("taskGroupOrder");
                        if (savedOrder) {
                            try {
                                const parsed = JSON.parse(savedOrder);
                                return parsed;
                            } catch (e) {
                                console.error("Erro ao carregar ordem dos grupos:", e);
                                // Ordem padrão: inbox primeiro, depois grupos do banco
                                return ["inbox", ...result.data.map((g: any) => g.id)];
                            }
                        } else {
                            // Ordem padrão: inbox primeiro, depois grupos do banco
                            return ["inbox", ...result.data.map((g: any) => g.id)];
                        }
                    }
                    return currentOrder;
                });
            }
        } catch (error) {
            console.error("Erro ao carregar grupos:", error);
        }
    }, [activeWorkspaceId, viewOption]);

    // Buscar tarefas e grupos do banco (troca de workspace / aba)
    useEffect(() => {
        // Aguardar o carregamento do contexto do workspace para evitar "blink"
        // Se não estiver carregado, não fazemos nada, pois activeWorkspaceId pode estar incorreto (null inicial)
        if (!isLoaded) return;

        let cancelled = false;

        const loadWorkspaceData = async () => {
            try {
                // Carregar tarefas e grupos em paralelo
                await Promise.all([
                    reloadTasks(),
                    loadGroups(),
                ]);
            } catch (error) {
                if (!cancelled) {
                    console.error("Erro ao carregar dados do workspace:", error);
                }
            }
        };

        loadWorkspaceData();

        return () => {
            cancelled = true;
        };
    }, [activeTab, activeWorkspaceId, isLoaded, reloadTasks, loadGroups]);

    // Buscar membros do workspace
    useEffect(() => {
        const loadMembers = async () => {
            // Se não houver workspace ativo, limpar lista e não buscar
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

    // Filtrar tarefas por busca
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
            // Inicializar grupo "Inbox" (tarefas sem grupo)
            groups["inbox"] = [];
            
            // Inicializar grupos do banco (mesmo que vazios)
            availableGroups.forEach((group) => {
                groups[group.id] = [];
            });
        }

        filteredTasks.forEach((task) => {
            let groupKey = "Inbox";

            switch (viewOption) {
                case "group":
                    // Usar ID do grupo como chave para permitir edição
                    if (task.group && task.group.id) {
                        groupKey = task.group.id;
                    } else {
                        groupKey = "inbox";
                    }
                    
                    // Garantir que o grupo existe (caso não tenha sido inicializado ou seja um novo grupo)
                    if (!groups[groupKey]) {
                        // Se for um ID de grupo válido do banco que não estava em availableGroups
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

                        // Normalizar data da tarefa para comparação (sem hora)
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

    // Reordenar grupos quando viewOption === "group" baseado em groupOrder
    const orderedGroupedData = useMemo(() => {
        if (viewOption !== "group") {
            return groupedData;
        }
        
        const groups = { ...groupedData }; // Copia para manipular
        const ordered: Record<string, Task[]> = {};
        
        // 1. Adicionar grupos que estão em groupOrder e existem em groupedData
        if (groupOrder && groupOrder.length > 0) {
            groupOrder.forEach((groupId) => {
                if (groups[groupId]) {
                    ordered[groupId] = groups[groupId];
                    delete groups[groupId]; // Marcar como processado
                }
            });
        }
        
        // 2. Adicionar Inbox se existir e ainda não foi processado
        if (groups["inbox"]) {
            ordered["inbox"] = groups["inbox"];
            delete groups["inbox"];
        }
        
        // 3. Adicionar o restante (novos grupos ou sem ordem)
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
            
            // Recuperar título real se a chave for um ID (modo group)
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
                        // Se não há tarefas, buscar do availableGroups
                        const groupFromDB = availableGroups.find(g => g.id === key);
                        if (groupFromDB) {
                            title = groupFromDB.name || "Sem Nome";
                            color = groupFromDB.color || undefined;
                        } else {
                            title = "Sem Nome";
                        }
                    }
                    
                    // Fallback para cor do mapa de cores se disponível
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
            // Ordenar tarefas dentro do grupo
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
            
            // Recuperar título e cor real se a chave for um ID (modo group)
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
                        // Se não há tarefas, buscar do availableGroups
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
                // Passar a cor do grupo vindo do banco se disponível, senão usa o local/padrão
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
    }, [groupedData, orderedGroupedData, viewOption, sortBy, groupColors, availableGroups]);


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
                // Retornar ID do grupo para permitir comparação correta
                return task.group?.id || "inbox";
            case "status":
                return task.status || "Sem Status";
            case "priority":
                return getPriorityLabel(task.priority);
            case "date":
                if (!task.dueDate) return "Sem data";
                // ... lógica de data repetida ...
                return "Inbox"; // Simplificado para evitar complexidade excessiva aqui, idealmente refatorar lógica de data para função reutilizável
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
            // Reordenar grupos
            const oldIndex = groupOrder.indexOf(active.id as string);
            
            // Verificar se over.id é um grupo ou uma tarefa dentro de um grupo
            let targetGroupId: string | undefined;
            
            // Se over.id está em groupOrder, é um grupo
            if (groupOrder.includes(over.id as string)) {
                targetGroupId = over.id as string;
            } else {
                // É uma tarefa, encontrar o grupo que contém essa tarefa
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
                // Salvar no localStorage
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

        // Verificar se over.id é um ID de grupo
        const isGroupId = Object.keys(groupedData).includes(over.id as string);
        if (isGroupId) {
            destinationGroupKey = over.id as string;
        } else {
            // É uma tarefa, encontrar o grupo que contém essa tarefa
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

            // Optimistic update: usar arrayMove dentro do grupo
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
            
            // Substituir as tarefas do grupo na lista completa
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
                        // Lógica simplificada para encontrar o grupo de data
                         if (!newTasks[i].dueDate) {
                            groupKey = "Sem data";
                        } else {
                             // ... repetindo lógica de data simplificada para encontrar índice
                             // Idealmente refatorar para função helper getGroupKey(task, viewOption)
                             const date = new Date(newTasks[i].dueDate!);
                             const today = new Date();
                             today.setHours(0,0,0,0);
                             if (date < today && !newTasks[i].completed) groupKey = "Atrasadas";
                             else groupKey = "Futuro"; // Simplificação
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

            // Remover tarefas do grupo antigo
            const tasksOutsideGroup = newTasks.filter((t) => {
                return getTaskGroupKey(t) !== destinationGroupKey;
            });

            // Inserir tarefas reordenadas na posição correta
            const finalTasks = [
                ...tasksOutsideGroup.slice(0, groupStartIndex),
                ...reorderedGroupTasks,
                ...tasksOutsideGroup.slice(groupStartIndex),
            ];

            setLocalTasks(finalTasks);

            // Persistir no backend
            try {
                const { updateTaskPosition } = await import("@/lib/actions/tasks");
                const result = await updateTaskPosition({
                    taskId: active.id as string,
                    newPosition: newIndex + 1,
                });

                if (result.success) {
                    // Não recarregar todas as tarefas - a atualização otimista já foi feita
                    // A posição já está correta no estado local
                } else {
                    // Reverter em caso de erro
                    await reloadTasks();
                    throw new Error(result.error || "Erro ao atualizar posição");
                }
            } catch (error) {
                console.error("Erro ao atualizar posição:", error);
                // Reverter mudança otimista recarregando dados originais
                await reloadTasks();
            }
        } else {
            // Mudando de grupo - atualizar status/priority/assignee
            const newTasks = [...localTasks];
            const taskToUpdate = newTasks.find((t) => t.id === active.id);
            const previousTasksState = [...localTasks]; // Snapshot para rollback

            if (!taskToUpdate) {
                return;
            }


            // Determinar o que atualizar baseado no viewOption
            let updateData: { 
                status?: "todo" | "in_progress" | "done" | "archived";
                priority?: "low" | "medium" | "high" | "urgent";
                assignee_id?: string | null;
                group_id?: string | null;
            } = {};

            switch (viewOption) {
                case "status":
                    // Mapear status customizável para status do banco
                    updateData.status = mapStatusToDb(destinationGroupKey);
                    break;
                case "priority":
                    // Mapear nomes em português de volta para valores do banco
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
                    // Atualizar group_id quando move entre grupos customizados
                    if (destinationGroupKey === "inbox") {
                        updateData.group_id = null;
                    } else {
                        // Verificar se é um UUID válido (grupo do banco)
                        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                        if (uuidRegex.test(destinationGroupKey)) {
                            updateData.group_id = destinationGroupKey;
                        }
                    }
                    break;
            }

            // Atualizar tarefa localmente com os valores mapeados
            if (updateData.status) {
                // Mapear status do banco de volta para status customizável
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
            // Para assignee, precisaríamos buscar o ID do membro pelo nome
            // Por enquanto, apenas atualizamos a posição

            // O agrupamento será recalculado automaticamente pelo useMemo
            setLocalTasks(newTasks);

            // Persistir no backend
            try {
                // Usar updateTaskPosition para atualizar posição e outros campos quando muda de grupo
                const { updateTaskPosition } = await import("@/lib/actions/tasks");
                const result = await updateTaskPosition({
                    taskId: active.id as string,
                    newPosition: 1, // Nova posição no grupo de destino
                    status: updateData.status,
                    priority: updateData.priority,
                    assignee_id: updateData.assignee_id,
                    group_id: updateData.group_id,
                });

                if (result.success && result.data) {
                    // Atualizar tarefa específica com dados do servidor
                    const updatedTask = mapTaskFromDB(result.data);
                    setLocalTasks((prevTasks) =>
                        prevTasks.map((task) =>
                            task.id === active.id ? updatedTask : task
                        )
                    );
                    
                    // Se mudou de grupo, recarregar para garantir sincronização
                    if (viewOption === "group" && updateData.group_id !== undefined) {
                        await reloadTasks();
                    }
                } else {
                    // Reverter em caso de erro
                    setLocalTasks(previousTasksState);
                    throw new Error(result.error || "Erro ao atualizar tarefa");
                }
            } catch (error) {
                console.error("Erro ao atualizar posição e status:", error);
                // Reverter para estado anterior ao erro
                setLocalTasks(previousTasksState);
                // Recarregar apenas se necessário
                await reloadTasks();
            }
        }
    };

    const handleTaskClick = async (taskId: string) => {
        setSelectedTaskId(taskId);
        setIsModalOpen(true);
        setIsLoadingTaskDetails(true);

        try {
            // Buscar dados completos da tarefa usando getTaskDetails
            const taskDetails = await getTaskDetails(taskId);
            
            if (!taskDetails) {
                console.error("Tarefa não encontrada");
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
                // Extrair tags do origin_context
                if (context.tags && Array.isArray(context.tags)) {
                    tags = context.tags;
                }
            }

            // Mapear comentários para atividades
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
                subTasks: [], // Subtarefas não estão implementadas no schema ainda
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
                            <motion.div
                                key="list"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.2 }}
                                className="h-full"
                            >
                                <DndContext
                                    sensors={sensors}
                                    collisionDetection={closestCenter}
                                    onDragStart={handleDragStart}
                                    onDragEnd={handleDragEnd}
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
                            key={group.id}
                                 id={group.id}
                            title={group.title}
                            tasks={group.tasks}
                                 groupColor={group.groupColor || groupColors[group.id]}
                            onTaskClick={handleTaskClick}
                                onRenameGroup={async (groupId, newTitle) => {
                                    console.log("onRenameGroup chamado:", { groupId, newTitle, viewOption });
                                    
                                    if (viewOption !== "group") {
                                        toast.error("Não é possível editar o nome de grupos automáticos.");
                                         return;
                                     }
                                     
                                    if (groupId === "inbox" || groupId === "Inbox") {
                                        toast.error("O grupo padrão Inbox não pode ser renomeado.");
                                        return;
                                    }

                                    // Verificar se o groupId é um UUID válido
                                    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                                    if (!uuidRegex.test(groupId)) {
                                        console.error("ID de grupo inválido:", groupId);
                                        toast.error("ID de grupo inválido");
                                        return;
                                    }

                                    // Optimistic Update
                                    const oldTasks = [...localTasks];
                                    
                                    setLocalTasks((prev) => {
                                        return prev.map((t) => {
                                            if (t.group?.id === groupId) {
                                                return {
                                                    ...t,
                                                    group: { ...t.group!, name: newTitle },
                                                };
                                            }
                                            return t;
                                        });
                                    });

                                    try {
                                        console.log("Chamando updateTaskGroup:", { groupId, name: newTitle });
                                        const result = await updateTaskGroup(groupId, { name: newTitle });
                                        console.log("Resultado updateTaskGroup:", result);
                                        
                                        if (result.success) {
                                            toast.success("Grupo renomeado com sucesso");
                                            await loadGroups();
                                            await reloadTasks(); 
                                        } else {
                                            setLocalTasks(oldTasks); // Rollback
                                            console.error("Erro ao renomear grupo:", result.error);
                                            toast.error(result.error || "Erro ao renomear grupo");
                                        }
                                    } catch (error) {
                                        setLocalTasks(oldTasks); // Rollback
                                        console.error("Erro ao renomear grupo:", error);
                                        toast.error("Erro ao renomear grupo");
                                    }
                                }}
                                onColorChange={async (groupId, color) => {
                                    if (viewOption !== "group") {
                                        return;
                                    }
                                    
                                    if (groupId === "inbox" || groupId === "Inbox") {
                                        return; // Não permitir mudar cor do inbox
                                    }

                                    // Verificar se o groupId é um UUID válido
                                    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                                    if (!uuidRegex.test(groupId)) {
                                        toast.error("ID de grupo inválido");
                                        return;
                                    }

                                    // Optimistic Update
                                    const oldTasks = [...localTasks];
                                    const oldGroupColors = { ...groupColors };
                                    
                                    // Atualizar tasks
                                    setLocalTasks((prev) =>
                                        prev.map((t) => {
                                            if (t.group?.id === groupId) {
                                                return {
                                                    ...t,
                                                    group: { ...t.group!, color: color },
                                                };
                                            }
                                            return t;
                                        })
                                    );
                                    
                                    // Atualizar mapa de cores auxiliar
                                     setGroupColors((prev) => ({
                                         ...prev,
                                         [groupId]: color,
                                     }));

                                    try {
                                        const result = await updateTaskGroup(groupId, { color });
                                        if (result.success) {
                                            toast.success("Cor do grupo atualizada");
                                            await loadGroups(); // Recarregar grupos
                                            await reloadTasks();
                                        } else {
                                            // Rollback
                                            setLocalTasks(oldTasks);
                                            setGroupColors(oldGroupColors);
                                            console.error("Erro ao atualizar cor:", result.error);
                                            toast.error(result.error || "Erro ao atualizar cor do grupo");
                                        }
                                    } catch (error) {
                                        // Rollback
                                        setLocalTasks(oldTasks);
                                        setGroupColors(oldGroupColors);
                                        console.error("Erro ao atualizar cor:", error);
                                        toast.error("Erro ao atualizar cor do grupo");
                                    }
                                 }}
                                 onDeleteGroup={async (groupId) => {
                                    if (viewOption !== "group") {
                                        return;
                                    }
                                    
                                    if (groupId === "inbox" || groupId === "Inbox") {
                                        toast.error("O grupo Inbox não pode ser deletado.");
                                        return;
                                    }

                                    // Verificar se o groupId é um UUID válido
                                    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                                    if (!uuidRegex.test(groupId)) {
                                        toast.error("ID de grupo inválido");
                                        return;
                                    }

                                    try {
                                        const result = await deleteTaskGroup(groupId);
                                        if (result.success) {
                                            toast.success("Grupo deletado com sucesso");
                                            await loadGroups(); // Recarregar grupos
                                            await reloadTasks();
                                        } else {
                                            console.error("Erro ao deletar grupo:", result.error);
                                            toast.error(result.error || "Erro ao deletar grupo");
                                        }
                                    } catch (error) {
                                        console.error("Erro ao deletar grupo:", error);
                                        toast.error("Erro ao deletar grupo");
                                    }
                                }}
                                 onClearGroup={async (groupId) => {
                                     // Buscar tarefas do grupo atual
                                     const groupTasks = groupedData[groupId] || [];
                                     if (groupTasks.length === 0) {
                                         toast.info("Nenhuma tarefa para limpar neste grupo");
                                         return;
                                     }
                                     
                                     // Atualização otimista: remover tarefas da UI imediatamente
                                     const previousTasks = [...localTasks];
                                     const taskIdsToArchive = groupTasks.map(t => t.id);
                                     
                                    setLocalTasks((prev) => prev.filter((t) => {
                                        // Se viewOption for "group", comparar pelo group.id
                                        if (viewOption === "group") {
                                            // Se groupId é "inbox", filtrar tarefas sem grupo (group_id === null)
                                            if (groupId === "inbox") {
                                                return t.group?.id !== null && t.group?.id !== undefined;
                                            }
                                            // Caso contrário, filtrar tarefas que não pertencem a este grupo
                                            return t.group?.id !== groupId;
                                        }
                                        // Caso contrário, usar getTaskGroupKey
                                        const taskGroupKey = getTaskGroupKey(t);
                                        return taskGroupKey !== groupId;
                                    }));
                                     
                                     try {
                                         const archivePromises = taskIdsToArchive.map((taskId) =>
                                             updateTask({
                                                 id: taskId,
                                                 status: "archived",
                                             })
                                         );
                                         
                                         await Promise.all(archivePromises);
                                         await reloadTasks();
                                         toast.success(`${groupTasks.length} tarefa${groupTasks.length > 1 ? 's' : ''} arquivada${groupTasks.length > 1 ? 's' : ''} com sucesso`);
                                     } catch (error) {
                                         // Rollback em caso de erro
                                         setLocalTasks(previousTasks);
                                         await reloadTasks();
                                         console.error("Erro ao limpar grupo:", error);
                                         toast.error("Erro ao limpar grupo");
                                     }
                                 }}
                                 onTaskUpdated={reloadTasks}
                                 onTaskDeleted={reloadTasks}
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
                                                onRenameGroup={async (groupId, newTitle) => {
                                                    console.log("onRenameGroup chamado:", { groupId, newTitle, viewOption });
                                                    
                                                    if (viewOption !== "group") {
                                                        toast.error("Não é possível editar o nome de grupos automáticos.");
                                                        return;
                                                    }
                                                    
                                                    if (groupId === "inbox" || groupId === "Inbox") {
                                                        toast.error("O grupo padrão Inbox não pode ser renomeado.");
                                                        return;
                                                    }

                                                    // Verificar se o groupId é um UUID válido
                                                    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                                                    if (!uuidRegex.test(groupId)) {
                                                        console.error("ID de grupo inválido:", groupId);
                                                        toast.error("ID de grupo inválido");
                                                        return;
                                                    }

                                                    // Optimistic Update
                                                    const oldTasks = [...localTasks];
                                                    
                                                    setLocalTasks((prev) => {
                                                        return prev.map((t) => {
                                                            if (t.group?.id === groupId) {
                                                                return {
                                                                    ...t,
                                                                    group: { ...t.group!, name: newTitle },
                                                                };
                                                            }
                                                            return t;
                                                        });
                                                    });

                                                    try {
                                                        console.log("Chamando updateTaskGroup:", { groupId, name: newTitle });
                                                        const result = await updateTaskGroup(groupId, { name: newTitle });
                                                        console.log("Resultado updateTaskGroup:", result);
                                                        
                                                        if (result.success) {
                                                            toast.success("Grupo renomeado com sucesso");
                                                            await loadGroups();
                                                            await reloadTasks(); 
                                                        } else {
                                                            setLocalTasks(oldTasks); // Rollback
                                                            console.error("Erro ao renomear grupo:", result.error);
                                                            toast.error(result.error || "Erro ao renomear grupo");
                                                        }
                                                    } catch (error) {
                                                        setLocalTasks(oldTasks); // Rollback
                                                        console.error("Erro ao renomear grupo:", error);
                                                        toast.error("Erro ao renomear grupo");
                                                    }
                                                }}
                                                onColorChange={async (groupId, color) => {
                                                    if (viewOption !== "group") {
                                                        return; // Não permitir mudar cor de grupos automáticos
                                                    }
                                                    
                                                    if (groupId === "inbox" || groupId === "Inbox") {
                                                        return; // Não permitir mudar cor do inbox
                                                    }

                                                    // Verificar se o groupId é um UUID válido
                                                    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                                                    if (!uuidRegex.test(groupId)) {
                                                        toast.error("ID de grupo inválido");
                                                        return;
                                                    }

                                                    // Optimistic Update
                                                    const oldTasks = [...localTasks];
                                                    const oldGroupColors = { ...groupColors };
                                                    
                                                    // Atualizar tasks
                                                    setLocalTasks((prev) =>
                                                        prev.map((t) => {
                                                            if (t.group?.id === groupId) {
                                                                return {
                                                                    ...t,
                                                                    group: { ...t.group!, color },
                                                                };
                                                            }
                                                            return t;
                                                        })
                                                    );
                                                    
                                                    // Atualizar cores locais
                                                    setGroupColors((prev) => ({
                                                        ...prev,
                                                        [groupId]: color,
                                                    }));

                                                    try {
                                                        const result = await updateTaskGroup(groupId, { color });
                                                        if (result.success) {
                                                            toast.success("Cor do grupo atualizada");
                                                            await loadGroups();
                                                            await reloadTasks();
                                                        } else {
                                                            // Rollback
                                                            setLocalTasks(oldTasks);
                                                            setGroupColors(oldGroupColors);
                                                            console.error("Erro ao atualizar cor:", result.error);
                                                            toast.error(result.error || "Erro ao atualizar cor do grupo");
                                                        }
                                                    } catch (error) {
                                                        // Rollback
                                                        setLocalTasks(oldTasks);
                                                        setGroupColors(oldGroupColors);
                                                        console.error("Erro ao atualizar cor:", error);
                                                        toast.error("Erro ao atualizar cor do grupo");
                                                    }
                                                }}
                                                onDeleteGroup={async (groupId) => {
                                                    if (viewOption !== "group") {
                                                        return;
                                                    }
                                                    
                                                    if (groupId === "inbox" || groupId === "Inbox") {
                                                        toast.error("O grupo Inbox não pode ser deletado.");
                                                        return;
                                                    }

                                                    // Verificar se o groupId é um UUID válido
                                                    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                                                    if (!uuidRegex.test(groupId)) {
                                                        toast.error("ID de grupo inválido");
                                                        return;
                                                    }

                                                    try {
                                                        const result = await deleteTaskGroup(groupId);
                                                        if (result.success) {
                                                            toast.success("Grupo deletado com sucesso");
                                                            await loadGroups(); // Recarregar grupos
                                                            await reloadTasks();
                                                        } else {
                                                            console.error("Erro ao deletar grupo:", result.error);
                                                            toast.error(result.error || "Erro ao deletar grupo");
                                                        }
                                                    } catch (error) {
                                                        console.error("Erro ao deletar grupo:", error);
                                                        toast.error("Erro ao deletar grupo");
                                     }
                                 }}
                                 onClearGroup={async (groupId) => {
                                                    // Buscar tarefas do grupo atual
                                     const groupTasks = groupedData[groupId] || [];
                                                    if (groupTasks.length === 0) {
                                                        toast.info("Nenhuma tarefa para limpar neste grupo");
                                                        return;
                                                    }
                                                    
                                                    // Atualização otimista: remover tarefas da UI imediatamente
                                                    const previousTasks = [...localTasks];
                                                    const taskIdsToArchive = groupTasks.map(t => t.id);
                                                    
                                                    setLocalTasks((prev) => prev.filter((t) => {
                                                        // Se viewOption for "group", comparar pelo group.id
                                                        if (viewOption === "group") {
                                                            // Se groupId é "inbox", filtrar tarefas sem grupo (group_id === null)
                                                            if (groupId === "inbox") {
                                                                return t.group?.id !== null && t.group?.id !== undefined;
                                                            }
                                                            // Caso contrário, filtrar tarefas que não pertencem a este grupo
                                                            return t.group?.id !== groupId;
                                                        }
                                                        // Caso contrário, usar getTaskGroupKey
                                                        const taskGroupKey = getTaskGroupKey(t);
                                                        return taskGroupKey !== groupId;
                                                    }));
                                                    
                                                    try {
                                                        const archivePromises = taskIdsToArchive.map((taskId) =>
                                             updateTask({
                                                                id: taskId,
                                                 status: "archived",
                                             })
                                         );
                                         
                                         await Promise.all(archivePromises);
                                         await reloadTasks();
                                                        toast.success(`${groupTasks.length} tarefa${groupTasks.length > 1 ? 's' : ''} arquivada${groupTasks.length > 1 ? 's' : ''} com sucesso`);
                                     } catch (error) {
                                                        // Rollback em caso de erro
                                                        setLocalTasks(previousTasks);
                                                        await reloadTasks();
                                         console.error("Erro ao limpar grupo:", error);
                                                        toast.error("Erro ao limpar grupo");
                                     }
                                 }}
                                 onTaskUpdated={reloadTasks}
                                 onTaskDeleted={reloadTasks}
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
                            </motion.div>
                        ) : (
                            <motion.div
                                key="kanban"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.2 }}
                                className="h-full"
                            >
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
                                                // Se estiver na visão de grupos, o columnId é o ID do grupo
                                                // Se for "inbox", groupId é null (explicitamente)
                                                if (columnId === "inbox" || columnId === "Inbox") {
                                                    groupId = null;
                                                } else {
                                                    groupId = columnId;
                                                }
                                                // Status padrão para novas tarefas em grupos
                                                dbStatus = "todo";
                                            }

                                            const result = await createTask({
                                                title,
                                                status: dbStatus as any, // Inclui "review" e "correction"
                                                priority: priority,
                                                assignee_id: assigneeId || undefined,
                                                due_date: dueDate ? dueDate.toISOString() : undefined,
                                                // Se estiver na aba "minhas", tarefa pessoal (sem workspace)
                                                // Caso contrário, associar ao workspace ativo
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
                            </motion.div>
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
                onTaskUpdated={reloadTasks}
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
