"use client";

import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { DayColumn } from "@/components/home/DayColumn";
import { WorkspaceCard } from "@/components/home/WorkspaceCard";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Task {
    id: string;
    title: string;
    status: "todo" | "in_progress" | "done";
    date: string; // Formato: "DD/MM"
    isQuickAdd?: boolean; // Tarefa rápida (pessoal) vs Workspace (oficial)
    workspaceColor?: string; // Cor do workspace para badge
}

const MOCK_WORKSPACES = [
    { id: "1", name: "Agência V4", pendingCount: 5, totalCount: 12 },
    { id: "2", name: "Consultoria Tech", pendingCount: 3, totalCount: 8 },
    { id: "3", name: "Startup Alpha", pendingCount: 7, totalCount: 10 },
    { id: "4", name: "Projeto Beta", pendingCount: 2, totalCount: 15 },
];

// Função auxiliar para obter data formatada
function getTodayDate(): string {
    const today = new Date();
    return today.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

// Função auxiliar para obter data com offset
function getDateOffset(days: number): string {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

// Função para inicializar tarefas mockadas
function getInitialTasks(): Task[] {
    return [
        { id: "1", title: "Reunião com cliente X", status: "in_progress" as const, date: getTodayDate(), workspaceColor: "#22C55E" },
        { id: "2", title: "Revisar proposta comercial", status: "todo" as const, date: getTodayDate(), workspaceColor: "#3B82F6" },
        { id: "3", title: "Enviar relatório mensal", status: "done" as const, date: getDateOffset(-1), workspaceColor: "#22C55E" },
        { id: "4", title: "Call de alinhamento time", status: "todo" as const, date: getDateOffset(-1), workspaceColor: "#8B5CF6" },
        { id: "5", title: "Atualizar dashboard analytics", status: "in_progress" as const, date: getDateOffset(1), workspaceColor: "#22C55E" },
        { id: "6", title: "Preparar apresentação Q4", status: "todo" as const, date: getDateOffset(2), workspaceColor: "#F59E0B" },
    ];
}

export default function HomePage() {
    // Estado das tarefas com inicialização lazy
    const [tasks, setTasks] = useState<Task[]>(() => getInitialTasks());
    
    // Estado para controlar visualização de dias (padrão 5)
    const [daysToShow, setDaysToShow] = useState(5);

    // Carregar preferência do localStorage
    useEffect(() => {
        const savedDays = localStorage.getItem("dashboard_daysToShow");
        if (savedDays) {
            setDaysToShow(parseInt(savedDays, 10));
        }
    }, []);

    // Salvar preferência no localStorage
    const handleDaysChange = (value: string) => {
        const days = parseInt(value, 10);
        setDaysToShow(days);
        localStorage.setItem("dashboard_daysToShow", days.toString());
    };

    // Gerar dias dinamicamente com base em daysToShow
    const weekDays = useMemo(() => {
        const today = new Date();
        const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
        const fullDayNames = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
        
        const days = [];
        
        // Lógica de renderização baseada na seleção
        let startOffset = 0;
        let endOffset = 0;

        if (daysToShow === 3) {
            // 3 Dias: Ontem, Hoje, Amanhã (com clamp)
            // Se hoje for Domingo (0): Hoje, Amanhã, Depois
            // Se hoje for Sábado (6): Antes, Ontem, Hoje
            
            const currentDayOfWeek = today.getDay(); // 0 (Dom) a 6 (Sáb)
            
            // Lógica padrão: -1, 0, +1
            startOffset = -1;
            endOffset = 1;

            // Clamp para início da semana (Domingo)
            // Se for Domingo (0), mostrar 0, 1, 2 (Hoje, Amanhã, Depois)
            if (currentDayOfWeek === 0) {
                startOffset = 0;
                endOffset = 2;
            }
            
            // Clamp para fim da semana (Sábado)
            // Se for Sábado (6), mostrar -2, -1, 0 (Anteontem, Ontem, Hoje)
            if (currentDayOfWeek === 6) {
                startOffset = -2;
                endOffset = 0;
            }
        } else {
            // 5 Dias (Padrão): 2 antes, hoje, 2 depois
            startOffset = -2;
            endOffset = 2;
        }
        
        for (let i = startOffset; i <= endOffset; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() + i);
            
            const dayOfWeek = date.getDay();
            const isToday = i === 0;
            
            days.push({
                name: fullDayNames[dayOfWeek],
                shortName: dayNames[dayOfWeek],
                date: date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
                dateKey: date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
                isToday,
                dateObj: date,
            });
        }
        
        return days;
    }, [daysToShow]);

    // Função para obter tarefas de um dia específico
    const getTasksForDay = (dateKey: string) => {
        return tasks.filter((task) => task.date === dateKey);
    };

    // Função para adicionar nova tarefa
    const handleAddTask = (dateKey: string, title: string) => {
        if (!title.trim()) return;
        
        const newTask: Task = {
            id: Date.now().toString(),
            title: title.trim(),
            status: "todo",
            date: dateKey,
            isQuickAdd: true, // Tarefas criadas via Quick Add são pessoais
        };
        
        setTasks((prev) => [...prev, newTask]);
    };

    // Classe de grid dinâmica
    const getGridClass = () => {
        switch (daysToShow) {
            case 3:
                return "grid-cols-1 md:grid-cols-3";
            default:
                return "grid-cols-1 md:grid-cols-3 lg:grid-cols-5";
        }
    };

    return (
        <div className="p-6 lg:p-8">
            <div className="max-w-[1600px] mx-auto space-y-8">
                {/* Header */}
                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-3xl font-semibold text-gray-900">
                            Bom dia, Usuário 👋
                        </h1>
                        <p className="text-gray-500 mt-1">
                            Aqui está o panorama da sua semana.
                        </p>
                    </div>
                    <Button className="bg-green-500 hover:bg-green-600 text-white rounded-lg">
                        <Plus className="w-4 h-4 mr-2" />
                        Nova Tarefa
                    </Button>
                </div>

                {/* Weekly Grid */}
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-gray-800">
                            Visão Semanal
                        </h2>
                        
                        <Tabs value={daysToShow.toString()} onValueChange={handleDaysChange}>
                            <TabsList className="h-8 bg-gray-100 p-1">
                                <TabsTrigger 
                                    value="3" 
                                    className="text-xs px-3 h-6 data-[state=active]:bg-white data-[state=active]:text-green-700 data-[state=active]:shadow-sm"
                                >
                                    3 Dias
                                </TabsTrigger>
                                <TabsTrigger 
                                    value="5" 
                                    className="text-xs px-3 h-6 data-[state=active]:bg-white data-[state=active]:text-green-700 data-[state=active]:shadow-sm"
                                >
                                    Semana
                                </TabsTrigger>
                            </TabsList>
                        </Tabs>
                    </div>
                    <div className={`grid gap-4 ${getGridClass()}`}>
                        {weekDays.map((day) => (
                            <DayColumn
                                key={day.dateKey}
                                dayName={day.name}
                                date={day.date}
                                tasks={getTasksForDay(day.dateKey)}
                                isToday={day.isToday}
                                onAddTask={(title) => handleAddTask(day.dateKey, title)}
                            />
                        ))}
                    </div>
                </div>

                {/* Workspaces Overview */}
                <div>
                    <h2 className="text-lg font-semibold text-gray-800 mb-4">
                        Visão por Workspace
                    </h2>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {MOCK_WORKSPACES.map((workspace) => (
                            <WorkspaceCard
                                key={workspace.id}
                                name={workspace.name}
                                pendingCount={workspace.pendingCount}
                                totalCount={workspace.totalCount}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
