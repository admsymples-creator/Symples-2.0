"use client";

import * as React from "react";
import { ListTodo, Calendar, AlertTriangle, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

interface SuggestionChipsProps {
  onSelect: (text: string) => void;
}

export function SuggestionChips({ onSelect }: SuggestionChipsProps) {
  const suggestions = [
    {
      title: "Criar nova tarefa",
      subtitle: "Adicionar uma nova tarefa",
      icon: ListTodo,
      prompt: "Criar nova tarefa",
    },
    {
      title: "Minha pauta hoje",
      subtitle: "O que tenho para hoje?",
      icon: Calendar,
      prompt: "Minha pauta hoje",
    },
    {
      title: "O que está atrasado?",
      subtitle: "Ver tarefas pendentes",
      icon: AlertTriangle,
      prompt: "O que está atrasado?",
    },
    {
      title: "Resumo da Semana",
      subtitle: "Análise semanal de tarefas",
      icon: BarChart3,
      prompt: "Resumo da Semana",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 w-full max-w-[400px]">
      {suggestions.map((suggestion) => {
        const Icon = suggestion.icon;
        return (
          <button
            key={suggestion.title}
            onClick={() => onSelect(suggestion.prompt)}
            className={cn(
              "border border-gray-200 bg-white hover:border-green-300 hover:bg-green-50/30",
              "transition-all cursor-pointer p-4 rounded-xl text-left flex flex-col gap-1 group"
            )}
          >
            <div className="flex items-center gap-2 mb-1">
              <div className="p-1.5 rounded-md bg-gray-100 text-gray-600 group-hover:bg-green-100 group-hover:text-green-600 transition-colors">
                <Icon className="h-4 w-4" />
              </div>
              <span className="font-semibold text-gray-800">{suggestion.title}</span>
            </div>
            <span className="text-sm text-gray-500 ml-1">{suggestion.subtitle}</span>
          </button>
        );
      })}
    </div>
  );
}

