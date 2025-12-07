"use client";

import * as React from "react";
import { 
  Calendar as CalendarIcon,
  User,
  Check,
  X,
  ChevronDown,
  Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { TASK_CONFIG, mapLabelToStatus, ORDERED_STATUSES } from "@/lib/config/tasks";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Avatar } from "@/components/tasks/Avatar";

interface KanbanConfirmationCardProps {
  initialData: {
    title: string;
    description?: string;
    dueDate?: string | null;
    assigneeId?: string | null;
    priority?: "low" | "medium" | "high" | "urgent";
    status?: "todo" | "in_progress" | "done";
    workspaceId?: string;
  };
  members?: Array<{ id: string; name: string; avatar?: string }>;
  workspaces?: Array<{ id: string; name: string; slug?: string; logo_url?: string | null }>;
  onConfirm: (data: {
    title: string;
    description?: string;
    dueDate?: string | null;
    assigneeId?: string | null;
    priority?: "low" | "medium" | "high" | "urgent";
    status?: "todo" | "in_progress" | "done";
    workspaceId?: string | null;
  }) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function KanbanConfirmationCard({
  initialData,
  members = [],
  workspaces = [],
  onConfirm,
  onCancel,
  isLoading = false,
}: KanbanConfirmationCardProps) {
  const [title, setTitle] = React.useState(initialData.title);
  const [description, setDescription] = React.useState(initialData.description || "");
  const [dueDate, setDueDate] = React.useState<Date | null>(
    initialData.dueDate ? new Date(initialData.dueDate) : null
  );
  const [assigneeId, setAssigneeId] = React.useState<string | null>(
    initialData.assigneeId || null
  );
  const [workspaceId, setWorkspaceId] = React.useState<string | null>(
    initialData.workspaceId || null
  );
  const [priority, setPriority] = React.useState<"low" | "medium" | "high" | "urgent">(
    initialData.priority || "medium"
  );
  const [status, setStatus] = React.useState<"todo" | "in_progress" | "done">(
    initialData.status || "todo"
  );
  const [isEditingTitle, setIsEditingTitle] = React.useState(false);
  const [isEditingDescription, setIsEditingDescription] = React.useState(false);

  const [isDateOpen, setIsDateOpen] = React.useState(false);
  const [isAssigneeOpen, setIsAssigneeOpen] = React.useState(false);
  const [isWorkspaceOpen, setIsWorkspaceOpen] = React.useState(false);
  const [isStatusOpen, setIsStatusOpen] = React.useState(false);

  const titleInputRef = React.useRef<HTMLInputElement>(null);
  const descriptionTextareaRef = React.useRef<HTMLTextAreaElement>(null);

  const selectedAssignee = members.find((m) => m.id === assigneeId);
  const selectedWorkspace = workspaces.find((w) => w.id === workspaceId);
  const dbStatus = mapLabelToStatus(TASK_CONFIG[status]?.label || "A fazer");
  const statusConfig = TASK_CONFIG[status] || TASK_CONFIG.todo;

  const isOverdue = dueDate && new Date(dueDate) < new Date();
  const isToday = dueDate && new Date(dueDate).toDateString() === new Date().toDateString();

  React.useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditingTitle]);

  React.useEffect(() => {
    if (isEditingDescription && descriptionTextareaRef.current) {
      descriptionTextareaRef.current.focus();
    }
  }, [isEditingDescription]);

  const handleConfirm = () => {
    onConfirm({
      title,
      description: description || undefined,
      dueDate: dueDate ? dueDate.toISOString() : null,
      assigneeId,
      workspaceId,
      priority,
      status,
    });
  };

  const handleStatusUpdate = (statusLabel: string) => {
    const statusKey = ORDERED_STATUSES.find(
      (key) => TASK_CONFIG[key].label === statusLabel
    );
    if (statusKey) {
      setStatus(statusKey as "todo" | "in_progress" | "done");
    }
    setIsStatusOpen(false);
  };

  return (
    <div className="group bg-white rounded-xl p-3 border border-gray-200 shadow-sm w-full relative flex flex-col min-h-[112px]">
      {/* Botões de Ação (Absoluto) */}
      <div className="absolute top-2 right-2 flex items-center gap-1 z-30">
        <Button
          size="icon"
          variant="ghost"
          onClick={onCancel}
          disabled={isLoading}
          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
          title="Cancelar"
        >
          <X className="w-3 h-3" />
        </Button>
      </div>

      {/* Header: Status com edição rápida */}
      <div className="flex items-center justify-between mb-2">
        <Popover open={isStatusOpen} onOpenChange={setIsStatusOpen}>
          <PopoverTrigger asChild>
            <Badge
              variant="outline"
              className={cn(
                "text-[10px] px-2 py-0.5 h-5 font-medium cursor-pointer hover:bg-gray-50 transition-colors",
                statusConfig.lightColor
              )}
            >
              <div className={cn("w-1.5 h-1.5 rounded-full mr-1.5", statusConfig.color.replace("fill-", "bg-"))} />
              {statusConfig.label}
              <ChevronDown className="w-3 h-3 ml-1 opacity-50" />
            </Badge>
          </PopoverTrigger>
          <PopoverContent className="p-0 w-48" align="start">
            <Command>
              <CommandList>
                <CommandGroup>
                  {ORDERED_STATUSES.map((statusKey) => {
                    const config = TASK_CONFIG[statusKey];
                    const isSelected = status === statusKey;
                    return (
                      <CommandItem
                        key={statusKey}
                        onSelect={() => handleStatusUpdate(config.label)}
                        className={cn(
                          "text-xs cursor-pointer",
                          isSelected && "bg-gray-100"
                        )}
                      >
                        <div className={cn("w-1.5 h-1.5 rounded-full mr-2", config.color.replace("fill-", "bg-"))} />
                        {config.label}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {/* Body: Título */}
      <div className="mb-3 flex-1 flex flex-col min-h-0">
        {isEditingTitle ? (
          <Input
            ref={titleInputRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                setIsEditingTitle(false);
              } else if (e.key === "Escape") {
                e.preventDefault();
                setTitle(initialData.title);
                setIsEditingTitle(false);
              }
            }}
            onBlur={() => setIsEditingTitle(false)}
            className={cn(
              "font-semibold text-gray-800 text-sm mb-2 leading-snug",
              "border border-gray-300 focus-visible:ring-2 focus-visible:ring-gray-200",
              "px-2 py-1 rounded"
            )}
          />
        ) : (
          <h4
            className={cn(
              "font-semibold text-gray-800 text-sm mb-2 leading-snug line-clamp-3 transition-colors",
              "cursor-text hover:bg-gray-50 rounded px-1 -mx-1"
            )}
            onClick={() => setIsEditingTitle(true)}
          >
            {title}
          </h4>
        )}

        {/* Descrição */}
        {isEditingDescription ? (
          <Textarea
            ref={descriptionTextareaRef}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault();
                setDescription(initialData.description || "");
                setIsEditingDescription(false);
              }
            }}
            onBlur={() => setIsEditingDescription(false)}
            placeholder="Adicionar descrição..."
            className="text-xs text-gray-600 min-h-[40px] resize-none mb-2"
          />
        ) : (
          <p
            className={cn(
              "text-xs text-gray-600 mb-2 cursor-text hover:bg-gray-50 rounded px-1 -mx-1 py-0.5",
              !description && "text-gray-400 italic"
            )}
            onClick={() => setIsEditingDescription(true)}
          >
            {description || "Clique para adicionar descrição..."}
          </p>
        )}
      </div>

      {/* Footer: Meta & Ações */}
      <div className="mt-auto pt-3 border-t border-gray-50 flex justify-between items-center">
        {/* Lado Esquerdo: Data & Assignee */}
        <div className="flex items-center gap-2">
          {/* Data Picker */}
          <Popover open={isDateOpen} onOpenChange={setIsDateOpen}>
            <PopoverTrigger asChild>
              <div className="flex items-center gap-1.5 cursor-pointer hover:bg-gray-50 rounded px-1 -ml-1 transition-colors">
                {dueDate ? (
                  <>
                    <CalendarIcon className={cn("w-3.5 h-3.5", isOverdue ? "text-red-600" : isToday ? "text-green-600" : "text-gray-400")} />
                    <span className={cn("text-xs font-medium", 
                      isOverdue ? "text-red-600 bg-red-50 px-1.5 py-0.5 rounded" : 
                      isToday ? "text-green-600" : "text-gray-500"
                    )}>
                      {format(new Date(dueDate), "dd MMM", { locale: ptBR })}
                    </span>
                  </>
                ) : (
                  <span className="text-xs text-gray-400 flex items-center gap-1 hover:text-gray-600">
                    <CalendarIcon className="w-3.5 h-3.5" />
                  </span>
                )}
              </div>
            </PopoverTrigger>
            <PopoverContent className="p-0 w-auto" align="start">
              <Calendar
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

          {/* Assignee Picker */}
          <Popover open={isAssigneeOpen} onOpenChange={setIsAssigneeOpen}>
            <PopoverTrigger asChild>
              <div className="flex items-center gap-1.5 cursor-pointer hover:bg-gray-50 rounded px-1 transition-colors">
                {selectedAssignee ? (
                  <Avatar 
                    name={selectedAssignee.name} 
                    avatar={selectedAssignee.avatar} 
                    size="sm" 
                    className="w-3.5 h-3.5 text-[10px]" 
                  />
                ) : (
                  <User className="w-3.5 h-3.5 text-gray-400" />
                )}
              </div>
            </PopoverTrigger>
            <PopoverContent className="p-0 w-[200px]" align="start">
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
                        <Avatar name={member.name} avatar={member.avatar} size="xs" className="mr-2" />
                        {member.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          {/* Workspace Picker */}
          {workspaces.length > 0 && (
            <Popover open={isWorkspaceOpen} onOpenChange={setIsWorkspaceOpen}>
              <PopoverTrigger asChild>
                <div className="flex items-center gap-1.5 cursor-pointer hover:bg-gray-50 rounded px-1 transition-colors">
                  {selectedWorkspace ? (
                    <div className="flex items-center gap-1.5">
                      {selectedWorkspace.logo_url ? (
                        <img 
                          src={selectedWorkspace.logo_url} 
                          alt={selectedWorkspace.name}
                          className="w-4 h-4 rounded"
                        />
                      ) : (
                        <Building2 className="w-3.5 h-3.5 text-gray-400" />
                      )}
                      <span className="text-xs text-gray-600 max-w-[80px] truncate">
                        {selectedWorkspace.name}
                      </span>
                    </div>
                  ) : (
                    <Building2 className="w-3.5 h-3.5 text-gray-400" />
                  )}
                </div>
              </PopoverTrigger>
              <PopoverContent className="p-0 w-[200px]" align="start">
                <Command>
                  <CommandInput placeholder="Buscar workspace..." />
                  <CommandList>
                    <CommandEmpty>Nenhum workspace encontrado.</CommandEmpty>
                    <CommandGroup>
                      {workspaces.map((workspace) => (
                        <CommandItem
                          key={workspace.id}
                          onSelect={() => {
                            setWorkspaceId(workspace.id);
                            setIsWorkspaceOpen(false);
                          }}
                          className={cn(
                            workspaceId === workspace.id && "bg-gray-100"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            {workspace.logo_url ? (
                              <img 
                                src={workspace.logo_url} 
                                alt={workspace.name}
                                className="w-4 h-4 rounded"
                              />
                            ) : (
                              <Building2 className="w-4 h-4 text-gray-400" />
                            )}
                            <span className="text-sm">{workspace.name}</span>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          )}
        </div>

        {/* Lado Direito: Botões de Ação */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
            className="h-7 text-xs"
          >
            <X className="w-3 h-3 mr-1" />
            Cancelar
          </Button>
          <Button
            size="sm"
            onClick={handleConfirm}
            disabled={isLoading || !title.trim()}
            className="h-7 text-xs bg-green-600 hover:bg-green-700 text-white"
          >
            <Check className="w-3 h-3 mr-1" />
            {isLoading ? "Criando..." : "Confirmar"}
          </Button>
        </div>
      </div>
    </div>
  );
}
