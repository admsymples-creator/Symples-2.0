"use client";

import { useState, useEffect } from "react";
import { TaskWithDetails, createTask, updateTask } from "@/lib/actions/tasks";
import { Member } from "@/lib/actions/members";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface TaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  task?: TaskWithDetails; // Se fornecido, é modo de edição
  members: Member[];
}

export function TaskDialog({ open, onOpenChange, workspaceId, task, members }: TaskDialogProps) {
  const isEditing = !!task;
  const [isLoading, setIsLoading] = useState(false);

  // Form State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("todo");
  const [priority, setPriority] = useState("medium");
  const [assigneeId, setAssigneeId] = useState<string | undefined>(undefined);
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);

  // Reset form when dialog opens/closes or task changes
  useEffect(() => {
      if (open) {
          if (task) {
              setTitle(task.title);
              setDescription(task.description || "");
              setStatus(task.status || "todo");
              setPriority(task.priority || "medium");
              setAssigneeId(task.assignee_id || undefined);
              setDueDate(task.due_date ? new Date(task.due_date) : undefined);
          } else {
              setTitle("");
              setDescription("");
              setStatus("todo");
              setPriority("medium");
              setAssigneeId(undefined);
              setDueDate(undefined);
          }
      }
  }, [open, task]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;

    setIsLoading(true);
    try {
        const taskData = {
            title,
            description,
            status: status as any,
            priority: priority as any,
            assignee_id: assigneeId,
            due_date: dueDate ? dueDate.toISOString() : undefined,
        };

        if (isEditing && task) {
            await updateTask({ id: task.id, ...taskData });
            toast.success("Tarefa atualizada!");
        } else {
            await createTask({
                ...taskData,
                workspace_id: workspaceId,
            });
            toast.success("Tarefa criada!", {
                description: "Adicionada ao grupo Backlog.",
            });
        }
        onOpenChange(false);
    } catch (error) {
        toast.error("Erro ao salvar tarefa", { description: "Tente novamente." });
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Tarefa" : "Nova Tarefa"}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="grid gap-6 py-4">
          <div className="space-y-2">
             <Label htmlFor="title">Título da Tarefa</Label>
             <Input 
                id="title" 
                value={title} 
                onChange={(e) => setTitle(e.target.value)} 
                placeholder="Ex: Revisar contrato..."
                required
                className="font-medium text-lg"
             />
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-2">
                 <Label>Status</Label>
                 <Select value={status} onValueChange={setStatus}>
                     <SelectTrigger>
                         <SelectValue />
                     </SelectTrigger>
                     <SelectContent>
                         <SelectItem value="todo">A Fazer</SelectItem>
                         <SelectItem value="in_progress">Em Progresso</SelectItem>
                         <SelectItem value="done">Concluído</SelectItem>
                         <SelectItem value="archived">Arquivado</SelectItem>
                     </SelectContent>
                 </Select>
             </div>

             <div className="space-y-2">
                 <Label>Prioridade</Label>
                 <Select value={priority} onValueChange={setPriority}>
                     <SelectTrigger>
                         <SelectValue />
                     </SelectTrigger>
                     <SelectContent>
                         <SelectItem value="low">Baixa</SelectItem>
                         <SelectItem value="medium">Média</SelectItem>
                         <SelectItem value="high">Alta</SelectItem>
                         <SelectItem value="urgent">Urgente</SelectItem>
                     </SelectContent>
                 </Select>
             </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                  <Label>Responsável</Label>
                  <Select value={assigneeId || "unassigned"} onValueChange={(val) => setAssigneeId(val === "unassigned" ? undefined : val)}>
                      <SelectTrigger>
                          <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                          <SelectItem value="unassigned">Sem responsável</SelectItem>
                          {members.map((member) => (
                              <SelectItem key={member.user_id} value={member.user_id}>
                                  {member.profiles?.full_name || "Usuário"}
                              </SelectItem>
                          ))}
                      </SelectContent>
                  </Select>
              </div>

              <div className="space-y-2 flex flex-col">
                  <Label className="mb-1">Data de Entrega</Label>
                  <Popover>
                      <PopoverTrigger asChild>
                          <Button
                              variant={"outline"}
                              className={cn(
                                  "w-full justify-start text-left font-normal",
                                  !dueDate && "text-muted-foreground"
                              )}
                          >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {dueDate ? format(dueDate, "PPP", { locale: ptBR }) : <span>Selecione uma data</span>}
                          </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                          <Calendar
                              mode="single"
                              selected={dueDate}
                              onSelect={setDueDate}
                              initialFocus
                          />
                      </PopoverContent>
                  </Popover>
              </div>
          </div>

          <div className="space-y-2">
             <Label htmlFor="description">Descrição</Label>
             <Textarea 
                id="description" 
                value={description} 
                onChange={(e) => setDescription(e.target.value)} 
                placeholder="Detalhes adicionais..." 
                className="min-h-[100px]"
             />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
                {isLoading ? "Salvando..." : (isEditing ? "Salvar Alterações" : "Criar Tarefa")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
