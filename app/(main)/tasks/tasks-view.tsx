"use client";

import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { TaskWithDetails, createTask, updateTask, updateTaskPosition } from "@/lib/actions/tasks";
import { mapStatusToLabel } from "@/lib/config/tasks";
import { arrayMove } from "@dnd-kit/sortable";
import { Member } from "@/lib/actions/members";
import { TaskGroup } from "@/components/tasks/TaskGroup";
import { TaskBoard } from "@/components/tasks/TaskBoard";
import { TaskDetailModal } from "@/components/tasks/TaskDetailModal";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter, List, LayoutGrid, CircleDashed, Cloud, Loader2 } from "lucide-react";
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
    // ✅ MINIFY v2: initialTasks só é usado para inicializar o estado local
    const [localTasks, setLocalTasks] = useState<Task[]>(() =>
        initialTasks.map((task) => mapTaskFromDB(task))
    );


    const [activeTab, setActiveTab] = useState<ContextTab>("todas");
    const [groupBy, setGroupBy] = useState<GroupBy>("status");
    const [viewMode, setViewMode] = useState<ViewMode>("list");
    const [searchQuery, setSearchQuery] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
    const [taskDetails, setTaskDetails] = useState<any>(null);
    const [activeTask, setActiveTask] = useState<Task | null>(null);
    // ✅ MINIFY v2: Estado de sincronização para feedback visual
    const [isSyncing, setIsSyncing] = useState(false);

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

    // ✅ OTIMIZAÇÃO: Função memoizada para evitar recriação
    const mapTaskFromDB = useCallback((task: TaskWithDetails): Task => {

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
    }, []);

    // Filtrar tarefas por busca
    const filteredTasks = useMemo(() => {
        return !searchQuery.trim() ? localTasks : localTasks.filter(
            (task) =>
                task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                task.tags?.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
        );
    }, [localTasks, searchQuery]);

    // Agrupar tarefas
    const groupedData = useMemo(() => {
        const groups: Record<string, Task[]> = {};

        filteredTasks.forEach((task) => {
            let key: string;

            switch (groupBy) {
                case "status":
                    key = task.status || "Não iniciado";
                    break;
                case "priority":
                    key = task.priority || "medium";
                    break;
                case "assignee":
                    key = task.assignees?.[0]?.name || "Sem responsável";
                    break;
                default:
                    key = task.status || "Não iniciado";
            }

            if (!groups[key]) {
                groups[key] = [];
            }
            groups[key].push(task);
        });

        // ✅ Criar novos arrays para cada grupo para garantir novas referências
        // Isso força o React a detectar mudanças mesmo quando o conteúdo é o mesmo
        const newGroups: Record<string, Task[]> = {};
        Object.keys(groups).forEach(key => {
            newGroups[key] = [...groups[key]];
        });

        return newGroups;
    }, [filteredTasks, groupBy]);

    // Converter grupos para formato de colunas (Kanban)
    // ✅ IMPORTANTE: Criar novas referências para garantir que React detecte mudanças
    const kanbanColumns = useMemo(() => {
        const columns = Object.entries(groupedData).map(([key, tasks]) => ({
            id: key,
            title: key,
            tasks: [...tasks], // ✅ Criar novo array para garantir nova referência
        }));

        // Ordenar colunas baseado no tipo de agrupamento
        let sortedColumns;
        if (groupBy === "status") {
            const statusOrder = ["Não iniciado", "Em progresso", "Revisão", "Correção", "Concluido"];
            sortedColumns = columns.sort((a, b) => {
                const aIndex = statusOrder.indexOf(a.title);
                const bIndex = statusOrder.indexOf(b.title);
                if (aIndex === -1 && bIndex === -1) return 0;
                if (aIndex === -1) return 1;
                if (bIndex === -1) return -1;
                return aIndex - bIndex;
            });
        } else if (groupBy === "priority") {
            const priorityOrder = ["urgent", "high", "medium", "low"];
            sortedColumns = columns.sort((a, b) => {
                const aIndex = priorityOrder.indexOf(a.title);
                const bIndex = priorityOrder.indexOf(b.title);
                if (aIndex === -1 && bIndex === -1) return 0;
                if (aIndex === -1) return 1;
                if (bIndex === -1) return -1;
                return aIndex - bIndex;
            });
        } else {
            sortedColumns = columns;
        }

        return [...sortedColumns];
    }, [groupedData, groupBy]);

    // Converter grupos para formato de lista (TaskGroup)
    const listGroups = useMemo(() => {
        return Object.entries(groupedData).map(([key, tasks]) => ({
            id: key,
            title: key,
            tasks,
        }));
    }, [groupedData]);
    
    // Refs para valores que mudam mas não devem causar re-criação de callbacks
    // Criados após os useMemo para terem acesso aos valores calculados
    const localTasksRef = useRef(localTasks);
    localTasksRef.current = localTasks;
    const groupedDataRef = useRef(groupedData);
    groupedDataRef.current = groupedData;
    const kanbanColumnsRef = useRef(kanbanColumns);
    kanbanColumnsRef.current = kanbanColumns;

    // ✅ OTIMIZAÇÃO: Handler memoizado para evitar re-renders
    const handleDragStart = useCallback((event: any) => {
        const { active } = event;
        const task = localTasksRef.current.find((t) => t.id === active.id);
        setActiveTask(task || null);
    }, []);

    // ✅ MINIFY v2: Handler unificado para drag & drop (list e kanban) com rollback
    const handleDragEnd = useCallback((event: any) => {
        const { active, over } = event;
        setActiveTask(null);
        if (!over) return;

        // ✅ 1. Snapshot do estado anterior (para rollback)
        const previousTasks = [...localTasksRef.current];

        const task = localTasksRef.current.find((t) => t.id === active.id);
        if (!task) return;

        // Detectar se está no modo kanban ou list
        if (viewMode === "kanban") {
            // Modo Kanban: trabalhar com colunas
            const currentColumns = kanbanColumnsRef.current;
            const sourceColumn = currentColumns.find((col) =>
                col.tasks.some((t) => t.id === active.id)
            );
            if (!sourceColumn) return;

            // Detectar coluna de destino: pode ser o ID da coluna (droppable) ou uma tarefa dentro dela
            let destinationColumnId: string | undefined;
            
            // Primeiro, verificar se over.id é o ID de uma coluna
            const columnById = currentColumns.find((col) => col.id === over.id);
            if (columnById) {
                destinationColumnId = columnById.id;
            } else {
                // Se não for uma coluna, procurar em qual coluna está a tarefa de destino
                const columnWithTask = currentColumns.find((col) =>
                    col.tasks.some((t) => t.id === over.id)
                );
                if (columnWithTask) {
                    destinationColumnId = columnWithTask.id;
                }
            }

            if (!destinationColumnId) return;

            // Se mesma coluna, reordenar dentro da coluna
            if (sourceColumn.id === destinationColumnId) {
                const sourceTasks = sourceColumn.tasks;
                const oldIndex = sourceTasks.findIndex((t) => t.id === active.id);
                
                // Se over.id é uma tarefa, usar seu índice; senão, adicionar no final
                let newIndex = sourceTasks.findIndex((t) => t.id === over.id);
                if (newIndex === -1) {
                    newIndex = sourceTasks.length - 1;
                }

                if (oldIndex === -1 || oldIndex === newIndex) {
                    return;
                }

                // ✅ 2. Atualização otimista local - reordenar tarefas apenas na coluna específica
                setLocalTasks((prev) => {
                    // Separar tarefas da coluna das outras
                    const columnTaskIds = new Set(sourceTasks.map((t) => t.id));
                    const columnTasks = prev.filter((t) => columnTaskIds.has(t.id));
                    const otherTasks = prev.filter((t) => !columnTaskIds.has(t.id));
                    
                    // Reordenar apenas as tarefas da coluna
                    const reorderedColumnTasks = arrayMove(columnTasks, oldIndex, newIndex);
                    
                    // Reunir todas as tarefas
                    return [...reorderedColumnTasks, ...otherTasks];
                });
                setIsSyncing(true);

                // ✅ 3. Calcular nova posição (usando índice + 1 como posição)
                const newPosition = (newIndex + 1) * 1000;

                // ✅ 4. Backend em background com rollback
                updateTaskPosition({
                    taskId: task.id,
                    newPosition,
                })
                    .then(() => {
                        // Sucesso silencioso
                    })
                    .catch((error) => {
                        console.error("Erro ao reordenar tarefa:", error);
                        // ✅ 5. Rollback em caso de erro
                        setLocalTasks(previousTasks);
                        toast.error("Erro ao salvar ordem. Tente novamente.");
                    })
                    .finally(() => {
                        setIsSyncing(false);
                    });

                return;
            }

            // Preparar atualização baseada no tipo de agrupamento
            const updateData: any = { id: task.id };

            if (groupBy === "status") {
                // Mapear label da UI para status do banco
                const statusMap: Record<string, "todo" | "in_progress" | "done" | "archived" | "review" | "correction"> = {
                    "Backlog": "todo",
                    "Não iniciado": "todo",
                    "Não iniciada": "todo",
                    "Triagem": "in_progress",
                    "Execução": "in_progress",
                    "Em progresso": "in_progress",
                    "Revisão": "review",
                    "Correção": "correction",
                    "Concluido": "done",
                    "Finalizado": "done",
                    "Arquivado": "archived",
                };

                const nextStatusDb = statusMap[destinationColumnId] || "todo";
                updateData.status = nextStatusDb;

                // ✅ 2. Atualização otimista local
                setLocalTasks((prev) =>
                    prev.map((t) =>
                        t.id === task.id ? { ...t, status: destinationColumnId } : t
                    )
                );
            } else if (groupBy === "priority") {
                // A chave da coluna já é o valor da priority (low, medium, high, urgent)
                const nextPriority = destinationColumnId as "low" | "medium" | "high" | "urgent";
                
                // Validar se é um valor válido
                if (!["low", "medium", "high", "urgent"].includes(nextPriority)) {
                    console.warn("Priority inválida:", destinationColumnId);
                    return;
                }

                updateData.priority = nextPriority;

                // ✅ 2. Atualização otimista local - manter status, atualizar apenas priority visualmente
                // O status visual não muda quando agrupamos por priority
                setLocalTasks((prev) =>
                    prev.map((t) =>
                        t.id === task.id ? { ...t, priority: nextPriority } : t
                    )
                );
            } else if (groupBy === "assignee") {
                // Encontrar o membro correspondente ao nome da coluna
                // Member tem estrutura: { user_id, profiles: { full_name, email, avatar_url } }
                const member = members.find((m) => 
                    m.profiles?.full_name === destinationColumnId || 
                    m.profiles?.email === destinationColumnId ||
                    destinationColumnId === "Sem responsável"
                );
                const assigneeId = member?.user_id || null;

                updateData.assignee_id = assigneeId;

                // ✅ 2. Atualização otimista local
                setLocalTasks((prev) =>
                    prev.map((t) =>
                        t.id === task.id
                            ? {
                                  ...t,
                                  assignees: assigneeId && member?.profiles
                                      ? [{ 
                                          name: member.profiles.full_name || member.profiles.email || destinationColumnId, 
                                          id: assigneeId, 
                                          avatar: member.profiles.avatar_url || undefined 
                                      }]
                                      : [],
                              }
                            : t
                    )
                );
            }

            setIsSyncing(true);

            // ✅ 3. Backend em background com rollback
            updateTask(updateData)
                .then(() => {
                    // Sucesso silencioso
                })
                .catch((error) => {
                    console.error("Erro ao mover tarefa:", error);
                    // ✅ 4. Rollback em caso de erro
                    setLocalTasks(previousTasks);
                    toast.error("Erro ao salvar movimento. Tente novamente.");
                })
                .finally(() => {
                    setIsSyncing(false);
                });
        } else {
            // Modo List: trabalhar com grupos
            const currentGroupedData = groupedDataRef.current;

            const sourceGroup = Object.entries(currentGroupedData).find(([_, tasks]) =>
                tasks.some((task) => task.id === active.id)
            );
            if (!sourceGroup) return;

            const [sourceGroupKey, sourceTasks] = sourceGroup;
            const sourceTaskIndex = sourceTasks.findIndex((task) => task.id === active.id);
            const taskInGroup = sourceTasks[sourceTaskIndex];
            if (sourceTaskIndex === -1 || !taskInGroup) return;

            let destinationGroupKey: string | undefined;
            const isGroupId = Object.keys(currentGroupedData).includes(over.id);
            if (isGroupId) {
                destinationGroupKey = over.id;
            } else {
                destinationGroupKey = Object.entries(currentGroupedData).find(([_, tasks]) =>
                    tasks.some((t) => t.id === over.id)
                )?.[0];
            }

            if (!destinationGroupKey) return;

            if (sourceGroupKey === destinationGroupKey) {
                return;
            }

            // ✅ MINIFY v2: mover apenas no estado local, backend em background
            const statusMap: Record<string, "todo" | "in_progress" | "done" | "archived"> = {
                Backlog: "todo",
                Triagem: "in_progress",
                Execução: "in_progress",
                Revisão: "done",
                Arquivado: "archived",
            };

            const currentGroupBy = groupBy;
            let nextStatusLabel = taskInGroup.status;

            if (currentGroupBy === "status") {
                nextStatusLabel = destinationGroupKey;
            }

            const nextStatusDb = statusMap[nextStatusLabel] || "todo";

            // ✅ 2. Atualização otimista local
            setLocalTasks((prev) =>
                prev.map((t) =>
                    t.id === taskInGroup.id ? { ...t, status: nextStatusLabel } : t
                )
            );
            setIsSyncing(true);

            // ✅ 3. Backend em background com rollback
            updateTask({
                id: taskInGroup.id,
                status: nextStatusDb,
            })
                .then(() => {
                    // Sucesso silencioso
                })
                .catch((error) => {
                    console.error("Erro ao mover tarefa:", error);
                    // ✅ 4. Rollback em caso de erro
                    setLocalTasks(previousTasks);
                    toast.error("Erro ao salvar movimento. Tente novamente.");
                })
                .finally(() => {
                    setIsSyncing(false);
                });
        }
    }, [groupBy, viewMode]);

    // ✅ MINIFY v2: Handler de criação com rollback
    const handleAddTask = useCallback((
        title: string,
        context: { status?: string; priority?: string; assignee?: string }
    ) => {
        const statusMap: Record<string, "todo" | "in_progress" | "done" | "archived"> = {
            Backlog: "todo",
            Triagem: "in_progress",
            Execução: "in_progress",
            Revisão: "done",
        };

        const tempId = `temp-${Date.now()}`;
        const nextStatusLabel = context.status || "Backlog";
        const nextStatusDb = statusMap[nextStatusLabel] || "todo";

        // ✅ 1. Snapshot do estado anterior (para rollback)
        const previousTasks = [...localTasksRef.current];

        // ✅ 2. Atualização otimista no estado local
        setLocalTasks((prev) => [
            {
                id: tempId,
                title: title || "Nova tarefa",
                completed: false,
                status: nextStatusLabel,
                priority: context.priority as any,
                assignees: [],
                tags: [],
                hasUpdates: false,
                workspaceId,
            },
            ...prev,
        ]);
        setIsSyncing(true);

        // ✅ 3. Backend em background com rollback
        createTask({
            title: title || "Nova tarefa",
            workspace_id: workspaceId,
            status: nextStatusDb,
            priority: context.priority as any,
            is_personal: false,
        })
            .then((result) => {
                if (!result || !("success" in result)) {
                    throw new Error("Resposta inválida do servidor");
                }
                if (!result.success || !result.data) {
                    throw new Error(result.error || "Erro ao criar tarefa");
                }

                const mapped = mapTaskFromDB(result.data as TaskWithDetails);
                setLocalTasks((prev) =>
                    prev.map((task) => (task.id === tempId ? mapped : task))
                );
            })
            .catch((error) => {
                console.error("Erro ao criar tarefa:", error);
                // ✅ 4. Rollback em caso de erro
                setLocalTasks(previousTasks);
                toast.error("Erro ao criar tarefa. Tente novamente.");
            })
            .finally(() => {
                setIsSyncing(false);
            });
    }, [workspaceId, mapTaskFromDB]);

    // ✅ MINIFY v2: Handler de toggle com rollback
    const handleToggleComplete = useCallback((taskId: string, completed: boolean) => {
        // ✅ 1. Snapshot do estado anterior (para rollback)
        const previousTasks = [...localTasksRef.current];

        // ✅ 2. Atualização otimista
        setLocalTasks((prev) =>
            prev.map((task) =>
                task.id === taskId ? { ...task, completed } : task
            )
        );
        setIsSyncing(true);

        // ✅ 3. Backend em background com rollback
        updateTask({
            id: taskId,
            status: completed ? "done" : "todo",
        })
            .then(() => {
                // Sucesso silencioso
            })
            .catch((error) => {
                console.error("Erro ao atualizar tarefa:", error);
                // ✅ 4. Rollback em caso de erro
                setLocalTasks(previousTasks);
                toast.error("Erro ao atualizar tarefa. Tente novamente.");
            })
            .finally(() => {
                setIsSyncing(false);
            });
    }, []);

    // ✅ MINIFY v2: Handler de atualização com rollback
    const handleTaskUpdate = useCallback((
        taskId: string,
        updates: { title?: string; dueDate?: string | null; assigneeId?: string | null }
    ) => {
        // ✅ 1. Snapshot do estado anterior (para rollback)
        const previous = [...localTasksRef.current];

        // ✅ 2. Atualização otimista
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
        setIsSyncing(true);

        const updateData: any = {};
        if (updates.title) updateData.title = updates.title;
        if (updates.dueDate !== undefined) updateData.due_date = updates.dueDate;
        if (updates.assigneeId !== undefined) updateData.assignee_id = updates.assigneeId;

        // ✅ 3. Backend em background com rollback
        updateTask({
            id: taskId,
            ...updateData,
        })
            .then(() => {
                // Sucesso silencioso
            })
            .catch((error) => {
                console.error("Erro ao atualizar tarefa:", error);
                // ✅ 4. Rollback em caso de erro
                setLocalTasks(previous);
                toast.error("Erro ao atualizar tarefa. Tente novamente.");
            })
            .finally(() => {
                setIsSyncing(false);
            });
    }, []);

    // ✅ OTIMIZAÇÃO: Handler memoizado para evitar re-renders
    const handleTaskClick = useCallback((taskId: string | number) => {
        const taskIdStr = String(taskId);
        const task = localTasksRef.current.find((t) => t.id === taskIdStr);
        if (task) {
            setSelectedTaskId(taskIdStr);
            setTaskDetails(task);
            setIsModalOpen(true);
        }
    }, []);

    // ✅ Atualização otimista: atualiza estado local imediatamente (Optimistic UI)
    const updateLocalTask = useCallback((taskId: string, updates: Partial<Task>) => {
        setLocalTasks((prev) => {
            const taskIndex = prev.findIndex(t => t.id === taskId);
            if (taskIndex === -1) {
                return prev;
            }
            
            // ✅ Criar novo array com imutabilidade garantida
            const updated = prev.map((task, index) => {
                if (index === taskIndex) {
                    return { ...task, ...updates };
                }
                return task;
            });
            
            return updated;
        });
    }, []);

    // ✅ Callback memoizado para optimistic updates (deve vir depois de updateLocalTask)
    const handleOptimisticUpdate = useCallback((taskId: string, updates: Partial<{ title?: string; status?: string; dueDate?: string; priority?: string; assignees?: Array<{ name: string; avatar?: string; id?: string }> }>) => {
        // Mapear updates para o formato do estado local
        const localUpdates: Partial<Task> = {};
        if (updates.title) localUpdates.title = updates.title;
        if (updates.status) {
            // O status já vem como label da UI (ex: "Não iniciado", "Em progresso")
            localUpdates.status = updates.status;
        }
        if (updates.dueDate !== undefined) localUpdates.dueDate = updates.dueDate || undefined;
        if (updates.priority) localUpdates.priority = updates.priority as "low" | "medium" | "high" | "urgent";
        if (updates.assignees) {
            localUpdates.assignees = updates.assignees;
            // ✅ Também atualizar assigneeId se a interface Task tiver esse campo
            // Nota: tasks-view.tsx não usa assigneeId, mas mantemos para consistência
        }
        updateLocalTask(taskId, localUpdates);
    }, [updateLocalTask]);

    // ✅ OTIMIZAÇÃO: Handler memoizado para evitar re-renders
    const reloadTasks = useCallback(() => {
        // MINIFY v2: evitar router.refresh em handlers críticos
        // A atualização otimista é feita via updateLocalTask
        console.log("Simulando refresh opcional…");
    }, []);
    
    // ✅ OTIMIZAÇÃO: Handler memoizado para drag cancel
    const handleDragCancel = useCallback(() => {
        setActiveTask(null);
    }, []);
    
    // ✅ OTIMIZAÇÃO: Handler memoizado para modal change
    const handleModalOpenChange = useCallback((open: boolean) => {
        setIsModalOpen(open);
        if (!open) {
            setTaskDetails(null);
            setSelectedTaskId(null);
        }
    }, []);
    
    // ✅ OTIMIZAÇÃO: Handler memoizado para add task no kanban
    const handleKanbanAddTask = useCallback((columnId: string) => {
        const context: any = {};
        if (groupBy === "status") context.status = columnId;
        if (groupBy === "priority") context.priority = columnId;
        handleAddTask("", context);
    }, [groupBy, handleAddTask]);

  return (
        <div className="flex-1 flex flex-col overflow-hidden bg-gray-50/50 relative">
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

                    {/* ✅ MINIFY v2: Indicador de sincronização discreto */}
                    {isSyncing && (
                      <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 border border-blue-200 rounded-md text-xs text-blue-700">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>Salvando...</span>
                      </div>
                    )}

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
                    onDragCancel={handleDragCancel}
                >
                    {viewMode === "list" ? (
                        <div className="space-y-6">
                            {listGroups.map((group) => (
                                <TaskGroup
                                    key={group.id}
                                    id={group.id}
                                    title={group.title}
                                    tasks={group.tasks}
                                    onTaskClick={handleTaskClick}
                                />
                            ))}
                        </div>
                    ) : (
                        <TaskBoard
                            columns={kanbanColumns}
                            onTaskClick={handleTaskClick}
                            onAddTask={handleKanbanAddTask}
                            onTaskMoved={() => {
                                // ✅ MINIFY v2: Callback vazio, drag já foi processado no handleDragEnd
                                // Backend já foi atualizado em background
                            }}
                            members={members.map((m) => ({
                                id: m.user_id,
                                name: m.profiles?.full_name || m.profiles?.email || "Usuário",
                                avatar: m.profiles?.avatar_url || undefined,
                            }))}
                            groupBy={groupBy}
                            onToggleComplete={handleToggleComplete}
                            onTaskUpdated={reloadTasks}
                            onTaskUpdatedOptimistic={handleOptimisticUpdate}
                            onDelete={reloadTasks}
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
                key={selectedTaskId}
                open={isModalOpen}
                onOpenChange={handleModalOpenChange}
                task={taskDetails}
                mode={selectedTaskId ? "edit" : "create"}
                onTaskCreated={reloadTasks}
                onTaskUpdated={reloadTasks}
                onTaskUpdatedOptimistic={handleOptimisticUpdate}
      />
    </div>
  );
}
