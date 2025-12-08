"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { FolderOpen, Plus, Calendar as CalendarIcon } from "lucide-react";
import { TaskRow } from "@/components/home/TaskRow";
import { cn } from "@/lib/utils";
import { createTask, deleteTask, updateTask } from "@/lib/actions/tasks";
import { Database } from "@/types/database.types";
import { TaskDateTimePicker } from "@/components/tasks/pickers/TaskDateTimePicker";
import { useRouter } from "next/navigation";
import { toast } from "sonner"; 

type Task = Database["public"]["Tables"]["tasks"]["Row"];

interface DayColumnProps {
  dayName: string;
  date: string; 
  dateObj?: Date;
  tasks: Task[];
  isToday?: boolean;
  workspaces?: { id: string; name: string }[];
  highlightInput?: boolean;
}

export function DayColumn({
  dayName,
  date,
  dateObj,
  tasks,
  isToday,
  workspaces = [],
  highlightInput = false,
}: DayColumnProps) {
  const router = useRouter();
  const [quickAddValue, setQuickAddValue] = useState("");
  const [isQuickAddFocused, setIsQuickAddFocused] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedDateTime, setSelectedDateTime] = useState<Date | null>(null);
  const [showTutorialHint, setShowTutorialHint] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (highlightInput && isToday && inputRef.current) {
      setShowTutorialHint(true);
      setTimeout(() => {
        inputRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'nearest'
        });
      }, 300);
    }
  }, [highlightInput, isToday]);

  const handleInputFocus = () => {
    setIsQuickAddFocused(true);
    if (showTutorialHint) setShowTutorialHint(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setQuickAddValue(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
    
    if (showTutorialHint && e.target.value.trim().length > 0) {
      setShowTutorialHint(false);
    }
  };

  const processBatchInput = (text: string): string[] => {
    if (!text.includes("\n") && !text.includes("\r")) return [text.trim()].filter(Boolean);
    return text.split(/\r?\n/)
      .map(line => line.replace(/^[-*•]\s+/, "").replace(/^\d+\.\s+/, "").trim())
      .filter(line => line.length > 0);
  };

  const sortedTasks = useMemo(() => {
    const hasSpecificTime = (task: Task) => {
      if (!task.due_date) return false;
      const d = new Date(task.due_date);
      return d.getHours() !== 0 || d.getMinutes() !== 0;
    };

    return [...tasks].sort((a, b) => {
      const aIsPersonal = a.is_personal || !a.workspace_id;
      const bIsPersonal = b.is_personal || !b.workspace_id;
      const aHasTime = hasSpecificTime(a);
      const bHasTime = hasSpecificTime(b);

      if (aIsPersonal && aHasTime && !(bIsPersonal && bHasTime)) return -1;
      if (bIsPersonal && bHasTime && !(aIsPersonal && aHasTime)) return 1;
      if (aIsPersonal && !aHasTime && !bIsPersonal) return -1;
      if (bIsPersonal && !bHasTime && !aIsPersonal) return 1;
      if (!aIsPersonal && !bIsPersonal) return 0;
      return 0;
    });
  }, [tasks]);

  const pendingCount = useMemo(() => 
    tasks.filter(t => t.status !== 'done').length, 
  [tasks]);

  const handleQuickAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const rawValue = quickAddValue;
    if (!rawValue.trim()) return;

    const tasksToCreate = processBatchInput(rawValue);
    if (tasksToCreate.length === 0) return;

    setQuickAddValue("");
    if (inputRef.current) inputRef.current.style.height = 'auto';
    setIsCreating(true);

    try {
      let dueDateISO: string | undefined = undefined;
      if (selectedDateTime) {
        dueDateISO = selectedDateTime.toISOString();
      } else if (dateObj) {
        const d = new Date(dateObj);
        d.setHours(0, 0, 0, 0);
        dueDateISO = d.toISOString();
      }

      const createPromises = tasksToCreate.map((title) =>
        createTask({
          title,
          due_date: dueDateISO,
          workspace_id: null,
          status: "todo",
          is_personal: true,
        })
      );

      setSelectedDateTime(null);
      const results = await Promise.all(createPromises);
      
      if (results.some((r) => r.success)) router.refresh();
      else throw new Error("Falha ao criar");

    } catch (error) {
      toast.error("Erro ao criar tarefa");
      setQuickAddValue(rawValue);
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggle = async (id: string, checked: boolean) => {
    await updateTask({ id, status: checked ? "done" : "todo" });
    router.refresh();
  };
  const handleDelete = async (id: string) => {
    if(confirm("Excluir?")) { await deleteTask(id); router.refresh(); }
  };
  const handleEdit = async (id: string, title: string) => {
    await updateTask({ id, title });
    router.refresh();
  };
  const handleMove = async (id: string, wid: string) => {
    await updateTask({ id, workspace_id: wid, is_personal: false });
    router.refresh();
  };

  return (
    <div
      className={cn(
        "group/column flex flex-col h-full min-h-[500px] max-h-[80vh] rounded-2xl transition-all duration-300",
        isToday 
          ? "bg-gradient-to-b from-gray-50/80 to-white border border-gray-300 shadow-md" 
          : "bg-surface border border-gray-100 hover:border-gray-200 hover:bg-gray-50/50"
      )}
    >
      {/* --- HEADER --- */}
      <div className={cn(
        "flex-none p-4 border-b border-transparent transition-colors",
        isToday ? "border-gray-200" : "group-hover/column:border-gray-100"
      )}>
        <div className="flex items-center justify-between mb-1">
          <span className={cn(
            "text-[10px] font-bold uppercase tracking-wider",
            isToday ? "text-gray-900" : "text-gray-500"
          )}>
            {dayName}
          </span>
          {pendingCount > 0 && (
            <span className={cn(
              "text-[10px] font-medium px-2 py-0.5 rounded-full",
              isToday ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-500"
            )}>
              {pendingCount}
            </span>
          )}
        </div>
        <div className={cn(
          "text-lg font-semibold tracking-tight",
          isToday ? "text-gray-900" : "text-gray-700"
        )}>
          {date}
        </div>
      </div>

      {/* --- TASK LIST (SCROLL AREA) --- */}
      <div 
        className={cn(
          "flex-1 px-2 py-2 relative flex flex-col",
          // CORREÇÃO: Scroll apenas se houver itens. Hidden se vazio para travar o layout.
          sortedTasks.length > 0 
            ? "overflow-y-auto overflow-x-hidden custom-scrollbar" 
            : "overflow-hidden"
        )}
      >
        {sortedTasks.length > 0 ? (
          <>
            {/* CORREÇÃO: Gap reduzido para space-y-0.5 (2px) para maior densidade */}
            <div className="space-y-0.5">
              {sortedTasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  workspaces={workspaces}
                  onToggle={handleToggle}
                  onDelete={handleDelete}
                  onEdit={handleEdit}
                  onMoveToWorkspace={handleMove}
                  onDateUpdate={() => router.refresh()}
                />
              ))}
            </div>
            <div className="h-16 shrink-0" />
          </>
        ) : (
          /* Empty State Centralizado sem Scroll */
          <div className="flex-1 flex flex-col items-center justify-center text-center p-4 opacity-0 group-hover/column:opacity-100 transition-opacity duration-300">
            <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center mb-2">
              <FolderOpen className="w-4 h-4 text-gray-300" />
            </div>
            <p className="text-xs font-medium text-gray-400">Vazio</p>
          </div>
        )}
      </div>

      {/* --- FOOTER / INPUT AREA --- */}
      <div className="flex-none px-3 pb-3 pt-2 relative">
        <div className="absolute -top-8 left-0 right-0 h-8 bg-gradient-to-t from-white to-transparent pointer-events-none" />
        
        <form onSubmit={handleQuickAddSubmit} className="relative z-10">
          <div
            className={cn(
              "flex flex-col bg-white rounded-xl border shadow-sm transition-all duration-200 overflow-hidden",
              isQuickAddFocused 
                ? "border-gray-400 ring-4 ring-gray-100 shadow-md transform -translate-y-1" 
                : "border-gray-200 hover:border-gray-300"
            )}
          >
            {highlightInput && isToday && !isQuickAddFocused && (
              <div 
                className="absolute inset-0 z-0 animate-pulse pointer-events-none rounded-xl" 
                style={{ backgroundColor: 'rgba(0,0,0,0.03)' }}
              />
            )}

            <div className="flex items-start gap-2 p-2">
              <div className="mt-1.5 ml-1">
                {isQuickAddFocused ? (
                  <div className="w-2 h-2 bg-gray-900 rounded-full animate-pulse" />
                ) : (
                  <Plus className="w-4 h-4 text-gray-400" />
                )}
              </div>
              
              <textarea
                ref={inputRef}
                placeholder="Nova tarefa..."
                value={quickAddValue}
                onChange={handleInputChange}
                onFocus={handleInputFocus}
                onBlur={() => setIsQuickAddFocused(false)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    e.currentTarget.form?.requestSubmit();
                  }
                }}
                disabled={isCreating}
                rows={1}
                className="flex-1 bg-transparent border-none outline-none text-sm text-gray-800 placeholder:text-gray-400 resize-none py-1 min-h-[24px] max-h-[120px]"
              />
            </div>

            {(isQuickAddFocused || quickAddValue) && (
              <div className="flex items-center justify-between px-3 pb-2 pt-1 border-t border-gray-50 bg-gray-50/50">
                <div className="flex items-center gap-1">
                  <TaskDateTimePicker
                    date={selectedDateTime}
                    onSelect={setSelectedDateTime}
                    align="start"
                    side="top"
                    trigger={
                      <button type="button" className={cn(
                        "p-1.5 rounded-md hover:bg-gray-200 transition-colors flex items-center gap-1.5 text-xs font-medium",
                        selectedDateTime ? "bg-gray-900 text-white" : "text-gray-500"
                      )}>
                        <CalendarIcon className="w-3.5 h-3.5" />
                        {selectedDateTime ? "Data definida" : "Agendar"}
                      </button>
                    }
                  />
                </div>
                
                <div className="text-[10px] text-gray-400 font-medium">
                  ENTER para salvar
                </div>
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}