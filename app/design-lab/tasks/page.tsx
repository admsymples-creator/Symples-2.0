"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { TaskDetailModal } from "@/components/tasks/TaskDetailModal";

export default function DesignLabTasksPage() {
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Dados mock para teste
const mockTask = {
        id: "task-1",
        title: "Redesign do Site da Agência V4",
        description: "Atualizar o design do site principal da agência, incluindo nova identidade visual e melhorias na experiência do usuário.",
        status: "in_progress" as const,
        assignee: {
            name: "Maria Silva",
            avatar: undefined,
        },
        dueDate: "2024-12-20",
        tags: ["Design", "Urgente", "Cliente X"],
        breadcrumbs: ["Agência V4", "Projetos", "Redesign Site"],
        contextMessage: {
            type: "audio" as const,
            content: "Preciso que você faça o redesign do site da agência. Vou enviar as referências depois.",
            timestamp: "Hoje às 14:30",
        },
        subTasks: [
            { id: "1", title: "Criar wireframes", completed: true },
            { id: "2", title: "Definir paleta de cores", completed: true },
            { id: "3", title: "Desenvolver componentes", completed: false },
            { id: "4", title: "Testes de usabilidade", completed: false },
        ],
        activities: [
            {
                id: "1",
                type: "created" as const,
                user: "João Santos",
                timestamp: "2 dias atrás",
            },
            {
                id: "2",
                type: "commented" as const,
                user: "Maria Silva",
                message: "Vou começar pelos wireframes hoje.",
                timestamp: "1 dia atrás",
            },
            {
                id: "3",
                type: "file_shared" as const,
                user: "Maria Silva",
                timestamp: "Hoje às 10:00",
                file: {
                    name: "wireframes-v1.pdf",
                    type: "pdf" as const,
                    size: "3.2 MB",
                },
            },
            {
                id: "4",
                type: "audio" as const,
                user: "Maria Silva",
                timestamp: "Hoje às 12:00",
                audio: {
                    duration: 14,
                },
            },
            {
                id: "5",
                type: "updated" as const,
                user: "João Santos",
                timestamp: "Hoje às 14:30",
            },
        ],
    };

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-4xl mx-auto">
                <div className="bg-white rounded-xl shadow-sm p-8">
                    <h1 className="text-3xl font-bold mb-2">Design Lab - Modal de Tarefa</h1>
                    <p className="text-gray-600 mb-8">
                        Preview do componente TaskDetailModal com foco em Context-First.
                    </p>

                    <div className="space-y-4">
                        <Button
                            onClick={() => setIsModalOpen(true)}
                            className="bg-green-600 hover:bg-green-700"
                        >
                            Abrir Modal de Teste
                        </Button>

                        <div className="mt-8 p-6 bg-gray-50 rounded-lg border border-gray-200">
                            <h2 className="text-lg font-semibold mb-4">Dados Mock Utilizados:</h2>
                            <pre className="text-xs overflow-auto">
                                {JSON.stringify(mockTask, null, 2)}
                            </pre>
                        </div>
                    </div>
                </div>
            </div>

            <TaskDetailModal
                open={isModalOpen}
                onOpenChange={setIsModalOpen}
                task={mockTask}
            />
        </div>
    );
}

