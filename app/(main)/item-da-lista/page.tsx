"use client";

import { TaskRow as TaskRowTasks } from "@/components/tasks/TaskRow";
import { TaskRow as TaskRowHome } from "@/components/home/TaskRow";
import { KanbanCard } from "@/components/tasks/KanbanCard";
import { TaskCard as TaskCardTasks } from "@/components/tasks/TaskCard";
import { TaskCard as TaskCardHome } from "@/components/home/TaskCard";
import { Database } from "@/types/database.types";

type TaskFromDB = Database["public"]["Tables"]["tasks"]["Row"];

export default function ItemDaListaPage() {
    // Mock data para TaskRow (tasks) - versão completa
    const taskRowTasksData = {
        id: "task-1",
        title: "Redesign do Site da Agência V4",
        completed: false,
        priority: "high" as const,
        status: "Execução",
        assignees: [
            { name: "Maria Silva", avatar: undefined },
            { name: "João Santos", avatar: undefined },
        ],
        dueDate: "2024-12-20",
        tags: ["Design", "Urgente", "Cliente X"],
        hasUpdates: true,
    };

    // Mock data para TaskRow (home) - precisa do objeto Task completo
    const taskRowHomeData: TaskFromDB = {
        id: "task-2",
        title: "Revisar proposta comercial",
        description: null,
        status: "todo",
        priority: "medium",
        workspace_id: "workspace-123",
        is_personal: false,
        created_by: "user-1",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        assignee_id: null,
        due_date: "2024-12-18",
        position: 1,
        origin_context: null,
    };

    // Mock data para KanbanCard
    const kanbanCardData = {
        id: "task-3",
        title: "Implementar sistema de notificações",
        completed: false,
        priority: "urgent" as const,
        assignees: [{ name: "Ana Costa", avatar: undefined }],
        dueDate: "2024-12-15",
        tags: ["Backend", "Urgente"],
        workspaceColor: "#3B82F6",
        subtasksCount: 5,
        commentsCount: 3,
    };

    // Mock data para TaskCard (tasks)
    const taskCardTasksData = {
        id: "task-4",
        title: "Criar documentação da API",
        completed: false,
        priority: "medium" as const,
        assignees: [{ name: "Pedro Lima", avatar: undefined }],
        dueDate: "2024-12-25",
        tags: ["Documentação"],
        checklistTotal: 8,
        checklistCompleted: 3,
        attachmentsCount: 2,
        commentsCount: 5,
    };

    // Mock data para TaskCard (home)
    const taskCardHomeData = {
        id: "task-5",
        title: "Tarefa rápida pessoal",
        status: "todo" as const,
        isQuickAdd: true,
    };

    const taskCardHomeWorkspaceData = {
        id: "task-6",
        title: "Tarefa de workspace oficial",
        status: "in_progress" as const,
        isQuickAdd: false,
        workspaceColor: "#10B981",
    };

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-7xl mx-auto space-y-12">
                {/* Header */}
                <div className="bg-white rounded-xl shadow-sm p-8">
                    <h1 className="text-3xl font-bold mb-2">Design Lab - Modelos de Item de Lista</h1>
                    <p className="text-gray-600">
                        Comparação visual de todos os modelos de item de lista de tarefas identificados no projeto.
                    </p>
                </div>

                {/* 1. TaskRow (tasks) - Versão Completa */}
                <div className="bg-white rounded-xl shadow-sm p-8">
                    <div className="mb-6">
                        <h2 className="text-2xl font-bold mb-2">1. TaskRow (tasks) - Versão Completa</h2>
                        <p className="text-sm text-gray-500 mb-1">
                            <strong>Localização:</strong> <code>components/tasks/TaskRow.tsx</code>
                        </p>
                        <p className="text-sm text-gray-500 mb-1">
                            <strong>Uso:</strong> Página Tasks (/tasks) - Lista
                        </p>
                        <p className="text-sm text-gray-500">
                            <strong>Características:</strong> Design polido (Linear style), drag handle, workspace bar, tags, assignees, data, status, drag & drop
                        </p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                            <TaskRowTasks
                                {...taskRowTasksData}
                                onClick={() => console.log("Click")}
                                onToggleComplete={(id, completed) => console.log("Toggle", id, completed)}
                            />
                        </div>
                    </div>
                </div>

                {/* 2. TaskRow (home) - Versão Simples */}
                <div className="bg-white rounded-xl shadow-sm p-8">
                    <div className="mb-6">
                        <h2 className="text-2xl font-bold mb-2">2. TaskRow (home) - Versão Simples</h2>
                        <p className="text-sm text-gray-500 mb-1">
                            <strong>Localização:</strong> <code>components/home/TaskRow.tsx</code>
                        </p>
                        <p className="text-sm text-gray-500 mb-1">
                            <strong>Uso:</strong> Página Home (/home) - Colunas da Semana
                        </p>
                        <p className="text-sm text-gray-500">
                            <strong>Características:</strong> Design simples, checkbox + título, barra de workspace vertical, botões Edit/Delete
                        </p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                            <TaskRowHome
                                task={taskRowHomeData}
                                onToggle={(id, checked) => console.log("Toggle", id, checked)}
                                onEdit={async (id, newTitle) => console.log("Edit", id, newTitle)}
                                onDelete={(id) => console.log("Delete", id)}
                            />
                        </div>
                    </div>
                </div>

                {/* 3. KanbanCard */}
                <div className="bg-white rounded-xl shadow-sm p-8">
                    <div className="mb-6">
                        <h2 className="text-2xl font-bold mb-2">3. KanbanCard</h2>
                        <p className="text-sm text-gray-500 mb-1">
                            <strong>Localização:</strong> <code>components/tasks/KanbanCard.tsx</code>
                        </p>
                        <p className="text-sm text-gray-500 mb-1">
                            <strong>Uso:</strong> Página Tasks (/tasks) - Kanban
                        </p>
                        <p className="text-sm text-gray-500">
                            <strong>Características:</strong> Card estilo Trello, traço colorido superior, tags, assignees, data, subtasks, comentários
                        </p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <div className="w-[300px]">
                            <KanbanCard
                                {...kanbanCardData}
                                onClick={() => console.log("Click")}
                                onDelete={() => console.log("Delete")}
                            />
                        </div>
                    </div>
                </div>

                {/* 4. TaskCard (tasks) - Versão Completa */}
                <div className="bg-white rounded-xl shadow-sm p-8">
                    <div className="mb-6">
                        <h2 className="text-2xl font-bold mb-2">4. TaskCard (tasks) - Versão Completa</h2>
                        <p className="text-sm text-gray-500 mb-1">
                            <strong>Localização:</strong> <code>components/tasks/TaskCard.tsx</code>
                        </p>
                        <p className="text-sm text-gray-500 mb-1">
                            <strong>Uso:</strong> Página Assistant (/assistant)
                        </p>
                        <p className="text-sm text-gray-500">
                            <strong>Características:</strong> Card completo, checklist, anexos, comentários, drag & drop
                        </p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <div className="w-[300px]">
                            <TaskCardTasks
                                {...taskCardTasksData}
                                onClick={() => console.log("Click")}
                                onEdit={() => console.log("Edit")}
                                onDelete={() => console.log("Delete")}
                            />
                        </div>
                    </div>
                </div>

                {/* 5. TaskCard (home) - Versão Simples */}
                <div className="bg-white rounded-xl shadow-sm p-8">
                    <div className="mb-6">
                        <h2 className="text-2xl font-bold mb-2">5. TaskCard (home) - Versão Simples</h2>
                        <p className="text-sm text-gray-500 mb-1">
                            <strong>Localização:</strong> <code>components/home/TaskCard.tsx</code>
                        </p>
                        <p className="text-sm text-gray-500 mb-1">
                            <strong>Uso:</strong> Não encontrado em uso ativo
                        </p>
                        <p className="text-sm text-gray-500">
                            <strong>Características:</strong> Card simples, Quick Add vs Workspace
                        </p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 space-y-4">
                        <div>
                            <p className="text-xs text-gray-500 mb-2">Variante: Quick Add (Pessoal)</p>
                            <div className="w-[300px]">
                                <TaskCardHome {...taskCardHomeData} />
                            </div>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 mb-2">Variante: Workspace (Oficial)</p>
                            <div className="w-[300px]">
                                <TaskCardHome {...taskCardHomeWorkspaceData} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Resumo */}
                <div className="bg-white rounded-xl shadow-sm p-8">
                    <h2 className="text-2xl font-bold mb-4">Resumo</h2>
                    <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-green-500"></span>
                            <span><strong>Total de modelos:</strong> 5</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                            <span><strong>Em uso ativo:</strong> 4</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-gray-400"></span>
                            <span><strong>Não usado:</strong> 1 (TaskCard home)</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}


