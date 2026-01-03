"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MyTaskRowHome } from "@/components/tasks/MyTaskRowHome";
import dynamic from "next/dynamic";
import { TaskWithDetails, getTasks, createTask, getWorkspaceMembers, getWorkspaceMembersBatch } from "@/lib/actions/tasks";
import { cn } from "@/lib/utils";
import { Loader2, CheckSquare, Clock, AlertCircle, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QuickTaskAdd } from "@/components/tasks/QuickTaskAdd";
import { useWorkspace } from "@/components/providers/SidebarProvider";
import { useWorkspaces } from "@/components/providers/WorkspacesProvider";
import { usePathname } from "next/navigation";
import { isPersonalWorkspace } from "@/lib/utils/workspace-helpers";

const TaskDetailModal = dynamic(
  () => import("@/components/tasks/TaskDetailModal").then((mod) => mod.TaskDetailModal),
  { ssr: false }
);

interface HomeTasksSectionProps {
  period: "week" | "month";
  initialTasks?: TaskWithDetails[];
  initialWorkspaceId?: string;
  initialIsPersonal?: boolean;
}

type TaskStatusFilter = "upcoming" | "overdue" | "completed";

export function HomeTasksSection({ period, initialTasks, initialWorkspaceId, initialIsPersonal }: HomeTasksSectionProps) {
  // Inicializar com dados do servidor para exibição instantânea
  const [tasks, setTasks] = useState<TaskWithDetails[]>(() => initialTasks || []);
  const [loading, setLoading] = useState(() => !initialTasks || initialTasks.length === 0); // Não mostrar loading se já temos dados iniciais
  const [statusFilter, setStatusFilter] = useState<TaskStatusFilter>("upcoming");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [members, setMembers] = useState<Array<{ id: string; name: string; avatar?: string }>>([]);
  const [workspaceMap, setWorkspaceMap] = useState<Map<string, string>>(new Map());
  const [displayLimit, setDisplayLimit] = useState(10); // Limite inicial de 10 itens
  const shouldReduceMotion = useReducedMotion();
  const { activeWorkspaceId, isLoaded } = useWorkspace();
  const workspaces = useWorkspaces();
  const pathname = usePathname();
  const [currentWorkspace, setCurrentWorkspace] = useState<{ id: string; name: string; isPersonal: boolean } | null>(null);

  // Calcular range de datas baseado no período (apenas para "Próximas")
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

  // Detectar workspace atual da URL e verificar se é pessoal
  useEffect(() => {
    if (!isLoaded) return;
    if (!workspaces || workspaces.length === 0) {
      setCurrentWorkspace(null);
      return;
    }

    const segments = pathname.split("/").filter(Boolean);
    
    // Priorizar workspace da URL sobre contexto
    let workspaceId = activeWorkspaceId;
    let workspace = null;
    
    // Se estamos em /home (sem workspace na URL), usar workspace ativo do contexto
    if (segments.length === 0 || segments[0] === "home") {
      // Usar workspace ativo do contexto
      workspace = workspaces.find(w => w.id === activeWorkspaceId);
    } else {
      // Estamos em um workspace específico na URL
      const workspaceSlug = segments[0];
      workspace = workspaces.find(w => w.slug === workspaceSlug || w.id === workspaceSlug);
      if (workspace) {
        workspaceId = workspace.id;
      }
    }
    
    if (workspaceId && workspace) {
      const isPersonal = isPersonalWorkspace(workspace, workspaces);
      setCurrentWorkspace({
        id: workspaceId,
        name: workspace.name || "Workspace",
        isPersonal
      });
    } else {
      // Se não há workspace ativo, usar o primeiro workspace ou criar lógica padrão
      const firstWorkspace = workspaces[0];
      if (firstWorkspace) {
        const isPersonal = isPersonalWorkspace(firstWorkspace, workspaces);
        setCurrentWorkspace({
          id: firstWorkspace.id,
          name: firstWorkspace.name,
          isPersonal
        });
      } else {
        setCurrentWorkspace(null);
      }
    }
  }, [pathname, activeWorkspaceId, isLoaded, workspaces]);

  // Sincronizar dados iniciais quando workspace corresponder
  useEffect(() => {
    if (initialTasks !== undefined && 
        currentWorkspace?.id === initialWorkspaceId && 
        currentWorkspace?.isPersonal === initialIsPersonal &&
        statusFilter === "upcoming" &&
        period === "week") {
      // Atualizar tarefas com dados iniciais se workspace corresponde
      setTasks(initialTasks);
      setLoading(false);
    }
  }, [initialTasks, initialWorkspaceId, initialIsPersonal, currentWorkspace, statusFilter, period]);

  // Buscar tarefas - workspace pessoal mostra todas as tarefas dos outros workspaces
  // OTIMIZAÇÃO: Só fazer fetch se não tiver dados iniciais ou se workspace/filtro mudar
  useEffect(() => {
    const loadTasks = async () => {
      if (!currentWorkspace) return;
      
      // Se temos dados iniciais e workspace/filtro não mudou, não fazer fetch
      // Verificar se os dados iniciais são válidos e correspondem ao workspace atual
      if (initialTasks !== undefined && 
          initialTasks.length >= 0 && // Aceita array vazio também
          currentWorkspace.id === initialWorkspaceId && 
          currentWorkspace.isPersonal === initialIsPersonal &&
          statusFilter === "upcoming" &&
          period === "week") { // Só usar dados iniciais para período "week"
        // Usar dados iniciais - não fazer fetch
        return;
      }
      
      setLoading(true);
      try {
        // Workspace pessoal: buscar todas as tarefas atribuídas ao usuário (de todos os workspaces)
        if (currentWorkspace.isPersonal) {
          const fetchedTasks = await getTasks({
            assigneeId: "current",
            // Não aplicar filtro de data para workspace pessoal (mostra todas)
          });
          setTasks(fetchedTasks || []);
          setLoading(false);
          return;
        }
        
        // Workspace profissional: buscar apenas tarefas do workspace ativo
        // Aplicar filtro de data apenas para "Próximas" (statusFilter === "upcoming")
        const fetchedTasks = await getTasks({
          workspaceId: currentWorkspace.id,
          assigneeId: "current",
          // Aplicar filtro de data apenas para "Próximas"
          ...(statusFilter === "upcoming" ? {
            dueDateStart: dateRange.start,
            dueDateEnd: dateRange.end,
          } : {}),
        });
        const scopedTasks = (fetchedTasks || []).filter(
          (task) => task.workspace_id === currentWorkspace.id
        );
        setTasks(scopedTasks);
      } catch (error) {
        console.error("Erro ao carregar tarefas:", error);
        setTasks([]);
      } finally {
        setLoading(false);
      }
    };

    loadTasks();
  }, [period, currentWorkspace, statusFilter, dateRange, initialTasks, initialWorkspaceId, initialIsPersonal]); // Recarregar quando o período, workspace ou filtro mudar

  // Buscar workspaces para criar mapa workspace_id -> name
  useEffect(() => {
    const map = new Map<string, string>();
    (workspaces || []).forEach((ws: any) => {
      if (ws.id && ws.name) {
        map.set(ws.id, ws.name);
      }
    });
    setWorkspaceMap(map);
  }, [workspaces]);

  // Buscar membros (para o TaskRowMinify e QuickTaskAdd) - OTIMIZADO: usa batch
  useEffect(() => {
    const loadMembers = async () => {
      if (!currentWorkspace) return;
      
      try {
        // Se for workspace profissional, buscar membros diretamente do workspace ativo
        // Isso garante que mesmo sem tarefas, os membros estarão disponíveis
        if (!currentWorkspace.isPersonal && currentWorkspace.id) {
          try {
            const workspaceMembers = await getWorkspaceMembers(currentWorkspace.id);
            const membersList = workspaceMembers.map((m: any) => ({
              id: m.user_id || m.id,
              name: m.profiles?.full_name || m.full_name || m.email || "Usuário",
              avatar: m.profiles?.avatar_url || m.avatar_url || undefined,
            }));
            setMembers(membersList);
            return;
          } catch (error) {
            console.error(`Erro ao buscar membros do workspace ${currentWorkspace.id}:`, error);
          }
        }
        
        // Para workspace pessoal: buscar membros de todos os workspaces das tarefas em BATCH
        const workspaceIds = Array.from(
          new Set(tasks.map((t) => t.workspace_id).filter(Boolean) as string[])
        );

        if (workspaceIds.length > 0) {
          // OTIMIZAÇÃO: Buscar todos os membros de uma vez em vez de loop sequencial
          const membersMap = await getWorkspaceMembersBatch(workspaceIds);
          
          // Combinar todos os membros únicos (por ID)
          const allMembersMap = new Map<string, { id: string; name: string; avatar?: string }>();
          
          membersMap.forEach((members, workspaceId) => {
            members.forEach((m) => {
              if (!allMembersMap.has(m.id)) {
                allMembersMap.set(m.id, m);
              }
            });
          });
          
          setMembers(Array.from(allMembersMap.values()));
        } else {
          setMembers([]);
        }
      } catch (error) {
        console.error("Erro ao carregar membros:", error);
        setMembers([]);
      }
    };

    loadMembers();
  }, [tasks, currentWorkspace]);

  // Filtrar tarefas baseado no status e período
  const filteredTasks = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const filtered = tasks.filter((task) => {
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
        // Concluídas: todas as tarefas completadas (sem limite de período)
        return isCompleted;
      } else if (statusFilter === "overdue") {
        // Atrasadas: não completadas e data < hoje (sem limite de período)
        return isOverdue;
      } else {
        // Próximas: todas as tarefas não completadas (qualquer status que não seja "done")
        // Inclui: todo, in_progress, review, correction
        // Mostra todas as não concluídas, independente de data ou período
        return !isCompleted;
      }
    });
    
    return filtered;
  }, [tasks, statusFilter, dateRange]);

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

  // Tarefas a serem exibidas (com limite de paginação)
  const displayedTasks = useMemo(() => {
    return sortedTasks.slice(0, displayLimit);
  }, [sortedTasks, displayLimit]);

  const hasMore = sortedTasks.length > displayLimit;

  const handleTaskClick = (taskId: string | number) => {
    setSelectedTaskId(String(taskId));
    setIsModalOpen(true);
  };

  // Callback para atualização otimista de tarefa
  const handleTaskUpdatedOptimistic = useCallback((taskId: string | number, updates: Partial<{
    title?: string;
    dueDate?: string;
    status?: string;
    priority?: string;
    assignees?: Array<{ name: string; avatar?: string; id?: string }>;
  }>) => {
    setTasks((prevTasks) => {
      return prevTasks.map((task) => {
        if (String(task.id) === String(taskId)) {
          const updatedTask = { ...task };
          
          if (updates.title !== undefined) {
            updatedTask.title = updates.title;
          }
          if (updates.dueDate !== undefined) {
            updatedTask.due_date = updates.dueDate || null;
          }
          if (updates.status !== undefined) {
            updatedTask.status = updates.status as any;
          }
          if (updates.priority !== undefined) {
            updatedTask.priority = updates.priority as any;
          }
          if (updates.assignees !== undefined) {
            // Atualizar assignees mantendo estrutura TaskWithDetails
            (updatedTask as any).assignees = updates.assignees;
          }
          
          return updatedTask;
        }
        return task;
      });
    });
  }, []);

  const handleTaskCreated = useCallback(() => {
    setIsModalOpen(false);
    // Recarregar tarefas apenas após criação (necessário para pegar ID e dados completos)
    const loadTasks = async () => {
      if (!currentWorkspace) return;
      
      setLoading(true);
      try {
        if (currentWorkspace.isPersonal) {
          const fetchedTasks = await getTasks({
            assigneeId: "current",
          });
          setTasks(fetchedTasks || []);
        } else {
          const fetchedTasks = await getTasks({
            workspaceId: currentWorkspace.id,
            assigneeId: "current",
            ...(statusFilter === "upcoming" ? {
              dueDateStart: dateRange.start,
              dueDateEnd: dateRange.end,
            } : {}),
          });
          const scopedTasks = (fetchedTasks || []).filter(
            (task) => task.workspace_id === currentWorkspace.id
          );
          setTasks(scopedTasks);
        }
      } catch (error) {
        console.error("Erro ao recarregar tarefas:", error);
      } finally {
        setLoading(false);
      }
    };
    loadTasks();
  }, [currentWorkspace, statusFilter, dateRange]);

  const handleTaskUpdated = useCallback(() => {
    // Não recarregar tudo - atualização otimista já foi feita
    // Apenas revalidar se necessário (ex: mudança de status que afeta filtros)
    // Por enquanto, deixar vazio pois onTaskUpdatedOptimistic já atualiza o estado
  }, []);

  
  return (
    <>
      <div className="card-surface h-[400px] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border min-h-[56px] flex items-center">
          <div className="flex items-center justify-between gap-4 w-full">
            <h3 className="text-lg font-semibold text-foreground leading-6">
              Meu trabalho
              {process.env.NODE_ENV === 'development' && (
                <span className="ml-2 text-xs text-gray-400">
                  ({tasks.length} total, {sortedTasks.length} filtradas)
                </span>
              )}
            </h3>
            
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
        <div className="flex-1 min-h-0 overflow-y-auto">
          <AnimatePresence mode="sync" initial={false}>
            <motion.div
              key={statusFilter}
              initial={shouldReduceMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: shouldReduceMotion ? 1 : 0 }}
              transition={shouldReduceMotion ? undefined : { duration: 0.15 }}
              className="h-full"
            >
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : sortedTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              {currentWorkspace?.isPersonal && workspaces.length === 1 ? (
                // Caso especial: workspace pessoal sem outros workspaces
                <>
                  <div className="bg-gray-50 p-3 rounded-full mb-3">
                    <CheckSquare className="w-6 h-6 text-gray-400" />
                  </div>
                  <p className="text-sm font-medium text-gray-900 mb-1">Workspace pessoal não possui tarefas</p>
                  <p className="text-xs text-gray-500 text-center">
                    Crie um workspace profissional para começar a gerenciar tarefas
                  </p>
                </>
              ) : statusFilter === "upcoming" ? (
                <>
                  <div className="bg-gray-50 p-3 rounded-full mb-3">
                    <Clock className="w-6 h-6 text-gray-400" />
                  </div>
                  <p className="text-sm font-medium text-gray-900 mb-1">Nenhuma tarefa próxima</p>
                  <p className="text-xs text-gray-500 text-center">
                    Você não tem tarefas para este período
                  </p>
                </>
              ) : statusFilter === "overdue" ? (
                <>
                  <div className="bg-red-50 p-3 rounded-full mb-3">
                    <AlertCircle className="w-6 h-6 text-red-400" />
                  </div>
                  <p className="text-sm font-medium text-gray-900 mb-1">Nenhuma tarefa atrasada</p>
                  <p className="text-xs text-gray-500 text-center">
                    Ótimo! Você está em dia com suas tarefas
                  </p>
                </>
              ) : (
                <>
                  <div className="bg-green-50 p-3 rounded-full mb-3">
                    <CheckSquare className="w-6 h-6 text-green-400" />
                  </div>
                  <p className="text-sm font-medium text-gray-900 mb-1">Nenhuma tarefa concluída</p>
                  <p className="text-xs text-gray-500 text-center">
                    Tarefas concluídas aparecerão aqui
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="px-2 py-2">
              {/* Ghost TaskRow para criação rápida - apenas para workspaces profissionais */}
              {!currentWorkspace?.isPersonal && (
                <QuickTaskAdd
                  placeholder="Adicionar tarefa aqui..."
                  variant="ghost"
                  members={members}
                  showProjectTag={true}
                  onSubmit={async (title, dueDate, assigneeId) => {
                    try {
                      // Criar no workspace ativo (não pode ser pessoal aqui)
                      const workspaceId = currentWorkspace?.id || null;
                      
                      const result = await createTask({
                        title,
                        description: "",
                        status: "todo",
                        due_date: dueDate ? dueDate.toISOString() : null,
                        assignee_id: assigneeId || null,
                        workspace_id: workspaceId,
                      });
                      
                      if (result.success) {
                        // Recarregar tarefas do workspace ativo (após criação, necessário para pegar dados completos)
                        const fetchedTasks = await getTasks({
                          workspaceId: currentWorkspace?.id,
                          assigneeId: "current",
                          ...(statusFilter === "upcoming" ? {
                            dueDateStart: dateRange.start,
                            dueDateEnd: dateRange.end,
                          } : {}),
                        });
                        setTasks(fetchedTasks || []);
                      } else {
                        console.error("Erro ao criar tarefa:", result.error);
                      }
                    } catch (error) {
                      console.error("Erro ao criar tarefa:", error);
                    }
                  }}
                />
              )}

              {displayedTasks.map((task: any) => {
                // getTasks já retorna assignees através de transformTaskWithMembers
                const assignees = (task as any).assignees || [];
                const commentCount = task.comment_count || 0;
                const workspaceName = task.workspace_id ? workspaceMap.get(task.workspace_id) : undefined;
                const projectTag = task.tags && task.tags.length > 0 ? task.tags[0] : undefined;

                return (
                  <MyTaskRowHome
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
                      tags: task.tags || [],
                    }}
                    groupColor={task.group?.color || undefined}
                    onClick={handleTaskClick}
                    onTaskUpdated={handleTaskUpdated}
                    onTaskUpdatedOptimistic={handleTaskUpdatedOptimistic}
                    members={members}
                    disabled={true}
                    showProjectTag={true}
                    showWorkspaceBadge={false}
                    workspaceName={workspaceName}
                  />
                );
              })}
              
              {hasMore && (
                <div className="px-6 py-3 border-t border-gray-200">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDisplayLimit(prev => prev + 10)}
                    className="w-full text-sm text-gray-600 hover:text-gray-900"
                  >
                    Carregar mais ({sortedTasks.length - displayLimit} restantes)
                    <ChevronDown className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              )}
            </div>
          )}
            </motion.div>
          </AnimatePresence>
        </div>
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
