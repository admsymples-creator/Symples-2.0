'use client'

import { useState, useCallback, useMemo, useRef } from 'react';
import { DndContext, useSensor, useSensors, PointerSensor, KeyboardSensor, closestCorners, DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { toast } from 'sonner';
import { updateTaskPosition } from '@/actions/update-task-position';
import { TaskGroup } from './TaskGroup';

interface Task {
    id: string;
    title: string;
    completed: boolean;
    priority?: "low" | "medium" | "high" | "urgent";
    status: string;
    assignees?: Array<{ name: string; avatar?: string; id?: string }>;
    assigneeId?: string | null;
    dueDate?: string;
    tags?: string[];
    hasUpdates?: boolean;
    workspaceId?: string | null;
    group?: { id: string; name: string; color?: string };
    hasComments?: boolean;
    commentCount?: number;
    position?: number; // Posição para ordenação (Floating Point)
}

interface TaskListProps {
    initialTasks: Task[];
    onTaskClick?: (taskId: string) => void;
    onToggleComplete?: (taskId: string, completed: boolean) => void;
    onTaskUpdated?: () => void;
    onTaskDeleted?: () => void;
    members?: Array<{ id: string; name: string; avatar?: string }>;
    groupBy?: string;
}

export function TaskList({ 
    initialTasks, 
    onTaskClick,
    onToggleComplete,
    onTaskUpdated,
    onTaskDeleted,
    members = [],
    groupBy = "status"
}: TaskListProps) {
    // ✅ SINGLE SOURCE OF TRUTH - REGRA #1: initialTasks usado APENAS no useState inicial
    // ✅ Usar função inicializadora + structuredClone para garantir isolamento completo
    // ✅ Após o mount, tasks é completamente autônomo e NÃO lê initialTasks
    const [tasks, setTasks] = useState<Task[]>(() => {
        // Clone profundo para garantir que initialTasks não seja referenciado após o mount
        try {
            return structuredClone(initialTasks);
        } catch {
            // Fallback para navegadores que não suportam structuredClone
            return JSON.parse(JSON.stringify(initialTasks));
        }
    });
    const [activeId, setActiveId] = useState<string | null>(null);

    // ✅ Ref mantém acesso aos dados sem causar re-render nas funções
    const tasksRef = useRef(tasks);
    tasksRef.current = tasks;

    // ✅ REGRA #4: Sensores memoizados por definição - useSensors já cria instâncias estáveis
    // Os sensores são criados uma única vez e não são recriados em re-renders
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(KeyboardSensor)
    );

    // Memoizar IDs das tasks para SortableContext
    const taskIds = useMemo(() => tasks.map(t => t.id), [tasks]);

    const handleDragStart = useCallback((event: DragStartEvent) => {
        setActiveId(event.active.id as string);
    }, []);

    // ✅ REGRA #3: handleDragEnd usa useCallback([]) + functional update
    const handleDragEnd = useCallback((event: DragEndEvent) => {
        const { active, over } = event;
        setActiveId(null);

        if (!over || active.id === over.id) return;

        // ✅ Functional update: setTasks(prev => ...) sem dependências de tasks
        setTasks((prevTasks) => {
            // Usar prevTasks diretamente ao invés de tasksRef para garantir consistência
            const activeIndex = prevTasks.findIndex(t => t.id === active.id);
            const overIndex = prevTasks.findIndex(t => t.id === over.id);

            if (activeIndex === -1 || overIndex === -1) return prevTasks;

            // 1. Optimistic Update (Calcula nova lista)
            const newTasks = arrayMove(prevTasks, activeIndex, overIndex);

            // 2. Lógica de Negócio (Ordem Float)
            const movedItem = newTasks.find(t => t.id === active.id);
            if (!movedItem) return newTasks;

            const movedIndex = newTasks.indexOf(movedItem);
            const prevItem = newTasks[movedIndex - 1];
            const nextItem = newTasks[movedIndex + 1];
            
            // Lógica simples de média para evitar re-indexar tudo
            const prevOrder = prevItem?.position ?? (movedItem.position ?? 0) - 1000;
            const nextOrder = nextItem?.position ?? (movedItem.position ?? 0) + 1000;
            const newOrder = (prevOrder + nextOrder) / 2;

            // 3. Sync Server (Assíncrono, não bloqueia)
            // Usar tasksRef para acessar o valor atualizado após o setState
            setTimeout(() => {
                const currentTasks = tasksRef.current;
                const currentMovedItem = currentTasks.find(t => t.id === active.id);
                if (currentMovedItem) {
                    toast.promise(
                        updateTaskPosition(currentMovedItem.id, currentMovedItem.status, newOrder),
                        { 
                            loading: 'Salvando...', 
                            success: 'Salvo!', 
                            error: 'Erro ao salvar' 
                        }
                    );
                }
            }, 0);

            return newTasks;
        });
    }, []); // ✅ Dependências VAZIAS [] são obrigatórias!

    // Agrupar tasks para renderização (mantendo estrutura visual atual)
    const groupedTasks = useMemo(() => {
        const groups: Record<string, Task[]> = {};
        
        tasks.forEach((task) => {
            let groupKey = "Inbox";
            
            switch (groupBy) {
                case "status":
                    groupKey = task.status || "Sem Status";
                    break;
                case "priority":
                    const priorityLabels: Record<string, string> = {
                        "urgent": "Urgente",
                        "high": "Alta",
                        "medium": "Média",
                        "low": "Baixa",
                    };
                    groupKey = priorityLabels[task.priority || "medium"] || "Média";
                    break;
                case "group":
                    groupKey = task.group?.id || "inbox";
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
    }, [tasks, groupBy]);

    return (
        <DndContext 
            id="fixed-dnd-context-id" 
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <SortableContext
                items={taskIds}
                strategy={verticalListSortingStrategy}
            >
                <div className="space-y-0">
                    {Object.entries(groupedTasks).map(([groupKey, groupTasks]) => (
                        <TaskGroup
                            key={groupKey}
                            id={groupKey}
                            title={groupKey}
                            tasks={groupTasks}
                            onTaskClick={onTaskClick}
                            onToggleComplete={onToggleComplete}
                            onTaskUpdated={onTaskUpdated}
                            onTaskDeleted={onTaskDeleted}
                            members={members}
                            groupBy={groupBy}
                        />
                    ))}
                </div>
            </SortableContext>
        </DndContext>
    );
}


