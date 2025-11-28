"use client";

import React, { useState, useRef, useEffect } from "react";
import { AIOrb } from "@/components/assistant/AIOrb";
import {
  Send,
  Mic,
  Plus,
  MessageSquare,
  MoreHorizontal,
  CheckCircle2,
  Calendar,
  Flag,
  ArrowRight,
  Bot,
  User,
  Receipt,
  Undo2,
  Pencil,
  Zap,
  TrendingUp,
  Brain,
  Sparkles
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

// --- TYPES ---

type MessageType = "text" | "task_created" | "finance_entry";

interface TaskData {
  title: string;
  status: "pending" | "done";
  priority: "low" | "medium" | "high";
  dueDate: string;
  project?: string;
}

interface FinanceData {
  description: string;
  amount: number;
  type: "income" | "expense";
  date: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  type: MessageType;
  content: string;
  data?: TaskData | FinanceData;
  timestamp: Date;
}

// --- MOCK DATA ---

const RECENT_CONVERSATIONS = [
  { id: 1, title: "Resumo da reunião de MKT", time: "Há 2 horas" },
  { id: 2, title: "Ideias para nova campanha", time: "Há 5 horas" },
  { id: 3, title: "Ajuste no orçamento Q3", time: "Ontem" },
  { id: 4, title: "Planejamento semanal", time: "2 dias atrás" },
];

const INITIAL_MESSAGES: Message[] = [
  {
    id: "1",
    role: "user",
    type: "text",
    content: "Crie uma tarefa urgente para revisar o relatório mensal de vendas até sexta-feira.",
    timestamp: new Date(),
  },
  {
    id: "2",
    role: "assistant",
    type: "task_created",
    content: "Entendido. Criei a tarefa e marquei como alta prioridade.",
    data: {
      title: "Revisar Relatório Mensal de Vendas",
      status: "pending",
      priority: "high",
      dueDate: "Sexta-feira, 18:00",
      project: "Vendas",
    } as TaskData,
    timestamp: new Date(),
  },
];

// --- COMPONENTS ---

const TaskCard = ({ data }: { data: TaskData }) => {
  return (
    <Card className="w-full max-w-sm border-l-4 border-l-orange-500 bg-white shadow-sm mt-2">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <Badge variant="outline" className="text-xs font-normal text-muted-foreground">
            {data.project || "Geral"}
          </Badge>
          {data.priority === "high" && (
            <Badge variant="destructive" className="text-[10px] px-1.5 h-5">
              Urgente
            </Badge>
          )}
        </div>
        <CardTitle className="text-base font-medium leading-tight mt-1">
          {data.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-3">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            <span className="text-xs">{data.dueDate}</span>
          </div>
          <div className="flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span className="text-xs capitalize">{data.status === "pending" ? "Pendente" : "Concluído"}</span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="bg-gray-50 p-2 flex gap-2 justify-end rounded-b-xl">
        <Button variant="ghost" size="sm" className="h-7 text-xs px-2 text-muted-foreground hover:text-foreground">
          <Undo2 className="h-3.5 w-3.5 mr-1.5" />
          Desfazer
        </Button>
        <Button variant="outline" size="sm" className="h-7 text-xs px-2 bg-white">
          <Pencil className="h-3.5 w-3.5 mr-1.5" />
          Editar
        </Button>
      </CardFooter>
    </Card>
  );
};

const FinanceCard = ({ data }: { data: FinanceData }) => {
  return (
    <div className="bg-white border rounded-lg p-4 mt-2 w-full max-w-sm shadow-sm relative overflow-hidden">
      <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-2 text-emerald-600">
          <Receipt className="h-4 w-4" />
          <span className="text-xs font-semibold uppercase tracking-wider">Recibo Criado</span>
        </div>
        <span className="text-xs text-muted-foreground">{data.date}</span>
      </div>
      <div className="flex justify-between items-end">
        <div>
          <p className="text-sm font-medium text-gray-900">{data.description}</p>
          <p className="text-xs text-muted-foreground mt-0.5 capitalize">{data.type}</p>
        </div>
        <span className="text-lg font-bold text-emerald-600">
          R$ {data.amount.toFixed(2)}
        </span>
      </div>
    </div>
  );
};

const AIResponseBubble = ({ message }: { message: Message }) => {
  return (
    <div className="flex gap-4 w-full group animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex-shrink-0 mt-1">
        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-sm">
          <Sparkles className="h-4 w-4 text-white" />
        </div>
      </div>
      
      <div className="flex-col flex gap-2 max-w-[85%]">
        <div className="text-sm text-muted-foreground font-medium flex items-center gap-2">
          Assistente Symples
          <span className="text-[10px] font-normal opacity-60">Agora</span>
        </div>
        
        <div className="text-gray-700 leading-relaxed text-sm whitespace-pre-wrap">
          {message.content}
        </div>

        {/* Blocos de Ação (Rich UI) */}
        {message.type === "task_created" && message.data && (
          <TaskCard data={message.data as TaskData} />
        )}
        {message.type === "finance_entry" && message.data && (
          <FinanceCard data={message.data as FinanceData} />
        )}
      </div>
    </div>
  );
};

const UserMessageBubble = ({ message }: { message: Message }) => {
  return (
    <div className="flex gap-3 w-full justify-end animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="bg-gray-100 text-gray-800 rounded-2xl rounded-tr-sm px-5 py-3 max-w-[80%] shadow-sm border border-gray-200/50">
        <p className="text-sm leading-relaxed">{message.content}</p>
      </div>
      <Avatar className="h-8 w-8 mt-1 border border-gray-200">
        <AvatarImage src="/placeholder-user.jpg" />
        <AvatarFallback className="bg-gray-900 text-white text-xs">YO</AvatarFallback>
      </Avatar>
    </div>
  );
};

const AssistantWelcome = ({ onSuggestionClick }: { onSuggestionClick: (text: string) => void }) => (
  <div className="h-full flex flex-col items-center justify-center text-center p-8 animate-in zoom-in-95 duration-500">
    <AIOrb />
    <h1 className="text-2xl font-semibold text-gray-900">Como posso ajudar seu negócio hoje?</h1>
    <p className="text-gray-500 mt-2 mb-10 max-w-md">
      Gerencie tarefas, analise finanças ou tire dúvidas.
    </p>
    
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl">
      {[
        { 
          icon: Zap, 
          title: "Nova Tarefa", 
          subtitle: "Criar tarefa de follow-up",
          prompt: "Criar tarefa de follow-up"
        },
        { 
          icon: TrendingUp, 
          title: "Financeiro", 
          subtitle: "Qual meu saldo atual?",
          prompt: "Qual meu saldo atual?"
        },
        { 
          icon: Calendar, 
          title: "Agenda", 
          subtitle: "O que tenho para hoje?",
          prompt: "O que tenho para hoje?"
        },
        { 
          icon: Brain, 
          title: "Brainstorm", 
          subtitle: "Ideias para post no Instagram",
          prompt: "Ideias para post no Instagram"
        }
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

// --- MAIN PAGE ---

export default function AssistantPage() {
  // Start with empty messages to show the new Empty State
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = (text: string = inputValue) => {
    if (!text.trim()) return;

    const newUserMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      type: "text",
      content: text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, newUserMsg]);
    setInputValue("");

    // Simulate AI response (Generic for now since we are in UI Mock mode)
    setTimeout(() => {
      const newAiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        type: "text",
        content: "Esta é uma interface de demonstração. Em breve estarei conectado ao cérebro da aplicação!",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, newAiMsg]);
    }, 1000);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex h-[calc(100vh-64px)] bg-white overflow-hidden">
      
      {/* --- MAIN AREA (CENTER) --- */}
      <div className="flex-1 flex flex-col relative min-w-0">
        
        {messages.length === 0 ? (
           <div className="flex-1 flex flex-col overflow-hidden pb-32">
              <AssistantWelcome onSuggestionClick={handleSendMessage} />
           </div>
        ) : (
            <ScrollArea className="flex-1 p-4 md:p-8" ref={scrollRef}>
              <div className="max-w-3xl mx-auto space-y-8 pb-32 min-h-full">
                {messages.map((msg) => (
                    <React.Fragment key={msg.id}>
                      {msg.role === "user" ? (
                        <UserMessageBubble message={msg} />
                      ) : (
                        <AIResponseBubble message={msg} />
                      )}
                    </React.Fragment>
                  ))}
              </div>
            </ScrollArea>
        )}

        {/* --- INPUT AREA (FOOTER) --- */}
        <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6 bg-gradient-to-t from-white via-white to-transparent">
          <div className="max-w-3xl mx-auto relative">
            <div className="relative flex items-center shadow-xl rounded-xl bg-white border border-gray-200 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all">
              <Button variant="ghost" size="icon" className="ml-2 text-muted-foreground hover:text-indigo-600">
                <Plus className="h-5 w-5" />
              </Button>
              
              <Input 
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Pergunte algo ou digite '/' para comandos..." 
                className="border-0 focus-visible:ring-0 py-6 px-4 text-base shadow-none bg-transparent flex-1"
              />

              <div className="flex items-center mr-2 gap-1">
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-gray-900">
                  <Mic className="h-5 w-5" />
                </Button>
                <Separator orientation="vertical" className="h-6 mx-1" />
                <Button 
                  onClick={() => handleSendMessage()}
                  size="icon" 
                  className="h-9 w-9 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm transition-all hover:scale-105"
                >
                  <ArrowRight className="h-4 w-4" />
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

      {/* --- RIGHT SIDEBAR (HISTORY) --- */}
      <aside className="hidden xl:flex w-80 border-l border-gray-200 bg-gray-50/50 flex-col">
        <div className="p-4 border-b border-gray-200/50 flex justify-between items-center bg-gray-50">
          <h3 className="font-semibold text-sm text-gray-700 flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Conversas Recentes
          </h3>
          <Button variant="ghost" size="icon" className="h-8 w-8" title="Novo Chat">
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-3 space-y-2">
            {RECENT_CONVERSATIONS.map((chat) => (
              <button 
                key={chat.id}
                className="w-full text-left p-3 rounded-lg hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-200 transition-all group"
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="font-medium text-sm text-gray-800 line-clamp-1 group-hover:text-indigo-700 transition-colors">
                    {chat.title}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground block">
                  {chat.time}
                </span>
              </button>
            ))}
          </div>
        </ScrollArea>
        
        <div className="p-4 border-t border-gray-200 text-center">
           <Button variant="outline" className="w-full text-xs h-8">
              Ver histórico completo
           </Button>
        </div>
      </aside>

    </div>
  );
}

