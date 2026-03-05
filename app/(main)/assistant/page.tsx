"use client";

import React, { useEffect, useRef, useState } from "react";
import { AIOrb } from "@/components/assistant/AIOrb";
import {
  Send,
  Mic,
  MicOff,
  Plus,
  Brain,
  Calendar,
  TrendingUp,
  Zap,
  Sparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useAssistantChat } from "@/hooks/use-assistant-chat";
import { getUserWorkspaces } from "@/lib/actions/user";
import { TaskConfirmationCard } from "@/components/assistant/TaskConfirmationCard";

const AssistantWelcome = ({ onSuggestionClick }: { onSuggestionClick: (text: string) => void }) => (
  <div className="h-full flex flex-col items-center justify-center text-center p-8 animate-in zoom-in-95 duration-500">
    <AIOrb />
    <h1 className="text-2xl font-semibold text-gray-900">Como posso ajudar seu negócio hoje?</h1>
    <p className="text-gray-500 mt-2 mb-10 max-w-md">
      Gerencie tarefas, analise finanças ou tire dúvidas.
    </p>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl">
      {[
        { icon: Zap, title: "Nova Tarefa", subtitle: "Criar tarefa de follow-up", prompt: "Criar tarefa de follow-up" },
        { icon: TrendingUp, title: "Financeiro", subtitle: "Qual meu saldo atual?", prompt: "Qual meu saldo atual?" },
        { icon: Calendar, title: "Agenda", subtitle: "O que tenho para hoje?", prompt: "O que tenho para hoje?" },
        { icon: Brain, title: "Brainstorm", subtitle: "Ideias para post no Instagram", prompt: "Ideias para post no Instagram" },
      ].map((chip) => (
        <button
          key={chip.title}
          onClick={() => onSuggestionClick(chip.prompt)}
          className="border border-gray-200 bg-white hover:border-green-300 hover:bg-green-50/30 transition-all cursor-pointer p-4 rounded-xl text-left flex flex-col gap-1 group"
        >
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1.5 rounded-md bg-gray-100 text-gray-600 group-hover:bg-green-100 group-hover:text-green-600 transition-colors">
              <chip.icon className="h-4 w-4" />
            </div>
            <span className="font-semibold text-gray-800">{chip.title}</span>
          </div>
          <span className="text-sm text-gray-500 ml-1">{chip.subtitle}</span>
        </button>
      ))}
    </div>
  </div>
);

export default function AssistantPage() {
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const {
    messages,
    sendMessage,
    isLoading,
    isRecording,
    startRecording,
    stopRecording,
    cancelRecording,
    showZeroState,
    workspaceMembers,
    confirmTask,
    cancelTaskConfirmation,
  } = useAssistantChat(workspaceId);

  const [recordingDuration, setRecordingDuration] = useState(0);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    getUserWorkspaces().then((workspaces) => {
      if (workspaces && workspaces.length > 0) {
        setWorkspaceId(workspaces[0].id);
      }
    });
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (isRecording) {
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration((d) => d + 1);
      }, 1000);
    } else {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    }
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    };
  }, [isRecording]);

  const handleSend = (text: string = inputValue) => {
    if (!text.trim() || isLoading) return;
    sendMessage(text);
    setInputValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleMicClick = async () => {
    if (isRecording) {
      await stopRecording(recordingDuration);
    } else {
      setRecordingDuration(0);
      await startRecording();
    }
  };

  return (
    <div className="flex h-[calc(100vh-64px)] bg-white overflow-hidden">
      <div className="flex-1 flex flex-col relative min-w-0">
        {showZeroState && messages.length === 0 ? (
          <div className="flex-1 flex flex-col overflow-hidden pb-32">
            <AssistantWelcome onSuggestionClick={handleSend} />
          </div>
        ) : (
          <ScrollArea className="flex-1 p-4 md:p-8" ref={scrollRef}>
            <div className="max-w-3xl mx-auto space-y-6 pb-32 min-h-full">
              {messages.map((msg) => {
                if (msg.isThinking) {
                  return (
                    <div key={msg.id} className="flex gap-4 w-full">
                      <div className="flex-shrink-0 mt-1">
                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-sm">
                          <Sparkles className="h-4 w-4 text-white animate-pulse" />
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span className="animate-pulse">Pensando...</span>
                      </div>
                    </div>
                  );
                }

                if (msg.role === "user") {
                  return (
                    <div key={msg.id} className="flex gap-3 w-full justify-end animate-in fade-in slide-in-from-bottom-2 duration-300">
                      <div className="bg-gray-100 text-gray-800 rounded-2xl rounded-tr-sm px-5 py-3 max-w-[80%] shadow-sm border border-gray-200/50">
                        <p className="text-sm leading-relaxed">{msg.content}</p>
                      </div>
                      <Avatar className="h-8 w-8 mt-1 border border-gray-200">
                        <AvatarFallback className="bg-gray-900 text-white text-xs">Eu</AvatarFallback>
                      </Avatar>
                    </div>
                  );
                }

                if (msg.type === "component" && msg.componentData?.type === "task_confirmation") {
                  return (
                    <div key={msg.id} className="flex gap-4 w-full animate-in fade-in slide-in-from-bottom-2 duration-300">
                      <div className="flex-shrink-0 mt-1">
                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-sm">
                          <Sparkles className="h-4 w-4 text-white" />
                        </div>
                      </div>
                      <div className="flex-1 max-w-sm">
                        <TaskConfirmationCard
                          initialData={msg.componentData.data}
                          members={workspaceMembers.map((m) => ({
                            id: m.id,
                            name: m.name || m.full_name || m.email || "Membro",
                          }))}
                          onConfirm={(data) => confirmTask({ ...data, workspaceId })}
                          onCancel={cancelTaskConfirmation}
                          isLoading={isLoading}
                        />
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={msg.id} className="flex gap-4 w-full animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="flex-shrink-0 mt-1">
                      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-sm">
                        <Sparkles className="h-4 w-4 text-white" />
                      </div>
                    </div>
                    <div className="flex-col flex gap-1 max-w-[85%]">
                      <div className="text-sm text-muted-foreground font-medium flex items-center gap-2">
                        Assistente Symples
                        <span className="text-[10px] font-normal opacity-60">
                          {msg.timestamp.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <div className="text-gray-700 leading-relaxed text-sm whitespace-pre-wrap">
                        {msg.content}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}

        {/* Input Area */}
        <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6 bg-gradient-to-t from-white via-white to-transparent">
          <div className="max-w-3xl mx-auto relative">
            <div className={cn(
              "relative flex items-center shadow-xl rounded-xl bg-white border transition-all",
              isRecording ? "border-red-400 ring-2 ring-red-200" : "border-gray-200 focus-within:ring-2 focus-within:ring-indigo-500/20"
            )}>
              <Button variant="ghost" size="icon" className="ml-2 text-muted-foreground hover:text-indigo-600">
                <Plus className="h-5 w-5" />
              </Button>

              <Input
                value={isRecording ? `Gravando... ${recordingDuration}s` : inputValue}
                onChange={(e) => !isRecording && setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Pergunte algo ou dite uma tarefa..."
                disabled={isRecording || isLoading}
                className="border-0 focus-visible:ring-0 py-6 px-4 text-base shadow-none bg-transparent flex-1"
              />

              <div className="flex items-center mr-2 gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={isRecording ? cancelRecording : handleMicClick}
                  className={cn(
                    "text-muted-foreground hover:text-gray-900",
                    isRecording && "text-red-500 hover:text-red-700"
                  )}
                >
                  {isRecording ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                </Button>
                <Separator orientation="vertical" className="h-6 mx-1" />
                <Button
                  onClick={() => handleSend()}
                  size="icon"
                  disabled={isLoading || isRecording || !inputValue.trim()}
                  className="h-9 w-9 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm transition-all hover:scale-105 disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="text-center mt-2">
              <p className="text-[10px] text-muted-foreground">
                A IA pode cometer erros. Verifique informações importantes.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
