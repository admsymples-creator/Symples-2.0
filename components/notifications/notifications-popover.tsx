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
}

export function NotificationsPopover({ userRole }: NotificationsPopoverProps) {
  const [notifications, setNotifications] = useState<NotificationWithActor[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const isAdmin = userRole === 'owner' || userRole === 'admin';

  // Carregar notificações
  const loadNotifications = async () => {
    setLoading(true);
    try {
      const all = await getNotifications({ limit: 50 });
      setNotifications(all);
      
      const count = await getUnreadCount();
      setUnreadCount(count);
    } catch (error) {
      console.error("Error loading notifications:", error);
      toast.error("Erro ao carregar notificações");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  // Configurar Realtime
  useEffect(() => {
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
  }, []);

  const handleMarkAsRead = async (id: string) => {
    // Optimistic UI
    const previousNotifications = [...notifications];
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));

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
          <TabsList className="w-full rounded-none border-b border-gray-100 bg-transparent h-auto p-0">
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
            <ScrollArea className="h-[400px] max-h-[400px]">
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
                  {filteredNotifications.map((notification) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onMarkAsRead={handleMarkAsRead}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}

