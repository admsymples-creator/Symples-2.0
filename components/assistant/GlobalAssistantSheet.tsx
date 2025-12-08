"use client";

import * as React from "react";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { 
  ListTodo, 
  Calendar, 
  AlertTriangle, 
  BarChart3,
  Send,
  Mic,
  X,
  Image as ImageIcon,
  RotateCcw,
  LifeBuoy
} from "lucide-react";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader,
  SheetTitle,
  SheetTrigger
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AIOrb } from "./AIOrb";
import { AudioMessageBubble } from "@/components/tasks/AudioMessageBubble";
import { KanbanConfirmationCard } from "./KanbanConfirmationCard";
import { ThinkingIndicator } from "./ThinkingIndicator";
import { HelpDialog } from "./HelpDialog";
import { useWorkspace } from "@/components/providers/SidebarProvider";
import { getWorkspaceMembers, getTasks } from "@/lib/actions/tasks";
import { createTask } from "@/lib/actions/tasks";
import { getUserWorkspaces, type Workspace } from "@/lib/actions/user";
import { invalidateTasksCache } from "@/hooks/use-tasks";
import { 
  loadAssistantMessages, 
  saveAssistantMessage, 
  saveAssistantMessages,
  type AssistantMessage as DBAssistantMessage 
} from "@/lib/actions/assistant";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Tipagem preparada para Generative UI
interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  type?: "text" | "component" | "image" | "audio" | "divider";
  timestamp: Date;
  imageUrl?: string; // URL da imagem se type for "image"
  audioUrl?: string; // URL do áudio se type for "audio"
  audioDuration?: number; // Duração do áudio em segundos
  audioTranscription?: string; // Transcrição do áudio
  isThinking?: boolean; // Estado de "IA pensando" (apenas para assistente)
  isContextDivider?: boolean; // Flag para indicar divisor de contexto (IA ignora mensagens anteriores)
  componentData?: {
    type: "task_confirmation";
    data: {
      title: string;
      description?: string;
      dueDate?: string | null;
      assigneeId?: string | null;
      priority?: "low" | "medium" | "high" | "urgent";
      status?: "todo" | "in_progress" | "done";
      workspaceId?: string;
    };
  }; // Dados para componentes generativos
}

interface GlobalAssistantSheetProps {
  user?: {
    name?: string | null;
    email?: string | null;
    avatarUrl?: string | null;
  } | null;
}

// Função para gerar saudação dinâmica baseada no horário
function getGreeting(userName?: string | null): { greeting: string; name: string } {
  const hour = new Date().getHours();
  let greeting = "";
  
  if (hour >= 5 && hour < 12) {
    greeting = "Bom dia";
  } else if (hour >= 12 && hour < 18) {
    greeting = "Boa tarde";
  } else {
    greeting = "Boa noite";
  }
  
  const name = userName?.split(" ")[0] || "Julio"; // Pega o primeiro nome ou usa "Julio" como fallback
  return { greeting, name };
}

const suggestionChips = [
  {
    id: "create-task",
    label: "Criar nova tarefa",
    desc: "Input rápido",
    icon: ListTodo,
  },
  {
    id: "today-agenda",
    label: "Minha pauta hoje",
    desc: "Ver prioridades",
    icon: Calendar,
  },
  {
    id: "overdue",
    label: "O que está atrasado?",
    desc: "Gestão de crise",
    icon: AlertTriangle,
  },
  {
    id: "week-summary",
    label: "Resumo da Semana",
    desc: "Visão tática",
    icon: BarChart3,
  },
];

// Função para obter chave de storage por workspace
function getStorageKey(workspaceId: string | null, key: string): string {
  return workspaceId ? `assistant-${workspaceId}-${key}` : `assistant-global-${key}`;
}

// Função para verificar se é um novo dia (após 04:00 AM)
function isNewDay(lastDateStr: string | null): boolean {
  if (!lastDateStr) return true;
  
  const now = new Date();
  const lastDate = new Date(lastDateStr);
  
  // Reset às 04:00 AM
  const resetHour = 4;
  
  // Se já passou das 04:00 AM de hoje e a última data foi antes de hoje
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), resetHour, 0, 0);
  const lastReset = new Date(lastDate.getFullYear(), lastDate.getMonth(), lastDate.getDate(), resetHour, 0, 0);
  
  return now >= today && lastReset < today;
}

export function GlobalAssistantSheet({ user }: GlobalAssistantSheetProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [inputValue, setInputValue] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  
  // Estados para gravação de áudio
  const [isRecording, setIsRecording] = React.useState(false);
  const [recordingTime, setRecordingTime] = React.useState(0);
  const [mediaRecorder, setMediaRecorder] = React.useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = React.useState<Blob[]>([]);
  const recordingTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const [wasAutoStopped, setWasAutoStopped] = React.useState(false); // Rastrear se foi parado automaticamente
  const MAX_AUDIO_DURATION = 120; // 2 minutos em segundos
  
  // Workspace e membros
  const { activeWorkspaceId } = useWorkspace();
  const [workspaceMembers, setWorkspaceMembers] = React.useState<Array<{ id: string; name: string; avatar?: string; email?: string }>>([]);
  const [isLoadingMembers, setIsLoadingMembers] = React.useState(false);
  const [workspaces, setWorkspaces] = React.useState<Workspace[]>([]);
  
  // Estados para Smart Daily Reset e Context Divider
  const [showZeroState, setShowZeroState] = React.useState(true);
  const [contextDividerIndex, setContextDividerIndex] = React.useState<number | null>(null);
  
  // Saudação dinâmica
  const { greeting, name } = React.useMemo(() => getGreeting(user?.name), [user?.name]);
  
  // Ref para auto-scroll
  const scrollRef = React.useRef<HTMLDivElement>(null);

  // Carregar mensagens do banco de dados (com fallback para localStorage)
  React.useEffect(() => {
    if (!activeWorkspaceId) return;
    
    const loadMessages = async () => {
      try {
        // 1. Tentar carregar do banco de dados primeiro
        const result = await loadAssistantMessages(activeWorkspaceId);
        
        if (result.success && result.messages && result.messages.length > 0) {
          // Converter mensagens do banco para formato do componente
          const messagesWithDates = result.messages.map((msg: DBAssistantMessage) => {
            const baseMessage = {
              id: `db-${msg.id}`,
              role: msg.role as "user" | "assistant" | "system",
              content: msg.content,
              type: (msg.type || "text") as "text" | "component" | "image" | "audio" | "divider",
              timestamp: new Date(msg.created_at),
              imageUrl: msg.image_url || undefined,
              audioUrl: msg.audio_url || undefined,
              audioDuration: msg.audio_duration || undefined,
              audioTranscription: msg.audio_transcription || undefined,
              isThinking: msg.is_thinking || false,
              isContextDivider: msg.is_context_divider || false,
            };
            
            // Adicionar componentData apenas se existir e for do tipo correto
            if (msg.component_data && msg.component_data.type === "task_confirmation") {
              return {
                ...baseMessage,
                componentData: {
                  type: "task_confirmation" as const,
                  data: msg.component_data.data as {
                    title: string;
                    description?: string;
                    dueDate?: string | null;
                    assigneeId?: string | null;
                    priority?: "low" | "medium" | "high" | "urgent";
                    status?: "todo" | "in_progress" | "done";
                    workspaceId?: string;
                  },
                },
              } as Message;
            }
            
            return baseMessage as Message;
          });
          
          setMessages(messagesWithDates);
          setShowZeroState(false);
          
          // Sincronizar com localStorage como cache
          const storageKey = getStorageKey(activeWorkspaceId, "messages");
          const serializable = messagesWithDates.map((msg) => ({
            ...msg,
            timestamp: msg.timestamp.toISOString(),
          }));
          localStorage.setItem(storageKey, JSON.stringify(serializable));
        } else {
          // 2. Fallback: tentar carregar do localStorage
          const storageKey = getStorageKey(activeWorkspaceId, "messages");
          const savedMessages = localStorage.getItem(storageKey);
          
          if (savedMessages) {
            try {
              const parsed = JSON.parse(savedMessages);
              const messagesWithDates = parsed.map((msg: any) => ({
                ...msg,
                timestamp: new Date(msg.timestamp),
              }));
              setMessages(messagesWithDates);
              setShowZeroState(messagesWithDates.length === 0);
            } catch (error) {
              console.error("Erro ao carregar mensagens do localStorage:", error);
              setMessages([]);
              setShowZeroState(true);
            }
          } else {
            // 3. Nenhuma mensagem encontrada
            setMessages([]);
            setShowZeroState(true);
          }
        }
      } catch (error) {
        console.error("Erro ao carregar mensagens do banco:", error);
        
        // Fallback para localStorage em caso de erro
        const storageKey = getStorageKey(activeWorkspaceId, "messages");
        const savedMessages = localStorage.getItem(storageKey);
        
        if (savedMessages) {
          try {
            const parsed = JSON.parse(savedMessages);
            const messagesWithDates = parsed.map((msg: any) => ({
              ...msg,
              timestamp: new Date(msg.timestamp),
            }));
            setMessages(messagesWithDates);
            setShowZeroState(messagesWithDates.length === 0);
          } catch (localError) {
            console.error("Erro ao carregar do localStorage:", localError);
            setMessages([]);
            setShowZeroState(true);
          }
        } else {
          setMessages([]);
          setShowZeroState(true);
        }
      }
    };
    
    loadMessages();
  }, [activeWorkspaceId]);

  // Salvar mensagens no localStorage como cache (banco é salvo individualmente)
  React.useEffect(() => {
    if (!activeWorkspaceId || messages.length === 0) return;
    
    // Salvar no localStorage como cache (sempre atualizado)
    const storageKey = getStorageKey(activeWorkspaceId, "messages");
    const serializable = messages.map((msg) => ({
      ...msg,
      timestamp: msg.timestamp.toISOString(),
    }));
    localStorage.setItem(storageKey, JSON.stringify(serializable));
  }, [messages, activeWorkspaceId]);

  // Smart Daily Reset: Verificar se é um novo dia e re-exibir zero state
  React.useEffect(() => {
    if (!activeWorkspaceId) return;
    
    const storageKey = getStorageKey(activeWorkspaceId, "lastResetDate");
    const lastResetDate = localStorage.getItem(storageKey);
    
    if (isNewDay(lastResetDate)) {
      // É um novo dia - re-exibir zero state mesmo com mensagens
      setShowZeroState(true);
      localStorage.setItem(storageKey, new Date().toISOString());
    }
  }, [activeWorkspaceId]);

  // Carregar membros do workspace quando necessário
  React.useEffect(() => {
    const loadMembers = async () => {
      if (!activeWorkspaceId) {
        setWorkspaceMembers([]);
        return;
      }

      setIsLoadingMembers(true);
      try {
        const members = await getWorkspaceMembers(activeWorkspaceId);
        const mappedMembers = members.map((m: any) => ({
          id: m.id,
          name: m.full_name || m.email || "Usuário",
          avatar: m.avatar_url || undefined,
          email: m.email || undefined, // Incluir email para detecção de responsáveis
        }));
        setWorkspaceMembers(mappedMembers);
      } catch (error) {
        console.error("Erro ao carregar membros:", error);
      } finally {
        setIsLoadingMembers(false);
      }
    };

    loadMembers();
  }, [activeWorkspaceId]);

  // Carregar lista de workspaces
  React.useEffect(() => {
    const loadWorkspaces = async () => {
      try {
        const userWorkspaces = await getUserWorkspaces();
        setWorkspaces(userWorkspaces);
      } catch (error) {
        console.error("Erro ao carregar workspaces:", error);
        setWorkspaces([]);
      }
    };

    loadWorkspaces();
  }, []);

  // Auto-scroll sempre que mensagens mudarem
  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoading]);

  // Limpar timer quando componente desmontar
  React.useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      if (mediaRecorder && isRecording) {
        mediaRecorder.stop();
      }
    };
  }, [mediaRecorder, isRecording]);

  // Handler para limpar contexto (Botão Vassoura)
  const handleClearContext = async () => {
    // Salvar divisor no banco antes de limpar
    if (activeWorkspaceId) {
      try {
        await saveAssistantMessage({
          workspace_id: activeWorkspaceId,
          role: "system",
          content: "--- Contexto limpo ---",
          type: "divider",
          is_context_divider: true,
        });
      } catch (error) {
        console.error("Erro ao salvar divisor de contexto:", error);
      }
    }
    
    // Limpar todas as mensagens e mostrar zero state
    setMessages([]);
    setContextDividerIndex(null);
    setShowZeroState(true);
    
    // Limpar também do localStorage
    if (activeWorkspaceId) {
      const storageKey = getStorageKey(activeWorkspaceId, "messages");
      localStorage.removeItem(storageKey);
    }
    
    toast.success("Contexto limpo. Começando uma nova conversa.");
  };

  const handleSendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    // Esconder zero state ao enviar primeira mensagem
    if (showZeroState) {
      setShowZeroState(false);
    }

    // 1. Adiciona mensagem do usuário (Optimistic UI)
    const userMessage: Message = {
      id: `temp-${Date.now()}`,
      role: "user",
      content: content.trim(),
      type: "text",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    // Salvar mensagem do usuário no banco
    if (activeWorkspaceId) {
      saveAssistantMessage({
        workspace_id: activeWorkspaceId,
        role: "user",
        content: content.trim(),
        type: "text",
      }).then((result) => {
        if (result.success && result.messageId) {
          // Atualizar ID da mensagem com o ID do banco
          startTransition(() => {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === userMessage.id
                  ? { ...msg, id: `db-${result.messageId}` }
                  : msg
              )
            );
          });
        }
      }).catch((error) => {
        console.error("Erro ao salvar mensagem no banco:", error);
      });
    }

    // 2. Adiciona estado de "pensando" (opcional, para mostrar que a IA está processando)
    const thinkingMessageId = `thinking-${Date.now()}`;
    const thinkingMessage: Message = {
      id: thinkingMessageId,
      role: "assistant",
      content: "",
      type: "text",
      isThinking: true,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, thinkingMessage]);

    // 3. Chamar API real da OpenAI
    try {
      // Preparar histórico de mensagens (apenas últimas mensagens relevantes, ignorando thinking e dividers)
      const relevantHistory = messages
        .filter(msg => 
          msg.role !== "system" && 
          !msg.isThinking && 
          !msg.isContextDivider &&
          msg.content
        )
        .slice(-10) // Últimas 10 mensagens
        .map(msg => ({
          role: msg.role,
          content: msg.content,
        }));

      // Detectar se precisa buscar tarefas (resumo, pauta, semana, atrasado, etc.)
      const lowerContent = content.toLowerCase();
      const needsTasks = lowerContent.includes('resumo') || 
                        lowerContent.includes('pauta') || 
                        lowerContent.includes('semana') || 
                        lowerContent.includes('atrasado') || 
                        lowerContent.includes('tarefa') ||
                        lowerContent.includes('task');

      // Buscar tarefas se necessário
      let tasksData = null;
      if (needsTasks && activeWorkspaceId) {
        try {
          const tasks = await getTasks({ workspaceId: activeWorkspaceId });
          tasksData = tasks.map(task => ({
            id: task.id,
            title: task.title,
            status: task.status,
            dueDate: task.due_date,
            priority: task.priority,
            assignee: task.assignee?.name || null,
            group: task.group?.name || null,
          }));
        } catch (error) {
          console.error("Erro ao buscar tarefas:", error);
        }
      }

      // Preparar lista de membros para detecção de responsáveis
      const membersForAI = workspaceMembers.map((m: any) => ({
        id: m.id,
        name: m.name,
        full_name: m.name, // Para compatibilidade
        email: (m as any).email || undefined,
      }));

      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: content.trim(),
          workspaceId: activeWorkspaceId,
          conversationHistory: relevantHistory,
          tasksData: tasksData,
          workspaceMembers: membersForAI,
        }),
      });

      if (!response.ok) {
        throw new Error("Erro ao processar mensagem");
      }

      const data = await response.json();

      // Remove mensagem de "pensando" e adiciona resposta
      setMessages((prev) => {
        const withoutThinking = prev.filter((msg) => msg.id !== thinkingMessageId);
        
        if (data.isTaskCreation && data.taskInfo) {
          // Verificar se há múltiplas tarefas e precisa confirmação
          let messageContent = data.message || "Vou criar a tarefa para você. Confirme os detalhes abaixo:";
          
          if (data.hasMultipleTasks && data.needsUserConfirmation) {
            const tasksList = data.taskInfo.multipleTasksList || [];
            if (tasksList.length > 0) {
              messageContent = `Detectei ${tasksList.length} tarefas na sua mensagem:\n\n${tasksList.map((t: string, i: number) => `${i + 1}. ${t}`).join('\n')}\n\nComo você prefere criar?\n• Várias tarefas separadas\n• Uma tarefa com subtarefas\n\nVou criar a primeira tarefa. Você pode editar os detalhes abaixo:`;
            } else {
              messageContent = "Detectei múltiplas tarefas na sua mensagem. Vou criar a primeira tarefa. Você pode editar os detalhes abaixo:";
            }
          }
          
          // Criar tarefa - mostrar card de confirmação
          const assistantMessage: Message = {
            id: `temp-${Date.now() + 2}`,
            role: "assistant",
            content: messageContent,
            type: "text",
            timestamp: new Date(),
          };
          
          const confirmationCardMessage: Message = {
            id: `temp-${Date.now() + 3}`,
            role: "assistant",
            content: "",
            type: "component",
            componentData: {
              type: "task_confirmation",
              data: {
                title: data.taskInfo.title || "Nova tarefa",
                description: data.taskInfo.description || data.taskInfo.descriptionFull || content.trim(), // Usar descriptionFull se disponível
                dueDate: data.taskInfo.dueDate || null,
                assigneeId: data.taskInfo.assigneeId || null,
                priority: data.taskInfo.priority || "medium",
                status: data.taskInfo.status || "todo",
                workspaceId: activeWorkspaceId || undefined,
              },
            },
            timestamp: new Date(),
          };
          
          // Salvar mensagens do assistente no banco
          if (activeWorkspaceId) {
            Promise.all([
              saveAssistantMessage({
                workspace_id: activeWorkspaceId,
                role: "assistant",
                content: assistantMessage.content,
                type: "text",
              }),
              saveAssistantMessage({
                workspace_id: activeWorkspaceId,
                role: "assistant",
                content: "",
                type: "component",
                component_data: confirmationCardMessage.componentData,
              }),
            ]).then((results) => {
              startTransition(() => {
                setMessages((prev) => {
                  let updated = [...prev];
                  if (results[0].success && results[0].messageId) {
                    updated = updated.map((msg) =>
                      msg.id === assistantMessage.id
                        ? { ...msg, id: `db-${results[0].messageId}` }
                        : msg
                    );
                  }
                  if (results[1].success && results[1].messageId) {
                    updated = updated.map((msg) =>
                      msg.id === confirmationCardMessage.id
                        ? { ...msg, id: `db-${results[1].messageId}` }
                        : msg
                    );
                  }
                  return updated;
                });
              });
            }).catch((error) => {
              console.error("Erro ao salvar mensagens do assistente:", error);
            });
          }
          
          return [...withoutThinking, assistantMessage, confirmationCardMessage];
        } else {
          // Resposta normal da IA
          const assistantMessage: Message = {
            id: `temp-${Date.now() + 2}`,
            role: "assistant",
            content: data.message || "Desculpe, não consegui processar sua mensagem.",
            type: "text",
            timestamp: new Date(),
          };
          
          // Salvar mensagem do assistente no banco
          if (activeWorkspaceId) {
            saveAssistantMessage({
              workspace_id: activeWorkspaceId,
              role: "assistant",
              content: assistantMessage.content,
              type: "text",
            }).then((result) => {
              if (result.success && result.messageId) {
                startTransition(() => {
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === assistantMessage.id
                        ? { ...msg, id: `db-${result.messageId}` }
                        : msg
                    )
                  );
                });
              }
            }).catch((error) => {
              console.error("Erro ao salvar mensagem do assistente:", error);
            });
          }
          
          return [...withoutThinking, assistantMessage];
        }
      });
      
      setIsLoading(false);
    } catch (error) {
      console.error("Erro ao chamar API de chat:", error);
      
      // Em caso de erro, remover thinking e mostrar mensagem de erro
      setMessages((prev) => {
        const withoutThinking = prev.filter((msg) => msg.id !== thinkingMessageId);
        const errorMessage: Message = {
          id: `error-${Date.now()}`,
          role: "assistant",
          content: "Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente.",
          type: "text",
          timestamp: new Date(),
        };
        return [...withoutThinking, errorMessage];
      });
      
      setIsLoading(false);
      toast.error("Erro ao processar mensagem. Tente novamente.");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(inputValue);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Verificar se é uma imagem
    if (!file.type.startsWith("image/")) {
      alert("Por favor, selecione uma imagem");
      return;
    }

    // Criar URL temporária para preview
    const imageUrl = URL.createObjectURL(file);

    // Adicionar mensagem com imagem
    const imageMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: "Enviei uma imagem",
      type: "image",
      imageUrl,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, imageMessage]);
    setIsLoading(true);

    // Adicionar estado de "pensando"
    const thinkingMessageId = (Date.now() + 1).toString();
    const thinkingMessage: Message = {
      id: thinkingMessageId,
      role: "assistant",
      content: "",
      type: "text",
      isThinking: true,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, thinkingMessage]);

    // Processar imagem com IA
    try {
      const relevantHistory = messages
        .filter(msg => 
          msg.role !== "system" && 
          !msg.isThinking && 
          !msg.isContextDivider &&
          msg.content
        )
        .slice(-10)
        .map(msg => ({
          role: msg.role,
          content: msg.content,
        }));

      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: "Recebi uma imagem. O que você gostaria que eu fizesse com ela?",
          workspaceId: activeWorkspaceId,
          conversationHistory: relevantHistory,
        }),
      });

      if (!response.ok) {
        throw new Error("Erro ao processar mensagem");
      }

      const data = await response.json();

      setMessages((prev) => {
        const withoutThinking = prev.filter((msg) => msg.id !== thinkingMessageId);
        const assistantMessage: Message = {
          id: `temp-${Date.now() + 2}`,
          role: "assistant",
          content: data.message || "Recebi sua imagem! Em breve, poderei analisar e processar imagens automaticamente.",
          type: "text",
          timestamp: new Date(),
        };
        
        // Salvar no banco
        if (activeWorkspaceId) {
          saveAssistantMessage({
            workspace_id: activeWorkspaceId,
            role: "assistant",
            content: assistantMessage.content,
            type: "text",
          }).then((result) => {
            if (result.success && result.messageId) {
              startTransition(() => {
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantMessage.id
                      ? { ...msg, id: `db-${result.messageId}` }
                      : msg
                  )
                );
              });
            }
          });
        }
        
        return [...withoutThinking, assistantMessage];
      });
      
      setIsLoading(false);
    } catch (error) {
      console.error("Erro ao processar imagem:", error);
      setMessages((prev) => {
        const withoutThinking = prev.filter((msg) => msg.id !== thinkingMessageId);
        const assistantMessage: Message = {
          id: `error-${Date.now()}`,
          role: "assistant",
          content: "Recebi sua imagem! Em breve, poderei analisar e processar imagens automaticamente.",
          type: "text",
          timestamp: new Date(),
        };
        return [...withoutThinking, assistantMessage];
      });
      setIsLoading(false);
    }

    // Limpar input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: "audio/webm" });
        const audioUrl = URL.createObjectURL(audioBlob);
        const duration = recordingTime;
        const isMaxDuration = wasAutoStopped && duration >= MAX_AUDIO_DURATION;

        // Adicionar mensagem de áudio
        const audioMessage: Message = {
          id: Date.now().toString(),
          role: "user",
          content: "Mensagem de áudio",
          type: "audio",
          audioUrl,
          audioDuration: duration,
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, audioMessage]);
        setIsLoading(true);

        // Adicionar estado de "pensando"
        const thinkingMessageId = (Date.now() + 1).toString();
        const thinkingMessage: Message = {
          id: thinkingMessageId,
          role: "assistant",
          content: "",
          type: "text",
          isThinking: true,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, thinkingMessage]);

        // Transcrever áudio
        try {
          const response = await fetch(audioUrl);
          const blob = await response.blob();
          
          const formData = new FormData();
          formData.append("audio", blob, "audio.webm");

          const transcribeResponse = await fetch("/api/audio/transcribe", {
            method: "POST",
            body: formData,
          });

          if (!transcribeResponse.ok) {
            throw new Error("Erro ao transcrever áudio");
          }

          const transcribeData = await transcribeResponse.json();
          const transcribedText = transcribeData.transcription || "";

          // Atualizar mensagem de áudio com transcrição
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === audioMessage.id
                ? { ...msg, audioTranscription: transcribedText }
                : msg
            )
          );

          // Processar transcrição com IA real
          try {
            // Preparar histórico de mensagens
            const relevantHistory = messages
              .filter(msg => 
                msg.role !== "system" && 
                !msg.isThinking && 
                !msg.isContextDivider &&
                msg.content
              )
              .slice(-10)
              .map(msg => ({
                role: msg.role,
                content: msg.content,
              }));

            // Se atingiu o limite de 2 minutos, mostrar resposta especial com meme
            if (isMaxDuration) {
              setMessages((prev) => {
                const withoutThinking = prev.filter((msg) => msg.id !== thinkingMessageId);
                const assistantMessage: Message = {
                  id: `temp-${Date.now() + 2}`,
                  role: "assistant",
                  content: "Hey, ninguem merece escutar audio de 2 minutos. Nem mesmo uma IA.",
                  type: "text",
                  timestamp: new Date(),
                };
                
                const memeMessage: Message = {
                  id: `temp-${Date.now() + 3}`,
                  role: "assistant",
                  content: "",
                  type: "image",
                  imageUrl: "/audiode2minutos.png",
                  timestamp: new Date(),
                };
                
                // Salvar no banco
                if (activeWorkspaceId) {
                  Promise.all([
                    saveAssistantMessage({
                      workspace_id: activeWorkspaceId,
                      role: "assistant",
                      content: assistantMessage.content,
                      type: "text",
                    }),
                    saveAssistantMessage({
                      workspace_id: activeWorkspaceId,
                      role: "assistant",
                      content: "",
                      type: "image",
                      image_url: "/audiode2minutos.png",
                    }),
                  ]).then((results) => {
                    startTransition(() => {
                      setMessages((prev) => {
                        let updated = [...prev];
                        if (results[0].success && results[0].messageId) {
                          updated = updated.map((msg) =>
                            msg.id === assistantMessage.id
                              ? { ...msg, id: `db-${results[0].messageId}` }
                              : msg
                          );
                        }
                        if (results[1].success && results[1].messageId) {
                          updated = updated.map((msg) =>
                            msg.id === memeMessage.id
                              ? { ...msg, id: `db-${results[1].messageId}` }
                              : msg
                          );
                        }
                        return updated;
                      });
                    });
                  });
                }
                
                return [...withoutThinking, assistantMessage, memeMessage];
              });
              setIsLoading(false);
              setWasAutoStopped(false);
            } else {
              // Processar transcrição com IA
              // Preparar lista de membros para detecção de responsáveis
              const membersForAI = workspaceMembers.map((m: any) => ({
                id: m.id,
                name: m.name,
                full_name: m.name, // Para compatibilidade
                email: (m as any).email || undefined,
              }));

              const response = await fetch("/api/ai/chat", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  message: transcribedText || "Processe esta mensagem de áudio",
                  workspaceId: activeWorkspaceId,
                  conversationHistory: relevantHistory,
                  workspaceMembers: membersForAI,
                }),
              });

              if (!response.ok) {
                throw new Error("Erro ao processar mensagem");
              }

              const data = await response.json();

              setMessages((prev) => {
                const withoutThinking = prev.filter((msg) => msg.id !== thinkingMessageId);
                
                if (data.isTaskCreation && data.taskInfo) {
                  // Verificar se há múltiplas tarefas e precisa confirmação
                  let messageContent = data.message || "Vou criar a tarefa para você. Confirme os detalhes abaixo:";
                  
                  if (data.hasMultipleTasks && data.needsUserConfirmation) {
                    const tasksList = data.taskInfo.multipleTasksList || [];
                    if (tasksList.length > 0) {
                      messageContent = `Detectei ${tasksList.length} tarefas no seu áudio:\n\n${tasksList.map((t: string, i: number) => `${i + 1}. ${t}`).join('\n')}\n\nComo você prefere criar?\n• Várias tarefas separadas\n• Uma tarefa com subtarefas\n\nVou criar a primeira tarefa. Você pode editar os detalhes abaixo:`;
                    } else {
                      messageContent = "Detectei múltiplas tarefas no seu áudio. Vou criar a primeira tarefa. Você pode editar os detalhes abaixo:";
                    }
                  }
                  
                  // Criar tarefa - mostrar card de confirmação
                  const assistantMessage: Message = {
                    id: `temp-${Date.now() + 2}`,
                    role: "assistant",
                    content: messageContent,
                    type: "text",
                    timestamp: new Date(),
                  };
                  
                  const confirmationCardMessage: Message = {
                    id: `temp-${Date.now() + 3}`,
                    role: "assistant",
                    content: "",
                    type: "component",
                    componentData: {
                      type: "task_confirmation",
                      data: {
                        title: data.taskInfo.title || "Nova tarefa",
                        description: data.taskInfo.description || data.taskInfo.descriptionFull || transcribedText, // Usar descriptionFull ou transcrição completa
                        dueDate: data.taskInfo.dueDate || null,
                        assigneeId: data.taskInfo.assigneeId || null,
                        priority: data.taskInfo.priority || "medium",
                        status: data.taskInfo.status || "todo",
                        workspaceId: activeWorkspaceId || undefined,
                      },
                    },
                    timestamp: new Date(),
                  };
                  
                  // Salvar no banco
                  if (activeWorkspaceId) {
                    Promise.all([
                      saveAssistantMessage({
                        workspace_id: activeWorkspaceId,
                        role: "assistant",
                        content: assistantMessage.content,
                        type: "text",
                      }),
                      saveAssistantMessage({
                        workspace_id: activeWorkspaceId,
                        role: "assistant",
                        content: "",
                        type: "component",
                        component_data: confirmationCardMessage.componentData,
                      }),
            ]).then((results) => {
              startTransition(() => {
                setMessages((prev) => {
                  let updated = [...prev];
                  if (results[0].success && results[0].messageId) {
                    updated = updated.map((msg) =>
                      msg.id === assistantMessage.id
                        ? { ...msg, id: `db-${results[0].messageId}` }
                        : msg
                    );
                  }
                  if (results[1].success && results[1].messageId) {
                    updated = updated.map((msg) =>
                      msg.id === confirmationCardMessage.id
                        ? { ...msg, id: `db-${results[1].messageId}` }
                        : msg
                    );
                  }
                  return updated;
                });
              });
            });
                  }
                  
                  return [...withoutThinking, assistantMessage, confirmationCardMessage];
                } else {
                  // Resposta normal
                  const assistantMessage: Message = {
                    id: `temp-${Date.now() + 2}`,
                    role: "assistant",
                    content: data.message || `Recebi sua mensagem de áudio (${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, "0")}).`,
                    type: "text",
                    timestamp: new Date(),
                  };
                  
                  // Salvar no banco
                  if (activeWorkspaceId) {
                    saveAssistantMessage({
                      workspace_id: activeWorkspaceId,
                      role: "assistant",
                      content: assistantMessage.content,
                      type: "text",
                    }).then((result) => {
                      if (result.success && result.messageId) {
                        startTransition(() => {
                          setMessages((prev) =>
                            prev.map((msg) =>
                              msg.id === assistantMessage.id
                                ? { ...msg, id: `db-${result.messageId}` }
                                : msg
                            )
                          );
                        });
                      }
                    });
                  }
                  
                  return [...withoutThinking, assistantMessage];
                }
              });
              
              setIsLoading(false);
              setWasAutoStopped(false);
            }
          } catch (error) {
            console.error("Erro ao processar áudio com IA:", error);
            setMessages((prev) => {
              const withoutThinking = prev.filter((msg) => msg.id !== thinkingMessageId);
              const assistantMessage: Message = {
                id: `error-${Date.now()}`,
                role: "assistant",
                content: `Recebi sua mensagem de áudio (${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, "0")}), mas houve um erro ao processar. Tente novamente.`,
                type: "text",
                timestamp: new Date(),
              };
              return [...withoutThinking, assistantMessage];
            });
            setIsLoading(false);
            setWasAutoStopped(false);
          }
        } catch (error) {
          console.error("Erro ao transcrever áudio:", error);
          setMessages((prev) => {
            const withoutThinking = prev.filter((msg) => msg.id !== thinkingMessageId);
            const assistantMessage: Message = {
              id: (Date.now() + 2).toString(),
              role: "assistant",
              content: `Recebi sua mensagem de áudio (${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, "0")}), mas houve um erro ao transcrever. Tente novamente.`,
              type: "text",
              timestamp: new Date(),
            };
            return [...withoutThinking, assistantMessage];
          });
          setIsLoading(false);
        }

        // Parar todas as tracks do stream
        stream.getTracks().forEach((track) => track.stop());
      };

      setMediaRecorder(recorder);
      setAudioChunks(chunks);
      recorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      setWasAutoStopped(false); // Resetar flag ao iniciar nova gravação

      // Limpar timer anterior se existir
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }

      // Timer para contar o tempo de gravação
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime((prev) => {
          const newTime = prev + 1;
          // Parar automaticamente ao atingir 2 minutos
          if (newTime >= MAX_AUDIO_DURATION) {
            setWasAutoStopped(true); // Marcar que foi parado automaticamente
            if (recordingTimerRef.current) {
              clearInterval(recordingTimerRef.current);
              recordingTimerRef.current = null;
            }
            stopRecording();
            return MAX_AUDIO_DURATION;
          }
          return newTime;
        });
      }, 1000);
    } catch (error) {
      console.error("Erro ao iniciar gravação:", error);
      alert("Não foi possível acessar o microfone. Verifique as permissões.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      // Não resetar recordingTime aqui, pois será usado no onstop
      // setRecordingTime(0); // Removido para manter o tempo correto
    } else if (recordingTimerRef.current) {
      // Limpar timer mesmo se não houver mediaRecorder ativo
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  };

  const handleMicClick = () => {
    if (isRecording) {
      setWasAutoStopped(false); // Resetar flag se parou manualmente
      stopRecording();
    } else {
      startRecording();
    }
  };

  // Formatar tempo de gravação (MM:SS)
  const formatRecordingTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Handler para confirmação de criação de tarefa
  const handleConfirmTask = async (taskData: {
    title: string;
    description?: string;
    dueDate?: string | null;
    assigneeId?: string | null;
    priority?: "low" | "medium" | "high" | "urgent";
    status?: "todo" | "in_progress" | "done";
    workspaceId?: string | null;
  }) => {
    try {
      setIsLoading(true);
      
      const result = await createTask({
        title: taskData.title,
        description: taskData.description,
        due_date: taskData.dueDate || null,
        assignee_id: taskData.assigneeId || null,
        priority: taskData.priority || "medium",
        workspace_id: taskData.workspaceId || activeWorkspaceId || null,
        status: taskData.status || "todo",
      });

      if (result.success) {
        toast.success("Tarefa criada com sucesso!");
        
        // Invalidar cache de tarefas para atualização instantânea
        const targetWorkspaceId = taskData.workspaceId || activeWorkspaceId;
        if (targetWorkspaceId) {
          invalidateTasksCache(targetWorkspaceId);
          // Recarregar a página de tarefas se estiver aberta - usar startTransition para evitar erro de render
          startTransition(() => {
            router.refresh();
          });
        }
        
        // Remover card de confirmação e adicionar mensagem de sucesso
        startTransition(() => {
          setMessages((prev) => {
            const withoutCard = prev.filter((msg) => 
              !(msg.type === "component" && msg.componentData?.type === "task_confirmation")
            );
            
            const successMessage: Message = {
              id: Date.now().toString(),
              role: "assistant",
              content: `✅ Tarefa "${taskData.title}" criada com sucesso!`,
              type: "text",
              timestamp: new Date(),
            };
            
            return [...withoutCard, successMessage];
          });
        });
      } else {
        throw new Error(result.error || "Erro ao criar tarefa");
      }
    } catch (error) {
      console.error("Erro ao criar tarefa:", error);
      toast.error("Erro ao criar tarefa. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelTask = () => {
    // Remover card de confirmação
    setMessages((prev) =>
      prev.filter(
        (msg) =>
          !(msg.type === "component" && msg.componentData?.type === "task_confirmation")
      )
    );
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      {/* TRIGGER (FAB) - Fica fixo na tela */}
      <SheetTrigger asChild>
        <Button
          className={cn(
            "fixed bottom-6 right-6 z-[50]", // z-50 para não sobrepor modais críticos se houver
            "h-14 w-14 rounded-full p-0",
            "bg-slate-950 hover:bg-slate-900 border-2 border-slate-800",
            "shadow-2xl shadow-black/20",
            "transition-transform duration-300 hover:scale-105 active:scale-95"
          )}
          aria-label="Abrir Assistente Symples"
        >
          {/* Reutiliza o AIOrb aqui para branding consistente */}
          <AIOrb isLoading={isLoading} compact />
        </Button>
      </SheetTrigger>

      {/* CONTEÚDO (GAVETA) */}
      <SheetContent 
        side="right" 
        className="w-full sm:max-w-[450px] p-0 flex flex-col h-full bg-white border-l-slate-200"
      >
        {/* Header com SheetTitle para acessibilidade */}
        <SheetHeader className="px-6 py-4 border-b bg-white/80 backdrop-blur-md z-10 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex-1" /> {/* Spacer esquerdo */}
            <SheetTitle className="font-semibold text-slate-800 m-0 text-center flex-1">
              Assistente Symples
            </SheetTitle>
            <div className="flex-1 flex justify-end items-center gap-2">
              {/* Botão de Ajuda (HelpDialog) */}
              <HelpDialog>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                  title="Central de Ajuda"
                >
                  <LifeBuoy className="w-4 h-4" />
                </Button>
              </HelpDialog>
              
              {/* Botão Vassoura (Limpar Contexto) */}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleClearContext}
                className="h-8 w-8 text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                title="Limpar contexto (IA ignorará mensagens anteriores)"
                disabled={messages.length === 0}
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </SheetHeader>

        {/* Chat Area */}
        <div className="flex-1 min-h-0 overflow-y-auto bg-white">
          <div className={cn(
            "flex flex-col gap-6 px-4 py-6",
            messages.length === 0 ? "justify-center min-h-full" : ""
          )}>
                

                {/* ZERO STATE (Mostra se não houver mensagens OU se for novo dia) */}
                {(messages.length === 0 || showZeroState) && (
                  <div className="flex flex-col items-center justify-center animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="mb-6 scale-[0.625]">
                    <AIOrb isLoading={false} />
                  </div>
                  
                  <div className="text-center space-y-1 mb-8">
                    <h3 className="text-2xl font-bold text-slate-900">
                      {greeting}, {name}!
                    </h3>
                    <p className="text-xl font-normal text-slate-900">
                      Posso ajudar com alguma coisa?
                    </p>
                    <p className="text-sm text-slate-500 max-w-[250px] mx-auto mt-2">
                      Gerencie tarefas e finanças sem sair da tela.
                    </p>
                  </div>
                  
                  {/* Suggestion Grid */}
                  <div className="grid grid-cols-2 gap-3 w-full max-w-sm px-2">
                    {suggestionChips.map((chip) => {
                      const Icon = chip.icon;
                      return (
                        <button
                          key={chip.id}
                          onClick={() => handleSendMessage(chip.label)}
                          className={cn(
                            "flex flex-col items-start gap-2 p-3 rounded-xl",
                            "bg-white border border-slate-200 shadow-sm",
                            "hover:border-green-500 hover:bg-green-50/30",
                            "transition-all duration-200 group text-left"
                          )}
                        >
                          <div className="p-1.5 rounded-md bg-slate-100 group-hover:bg-white group-hover:text-green-600 text-slate-500 transition-colors">
                            <Icon className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="block text-xs font-semibold text-slate-700 group-hover:text-slate-900">
                              {chip.label}
                            </span>
                            <span className="block text-[10px] text-slate-400 mt-0.5">
                              {chip.desc}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  
                  {/* Link de Ajuda no Zero State */}
                  <div className="mt-6 flex justify-center">
                    <HelpDialog>
                      <button
                        type="button"
                        className="text-xs text-slate-400 hover:text-green-600 transition-colors flex items-center gap-1.5"
                      >
                        <LifeBuoy className="w-3.5 h-3.5" />
                        <span>Preciso de ajuda ou suporte</span>
                      </button>
                    </HelpDialog>
                  </div>
                </div>
                )}

                {/* MESSAGE LIST */}
                {messages.map((message, index) => {
                  // Renderizar divisor de contexto
                  if (message.type === "divider" && message.isContextDivider) {
                    return (
                      <div
                        key={message.id}
                        className="flex items-center gap-4 w-full my-4"
                      >
                        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent" />
                        <span className="text-xs font-medium text-slate-500 px-3 py-1 bg-slate-50 rounded-full border border-slate-200">
                          {message.content}
                        </span>
                        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent" />
                      </div>
                    );
                  }

                  // Renderizar componente generativo
                  if (message.type === "component" && message.componentData?.type === "task_confirmation") {
                    return (
                      <div
                        key={message.id}
                        className="flex w-full justify-start"
                      >
                        <div className="max-w-[90%] w-full">
                          <KanbanConfirmationCard
                            initialData={{
                              ...message.componentData.data,
                              status: message.componentData.data.status || "todo",
                              workspaceId: activeWorkspaceId || undefined,
                            }}
                            members={workspaceMembers}
                            workspaces={workspaces}
                            onConfirm={handleConfirmTask}
                            onCancel={handleCancelTask}
                            isLoading={isLoading}
                          />
                        </div>
                      </div>
                    );
                  }

                  // Renderizar mensagem normal (pular se for system e não for divider)
                  if (message.role === "system" && message.type !== "divider") {
                    return null;
                  }

                  return (
                    <div
                      key={message.id}
                      className={cn(
                        "flex w-full",
                        message.role === "user" ? "justify-end" : "justify-start"
                      )}
                    >
                      <div
                        className={cn(
                          "max-w-[85%] rounded-2xl text-sm shadow-sm",
                          message.type === "image" && !message.content
                            ? "p-2" // Padding mínimo se for só imagem
                            : "px-4 py-3", // Padding normal para outras mensagens
                          message.role === "user"
                            ? "bg-slate-900 text-white rounded-br-sm"
                            : "bg-white border border-slate-100 text-slate-800 rounded-bl-sm"
                        )}
                      >
                        {message.type === "image" && message.imageUrl && (
                          <div className="rounded-lg overflow-hidden w-full">
                            <img
                              src={message.imageUrl}
                              alt={message.role === "assistant" ? "Meme" : "Imagem enviada"}
                              className="max-w-full h-auto rounded-lg w-full"
                              onError={(e) => {
                                console.error("Erro ao carregar imagem:", message.imageUrl);
                                e.currentTarget.style.display = "none";
                              }}
                              onLoad={() => {
                                console.log("Imagem carregada com sucesso:", message.imageUrl);
                              }}
                            />
                          </div>
                        )}
                        
                        {message.type === "audio" && (
                          <div className="mb-2">
                            <AudioMessageBubble
                              duration={message.audioDuration || 0}
                              isOwnMessage={message.role === "user"}
                              audioUrl={message.audioUrl}
                            />
                            {message.audioTranscription && (
                              <p className="text-xs text-slate-500 mt-2 italic">
                                Transcrição: {message.audioTranscription}
                              </p>
                            )}
                          </div>
                        )}
                        
                        {message.isThinking ? (
                          <ThinkingIndicator />
                        ) : message.content ? (
                          <p className="whitespace-pre-wrap leading-relaxed">
                            {message.content}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
                
                {/* Elemento invisível para scroll anchor */}
                <div ref={scrollRef} />
              </div>
        </div>

        {/* INPUT AREA (Fixa no rodapé) */}
        <div className="p-4 bg-white border-t border-slate-100 flex-shrink-0">
          {/* Input de arquivo oculto para upload de imagens */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
            id="image-upload-input"
          />
          
          <div className="relative flex items-center">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyPress} // Alterado para onKeyDown (padrão React mais novo)
              placeholder="Digite ou grave um áudio..."
              disabled={isLoading}
              className="pr-28 py-6 rounded-full border-slate-200 bg-slate-50 focus-visible:ring-green-500 shadow-inner"
            />
            
            <div className="absolute right-1.5 flex items-center gap-1">
              {/* Botão Upload de Imagem */}
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => fileInputRef.current?.click()}
                className="h-9 w-9 text-slate-400 hover:text-green-600 hover:bg-slate-100 rounded-full"
                title="Enviar imagem/print"
                disabled={isLoading}
              >
                <ImageIcon className="w-5 h-5" />
              </Button>

              {/* Botão Mic */}
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={handleMicClick}
                className={cn(
                  "h-9 w-9 rounded-full transition-all",
                  isRecording
                    ? "text-red-600 hover:text-red-700 hover:bg-red-50 animate-pulse"
                    : "text-slate-400 hover:text-green-600 hover:bg-slate-100"
                )}
                title={isRecording ? `Gravando... ${formatRecordingTime(recordingTime)} / ${formatRecordingTime(MAX_AUDIO_DURATION)}` : "Gravar áudio (máx. 2 min)"}
                disabled={isLoading}
              >
                <Mic className="w-5 h-5" />
              </Button>

              {/* Botão Enviar/Parar Gravação */}
              {isRecording ? (
                <Button
                  onClick={stopRecording}
                  size="icon"
                  className="h-9 w-9 rounded-full bg-red-600 hover:bg-red-700 text-white shadow-md animate-pulse"
                  title="Parar gravação e enviar"
                >
                  <Send className="w-4 h-4" />
                </Button>
              ) : (
                <Button
                  onClick={() => handleSendMessage(inputValue)}
                  disabled={!inputValue.trim() || isLoading}
                  size="icon"
                  className={cn(
                    "h-9 w-9 rounded-full transition-all duration-200",
                    inputValue.trim() 
                      ? "bg-green-600 hover:bg-green-700 text-white shadow-md scale-100" 
                      : "bg-slate-200 text-slate-400 scale-90 opacity-50"
                  )}
                >
                  <Send className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
          <div className="mt-2 text-center">
            {isRecording ? (
              <div className="flex items-center justify-center gap-2 px-4 py-2 bg-red-50 border border-red-200 rounded-lg">
                <div className="relative">
                  <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse" />
                  <div className="absolute inset-0 w-3 h-3 bg-red-600 rounded-full animate-ping opacity-75" />
                </div>
                <div className="flex flex-col items-center">
                  <p className="text-sm font-semibold text-red-700">
                    Gravando áudio
                  </p>
                  <p className="text-xs text-red-600 font-mono">
                    {formatRecordingTime(recordingTime)} / {formatRecordingTime(MAX_AUDIO_DURATION)}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-[10px] text-slate-400">
                Pressione <kbd className="font-sans px-1 rounded bg-slate-100 border border-slate-200 text-slate-500">Enter</kbd> para enviar
              </p>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
