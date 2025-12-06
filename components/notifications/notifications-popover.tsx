"use client";

import React, { useState, useEffect } from "react";
import { Bell, Check, CheckCheck } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { NotificationItem } from "./notification-item";
import { 
  getNotifications, 
  markAsRead, 
  markAllAsRead, 
  getUnreadCount,
  NotificationWithActor 
} from "@/lib/actions/notifications";
import { createBrowserClient } from "@/lib/supabase/client";

interface NotificationsPopoverProps {
  userRole?: 'owner' | 'admin' | 'member' | 'viewer';
  useMockData?: boolean; // Prop para forçar dados mock
}

// Dados mock para visualização do design
const getMockNotifications = (): NotificationWithActor[] => {
  const now = new Date();
  const twoMinutesAgo = new Date(now.getTime() - 2 * 60 * 1000);
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000);
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

  return [
    // Comentário com áudio (prioridade roxa)
    {
      id: "1",
      recipient_id: "user-1",
      triggering_user_id: "user-2",
      category: "operational",
      resource_type: "task",
      resource_id: "task-1",
      title: "João Silva comentou em Dashboard 2.0",
      content: "Precisamos rever os gráficos de conversão antes da apresentação.",
      action_url: "/tasks?task=task-1",
      metadata: {
        actor_name: "João Silva",
        file_type: "audio",
        task_title: "Dashboard 2.0",
        color: "text-purple-600",
        bg: "bg-purple-50"
      },
      read_at: null,
      created_at: twoMinutesAgo.toISOString(),
      triggering_user: {
        full_name: "João Silva",
        avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Joao"
      }
    },
    // Anexo de imagem
    {
      id: "2",
      recipient_id: "user-1",
      triggering_user_id: "user-3",
      category: "operational",
      resource_type: "attachment",
      resource_id: "attach-1",
      title: "Maria Santos anexou um arquivo em Proposta B2B",
      content: "mockup-final.png",
      action_url: "/tasks?task=task-2",
      metadata: {
        actor_name: "Maria Santos",
        file_type: "image",
        task_title: "Proposta B2B",
        file_name: "mockup-final.png"
      },
      read_at: null,
      created_at: oneHourAgo.toISOString(),
      triggering_user: {
        full_name: "Maria Santos",
        avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Maria"
      }
    },
    // Anexo de PDF
    {
      id: "3",
      recipient_id: "user-1",
      triggering_user_id: "user-4",
      category: "operational",
      resource_type: "attachment",
      resource_id: "attach-2",
      title: "Pedro Oliveira anexou um arquivo em Relatório Q3",
      content: "Q3_Report_Final.pdf",
      action_url: "/tasks?task=task-3",
      metadata: {
        actor_name: "Pedro Oliveira",
        file_type: "pdf",
        task_title: "Relatório Q3",
        file_name: "Q3_Report_Final.pdf"
      },
      read_at: null,
      created_at: threeHoursAgo.toISOString(),
      triggering_user: {
        full_name: "Pedro Oliveira",
        avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Pedro"
      }
    },
    // Atribuição de tarefa
    {
      id: "4",
      recipient_id: "user-1",
      triggering_user_id: "user-5",
      category: "operational",
      resource_type: "task",
      resource_id: "task-4",
      title: "Ana Costa atribuiu a tarefa \"Implementar login\" para você",
      content: "Preciso que você implemente o sistema de autenticação completo.",
      action_url: "/tasks?task=task-4",
      metadata: {
        actor_name: "Ana Costa",
        task_title: "Implementar login"
      },
      read_at: null,
      created_at: oneDayAgo.toISOString(),
      triggering_user: {
        full_name: "Ana Costa",
        avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Ana"
      }
    },
    // Comentário normal
    {
      id: "5",
      recipient_id: "user-1",
      triggering_user_id: "user-6",
      category: "operational",
      resource_type: "task",
      resource_id: "task-5",
      title: "Carlos Mendes comentou em Revisão de Código",
      content: "O código está muito bom! Apenas alguns ajustes menores na validação.",
      action_url: "/tasks?task=task-5",
      metadata: {
        actor_name: "Carlos Mendes",
        task_title: "Revisão de Código"
      },
      read_at: oneDayAgo.toISOString(),
      created_at: twoDaysAgo.toISOString(),
      triggering_user: {
        full_name: "Carlos Mendes",
        avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Carlos"
      }
    },
    // Convite de workspace (Admin)
    {
      id: "6",
      recipient_id: "user-1",
      triggering_user_id: "user-7",
      category: "admin",
      resource_type: "member",
      resource_id: "invite-1",
      title: "Julius Rock convidou você para Design Team",
      content: "Você foi convidado como member",
      action_url: "/settings?invite=invite-1",
      metadata: {
        actor_name: "Julius Rock",
        workspace_name: "Design Team",
        role: "member"
      },
      read_at: null,
      created_at: oneDayAgo.toISOString(),
      triggering_user: {
        full_name: "Julius Rock",
        avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Julius"
      }
    },
    // Tarefa atrasada (Sistema)
    {
      id: "7",
      recipient_id: "user-1",
      triggering_user_id: null,
      category: "system",
      resource_type: "task",
      resource_id: "task-6",
      title: "Tarefa \"Proposta B2B\" está atrasada",
      content: "A tarefa está atrasada há 3 dia(s)",
      action_url: "/tasks?task=task-6",
      metadata: {
        task_title: "Proposta B2B",
        days_overdue: 3
      },
      read_at: null,
      created_at: oneDayAgo.toISOString(),
      triggering_user: null
    },
    // Novo membro adicionado (Admin)
    {
      id: "8",
      recipient_id: "user-1",
      triggering_user_id: "user-8",
      category: "admin",
      resource_type: "member",
      resource_id: "member-1",
      title: "Lucas Ferreira foi adicionado ao workspace",
      content: "Lucas agora faz parte da equipe como admin",
      action_url: "/settings",
      metadata: {
        actor_name: "Lucas Ferreira",
        role_changed_to: "admin"
      },
      read_at: null,
      created_at: twoDaysAgo.toISOString(),
      triggering_user: {
        full_name: "Lucas Ferreira",
        avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Lucas"
      }
    },
    // Tarefa concluída
    {
      id: "9",
      recipient_id: "user-1",
      triggering_user_id: "user-9",
      category: "operational",
      resource_type: "task",
      resource_id: "task-7",
      title: "Fernanda Lima finalizou a tarefa \"Deploy em Produção\"",
      content: "A tarefa foi marcada como concluída com sucesso!",
      action_url: "/tasks?task=task-7",
      metadata: {
        actor_name: "Fernanda Lima",
        task_title: "Deploy em Produção"
      },
      read_at: twoDaysAgo.toISOString(),
      created_at: twoDaysAgo.toISOString(),
      triggering_user: {
        full_name: "Fernanda Lima",
        avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Fernanda"
      }
    },
    // Múltiplos arquivos
    {
      id: "10",
      recipient_id: "user-1",
      triggering_user_id: "user-10",
      category: "operational",
      resource_type: "attachment",
      resource_id: "attach-3",
      title: "Roberto Alves anexou arquivos em Documentação Técnica",
      content: "5 arquivos anexados",
      action_url: "/tasks?task=task-8",
      metadata: {
        actor_name: "Roberto Alves",
        file_count: 5,
        task_title: "Documentação Técnica"
      },
      read_at: null,
      created_at: threeHoursAgo.toISOString(),
      triggering_user: {
        full_name: "Roberto Alves",
        avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Roberto"
      }
    }
  ];
};

export function NotificationsPopover({ userRole, useMockData = false }: NotificationsPopoverProps) {
  // Se usar mock, inicializar com dados imediatamente
  const initialMockData = useMockData ? getMockNotifications() : [];
  const [notifications, setNotifications] = useState<NotificationWithActor[]>(initialMockData);
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const initialUnread = useMockData ? initialMockData.filter(n => !n.read_at).length : 0;
  const [unreadCount, setUnreadCount] = useState(initialUnread);
  const [loading, setLoading] = useState(!useMockData); // Não carregar se já temos mock

  const isAdmin = userRole === 'owner' || userRole === 'admin';

  // Carregar notificações
  const loadNotifications = async () => {
    setLoading(true);
    try {
      if (useMockData) {
        // Usar dados mock
        const mockData = getMockNotifications();
        setNotifications(mockData);
        const unread = mockData.filter(n => !n.read_at).length;
        setUnreadCount(unread);
      } else {
        // Carregar dados reais
        const all = await getNotifications({ limit: 50 });
        setNotifications(all);
        
        const count = await getUnreadCount();
        setUnreadCount(count);
      }
    } catch (error) {
      console.error("Error loading notifications:", error);
      // Em caso de erro, usar dados mock como fallback
      const mockData = getMockNotifications();
      setNotifications(mockData);
      setUnreadCount(mockData.filter(n => !n.read_at).length);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useMockData]);

  // Configurar Realtime (apenas se não estiver usando mock)
  useEffect(() => {
    if (useMockData) return; // Não configurar Realtime com dados mock
    
    const supabase = createBrowserClient();
    
    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
        },
        async (payload) => {
          // Adicionar nova notificação ao topo
          // Precisamos buscar os dados completos com relacionamento
          const newNotification = payload.new as any;
          
          // Buscar dados do usuário que disparou a notificação se existir
          if (newNotification.triggering_user_id) {
            const { data: userData } = await supabase
              .from('profiles')
              .select('full_name, avatar_url')
              .eq('id', newNotification.triggering_user_id)
              .single();
            
            newNotification.triggering_user = userData;
          }
          
          setNotifications((prev) => [newNotification as NotificationWithActor, ...prev]);
          
          // Atualizar contador
          setUnreadCount((prev) => prev + 1);
          
          // Mostrar toast discreto
          toast.info(newNotification.title, {
            description: newNotification.content || undefined,
            duration: 3000,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [useMockData]);

  const handleMarkAsRead = async (id: string) => {
    // Optimistic UI
    const previousNotifications = [...notifications];
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));

    if (useMockData) {
      // Com dados mock, apenas atualizar localmente
      return;
    }

    const result = await markAsRead(id);
    
    if (!result.success) {
      // Rollback
      setNotifications(previousNotifications);
      setUnreadCount((prev) => prev + 1);
      toast.error(result.error || "Erro ao marcar como lida");
    }
  };

  const handleMarkAllAsRead = async () => {
    // Optimistic UI
    const previousNotifications = [...notifications];
    const previousUnreadCount = unreadCount;
    
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, read_at: new Date().toISOString() }))
    );
    setUnreadCount(0);

    if (useMockData) {
      // Com dados mock, apenas atualizar localmente
      toast.success("Todas as notificações foram marcadas como lidas");
      return;
    }

    const result = await markAllAsRead();
    
    if (!result.success) {
      // Rollback
      setNotifications(previousNotifications);
      setUnreadCount(previousUnreadCount);
      toast.error(result.error || "Erro ao marcar todas como lidas");
    } else {
      toast.success("Todas as notificações foram marcadas como lidas");
    }
  };

  // Filtrar notificações por aba
  const getFilteredNotifications = () => {
    switch (activeTab) {
      case "admin":
        return notifications.filter((n) => n.category === 'admin');
      case "unread":
        return notifications.filter((n) => !n.read_at);
      default:
        return notifications;
    }
  };

  const filteredNotifications = getFilteredNotifications();
  const hasUnread = unreadCount > 0;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 relative"
          aria-label="Notificações"
        >
          <Bell className="w-5 h-5 text-gray-600" />
          {hasUnread && (
            <span className="absolute top-1 right-1 w-2 h-2 bg-blue-500 rounded-full border-2 border-white" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="end">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900">Notificações</h3>
            {hasUnread && (
              <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
          {hasUnread && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-gray-500 h-auto py-1 px-2 hover:text-gray-900"
              onClick={handleMarkAllAsRead}
            >
              <Check className="w-3 h-3 mr-1" />
              Marcar todas
            </Button>
          )}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full rounded-none border-b border-gray-100 bg-transparent h-auto p-0 justify-start pl-4">
            <TabsTrigger 
              value="all" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent"
            >
              Todas
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger 
                value="admin"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent"
              >
                Admin
              </TabsTrigger>
            )}
            <TabsTrigger 
              value="unread"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent"
            >
              Não Lidas
              {unreadCount > 0 && (
                <span className="ml-1 bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                  {unreadCount}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Content */}
          <TabsContent value={activeTab} className="m-0">
            <div className="max-h-[400px] overflow-y-auto scrollbar-thin scroll-smooth">
              {loading ? (
                <div className="p-8 text-center text-gray-500">
                  Carregando...
                </div>
              ) : filteredNotifications.length === 0 ? (
                <div className="p-8 text-center">
                  {activeTab === "unread" && unreadCount === 0 ? (
                    <>
                      <CheckCheck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-sm text-gray-500 font-medium">
                        Tudo limpo! Você está em dia.
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-gray-500">
                      Nenhuma notificação encontrada.
                    </p>
                  )}
                </div>
              ) : (
                <div className="flex flex-col">
                  {filteredNotifications.map((notification) => {
                    return (
                      <NotificationItem
                        key={notification.id}
                        notification={notification}
                        onMarkAsRead={handleMarkAsRead}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}

