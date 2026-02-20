"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MyTaskRowHome } from "@/components/tasks/MyTaskRowHome";
import dynamic from "next/dynamic";
import { TaskWithDetails, getTasks, createTask, getWorkspaceMembers, getWorkspaceMembersBatch, getWorkspaceTags } from "@/lib/actions/tasks";
import { cn } from "@/lib/utils";
import { Loader2, CheckSquare, Clock, AlertCircle, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QuickTaskAdd } from "@/components/tasks/QuickTaskAdd";
import { useWorkspace } from "@/components/providers/SidebarProvider";
import { useWorkspaces } from "@/components/providers/WorkspacesProvider";
import { usePathname } from "next/navigation";
import { isPersonalWorkspace } from "@/lib/utils/workspace-helpers";
import { toast } from "sonner";
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
  // CACHES DE DADOS (Minimiza round-trips ao servidor)
  // activeTasksCache: Tarefas não concluídas (todo, in_progress, review, etc)
  const [activeTasksCache, setActiveTasksCache] = useState<TaskWithDetails[] | null>(
    () => {
      if (!initialTasks || initialTasks.length === 0 || initialIsPersonal) return null;
      // Se initialTasks existe, filtra as ativas.
      return initialTasks.filter(t => t.status !== "done");
    }
  );
  const [completedTasksCache, setCompletedTasksCache] = useState<TaskWithDetails[] | null>(null);

  // Estado derivado para tarefas a exibir
  // DECLARAÇÃO UNIFICADA ABAIXO (linhas 110+)
  // Removido duplicatas aqui para corrigir erro de build
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [members, setMembers] = useState<Array<{ id: string; name: string; avatar?: string }>>([]);
  const [workspaceMap, setWorkspaceMap] = useState<Map<string, string>>(new Map());
  const [displayLimit, setDisplayLimit] = useState(10);
  const [refreshToken, setRefreshToken] = useState(0);
  const lastRefreshTsRef = useRef<number>(0);
  const silentRefreshRef = useRef(false);
  const [workspaceTags, setWorkspaceTags] = useState<string[]>([]);
  const shouldReduceMotion = useReducedMotion();
  const { activeWorkspaceId, isLoaded } = useWorkspace();
  const workspaces = useWorkspaces();
  const pathname = usePathname();
  const [currentWorkspace, setCurrentWorkspace] = useState<{ id: string; name: string; isPersonal: boolean } | null>(null);

  // Calcular range - Mantido para consistência visual se necessário, mas o fetch será amplo
  const dateRange = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (period === "week") {
      const dayOfWeek = today.getDay();
      const daysUntilSunday = dayOfWeek === 0 ? 7 : 7 - dayOfWeek;
      const endOfWeek = new Date(today);
      endOfWeek.setDate(today.getDate() + daysUntilSunday);
      endOfWeek.setHours(23, 59, 59, 999);
      return { start: today.toISOString(), end: endOfWeek.toISOString() };
    } else {
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      endOfMonth.setHours(23, 59, 59, 999);
      return { start: today.toISOString(), end: endOfMonth.toISOString() };
    }
  }, [period]);

  // Detectar workspace (Mantido igual)
  useEffect(() => {
    if (!isLoaded) return;
    if (!workspaces || workspaces.length === 0) {
      setCurrentWorkspace(null);
      return;
    }
    const segments = pathname.split("/").filter(Boolean);
    let workspaceId = activeWorkspaceId;
    let workspace = null;
    if (segments.length === 0 || segments[0] === "home") {
      workspace = workspaces.find(w => w.id === activeWorkspaceId);
    } else {
      const workspaceSlug = segments[0];
      workspace = workspaces.find(w => w.slug === workspaceSlug || w.id === workspaceSlug);
      if (workspace) workspaceId = workspace.id;
    }
    if (workspaceId && workspace) {
      const isPersonal = isPersonalWorkspace(workspace, workspaces);
      setCurrentWorkspace({ id: workspaceId, name: workspace.name || "Workspace", isPersonal });
    } else {
      const first = workspaces[0];
      if (first) {
        setCurrentWorkspace({ id: first.id, name: first.name, isPersonal: isPersonalWorkspace(first, workspaces) });
      } else {
        setCurrentWorkspace(null);
      }
    }
  }, [pathname, activeWorkspaceId, isLoaded, workspaces]);

  useEffect(() => {
    if (!currentWorkspace || currentWorkspace.isPersonal) {
      setWorkspaceTags([]);
      return;
    }

    let isActive = true;
    getWorkspaceTags(currentWorkspace.id)
      .then((tags) => {
        if (isActive) setWorkspaceTags(tags);
      })
      .catch(() => {
        if (isActive) setWorkspaceTags([]);
      });

    return () => {
      isActive = false;
    };
  }, [currentWorkspace]);

  // Estado derivado para tarefas a exibir
  const [tasks, setTasks] = useState<TaskWithDetails[]>(() => {
    // Inicializar com dados do servidor SE disponiveis
    if (initialTasks && initialTasks.length > 0 && !initialIsPersonal) {
      const active = initialTasks.filter(t => t.status !== "done");
      return active;
    }
    return [];
  });

  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<TaskStatusFilter>("upcoming");

  // ... (rest of state)

  // REMOVIDO: Effect que limpava caches agressivamente. 
  // Agora confiamos no ID do workspace que vem da prop initialWorkspaceId ou do hook.
  // Se mudar, o fetch normal cuidará de atualizar.


  // LÓGICA DE FETCH OTIMIZADA
  // Busca dados sob demanda e preenche as caches
  useEffect(() => {
    const loadTasks = async () => {
      if (!currentWorkspace) return;

      const isCompletedTab = statusFilter === "completed";
      const silent = silentRefreshRef.current;
      if (silent) silentRefreshRef.current = false;

      // CENÁRIO 1: Abas "Próximas" ou "Atrasadas" (Usam cache de ativos)
      if (!isCompletedTab) {
        // Se já temos cache, não faz fetch! (Switch instantâneo)
        if (activeTasksCache) {
          setTasks(activeTasksCache);
          return;
        }

        if (!silent) setLoading(true);
        try {
          const fetchParams = {
            workspaceId: currentWorkspace.isPersonal ? undefined : currentWorkspace.id,
            assigneeId: "current" as const, // Forçar literal type
            excludeStatus: ["done", "archived"] // BUSCAR TUDO QUE ESTÁ EM ABERTO
          };

          const fetchedTasks = await getTasks(fetchParams);

          // Filtragem extra de segurança para workspace
          const validTasks = currentWorkspace.isPersonal
            ? (fetchedTasks || [])
            : (fetchedTasks || []).filter(t => t.workspace_id === currentWorkspace.id);

          setActiveTasksCache(validTasks);
          setTasks(validTasks);
        } catch (e) {
          console.error(e);
        } finally {
          setLoading(false);
        }
      }
      // CENÁRIO 2: Aba "Concluídas" (Usa cache de concluídos)
      else {
        if (completedTasksCache) {
          setTasks(completedTasksCache);
          return;
        }

        if (!silent) setLoading(true);
        try {
          const fetchParams = {
            workspaceId: currentWorkspace.isPersonal ? undefined : currentWorkspace.id,
            assigneeId: "current" as const,
            status: "done",
            limit: 50 // Limite para não pesar
          };

          const fetchedTasks = await getTasks(fetchParams);

          const validTasks = currentWorkspace.isPersonal
            ? (fetchedTasks || [])
            : (fetchedTasks || []).filter(t => t.workspace_id === currentWorkspace.id);

          setCompletedTasksCache(validTasks);
          setTasks(validTasks);
        } catch (e) {
          console.error(e);
        } finally {
          setLoading(false);
        }
      }
    };

    let isActive = true;
    loadTasks().then((res) => {
      if (!isActive) return;
      // any specific state sets would theoretically be protected by isActive here.
    });

    return () => {
      isActive = false;
    };
  }, [currentWorkspace, statusFilter, refreshToken]); // Dependências: Workspace e Filtro (para trocar o bucket)

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
            setMembers(prev => {
              // Deep comparison alternative: Check lengths and IDs to prevent breaking memoization
              if (prev.length === membersList.length && prev.every((p, i) => p.id === membersList[i].id)) {
                return prev;
              }
              return membersList;
            });
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

          const newMembers = Array.from(allMembersMap.values());
          setMembers(prev => {
            if (prev.length === newMembers.length && prev.every((p, i) => p.id === newMembers[i].id)) {
              return prev;
            }
            return newMembers;
          });
        } else {
          setMembers(prev => prev.length === 0 ? prev : []);
        }
      } catch (error) {
        console.error("Erro ao carregar membros:", error);
        setMembers([]);
      }
    };

    loadMembers();
  }, [tasks, currentWorkspace]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleExternalUpdate = () => {
      const tsRaw = sessionStorage.getItem("home_tasks_refresh_ts");
      const ts = tsRaw ? Number(tsRaw) : Date.now();
      if (!Number.isFinite(ts) || ts <= lastRefreshTsRef.current) return;

      lastRefreshTsRef.current = ts;
      setActiveTasksCache(null);
      setCompletedTasksCache(null);
      silentRefreshRef.current = true;
      setRefreshToken((value) => value + 1);
    };

    window.addEventListener("home-tasks-updated", handleExternalUpdate);
    handleExternalUpdate();

    return () => {
      window.removeEventListener("home-tasks-updated", handleExternalUpdate);
    };
  }, []);


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
        // Próximas (upcoming): todas as tarefas não completadas E não atrasadas
        // Inclui: todo, in_progress, review, correction que são de hoje para frente (ou sem data)
        return !isCompleted && !isOverdue;
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

  const handleTaskClick = useCallback((taskId: string | number) => {
    setSelectedTaskId(String(taskId));
    setIsModalOpen(true);
  }, []);

  // Callback para atualização otimista de tarefa
  const handleTaskUpdatedOptimistic = useCallback((taskId: string | number, updates: Partial<{
    title?: string;
    dueDate?: string;
    status?: string;
    priority?: string;
    tags?: string[];
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
          if (updates.tags !== undefined) {
            (updatedTask as any).tags = updates.tags;
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

  // Funções de invalidação de cache
  const invalidateCaches = () => {
    setActiveTasksCache(null);
    setCompletedTasksCache(null);
  };

  const handleTaskCreatedOptimistic = useCallback(async () => {
    setIsModalOpen(false);
    invalidateCaches();

    // Fetch silencioso para atualizar sem loading full
    if (!currentWorkspace) return;
    try {
      const fetchParams = {
        workspaceId: currentWorkspace.isPersonal ? undefined : currentWorkspace.id,
        assigneeId: "current" as const,
        excludeStatus: ["done", "archived"]
      };
      const fetched = await getTasks(fetchParams);

      const valid = currentWorkspace.isPersonal
        ? fetched
        : fetched.filter((t: any) => t.workspace_id === currentWorkspace.id);

      setActiveTasksCache(valid);
      if (statusFilter !== "completed") setTasks(valid);
    } catch (e) { console.error(e); }
  }, [currentWorkspace, statusFilter, refreshToken]);

  const handleTaskUpdated = useCallback(() => {
    if (!currentWorkspace) return;
    const isCompletedTab = statusFilter === "completed";
    const fetchParams = isCompletedTab
      ? {
        workspaceId: currentWorkspace.isPersonal ? undefined : currentWorkspace.id,
        assigneeId: "current" as const,
        status: "done",
        limit: 50,
      }
      : {
        workspaceId: currentWorkspace.isPersonal ? undefined : currentWorkspace.id,
        assigneeId: "current" as const,
        excludeStatus: ["done", "archived"],
      };

    getTasks(fetchParams)
      .then((fetchedTasks) => {
        const validTasks = currentWorkspace.isPersonal
          ? (fetchedTasks || [])
          : (fetchedTasks || []).filter(t => t.workspace_id === currentWorkspace.id);

        if (isCompletedTab) {
          setCompletedTasksCache(validTasks);
        } else {
          setActiveTasksCache(validTasks);
        }
        setTasks(validTasks);
      })
      .catch((error) => {
        console.error(error);
      });
  }, [currentWorkspace, statusFilter]);


  return (
    <>
      <div className="rounded-lg border border-gray-200 h-[400px] flex flex-col bg-white">
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
                        <CheckSquare className="w-6 h-6 text-gray-400" />
                      </div>
                      <p className="text-sm font-medium text-gray-900 mb-1">Nenhuma próxima tarefa</p>
                      <p className="text-xs text-gray-500 text-center">
                        Você não tem tarefas pendentes
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
                  {/* Ghost TaskRow para criação rápida */}
                  <QuickTaskAdd
                    placeholder="Adicionar tarefa aqui..."
                    variant="ghost"
                    members={members}
                    showProjectTag={!currentWorkspace?.isPersonal}
                    onSubmit={async (title, dueDate, assigneeId) => {
                      try {
                        const isPersonalContext = !!currentWorkspace?.isPersonal;
                        const tempId = `temp-${Date.now()}`;
                        const tempAssignee = members.find(m => m.id === assigneeId) || null;

                        // 1. Atualização Otimista: Mostrar tarefa instantaneamente na UI
                        const optimisticTask: any = {
                          id: tempId,
                          title,
                          status: "todo",
                          due_date: dueDate ? dueDate.toISOString() : null,
                          assignee_id: assigneeId || "current",
                          workspace_id: isPersonalContext ? null : (currentWorkspace?.id || undefined),
                          is_personal: isPersonalContext,
                          description: "",
                          position: 0,
                          created_at: new Date().toISOString(),
                          updated_at: new Date().toISOString(),
                          group_id: null,
                          project_id: null,
                          created_by: "current",
                          comment_count: 0,
                          assignees: tempAssignee ? [{ id: tempAssignee.id, name: tempAssignee.name, avatar: tempAssignee.avatar }] : [],
                          task_members: []
                        };

                        // Insere na lista atual (A mágica do instantâneo)
                        setTasks(prev => [...prev, optimisticTask as TaskWithDetails]);

                        // 2. Dispara a criação no background sem usar "await"
                        createTask({
                          title,
                          description: "",
                          status: "todo",
                          due_date: dueDate ? dueDate.toISOString() : null,
                          assignee_id: assigneeId || "current",
                          workspace_id: isPersonalContext ? null : (currentWorkspace?.id || undefined),
                          is_personal: isPersonalContext,
                        }).then(async (result) => {
                          if (result.success) {
                            toast.success("Tarefa adicionada com sucesso!", {
                              action: {
                                label: "Abrir",
                                onClick: () => {
                                  if (result.data?.id) {
                                    setSelectedTaskId(result.data.id);
                                    setIsModalOpen(true);
                                  }
                                }
                              }
                            });

                            // Atualiza discretamente os dados vitais para garantir sync perfeito com o banco
                            const fetchedTasks = await getTasks({
                              workspaceId: currentWorkspace?.isPersonal ? undefined : currentWorkspace?.id,
                              assigneeId: "current",
                              excludeStatus: ["done", "archived"]
                            });

                            const validTasks = currentWorkspace?.isPersonal
                              ? (fetchedTasks || [])
                              : (fetchedTasks || []).filter(t => t.workspace_id === currentWorkspace?.id);

                            setActiveTasksCache(validTasks);
                            if (statusFilter !== "completed") setTasks(validTasks);

                            if (typeof window !== "undefined") {
                              const ts = Date.now();
                              sessionStorage.setItem("home_tasks_refresh_ts", String(ts));
                              window.dispatchEvent(new CustomEvent("home-tasks-updated"));
                            }
                          } else {
                            console.error("Erro ao criar tarefa (Background):", result.error);
                            // Reverte a atualização de UI no erro
                            setTasks(prev => prev.filter(t => t.id !== tempId));
                          }
                        }).catch(err => {
                          console.error("Erro ao criar tarefa (CatchBackground):", err);
                          setTasks(prev => prev.filter(t => t.id !== tempId));
                        });

                        // 3. Libera imediatamente o input para o usuário escrever outra tarefa (Velocidade)
                        return { success: true } as any;

                      } catch (error) {
                        console.error("Erro interno no processamento otimista:", error);
                      }
                    }}
                  />

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
                        disabled={false}
                        showProjectTag={true}
                        projectTags={currentWorkspace?.isPersonal ? undefined : workspaceTags}
                        showWorkspaceBadge={false}
                        workspaceName={workspaceName}
                        allowInlineTitleEdit={false}
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
          onTaskCreated={handleTaskCreatedOptimistic}
          onTaskUpdated={handleTaskUpdated}
          onTaskUpdatedOptimistic={handleTaskUpdatedOptimistic}
        />
      )}

    </>
  );
}
