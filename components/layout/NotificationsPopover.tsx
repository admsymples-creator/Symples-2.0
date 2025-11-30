"use client";

import React, { useState } from "react";
import { 
    Bell, 
    FileText, 
    Check, 
    X, 
    MessageSquare, 
    AlertCircle 
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

// Tipos de Notificação
type NotificationType = "comment" | "file" | "invite" | "system";

interface Notification {
    id: string;
    type: NotificationType;
    isRead: boolean;
    actor: {
        name: string;
        avatar?: string;
    };
    content: React.ReactNode;
    timestamp: string; // Em um app real seria Date/ISO string
    meta?: {
        commentText?: string;
        fileName?: string;
        fileSize?: string;
        teamName?: string;
        taskName?: string;
    };
}

// Mock Data
const initialNotifications: Notification[] = [
    {
        id: "1",
        type: "comment",
        isRead: false,
        actor: { name: "John Doe", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=John" },
        content: (
            <span>
                <span className="font-semibold">John</span> comentou em <span className="font-semibold">Dashboard 2.0</span>
            </span>
        ),
        timestamp: "2 min atrás",
        meta: {
            commentText: "Precisamos rever os gráficos de conversão antes da apresentação."
        }
    },
    {
        id: "2",
        type: "file",
        isRead: false,
        actor: { name: "Adriana Silva", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Adriana" },
        content: (
            <span>
                <span className="font-semibold">Adriana</span> compartilhou um arquivo
            </span>
        ),
        timestamp: "1h atrás",
        meta: {
            fileName: "Q3_Report_Final.pdf",
            fileSize: "2.4 MB"
        }
    },
    {
        id: "3",
        type: "invite",
        isRead: true,
        actor: { name: "Julius Rock", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Julius" },
        content: (
            <span>
                <span className="font-semibold">Julius</span> convidou você para <span className="font-semibold">Design Team</span>
            </span>
        ),
        timestamp: "3h atrás",
    },
    {
        id: "4",
        type: "system",
        isRead: false,
        actor: { name: "Symples System" }, // Avatar será fallback ou logo
        content: (
            <span>
                Sua tarefa <span className="font-semibold">Proposta B2B</span> está atrasada há 3 dias
            </span>
        ),
        timestamp: "1d atrás",
    }
];

export function NotificationsPopover() {
    const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);
    const [isOpen, setIsOpen] = useState(false);

    const unreadCount = notifications.filter(n => !n.isRead).length;

    const markAllAsRead = () => {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    };

    const markAsRead = (id: string) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    };

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
                    {unreadCount > 0 && (
                        <span className="absolute top-1 right-1 w-2 h-2 bg-blue-500 rounded-full border-2 border-white" />
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[400px] p-0" align="end">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900">Notificações</h3>
                        {unreadCount > 0 && (
                            <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">
                                {unreadCount}
                            </span>
                        )}
                    </div>
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-xs text-gray-500 h-auto py-1 px-2 hover:text-gray-900"
                        onClick={markAllAsRead}
                    >
                        Marcar todas como lidas
                    </Button>
                </div>

                {/* List */}
                <ScrollArea className="h-[400px] max-h-[400px]">
                    <div className="flex flex-col">
                        {notifications.map((notification) => (
                            <div 
                                key={notification.id}
                                className={cn(
                                    "p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors flex gap-3 items-start group cursor-pointer",
                                    !notification.isRead && "bg-blue-50/30"
                                )}
                                onClick={() => markAsRead(notification.id)}
                            >
                                {/* Avatar */}
                                <div className="flex-shrink-0 pt-1">
                                    {notification.type === "system" ? (
                                        <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center">
                                            <AlertCircle className="w-4 h-4 text-red-600" />
                                        </div>
                                    ) : (
                                        <Avatar className="h-8 w-8">
                                            <AvatarImage src={notification.actor.avatar} alt={notification.actor.name} />
                                            <AvatarFallback>{notification.actor.name.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                    )}
                                </div>

                                {/* Content Container */}
                                <div className="flex-1 space-y-1">
                                    <p className="text-sm text-gray-800 leading-snug">
                                        {notification.content}
                                    </p>
                                    
                                    {/* Variation A: Comment */}
                                    {notification.type === "comment" && notification.meta?.commentText && (
                                        <div className="bg-gray-100 p-2 rounded text-sm mt-2 text-gray-600 border border-gray-200">
                                            "{notification.meta.commentText}"
                                        </div>
                                    )}

                                    {/* Variation B: File */}
                                    {notification.type === "file" && notification.meta?.fileName && (
                                        <div className="mt-2 border border-gray-200 rounded-lg p-2 flex items-center gap-3 bg-white hover:border-gray-300 transition-colors">
                                            <div className="h-8 w-8 rounded bg-blue-50 flex items-center justify-center">
                                                <FileText className="w-4 h-4 text-blue-600" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-gray-900 truncate">
                                                    {notification.meta.fileName}
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    {notification.meta.fileSize}
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Variation C: Invite Actions */}
                                    {notification.type === "invite" && (
                                        <div className="flex gap-2 mt-3">
                                            <Button 
                                                size="sm" 
                                                variant="outline" 
                                                className="h-8 text-xs w-full sm:w-auto border-gray-300"
                                                onClick={(e) => { e.stopPropagation(); /* Logic */ }}
                                            >
                                                Recusar
                                            </Button>
                                            <Button 
                                                size="sm" 
                                                className="h-8 text-xs w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white"
                                                onClick={(e) => { e.stopPropagation(); /* Logic */ }}
                                            >
                                                Aceitar
                                            </Button>
                                        </div>
                                    )}

                                    {/* Timestamp */}
                                    <p className="text-xs text-gray-400 mt-1">
                                        {notification.timestamp}
                                    </p>
                                </div>

                                {/* Unread Dot */}
                                <div className="flex-shrink-0 pt-2">
                                    {notification.isRead ? (
                                        <div className="w-2 h-2" /> // Spacer to keep alignment
                                    ) : (
                                        <div className="w-2 h-2 bg-blue-500 rounded-full" />
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </PopoverContent>
        </Popover>
    );
}




