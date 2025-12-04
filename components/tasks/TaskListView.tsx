"use client";

import React, { memo } from 'react';
import { TaskList } from './TaskList';

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
    position?: number;
}

interface TaskListViewProps {
    tasks: Task[];
    isLoading: boolean;
    workspaceId?: string | null;
    onTaskClick?: (taskId: string) => void;
    onToggleComplete?: (taskId: string, completed: boolean) => void;
    onTaskUpdated?: () => void;
    onTaskDeleted?: () => void;
    members?: Array<{ id: string; name: string; avatar?: string }>;
    groupBy?: string;
}

// Componente de loading placeholder
const LoadingSpinner = ({ count = 4 }: { count?: number }) => (
    <div className="space-y-0">
        {Array.from({ length: count }).map((_, i) => (
            <div
                key={i}
                className="flex items-center w-full border-b border-gray-100 bg-white h-10 px-4 animate-pulse"
            >
                <div className="flex items-center gap-3 w-full">
                    <div className="w-4 h-4 rounded border border-gray-200 bg-gray-100" />
                    <div className="flex-1 h-4 bg-gray-200 rounded" />
                    <div className="w-24 h-4 bg-gray-200 rounded" />
                </div>
            </div>
        ))}
    </div>
);

/**
 * Componente wrapper memoizado para blindar TaskList de re-renderizações desnecessárias
 * 
 * Este componente recebe as props do hook useTasks e as repassa para TaskList,
 * mas só re-renderiza quando as props realmente mudam (comparação de referência).
 * 
 * REGRA DE OURO:
 * - Usa React.memo para evitar re-renders quando props não mudam
 * - Estabiliza referências de arrays/objetos quando necessário
 * - Mostra loading state apenas quando necessário
 */
const TaskListViewComponent = ({
    tasks,
    isLoading,
    workspaceId,
    onTaskClick,
    onToggleComplete,
    onTaskUpdated,
    onTaskDeleted,
    members = [],
    groupBy = "status"
}: TaskListViewProps) => {
    // ✅ Mostrar loading apenas quando está carregando E não há tarefas
    // Se já houver tarefas, mostrar elas mesmo durante refetch
    if (isLoading && tasks.length === 0) {
        return <LoadingSpinner count={4} />;
    }

    // ✅ Renderizar TaskList - React.memo customizado já faz comparação profunda por IDs
    // Não precisa de useMemo intermediário - o memo customizado já estabiliza as referências
    return (
        <TaskList
            initialTasks={tasks}
            workspaceId={workspaceId}
            onTaskClick={onTaskClick}
            onToggleComplete={onToggleComplete}
            onTaskUpdated={onTaskUpdated}
            onTaskDeleted={onTaskDeleted}
            members={members}
            groupBy={groupBy}
        />
    );
};

/**
 * Export memoizado: O React só re-renderiza se as props mudarem (comparação de referência)
 * 
 * Isso previne re-renderizações em cascata quando o componente pai atualiza
 * estados internos que não afetam as props deste componente.
 */
export const TaskListView = memo(TaskListViewComponent, (prevProps, nextProps) => {
    // Comparação customizada para otimização adicional
    // Retorna true se props são iguais (não re-renderizar)
    // Retorna false se props mudaram (re-renderizar)
    
    // Comparar arrays de tasks por referência e comprimento
    if (prevProps.tasks !== nextProps.tasks) {
        // Se a referência mudou, verificar se o conteúdo mudou
        if (prevProps.tasks.length !== nextProps.tasks.length) {
            return false; // Re-renderizar se comprimento mudou
        }
        
        // Comparação rápida: verificar se IDs mudaram
        const prevIds = prevProps.tasks.map(t => t.id).join(',');
        const nextIds = nextProps.tasks.map(t => t.id).join(',');
        if (prevIds !== nextIds) {
            return false; // Re-renderizar se IDs mudaram
        }
    }
    
    // Comparar outras props primitivas
    if (
        prevProps.isLoading !== nextProps.isLoading ||
        prevProps.groupBy !== nextProps.groupBy ||
        prevProps.members !== nextProps.members ||
        prevProps.workspaceId !== nextProps.workspaceId
    ) {
        return false; // Re-renderizar se props primitivas mudaram
    }
    
    // Comparar callbacks por referência (se mudaram, re-renderizar)
    if (
        prevProps.onTaskClick !== nextProps.onTaskClick ||
        prevProps.onToggleComplete !== nextProps.onToggleComplete ||
        prevProps.onTaskUpdated !== nextProps.onTaskUpdated ||
        prevProps.onTaskDeleted !== nextProps.onTaskDeleted
    ) {
        return false; // Re-renderizar se callbacks mudaram
    }
    
    // Todas as props são iguais, não re-renderizar
    return true;
});
