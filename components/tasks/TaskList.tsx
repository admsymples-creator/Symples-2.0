'use client';

import React, { useState, useCallback, useMemo, useRef } from 'react';
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
};

interface TaskListProps {
    initialTasks: MinimalTask[];
    workspaceId?: string | null;
    onTaskClick?: (taskId: string | number) => void;
}

const GROUPS = ORDERED_STATUSES.map((status) => ({
    id: status,
    title: STATUS_TO_LABEL[status],
    color: TASK_CONFIG[status]?.lightColor || 'bg-gray-200',
}));

export function TaskList({ initialTasks, workspaceId, onTaskClick }: TaskListProps) {
    void workspaceId;
    const [tasks, setTasks] = useState<MinimalTask[]>(() => [...initialTasks]);
    const [activeId, setActiveId] = useState<string | null>(null);
    const tasksRef = useRef(tasks);
    tasksRef.current = tasks;

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const tasksByGroup = useMemo(() => {
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
        return groups;
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
            <div className="flex gap-4 overflow-x-auto pb-10 h-full">
                {GROUPS.map((group) => (
                    <TaskGroup
                        key={group.id}
                        id={group.id}
                        title={group.title}
                        tasks={tasksByGroup[group.id] || []}
                        onTaskClick={onTaskClick}
                    />
                ))}
            </div>
            <DragOverlay>
                {activeTask ? <TaskRowMinify task={activeTask} isOverlay /> : null}
            </DragOverlay>
        </DndContext>
    );
}
