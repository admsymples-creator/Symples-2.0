'use client';

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
    DndContext,
    DragOverlay,
    closestCorners,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragStartEvent,
    DragEndEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { toast } from 'sonner';
import { TaskGroup } from './TaskGroup';
import { TaskRowMinify } from './TaskRowMinify';
import { updateTaskPosition } from '@/lib/actions/tasks';
import { ORDERED_STATUSES, STATUS_TO_LABEL, TASK_CONFIG } from '@/lib/config/tasks';

type MinimalTask = {
    id: string | number;
    title: string;
    status: string;
    position?: number | null;
    dueDate?: string;
    completed?: boolean;
    priority?: "low" | "medium" | "high" | "urgent";
    assignees?: Array<{ name: string; avatar?: string; id?: string }>;
    commentCount?: number;
    commentsCount?: number;
};

interface TaskListProps {
    initialTasks: MinimalTask[];
    workspaceId?: string | null;
    onTaskClick?: (taskId: string | number) => void;
    onTaskUpdated?: () => void;
    onTaskDeleted?: () => void;
    members?: Array<{ id: string; name: string; avatar?: string }>;
}

const GROUPS = ORDERED_STATUSES.map((status) => ({
    id: status,
    title: STATUS_TO_LABEL[status],
    color: TASK_CONFIG[status]?.lightColor || 'bg-gray-200',
}));

// Função auxiliar para extrair cor do nome da classe Tailwind ou retornar o valor direto
const extractColorFromClass = (colorClass?: string): string | undefined => {
    if (!colorClass) return undefined;
    // Se já for uma cor hex, retornar direto
    if (colorClass.startsWith('#')) {
        return colorClass;
    }
    // Extrair nome da cor de classes Tailwind como "bg-red-500" -> "red"
    // ou "bg-gray-200" -> "gray"
    const match = colorClass.match(/bg-(\w+)(?:-\d+)?/);
    return match ? match[1] : undefined;
};

export function TaskList({ initialTasks, workspaceId, onTaskClick, onTaskUpdated, onTaskDeleted, members }: TaskListProps) {
    void workspaceId;
    const [tasks, setTasks] = useState<MinimalTask[]>(() => [...initialTasks]);
    const [activeId, setActiveId] = useState<string | null>(null);
    const tasksRef = useRef(tasks);
    tasksRef.current = tasks;
    
    // Log quando tasks mudam
    useEffect(() => {
        console.log("🟪 [TaskList] Estado tasks mudou, nova quantidade:", tasks.length);
        console.log("🟪 [TaskList] IDs das tarefas:", tasks.map(t => String(t.id)));
    }, [tasks]);

    // ✅ Atualização otimista: atualiza estado local imediatamente
    const handleOptimisticUpdate = useCallback((taskId: string | number, updates: Partial<{ title?: string; dueDate?: string; status?: string; priority?: string; assignees?: Array<{ name: string; avatar?: string; id?: string }> }>) => {
        setTasks((prev) => {
            const taskIndex = prev.findIndex(t => String(t.id) === String(taskId));
            if (taskIndex === -1) {
                return prev;
            }
            
            const updated = prev.map((task, index) => {
                if (index === taskIndex) {
                    const taskUpdates: Partial<MinimalTask> = {};
                    if (updates.title) taskUpdates.title = updates.title;
                    if (updates.dueDate !== undefined) taskUpdates.dueDate = updates.dueDate;
                    if (updates.status) taskUpdates.status = updates.status;
                    if (updates.priority) taskUpdates.priority = updates.priority as "low" | "medium" | "high" | "urgent";
                    if (updates.assignees) taskUpdates.assignees = updates.assignees;
                    return { ...task, ...taskUpdates };
                }
                return task;
            });
            
            return updated;
        });
    }, []);

    // ✅ Optimistic Delete: Remove tarefa instantaneamente
    const handleOptimisticDelete = useCallback((taskId: string) => {
        console.log("🔴 [TaskList] handleOptimisticDelete chamado para taskId:", taskId);
        console.log("🔴 [TaskList] tasksRef.current.length:", tasksRef.current.length);
        setTasks((prev) => {
            console.log("🔴 [TaskList] Tarefas antes de remover:", prev.length);
            const filtered = prev.filter(t => String(t.id) !== String(taskId));
            console.log("🔴 [TaskList] Tarefas depois de remover:", filtered.length);
            console.log("🔴 [TaskList] IDs das tarefas removidas/restantes:", {
                antes: prev.map(t => String(t.id)),
                depois: filtered.map(t => String(t.id)),
                removido: taskId
            });
            return filtered;
        });
    }, []);

    // ✅ Optimistic Duplicate: Adiciona tarefa duplicada instantaneamente
    const handleOptimisticDuplicate = useCallback((duplicatedTaskData: any) => {
        console.log("🟢 [TaskList] handleOptimisticDuplicate chamado com dados:", duplicatedTaskData);
        // Mapear dados do backend para MinimalTask
        const newTask: MinimalTask = {
            id: duplicatedTaskData.id,
            title: duplicatedTaskData.title,
            status: duplicatedTaskData.status || 'todo',
            position: duplicatedTaskData.position || null,
            dueDate: duplicatedTaskData.due_date,
            completed: duplicatedTaskData.status === 'done',
            priority: duplicatedTaskData.priority || 'medium',
            assignees: duplicatedTaskData.assignee_id ? [
                {
                    id: duplicatedTaskData.assignee_id,
                    name: duplicatedTaskData.assignee?.full_name || duplicatedTaskData.assignee?.email || 'Usuário',
                    avatar: duplicatedTaskData.assignee?.avatar_url
                }
            ] : undefined,
            commentCount: 0,
            commentsCount: 0,
        };
        
        console.log("🟢 [TaskList] Nova tarefa mapeada:", newTask);
        setTasks((prev) => {
            console.log("🟢 [TaskList] Tarefas antes de adicionar:", prev.length);
            const updated = [...prev, newTask];
            console.log("🟢 [TaskList] Tarefas depois de adicionar:", updated.length);
            return updated;
        });
    }, []);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const tasksByGroup = useMemo(() => {
        console.log("🟦 [TaskList] tasksByGroup recalculando, tasks.length:", tasks.length);
        const groups: Record<string, MinimalTask[]> = {};
        GROUPS.forEach((g) => (groups[g.id] = []));
        tasks.forEach((task) => {
            const status = task.status || 'todo';
            if (groups[status]) {
                groups[status].push(task);
            }
        });
        Object.values(groups).forEach((list) =>
            list.sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
        );
        // ✅ IMPORTANTE: Criar novas referências para garantir que React detecte mudanças
        // Criar novos arrays E novos objetos para cada grupo para forçar re-render
        const newGroups: Record<string, MinimalTask[]> = {};
        Object.keys(groups).forEach((key) => {
            // Criar novos objetos para cada task também (spread operator cria shallow copy)
            newGroups[key] = groups[key].map(task => ({ ...task }));
        });
        console.log("🟦 [TaskList] tasksByGroup calculado, grupos:", Object.keys(newGroups).map(k => ({ key: k, count: newGroups[k].length })));
        return newGroups;
    }, [tasks]);

    const findContainer = useCallback(
        (id: string) => {
            if (GROUPS.find((g) => g.id === id)) return id;
            const task = tasksRef.current.find((t) => String(t.id) === id);
            return task ? task.status : null;
        },
        []
    );

    const handleDragStart = useCallback((event: DragStartEvent) => {
        setActiveId(String(event.active.id));
    }, []);

    const handleDragEnd = useCallback(
        async (event: DragEndEvent) => {
            const { active, over } = event;
            setActiveId(null);
            if (!over) return;

            const activeIdStr = String(active.id);
            const overIdStr = String(over.id);

            const activeTask = tasksRef.current.find((t) => String(t.id) === activeIdStr);
            if (!activeTask) return;

            const activeContainer = findContainer(activeIdStr);
            const overContainer = findContainer(overIdStr);
            if (!activeContainer || !overContainer) return;

            const snapshot = tasksRef.current.map((t) => ({ ...t }));

            // remover ativa
            const movingIndex = snapshot.findIndex((t) => String(t.id) === activeIdStr);
            const moving = snapshot.splice(movingIndex, 1)[0];
            moving.status = overContainer;

            // agrupar por status
            const grouped: Record<string, MinimalTask[]> = {};
            GROUPS.forEach((g) => (grouped[g.id] = []));
            snapshot.forEach((t) => {
                if (!grouped[t.status]) grouped[t.status] = [];
                grouped[t.status].push(t);
            });

            const destList = grouped[overContainer] ?? [];
            const overIndex = destList.findIndex((t) => String(t.id) === overIdStr);
            const targetIndex = overIndex >= 0 ? overIndex : destList.length;
            destList.splice(targetIndex, 0, moving);
            grouped[overContainer] = destList;

            const finalTasks: MinimalTask[] = [];
            GROUPS.forEach((g) => {
                const list = (grouped[g.id] || []).map((t, idx) => ({
                    ...t,
                    position: (idx + 1) * 1000,
                }));
                finalTasks.push(...list);
            });

            setTasks(finalTasks);

            try {
                await toast.promise(
                    updateTaskPosition({
                        taskId: activeIdStr,
                        newPosition: finalTasks.find((t) => String(t.id) === activeIdStr)?.position ?? 1000,
                        newStatus: overContainer as any,
                    }),
                    {
                        loading: 'Salvando posição...',
                        success: 'Posição salva',
                        error: 'Erro ao salvar posição',
                    }
                );
            } catch (error) {
                setTasks(tasksRef.current);
            }
        },
        [findContainer]
    );

    const activeTask = useMemo(() => tasks.find((t) => String(t.id) === activeId), [tasks, activeId]);

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <div className="flex gap-6 overflow-x-auto pb-10 h-full">
                {GROUPS.map((group) => {
                    // ✅ Garantir que sempre passamos uma nova referência de array
                    const groupTasks = tasksByGroup[group.id] || [];
                    console.log("🟦 [TaskList] Renderizando TaskGroup:", {
                        groupId: group.id,
                        tasksCount: groupTasks.length,
                        hasOnTaskDeletedOptimistic: !!handleOptimisticDelete,
                        hasOnTaskDuplicatedOptimistic: !!handleOptimisticDuplicate,
                    });
                    return (
                        <TaskGroup
                            key={group.id}
                            id={group.id}
                            title={group.title}
                            tasks={groupTasks}
                            groupColor={extractColorFromClass(group.color)}
                            workspaceId={workspaceId}
                            onTaskClick={onTaskClick}
                            onTaskUpdated={onTaskUpdated}
                            onTaskDeleted={onTaskDeleted}
                            onTaskUpdatedOptimistic={handleOptimisticUpdate}
                            onTaskDeletedOptimistic={handleOptimisticDelete}
                            onTaskDuplicatedOptimistic={handleOptimisticDuplicate}
                            members={members}
                        />
                    );
                })}
            </div>
            <DragOverlay>
                {activeTask ? <TaskRowMinify task={activeTask} isOverlay /> : null}
            </DragOverlay>
        </DndContext>
    );
}
