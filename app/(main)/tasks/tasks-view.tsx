"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { TaskWithDetails, createTask, updateTask } from "@/lib/actions/tasks";
import { mapStatusToLabel } from "@/lib/config/tasks";
import { Member } from "@/lib/actions/members";
import { TaskGroup } from "@/components/tasks/TaskGroup";
import { TaskBoard } from "@/components/tasks/TaskBoard";
import { TaskDetailModal } from "@/components/tasks/TaskDetailModal";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter, List, LayoutGrid, CircleDashed } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { STAGGER_CONTAINER, STAGGER_ITEM } from "@/lib/motion";
import {
    DndContext,
    DragOverlay,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from "@dnd-kit/core";
import {
    sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";

interface TasksViewProps {
  initialTasks: TaskWithDetails[];
  workspaceId: string;
  members: Member[];
}

type ContextTab = "minhas" | "time" | "todas";
type GroupBy = "status" | "priority" | "assignee";
type ViewMode = "list" | "kanban";

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

export function TasksView({ initialTasks, workspaceId, members }: TasksViewProps) {
    const router = useRouter();
    const [localTasks, setLocalTasks] = useState<Task[]>([]);
    const [activeTab, setActiveTab] = useState<ContextTab>("todas");
    const [groupBy, setGroupBy] = useState<GroupBy>("status");
    const [viewMode, setViewMode] = useState<ViewMode>("list");
    const [searchQuery, setSearchQuery] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
    const [taskDetails, setTaskDetails] = useState<any>(null);
    const [activeTask, setActiveTask] = useState<Task | null>(null);

    // Sensores para drag and drop
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
    const mapTaskFromDB = (task: TaskWithDetails): Task => {

        // Extrair tags do origin_context se existir
        const tags: string[] = [];
        if (task.origin_context && typeof task.origin_context === 'object' && 'tags' in task.origin_context) {
            const contextTags = (task.origin_context as any).tags;
            if (Array.isArray(contextTags)) {
                tags.push(...contextTags);
            }
        }

        return {
            id: task.id,
            title: task.title,
            completed: task.status === "done",
            priority: (task.priority as "low" | "medium" | "high" | "urgent" | undefined) || undefined,
            status: mapStatusToLabel(task.status || "todo"),
            assignees: task.assignee 
                ? [{ 
                    name: task.assignee.full_name || task.assignee.email || "Sem nome", 
                    avatar: task.assignee.avatar_url || undefined,
                    id: task.assignee.email || undefined
                }] 
                : [],
            dueDate: task.due_date || undefined,
            tags,
            hasUpdates: false,
            workspaceId: task.workspace_id || null,
        };
    };

    // Carregar tarefas iniciais
    useEffect(() => {
        const mapped = initialTasks.map(mapTaskFromDB);
        setLocalTasks(mapped);
    }, [initialTasks]);

    // Filtrar tarefas por busca
    const filteredTasks = useMemo(() => {
        if (!searchQuery.trim()) return localTasks;
        const query = searchQuery.toLowerCase();
        return localTasks.filter(
            (task) =>
                task.title.toLowerCase().includes(query) ||
                task.tags?.some((tag) => tag.toLowerCase().includes(query))
  );
    }, [localTasks, searchQuery]);

    // Agrupar tarefas
    const groupedData = useMemo(() => {
        const groups: Record<string, Task[]> = {};

        filteredTasks.forEach((task) => {
            let key: string;

            switch (groupBy) {
                case "status":
                    key = task.status || "Backlog";
                    break;
                case "priority":
                    key = task.priority || "medium";
                    break;
                case "assignee":
                    key = task.assignees?.[0]?.name || "Sem responsável";
                    break;
                default:
                    key = task.status || "Backlog";
            }

            if (!groups[key]) {
                groups[key] = [];
            }
            groups[key].push(task);
        });

        return groups;
    }, [filteredTasks, groupBy]);

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

    // Handler para quando o drag começa
    const handleDragStart = (event: any) => {
        const { active } = event;
        const task = localTasks.find((t) => t.id === active.id);
        setActiveTask(task || null);
    };

    // Handler para quando o drag termina
    const handleDragEnd = async (event: any) => {
        const { active, over } = event;
        setActiveTask(null);
        if (!over) return;

        // Encontrar grupo de origem
        const sourceGroup = Object.entries(groupedData).find(([_, tasks]) =>
            tasks.some((task) => task.id === active.id)
        );
        if (!sourceGroup) return;

        const [sourceGroupKey, sourceTasks] = sourceGroup;
        const sourceTaskIndex = sourceTasks.findIndex((task) => task.id === active.id);
        const task = sourceTasks[sourceTaskIndex];
        if (sourceTaskIndex === -1 || !task) return;

        // Verificar se está arrastando para um grupo (drop zone) ou para uma tarefa
        let destinationGroupKey: string | undefined;
        const isGroupId = Object.keys(groupedData).includes(over.id);
        if (isGroupId) {
            destinationGroupKey = over.id;
        } else {
            destinationGroupKey = Object.entries(groupedData).find(([_, tasks]) =>
                tasks.some((t) => t.id === over.id)
            )?.[0];
        }

        if (!destinationGroupKey) return;

        // Se está no mesmo grupo, apenas reordenar
        if (sourceGroupKey === destinationGroupKey) {
            // TODO: Implementar reordenação dentro do mesmo grupo
            return;
        }

        // Mover para outro grupo
        try {
            let newStatus = task.status;
            if (groupBy === "status") {
                newStatus = destinationGroupKey;
            }

            const statusMap: Record<string, "todo" | "in_progress" | "done" | "archived"> = {
                Backlog: "todo",
                Triagem: "in_progress",
                Execução: "in_progress",
                Revisão: "done",
                Arquivado: "archived",
            };

            const result = await updateTask({
                id: task.id,
                status: statusMap[newStatus] || "todo",
            });

            if (result.success) {
                router.refresh();
            }
        } catch (error) {
            console.error("Erro ao mover tarefa:", error);
        }
    };

    // Handler para adicionar tarefa
    const handleAddTask = async (
        title: string,
        context: { status?: string; priority?: string; assignee?: string }
    ) => {
        try {
            const statusMap: Record<string, "todo" | "in_progress" | "done" | "archived"> = {
                Backlog: "todo",
                Triagem: "in_progress",
                Execução: "in_progress",
                Revisão: "done",
            };

            await createTask({
                title,
                workspace_id: workspaceId,
                status: context.status ? (statusMap[context.status] || "todo") : "todo",
                priority: context.priority as any,
                is_personal: false,
            });

            router.refresh();
        } catch (error) {
            console.error("Erro ao criar tarefa:", error);
        }
    };

    // Handler para toggle de completude
    const handleToggleComplete = async (taskId: string, completed: boolean) => {
        try {
            const result = await updateTask({
                id: taskId,
                status: completed ? "done" : "todo",
            });

            if (result.success) {
                setLocalTasks((prev) =>
                    prev.map((task) =>
                        task.id === taskId ? { ...task, completed } : task
                    )
                );
            }
        } catch (error) {
            console.error("Erro ao atualizar tarefa:", error);
        }
    };

    // Handler para atualização de tarefa
    const handleTaskUpdate = async (
        taskId: string,
        updates: { title?: string; dueDate?: string | null; assigneeId?: string | null }
    ) => {
        try {
            const updateData: any = {};
            if (updates.title) updateData.title = updates.title;
            if (updates.dueDate !== undefined) updateData.due_date = updates.dueDate;
            if (updates.assigneeId !== undefined) updateData.assignee_id = updates.assigneeId;

            const result = await updateTask({
                id: taskId,
                ...updateData,
            });

            if (result.success) {
                setLocalTasks((prev) =>
                    prev.map((task) =>
                        task.id === taskId
                            ? {
                                  ...task,
                                  ...(updates.title && { title: updates.title }),
                                  ...(updates.dueDate !== undefined && {
                                      dueDate: updates.dueDate || undefined,
                                  }),
                              }
                            : task
                    )
                );
            }
        } catch (error) {
            console.error("Erro ao atualizar tarefa:", error);
        }
    };

    // Handler para clique em tarefa
    const handleTaskClick = (taskId: string) => {
        const task = localTasks.find((t) => t.id === taskId);
        if (task) {
            setSelectedTaskId(taskId);
            setTaskDetails(task);
            setIsModalOpen(true);
  }
    };

    // Função para recarregar tarefas
    const reloadTasks = () => {
        router.refresh();
    };

  return (
        <div className="flex-1 flex flex-col overflow-hidden bg-gray-50/50">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white">
        <div className="flex items-center gap-4">
                    {/* Tabs de Contexto */}
                    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ContextTab)}>
                        <TabsList className="bg-white border rounded-lg h-9">
                            <TabsTrigger value="minhas" className="h-7 rounded-md text-sm px-3">
                                Minhas
                            </TabsTrigger>
                            <TabsTrigger value="time" className="h-7 rounded-md text-sm px-3">
                                Time
                            </TabsTrigger>
                            <TabsTrigger value="todas" className="h-7 rounded-md text-sm px-3">
                                Todas
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>

                    {/* Busca */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <Input 
              placeholder="Buscar tarefas..." 
                            className="pl-9 w-[240px] h-9 bg-white rounded-lg border-gray-200 shadow-sm"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
                    {/* Filtro */}
                    <Button
                        variant="outline"
                        className="h-9 px-3 rounded-lg border-gray-200 bg-white hover:bg-gray-50 text-sm font-medium text-gray-700 shadow-sm"
                    >
                        <Filter className="w-4 h-4 mr-2 text-gray-500" />
                        Filtro
                    </Button>

                    {/* Agrupar por */}
                    <Select value={groupBy} onValueChange={(v) => setGroupBy(v as GroupBy)}>
                        <SelectTrigger className="w-[140px] h-9 bg-white rounded-lg border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm">
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
                                "p-1.5 rounded-md transition-all h-7",
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
                                "p-1.5 rounded-md transition-all h-7",
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

      {/* Content */}
            <div className="flex-1 overflow-auto p-6">
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                >
                    {viewMode === "list" ? (
                        <motion.div 
                          variants={STAGGER_CONTAINER}
                          initial="hidden"
                          animate="show"
                          className="space-y-6"
                        >
                            {listGroups.map((group) => (
                                <motion.div key={group.id} variants={STAGGER_ITEM}>
                                    <TaskGroup
                                        id={group.id}
                                        title={group.title}
                                        tasks={group.tasks}
                                        groupBy={groupBy}
                                        onTaskClick={handleTaskClick}
                                        onAddTask={handleAddTask}
                                        onToggleComplete={handleToggleComplete}
                                    />
                                </motion.div>
                            ))}
                        </motion.div>
        ) : (
                        <TaskBoard
                            columns={kanbanColumns}
                            onTaskClick={handleTaskClick}
                            onAddTask={(columnId) => {
                                const context: any = {};
                                if (groupBy === "status") context.status = columnId;
                                if (groupBy === "priority") context.priority = columnId;
                                handleAddTask("", context);
                            }}
                        />
                    )}

                    <DragOverlay>
                        {activeTask ? (
                            <div className="bg-white rounded-lg border border-gray-200 shadow-lg p-4 opacity-90">
                                <p className="text-sm font-medium">{activeTask.title}</p>
          </div>
                        ) : null}
                    </DragOverlay>
                </DndContext>
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
  );
}
