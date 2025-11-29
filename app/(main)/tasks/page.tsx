"use client";

import { useState, useMemo, useEffect } from "react";
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
import { Search, Filter, Plus, List, LayoutGrid, ChevronDown, CheckSquare, FolderPlus, CircleDashed } from "lucide-react";
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
    getTaskById,
    type Task as TaskFromDB 
} from "@/lib/actions/tasks";
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
        // Mapear status do banco para status customizável
        const statusMap: Record<string, string> = {
            todo: "Backlog",
            in_progress: "Execução",
            done: "Revisão",
            archived: "Arquivado",
        };

        // Extrair tags do origin_context se existir
        const tags: string[] = [];
        if (task.origin_context?.tags) {
            tags.push(...task.origin_context.tags);
        }

        return {
            id: task.id,
            title: task.title,
            completed: task.status === "done",
            priority: task.priority,
            status: statusMap[task.status] || task.status,
            assignees: task.assignee_name 
                ? [{ name: task.assignee_name, avatar: task.assignee_avatar || undefined, id: task.assignee_id || undefined }] 
                : [],
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
            let filters: { workspaceId?: string | null } = {};
            
            if (activeTab === "minhas") {
                filters.workspaceId = null; // Tarefas pessoais
            } else if (activeTab === "time") {
                // TODO: Filtrar por workspace do time
                // Por enquanto, buscar todas
            }

            const tasksFromDB = await getTasks(filters);
            const mappedTasks = tasksFromDB.map(mapTaskFromDB);
            setLocalTasks(mappedTasks);
        } catch (error) {
            console.error("Erro ao carregar tarefas:", error);
        } finally {
            setIsLoadingTasks(false);
        }
    };

    // Buscar tarefas do banco
    useEffect(() => {
        reloadTasks();
    }, [activeTab]);

    // Função de agrupamento dinâmico
    const groupedData = useMemo(() => {
        // Inicializar grupos padrão se estiver agrupando por status
        const groups: Record<string, Task[]> = {};
        
        if (groupBy === "status") {
            groups["Backlog"] = [];
            groups["Execução"] = [];
            groups["Revisão"] = [];
        }

        localTasks.forEach((task) => {
            let groupKey: string;

            switch (groupBy) {
                case "status":
                    groupKey = task.status || "Sem Status";
                    break;
                case "priority":
                    groupKey = task.priority || "medium";
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
    }, [groupBy, localTasks]);

    // Converter grupos para formato de colunas (Kanban)
    const kanbanColumns = useMemo(() => {
        const columns = Object.entries(groupedData).map(([key, tasks]) => ({
            id: key,
            title: key,
            tasks,
        }));

        // Ordenar colunas baseado no tipo de agrupamento
        if (groupBy === "status") {
            const statusOrder = ["Backlog", "Triagem", "Execução", "Revisão"];
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

    // Converter grupos para formato de lista (TaskGroup)
    const listGroups = useMemo(() => {
        return Object.entries(groupedData).map(([key, tasks]) => ({
            id: key,
            title: key,
            tasks,
        }));
    }, [groupedData]);

    // Mapear status customizáveis para status do banco
    const mapStatusToDb = (status: string): "todo" | "in_progress" | "done" | "archived" => {
        const statusLower = status.toLowerCase();
        if (statusLower.includes("backlog") || statusLower === "todo" || statusLower === "não iniciado") {
            return "todo";
        }
        if (statusLower.includes("triagem") || statusLower.includes("execução") || statusLower === "in_progress") {
            return "in_progress";
        }
        if (statusLower.includes("revisão") || statusLower === "done" || statusLower === "finalizado") {
            return "done";
        }
        return "todo";
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
                let groupKey: string;
                switch (groupBy) {
                    case "status":
                        groupKey = t.status || "Sem Status";
                        break;
                    case "priority":
                        groupKey = t.priority || "medium";
                        break;
                    case "assignee":
                        groupKey = t.assignees?.[0]?.name || "Não atribuído";
                        break;
                    default:
                        groupKey = t.status || "Sem Status";
                }
                return groupKey === destinationGroupKey;
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
                        groupKey = newTasks[i].priority || "medium";
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
                let groupKey: string;
                switch (groupBy) {
                    case "status":
                        groupKey = t.status || "Sem Status";
                        break;
                    case "priority":
                        groupKey = t.priority || "medium";
                        break;
                    case "assignee":
                        groupKey = t.assignees?.[0]?.name || "Não atribuído";
                        break;
                    default:
                        groupKey = t.status || "Sem Status";
                }
                return groupKey !== destinationGroupKey;
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
                    // Recarregar tarefas do banco para garantir sincronização
                    await reloadTasks();
                } else {
                    throw new Error(result.error);
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
                    const priorityMap: Record<string, "low" | "medium" | "high" | "urgent"> = {
                        urgent: "urgent",
                        high: "high",
                        medium: "medium",
                        low: "low",
                    };
                    const priority = priorityMap[destinationGroupKey.toLowerCase()];
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

                if (result.success) {
                    // Recarregar tarefas do banco para garantir sincronização
                    await reloadTasks();
                } else {
                    throw new Error(result.error);
                }
            } catch (error) {
                console.error("Erro ao atualizar posição e status:", error);
                // Reverter para estado anterior ao erro
                setLocalTasks(previousTasksState);
                await reloadTasks();
            }
        }
    };

    const handleTaskClick = async (taskId: string) => {
        setSelectedTaskId(taskId);
        setIsModalOpen(true);
        setIsLoadingTaskDetails(true);

        try {
            // Buscar dados completos da tarefa
            const taskFromDB = await getTaskById(taskId);
            
            if (!taskFromDB) {
                console.error("Tarefa não encontrada");
                setIsModalOpen(false);
                return;
            }

            // Buscar comentários e anexos
            const { getTaskComments, getTaskAttachments } = await import("@/lib/actions/tasks");
            const [comments, attachments] = await Promise.all([
                getTaskComments(taskId),
                getTaskAttachments(taskId),
            ]);

            // Converter status do banco para formato do modal
            const statusMap: Record<string, "todo" | "in_progress" | "done"> = {
                "todo": "todo",
                "in_progress": "in_progress",
                "done": "done",
                "archived": "done",
            };
            const modalStatus = statusMap[taskFromDB.status] || "todo";

            // Mapear origin_context para contextMessage
            let contextMessage: any = undefined;
            if (taskFromDB.origin_context) {
                const context = taskFromDB.origin_context;
                if (context.audio_url) {
                    contextMessage = {
                        type: "audio" as const,
                        content: context.message || "Mensagem de áudio",
                        timestamp: context.timestamp || taskFromDB.created_at,
                    };
                } else if (context.message) {
                    contextMessage = {
                        type: "text" as const,
                        content: context.message,
                        timestamp: context.timestamp || taskFromDB.created_at,
                    };
                }
            }

            // Mapear comentários para atividades
            const activities = comments
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
                        user: comment.user_name || "Usuário",
                        message: comment.content,
                        timestamp: new Date(comment.created_at).toLocaleString("pt-BR"),
                    };
                });

            // Mapear anexos
            const mappedAttachments = attachments.map((att) => ({
                id: att.id,
                name: att.file_name,
                type: (att.file_type || "other") as "image" | "pdf" | "other",
                size: att.file_size ? `${(att.file_size / 1024 / 1024).toFixed(1)} MB` : "0 MB",
            }));

            // Construir breadcrumbs
            const breadcrumbs: string[] = [];
            if (taskFromDB.workspace_name) {
                breadcrumbs.push(taskFromDB.workspace_name);
            }
            breadcrumbs.push("Tarefas");
            if (taskFromDB.origin_context?.tags?.[0]) {
                breadcrumbs.push(taskFromDB.origin_context.tags[0]);
            } else {
                breadcrumbs.push("Geral");
            }

            setTaskDetails({
                id: taskFromDB.id,
                title: taskFromDB.title,
                description: taskFromDB.description || "",
                status: modalStatus,
                assignee: taskFromDB.assignee_name
                    ? {
                          name: taskFromDB.assignee_name,
                          avatar: taskFromDB.assignee_avatar || undefined,
                      }
                    : undefined,
                dueDate: taskFromDB.due_date
                    ? new Date(taskFromDB.due_date).toISOString().split("T")[0]
                    : undefined,
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
                            <SelectTrigger className="w-[140px] h-9 bg-white rounded-lg border-solid border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm gap-2">
                                <CircleDashed className="w-4 h-4 text-gray-500 flex-shrink-0" />
                                <SelectValue placeholder="Agrupar por" className="flex-1" />
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
                {viewMode === "list" ? (
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
                                onTaskClick={handleTaskClick}
                                onToggleComplete={async (taskId, completed) => {
                                    try {
                                        const result = await updateTask({
                                            id: taskId,
                                            is_complete: completed,
                                        });

                                        if (result.success && result.data) {
                                            // Recarregar tarefas do banco para garantir sincronização
                                            await reloadTasks();
                                        } else {
                                            console.error("Erro ao atualizar tarefa:", result.error);
                                        }
                                    } catch (error) {
                                        console.error("Erro ao atualizar tarefa:", error);
                                    }
                                }}
                                onTaskUpdate={async (taskId, updates) => {
                                    try {
                                        const result = await updateTask({
                                            id: taskId,
                                            ...updates,
                                        });

                                        if (result.success && result.data) {
                                            // Recarregar tarefas do banco para garantir sincronização
                                            await reloadTasks();
                                        } else {
                                            console.error("Erro ao atualizar tarefa:", result.error);
                                        }
                                    } catch (error) {
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
            ) : (
                <TaskBoard
                    columns={kanbanColumns}
                    onTaskClick={handleTaskClick}
                    onAddTask={(columnId) => console.log(`Adicionar tarefa em ${columnId}`)}
                    onTasksChange={reloadTasks}
                />
            )}

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

