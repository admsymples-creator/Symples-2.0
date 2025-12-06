"use client";

import React from "react";
import Link from "next/link";
import { 
  Mic, 
  Image, 
  FileText, 
  Files, 
  ShieldAlert, 
  PartyPopper, 
  UserMinus, 
  UserPlus, 
  MessageSquare, 
  CheckCircle2,
  AlertCircle,
  LucideIcon
} from "lucide-react";
import { cn } from "@/lib/utils";
import { NotificationWithActor } from "@/lib/actions/notifications";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface NotificationItemProps {
  notification: NotificationWithActor;
  onMarkAsRead: (id: string) => void;
}

// Mapeamento de ícones Lucide
const iconMap: Record<string, LucideIcon> = {
  Mic,
  Image,
  FileText,
  Files,
  ShieldAlert,
  PartyPopper,
  UserMinus,
  UserPlus,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
};

export function NotificationItem({ notification, onMarkAsRead }: NotificationItemProps) {
  const isRead = !!notification.read_at;
  const metadata = notification.metadata || {};
  
  // Lógica de renderização de ícones
  const getIcon = (): { Icon: LucideIcon; color: string; bg: string } => {
    // Prioridade 1: Anexos (especialmente áudio)
    if (metadata.file_type === 'audio') {
      return {
        Icon: Mic,
        color: metadata.color || 'text-purple-600',
        bg: metadata.bg || 'bg-purple-50'
      };
    }
    
    if (metadata.file_type === 'image') {
      return {
        Icon: Image,
        color: metadata.color || 'text-blue-600',
        bg: metadata.bg || 'bg-blue-50'
      };
    }
    
    if (metadata.file_type === 'pdf') {
      return {
        Icon: FileText,
        color: metadata.color || 'text-red-600',
        bg: metadata.bg || 'bg-red-50'
      };
    }
    
    if (metadata.file_count && metadata.file_count > 1) {
      return {
        Icon: Files,
        color: metadata.color || 'text-gray-600',
        bg: metadata.bg || 'bg-gray-50'
      };
    }
    
    // Prioridade 2: Admin (Segurança)
    if (notification.category === 'admin' && notification.resource_type === 'security') {
      return {
        Icon: ShieldAlert,
        color: metadata.color || 'text-red-600',
        bg: metadata.bg || 'bg-red-50'
      };
    }
    
    if (notification.resource_type === 'member') {
      if (notification.title.toLowerCase().includes('adicionado') || 
          notification.title.toLowerCase().includes('aceitou')) {
        return {
          Icon: PartyPopper,
          color: metadata.color || 'text-green-600',
          bg: metadata.bg || 'bg-green-50'
        };
      }
      return {
        Icon: UserMinus,
        color: metadata.color || 'text-orange-600',
        bg: metadata.bg || 'bg-orange-50'
      };
    }
    
    // Prioridade 3: Operacional (Padrão)
    if (notification.resource_type === 'task') {
      if (notification.title.toLowerCase().includes('atribuíd') || 
          notification.title.toLowerCase().includes('atribuiu')) {
        return {
          Icon: UserPlus,
          color: metadata.color || 'text-blue-600',
          bg: metadata.bg || 'bg-blue-50'
        };
      }
      
      if (notification.title.toLowerCase().includes('coment') || 
          notification.title.toLowerCase().includes('comentou')) {
        return {
          Icon: MessageSquare,
          color: metadata.color || 'text-gray-600',
          bg: metadata.bg || 'bg-gray-50'
        };
      }
      
      if (notification.title.toLowerCase().includes('concluíd') || 
          notification.title.toLowerCase().includes('finalizou')) {
        return {
          Icon: CheckCircle2,
          color: metadata.color || 'text-green-600',
          bg: metadata.bg || 'bg-green-50'
        };
      }
    }
    
    // Fallback: System
    if (notification.category === 'system') {
      return {
        Icon: AlertCircle,
        color: metadata.color || 'text-orange-600',
        bg: metadata.bg || 'bg-orange-50'
      };
    }
    
    // Default
    return {
      Icon: AlertCircle,
      color: 'text-gray-600',
      bg: 'bg-gray-50'
    };
  };

  const { Icon, color, bg } = getIcon();
  
  const handleClick = () => {
    if (!isRead) {
      onMarkAsRead(notification.id);
    }
  };

  const timeAgo = formatDistanceToNow(new Date(notification.created_at), {
    addSuffix: true,
    locale: ptBR
  });

  const content = (
    <div
      className={cn(
        "p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors flex gap-3 items-start group cursor-pointer",
        !isRead && "bg-slate-50"
      )}
      onClick={handleClick}
    >
      {/* Avatar/Icon */}
      <div className="flex-shrink-0 pt-1">
        {notification.category === 'system' || !notification.triggering_user ? (
          <div className={cn("h-8 w-8 rounded-full flex items-center justify-center", bg)}>
            <Icon className={cn("w-4 h-4", color)} />
          </div>
        ) : (
          <Avatar className="h-8 w-8">
            <AvatarImage 
              src={notification.triggering_user?.avatar_url || undefined} 
              alt={notification.triggering_user?.full_name || 'Usuário'} 
            />
            <AvatarFallback className={bg}>
              <Icon className={cn("w-4 h-4", color)} />
            </AvatarFallback>
          </Avatar>
        )}
      </div>

      {/* Content Container */}
      <div className="flex-1 space-y-1 min-w-0">
        <p className="text-sm text-gray-800 leading-snug font-medium">
          {notification.title}
        </p>
        
        {notification.content && (
          <p className="text-sm text-gray-600 leading-snug">
            {notification.content}
          </p>
        )}

        {/* Timestamp */}
        <p className="text-xs text-gray-400 mt-1">
          {timeAgo}
        </p>
      </div>

      {/* Unread Dot */}
      <div className="flex-shrink-0 pt-2">
        {isRead ? (
          <div className="w-2 h-2" /> // Spacer para manter alinhamento
        ) : (
          <div className="w-2 h-2 bg-blue-500 rounded-full" />
        )}
      </div>
    </div>
  );

  // Envolver em Link se action_url existir
  if (notification.action_url) {
    return (
      <Link href={notification.action_url} className="block">
        {content}
      </Link>
    );
  }

  return content;
}

