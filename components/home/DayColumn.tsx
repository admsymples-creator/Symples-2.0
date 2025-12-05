"use client";

import { useState } from "react";
import { FolderOpen } from "lucide-react";
import { TaskRow } from "@/components/home/TaskRow";
import { cn } from "@/lib/utils";
import { createTask, deleteTask, updateTask } from "@/lib/actions/tasks";
import { Database } from "@/types/database.types";
import { TaskDateTimePicker } from "@/components/tasks/pickers/TaskDateTimePicker";
import { useRouter } from "next/navigation";

type Task = Database["public"]["Tables"]["tasks"]["Row"];

interface DayColumnProps {
  dayName: string;
  date: string; // Formato "DD/MM"
  dateObj?: Date; // Data completa para conversão ISO
  tasks: Task[];
  isToday?: boolean;
  workspaces?: { id: string; name: string }[];
}

export function DayColumn({
  dayName,
  date,
  dateObj,
  tasks,
  isToday,
  workspaces = [],
}: DayColumnProps) {
  const router = useRouter();
  const [quickAddValue, setQuickAddValue] = useState("");
  const [isQuickAddFocused, setIsQuickAddFocused] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedDateTime, setSelectedDateTime] = useState<Date | null>(null);

  /**
   * Processa texto e detecta se há múltiplas linhas (batch create)
   */
  const processBatchInput = (text: string): string[] => {
    if (!text.includes("\n") && !text.includes("\r")) {
      return [text.trim()].filter(Boolean);
    }

    const lines = text.split(/\r?\n/);
    
    // Função para limpar marcadores de lista
    const cleanListItem = (line: string): string => {
      let cleaned = line.trim();
      cleaned = cleaned.replace(/^[-*•]\s+/, ""); // Remove "- ", "* ", "• "
      cleaned = cleaned.replace(/^\d+\.\s+/, ""); // Remove "1. ", "2. ", etc.
      cleaned = cleaned.replace(/^[-\u2022\u2023\u25E6\u2043]\s+/, ""); // Remove outros bullets Unicode
      return cleaned.trim();
    };

    const cleanedLines = lines
      .map(cleanListItem)
      .filter((line) => line.length > 0);

    return cleanedLines;
  };

  const handleQuickAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedValue = quickAddValue; // Don't trim here to preserve line breaks
    if (!trimmedValue.trim()) return;

    // Processar input (detectar batch ou single)
    const tasksToCreate = processBatchInput(trimmedValue);

    if (tasksToCreate.length === 0) {
      setQuickAddValue("");
      return;
    }

    // Limite de segurança para criação em lote
    const HARD_LIMIT = 20;
    if (tasksToCreate.length > HARD_LIMIT) {
      const confirmed = window.confirm(
        `Você está prestes a criar ${tasksToCreate.length} tarefas de uma vez. O limite recomendado é ${HARD_LIMIT}. Deseja continuar?`
      );
      if (!confirmed) {
        return;
      }
    }

    // Limpar input imediatamente (Optimistic UI)
    setQuickAddValue("");
    
    // Criar tarefas no backend (batch create)
    setIsCreating(true);
    try {
      let dueDateISO: string | undefined = undefined;
      
      // Priorizar data/hora selecionada, senão usar dateObj padrão
      if (selectedDateTime) {
        dueDateISO = selectedDateTime.toISOString();
        console.log("Criando tarefa com data/hora selecionada:", dueDateISO, "Data original:", selectedDateTime);
      } else if (dateObj) {
        const dueDate = new Date(dateObj);
        dueDate.setHours(0, 0, 0, 0);
        dueDateISO = dueDate.toISOString();
        console.log("Criando tarefa com data padrão do dia:", dueDateISO);
      } else {
        console.log("Criando tarefa sem data");
      }

      // Criar todas as tarefas em paralelo usando Promise.all
      const createPromises = tasksToCreate.map((title) =>
        createTask({
          title,
          due_date: dueDateISO,
          workspace_id: null, // Tarefas do Quick Add são pessoais
          status: "todo",
          is_personal: true,
        })
      );
      
      // Limpar data/hora selecionada após criar
      setSelectedDateTime(null);

      const results = await Promise.all(createPromises);

      // Verificar se houve erros
      const errors = results.filter((result) => !result.success);
      if (errors.length > 0) {
        console.error("Erros ao criar tarefas:", errors);
        const authError = errors.find((e) => e.error === "Usuário não autenticado");
        if (authError) {
          router.push("/login");
        }
      }

      // Recarregar a página para mostrar as novas tarefas se pelo menos uma funcionou
      if (results.some((r) => r.success)) {
        router.refresh();
      }
    } catch (error) {
      console.error("Erro ao criar tarefas:", error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggle = async (id: string, checked: boolean) => {
      try {
          await updateTask({
              id,
              status: checked ? "done" : "todo"
          });
          router.refresh();
      } catch (error) {
          console.error("Erro ao atualizar status:", error);
      }
  };

  const handleDelete = async (id: string) => {
      if (!confirm("Tem certeza que deseja excluir esta tarefa?")) return;
      try {
          await deleteTask(id);
          router.refresh();
      } catch (error) {
          console.error("Erro ao excluir tarefa:", error);
      }
  };

  const handleEdit = async (id: string, newTitle: string) => {
      try {
          await updateTask({
              id,
              title: newTitle
          });
          router.refresh();
      } catch (error) {
          console.error("Erro ao editar tarefa:", error);
      }
  };

  const handleMoveToWorkspace = async (id: string, workspaceId: string) => {
      try {
          await updateTask({
              id,
              workspace_id: workspaceId,
              is_personal: false
          });
          router.refresh();
      } catch (error) {
          console.error("Erro ao mover tarefa:", error);
      }
  }

  // Função para verificar se a tarefa tem horário específico
  const hasSpecificTime = (task: Task): boolean => {
    if (!task.due_date) return false;
    const date = new Date(task.due_date);
    const hours = date.getHours();
    const minutes = date.getMinutes();
    return hours !== 0 || minutes !== 0;
  };

  // Função para ordenar tarefas: pessoais com horário > pessoais sem horário > workspace
  const sortedTasks = [...tasks].sort((a, b) => {
    const aIsPersonal = a.is_personal || !a.workspace_id;
    const bIsPersonal = b.is_personal || !b.workspace_id;
    const aHasTime = hasSpecificTime(a);
    const bHasTime = hasSpecificTime(b);

    // Tarefas pessoais com horário vêm primeiro
    if (aIsPersonal && aHasTime && !(bIsPersonal && bHasTime)) return -1;
    if (bIsPersonal && bHasTime && !(aIsPersonal && aHasTime)) return 1;

    // Se ambas são pessoais com horário, manter ordem original
    if (aIsPersonal && aHasTime && bIsPersonal && bHasTime) return 0;

    // Tarefas pessoais sem horário vêm depois das com horário, mas antes das de workspace
    if (aIsPersonal && !aHasTime && !bIsPersonal) return -1;
    if (bIsPersonal && !bHasTime && !aIsPersonal) return 1;

    // Se ambas são pessoais sem horário, manter ordem original
    if (aIsPersonal && !aHasTime && bIsPersonal && !bHasTime) return 0;

    // Tarefas de workspace vêm por último
    if (!aIsPersonal && !bIsPersonal) return 0;

    return 0;
  });

  // Determinar cor de fundo baseada no estado
  const bgColor = isToday ? "bg-green-50/20" : "bg-gray-50/50";

  return (
    <div
      className={cn(
        "h-[420px] rounded-xl flex flex-col relative overflow-hidden",
        isToday ? "border-2 border-green-500" : "border border-gray-200",
        bgColor
      )}
    >
      {/* Header - Flex None (Altura Fixa) */}
      <div className="flex-none p-5 pb-2">
        <h3 className="font-medium text-gray-900 text-sm">{dayName}</h3>
        <p className="text-xs text-gray-500 mt-0.5">{date}</p>
      </div>

      {/* Tasks List - Flex-1 (Ocupa espaço restante) com Scroll */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar min-h-0 flex flex-col px-3">
        <div className="flex-1">
          {sortedTasks.length > 0 ? (
            <div className="px-2 space-y-0"> 
              {sortedTasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  workspaces={workspaces}
                  onToggle={handleToggle}
                  onDelete={handleDelete}
                  onEdit={handleEdit}
                  onMoveToWorkspace={handleMoveToWorkspace}
                  onDateUpdate={() => router.refresh()}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-32 px-2">
              <FolderOpen className="w-12 h-12 text-gray-200 mb-2" />
              <p className="text-xs text-gray-400">Sem tarefas</p>
            </div>
          )}
        </div>

        {/* Quick Add Input - Integrado ao Scroll, estilo linha */}
        <div className="px-2 pb-2 mt-6">
          <form onSubmit={handleQuickAddSubmit}>
            <div
              className={cn(
                "relative py-2 border-b border-transparent hover:border-gray-200 transition-colors",
                isQuickAddFocused && "border-green-500"
              )}
            >
              <div className="flex items-center gap-2 pl-2">
                <div className="w-4 h-4 flex-shrink-0" />
                {/* Textarea para suportar múltiplas linhas ao colar */}
                <textarea
                  placeholder="+ Adicionar item..."
                  value={quickAddValue}
                  onChange={(e) => setQuickAddValue(e.target.value)}
                  onFocus={() => setIsQuickAddFocused(true)}
                  onBlur={() => setIsQuickAddFocused(false)}
                  onKeyDown={(e) => {
                    // Permitir Enter para enviar (se não for Shift+Enter)
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      // Disparar submit manualmente
                      const form = e.currentTarget.closest('form');
                      if (form) form.requestSubmit();
                    }
                  }}
                  disabled={isCreating}
                  rows={1}
                  className="text-sm h-8 flex-1 bg-transparent border-0 outline-none placeholder:text-gray-400 text-gray-700 focus:placeholder:text-gray-300 disabled:opacity-50 resize-none overflow-hidden py-1.5"
                  style={{ minHeight: '2rem' }}
                />
                {/* Date/Time Picker para tarefas pessoais */}
                <div className="flex-shrink-0">
                  <TaskDateTimePicker
                    date={selectedDateTime}
                    onSelect={setSelectedDateTime}
                    align="end"
                    side="top"
                  />
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
