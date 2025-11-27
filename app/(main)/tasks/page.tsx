"use client";

import { useState, useMemo } from "react";
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
import { Search, Filter, Plus, List, LayoutGrid } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

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
    const [activeTab, setActiveTab] = useState<ContextTab>("todas");
    const [viewMode, setViewMode] = useState<ViewMode>("list");
    const [groupBy, setGroupBy] = useState<GroupBy>("status");
    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Dados mockados com status customizáveis
    const mockTasks: Task[] = [
        {
            id: "1",
            title: "Revisar proposta comercial para cliente X",
            completed: false,
            priority: "urgent",
            status: "Backlog",
            assignees: [{ name: "João Silva" }],
            dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
            tags: ["Comercial"],
            hasUpdates: true,
        },
        {
            id: "2",
            title: "Enviar relatório mensal de vendas",
            completed: false,
            priority: "high",
            status: "Triagem",
            assignees: [{ name: "Maria Santos" }, { name: "Pedro Costa" }],
            dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
            tags: ["Financeiro"],
            hasUpdates: true,
        },
        {
            id: "3",
            title: "Finalizar design do novo produto",
            completed: false,
            priority: "urgent",
            status: "Execução",
            assignees: [{ name: "Ana Lima" }],
            dueDate: new Date().toISOString(), // Hoje (Urgente)
            tags: ["Design"],
            hasUpdates: true,
        },
        {
            id: "4",
            title: "Preparar apresentação para reunião de diretoria",
            completed: false,
            priority: "high",
            status: "Backlog",
            assignees: [],
            dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
            tags: ["Executivo"],
        },
        {
            id: "5",
            title: "Atualizar documentação técnica",
            completed: true,
            priority: "medium",
            status: "Revisão",
            assignees: [{ name: "Carlos Oliveira" }],
            dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            tags: ["Técnico"],
        },
        {
            id: "6",
            title: "Implementar nova feature de autenticação",
            completed: false,
            priority: "high",
            status: "Execução",
            assignees: [{ name: "Lucas Ferreira" }, { name: "Julia Alves" }],
            // Próximo domingo (Foco Semanal)
            dueDate: (() => {
                const today = new Date();
                const dayOfWeek = today.getDay();
                const daysUntilSunday = dayOfWeek === 0 ? 7 : 7 - dayOfWeek;
                const nextSunday = new Date(today);
                nextSunday.setDate(today.getDate() + daysUntilSunday);
                nextSunday.setHours(0, 0, 0, 0);
                return nextSunday.toISOString();
            })(),
            tags: ["Desenvolvimento"],
        },
        {
            id: "7",
            title: "Revisar campanha de marketing digital",
            completed: false,
            priority: "medium",
            status: "Triagem",
            assignees: [{ name: "Mariana Rocha" }],
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            tags: ["Marketing"],
        },
        {
            id: "8",
            title: "Organizar evento de lançamento",
            completed: false,
            priority: "high",
            status: "Execução",
            assignees: [{ name: "Roberto Silva" }, { name: "Fernanda Lima" }],
            dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
            tags: ["Eventos"],
        },
        {
            id: "9",
            title: "Validar testes de integração",
            completed: false,
            priority: "medium",
            status: "Revisão",
            assignees: [{ name: "Carlos Oliveira" }],
            dueDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
            tags: ["QA"],
        },
        {
            id: "10",
            title: "Criar wireframes para nova interface",
            completed: false,
            priority: "low",
            status: "Backlog",
            assignees: [{ name: "Ana Lima" }],
            dueDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString(),
            tags: ["Design"],
        },
    ];

    // Função de agrupamento dinâmico
    const groupedData = useMemo(() => {
        const groups: Record<string, Task[]> = {};

        mockTasks.forEach((task) => {
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
    }, [groupBy]);

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

    const handleTaskClick = (taskId: string) => {
        setSelectedTaskId(taskId);
        setIsModalOpen(true);
    };

    const getTaskForModal = () => {
        if (!selectedTaskId) return undefined;

        const task = mockTasks.find((t) => t.id === selectedTaskId);

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
        <div className="p-6 bg-gray-50 min-h-screen">
            {/* Header Unificado - Barra de Ferramentas */}
            <div className="mb-6">
                <div className="flex items-center justify-between">
                    {/* Lado Esquerdo: Tabs de Contexto (Segmented Control) */}
                    <Tabs
                        value={activeTab}
                        onValueChange={(value) => setActiveTab(value as ContextTab)}
                        className="w-auto"
                    >
                        <TabsList className="bg-gray-100 p-1 rounded-lg h-9">
                            <TabsTrigger
                                value="minhas"
                                className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md text-sm font-medium px-4 py-1.5 transition-all"
                            >
                                Minhas
                            </TabsTrigger>
                            <TabsTrigger
                                value="time"
                                className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md text-sm font-medium px-4 py-1.5 transition-all"
                            >
                                Time
                            </TabsTrigger>
                            <TabsTrigger
                                value="todas"
                                className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md text-sm font-medium px-4 py-1.5 transition-all"
                            >
                                Todas
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>

                    {/* Lado Direito: Ferramentas (todos h-9) */}
                    <div className="flex items-center gap-2">
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
                        <div className="flex items-center gap-2">
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
                        </div>

                        {/* View Switcher */}
                        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 h-9">
                            <button
                                onClick={() => setViewMode("list")}
                                className={cn(
                                    "px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 h-7",
                                    viewMode === "list"
                                        ? "bg-white text-gray-900 shadow-sm"
                                        : "text-gray-600 hover:text-gray-900"
                                )}
                            >
                                <List className="w-4 h-4" />
                                Lista
                            </button>
                            <button
                                onClick={() => setViewMode("kanban")}
                                className={cn(
                                    "px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 h-7",
                                    viewMode === "kanban"
                                        ? "bg-white text-gray-900 shadow-sm"
                                        : "text-gray-600 hover:text-gray-900"
                                )}
                            >
                                <LayoutGrid className="w-4 h-4" />
                                Kanban
                            </button>
                        </div>

                        {/* Nova Tarefa */}
                        <Button size="sm" className="h-9 bg-green-600 hover:bg-green-700">
                            <Plus className="w-4 h-4 mr-2" />
                            Nova Tarefa
                        </Button>
                    </div>
                </div>
            </div>

            {/* Conteúdo: Lista ou Kanban */}
            {viewMode === "list" ? (
                <div className="space-y-0">
                    {listGroups.map((group) => (
                        <TaskGroup
                            key={group.id}
                            title={group.title}
                            tasks={group.tasks}
                            onTaskClick={handleTaskClick}
                            onAddTask={() => console.log(`Adicionar tarefa em ${group.title}`)}
                        />
                    ))}
                </div>
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
    );
}
