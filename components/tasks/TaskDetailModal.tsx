"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useDropzone } from "react-dropzone";
import { useFileUpload } from "@/hooks/use-file-upload";
import { saveAttachment, deleteAttachment } from "@/lib/actions/attachments";
import { 
    getTaskDetails, 
    addComment, 
    updateTaskField, 
    updateTaskFields,
    updateTaskTags,
    updateTaskSubtasks,
    uploadAudioComment
} from "@/lib/actions/task-details";
import { getWorkspaceMembers } from "@/lib/actions/tasks";
import { createBrowserClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { mapStatusToLabel, mapLabelToStatus, STATUS_TO_LABEL } from "@/lib/config/tasks";
// Force rebuild due to runtime error
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
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    X,
    Maximize2,
    Minimize2,
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
    Copy,
    Paperclip,
    UploadCloud,
    FileImage,
    FileText,
    Trash2,
    Mic,
    Check,
    Pause,
    Tag,
    ChevronDown,
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { AudioMessageBubble } from "./AudioMessageBubble";
import { AttachmentCard } from "./AttachmentCard";
import { Editor } from "@/components/ui/editor";

// Funções auxiliares para arquivos
const getFileTypeFromMime = (mimeType: string): "image" | "pdf" | "other" => {
    if (mimeType.startsWith("image/")) return "image";
    if (mimeType === "application/pdf") return "pdf";
    return "other";
};

const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
};

interface SubTask {
    id: string;
    title: string;
    completed: boolean;
    assignee?: {
        name: string;
        avatar?: string;
    };
}

interface Activity {
    id: string;
    type: "created" | "commented" | "updated" | "file_shared" | "audio";
    user: string;
    message?: string;
    timestamp: string;
    file?: {
        name: string;
        type: "image" | "pdf" | "other";
        size: string;
    };
    audio?: {
        url?: string;
        duration?: number; // em segundos
    };
}

interface TaskDetailModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    mode?: "create" | "edit";
    onTaskCreated?: () => void; // Callback após criar tarefa
    onTaskUpdated?: () => void; // Callback após atualizar tarefa
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
        tags?: string[];
        breadcrumbs: string[];
        workspaceId?: string | null; // ID do workspace para otimização
        contextMessage?: {
            type: "audio" | "text";
            content: string;
            timestamp: string;
        };
        subTasks: SubTask[];
        activities: Activity[];
        attachments?: FileAttachment[];
    };
    initialDueDate?: string; // Para pré-selecionar data no modo create
}

interface FileAttachment {
    id: string;
    name: string;
    type: "image" | "pdf" | "other";
    size: string;
    url?: string;
}

export function TaskDetailModal({ 
    open, 
    onOpenChange, 
    mode = "edit", 
    task, 
    initialDueDate,
    onTaskCreated,
    onTaskUpdated,
}: TaskDetailModalProps) {
    const isCreateMode = mode === "create";
    const [title, setTitle] = useState(task?.title || "");
    const [description, setDescription] = useState(task?.description || "");
    const [isEditingDescription, setIsEditingDescription] = useState(false);
    const [status, setStatus] = useState<"todo" | "in_progress" | "done">(task?.status || "todo");
    const [dueDate, setDueDate] = useState(task?.dueDate || initialDueDate || "");
    const [subTasks, setSubTasks] = useState<SubTask[]>(task?.subTasks || []);
    const [newSubTask, setNewSubTask] = useState("");
    const [newSubTaskAssignee, setNewSubTaskAssignee] = useState<string>("");
    const [comment, setComment] = useState("");
    const [tags, setTags] = useState<string[]>(task?.tags || []);
    const [newTagInput, setNewTagInput] = useState("");
    const [isTagInputOpen, setIsTagInputOpen] = useState(false);
    const [availableUsers, setAvailableUsers] = useState<Array<{ id: string; name: string; avatar?: string }>>([]);
    const [attachments, setAttachments] = useState<FileAttachment[]>(task?.attachments || []);
    const [activities, setActivities] = useState<Activity[]>(task?.activities || []);
    const [isCreating, setIsCreating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isLoadingMembers, setIsLoadingMembers] = useState(false);
    const [isLoadingDetails, setIsLoadingDetails] = useState(false);
    const [uploadingFiles, setUploadingFiles] = useState<Set<string>>(new Set());
    const [currentTaskId, setCurrentTaskId] = useState<string | null>(task?.id || null);
    const [isMaximized, setIsMaximized] = useState(false);
    const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    
    // Hook de upload
    const { uploadToStorage, progress, clearProgress } = useFileUpload();
    
    // Estados para gravação de áudio
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
    const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
    const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);

    // Buscar dados completos da tarefa quando modal abre
    useEffect(() => {
        let active = true; // Flag para controle de concorrência

        if (open && !isCreateMode && task?.id) {
            // 1. Reset Imediato (UI Otimista)
            setCurrentTaskId(task.id);
            setTitle(task.title || "");
            setDescription(task.description || "");
            setStatus(task.status as "todo" | "in_progress" | "done");
            setDueDate(task.dueDate ? new Date(task.dueDate).toISOString().split("T")[0] : "");
            setTags(task.tags || []);
            setSubTasks(task.subTasks || []); // Se subTasks vierem vazias, serão carregadas depois
            
            // 2. Limpeza de Listas para estado de carregamento
            setAttachments([]);
            setActivities([]);
            setIsLoadingDetails(true);

            const loadData = async () => {
                try {
                    // 3. Busca Paralela
                    const [taskDetails, members] = await Promise.all([
                        getTaskDetails(task.id),
                        getWorkspaceMembers(task.workspaceId || null)
                    ]);
                    
                    if (!active) return; // Ignorar se o componente desmontou ou tarefa mudou

                    if (taskDetails) {
                        // Atualizar estados apenas se necessário (já fizemos reset otimista)
                        // Mas a descrição completa pode vir do backend se estiver truncada na lista
                        setDescription(taskDetails.description || "");
                        
                        // Mapear anexos
                        const mappedAttachments: FileAttachment[] = taskDetails.attachments.map((att) => ({
                            id: att.id,
                            name: att.file_name,
                            type: (att.file_type || "other") as "image" | "pdf" | "other",
                            size: att.file_size ? `${(att.file_size / 1024 / 1024).toFixed(1)} MB` : "0 MB",
                            url: att.file_url,
                        }));
                        setAttachments(mappedAttachments);
                        
                        // Mapear comentários para atividades
                        const mappedActivities: Activity[] = taskDetails.comments.map((comment) => ({
                            id: comment.id,
                            type: comment.type === "comment" ? "commented" : 
                                  comment.type === "file" ? "file_shared" :
                                  comment.type === "log" ? "updated" : "commented",
                            user: comment.user.full_name || comment.user.email || "Sem nome",
                            message: comment.content,
                            timestamp: new Date(comment.created_at).toLocaleString("pt-BR"),
                            audio: comment.metadata?.audio_url ? {
                                url: comment.metadata.audio_url,
                                duration: comment.metadata.duration,
                            } : undefined,
                        }));
                        setActivities(mappedActivities);
                        
                        // Extrair tags do origin_context (prioridade backend)
                        if (taskDetails.origin_context?.tags) {
                            setTags(taskDetails.origin_context.tags);
                        }

                        // Atualizar membros disponíveis
                        setAvailableUsers(
                            members.map((m: any) => ({
                                id: m.id,
                                name: m.full_name || m.email || "Sem nome",
                                avatar: m.avatar_url || undefined,
                            }))
                        );
                    }
                } catch (error) {
                    if (active) {
                        console.error("Erro ao carregar detalhes da tarefa:", error);
                        toast.error("Erro ao carregar detalhes da tarefa");
                    }
                } finally {
                    if (active) {
                        setIsLoadingDetails(false);
                    }
                }
            };
            
            loadData();
        } else if (open && isCreateMode) {
            // Modo create: resetar estados
            setTitle("");
            setDescription("");
            setStatus("todo");
            setDueDate(initialDueDate || "");
            setSubTasks([]);
            setAttachments([]);
            setActivities([]);
            setTags([]);
            setCurrentTaskId(null);
            
            // Carregar apenas o usuário atual
            const loadCurrentUser = async () => {
                try {
                    const members = await getWorkspaceMembers(null);
                    if (active) {
                        setAvailableUsers(
                            members.map((m: any) => ({
                                id: m.id,
                                name: m.full_name || m.email || "Usuário",
                                avatar: m.avatar_url || undefined,
                            }))
                        );
                    }
                } catch (error) {
                    console.error("Erro ao carregar usuário:", error);
                }
            };
            loadCurrentUser();
        }

        return () => {
            active = false; // Cleanup para evitar race conditions
        };
    }, [open, isCreateMode, task?.id, initialDueDate]); // eslint-disable-line react-hooks/exhaustive-deps

    // Auto-save com debounce (500ms)
    const triggerAutoSave = useCallback((field: string, value: any) => {
        if (!currentTaskId || isCreateMode) return;
        
        // Limpar timeout anterior
        if (autoSaveTimeoutRef.current) {
            clearTimeout(autoSaveTimeoutRef.current);
        }
        
        // Criar novo timeout
        autoSaveTimeoutRef.current = setTimeout(async () => {
            try {
                const result = await updateTaskField(currentTaskId, field, value);
                if (result.success) {
                    // Silenciosamente salvo (sem toast para não poluir a UI)
                } else {
                    console.error(`Erro ao salvar ${field}:`, result.error);
                }
            } catch (error) {
                console.error(`Erro ao salvar ${field}:`, error);
            }
        }, 500);
    }, [currentTaskId, isCreateMode]);
    
    // Cleanup do timeout ao desmontar
    useEffect(() => {
        return () => {
            if (autoSaveTimeoutRef.current) {
                clearTimeout(autoSaveTimeoutRef.current);
            }
        };
    }, []);

    // Handler para upload de arquivos
    const handleFileUpload = useCallback(async (files: File[]) => {
        if (!task?.id || isCreateMode) {
            console.error("Não é possível fazer upload: tarefa não criada ainda");
            return;
        }

        for (const file of files) {
            const fileKey = `${file.name}-${Date.now()}`;
            setUploadingFiles((prev) => new Set(prev).add(fileKey));

            try {
                // 1. Fazer upload para o Storage
                const uploadResult = await uploadToStorage(file, "task-attachments");

                if (!uploadResult.success || !uploadResult.url) {
                    throw new Error(uploadResult.error || "Erro ao fazer upload");
                }

                // 2. Salvar no banco de dados
                const saveResult = await saveAttachment({
                    taskId: task.id,
                    fileUrl: uploadResult.url,
                    fileName: file.name,
                    fileType: getFileTypeFromMime(file.type || "other"),
                    fileSize: file.size,
                    filePath: uploadResult.path, // Salvar o path para facilitar deleção
                });

                if (!saveResult.success || !saveResult.data) {
                    throw new Error(saveResult.error || "Erro ao salvar anexo");
                }

                // 3. Atualizar lista de anexos
                setAttachments((prev) => [
                    ...prev,
                    {
                        id: saveResult.data!.id,
                        name: file.name,
                        type: getFileTypeFromMime(file.type || "other"),
                        size: formatFileSize(file.size),
                        url: uploadResult.url!,
                    },
                ]);

                // Limpar progresso após sucesso
                clearProgress(file.name);
            } catch (error) {
                console.error("Erro ao fazer upload do arquivo:", error);
                alert(`Erro ao fazer upload de ${file.name}: ${error instanceof Error ? error.message : "Erro desconhecido"}`);
            } finally {
                setUploadingFiles((prev) => {
                    const newSet = new Set(prev);
                    newSet.delete(fileKey);
                    return newSet;
                });
            }
        }
    }, [task?.id, isCreateMode, uploadToStorage, clearProgress]);

    // Configuração do dropzone
    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop: handleFileUpload,
        disabled: isCreateMode || !task?.id,
        multiple: true,
    });

    // Handler para deletar anexo
    const handleDeleteAttachment = async (attachmentId: string) => {
        try {
            const result = await deleteAttachment(attachmentId);
            if (result.success) {
                setAttachments((prev) => prev.filter((att) => att.id !== attachmentId));
                onTaskUpdated?.();
            } else {
                alert(`Erro ao deletar anexo: ${result.error}`);
            }
        } catch (error) {
            console.error("Erro ao deletar anexo:", error);
            alert("Erro ao deletar anexo. Tente novamente.");
        }
    };

    const handleAddSubTask = async () => {
        if (newSubTask.trim()) {
            const assignee = newSubTaskAssignee 
                ? availableUsers.find(u => u.id === newSubTaskAssignee)
                : undefined;
            
            const newSubTasks = [
                ...subTasks,
                {
                    id: `subtask-${Date.now()}`,
                    title: newSubTask,
                    completed: false,
                    assignee: assignee ? {
                        name: assignee.name,
                        avatar: assignee.avatar,
                    } : undefined,
                },
            ];
            setSubTasks(newSubTasks);
            setNewSubTask("");
            setNewSubTaskAssignee("");

            if (currentTaskId && !isCreateMode) {
                await updateTaskSubtasks(currentTaskId, newSubTasks);
            }
        }
    };
    
    const handleUpdateSubTaskAssignee = async (subTaskId: string, assigneeId: string) => {
        // Se o valor selecionado for o mesmo que já está, remove o responsável
        const currentSubTask = subTasks.find(st => st.id === subTaskId);
        const selectedUser = availableUsers.find(u => u.id === assigneeId);
        
        let newSubTasks;
        
        if (currentSubTask?.assignee?.name === selectedUser?.name) {
            newSubTasks = subTasks.map((st) =>
                    st.id === subTaskId 
                        ? { ...st, assignee: undefined }
                        : st
            );
        } else {
            newSubTasks = subTasks.map((st) =>
                    st.id === subTaskId 
                        ? { 
                            ...st, 
                        assignee: selectedUser ? {
                            name: selectedUser.name,
                            avatar: selectedUser.avatar,
                            } : undefined
                        }
                        : st
            );
        }
        setSubTasks(newSubTasks);
        if (currentTaskId && !isCreateMode) {
            await updateTaskSubtasks(currentTaskId, newSubTasks);
        }
    };
    
    const handleRemoveSubTaskAssignee = async (subTaskId: string) => {
        const newSubTasks = subTasks.map((st) =>
                st.id === subTaskId 
                    ? { ...st, assignee: undefined }
                    : st
        );
        setSubTasks(newSubTasks);
        if (currentTaskId && !isCreateMode) {
            await updateTaskSubtasks(currentTaskId, newSubTasks);
        }
    };

    const handleToggleSubTask = async (id: string) => {
        const newSubTasks = subTasks.map((st) =>
                st.id === id ? { ...st, completed: !st.completed } : st
        );
        setSubTasks(newSubTasks);
        if (currentTaskId && !isCreateMode) {
            await updateTaskSubtasks(currentTaskId, newSubTasks);
        }
    };

    // Função para formatar tempo (MM:SS)
    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    };

    // Função para iniciar gravação
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);
            const chunks: Blob[] = [];

            recorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    chunks.push(event.data);
                }
            };

            recorder.onstop = () => {
                const audioBlob = new Blob(chunks, { type: "audio/webm" });
                setAudioChunks(chunks);
                // Parar todas as tracks do stream
                stream.getTracks().forEach((track) => track.stop());
            };

            recorder.start();
            setMediaRecorder(recorder);
            setMediaStream(stream);
            setIsRecording(true);
            setRecordingTime(0);
        } catch (error) {
            console.error("Erro ao iniciar gravação:", error);
            alert("Não foi possível acessar o microfone. Verifique as permissões.");
        }
    };

    // Função para parar gravação
    const stopRecording = () => {
        if (mediaRecorder && mediaRecorder.state !== "inactive") {
            mediaRecorder.stop();
            setIsRecording(false);
        }
    };

    // Função para cancelar gravação
    const cancelRecording = () => {
        if (mediaRecorder && mediaRecorder.state !== "inactive") {
            mediaRecorder.stop();
        }
        // Parar todas as tracks do stream
        if (mediaStream) {
            mediaStream.getTracks().forEach((track) => track.stop());
            setMediaStream(null);
        }
        setIsRecording(false);
        setRecordingTime(0);
        setAudioChunks([]);
        setMediaRecorder(null);
    };

    // Função para enviar áudio gravado
    const handleUploadAudio = async (blob: Blob) => {
        if (!currentTaskId) return;

        try {
            const formData = new FormData();
            formData.append("audio", blob, "audio.webm");
            formData.append("duration", recordingTime.toString());

            const result = await uploadAudioComment(currentTaskId, formData);

            if (result.success && result.data) {
                // Adicionar à timeline (otimista ou via reload)
                const audioData = result.data as any;
                const newActivity: Activity = {
                    id: audioData.id,
                    type: "audio",
                    user: "Você", // Será atualizado no próximo fetch/realtime
                    timestamp: new Date().toLocaleString("pt-BR"),
                    audio: {
                        url: audioData.metadata.url,
                        duration: audioData.metadata.duration
                    }
                };
                setActivities((prev) => [newActivity, ...prev]);
                toast.success("Áudio enviado");
                onTaskUpdated?.();
            } else {
                console.error("Erro no upload de áudio:", result.error);
                toast.error("Erro ao enviar áudio");
            }
        } catch (error) {
            console.error("Erro ao enviar áudio:", error);
            toast.error("Erro ao enviar áudio");
        }
        
        // Resetar estados
        setAudioChunks([]);
        setMediaRecorder(null);
    };

    // Timer para gravação
    useEffect(() => {
        let interval: NodeJS.Timeout | null = null;
        if (isRecording) {
            interval = setInterval(() => {
                setRecordingTime((prev) => prev + 1);
            }, 1000);
        } else {
            if (interval) clearInterval(interval);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isRecording]);

    // Limpar ao fechar o modal
    useEffect(() => {
        if (!open) {
            if (isRecording) {
                cancelRecording();
            }
        }
    }, [open]);

    const handleSendComment = async () => {
        if (!comment.trim() || !currentTaskId) return;

        try {
            const result = await addComment(currentTaskId, comment.trim(), null, "comment");

            if (result.success) {
                // Recarregar detalhes da tarefa para obter o comentário criado
                const taskDetails = await getTaskDetails(currentTaskId);
                if (taskDetails) {
                    // Mapear comentários para atividades
                    const mappedActivities: Activity[] = taskDetails.comments.map((comment) => ({
                        id: comment.id,
                        type: comment.type === "comment" ? "commented" : 
                              comment.type === "file" ? "file_shared" :
                              comment.type === "log" ? "updated" : "commented",
                        user: comment.user.full_name || comment.user.email || "Sem nome",
                        message: comment.content,
                        timestamp: new Date(comment.created_at).toLocaleString("pt-BR"),
                        audio: comment.metadata?.audio_url ? {
                            url: comment.metadata.audio_url,
                            duration: comment.metadata.duration,
                        } : undefined,
                    }));
                    setActivities(mappedActivities);
                }
            setComment("");
                toast.success("Comentário adicionado");
                onTaskUpdated?.();
            } else {
                console.error("Erro ao criar comentário:", result.error);
                toast.error(result.error || "Erro ao criar comentário");
            }
        } catch (error) {
            console.error("Erro ao criar comentário:", error);
            toast.error("Erro ao criar comentário");
        }
    };

    const handleSave = async () => {
        if (!task?.id) return;

        setIsSaving(true);
        try {
            const { updateTask } = await import("@/lib/actions/tasks");
            
            // Converter dueDate para formato ISO se existir
            let dueDateISO: string | null | undefined = undefined;
            if (dueDate) {
                const date = new Date(dueDate);
                if (!isNaN(date.getTime())) {
                    dueDateISO = date.toISOString();
                }
            } else {
                dueDateISO = null;
            }

            const updateParams: any = {
                id: task.id,
                title: title.trim(),
                description: description || null,
                status: status,
            };
            
            if (dueDateISO !== undefined) {
                updateParams.due_date = dueDateISO || null;
            }

            // Salvar tags no origin_context
            if (tags.length > 0) {
                updateParams.origin_context = { tags };
            } else {
                updateParams.origin_context = null;
            }

            const result = await updateTask(updateParams);

            if (result.success) {
                // Fechar modal e notificar componente pai para recarregar tarefas
                onOpenChange(false);
                onTaskUpdated?.();
            } else {
                console.error("Erro ao salvar tarefa:", result.error);
                alert(`Erro ao salvar tarefa: ${result.error}`);
            }
        } catch (error) {
            console.error("Erro ao salvar tarefa:", error);
            alert("Erro ao salvar tarefa");
        } finally {
            setIsSaving(false);
        }
    };

    const handleCreate = async () => {
        if (!title.trim()) return;
        
        setIsCreating(true);
        try {
            // Importação dinâmica da Server Action
            const { createTask } = await import("@/lib/actions/tasks");
            
            // Converter dueDate para formato ISO se existir
            let dueDateISO: string | undefined = undefined;
            if (dueDate) {
                const date = new Date(dueDate);
                if (!isNaN(date.getTime())) {
                    dueDateISO = date.toISOString();
                }
            }
            
            const createParams: any = {
                title: title.trim(),
                description: description || undefined,
                due_date: dueDateISO,
                workspace_id: null, // Por enquanto, tarefas pessoais
                status: status,
            };

            // Salvar tags no origin_context se houver
            if (tags.length > 0) {
                createParams.origin_context = { tags };
            }

            const result = await createTask(createParams);

            if (result.success) {
                onOpenChange(false);
                // Resetar campos
                setTitle("");
                setDescription("");
                setDueDate(initialDueDate || "");
                setStatus("todo");
                setSubTasks([]);
                // Notificar componente pai para recarregar tarefas
                onTaskCreated?.();
            } else {
                console.error("Erro ao criar tarefa:", result.error);
                alert(`Erro ao criar tarefa: ${result.error}`);
            }
        } catch (error) {
            console.error("Erro ao criar tarefa:", error);
            const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
            alert(`Erro ao criar tarefa: ${errorMessage}`);
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogPortal>
                <DialogOverlay className="bg-black/50" />
                <DialogPrimitive.Content
                    className={cn(
                        "fixed z-50 bg-background duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 p-0 flex flex-col overflow-hidden shadow-lg",
                        isMaximized 
                            ? "left-0 top-0 w-screen h-screen translate-x-0 translate-y-0 rounded-none border-0"
                            : "left-[50%] top-[50%] w-[90vw] max-w-6xl h-[80vh] translate-x-[-50%] translate-y-[-50%] rounded-xl border data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]"
                    )}
                >
                {/* DialogTitle para acessibilidade (oculto visualmente) */}
                <DialogTitle className="sr-only">
                    {isCreateMode ? "Criar Nova Tarefa" : `Detalhes da Tarefa: ${task?.title || ""}`}
                </DialogTitle>
                
                {/* Header */}
                <DialogHeader className="px-6 py-4 border-b border-gray-100 shrink-0">
                    <div className="flex items-center justify-between">
                        {/* Breadcrumbs */}
                        {!isCreateMode && task?.breadcrumbs && (
                            <div className="flex items-center gap-2 text-sm text-gray-600 min-h-[20px]">
                                {task.breadcrumbs.map((crumb, index) => (
                                    <div key={index} className="flex items-center gap-2">
                                        <span>{crumb}</span>
                                        {index < task.breadcrumbs.length - 1 && (
                                            <ChevronRight className="w-4 h-4 text-gray-400" />
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                        {isCreateMode && (
                            <div className="flex items-center gap-2 text-sm text-gray-600 min-h-[20px]">
                                <span>Nova Tarefa</span>
                            </div>
                        )}

                        {/* Botões de Ação */}
                        <div className="flex items-center gap-2 ml-auto">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => setIsMaximized(!isMaximized)}
                                title={isMaximized ? "Restaurar" : "Maximizar"}
                            >
                                {isMaximized ? (
                                    <Minimize2 className="h-4 w-4" />
                                ) : (
                                    <Maximize2 className="h-4 w-4" />
                                )}
                            </Button>
                            
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                    >
                                        <MoreVertical className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem 
                                        onClick={() => {
                                            navigator.clipboard.writeText(window.location.href);
                                            toast.success("Link copiado para a área de transferência");
                                        }}
                                    >
                                        <Copy className="w-4 h-4 mr-2" />
                                        Copiar Link
                                    </DropdownMenuItem>
                                    {!isCreateMode && (
                                        <>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem 
                                                className="text-red-600 focus:text-red-600 focus:bg-red-50"
                                                onClick={() => {
                                                    if (confirm("Tem certeza que deseja excluir esta tarefa?")) {
                                                        // TODO: Implementar exclusão real
                                                        toast.error("Funcionalidade de exclusão em breve");
                                                    }
                                                }}
                                            >
                                                <Trash2 className="w-4 h-4 mr-2" />
                                                Excluir Tarefa
                                            </DropdownMenuItem>
                                        </>
                                    )}
                                </DropdownMenuContent>
                            </DropdownMenu>

                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => onOpenChange(false)}
                                title="Fechar (Esc)"
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
                                onChange={(e) => {
                                    const newValue = e.target.value;
                                    setTitle(newValue);
                                    if (!isCreateMode && currentTaskId) {
                                        triggerAutoSave("title", newValue);
                                    }
                                }}
                                className="text-4xl font-bold border-0 p-0 pr-8 focus-visible:ring-0 focus-visible:ring-offset-0 hover:border-b hover:border-gray-300 transition-colors bg-transparent"
                                placeholder={isCreateMode ? "Digite o nome da tarefa..." : "Título da tarefa..."}
                            />
                            <Pencil className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                        </div>

                        {/* Metadados - Properties Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                            {/* Status */}
                            <div className="flex flex-col">
                                <label className="text-[10px] uppercase text-gray-400 font-bold tracking-wider mb-1">
                                    Status
                                </label>
                                <Select
                                    value={status}
                                    onValueChange={async (value) => {
                                        const newStatus = value as "todo" | "in_progress" | "done";
                                        setStatus(newStatus);
                                        if (!isCreateMode && currentTaskId) {
                                            const result = await updateTaskField(currentTaskId, "status", newStatus);
                                            if (result.success) {
                                                onTaskUpdated?.();
                                            } else {
                                                toast.error(result.error || "Erro ao atualizar status");
                                            }
                                        }
                                    }}
                                >
                                    <SelectTrigger className="h-8 px-2 -ml-2 justify-start hover:bg-gray-100 border-0 bg-transparent [&>svg]:hidden">
                                        <div className="flex items-center justify-between w-full gap-2">
                                            <SelectValue>
                                                {mapStatusToLabel(status)}
                                            </SelectValue>
                                            <ChevronDown className="h-3 w-3 text-gray-400 opacity-50" />
                                        </div>
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="todo">{STATUS_TO_LABEL.todo}</SelectItem>
                                        <SelectItem value="in_progress">{STATUS_TO_LABEL.in_progress}</SelectItem>
                                        <SelectItem value="done">{STATUS_TO_LABEL.done}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Responsável */}
                            <div className="flex flex-col">
                                <label className="text-[10px] uppercase text-gray-400 font-bold tracking-wider mb-1">
                                    Responsável
                                </label>
                                <Select
                                    value={task?.assignee?.name ? availableUsers.find(u => u.name === task.assignee?.name)?.id || "none" : "none"}
                                    onValueChange={async (userId) => {
                                        if (!currentTaskId || userId === "loading" || isCreateMode) return;
                                        
                                        try {
                                            const result = await updateTaskField(
                                                currentTaskId,
                                                "assignee_id",
                                                userId === "none" ? null : userId
                                            );
                                            
                                            if (result.success) {
                                                // Atualizar estado local
                                                if (userId === "none") {
                                                    // Remover assignee
                                                } else {
                                                    const selectedUser = availableUsers.find(u => u.id === userId);
                                                    // Atualizar visualmente se necessário
                                                }
                                                onTaskUpdated?.();
                                                toast.success("Responsável atualizado");
                                            } else {
                                                toast.error(result.error || "Erro ao atualizar responsável");
                                            }
                                        } catch (error) {
                                            console.error("Erro ao atualizar responsável:", error);
                                            toast.error("Erro ao atualizar responsável");
                                        }
                                    }}
                                >
                                    <SelectTrigger className="h-8 px-2 -ml-2 justify-start hover:bg-gray-100 border-0 bg-transparent [&>svg]:hidden">
                                        <SelectValue>
                                            {task?.assignee ? (
                                                <div className="flex items-center gap-2">
                                                    {task.assignee.avatar ? (
                                        <img
                                            src={task.assignee.avatar}
                                            alt={task.assignee.name}
                                                            className="w-6 h-6 rounded-full"
                                                        />
                                                    ) : (
                                                        <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center">
                                                            <User className="w-3.5 h-3.5 text-gray-500" />
                                                        </div>
                                                    )}
                                                    <span className="text-sm">{task.assignee.name}</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2 text-gray-400">
                                                    <div className="w-6 h-6 rounded-full border border-dashed border-gray-300 flex items-center justify-center">
                                                        <Plus className="w-3 h-3" />
                                                    </div>
                                                    <span className="text-sm">Atribuir</span>
                                                </div>
                                            )}
                                        </SelectValue>
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">Não atribuído</SelectItem>
                                        {isLoadingMembers ? (
                                            <SelectItem value="loading" disabled>Carregando...</SelectItem>
                                        ) : (
                                            availableUsers.map((user) => (
                                                <SelectItem key={user.id} value={user.id}>
                                                    <div className="flex items-center gap-2">
                                                        {user.avatar ? (
                                                            <img
                                                                src={user.avatar}
                                                                alt={user.name}
                                            className="w-5 h-5 rounded-full"
                                        />
                                    ) : (
                                        <User className="w-4 h-4 text-gray-400" />
                                    )}
                                                        <span>{user.name}</span>
                                </div>
                                                </SelectItem>
                                            ))
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Data de Entrega */}
                            <div className="flex flex-col">
                                <label className="text-[10px] uppercase text-gray-400 font-bold tracking-wider mb-1">
                                    Data de Entrega
                                </label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            className="h-8 px-2 -ml-2 justify-start hover:bg-gray-100 border-0"
                                        >
                                            <div className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-gray-400" />
                                                <span
                                                    className={cn(
                                                        "text-sm",
                                                        dueDate &&
                                                            new Date(dueDate) < new Date() &&
                                                            (!task?.status || task?.status !== "done")
                                                            ? "text-red-500"
                                                            : "text-gray-700"
                                                    )}
                                                >
                                                    {dueDate
                                                        ? new Date(dueDate).toLocaleDateString("pt-BR", {
                                                              day: "numeric",
                                                              month: "short",
                                                          })
                                                        : "Sem data"}
                                                </span>
                                            </div>
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-3" align="start">
                                    <Input
                                        type="date"
                                        value={dueDate}
                                            onChange={async (e) => {
                                                const newValue = e.target.value;
                                                setDueDate(newValue);
                                                if (!isCreateMode && currentTaskId) {
                                                    const result = await updateTaskField(
                                                        currentTaskId,
                                                        "due_date",
                                                        newValue ? new Date(newValue).toISOString() : null
                                                    );
                                                    if (result.success) {
                                                        onTaskUpdated?.();
                                                    } else {
                                                        toast.error(result.error || "Erro ao atualizar data");
                                                    }
                                                }
                                            }}
                                            className="w-full"
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>

                            {/* Tags */}
                            <div className="flex flex-col">
                                <label className="text-[10px] uppercase text-gray-400 font-bold tracking-wider mb-1">
                                    Tags
                                </label>
                                <div className="flex items-center gap-1 flex-wrap">
                                    {tags.map((tag, index) => {
                                        // Gerar cor pastel baseada no nome da tag
                                        const getTagColor = (tagName: string) => {
                                            const hash = tagName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
                                            const hue = hash % 360;
                                            return {
                                                bg: `hsl(${hue}, 70%, 90%)`,
                                                text: `hsl(${hue}, 50%, 40%)`,
                                                border: `hsl(${hue}, 50%, 75%)`,
                                            };
                                        };
                                        const colors = getTagColor(tag);
                                        
                                        return (
                                            <Badge
                                                key={index}
                                                variant="outline"
                                                className="text-xs px-2 py-0.5 h-6 font-normal flex items-center gap-1.5"
                                                style={{
                                                    backgroundColor: colors.bg,
                                                    color: colors.text,
                                                    borderColor: colors.border,
                                                }}
                                            >
                                                {tag}
                                                <button
                                                    onClick={async (e) => {
                                                        e.stopPropagation();
                                                        const newTags = tags.filter((_, i) => i !== index);
                                                        setTags(newTags);
                                                        if (currentTaskId && !isCreateMode) {
                                                            await updateTaskTags(currentTaskId, newTags);
                                                        }
                                                    }}
                                                    className="hover:bg-black/10 rounded-full p-0.5 transition-colors"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </Badge>
                                        );
                                    })}
                                    <Popover open={isTagInputOpen} onOpenChange={setIsTagInputOpen}>
                                        <PopoverTrigger asChild>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6 rounded-full border border-dashed border-gray-300 hover:bg-gray-100 hover:border-gray-400"
                                            >
                                                <Plus className="h-3 w-3 text-gray-400" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-64 p-2" align="start">
                                            <div className="flex flex-col gap-2">
                                                <Input
                                                    placeholder="Digite o nome da tag..."
                                                    value={newTagInput}
                                                    onChange={(e) => setNewTagInput(e.target.value)}
                                                    onKeyDown={async (e) => {
                                                        if (e.key === "Enter" && newTagInput.trim()) {
                                                            const trimmed = newTagInput.trim();
                                                            if (!tags.includes(trimmed)) {
                                                                const newTags = [...tags, trimmed];
                                                                setTags(newTags);
                                                                setNewTagInput("");
                                                                setIsTagInputOpen(false);
                                                                if (currentTaskId && !isCreateMode) {
                                                                    await updateTaskTags(currentTaskId, newTags);
                                                                }
                                                            }
                                                        } else if (e.key === "Escape") {
                                                            setIsTagInputOpen(false);
                                                            setNewTagInput("");
                                                        }
                                                    }}
                                                    className="h-8 text-sm"
                                                    autoFocus
                                                />
                                                <div className="text-xs text-gray-500">
                                                    Pressione Enter para adicionar
                                                </div>
                                            </div>
                                        </PopoverContent>
                                    </Popover>
                                </div>
                            </div>
                        </div>

                        {/* Descrição - Rich Editor */}
                        <div className="mb-6 group/desc">
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-xs font-medium text-gray-500 uppercase block">
                                    Descrição
                                </label>
                                {!isEditingDescription && !isCreateMode && (
                                    <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        className="h-6 text-xs opacity-0 group-hover/desc:opacity-100 transition-opacity" 
                                        onClick={() => setIsEditingDescription(true)}
                                    >
                                        <Pencil className="w-3 h-3 mr-1" />
                                        Editar
                                    </Button>
                                )}
                            </div>

                            {isEditingDescription || isCreateMode ? (
                                <div>
                                    <Editor 
                                        value={description} 
                                        onChange={(html) => {
                                            setDescription(html);
                                            if (!isCreateMode && currentTaskId) {
                                                triggerAutoSave("description", html);
                                            }
                                        }}
                                        placeholder="Adicione uma descrição..."
                                    />
                                    {!isCreateMode && (
                                        <div className="flex justify-end mt-2">
                                            <Button 
                                                size="sm" 
                                                variant="outline" 
                                                onClick={() => setIsEditingDescription(false)}
                                            >
                                                Concluir Edição
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div 
                                    className="min-h-[100px] p-3 rounded-md border border-transparent hover:border-gray-200 hover:bg-gray-50 cursor-pointer transition-all prose prose-sm max-w-none text-gray-700"
                                    onClick={() => setIsEditingDescription(true)}
                                >
                                    {description && description !== "<p></p>" ? (
                                        <div dangerouslySetInnerHTML={{ __html: description }} />
                                    ) : (
                                        <p className="text-gray-400 italic">Sem descrição. Clique para adicionar.</p>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Anexos */}
                        <div className="mb-6">
                            <label className="text-xs font-medium text-gray-500 uppercase mb-2 block">
                                Arquivos
                            </label>
                            
                            {/* Dropzone */}
                            <div
                                {...getRootProps()}
                                className={cn(
                                    "border-dashed border-2 rounded-md p-6 mb-4 cursor-pointer group transition-colors",
                                    isDragActive
                                        ? "border-green-500 bg-green-50"
                                        : "border-gray-200 hover:border-green-400",
                                    (isCreateMode || !task?.id) && "opacity-50 cursor-not-allowed"
                                )}
                            >
                                <input {...getInputProps()} />
                                <div className="flex flex-col items-center justify-center gap-2">
                                    {uploadingFiles.size > 0 ? (
                                        <>
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
                                            <p className="text-sm text-gray-600">
                                                Fazendo upload... ({uploadingFiles.size} arquivo{uploadingFiles.size > 1 ? "s" : ""})
                                            </p>
                                        </>
                                    ) : (
                                        <>
                                            <UploadCloud className={cn(
                                                "w-8 h-8 transition-colors",
                                                isDragActive
                                                    ? "text-green-500"
                                                    : "text-gray-400 group-hover:text-green-500"
                                            )} />
                                            <p className={cn(
                                                "text-sm transition-colors",
                                                isDragActive
                                                    ? "text-green-600"
                                                    : "text-gray-600 group-hover:text-green-600"
                                            )}>
                                                {isCreateMode || !task?.id
                                                    ? "Crie a tarefa primeiro para adicionar arquivos"
                                                    : "Arraste arquivos ou clique para upload"}
                                            </p>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Preview de Arquivos - Grid */}
                            {isLoadingDetails ? (
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    {[1, 2].map((i) => (
                                        <div key={i} className="h-24 bg-gray-100 rounded-lg animate-pulse border border-gray-200" />
                                    ))}
                                </div>
                            ) : (
                                attachments.length > 0 && (
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                        {attachments.map((file) => (
                                            <AttachmentCard
                                                key={file.id}
                                                file={file}
                                                onDelete={handleDeleteAttachment}
                                            />
                                        ))}
                                    </div>
                                )
                            )}
                        </div>

                        {/* Sub-tarefas */}
                        <div>
                            <label className="text-xs font-medium text-gray-500 uppercase mb-3 block">
                                Sub-tarefas
                            </label>
                            {isLoadingDetails ? (
                                <div className="space-y-2 mb-3">
                                    {[1, 2].map((i) => (
                                        <div key={i} className="h-9 bg-gray-100 rounded-md animate-pulse" />
                                    ))}
                                </div>
                            ) : (
                                <div className="space-y-2 mb-3">
                                    {subTasks.map((subTask) => (
                                        <div
                                            key={subTask.id}
                                            className="flex items-center gap-3 p-2 rounded-md hover:bg-gray-50 group"
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
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {subTask.assignee ? (
                                                    <>
                                                        <div className="flex items-center gap-1.5 px-2 py-1 rounded text-xs bg-gray-100 text-gray-700">
                                                            {subTask.assignee.avatar ? (
                                                                <img
                                                                    src={subTask.assignee.avatar}
                                                                    alt={subTask.assignee.name}
                                                                    className="w-3 h-3 rounded-full"
                                                                />
                                                            ) : (
                                                                <User className="w-3 h-3 text-gray-400" />
                                                            )}
                                                            <span className="text-xs">{subTask.assignee.name}</span>
                                                        </div>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-6 w-6"
                                                            onClick={() => handleRemoveSubTaskAssignee(subTask.id)}
                                                            title="Remover responsável"
                                                        >
                                                            <X className="w-3 h-3 text-gray-400 hover:text-gray-600" />
                                                        </Button>
                                                    </>
                                                ) : (
                                                    <Select
                                                        value={undefined}
                                                        onValueChange={(value) => {
                                                            handleUpdateSubTaskAssignee(subTask.id, value);
                                                        }}
                                                    >
                                                        <SelectTrigger className="h-7 w-[140px] text-xs border-gray-200">
                                                                <SelectValue placeholder="Atribuir..." />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {availableUsers.map((user) => (
                                                                <SelectItem key={user.id} value={user.name}>
                                                                    <div className="flex items-center gap-2">
                                                                        {user.avatar ? (
                                                                            <img
                                                                                src={user.avatar}
                                                                                alt={user.name}
                                                                                className="w-4 h-4 rounded-full"
                                                                            />
                                                                        ) : (
                                                                            <User className="w-4 h-4 text-gray-400" />
                                                                        )}
                                                                        {user.name}
                                                                    </div>
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <div className="space-y-2">
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
                                {newSubTask.trim() && (
                                    <div className="flex items-center gap-2">
                                        <User className="w-4 h-4 text-gray-400" />
                                        <Select
                                            value={newSubTaskAssignee || undefined}
                                            onValueChange={(value) => {
                                                // Se selecionar o mesmo valor, limpa a seleção
                                                if (newSubTaskAssignee === value) {
                                                    setNewSubTaskAssignee("");
                                                } else {
                                                    setNewSubTaskAssignee(value);
                                                }
                                            }}
                                        >
                                            <SelectTrigger className="h-8 text-xs border-gray-200">
                                                <SelectValue placeholder="Atribuir responsável (opcional)" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {availableUsers.map((user) => (
                                                    <SelectItem key={user.id} value={user.id}>
                                                        <div className="flex items-center gap-2">
                                                            {user.avatar ? (
                                                                <img
                                                                    src={user.avatar}
                                                                    alt={user.name}
                                                                    className="w-4 h-4 rounded-full"
                                                                />
                                                            ) : (
                                                                <User className="w-4 h-4 text-gray-400" />
                                                            )}
                                                            {user.name}
                                                        </div>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {newSubTaskAssignee && (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6"
                                                onClick={() => setNewSubTaskAssignee("")}
                                                title="Remover responsável"
                                            >
                                                <X className="w-3 h-3 text-gray-400 hover:text-gray-600" />
                                            </Button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Coluna Direita - Contexto & Chat */}
                    <div className="bg-gray-50 p-6 flex flex-col overflow-hidden">
                        {isCreateMode ? (
                            /* Empty State para modo create */
                            <div className="flex-1 flex flex-col items-center justify-center text-center">
                                <MessageSquare className="w-12 h-12 text-gray-300 mb-4" />
                                <p className="text-sm text-gray-500 max-w-xs">
                                    O histórico aparecerá aqui após criar a tarefa
                                </p>
                            </div>
                        ) : (
                            <>
                                {/* Header da Coluna */}
                                <h3 className="text-sm font-semibold text-gray-700 mb-4">
                                    Contexto Original (WhatsApp)
                                </h3>

                                {/* Card de Origem */}
                                {task?.contextMessage && (
                                    <div className="mb-6">
                                        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
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
                                            {isLoadingDetails ? (
                                                <div className="space-y-4 py-2">
                                                    {[1, 2, 3].map((i) => (
                                                        <div key={i} className="flex gap-3 relative z-10">
                                                            <div className="w-2 h-2 rounded-full bg-gray-200 mt-2 shrink-0 animate-pulse" />
                                                            <div className="flex-1 space-y-2">
                                                                <div className="flex items-center gap-2">
                                                                    <div className="w-24 h-4 bg-gray-100 rounded animate-pulse" />
                                                                    <div className="w-16 h-3 bg-gray-100 rounded animate-pulse" />
                                                                </div>
                                                                <div className="w-full h-10 bg-gray-50 rounded-lg animate-pulse border border-gray-100" />
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                activities.length === 0 ? (
                                                    <div className="text-center py-8 text-sm text-gray-400">
                                                        Nenhuma atividade ainda
                                                    </div>
                                                ) : (
                                                    activities.map((activity) => (
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
                                                                    {activity.type === "audio" && "enviou um áudio"}
                                                                </p>
                                                                {activity.type === "audio" ? (
                                                                    <div className="mt-2">
                                                                        <AudioMessageBubble
                                                                            duration={activity.audio?.duration || 14}
                                                                            isOwnMessage={false}
                                                                            audioUrl={activity.audio?.url}
                                                                        />
                                                                    </div>
                                                                ) : (
                                                                    <>
                                                                {activity.message && (
                                                                    <p className="text-gray-600 mt-1">{activity.message}</p>
                                                                        )}
                                                                    </>
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
                                                    ))
                                                )
                                            )}
                                        </div>
                                    </div>

                                    {/* Input de Comentário */}
                                    <div className="pt-4 border-t border-gray-200">
                                        {!isRecording ? (
                                            <>
                                                <div className="relative">
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
                                                        className="pr-32"
                                        />
                                                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                                            className="h-8 w-8 text-gray-400 hover:text-green-600"
                                            onClick={() => {}}
                                        >
                                            <Paperclip className="h-4 w-4" />
                                        </Button>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-gray-400 hover:text-red-500"
                                                            onClick={startRecording}
                                                        >
                                                            <Mic className="h-4 w-4" />
                                                        </Button>
                                        <Button
                                            onClick={handleSendComment}
                                            size="icon"
                                                            className="h-8 w-8 bg-green-600 hover:bg-green-700"
                                                            disabled={!comment.trim()}
                                        >
                                            <Send className="h-4 w-4" />
                                        </Button>
                                                    </div>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                {/* Estado de Gravação */}
                                                <div className="flex-1 flex items-center gap-3 px-4 py-2 bg-red-50 border border-red-200 rounded-md">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                                                        <span className="text-sm font-medium text-red-700">
                                                            Gravando...
                                                        </span>
                                                    </div>
                                                    <div className="flex-1 flex items-center justify-center gap-2">
                                                        {/* Visualização de onda fake */}
                                                        <div className="flex items-end gap-1 h-6">
                                                            <div className="w-1 bg-red-400 rounded-full animate-pulse" style={{ height: "40%" }} />
                                                            <div className="w-1 bg-red-500 rounded-full animate-pulse" style={{ height: "70%" }} />
                                                            <div className="w-1 bg-red-400 rounded-full animate-pulse" style={{ height: "50%" }} />
                                                            <div className="w-1 bg-red-500 rounded-full animate-pulse" style={{ height: "80%" }} />
                                                            <div className="w-1 bg-red-400 rounded-full animate-pulse" style={{ height: "60%" }} />
                                                        </div>
                                                        <span className="text-sm font-mono text-red-700 min-w-[50px] text-center">
                                                            {formatTime(recordingTime)}
                                                        </span>
                                                    </div>
                                                </div>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-10 w-10 text-red-500 hover:text-red-700 hover:bg-red-50"
                                                    onClick={cancelRecording}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    type="button"
                                                    size="icon"
                                                    className="h-10 w-10 bg-green-600 hover:bg-green-700"
                                                    onClick={async () => {
                                                        stopRecording();
                                                        // Aguardar um pouco para o blob ser gerado
                                                        setTimeout(() => {
                                                            if (audioChunks.length > 0) {
                                                                const audioBlob = new Blob(audioChunks, { type: "audio/webm" });
                                                                handleUploadAudio(audioBlob);
                                                            }
                                                        }, 100);
                                                    }}
                                                >
                                                    <Check className="h-4 w-4" />
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
                
                {/* Footer com Botão de Ação */}
                <div className="border-t border-gray-100 px-6 py-4 flex justify-end">
                    {isCreateMode ? (
                        <Button
                            onClick={handleCreate}
                            disabled={!title.trim() || isCreating}
                            className="bg-green-600 hover:bg-green-700 text-white"
                        >
                            {isCreating ? "Criando..." : "Criar Tarefa"}
                        </Button>
                    ) : (
                        <Button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="bg-green-600 hover:bg-green-700 text-white"
                        >
                            {isSaving ? "Salvando..." : "Salvar"}
                        </Button>
                    )}
                </div>
                </DialogPrimitive.Content>
            </DialogPortal>
        </Dialog>
    );
}

