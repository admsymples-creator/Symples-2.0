"use client";

import * as React from "react";
import { Check, X, Calendar, User, Tag, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface TaskConfirmationCardProps {
  initialData: {
    title: string;
    description?: string;
    dueDate?: string | null;
    assigneeId?: string | null;
    priority?: "low" | "medium" | "high" | "urgent";
    tags?: string[];
  };
  members?: Array<{ id: string; name: string; avatar?: string }>;
  onConfirm: (data: {
    title: string;
    description?: string;
    dueDate?: string | null;
    assigneeId?: string | null;
    priority?: "low" | "medium" | "high" | "urgent";
    tags?: string[];
  }) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function TaskConfirmationCard({
  initialData,
  members = [],
  onConfirm,
  onCancel,
  isLoading = false,
}: TaskConfirmationCardProps) {
  const [title, setTitle] = React.useState(initialData.title);
  const [description, setDescription] = React.useState(initialData.description || "");
  const [dueDate, setDueDate] = React.useState<Date | null>(
    initialData.dueDate ? new Date(initialData.dueDate) : null
  );
  const [assigneeId, setAssigneeId] = React.useState<string | null>(
    initialData.assigneeId || null
  );
  const [priority, setPriority] = React.useState<"low" | "medium" | "high" | "urgent">(
    initialData.priority || "medium"
  );
  const [tags, setTags] = React.useState<string[]>(initialData.tags || []);
  const [newTag, setNewTag] = React.useState("");

  const [isDateOpen, setIsDateOpen] = React.useState(false);
  const [isAssigneeOpen, setIsAssigneeOpen] = React.useState(false);

  const selectedAssignee = members.find((m) => m.id === assigneeId);

  const priorityColors = {
    low: "bg-blue-100 text-blue-700",
    medium: "bg-gray-100 text-gray-700",
    high: "bg-orange-100 text-orange-700",
    urgent: "bg-red-100 text-red-700",
  };

  const priorityLabels = {
    low: "Baixa",
    medium: "Média",
    high: "Alta",
    urgent: "Urgente",
  };

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  const handleConfirm = () => {
    onConfirm({
      title,
      description: description || undefined,
      dueDate: dueDate ? dueDate.toISOString() : null,
      assigneeId,
      priority,
      tags,
    });
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-semibold text-slate-900 flex items-center gap-2">
          <FileText className="w-4 h-4 text-green-600" />
          Confirmar criação de tarefa
        </h4>
      </div>

      {/* Título */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-slate-700">Título *</label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Título da tarefa"
          className="h-9"
          disabled={isLoading}
        />
      </div>

      {/* Descrição */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-slate-700">Descrição</label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Adicione uma descrição (opcional)"
          className="min-h-[60px] resize-none"
          disabled={isLoading}
        />
      </div>

      {/* Data de vencimento e Responsável */}
      <div className="grid grid-cols-2 gap-3">
        {/* Data */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-700">Data</label>
          <Popover open={isDateOpen} onOpenChange={setIsDateOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "w-full justify-start text-left font-normal h-9",
                  !dueDate && "text-slate-500"
                )}
                disabled={isLoading}
              >
                <Calendar className="mr-2 h-4 w-4" />
                {dueDate ? (
                  format(dueDate, "PPP", { locale: ptBR })
                ) : (
                  <span>Selecionar data</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={dueDate || undefined}
                onSelect={(date) => {
                  setDueDate(date || null);
                  setIsDateOpen(false);
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Responsável */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-700">Responsável</label>
          <Popover open={isAssigneeOpen} onOpenChange={setIsAssigneeOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "w-full justify-start text-left font-normal h-9",
                  !assigneeId && "text-slate-500"
                )}
                disabled={isLoading}
              >
                <User className="mr-2 h-4 w-4" />
                {selectedAssignee ? selectedAssignee.name : "Selecionar"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0" align="start">
              <Command>
                <CommandInput placeholder="Buscar membro..." />
                <CommandList>
                  <CommandEmpty>Nenhum membro encontrado.</CommandEmpty>
                  <CommandGroup>
                    <CommandItem
                      onSelect={() => {
                        setAssigneeId(null);
                        setIsAssigneeOpen(false);
                      }}
                    >
                      <span className="text-slate-500">Nenhum</span>
                    </CommandItem>
                    {members.map((member) => (
                      <CommandItem
                        key={member.id}
                        onSelect={() => {
                          setAssigneeId(member.id);
                          setIsAssigneeOpen(false);
                        }}
                      >
                        {member.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Prioridade */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-slate-700">Prioridade</label>
        <div className="flex gap-2">
          {(["low", "medium", "high", "urgent"] as const).map((p) => (
            <Button
              key={p}
              variant={priority === p ? "default" : "outline"}
              size="sm"
              onClick={() => setPriority(p)}
              className={cn(
                "flex-1 h-8 text-xs",
                priority === p && priorityColors[p]
              )}
              disabled={isLoading}
            >
              {priorityLabels[p]}
            </Button>
          ))}
        </div>
      </div>

      {/* Tags */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-slate-700">Tags</label>
        <div className="flex flex-wrap gap-2 mb-2">
          {tags.map((tag) => (
            <Badge
              key={tag}
              variant="secondary"
              className="flex items-center gap-1"
            >
              {tag}
              <button
                onClick={() => handleRemoveTag(tag)}
                className="ml-1 hover:text-red-600"
                disabled={isLoading}
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddTag();
              }
            }}
            placeholder="Adicionar tag"
            className="h-8 text-xs"
            disabled={isLoading}
          />
          <Button
            size="sm"
            variant="outline"
            onClick={handleAddTag}
            disabled={isLoading || !newTag.trim()}
            className="h-8"
          >
            <Tag className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Ações */}
      <div className="flex gap-2 pt-2 border-t border-slate-100">
        <Button
          variant="outline"
          size="sm"
          onClick={onCancel}
          disabled={isLoading}
          className="flex-1"
        >
          <X className="w-4 h-4 mr-2" />
          Cancelar
        </Button>
        <Button
          size="sm"
          onClick={handleConfirm}
          disabled={isLoading || !title.trim()}
          className="flex-1 bg-green-600 hover:bg-green-700 text-white"
        >
          <Check className="w-4 h-4 mr-2" />
          {isLoading ? "Criando..." : "Confirmar"}
        </Button>
      </div>
    </div>
  );
}
