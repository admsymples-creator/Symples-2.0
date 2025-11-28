"use client";

import { useState } from "react";
import { FolderOpen } from "lucide-react";
import { TaskRow } from "@/components/home/TaskRow";
import { cn } from "@/lib/utils";
import { createTask } from "@/app/actions/tasks";
import { Database } from "@/types/database.types";

type Task = Database["public"]["Tables"]["tasks"]["Row"];

interface DayColumnProps {
  dayName: string;
  date: string; // Formato "DD/MM"
  dateObj?: Date; // Data completa para conversão ISO
  tasks: Task[];
  isToday?: boolean;
}

import { useRouter } from "next/navigation";

export function DayColumn({
  dayName,
  date,
  dateObj,
  tasks,
  isToday,
}: DayColumnProps) {
  const router = useRouter();
  const [quickAddValue, setQuickAddValue] = useState("");
  const [isQuickAddFocused, setIsQuickAddFocused] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const handleQuickAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = quickAddValue.trim();
    if (!title) return;

    // Limpar input imediatamente (Optimistic UI)
    setQuickAddValue("");

    // Criar tarefa no backend
    setIsCreating(true);
    try {
      // Converter data para ISO se dateObj estiver disponível
      let dueDateISO: string | undefined = undefined;
      if (dateObj) {
        // Criar uma data com horário no início do dia (00:00:00)
        const dueDate = new Date(dateObj);
        dueDate.setHours(0, 0, 0, 0);
        dueDateISO = dueDate.toISOString();
      }

      const result = await createTask({
        title,
        due_date: dueDateISO,
        workspace_id: null, // Tarefas do Quick Add são pessoais
        status: "todo",
        is_personal: true,
      });

      if (!result.success) {
        console.error("Erro ao criar tarefa:", result.error);
        if (result.error === "Usuário não autenticado") {
           router.push("/login");
        }
        // Em produção, você pode mostrar um toast de erro aqui
      } else {
        // Recarregar a página para mostrar a nova tarefa
        router.refresh();
      }
    } catch (error) {
      console.error("Erro ao criar tarefa:", error);
    } finally {
      setIsCreating(false);
    }
  };

  // Determinar cor de fundo baseada no estado
  const bgColor = isToday ? "bg-green-50/20" : "bg-gray-50/50";

  return (
    <div
      className={cn(
        "h-[600px] rounded-xl flex flex-col relative overflow-hidden",
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
      <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0 flex flex-col px-3">
        <div className="flex-1">
          {tasks.length > 0 ? (
            <div className="px-2">
              {tasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
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
              <div className="flex items-center gap-3 pl-2">
                <div className="w-4 h-4 flex-shrink-0" />
                <input
                  type="text"
                  placeholder="+ Adicionar item..."
                  value={quickAddValue}
                  onChange={(e) => setQuickAddValue(e.target.value)}
                  onFocus={() => setIsQuickAddFocused(true)}
                  onBlur={() => setIsQuickAddFocused(false)}
                  disabled={isCreating}
                  className="text-sm h-8 flex-1 bg-transparent border-0 outline-none placeholder:text-gray-400 text-gray-700 focus:placeholder:text-gray-300 disabled:opacity-50"
                />
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
