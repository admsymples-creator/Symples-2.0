"use client";

import React, { useState, useEffect } from "react";
import { NotificationItem } from "@/components/notifications/notification-item";
import { getNotifications, markAsRead, NotificationWithActor } from "@/lib/actions/notifications";
import { Loader2, Inbox, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";

export function HomeInboxSection() {
  const [notifications, setNotifications] = useState<NotificationWithActor[]>([]);
  const [loading, setLoading] = useState(true);
  const [displayLimit, setDisplayLimit] = useState(5);

  // Buscar notificações
  useEffect(() => {
    const loadNotifications = async () => {
      setLoading(true);
      try {
        // Buscar mais notificações do que o limite de exibição para ter buffer
        const fetchedNotifications = await getNotifications({ limit: 100 });
        setNotifications(fetchedNotifications || []);
      } catch (error) {
        console.error("Erro ao carregar notificações:", error);
        setNotifications([]);
      } finally {
        setLoading(false);
      }
    };

    loadNotifications();
  }, []);

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
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm h-[400px] flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">
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

