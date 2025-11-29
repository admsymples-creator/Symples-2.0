"use client";

import { useState, useMemo, useEffect } from "react";
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
import { TaskGroup } from "@/components/tasks/TaskGroup";
import { TaskBoard } from "@/components/tasks/TaskBoard";
import { TaskDetailModal } from "@/components/tasks/TaskDetailModal";
import { Search, Filter, Plus, List, LayoutGrid, ChevronDown, CheckSquare, FolderPlus, CircleDashed, Archive, ArrowUpDown } from "lucide-react";
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
} from "@dnd-kit/sortable";
import { 
    getTasks, 
    createTask, 
    updateTask,
    getWorkspaceMembers,
    type Task as TaskFromDB 
} from "@/lib/actions/tasks";
import { getTaskDetails } from "@/lib/actions/task-details";
import { mapStatusToLabel, mapLabelToStatus, STATUS_TO_LABEL, ORDERED_STATUSES } from "@/lib/config/tasks";
import { useRouter } from "next/navigation";

type ContextTab = "minhas" | "time" | "todas";
type ViewMode = "list" | "kanban";
type GroupBy = "status" | "priority" | "assignee";

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
}

export default function TasksPage() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<ContextTab>("todas");
    const [viewMode, setViewMode] = useState<ViewMode>("list");
    const [groupBy, setGroupBy] = useState<GroupBy>("status");
    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [localTasks, setLocalTasks] = useState<Task[]>([]);
    const [activeTask, setActiveTask] = useState<Task | null>(null);
    const [isLoadingTasks, setIsLoadingTasks] = useState(false);
    const [taskDetails, setTaskDetails] = useState<any>(null);
    const [isLoadingTaskDetails, setIsLoadingTaskDetails] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [groupColors, setGroupColors] = useState<Record<string, string>>({});
    const [workspaceMembers, setWorkspaceMembers] = useState<Array<{ id: string; name: string; avatar?: string }>>([]);

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
        }

        // Mapear assignees
        // Usamos uma asserção segura aqui pois sabemos que o join retorna os dados
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
            assigneeId: task.assignee_id || null, // ID do responsável
            dueDate: task.due_date || undefined,
            tags,
            hasUpdates: false, // TODO: Implementar lógica de atualizações
            workspaceId: task.workspace_id || null,
        };
    };

    // Função para recarregar tarefas
    const reloadTasks = async () => {
        setIsLoadingTasks(true);
        try {
            // Determinar filtros baseado na aba ativa
            let filters: { 
                workspaceId?: string | null;
                assigneeId?: string | null | "current";
                dueDateStart?: string;
                dueDateEnd?: string;
            } = {};
            
            if (activeTab === "minhas") {
                // Minhas: Tudo que eu estou atribuído
                filters.assigneeId = "current";
            } else if (activeTab === "time") {
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
            // Todas: Sem filtros (buscar todas as tarefas)

            const tasksFromDB = await getTasks(filters);
            const mappedTasks = tasksFromDB.map(mapTaskFromDB);
            setLocalTasks(mappedTasks);
        } catch (error) {
            console.error("Erro ao carregar tarefas:", error);
        } finally {
            setIsLoadingTasks(false);
        }
    };

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

    // Limpar cores de grupos que não existem mais quando groupBy muda
    useEffect(() => {
        const currentGroupIds = Object.keys(groupedData);
        setGroupColors((prev) => {
            const cleaned: Record<string, string> = {};
            currentGroupIds.forEach((id) => {
                if (prev[id]) {
                    cleaned[id] = prev[id];
                }
            });
            return cleaned;
        });
    }, [groupBy]); // eslint-disable-line react-hooks/exhaustive-deps

    // Buscar tarefas do banco
    useEffect(() => {
        reloadTasks();
    }, [activeTab]);

    // Buscar membros do workspace
    useEffect(() => {
        const loadMembers = async () => {
            try {
                const members = await getWorkspaceMembers(null);
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
    }, []);

    // Filtrar tarefas por busca
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

        // Inicializar grupos padrão conforme o tipo de agrupamento
        if (groupBy === "status") {
            // Usar labels dos status na ordem correta
            ORDERED_STATUSES.forEach((status) => {
                const label = STATUS_TO_LABEL[status];
                groups[label] = [];
            });
        } else if (groupBy === "priority") {
            groups["Urgente"] = [];
            groups["Alta"] = [];
            groups["Média"] = [];
            groups["Baixa"] = [];
        }
        // Para assignee, não inicializamos grupos vazios (só criamos quando há tarefas)

        filteredTasks.forEach((task) => {
            let groupKey: string;

            switch (groupBy) {
                case "status":
                    groupKey = task.status || "Sem Status";
                    break;
                case "priority":
                    const priority = task.priority || "medium";
                    groupKey = priorityLabels[priority] || priority;
                    break;
                case "assignee":
                    groupKey = task.assignees?.[0]?.name || "Não atribuído";
                    break;
                default:
                    groupKey = task.status || "Sem Status";
            }

            if (!groups[groupKey]) {
                groups[groupKey] = [];
            }
            groups[groupKey].push(task);
        });

        return groups;
    }, [groupBy, filteredTasks]);

    // Converter grupos para formato de colunas (Kanban)
    const kanbanColumns = useMemo(() => {
        const columns = Object.entries(groupedData).map(([key, tasks]) => ({
            id: key,
            title: key,
            tasks,
        }));

        // Ordenar colunas baseado no tipo de agrupamento
        if (groupBy === "status") {
            // Usar a ordem definida em ORDERED_STATUSES
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

        if (groupBy === "priority") {
            const priorityOrder = ["urgent", "high", "medium", "low"];
            return columns.sort((a, b) => {
                const aIndex = priorityOrder.indexOf(a.title);
                const bIndex = priorityOrder.indexOf(b.title);
                if (aIndex === -1 && bIndex === -1) return 0;
                if (aIndex === -1) return 1;
                if (bIndex === -1) return -1;
                return aIndex - bIndex;
            });
        }

        return columns;
    }, [groupedData, groupBy]);

    // Converter grupos para formato de lista (TaskGroup) com ordenação
    const listGroups = useMemo(() => {
        const groups = Object.entries(groupedData).map(([key, tasks]) => ({
            id: key,
            title: key,
            tasks,
        }));

        // Ordenar grupos conforme o tipo de agrupamento
        if (groupBy === "status") {
            // Usar a ordem definida em ORDERED_STATUSES
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

        if (groupBy === "priority") {
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

        if (groupBy === "assignee") {
            // Ordenar por nome, com "Não atribuído" no final
            return groups.sort((a, b) => {
                if (a.title === "Não atribuído") return 1;
                if (b.title === "Não atribuído") return -1;
                return a.title.localeCompare(b.title);
            });
        }

        return groups;
    }, [groupedData, groupBy]);

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

    // Função auxiliar para obter groupKey de uma tarefa
    const getTaskGroupKey = (task: Task): string => {
        switch (groupBy) {
            case "status":
                return task.status || "Sem Status";
            case "priority":
                return getPriorityLabel(task.priority);
            case "assignee":
                return task.assignees?.[0]?.name || "Não atribuído";
            default:
                return task.status || "Sem Status";
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
                switch (groupBy) {
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
                    case "assignee":
                        groupKey = newTasks[i].assignees?.[0]?.name || "Não atribuído";
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


            // Determinar o que atualizar baseado no groupBy
            let updateData: { 
                status?: "todo" | "in_progress" | "done" | "archived";
                priority?: "low" | "medium" | "high" | "urgent";
                assignee_id?: string | null;
            } = {};

            switch (groupBy) {
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
                case "assignee":
                    // Para assignee, precisaríamos de uma lógica mais complexa
                    // Por enquanto, apenas atualizamos a posição
                    break;
            }

            // Atualizar tarefa localmente com os valores mapeados
            if (updateData.status) {
                // Mapear status do banco de volta para status customizável
                const statusMapReverse: Record<string, string> = {
                    todo: "Backlog",
                    in_progress: "Execução",
                    done: "Revisão",
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
                // Usar updateTask para atualizar status/priority quando muda de grupo
                const result = await updateTask({
                    id: active.id as string,
                    status: updateData.status,
                    priority: updateData.priority,
                    assignee_id: updateData.assignee_id,
                    position: 1, // Nova posição no grupo de destino
                });

                if (result.success && result.data) {
                    // Atualizar tarefa específica com dados do servidor
                    const updatedTask = mapTaskFromDB(result.data);
                    setLocalTasks((prevTasks) =>
                        prevTasks.map((task) =>
                            task.id === active.id ? updatedTask : task
                        )
                    );
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
                                        console.log("Abrir modal de criação de grupo");
                                        // TODO: Abrir modal/prompt para criar novo grupo
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

                        {/* Filtro */}
                        <Button 
                            variant="outline" 
                            className="h-9 px-3 rounded-lg border-solid border-gray-200 bg-white hover:bg-gray-50 text-sm font-medium text-gray-700 shadow-sm"
                        >
                            <Filter className="w-4 h-4 mr-2 text-gray-500" />
                            Filtro
                        </Button>

                        {/* Agrupar por */}
                        <Select value={groupBy} onValueChange={(value) => setGroupBy(value as GroupBy)}>
                            <SelectTrigger className="w-[140px] h-9 bg-white rounded-lg border-solid border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm">
                                <SelectValue placeholder="Agrupar por" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="status">Status</SelectItem>
                                <SelectItem value="priority">Prioridade</SelectItem>
                                <SelectItem value="assignee">Responsável</SelectItem>
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
                                 groupColor={groupColors[group.id]}
                            onTaskClick={handleTaskClick}
                                 onRenameGroup={(groupId, newTitle) => {
                                     // Atualizar título do grupo
                                     // Para grupos de status/priority, isso não faz sentido mudar
                                     // Mas para grupos customizados, podemos armazenar no localStorage
                                     if (groupBy === "status" || groupBy === "priority") {
                                         // Para status e priority, não permitir edição (são valores fixos)
                                         alert("Não é possível editar o nome de grupos de status ou prioridade.");
                                         return;
                                     }
                                     
                                     // Para grupos de assignee ou outros, podemos armazenar mapeamentos customizados
                                     const customGroupNames = JSON.parse(
                                         localStorage.getItem("customGroupNames") || "{}"
                                     );
                                     customGroupNames[groupId] = newTitle;
                                     localStorage.setItem("customGroupNames", JSON.stringify(customGroupNames));
                                     
                                     // Recarregar tarefas para aplicar mudança
                                     reloadTasks();
                                 }}
                                 onColorChange={(groupId, color) => {
                                     setGroupColors((prev) => ({
                                         ...prev,
                                         [groupId]: color,
                                     }));
                                 }}
                                 onDeleteGroup={async (groupId) => {
                                     // Arquivar todas as tarefas do grupo
                                     const groupTasks = groupedData[groupId] || [];
                                     if (groupTasks.length === 0) return;
                                     
                                     const confirmed = window.confirm(
                                         `Tem certeza que deseja arquivar todas as ${groupTasks.length} tarefas do grupo "${groupId}"?`
                                     );
                                     
                                     if (!confirmed) return;
                                     
                                     try {
                                         const archivePromises = groupTasks.map((task) =>
                                             updateTask({
                                                 id: task.id,
                                                 status: "archived",
                                             })
                                         );
                                         
                                         await Promise.all(archivePromises);
                                         await reloadTasks();
                                     } catch (error) {
                                         console.error("Erro ao arquivar tarefas:", error);
                                         alert("Erro ao arquivar tarefas. Tente novamente.");
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
                                        const statusMap: Record<string, "todo" | "in_progress" | "done"> = {
                                            "Backlog": "todo",
                                            "Triagem": "todo",
                                            "Execução": "in_progress",
                                            "Revisão": "done",
                                        };
                                        
                                        const dbStatus = context.status 
                                            ? statusMap[context.status] || "todo"
                                            : undefined;

                                        const result = await createTask({
                                    title,
                                            status: dbStatus,
                                            priority: context.priority as any,
                                            workspace_id: activeTab === "minhas" ? null : undefined, // TODO: Pegar workspace_id real
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
                            groupBy={groupBy}
                        />
                    ))}
                </div>
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
                                    onAddTask={async (columnId, title, dueDate, assigneeId) => {
                                        try {
                                            // Mapear status/priority baseado no groupBy e columnId
                                            const statusMap: Record<string, "todo" | "in_progress" | "done"> = {
                                                "Backlog": "todo",
                                                "Triagem": "todo",
                                                "Execução": "in_progress",
                                                "Revisão": "done",
                                            };

                                            let dbStatus: "todo" | "in_progress" | "done" | undefined;
                                            let priority: "low" | "medium" | "high" | "urgent" | undefined;

                                            if (groupBy === "status") {
                                                dbStatus = statusMap[columnId] || "todo";
                                            } else if (groupBy === "priority") {
                                                priority = columnId as "low" | "medium" | "high" | "urgent";
                                            }

                                            const result = await createTask({
                                                title,
                                                status: dbStatus,
                                                priority: priority,
                                                assignee_id: assigneeId || undefined,
                                                due_date: dueDate ? dueDate.toISOString() : undefined,
                                                workspace_id: activeTab === "minhas" ? null : undefined,
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
                                    groupBy={groupBy}
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

            {/* Modal de Detalhes */}
            <TaskDetailModal
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
        </div>
        </div>
    );
}
