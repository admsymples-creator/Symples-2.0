"use client";

import { useState, useEffect, useCallback, useRef, useTransition } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { toast } from "sonner";
import { 
  loadAssistantMessages, 
  saveAssistantMessage,
  type AssistantMessage as DBAssistantMessage 
} from "@/lib/actions/assistant";
import { createTask, getTasks, getWorkspaceMembers } from "@/lib/actions/tasks";
import { getUserWorkspaces, type Workspace } from "@/lib/actions/user";
import { invalidateTasksCache } from "@/hooks/use-tasks";
import { useRouter } from "next/navigation";

// Interface alinhada com a UI
export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  type?: "text" | "component" | "image" | "audio" | "divider" | "daily_reset";
  timestamp: Date;
  imageUrl?: string;
  audioUrl?: string;
  audioDuration?: number;
  audioTranscription?: string;
  isThinking?: boolean;
  isContextDivider?: boolean;
  componentData?: any;
}

export function useAssistantChat(workspaceId: string | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [showZeroState, setShowZeroState] = useState(true);
  const [workspaceMembers, setWorkspaceMembers] = useState<any[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  
  const [isPending, startTransition] = useTransition();
  const router = useRouter(); // ✅ Usaremos isso para atualizar a tela
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  // Singleton do cliente Supabase para evitar recriação a cada render
  const [supabase] = useState(() =>
    createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  );

  // 1. CARREGAR HISTÓRICO & REALTIME
  useEffect(() => {
    if (!workspaceId) return;

    let isMounted = true;

    const initChat = async () => {
      try {
        const result = await loadAssistantMessages(workspaceId);
        
        if (isMounted && result.success && result.messages) {
          const formatted = result.messages.map((msg: any) => ({
            id: `db-${msg.id}`,
            role: msg.role,
            content: msg.content,
            type: msg.type || "text",
            timestamp: new Date(msg.created_at),
            isContextDivider: msg.is_context_divider,
            componentData: msg.component_data,
            imageUrl: msg.image_url,
            audioUrl: msg.audio_url,
            audioTranscription: msg.audio_transcription
          }));

          // Smart Daily Reset
          const lastMsg = formatted[formatted.length - 1];
          if (lastMsg) {
            const lastDate = new Date(lastMsg.timestamp);
            const now = new Date();
            const cutoff = new Date();
            cutoff.setHours(4, 0, 0, 0);
            
            if (now > cutoff && lastDate < cutoff) {
              formatted.push({
                id: `daily-${now.getTime()}`,
                role: "system" as const,
                type: "daily_reset" as const,
                content: "Novo dia iniciado",
                timestamp: now,
                isContextDivider: false,
                componentData: undefined,
                imageUrl: undefined,
                audioUrl: undefined,
                audioTranscription: undefined,
              });
              setShowZeroState(true);
            } else {
              setShowZeroState(false);
            }
          }

          setMessages(formatted);
        }
      } catch (err) {
        console.error("Erro ao carregar chat:", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    initChat();

    const channel = supabase
      .channel(`chat-${workspaceId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'assistant_messages',
          filter: `workspace_id=eq.${workspaceId}`
        },
        (payload) => {
          const newMsg = payload.new;
          setMessages((current) => {
            const exists = current.some(m => m.content === newMsg.content && 
                                           m.timestamp.getTime() > (new Date(newMsg.created_at).getTime() - 2000));
            if (exists) return current;

            return [...current, {
              id: `live-${newMsg.id}`,
              role: newMsg.role as any,
              content: newMsg.content,
              type: newMsg.type as any,
              timestamp: new Date(newMsg.created_at),
              componentData: newMsg.component_data
            }];
          });
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [workspaceId, supabase]);

  // Carregar dados auxiliares
  useEffect(() => {
    if (!workspaceId) return;
    getWorkspaceMembers(workspaceId).then(m => setWorkspaceMembers(m || []));
    getUserWorkspaces().then(w => setWorkspaces(w || []));
  }, [workspaceId]);

  // Função auxiliar para sanitizar histórico antes de enviar à API
  const sanitizeHistory = (allMessages: Message[]): Array<{ role: string; content: string }> => {
    // 1. Encontrar o índice do último divisor de contexto
    let contextCutoffIndex = -1;
    for (let i = allMessages.length - 1; i >= 0; i--) {
      if (allMessages[i].isContextDivider === true) {
        contextCutoffIndex = i;
        break;
      }
    }

    // 2. Filtrar mensagens após o divisor (ou todas se não houver divisor)
    const messagesAfterDivider = contextCutoffIndex >= 0
      ? allMessages.slice(contextCutoffIndex + 1)
      : allMessages;

    // 3. Aplicar filtros e transformações
    const sanitized = messagesAfterDivider
      .filter((msg) => {
        // Remover mensagens de thinking e system (exceto injeções manuais)
        if (msg.isThinking === true) return false;
        if (msg.role === "system" && !msg.isContextDivider) return false;
        return true;
      })
      .map((msg) => {
        // Injetar contexto visual quando content está vazio mas componentData existe
        if (!msg.content && msg.componentData) {
          const componentType = msg.componentData.type || "unknown";
          const componentData = msg.componentData.data || {};
          return {
            role: msg.role,
            content: `[Sistema: Exibi um componente do tipo ${componentType} com os dados: ${JSON.stringify(componentData)}]`,
          };
        }
        // Caso padrão: retornar role e content
        return {
          role: msg.role,
          content: msg.content || "",
        };
      })
      .filter((msg) => msg.content.trim().length > 0) // Remover mensagens vazias
      .slice(-15); // Windowing: últimas 15 mensagens

    return sanitized;
  };

  // 2. AÇÕES DO CHAT
  const sendMessage = async (text: string) => {
    if (!text.trim() || !workspaceId) return;

    setShowZeroState(false);

    const tempId = Date.now().toString();
    const userMsg: Message = {
      id: tempId,
      role: "user",
      content: text,
      type: "text",
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMsg]);

    const thinkingId = `thinking-${tempId}`;
    setMessages(prev => [...prev, {
      id: thinkingId,
      role: "assistant",
      content: "",
      type: "text",
      isThinking: true,
      timestamp: new Date()
    }]);

    try {
      await saveAssistantMessage({
        workspace_id: workspaceId,
        role: "user",
        content: text,
        type: "text"
      });

      // Sanitizar histórico antes de enviar
      const sanitizedHistory = sanitizeHistory(messages);

      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          workspaceId,
          conversationHistory: sanitizedHistory,
        }),
      });

      if (!response.ok) throw new Error("Falha na IA");

      const data = await response.json();

      setMessages(prev => {
        const clean = prev.filter(m => m.id !== thinkingId);
        
        // Construir componentData se for criação de tarefa
        if (data.isTaskCreation && data.taskInfo) {
          const componentData = {
            type: "task_confirmation",
            data: {
              title: data.taskInfo.title || "Nova tarefa",
              description: data.taskInfo.description || data.taskInfo.descriptionFull || "",
              dueDate: data.taskInfo.dueDate || null,
              assigneeId: data.taskInfo.assigneeId || null,
              priority: data.taskInfo.priority || "medium",
              status: data.taskInfo.status || "todo",
              workspaceId: workspaceId || undefined,
            },
          };

          // Adicionar mensagem de texto do assistente (se houver)
          const messagesToAdd: Message[] = [];
          if (data.message) {
            messagesToAdd.push({
              id: `ai-${Date.now()}`,
              role: "assistant",
              content: data.message,
              type: "text",
              timestamp: new Date(),
            });
          }

          // Adicionar card de confirmação
          messagesToAdd.push({
            id: `ai-card-${Date.now()}`,
            role: "assistant",
            content: "",
            type: "component",
            componentData: componentData,
            timestamp: new Date(),
          });

          // Salvar no banco
          if (data.message || componentData) {
            queueMicrotask(() => {
              Promise.all([
                data.message ? saveAssistantMessage({
                  workspace_id: workspaceId,
                  role: "assistant",
                  content: data.message,
                  type: "text",
                }) : Promise.resolve({ success: true }),
                saveAssistantMessage({
                  workspace_id: workspaceId,
                  role: "assistant",
                  content: "",
                  type: "component",
                  component_data: componentData,
                }),
              ]).catch((error) => {
                console.error("Erro ao salvar mensagens:", error);
              });
            });
          }

          return [...clean, ...messagesToAdd];
        }

        // Resposta normal (texto)
        const assistantMessage: Message = {
          id: `ai-${Date.now()}`,
          role: "assistant",
          content: data.message || "Desculpe, não consegui processar sua mensagem.",
          type: "text",
          timestamp: new Date(),
        };

        // Salvar no banco
        if (data.message) {
          queueMicrotask(() => {
            saveAssistantMessage({
              workspace_id: workspaceId,
              role: "assistant",
              content: data.message,
              type: "text",
            }).catch((error) => {
              console.error("Erro ao salvar mensagem:", error);
            });
          });
        }

        return [...clean, assistantMessage];
      });

    } catch (error) {
      console.error(error);
      toast.error("Erro ao processar mensagem");
      setMessages(prev => prev.filter(m => m.id !== thinkingId));
    }
  };

  // 3. GRAVAÇÃO DE ÁUDIO
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      setMediaStream(stream);
      
      // Detectar o melhor tipo MIME disponível
      let mimeType = 'audio/webm';
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/webm')) {
        mimeType = 'audio/webm';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4';
      } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
        mimeType = 'audio/ogg';
      }
      
      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      // Coletar dados em intervalos para garantir que todos os chunks sejam capturados
      recorder.start(100); // Coletar dados a cada 100ms
      setIsRecording(true);
    } catch (e) {
      console.error("Erro ao iniciar gravação:", e);
      toast.error("Permissão de microfone negada");
    }
  };

  const stopRecording = async (duration: number) => {
    if (!mediaRecorderRef.current) return;
    
    // Parar o recorder e capturar mimeType antes de limpar
    const recorder = mediaRecorderRef.current;
    const mimeType = recorder.mimeType || 'audio/webm';
    
    // Criar promise para aguardar o evento onstop
    const stopPromise = new Promise<void>((resolve) => {
      recorder.onstop = () => {
        resolve();
      };
    });
    
    // Parar o recorder
    if (recorder.state !== 'inactive') {
      recorder.stop();
    }
    
    // Aguardar o evento onstop para garantir que todos os chunks foram coletados
    await stopPromise;
    
    // Parar o stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    
    // Limpar referências
    mediaRecorderRef.current = null;
    setIsRecording(false);
    setMediaStream(null);
    
    // Verificar se há chunks de áudio
    if (audioChunksRef.current.length === 0) {
      setIsLoading(false);
      toast.error("Nenhum áudio foi gravado. Tente novamente.");
      return;
    }
    
    // Processar áudio após parar
    const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
    const audioUrl = URL.createObjectURL(audioBlob);
    
    // Adicionar mensagem de áudio otimista
    const audioMessageId = `audio-${Date.now()}`;
    const audioMessage: Message = {
      id: audioMessageId,
      role: "user",
      content: "Mensagem de áudio",
      type: "audio",
      audioUrl,
      audioDuration: duration,
      timestamp: new Date(),
    };
    
    startTransition(() => {
      setMessages(prev => [...prev, audioMessage]);
    });
    
    setIsLoading(true);
    
    // Adicionar estado de "pensando"
    const thinkingId = `thinking-${audioMessageId}`;
    const thinkingMessage: Message = {
      id: thinkingId,
      role: "assistant",
      content: "",
      type: "text",
      isThinking: true,
      timestamp: new Date(),
    };
    
    startTransition(() => {
      setMessages(prev => [...prev, thinkingMessage]);
    });
    
    try {
      // Transcrever áudio
      const formData = new FormData();
      // Converter Blob para File com o tipo MIME correto
      // A OpenAI Whisper aceita: mp3, mp4, mpeg, mpga, m4a, wav, webm
      let fileExtension = 'webm';
      if (mimeType.includes('mp4')) {
        fileExtension = 'mp4';
      } else if (mimeType.includes('ogg')) {
        fileExtension = 'ogg';
      } else if (mimeType.includes('webm')) {
        fileExtension = 'webm';
      }
      
      const audioFile = new File([audioBlob], `audio.${fileExtension}`, { type: mimeType });
      formData.append("audio", audioFile);
      
      console.log("Enviando áudio para transcrição:", {
        size: audioBlob.size,
        type: mimeType,
        chunks: audioChunksRef.current.length,
        fileExtension,
      });
      
      const transcribeResponse = await fetch("/api/audio/transcribe", {
        method: "POST",
        body: formData,
      });
      
      if (!transcribeResponse.ok) {
        let errorMessage = "Erro ao transcrever áudio";
        let errorDetails: any = null;
        try {
          const errorData = await transcribeResponse.json();
          errorMessage = errorData.error || errorData.details?.error || errorMessage;
          errorDetails = errorData.details || errorData;
          console.error("Erro na transcrição:", {
            status: transcribeResponse.status,
            statusText: transcribeResponse.statusText,
            error: errorData,
          });
        } catch (e) {
          console.error("Erro ao parsear resposta de erro:", e);
          const text = await transcribeResponse.text().catch(() => "");
          console.error("Resposta de erro (texto):", text);
        }
        throw new Error(`${errorMessage}${errorDetails ? `: ${JSON.stringify(errorDetails)}` : ""}`);
      }
      
      const transcribeData = await transcribeResponse.json();
      const transcribedText = transcribeData.transcription || "";
      
      if (!transcribedText.trim()) {
        throw new Error("Transcrição vazia");
      }
      
      // Atualizar mensagem de áudio com transcrição
      startTransition(() => {
        setMessages(prev =>
          prev.map(msg =>
            msg.id === audioMessageId
              ? { ...msg, audioTranscription: transcribedText }
              : msg
          )
        );
      });
      
      // Salvar mensagem de áudio no banco (sem URL, pois é blob temporário)
      // A URL do blob será mantida apenas no estado local
      if (workspaceId) {
        queueMicrotask(() => {
          saveAssistantMessage({
            workspace_id: workspaceId,
            role: "user",
            content: "Mensagem de áudio",
            type: "audio",
            audio_url: null, // Não salvar URL de blob temporário
            audio_duration: duration,
            audio_transcription: transcribedText,
          }).then((result) => {
            if (result.success && result.messageId) {
              startTransition(() => {
                setMessages(prev =>
                  prev.map(msg =>
                    msg.id === audioMessageId
                      ? { ...msg, id: `db-${result.messageId}` }
                      : msg
                  )
                );
              });
            }
          }).catch((error) => {
            console.error("Erro ao salvar mensagem de áudio:", error);
          });
        });
      }
      
      // Processar transcrição e IA em rota unificada
      const contextPayload = {
        history: sanitizeHistory(messages),
        workspaceMembers,
      };

      const processFormData = new FormData();
      processFormData.append("audio", audioFile);
      if (workspaceId) processFormData.append("workspaceId", workspaceId);
      processFormData.append("context", JSON.stringify(contextPayload));

      const response = await fetch("/api/audio/process", {
        method: "POST",
        body: processFormData,
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        throw new Error(errorText || "Falha na rota unificada de áudio");
      }

      const data = await response.json();

      const userTextMessage: Message = {
        id: `user-text-${Date.now()}`,
        role: "user",
        content: data.transcription || transcribedText,
        type: "text",
        timestamp: new Date(),
      };

      const assistantMessage: Message = {
        id: `ai-${Date.now()}`,
        role: "assistant",
        content: data.message || "Desculpe, não consegui processar sua mensagem.",
        type: data.componentData ? "component" : "text",
        componentData: data.componentData || undefined,
        timestamp: new Date(),
      };

      startTransition(() => {
        setMessages(prev => {
          const withTranscription = prev.map(msg =>
            msg.id === audioMessageId
              ? { ...msg, audioTranscription: data.transcription || transcribedText }
              : msg
          );
          const clean = withTranscription.filter(m => m.id !== thinkingId);
          return [...clean, userTextMessage, assistantMessage];
        });
      });

      setIsLoading(false);
    } catch (error) {
      console.error("Erro ao processar áudio:", error);
      
      startTransition(() => {
        setMessages(prev => {
          const withoutThinking = prev.filter(m => m.id !== thinkingId);
          const errorMessage: Message = {
            id: `error-${Date.now()}`,
            role: "assistant",
            content: error instanceof Error && error.message.includes("Transcrição vazia")
              ? "Não foi possível transcrever o áudio. Tente gravar novamente."
              : "Erro ao processar áudio. Tente novamente.",
            type: "text",
            timestamp: new Date(),
          };
          return [...withoutThinking, errorMessage];
        });
      });
      
      setIsLoading(false);
      toast.error("Erro ao processar áudio. Tente novamente.");
    }
    
    // Limpar chunks
    audioChunksRef.current = [];
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    audioChunksRef.current = [];
    setIsRecording(false);
    setMediaStream(null);
  };

  // 4. OUTRAS AÇÕES
  const sendImage = async (file: File) => {
    toast.info("Upload de imagem em breve");
  };

  const clearContext = async () => {
    if (!workspaceId) return;
    setMessages([]);
    setShowZeroState(true);
    
    await saveAssistantMessage({
      workspace_id: workspaceId,
      role: "system",
      content: "Contexto limpo",
      type: "divider",
      is_context_divider: true
    });
    
    toast.success("Contexto reiniciado");
  };

  const confirmTask = async (data: {
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
      
      const targetWorkspaceId = data.workspaceId || workspaceId;

      const res = await createTask({
        title: data.title,
        description: data.description,
        workspace_id: targetWorkspaceId,
        status: data.status || "todo",
        priority: data.priority || "medium",
        assignee_id: data.assigneeId,
        due_date: data.dueDate,
      });

      if (res.success) {
        // Invalidar cache e atualizar UI
        invalidateTasksCache(targetWorkspaceId);
        startTransition(() => {
          router.refresh();
        });

        // Remover card de confirmação e mensagem de texto anterior do assistente
        startTransition(() => {
          setMessages((prev) => {
            const filtered: Message[] = [];
            for (let i = 0; i < prev.length; i++) {
              const msg = prev[i];
              // Se é o card de confirmação, pula ele e a mensagem anterior do assistente
              if (msg.type === "component" && msg.componentData?.type === "task_confirmation") {
                // Remove a mensagem anterior se for do assistente e tipo texto
                if (filtered.length > 0 && filtered[filtered.length - 1].role === "assistant" && filtered[filtered.length - 1].type === "text") {
                  filtered.pop();
                }
                continue; // Não adiciona o card
              }
              filtered.push(msg);
            }
            return filtered;
          });
        });

        toast.success("Tarefa criada com sucesso!");
      } else {
        throw new Error(res.error || "Erro ao criar tarefa");
      }
    } catch (error) {
      console.error("Erro ao criar tarefa:", error);
      toast.error("Erro ao criar tarefa. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  const cancelTaskConfirmation = () => {
    startTransition(() => {
      setMessages((prev) => {
        const filtered: Message[] = [];
        for (let i = 0; i < prev.length; i++) {
          const msg = prev[i];
          // Se é o card de confirmação, pula ele e a mensagem anterior do assistente
          if (msg.type === "component" && msg.componentData?.type === "task_confirmation") {
            // Remove a mensagem anterior se for do assistente e tipo texto
            if (filtered.length > 0 && filtered[filtered.length - 1].role === "assistant" && filtered[filtered.length - 1].type === "text") {
              filtered.pop();
            }
            continue; // Não adiciona o card
          }
          filtered.push(msg);
        }
        return filtered;
      });
    });
  };

  return {
    messages,
    sendMessage,
    sendImage,
    sendAudio: () => {},
    clearContext,
    isLoading,
    isRecording,
    startRecording,
    stopRecording,
    cancelRecording,
    mediaStream,
    workspaceMembers,
    workspaces,
    confirmTask,
    cancelTaskConfirmation,
    showZeroState
  };
}