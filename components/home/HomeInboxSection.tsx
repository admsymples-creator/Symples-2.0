"use client";

import React, { useState, useEffect } from "react";
import { NotificationItem } from "@/components/notifications/notification-item";
import { getNotifications, markAsRead, NotificationWithActor } from "@/lib/actions/notifications";
import { Loader2, Inbox, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWorkspace } from "@/components/providers/SidebarProvider";

interface HomeInboxSectionProps {
  initialNotifications?: NotificationWithActor[];
}

export function HomeInboxSection({ initialNotifications }: HomeInboxSectionProps) {
  const [notifications, setNotifications] = useState<NotificationWithActor[]>(initialNotifications || []);
  const [loading, setLoading] = useState(!initialNotifications); // Não mostrar loading se já temos dados iniciais
  const [displayLimit, setDisplayLimit] = useState(5);
  const { activeWorkspaceId, isLoaded } = useWorkspace();

  // Buscar notificações - OTIMIZADO: só fazer fetch se não tiver dados iniciais
  // IMPORTANTE: Este useEffect deve sempre ser chamado (não condicional)
  useEffect(() => {
    const loadNotifications = async () => {
      if (!isLoaded) return; // Aguardar workspace carregar
      
      // Se temos dados iniciais, não fazer fetch na primeira renderização
      if (initialNotifications !== undefined) {
        return; // Usar dados iniciais
      }
      
      setLoading(true);
      try {
        // OTIMIZAÇÃO: Filtrar por workspace no backend e reduzir limit
        // Não precisa mais buscar 100 e filtrar no frontend
        const fetchedNotifications = await getNotifications({ 
          limit: 30, // Reduzido de 100 para 30 (suficiente para exibição inicial)
          workspaceId: activeWorkspaceId || null, // Filtrar no backend
        });
        
        setNotifications(fetchedNotifications || []);
      } catch (error) {
        console.error("Erro ao carregar notificações:", error);
        setNotifications([]);
      } finally {
        setLoading(false);
      }
    };

    loadNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeWorkspaceId, isLoaded]); // Removido initialNotifications das dependências para evitar loops

  const displayedNotifications = notifications.slice(0, displayLimit);
  const hasMore = notifications.length > displayLimit;

  const handleLoadMore = () => {
    setDisplayLimit(prev => prev + 5);
  };

  const handleMarkAsRead = async (id: string) => {
    // Optimistic UI: atualizar estado local primeiro
    const previousNotifications = [...notifications];
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
    );

    try {
      const result = await markAsRead(id);
      if (!result.success) {
        // Rollback em caso de erro
        setNotifications(previousNotifications);
        console.error("Erro ao marcar notificação como lida:", result.error);
      }
    } catch (error) {
      // Rollback em caso de erro
      setNotifications(previousNotifications);
      console.error("Erro ao marcar notificação como lida:", error);
    }
  };

  
  return (
    <div className="card-surface h-[400px] flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border flex items-center min-h-[56px]">
        <h3 className="text-lg font-semibold text-foreground leading-6">
          Caixa de entrada
          {process.env.NODE_ENV === 'development' && (
            <span className="ml-2 text-xs text-gray-400">
              ({notifications.length})
            </span>
          )}
        </h3>
      </div>

      {/* Content com scroll */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="bg-gray-50 p-3 rounded-full mb-3">
              <Inbox className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-900 mb-1">Caixa de entrada vazia</p>
            <p className="text-xs text-gray-500 text-center">
              Você não tem notificações no momento
            </p>
          </div>
        ) : (
          <>
            <div>
              {displayedNotifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkAsRead={handleMarkAsRead}
                />
              ))}
            </div>
            {hasMore && (
              <div className="px-6 py-3 border-t border-gray-200">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLoadMore}
                  className="w-full text-sm text-gray-600 hover:text-gray-900"
                >
                  Carregar mais ({notifications.length - displayLimit} restantes)
                  <ChevronDown className="w-4 h-4 ml-1" />
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

