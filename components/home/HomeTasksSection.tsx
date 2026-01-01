"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { TaskRowMinify } from "@/components/tasks/TaskRowMinify";
import { TaskDetailModal } from "@/components/tasks/TaskDetailModal";
import { getTasks, TaskWithDetails } from "@/lib/actions/tasks";
import { getWorkspaceMembers } from "@/lib/actions/tasks";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface HomeTasksSectionProps {
  period: "week" | "month";
}

type TaskStatusFilter = "upcoming" | "overdue" | "completed";

export function HomeTasksSection({ period }: HomeTasksSectionProps) {
  const [tasks, setTasks] = useState<TaskWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<TaskStatusFilter>("upcoming");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [members, setMembers] = useState<Array<{ id: string; name: string; avatar?: string }>>([]);

  // Calcular range de datas baseado no período
  const dateRange = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (period === "week") {
      // Fim da semana atual (domingo)
      const dayOfWeek = today.getDay();
      const daysUntilSunday = dayOfWeek === 0 ? 7 : 7 - dayOfWeek;
      const endOfWeek = new Date(today);
      endOfWeek.setDate(today.getDate() + daysUntilSunday);
      endOfWeek.setHours(23, 59, 59, 999);

      return {
        start: today.toISOString(),
        end: endOfWeek.toISOString(),
      };
    } else {
      // Fim do mês atual
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      endOfMonth.setHours(23, 59, 59, 999);

      return {
        start: today.toISOString(),
        end: endOfMonth.toISOString(),
      };
    }
  }, [period]);

  // Buscar tarefas
  useEffect(() => {
    const loadTasks = async () => {
      setLoading(true);
      try {
        const fetchedTasks = await getTasks({
          assigneeId: "current",
          dueDateStart: dateRange.start,
          dueDateEnd: dateRange.end,
        });
        setTasks(fetchedTasks || []);
      } catch (error) {
        console.error("Erro ao carregar tarefas:", error);
        setTasks([]);
      } finally {
        setLoading(false);
      }
    };

    loadTasks();
  }, [dateRange.start, dateRange.end]);

  // Buscar membros (para o TaskRowMinify)
  useEffect(() => {
    const loadMembers = async () => {
      try {
        // Buscar membros de todos os workspaces das tarefas
        const workspaceIds = Array.from(
          new Set(tasks.map((t) => t.workspace_id).filter(Boolean) as string[])
        );

        if (workspaceIds.length > 0) {
          // Buscar membros do primeiro workspace (simplificado)
          const workspaceMembers = await getWorkspaceMembers(workspaceIds[0]);
          const mappedMembers = workspaceMembers.map((m: any) => ({
            id: m.id,
            name: m.full_name || m.email || "Usuário",
            avatar: m.avatar_url || undefined,
          }));
          setMembers(mappedMembers);
        } else {
          // Se não há workspace, buscar membros pessoais
          const personalMembers = await getWorkspaceMembers(null);
          const mappedMembers = personalMembers.map((m: any) => ({
            id: m.id,
            name: m.full_name || m.email || "Usuário",
            avatar: m.avatar_url || undefined,
          }));
          setMembers(mappedMembers);
        }
      } catch (error) {
        console.error("Erro ao carregar membros:", error);
      }
    };

    if (tasks.length > 0) {
      loadMembers();
    }
  }, [tasks]);

  // Filtrar tarefas baseado no status
  const filteredTasks = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return tasks.filter((task) => {
      const isCompleted = task.status === "done";
      const dueDate = task.due_date ? new Date(task.due_date) : null;
      
      // Normalizar datas para comparação (apenas data, sem hora)
      let taskDate: Date | null = null;
      if (dueDate) {
        taskDate = new Date(dueDate);
        taskDate.setHours(0, 0, 0, 0);
      }
      
      const isOverdue = taskDate && taskDate < today && !isCompleted;

      if (statusFilter === "completed") {
        return isCompleted;
      } else if (statusFilter === "overdue") {
        return isOverdue;
      } else {
        // Próximas: não completadas e (sem data ou data >= hoje)
        return !isCompleted && (!taskDate || taskDate >= today);
      }
    });
  }, [tasks, statusFilter]);

  // Ordenar tarefas cronologicamente
  const sortedTasks = useMemo(() => {
    return [...filteredTasks].sort((a, b) => {
      // Tarefas sem data vêm por último
      if (!a.due_date && !b.due_date) return 0;
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;

      const dateA = new Date(a.due_date).getTime();
      const dateB = new Date(b.due_date).getTime();

      return dateA - dateB;
    });
  }, [filteredTasks]);

  const handleTaskClick = (taskId: string | number) => {
    setSelectedTaskId(String(taskId));
    setIsModalOpen(true);
  };

  const handleTaskCreated = () => {
    setIsModalOpen(false);
    // Recarregar tarefas
    const loadTasks = async () => {
      try {
        const fetchedTasks = await getTasks({
          assigneeId: "current",
          dueDateStart: dateRange.start,
          dueDateEnd: dateRange.end,
        });
        setTasks(fetchedTasks || []);
      } catch (error) {
        console.error("Erro ao recarregar tarefas:", error);
      }
    };
    loadTasks();
  };

  const handleTaskUpdated = () => {
    // Recarregar tarefas
    const loadTasks = async () => {
      try {
        const fetchedTasks = await getTasks({
          assigneeId: "current",
          dueDateStart: dateRange.start,
          dueDateEnd: dateRange.end,
        });
        setTasks(fetchedTasks || []);
      } catch (error) {
        console.error("Erro ao recarregar tarefas:", error);
      }
    };
    loadTasks();
  };

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm h-[600px] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-lg font-semibold text-gray-900">Minhas tarefas</h3>
            
            {/* Tabs internos */}
            <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as TaskStatusFilter)}>
              <TabsList variant="default">
                <TabsTrigger value="upcoming" variant="default">Próximas</TabsTrigger>
                <TabsTrigger value="overdue" variant="default">Atrasadas</TabsTrigger>
                <TabsTrigger value="completed" variant="default">Concluídas</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {/* Content com scroll */}
        <ScrollArea className="flex-1">
          <div className="px-2">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : sortedTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-gray-400">
                <p className="text-sm">Nenhuma tarefa encontrada</p>
              </div>
            ) : (
              <div className="py-2">
                {sortedTasks.map((task: any) => {
                  // getTasks já retorna assignees através de transformTaskWithMembers
                  const assignees = task.assignees || [];
                  const commentCount = task.comment_count || 0;

                  return (
                    <TaskRowMinify
                      key={task.id}
                      task={{
                        id: task.id,
                        title: task.title,
                        status: task.status || "todo",
                        dueDate: task.due_date || undefined,
                        completed: task.status === "done",
                        priority: task.priority as "low" | "medium" | "high" | "urgent" | undefined,
                        assignees: assignees,
                        workspace_id: task.workspace_id || null,
                        commentCount: commentCount,
                      }}
                      groupColor={task.group?.color || undefined}
                      onClick={handleTaskClick}
                      onTaskUpdated={handleTaskUpdated}
                      members={members}
                      disabled={true}
                    />
                  );
                })}
              </div>
            )}
          </div>
          <ScrollBar />
        </ScrollArea>
      </div>

      {/* Modal de detalhes da tarefa */}
      {selectedTaskId && (
        <TaskDetailModal
          open={isModalOpen}
          onOpenChange={setIsModalOpen}
          task={sortedTasks.find((t) => String(t.id) === selectedTaskId) as any}
          onTaskCreated={handleTaskCreated}
          onTaskUpdated={handleTaskUpdated}
        />
      )}
    </>
  );
}

