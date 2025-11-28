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
import { Search, Filter, Plus, List, LayoutGrid, ChevronDown, CheckSquare, FolderPlus } from "lucide-react";
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
import { getTasks, createTask, updateTask, type Task as TaskFromDB } from "@/lib/actions/tasks";
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
    assignees?: Array<{ name: string; avatar?: string }>;
    dueDate?: string;
    tags?: string[];
    hasUpdates?: boolean;
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
            assignees: task.assignee_id ? [{ name: "Usuário" }] : [], // TODO: Buscar nome real do usuário
            dueDate: task.due_date || undefined,
            tags,
            hasUpdates: false, // TODO: Implementar lógica de atualizações
        };
    };

    // Buscar tarefas do banco
    useEffect(() => {
        const loadTasks = async () => {
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
            }
        };

        loadTasks();
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
                const { updateTaskPosition } = await import("@/app/actions/tasks");
                await updateTaskPosition({
                    taskId: active.id as string,
                    newPosition: newIndex + 1,
                });
            } catch (error) {
                console.error("Erro ao atualizar posição:", error);
                // Reverter mudança otimista recarregando dados originais
                const tasksFromDB = await getTasks(activeTab === "minhas" ? { workspaceId: null } : {});
                const mappedTasks = tasksFromDB.map(mapTaskFromDB);
                setLocalTasks(mappedTasks);
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
            let updateData: { status?: string; priority?: "low" | "medium" | "high" | "urgent" } = {};

            switch (groupBy) {
                case "status":
                    updateData.status = destinationGroupKey;
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

            // Atualizar tarefa localmente
            Object.assign(taskToUpdate, updateData);

            // O agrupamento será recalculado automaticamente pelo useMemo
            // Apenas precisamos garantir que a tarefa está na posição correta
            setLocalTasks(newTasks);

            // Persistir no backend
            try {
                const { updateTaskPosition } = await import("@/app/actions/tasks");
                const dbStatus = groupBy === "status" ? mapStatusToDb(destinationGroupKey) : undefined;
                await updateTaskPosition({
                    taskId: active.id as string,
                    newPosition: 1, // Nova posição no grupo de destino
                    newStatus: dbStatus,
                });
            } catch (error) {
                console.error("Erro ao atualizar posição e status:", error);
                // Reverter para estado anterior ao erro
                setLocalTasks(previousTasksState);
            }
        }
    };

    const handleTaskClick = (taskId: string) => {
        setSelectedTaskId(taskId);
        setIsModalOpen(true);
    };

    const getTaskForModal = () => {
        if (!selectedTaskId) return undefined;

        const task = localTasks.find((t) => t.id === selectedTaskId);

        if (!task) return undefined;

        // Converter status customizável para formato do modal
        const statusMap: Record<string, "todo" | "in_progress" | "done"> = {
            "Backlog": "todo",
            "Triagem": "todo",
            "Execução": "in_progress",
            "Revisão": "done",
        };
        const modalStatus = statusMap[task.status] || "todo";

        return {
            id: task.id,
            title: task.title,
            description: "Descrição detalhada da tarefa será exibida aqui...",
            status: modalStatus,
            assignee: task.assignees?.[0],
            dueDate: task.dueDate,
            breadcrumbs: ["Workspace", "Tarefas", task.tags?.[0] || "Geral"],
            contextMessage: {
                type: "text" as const,
                content: "Tarefa criada via WhatsApp",
                timestamp: new Date().toISOString(),
            },
            subTasks: [],
            activities: [],
        };
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
                                        console.log("Abrir modal de criação de tarefa");
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
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input
                                placeholder="Buscar tarefas..."
                                className="pl-9 w-64 h-9 bg-white"
                            />
                        </div>

                        {/* Filtro */}
                        <Button variant="outline" size="sm" className="h-9 bg-white">
                            <Filter className="w-4 h-4 mr-2" />
                            Filtro
                        </Button>

                        {/* Agrupar por */}
                        <Select value={groupBy} onValueChange={(value) => setGroupBy(value as GroupBy)}>
                            <SelectTrigger className="w-[140px] h-9 bg-white">
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
                                            // Atualizar tarefa na lista local
                                            const updatedTask = mapTaskFromDB(result.data);
                                            setLocalTasks((prev) =>
                                                prev.map((t) => (t.id === taskId ? updatedTask : t))
                                            );
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
                                            // Adicionar nova tarefa à lista local
                                            const newTask = mapTaskFromDB(result.data);
                                            setLocalTasks((prev) => [...prev, newTask]);
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
                />
            )}

            {/* Modal de Detalhes */}
            <TaskDetailModal
                open={isModalOpen}
                onOpenChange={setIsModalOpen}
                task={getTaskForModal()}
            />
        </div>
    </div>
    );
}

