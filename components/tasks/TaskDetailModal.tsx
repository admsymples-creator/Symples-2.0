"use client";

import { useState } from "react";
import {
    Dialog,
    DialogHeader,
    DialogPortal,
    DialogOverlay,
    DialogTitle,
} from "@/components/ui/dialog";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    X,
    Maximize2,
    MoreVertical,
    ChevronRight,
    Play,
    MessageSquare,
    Calendar,
    User,
    Plus,
    Send,
    Pencil,
    Bold,
    Italic,
    List,
    Link as LinkIcon,
    Paperclip,
    UploadCloud,
    FileImage,
    FileText,
    Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SubTask {
    id: string;
    title: string;
    completed: boolean;
}

interface Activity {
    id: string;
    type: "created" | "commented" | "updated" | "file_shared";
    user: string;
    message?: string;
    timestamp: string;
    file?: {
        name: string;
        type: "image" | "pdf" | "other";
        size: string;
    };
}

interface TaskDetailModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    task?: {
        id: string;
        title: string;
        description: string;
        status: "todo" | "in_progress" | "done";
        assignee?: {
            name: string;
            avatar?: string;
        };
        dueDate?: string;
        breadcrumbs: string[];
        contextMessage?: {
            type: "audio" | "text";
            content: string;
            timestamp: string;
        };
        subTasks: SubTask[];
        activities: Activity[];
    };
}

interface FileAttachment {
    id: string;
    name: string;
    type: "image" | "pdf" | "other";
    size: string;
}

export function TaskDetailModal({ open, onOpenChange, task }: TaskDetailModalProps) {
    const [title, setTitle] = useState(task?.title || "");
    const [description, setDescription] = useState(task?.description || "");
    const [status, setStatus] = useState<"todo" | "in_progress" | "done">(task?.status || "todo");
    const [dueDate, setDueDate] = useState(task?.dueDate || "");
    const [subTasks, setSubTasks] = useState<SubTask[]>(task?.subTasks || []);
    const [newSubTask, setNewSubTask] = useState("");
    const [comment, setComment] = useState("");
    const [attachments, setAttachments] = useState<FileAttachment[]>([
        { id: "1", name: "mockup-design.png", type: "image", size: "2.4 MB" },
        { id: "2", name: "referencias.pdf", type: "pdf", size: "1.8 MB" },
    ]);

    const handleAddSubTask = () => {
        if (newSubTask.trim()) {
            setSubTasks([
                ...subTasks,
                {
                    id: `subtask-${Date.now()}`,
                    title: newSubTask,
                    completed: false,
                },
            ]);
            setNewSubTask("");
        }
    };

    const handleToggleSubTask = (id: string) => {
        setSubTasks(
            subTasks.map((st) =>
                st.id === id ? { ...st, completed: !st.completed } : st
            )
        );
    };

    const handleSendComment = () => {
        if (comment.trim()) {
            // Aqui você adicionaria o comentário ao histórico
            setComment("");
        }
    };

    if (!task) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogPortal>
                <DialogOverlay className="bg-black/50" />
                <DialogPrimitive.Content
                    className="fixed left-[50%] top-[50%] z-50 w-[90vw] max-w-6xl h-[80vh] translate-x-[-50%] translate-y-[-50%] rounded-xl border bg-background shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] p-0 flex flex-col overflow-hidden"
                >
                {/* DialogTitle para acessibilidade (oculto visualmente) */}
                <DialogTitle className="sr-only">
                    Detalhes da Tarefa: {task.title}
                </DialogTitle>
                
                {/* Header */}
                <DialogHeader className="px-6 py-4 border-b border-gray-100">
                    <div className="flex items-center justify-between">
                        {/* Breadcrumbs */}
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                            {task.breadcrumbs.map((crumb, index) => (
                                <div key={index} className="flex items-center gap-2">
                                    <span>{crumb}</span>
                                    {index < task.breadcrumbs.length - 1 && (
                                        <ChevronRight className="w-4 h-4 text-gray-400" />
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Botões de Ação */}
                        <div className="flex items-center gap-2">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => {}}
                            >
                                <Maximize2 className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => {}}
                            >
                                <MoreVertical className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => onOpenChange(false)}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </DialogHeader>

                {/* Corpo - Grid 2 Colunas */}
                <div className="flex-1 grid md:grid-cols-[1.5fr_1fr] overflow-hidden">
                    {/* Coluna Esquerda - Editor */}
                    <div className="border-r border-gray-100 p-6 overflow-y-auto custom-scrollbar">
                        {/* Título */}
                        <div className="group relative mb-6">
                            <Input
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="text-4xl font-bold border-0 p-0 pr-8 focus-visible:ring-0 focus-visible:ring-offset-0 hover:border-b hover:border-gray-300 transition-colors bg-transparent"
                                placeholder="Título da tarefa..."
                            />
                            <Pencil className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                        </div>

                        {/* Metadados */}
                        <div className="grid grid-cols-3 gap-4 mb-6">
                            {/* Status */}
                            <div className="flex flex-col gap-2">
                                <label className="text-xs font-medium text-gray-500 uppercase">
                                    Status
                                </label>
                                <Select
                                    value={status}
                                    onValueChange={(value) =>
                                        setStatus(value as "todo" | "in_progress" | "done")
                                    }
                                >
                                    <SelectTrigger className="h-9">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="todo">Não iniciado</SelectItem>
                                        <SelectItem value="in_progress">Em progresso</SelectItem>
                                        <SelectItem value="done">Finalizado</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Responsável */}
                            <div className="flex flex-col gap-2">
                                <label className="text-xs font-medium text-gray-500 uppercase">
                                    Responsável
                                </label>
                                <div className="flex items-center gap-2 h-9 px-3 rounded-md border border-input bg-background">
                                    {task.assignee?.avatar ? (
                                        <img
                                            src={task.assignee.avatar}
                                            alt={task.assignee.name}
                                            className="w-5 h-5 rounded-full"
                                        />
                                    ) : (
                                        <User className="w-4 h-4 text-gray-400" />
                                    )}
                                    <span className="text-sm">{task.assignee?.name || "Não atribuído"}</span>
                                </div>
                            </div>

                            {/* Data de Entrega */}
                            <div className="flex flex-col gap-2">
                                <label className="text-xs font-medium text-gray-500 uppercase">
                                    Data de Entrega
                                </label>
                                <div className="flex items-center gap-2 h-9 px-3 rounded-md border border-input bg-background">
                                    <Calendar className="w-4 h-4 text-gray-400" />
                                    <Input
                                        type="date"
                                        value={dueDate}
                                        onChange={(e) => setDueDate(e.target.value)}
                                        className="border-0 p-0 h-auto focus-visible:ring-0"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Descrição - Rich Editor Simulado */}
                        <div className="mb-6">
                            <label className="text-xs font-medium text-gray-500 uppercase mb-2 block">
                                Descrição
                            </label>
                            <div className="border border-gray-200 rounded-md overflow-hidden">
                                {/* Toolbar */}
                                <div className="bg-gray-50 border-b border-gray-200 p-2 flex items-center gap-2">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7"
                                        onClick={() => {}}
                                    >
                                        <Bold className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7"
                                        onClick={() => {}}
                                    >
                                        <Italic className="h-3.5 w-3.5" />
                                    </Button>
                                    <div className="w-px h-4 bg-gray-300 mx-1" />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7"
                                        onClick={() => {}}
                                    >
                                        <List className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7"
                                        onClick={() => {}}
                                    >
                                        <LinkIcon className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                                {/* Área de Texto */}
                                <Textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Adicione uma descrição..."
                                    className="min-h-[150px] resize-none border-0 rounded-t-none focus-visible:ring-0"
                                />
                            </div>
                        </div>

                        {/* Anexos */}
                        <div className="mb-6">
                            <label className="text-xs font-medium text-gray-500 uppercase mb-2 block">
                                Arquivos
                            </label>
                            
                            {/* Dropzone */}
                            <div className="border-dashed border-2 border-gray-200 hover:border-green-400 transition-colors rounded-md p-6 mb-4 cursor-pointer group">
                                <div className="flex flex-col items-center justify-center gap-2">
                                    <UploadCloud className="w-8 h-8 text-gray-400 group-hover:text-green-500 transition-colors" />
                                    <p className="text-sm text-gray-600 group-hover:text-green-600 transition-colors">
                                        Arraste arquivos ou clique para upload
                                    </p>
                                </div>
                            </div>

                            {/* Preview de Arquivos - Grid */}
                            {attachments.length > 0 && (
                                <div className="grid grid-cols-2 gap-3">
                                    {attachments.map((file) => (
                                        <div
                                            key={file.id}
                                            className="flex items-center gap-2 p-2 bg-gray-50 rounded-md border border-gray-200 hover:bg-gray-100 transition-colors"
                                        >
                                            <div className="flex-shrink-0">
                                                {file.type === "image" ? (
                                                    <FileImage className="w-4 h-4 text-blue-500" />
                                                ) : file.type === "pdf" ? (
                                                    <FileText className="w-4 h-4 text-red-500" />
                                                ) : (
                                                    <FileText className="w-4 h-4 text-gray-500" />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-medium text-gray-700 truncate">
                                                    {file.name}
                                                </p>
                                                <p className="text-xs text-gray-500">{file.size}</p>
                                            </div>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6 flex-shrink-0"
                                                onClick={() => {
                                                    setAttachments(attachments.filter((f) => f.id !== file.id));
                                                }}
                                            >
                                                <Trash2 className="h-3 w-3 text-gray-400 hover:text-red-500" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Sub-tarefas */}
                        <div>
                            <label className="text-xs font-medium text-gray-500 uppercase mb-3 block">
                                Sub-tarefas
                            </label>
                            <div className="space-y-2 mb-3">
                                {subTasks.map((subTask) => (
                                    <div
                                        key={subTask.id}
                                        className="flex items-center gap-3 p-2 rounded-md hover:bg-gray-50"
                                    >
                                        <Checkbox
                                            checked={subTask.completed}
                                            onCheckedChange={() => handleToggleSubTask(subTask.id)}
                                        />
                                        <span
                                            className={cn(
                                                "flex-1 text-sm",
                                                subTask.completed && "line-through text-gray-400"
                                            )}
                                        >
                                            {subTask.title}
                                        </span>
                                    </div>
                                ))}
                            </div>
                            <div className="flex gap-2">
                                <Input
                                    value={newSubTask}
                                    onChange={(e) => setNewSubTask(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            handleAddSubTask();
                                        }
                                    }}
                                    placeholder="Adicionar item..."
                                    className="flex-1"
                                />
                                <Button
                                    onClick={handleAddSubTask}
                                    size="icon"
                                    variant="outline"
                                    className="h-10 w-10"
                                >
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Coluna Direita - Contexto & Chat */}
                    <div className="bg-gray-50 p-6 flex flex-col overflow-hidden">
                        {/* Header da Coluna */}
                        <h3 className="text-sm font-semibold text-gray-700 mb-4">
                            Contexto Original (WhatsApp)
                        </h3>

                        {/* Card de Origem */}
                        {task.contextMessage && (
                            <div className="mb-6">
                                <div className="bg-white rounded-lg border border-gray-200 border-l-4 border-l-green-500 p-4 shadow-sm">
                                    <div className="flex items-start gap-3">
                                        {task.contextMessage.type === "audio" ? (
                                            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-green-100 flex-shrink-0">
                                                <Play className="w-5 h-5 text-green-600 fill-green-600" />
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-green-100 flex-shrink-0">
                                                <MessageSquare className="w-5 h-5 text-green-600" />
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm text-gray-700 mb-1">
                                                {task.contextMessage.content}
                                            </p>
                                            <p className="text-xs text-gray-400">
                                                {task.contextMessage.timestamp}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Histórico/Comentários */}
                        <div className="flex-1 flex flex-col min-h-0">
                            <h4 className="text-xs font-medium text-gray-500 uppercase mb-3">
                                Histórico
                            </h4>
                            <div className="flex-1 overflow-y-auto mb-4 relative">
                                {/* Linha vertical da timeline */}
                                <div className="absolute left-[7px] top-0 bottom-0 w-px bg-gray-200" />
                                
                                <div className="space-y-3 relative">
                                    {task.activities.map((activity) => (
                                        <div
                                            key={activity.id}
                                            className="flex gap-3 text-sm relative"
                                        >
                                            <div className="flex-shrink-0 relative z-10">
                                                <div className="w-2 h-2 rounded-full bg-gray-300 mt-2" />
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-gray-700">
                                                    <span className="font-medium">{activity.user}</span>{" "}
                                                    {activity.type === "created" && "criou a tarefa"}
                                                    {activity.type === "commented" && "comentou"}
                                                    {activity.type === "updated" && "atualizou a tarefa"}
                                                    {activity.type === "file_shared" && "enviou um arquivo"}
                                                </p>
                                                {activity.message && (
                                                    <p className="text-gray-600 mt-1">{activity.message}</p>
                                                )}
                                                {activity.file && (
                                                    <div className="mt-2 p-2 bg-white rounded-md border border-gray-200 flex items-center gap-2">
                                                        {activity.file.type === "image" ? (
                                                            <FileImage className="w-4 h-4 text-blue-500 flex-shrink-0" />
                                                        ) : activity.file.type === "pdf" ? (
                                                            <FileText className="w-4 h-4 text-red-500 flex-shrink-0" />
                                                        ) : (
                                                            <FileText className="w-4 h-4 text-gray-500 flex-shrink-0" />
                                                        )}
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-xs font-medium text-gray-700 truncate">
                                                                {activity.file.name}
                                                            </p>
                                                            <p className="text-xs text-gray-500">{activity.file.size}</p>
                                                        </div>
                                                    </div>
                                                )}
                                                <p className="text-xs text-gray-400 mt-1">
                                                    {activity.timestamp}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Input de Comentário */}
                            <div className="flex gap-2 pt-4 border-t border-gray-200">
                                <Input
                                    value={comment}
                                    onChange={(e) => setComment(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSendComment();
                                        }
                                    }}
                                    placeholder="Adicionar comentário..."
                                    className="flex-1"
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-10 w-10 text-gray-400 hover:text-green-600"
                                    onClick={() => {}}
                                >
                                    <Paperclip className="h-4 w-4" />
                                </Button>
                                <Button
                                    onClick={handleSendComment}
                                    size="icon"
                                    className="h-10 w-10 bg-green-600 hover:bg-green-700"
                                >
                                    <Send className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
                </DialogPrimitive.Content>
            </DialogPortal>
        </Dialog>
    );
}

