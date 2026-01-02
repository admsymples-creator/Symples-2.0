"use client";

import { useState, useEffect, useCallback, useRef, useMemo, startTransition } from "react";
import { usePathname } from "next/navigation";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";
import type { EventDropArg, EventClickArg, EventApi, ViewApi } from "@fullcalendar/core";
import type { DateClickArg } from "@fullcalendar/interaction";
import ptBrLocale from "@fullcalendar/core/locales/pt-br";
import { useWorkspace } from "@/components/providers/SidebarProvider";
import { getTasksForCalendar, updateTaskDate, type CalendarEvent } from "@/lib/actions/calendar";
import { getTaskDetails } from "@/lib/actions/task-details";
import { TaskDetailModal } from "@/components/tasks/TaskDetailModal";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import "@/components/calendar/planner-calendar.css";

type ViewType = "dayGridMonth" | "timeGridWeek" | "listDay";

interface PlannerCalendarProps {
  /**
   * Workspace ID opcional. Se não fornecido, detecta automaticamente:
   * - Se estiver em /planner: usa undefined (calendário geral)
   * - Se estiver em /tasks: usa activeWorkspaceId (calendário do workspace)
   * 
   * IMPORTANTE: Se for workspace pessoal, deve ser undefined para buscar de todos os workspaces.
   * Se for workspace profissional, deve ser o workspaceId específico.
   */
  workspaceId?: string | null | undefined;
  /**
   * Se true, esconde o header customizado (para usar controles externos)
   */
  hideHeader?: boolean;
  /**
   * Se true, esconde apenas os tabs de visualização (Mês, Semana, Lista), mantendo navegação
   */
  hideViewTabs?: boolean;
  /**
   * Callback para expor controles do calendário (handlers e estado)
   */
  onControlsReady?: (controls: {
    handlePrev: () => void;
    handleNext: () => void;
    handleToday: () => void;
    handleViewChange: (view: string) => void;
    monthYearTitle: string;
    currentView: ViewType;
    reloadEvents?: () => void;
  }) => void;
  /**
   * Callback externo para recarregar eventos (chamado quando tarefa é criada externamente)
   */
  onExternalTaskCreated?: () => void;
}

export function PlannerCalendar({ workspaceId: propWorkspaceId, hideHeader = false, hideViewTabs = false, onControlsReady, onExternalTaskCreated }: PlannerCalendarProps = {}) {
  const pathname = usePathname();
  const { activeWorkspaceId, isLoaded } = useWorkspace();
  
  // Determinar qual workspaceId usar
  const effectiveWorkspaceId = propWorkspaceId !== undefined 
    ? propWorkspaceId 
    : pathname === "/planner" 
      ? undefined 
      : activeWorkspaceId ?? undefined;

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [currentView, setCurrentView] = useState<ViewType>("dayGridMonth");
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [isMobile, setIsMobile] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [isLoadingTask, setIsLoadingTask] = useState(false);
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [initialDueDate, setInitialDueDate] = useState<string | undefined>();
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  
  const calendarRef = useRef<FullCalendar>(null);
  const draggedEventRef = useRef<EventApi | null>(null);
  const originalDateRef = useRef<string | null>(null);
  const eventsCacheRef = useRef<Map<string, CalendarEvent[]>>(new Map());
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const previousEventsRef = useRef<CalendarEvent[]>([]);

  // Detectar mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth < 768) {
        setCurrentView("listDay");
      }
    };
    
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Gerar chave de cache para range de datas
  const getCacheKey = useCallback((start: Date, end: Date) => {
    const startISO = start.toISOString().split('T')[0];
    const endISO = end.toISOString().split('T')[0];
    return `${startISO}-${endISO}-${effectiveWorkspaceId || 'all'}`;
  }, [effectiveWorkspaceId]);

  // Carregar eventos do calendário com cache
  const loadEvents = useCallback(async (start: Date, end: Date, useCache = true) => {
    if (!isLoaded && effectiveWorkspaceId !== undefined) return;

    const cacheKey = getCacheKey(start, end);
    
    // Verificar cache
    if (useCache && eventsCacheRef.current.has(cacheKey)) {
      const cachedEvents = eventsCacheRef.current.get(cacheKey)!;
      setEvents(cachedEvents);
      return;
    }

    setIsLoadingEvents(true);
    try {
      const calendarEvents = await getTasksForCalendar(
        start,
        end,
        effectiveWorkspaceId
      );
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/3cb1781a-45f3-4822-84f0-70123428e0e4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'components/calendar/planner-calendar.tsx:125',message:'HYP-A: Events received from getTasksForCalendar',data:{eventCount:calendarEvents.length,sampleEvent:calendarEvents[0]?{id:calendarEvents[0].id,start:calendarEvents[0].start}:null},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      
      // Salvar no cache
      eventsCacheRef.current.set(cacheKey, calendarEvents);
      
      // Limitar tamanho do cache (manter apenas últimos 10 ranges)
      if (eventsCacheRef.current.size > 10) {
        const firstKey = eventsCacheRef.current.keys().next().value;
        if (firstKey !== undefined) {
          eventsCacheRef.current.delete(firstKey);
        }
      }
      
      setEvents(calendarEvents);
    } catch (error) {
      console.error("[PlannerCalendar] Erro ao carregar eventos:", error);
      toast.error("Erro ao carregar tarefas do calendário");
    } finally {
      setIsLoadingEvents(false);
    }
  }, [effectiveWorkspaceId, isLoaded, getCacheKey]);

  // Handler para mudança de datas com debounce
  const handleDatesSet = useCallback((arg: { start: Date; end: Date; view: ViewApi }) => {
    // Atualizar data atual para o título
    setCurrentDate(arg.view.currentStart);
    
    // Debounce de 300ms
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    
    debounceTimeoutRef.current = setTimeout(() => {
      loadEvents(arg.start, arg.end);
    }, 300);
  }, [loadEvents]);

  // Handler para drag & drop com optimistic UI melhorado
  const handleEventDrop = useCallback(async (info: EventDropArg) => {
    const event = info.event;
    const newDate = event.start;
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/3cb1781a-45f3-4822-84f0-70123428e0e4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'components/calendar/planner-calendar.tsx:171',message:'BUG-2: handleEventDrop called',data:{eventId:event.id,newDate:newDate?.toString(),newDateISO:newDate?.toISOString(),eventAllDay:event.allDay},timestamp:Date.now(),sessionId:'debug-session',runId:'bug-investigation',hypothesisId:'bug-2'})}).catch(()=>{});
    // #endregion
    
    if (!newDate) {
      info.revert();
      return;
    }

    // Snapshot do estado anterior para rollback
    const previousEvents = [...events];
    const originalDate = originalDateRef.current || event.startStr;
    originalDateRef.current = originalDate;

    // FullCalendar já atualiza a UI, então não precisamos fazer nada aqui
    draggedEventRef.current = event;
    eventsCacheRef.current.clear();

    const optimisticStart = event.startStr || newDate.toISOString();
    setEvents((prev) =>
      prev.map((item) =>
        item.id === event.id
          ? { ...item, start: optimisticStart, allDay: event.allDay }
          : item
      )
    );

    try {
      const result = await updateTaskDate(event.id, newDate);
      
      if (!result.success) {
        // Reverter mudança em caso de erro
        info.revert();
        setEvents(previousEvents);
        toast.error(result.error || "Erro ao atualizar data da tarefa");
        eventsCacheRef.current.clear();
        draggedEventRef.current = null;
        originalDateRef.current = null;
      } else {
        // Sucesso: manter como está (FullCalendar já atualizou)
        // Invalidar cache para forçar recarga na próxima vez
        draggedEventRef.current = null;
        originalDateRef.current = null;
        // Não mostrar toast de sucesso para não poluir a UI
      }
    } catch (error) {
      console.error("[PlannerCalendar] Erro ao atualizar data:", error);
      info.revert();
      setEvents(previousEvents);
      toast.error("Erro ao atualizar data da tarefa");
      draggedEventRef.current = null;
      originalDateRef.current = null;
    }
  }, [events]);

  // Handler para clique em evento
  const handleEventClick = useCallback(async (info: EventClickArg) => {
    const taskId = info.event.id;
    setIsLoadingTask(true);
    setIsModalOpen(true);
    setSelectedTask(null);

    try {
      const taskDetails = await getTaskDetails(taskId);
      
      if (!taskDetails) {
        toast.error("Tarefa não encontrada");
        setIsModalOpen(false);
        return;
      }

      // Converter para formato do modal
      const modalTask = {
        id: taskDetails.id,
        title: taskDetails.title,
        description: taskDetails.description || "",
        status: taskDetails.status === "archived" ? "done" : taskDetails.status,
        assignee: taskDetails.assignee ? {
          name: taskDetails.assignee.full_name || "",
          avatar: taskDetails.assignee.avatar_url || undefined,
        } : undefined,
        dueDate: taskDetails.due_date || undefined,
        tags: taskDetails.tags || [],
        breadcrumbs: taskDetails.workspace ? [taskDetails.workspace.name] : [],
        workspaceId: taskDetails.workspace_id,
        subTasks: taskDetails.subtasks || [],
        activities: taskDetails.comments?.map(comment => ({
          id: comment.id,
          type: comment.type === "comment" ? "commented" : "updated",
          user: comment.user.full_name || "",
          message: comment.content,
          timestamp: comment.created_at,
          isCurrentUser: false,
        })) || [],
        attachments: taskDetails.attachments || [],
      };

      setSelectedTask(modalTask);
    } catch (error) {
      console.error("[PlannerCalendar] Erro ao carregar tarefa:", error);
      toast.error("Erro ao carregar detalhes da tarefa");
      setIsModalOpen(false);
    } finally {
      setIsLoadingTask(false);
    }
  }, []);

  // Handler para clique em data vazia
  const handleDateClick = useCallback((info: DateClickArg) => {
    console.log("[PlannerCalendar] dateClick chamado:", info);
    const clickedDate = info.date;
    const dateISO = clickedDate.toISOString().split('T')[0];
    
    setInitialDueDate(dateISO);
    setIsCreatingTask(true);
    setSelectedTask(null);
    setIsModalOpen(true);
  }, []);

  // Handler para atualização de tarefa com optimistic UI
  const handleTaskUpdated = useCallback(() => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/3cb1781a-45f3-4822-84f0-70123428e0e4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'components/calendar/planner-calendar.tsx:285',message:'BUG-2: handleTaskUpdated called',data:{timestamp:Date.now()},timestamp:Date.now(),sessionId:'debug-session',runId:'bug-investigation',hypothesisId:'bug-2'})}).catch(()=>{});
    // #endregion
    
    // Recarregar eventos após atualização
    // Invalidar cache para forçar recarga
    eventsCacheRef.current.clear();
    if (calendarRef.current) {
      const calendarApi = calendarRef.current.getApi();
      loadEvents(calendarApi.view.activeStart, calendarApi.view.activeEnd, false);
    }
  }, [loadEvents]);

  // Handler para criação de tarefa
  const handleTaskCreated = useCallback(() => {
    // Recarregar eventos após criação
    // Invalidar cache para forçar recarga
    eventsCacheRef.current.clear();
    if (calendarRef.current) {
      const calendarApi = calendarRef.current.getApi();
      loadEvents(calendarApi.view.activeStart, calendarApi.view.activeEnd, false);
    }
    setIsCreatingTask(false);
    setInitialDueDate(undefined);
  }, [loadEvents]);

  // Handlers de navegação
  const handlePrev = useCallback(() => {
    calendarRef.current?.getApi().prev();
  }, []);

  const handleNext = useCallback(() => {
    calendarRef.current?.getApi().next();
  }, []);

  const handleToday = useCallback(() => {
    calendarRef.current?.getApi().today();
  }, []);

  const handleViewChange = useCallback((view: string) => {
    const viewType = view as ViewType;
    setCurrentView(viewType);
    calendarRef.current?.getApi().changeView(viewType);
  }, []);

  // Formatar título do mês/ano
  const monthYearTitle = useMemo(() => {
    return format(currentDate, "MMMM yyyy", { locale: ptBR });
  }, [currentDate]);

  // Determinar view baseado em mobile/desktop
  const effectiveView = isMobile ? "listDay" : currentView;

  // Função para recarregar eventos
  const reloadEvents = useCallback(() => {
    eventsCacheRef.current.clear();
    if (calendarRef.current) {
      const calendarApi = calendarRef.current.getApi();
      loadEvents(calendarApi.view.activeStart, calendarApi.view.activeEnd, false);
    }
  }, [loadEvents]);

  // Escutar callback externo para recarregar quando tarefa é criada externamente
  useEffect(() => {
    if (onExternalTaskCreated) {
      // Criar um evento customizado para escutar atualizações externas
      const handleExternalUpdate = () => {
        reloadEvents();
      };
      
      // Adicionar listener para evento customizado
      window.addEventListener('planner-task-updated', handleExternalUpdate);
      
      return () => {
        window.removeEventListener('planner-task-updated', handleExternalUpdate);
      };
    }
  }, [onExternalTaskCreated, reloadEvents]);

  // Expor controles para componente pai
  useEffect(() => {
    if (onControlsReady) {
      onControlsReady({
        handlePrev,
        handleNext,
        handleToday,
        handleViewChange,
        monthYearTitle,
        currentView,
        reloadEvents,
      });
    }
  }, [onControlsReady, handlePrev, handleNext, handleToday, handleViewChange, monthYearTitle, currentView, reloadEvents]);

  // Limpar timeout no unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="flex flex-col h-full w-full">
      {/* Header Customizado */}
      {!isMobile && !hideHeader && (
        <div className="flex items-center justify-between mb-4 px-1">
          {/* Navegação (Prev/Next/Today) */}
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={handlePrev}
              className="h-8 w-8 text-gray-500 hover:text-gray-900"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={handleToday}
              className="h-8 px-3 text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              Hoje
            </Button>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={handleNext}
              className="h-8 w-8 text-gray-500 hover:text-gray-900"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          
          {/* Título do Mês/Ano */}
          <h2 className="text-lg font-semibold text-foreground capitalize">
            {monthYearTitle}
          </h2>
          
          {/* Tabs de View */}
          {!hideViewTabs && (
            <Tabs value={currentView} onValueChange={handleViewChange}>
              <TabsList variant="default" className="h-9">
                <TabsTrigger value="dayGridMonth" variant="default" className="text-sm px-3 h-7">Mês</TabsTrigger>
                <TabsTrigger value="timeGridWeek" variant="default" className="text-sm px-3 h-7">Semana</TabsTrigger>
                <TabsTrigger value="listDay" variant="default" className="text-sm px-3 h-7">Lista</TabsTrigger>
              </TabsList>
            </Tabs>
          )}
        </div>
      )}

      {/* Loading Indicator */}
      {/* Calendário */}
      <div className="flex-1 w-full relative card-surface overflow-hidden">
        {isLoadingEvents && (
          <div className="absolute top-3 right-3 z-10 pointer-events-none">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-card border border-border shadow-sm">
              <div className="w-3 h-3 border-2 border-border border-t-foreground/60 rounded-full animate-spin" />
              <span className="text-xs text-muted-foreground">Carregando...</span>
            </div>
          </div>
        )}
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
          initialView={effectiveView}
          height="auto"
          events={events}
          editable={true}
          droppable={true}
          eventDrop={handleEventDrop}
          eventClick={handleEventClick}
          dateClick={handleDateClick}
          datesSet={handleDatesSet}
          firstDay={1} // Segunda-feira
          headerToolbar={false}
          buttonText={{
            today: "Hoje",
            month: "Mês",
            week: "Semana",
            day: "Dia",
            list: "Lista"
          }}
          dayHeaderFormat={{ weekday: "short" }}
          dayHeaderContent={(arg) => {
            // Formatar dias da semana em português
            const days = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
            
            // CORREÇÃO: Usar getUTCDay() porque o FullCalendar passa datas em UTC para os cabeçalhos
            // Quando convertemos de UTC para local (UTC-3), getDay() retorna o dia anterior
            // Exemplo: 2026-01-02T00:00:00.000Z (quinta UTC) vira 2025-12-31T21:00:00-03:00 (quarta local)
            // Usando getUTCDay() mantemos o dia correto baseado em UTC
            return days[arg.date.getUTCDay()];
          }}
          viewDidMount={(view) => {
            // Sincronizar view atual com estado
            const viewType = view.view.type as ViewType;
            if (viewType !== currentView && !isMobile) {
              setCurrentView(viewType);
            }
            setCurrentDate(view.view.currentStart);
          }}
          eventDisplay="block"
          moreLinkClick="popover"
          moreLinkText="mais"
          eventClassNames="calendar-event"
          dayMaxEvents={3}
          locale={ptBrLocale}
          eventContent={(eventInfo) => {
            const isCompleted = eventInfo.event.extendedProps.status === "done";
            const recurrenceType = eventInfo.event.extendedProps.recurrence_type;
            const recurrenceParentId = eventInfo.event.extendedProps.recurrence_parent_id;
            const isRecurring = !!recurrenceType || !!recurrenceParentId;
            
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/3cb1781a-45f3-4822-84f0-70123428e0e4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'components/calendar/planner-calendar.tsx:488',message:'BUG-1: FullCalendar event rendering',data:{eventId:eventInfo.event.id,eventStart:eventInfo.event.start,eventStartStr:eventInfo.event.startStr,eventAllDay:eventInfo.event.allDay,timeText:eventInfo.timeText,dateObj:eventInfo.event.start?.toString()},timestamp:Date.now(),sessionId:'debug-session',runId:'bug-investigation',hypothesisId:'bug-1'})}).catch(()=>{});
            // #endregion
            
            // Ícone SVG de recorrência (RefreshCw)
            const recurrenceIcon = isRecurring ? `
              <svg class="fc-recurrence-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: inline-block; vertical-align: middle; margin-left: 4px; color: #3b82f6;">
                <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
              </svg>
            ` : '';
            
            return {
              html: `
                <div class="fc-event-main-frame">
                  <div class="fc-event-time">${eventInfo.timeText || ""}${recurrenceIcon}</div>
                  <div class="fc-event-title-container">
                    <div class="fc-event-title ${isCompleted ? "line-through" : ""}">${eventInfo.event.title}</div>
                  </div>
                </div>
              `,
            };
          }}
        />
      </div>

      {/* Modal de Tarefa */}
      <TaskDetailModal
        open={isModalOpen}
        onOpenChange={(open) => {
          setIsModalOpen(open);
          if (!open) {
            setIsCreatingTask(false);
            setInitialDueDate(undefined);
            setSelectedTask(null);
          }
        }}
        mode={isCreatingTask ? "create" : "edit"}
        task={isCreatingTask ? {
          id: "",
          title: "",
          description: "",
          status: "todo",
          breadcrumbs: [],
          workspaceId: effectiveWorkspaceId || null,
          subTasks: [],
          activities: [],
        } : selectedTask || undefined}
        initialDueDate={initialDueDate}
        onTaskCreated={handleTaskCreated}
        onTaskUpdated={handleTaskUpdated}
        onTaskUpdatedOptimistic={(taskId, updates) => {
          // Optimistic update quando tarefa é atualizada no modal
          if (updates.dueDate !== undefined) {
            const previousEvents = [...events];
            startTransition(() => {
              setEvents(prev => prev.map(event => 
                event.id === taskId 
                  ? { ...event, start: updates.dueDate || event.start }
                  : event
              ));
            });
            
            // Invalidar cache
            eventsCacheRef.current.clear();
            
            // Se houver erro, o modal já trata, mas podemos adicionar rollback aqui se necessário
          }
        }}
      />
    </div>
  );
}
