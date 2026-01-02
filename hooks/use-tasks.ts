"use client";

import { useReducer, useEffect, useCallback, useRef } from "react";
import { getTasks, type TaskWithDetails } from "@/lib/actions/tasks";
import { mapStatusToLabel } from "@/lib/config/tasks";

type ContextTab = "minhas" | "time" | "todas";

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
}

interface UseTasksOptions {
    workspaceId: string | null;
    tab: ContextTab;
    enabled?: boolean;
    tag?: string;
}

interface UseTasksReturn {
    tasks: Task[];
    isLoading: boolean;
    error: Error | null;
    refetch: () => Promise<void>;
    isRefetching: boolean;
}

// Estado do reducer
interface TasksState {
    tasks: Task[];
    isLoading: boolean;
    error: Error | null;
    isRefetching: boolean;
}

// Ações do reducer
type TasksAction =
    | { type: 'LOADING_START'; payload: { isRefetch: boolean } }
    | { type: 'LOADING_SUCCESS'; payload: { tasks: Task[] } }
    | { type: 'LOADING_FAILURE'; payload: { error: Error } }
    | { type: 'LOADING_RESET' }
    | { type: 'SET_TASKS'; payload: { tasks: Task[] } };

// Estado inicial
const initialState: TasksState = {
    tasks: [],
    isLoading: false,
    error: null,
    isRefetching: false,
};

// Reducer para gerenciar todos os estados de uma vez
function tasksReducer(state: TasksState, action: TasksAction): TasksState {
    switch (action.type) {
        case 'LOADING_START':
            return {
                ...state,
                isLoading: !action.payload.isRefetch,
                isRefetching: action.payload.isRefetch,
                error: null,
            };
        case 'LOADING_SUCCESS':
            return {
                ...state,
                tasks: action.payload.tasks,
                isLoading: false,
                isRefetching: false,
                error: null,
            };
        case 'LOADING_FAILURE':
            return {
                ...state,
                isLoading: false,
                isRefetching: false,
                error: action.payload.error,
            };
        case 'LOADING_RESET':
            return {
                ...state,
                isLoading: false,
                isRefetching: false,
            };
        case 'SET_TASKS':
            return {
                ...state,
                tasks: action.payload.tasks,
                error: null,
            };
        default:
            return state;
    }
}

// Cache simples baseado em chave workspaceId-tab
const taskCache = new Map<string, { data: Task[]; timestamp: number }>();
const CACHE_DURATION = 30000; // 30 segundos

// Função para mapear dados do banco para interface local
function mapTaskFromDB(task: TaskWithDetails): Task {
    // Extrair tags do origin_context se existir
    const tags: string[] = [];
    if (task.origin_context && typeof task.origin_context === 'object' && 'tags' in task.origin_context && Array.isArray((task.origin_context as any).tags)) {
        tags.push(...(task.origin_context as any).tags);
    } else if ((task as any).tags && Array.isArray((task as any).tags)) {
        tags.push(...(task as any).tags);
    }

    // Mapear assignees - usar array assignees se disponível (inclui task_members), senão usar assignee
    let assignees: Array<{ name: string; avatar?: string; id?: string }> = [];
    if ((task as any).assignees && Array.isArray((task as any).assignees)) {
        // Usar array assignees que já vem transformado das queries
        assignees = (task as any).assignees;
    } else {
        // Fallback para assignee antigo (compatibilidade)
        const assigneeData = (task as any).assignee;
        if (assigneeData) {
            assignees = [{
                name: assigneeData.full_name || assigneeData.email || "Sem nome",
                avatar: assigneeData.avatar_url || undefined,
                id: task.assignee_id || undefined
            }];
        }
    }

        return {
            id: task.id,
            title: task.title,
            completed: task.status === "done",
            priority: (task.priority as "low" | "medium" | "high" | "urgent" | undefined) || undefined,
            status: mapStatusToLabel(task.status || "todo"),
        assignees,
        assigneeId: task.assignee_id || null,
        dueDate: task.due_date || undefined,
        tags,
        hasUpdates: false,
        workspaceId: task.workspace_id || null,
        group: task.group ? {
            id: task.group.id,
            name: task.group.name,
            color: task.group.color || undefined
        } : undefined,
        hasComments: (task as any).comment_count > 0,
        commentCount: (task as any).comment_count || 0,
    };
}

// Função para criar chave de cache
function getCacheKey(workspaceId: string | null, tab: ContextTab, tag?: string): string {
    const tagPart = tag ? `-tag:${tag}` : '';
    return `${workspaceId || 'null'}-${tab}${tagPart}`;
}

// Função para retry com backoff exponencial
async function retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    initialDelay: number = 1000
): Promise<T> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));
            
            if (attempt < maxRetries) {
                const delay = initialDelay * Math.pow(2, attempt);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    
    throw lastError || new Error("Retry failed");
}

export function useTasks({ workspaceId, tab, enabled = true, tag }: UseTasksOptions): UseTasksReturn {
    // ✅ OTIMIZAÇÃO: Usar useReducer para atualizar todos os estados em uma única operação
    // Isso elimina múltiplas renderizações em cascata (6-8x) causadas por setState sequenciais
    const [state, dispatch] = useReducer(tasksReducer, initialState);
    
    const isMountedRef = useRef(true);
    const isLoadingRef = useRef(false);
    const lastLoadKeyRef = useRef<string>("");
    const loadTasksRef = useRef<((isRefetch: boolean) => Promise<void>) | null>(null);
    const currentRequestIdRef = useRef<number>(0);

    // Função para carregar tarefas
    const loadTasks = useCallback(async (isRefetch: boolean = false) => {
        if (!enabled) return;

        // ✅ TRAVA DE SEGURANÇA: Se workspaceId não for fornecido, abortar
        // (Para a rota /tasks, o Server Component deve fazer a busca)
        if (!workspaceId) {
            console.warn("[use-tasks] ALERTA: Tentativa de fetch sem workspaceId. ABORTADO.");
            return; // Trava de segurança no Client-Side
        }

        // Criar chave única para esta combinação
        const loadKey = `${workspaceId || 'null'}-${tab}${tag ? `-tag:${tag}` : ''}`;
        
        // Evitar múltiplas chamadas simultâneas para a mesma chave
        if (isLoadingRef.current && lastLoadKeyRef.current === loadKey && !isRefetch) {
            return;
        }

        // Gerar ID único para esta requisição
        const requestId = ++currentRequestIdRef.current;
        
        // Marcar como carregando
        isLoadingRef.current = true;
        lastLoadKeyRef.current = loadKey;

        const cacheKey = getCacheKey(workspaceId, tab, tag);
        const cached = taskCache.get(cacheKey);
        const now = Date.now();

        // Verificar cache se não for refetch
        if (!isRefetch && cached && (now - cached.timestamp) < CACHE_DURATION) {
            if (isMountedRef.current) {
                // ✅ OTIMIZAÇÃO: Atualizar tasks e error em uma única operação via reducer
                dispatch({ type: 'SET_TASKS', payload: { tasks: cached.data } });
            }
            return;
        }

        // ✅ OTIMIZAÇÃO: DISPATCH 1 - Início do carregamento (atualiza isLoading/isRefetching/error em uma única operação)
        if (isMountedRef.current) {
            dispatch({ type: 'LOADING_START', payload: { isRefetch } });
        }

        try {
            // Determinar filtros baseado na aba ativa
            let filters: {
                workspaceId?: string | null;
                assigneeId?: string | null | "current";
                dueDateStart?: string;
                dueDateEnd?: string;
                tag?: string;
            } = {};

            // Aplicar filtro de workspace baseado na aba ativa
            if (tab === "minhas") {
                // Minhas: Tudo que eu estou atribuído (sem filtro de workspace)
                filters.assigneeId = "current";
            } else {
                // Time e Todas: Filtrar por workspace ativo
                filters.workspaceId = workspaceId || null;
                
                if (tab === "time") {
                    // Time: Tarefas da semana (até o próximo domingo)
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const nextSunday = new Date(today);
                    const dayOfWeek = today.getDay();
                    const daysUntilSunday = dayOfWeek === 0 ? 7 : 7 - dayOfWeek;
                    nextSunday.setDate(today.getDate() + daysUntilSunday);
                    nextSunday.setHours(23, 59, 59, 999);
                    
                    filters.dueDateStart = today.toISOString();
                    filters.dueDateEnd = nextSunday.toISOString();
                }
            }

            // Aplicar filtro de tag se fornecido
            if (tag) {
                filters.tag = tag;
            }

            // Carregar tarefas com retry
            const tasksFromDB = await retryWithBackoff(async () => {
                // Verificar se esta requisição ainda é a atual
                if (requestId !== currentRequestIdRef.current) {
                    throw new Error("Request superseded");
                }
                return await getTasks(filters);
            });

            // Verificar se esta requisição ainda é a atual ou se o componente foi desmontado
            if (requestId !== currentRequestIdRef.current || !isMountedRef.current) {
                return;
            }

            // Filtrar tarefas arquivadas
            const activeTasks = tasksFromDB.filter(t => t.status !== "archived");
            const mappedTasks = activeTasks.map(mapTaskFromDB);

            // Atualizar cache
            taskCache.set(cacheKey, {
                data: mappedTasks,
                timestamp: now
            });

            // ✅ OTIMIZAÇÃO: DISPATCH 2 - Sucesso (atualiza tasks, isLoading, isRefetching, error em uma única operação)
            if (isMountedRef.current) {
                dispatch({ 
                    type: 'LOADING_SUCCESS', 
                    payload: { tasks: mappedTasks } 
                });
            }
        } catch (err) {
            // Verificar se esta requisição ainda é a atual ou se foi substituída
            if (requestId !== currentRequestIdRef.current || !isMountedRef.current) {
                return;
            }

            const error = err instanceof Error ? err : new Error(String(err));
            
            // Ignorar erros de requisições substituídas
            if (error.message === "Request superseded") {
                return;
            }
            
            // ✅ OTIMIZAÇÃO: DISPATCH 3 - Erro (atualiza isLoading, isRefetching, error em uma única operação)
            if (isMountedRef.current) {
                dispatch({ 
                    type: 'LOADING_FAILURE', 
                    payload: { error } 
                });
                console.error("Erro ao carregar tarefas:", error);
            }
        } finally {
            // Resetar flag de loading (não precisa dispatch pois já foi feito nos casos acima)
            if (isMountedRef.current) {
                isLoadingRef.current = false;
            }
        }
    }, [workspaceId, tab, enabled]);

    // Atualizar ref da função
    loadTasksRef.current = loadTasks;

    // Função para refetch manual
    const refetch = useCallback(async () => {
        // Invalidar cache antes de refetch
        const cacheKey = getCacheKey(workspaceId, tab, tag);
        taskCache.delete(cacheKey);
        // Resetar flag de loading para permitir refetch
        isLoadingRef.current = false;
        if (loadTasksRef.current) {
            await loadTasksRef.current(true);
        }
    }, [workspaceId, tab]);

    // Carregar tarefas quando dependências mudarem
    useEffect(() => {
        // Só carregar se enabled
        if (!enabled) return;
        
        // Aguardar que loadTasks esteja disponível
        if (!loadTasksRef.current) return;
        
        // Criar chave única para esta combinação
        const loadKey = `${workspaceId || 'null'}-${tab}${tag ? `-tag:${tag}` : ''}`;
        
        // Evitar recarregar se já está carregando para a mesma chave
        if (isLoadingRef.current && lastLoadKeyRef.current === loadKey) {
            return;
        }
        
        // Chamar loadTasks usando ref para evitar problemas com dependências
        loadTasksRef.current(false);
    }, [workspaceId, tab, enabled, tag]); // Dependências fixas - sempre o mesmo tamanho

    // Cleanup
    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
            isLoadingRef.current = false;
            // Invalidar requisições futuras incrementando o ID
            currentRequestIdRef.current++;
        };
    }, []);

    return {
        tasks: state.tasks,
        isLoading: state.isLoading,
        error: state.error,
        refetch,
        isRefetching: state.isRefetching,
    };
}

// Função para invalidar cache (útil para atualizações externas)
export function invalidateTasksCache(workspaceId: string | null, tab?: ContextTab) {
    if (tab) {
        const cacheKey = getCacheKey(workspaceId, tab);
        taskCache.delete(cacheKey);
    } else {
        // Invalidar todos os caches deste workspace
        const prefix = workspaceId || 'null';
        for (const key of taskCache.keys()) {
            if (key.startsWith(prefix)) {
                taskCache.delete(key);
            }
        }
    }
}

