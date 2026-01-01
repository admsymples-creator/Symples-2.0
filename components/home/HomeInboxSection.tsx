"use client";

import React, { useState, useEffect } from "react";
import { NotificationItem } from "@/components/notifications/notification-item";
import { getNotifications, markAsRead, NotificationWithActor } from "@/lib/actions/notifications";
import { Loader2, Inbox } from "lucide-react";

export function HomeInboxSection() {
  const [notifications, setNotifications] = useState<NotificationWithActor[]>([]);
  const [loading, setLoading] = useState(true);

  // Buscar notificações
  useEffect(() => {
    const loadNotifications = async () => {
      setLoading(true);
      try {
        const fetchedNotifications = await getNotifications({ limit: 50 });
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
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm h-[600px] flex flex-col">
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
          <div>
            {notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkAsRead={handleMarkAsRead}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

