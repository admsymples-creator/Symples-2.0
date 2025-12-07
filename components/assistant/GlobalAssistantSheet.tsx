"use client";

import * as React from "react";
import { 
  ListTodo, 
  Calendar, 
  AlertTriangle, 
  BarChart3,
  Send,
  Mic,
  X,
  Image as ImageIcon
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
import { useWorkspace } from "@/components/providers/SidebarProvider";
import { getWorkspaceMembers } from "@/lib/actions/tasks";
import { createTask } from "@/lib/actions/tasks";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Tipagem preparada para Generative UI
interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  type?: "text" | "component" | "image" | "audio";
  timestamp: Date;
  imageUrl?: string; // URL da imagem se type for "image"
  audioUrl?: string; // URL do áudio se type for "audio"
  audioDuration?: number; // Duração do áudio em segundos
  audioTranscription?: string; // Transcrição do áudio
  isThinking?: boolean; // Estado de "IA pensando" (apenas para assistente)
  componentData?: {
    type: "task_confirmation";
    data: {
      title: string;
      description?: string;
      dueDate?: string | null;
      assigneeId?: string | null;
      priority?: "low" | "medium" | "high" | "urgent";
      status?: "todo" | "in_progress" | "done";
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

// Dados mock para visualização
const mockMessages: Message[] = [
  {
    id: "1",
    role: "user",
    content: "Criar uma tarefa para revisar o relatório financeiro",
    type: "text",
    timestamp: new Date(Date.now() - 3600000), // 1 hora atrás
  },
  {
    id: "2",
    role: "assistant",
    content: "Perfeito! Criei a tarefa 'Revisar relatório financeiro' para você. Ela foi adicionada à sua lista de tarefas pendentes.\n\nQuer que eu defina uma data de vencimento ou adicione algum detalhe específico?",
    type: "text",
    timestamp: new Date(Date.now() - 3550000), // ~1 hora atrás
  },
  {
    id: "3",
    role: "user",
    content: "O que está atrasado?",
    type: "text",
    timestamp: new Date(Date.now() - 1800000), // 30 min atrás
  },
  {
    id: "4",
    role: "assistant",
    content: "Encontrei 3 tarefas atrasadas:\n\n1. **Revisar proposta comercial** - Venceu há 2 dias\n2. **Enviar relatório mensal** - Venceu ontem\n3. **Atualizar site** - Venceu há 5 dias\n\nQuer que eu priorize alguma delas ou crie um plano de ação?",
    type: "text",
    timestamp: new Date(Date.now() - 1750000), // ~30 min atrás
  },
  {
    id: "5",
    role: "user",
    content: "Enviei uma imagem",
    type: "image",
    imageUrl: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=400&h=300&fit=crop",
    timestamp: new Date(Date.now() - 900000), // 15 min atrás
  },
  {
    id: "6",
    role: "assistant",
    content: "Recebi sua imagem! Vejo que é um gráfico financeiro. Em breve, poderei analisar automaticamente e extrair informações como:\n\n• Valores e tendências\n• Períodos analisados\n• Insights principais\n\nPor enquanto, posso ajudar você a criar uma tarefa relacionada a essa análise. Quer que eu faça isso?",
    type: "text",
    timestamp: new Date(Date.now() - 850000), // ~15 min atrás
  },
  {
    id: "7",
    role: "user",
    content: "Mensagem de áudio",
    type: "audio",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3", // URL mock de áudio
    audioDuration: 45, // 45 segundos
    audioTranscription: "Preciso revisar o relatório financeiro e enviar para o time até amanhã",
    timestamp: new Date(Date.now() - 600000), // 10 min atrás
  },
  {
    id: "8",
    role: "assistant",
    content: "Entendi sua mensagem de áudio! Você mencionou que precisa:\n\n• Priorizar a revisão do relatório\n• Agendar reunião para amanhã\n• Enviar feedback para a equipe\n\nQuer que eu crie essas tarefas agora?",
    type: "text",
    timestamp: new Date(Date.now() - 550000), // ~10 min atrás
  },
  {
    id: "7b",
    role: "user",
    content: "Mensagem de áudio - Criar tarefa",
    type: "audio",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
    audioDuration: 30, // 30 segundos
    audioTranscription: "Criar uma tarefa para revisar o relatório financeiro e enviar para o time até amanhã",
    timestamp: new Date(Date.now() - 480000), // 8 min atrás
  },
  {
    id: "7c",
    role: "assistant",
    content: "Transcrevi sua mensagem: \"Criar uma tarefa para revisar o relatório financeiro e enviar para o time até amanhã\"\n\nVou criar a tarefa para você. Confirme os detalhes abaixo:",
    type: "text",
    timestamp: new Date(Date.now() - 475000), // ~8 min atrás
  },
  {
    id: "7d",
    role: "assistant",
    content: "",
    type: "component",
    componentData: {
      type: "task_confirmation",
      data: {
        title: "Revisar o relatório financeiro e enviar para o time",
        description: "Revisar o relatório financeiro e enviar para o time até amanhã",
        dueDate: new Date(Date.now() + 86400000).toISOString(), // Amanhã
        assigneeId: null,
                      priority: "high",
                      status: "todo",
                    },
                  },
                  timestamp: new Date(Date.now() - 474000), // ~8 min atrás
                },
  {
    id: "9",
    role: "user",
    content: "Minha pauta hoje",
    type: "text",
    timestamp: new Date(Date.now() - 300000), // 5 min atrás
  },
  {
    id: "10",
    role: "assistant",
    content: "Sua pauta de hoje:\n\n**Prioridade Alta:**\n• Reunião com equipe - 14:00\n• Revisar proposta comercial (atrasada)\n\n**Prioridade Média:**\n• Enviar relatório mensal (atrasado)\n• Revisar relatório financeiro\n\n**Tempo livre estimado:** 2 horas\n\nQuer que eu reorganize algo ou crie lembretes?",
    type: "text",
    timestamp: new Date(Date.now() - 250000), // ~5 min atrás
  },
  {
    id: "11",
    role: "user",
    content: "Mensagem de áudio longa",
    type: "audio",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
    audioDuration: 120, // 2 minutos (limite máximo)
    timestamp: new Date(Date.now() - 120000), // 2 min atrás
  },
  {
    id: "12",
    role: "assistant",
    content: "Hey, ninguem merece escutar audio de 2 minutos. Nem mesmo uma IA.",
    type: "text",
    timestamp: new Date(Date.now() - 115000), // ~2 min atrás
  },
  {
    id: "12b",
    role: "assistant",
    content: "",
    type: "image",
    imageUrl: "/audiode2minutos.png",
    timestamp: new Date(Date.now() - 114000), // ~2 min atrás
  },
  {
    id: "13",
    role: "user",
    content: "Qual é o resumo da semana?",
    type: "text",
    timestamp: new Date(Date.now() - 60000), // 1 min atrás
  },
  {
    id: "14",
    role: "assistant",
    content: "",
    type: "text",
    isThinking: true, // Estado de "IA pensando"
    timestamp: new Date(Date.now() - 55000), // ~1 min atrás
  },
  {
    id: "15",
    role: "user",
    content: "Mensagem de áudio de 2 minutos",
    type: "audio",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
    audioDuration: 120, // Exatamente 2 minutos (limite máximo)
    timestamp: new Date(Date.now() - 30000), // 30 seg atrás
  },
  {
    id: "16",
    role: "assistant",
    content: "Hey, ninguem merece escutar audio de 2 minutos. Nem mesmo uma IA.",
    type: "text",
    timestamp: new Date(Date.now() - 25000), // ~30 seg atrás
  },
  {
    id: "17",
    role: "assistant",
    content: "",
    type: "image",
    imageUrl: "/audiode2minutos.png",
    timestamp: new Date(Date.now() - 24000), // ~30 seg atrás
  },
];

export function GlobalAssistantSheet({ user }: GlobalAssistantSheetProps) {
  const [open, setOpen] = React.useState(false);
  const [messages, setMessages] = React.useState<Message[]>(mockMessages); // Inicializar com dados mock
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
  const [workspaceMembers, setWorkspaceMembers] = React.useState<Array<{ id: string; name: string; avatar?: string }>>([]);
  const [isLoadingMembers, setIsLoadingMembers] = React.useState(false);
  
  // Saudação dinâmica
  const { greeting, name } = React.useMemo(() => getGreeting(user?.name), [user?.name]);
  
  // Ref para auto-scroll
  const scrollRef = React.useRef<HTMLDivElement>(null);

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

  const handleSendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    // 1. Adiciona mensagem do usuário (Optimistic UI)
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: content.trim(),
      type: "text",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    // 2. Adiciona estado de "pensando" (opcional, para mostrar que a IA está processando)
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

    // 3. Simulação de Network/AI (Substituir por n8n fetch depois)
    setTimeout(() => {
      // Remove mensagem de "pensando" e adiciona resposta
      setMessages((prev) => {
        const withoutThinking = prev.filter((msg) => msg.id !== thinkingMessageId);
        
        // Detectar se é criação de tarefa
        const isTaskCreation = content.toLowerCase().includes("criar") && 
                             (content.toLowerCase().includes("tarefa") || 
                              content.toLowerCase().includes("task"));
        
        if (isTaskCreation) {
          const assistantMessage: Message = {
            id: (Date.now() + 2).toString(),
            role: "assistant",
            content: `Vou criar a tarefa para você. Confirme os detalhes abaixo:`,
            type: "text",
            timestamp: new Date(),
          };
          
                const confirmationCardMessage: Message = {
                  id: (Date.now() + 3).toString(),
                  role: "assistant",
                  content: "",
                  type: "component",
                  componentData: {
                    type: "task_confirmation",
                    data: {
                      title: content.replace(/criar (uma )?tarefa (para|de|com)?/i, "").trim() || "Nova tarefa",
                      description: "",
                      dueDate: null,
                      assigneeId: null,
                      priority: "medium",
                      status: "todo",
                    },
                  },
                  timestamp: new Date(),
                };
          
          return [...withoutThinking, assistantMessage, confirmationCardMessage];
        } else {
          const assistantMessage: Message = {
            id: (Date.now() + 2).toString(),
            role: "assistant",
            content: `Entendi: "${content.trim()}". \n\n(Esta é uma resposta simulada do MVP. Na próxima sprint, conectaremos ao n8n para processar sua solicitação real.)`,
            type: "text",
            timestamp: new Date(),
          };
          return [...withoutThinking, assistantMessage];
        }
      });
      setIsLoading(false);
    }, 2000); // Aumentado para 2s para dar tempo de ver o estado "pensando"
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(inputValue);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
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

    // Simular resposta da IA
    setTimeout(() => {
      setMessages((prev) => {
        const withoutThinking = prev.filter((msg) => msg.id !== thinkingMessageId);
        const assistantMessage: Message = {
          id: (Date.now() + 2).toString(),
          role: "assistant",
          content: `Recebi sua imagem! Em breve, poderei analisar e processar imagens automaticamente.`,
          type: "text",
          timestamp: new Date(),
        };
        return [...withoutThinking, assistantMessage];
      });
      setIsLoading(false);
    }, 2000);

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

          // Simular resposta da IA com transcrição
          setTimeout(() => {
            setMessages((prev) => {
              const withoutThinking = prev.filter((msg) => msg.id !== thinkingMessageId);
              
              // Se atingiu o limite de 2 minutos, mostrar resposta especial com meme
              if (isMaxDuration) {
                const assistantMessage: Message = {
                  id: (Date.now() + 2).toString(),
                  role: "assistant",
                  content: "Hey, ninguem merece escutar audio de 2 minutos. Nem mesmo uma IA.",
                  type: "text",
                  timestamp: new Date(),
                };
                
                const memeMessage: Message = {
                  id: (Date.now() + 3).toString(),
                  role: "assistant",
                  content: "",
                  type: "image",
                  imageUrl: "/audiode2minutos.png",
                  timestamp: new Date(),
                };
                
                return [...withoutThinking, assistantMessage, memeMessage];
              }
              
              // Detectar se é criação de tarefa e mostrar card de confirmação
              const isTaskCreation = transcribedText.toLowerCase().includes("criar") && 
                                   (transcribedText.toLowerCase().includes("tarefa") || 
                                    transcribedText.toLowerCase().includes("task"));
              
              if (isTaskCreation) {
                // Extrair informações básicas da transcrição (simulação - depois virá da IA)
                const assistantMessage: Message = {
                  id: (Date.now() + 2).toString(),
                  role: "assistant",
                  content: `Transcrevi sua mensagem: "${transcribedText}"\n\nVou criar a tarefa para você. Confirme os detalhes abaixo:`,
                  type: "text",
                  timestamp: new Date(),
                };
                
                const confirmationCardMessage: Message = {
                  id: (Date.now() + 3).toString(),
                  role: "assistant",
                  content: "",
                  type: "component",
                  componentData: {
                    type: "task_confirmation",
                    data: {
                      title: transcribedText.replace(/criar (uma )?tarefa (para|de|com)?/i, "").trim() || "Nova tarefa",
                      description: "",
                      dueDate: null,
                      assigneeId: null,
                      priority: "medium",
                      status: "todo",
                    },
                  },
                  timestamp: new Date(),
                };
                
                return [...withoutThinking, assistantMessage, confirmationCardMessage];
              } else {
                const assistantMessage: Message = {
                  id: (Date.now() + 2).toString(),
                  role: "assistant",
                  content: `Transcrevi sua mensagem: "${transcribedText}"\n\nComo posso ajudar?`,
                  type: "text",
                  timestamp: new Date(),
                };
                return [...withoutThinking, assistantMessage];
              }
            });
            setIsLoading(false);
            setWasAutoStopped(false); // Resetar flag
          }, 1000);
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

      // Timer para contar o tempo de gravação
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime((prev) => {
          const newTime = prev + 1;
          // Parar automaticamente ao atingir 2 minutos
          if (newTime >= MAX_AUDIO_DURATION) {
            setWasAutoStopped(true); // Marcar que foi parado automaticamente
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
  }) => {
    try {
      setIsLoading(true);
      
      const result = await createTask({
        title: taskData.title,
        description: taskData.description,
        due_date: taskData.dueDate || null,
        assignee_id: taskData.assigneeId || null,
        priority: taskData.priority || "medium",
        workspace_id: activeWorkspaceId || null,
        status: taskData.status || "todo",
      });

      if (result.success) {
        toast.success("Tarefa criada com sucesso!");
        
        // Remover card de confirmação e adicionar mensagem de sucesso
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
          <div className="flex items-center justify-center">
            <SheetTitle className="font-semibold text-slate-800 m-0 text-center">
              Assistente Symples
            </SheetTitle>
          </div>
        </SheetHeader>

        {/* Chat Area */}
        <div className="flex-1 min-h-0 overflow-y-auto bg-white">
          <div className={cn(
            "flex flex-col gap-6 px-4 py-6",
            messages.length === 0 ? "justify-center min-h-full" : ""
          )}>
                

                {/* ZERO STATE (Só mostra se não houver mensagens) */}
                {messages.length === 0 && (
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
                </div>
                )}

                {/* MESSAGE LIST */}
                {messages.map((message) => {
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
                            }}
                            members={workspaceMembers}
                            onConfirm={handleConfirmTask}
                            onCancel={handleCancelTask}
                            isLoading={isLoading}
                          />
                        </div>
                      </div>
                    );
                  }

                  // Renderizar mensagem normal
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

                {/* LOADING STATE (Indicador de Digitação) */}
                {isLoading && (
                  <div className="flex justify-start w-full animate-in fade-in duration-300">
                    <div className="bg-white border border-slate-100 rounded-2xl rounded-bl-sm shadow-sm">
                      <ThinkingIndicator />
                    </div>
                  </div>
                )}
                
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

              {/* Botão Enviar */}
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
            </div>
          </div>
          <div className="mt-2 text-center">
            {isRecording ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <p className="text-xs text-red-600 font-medium">
                  Gravando... {formatRecordingTime(recordingTime)} / {formatRecordingTime(MAX_AUDIO_DURATION)}
                </p>
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
