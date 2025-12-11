"use client";

import { useState, useCallback, useRef, useEffect, memo, useMemo } from "react";
import { useDropzone } from "react-dropzone";
import { useFileUpload } from "@/hooks/use-file-upload";
import { useTaskCache } from "@/hooks/use-task-cache";
import { saveAttachment, deleteAttachment } from "@/lib/actions/attachments";
import { 
    getTaskDetails,
    getTaskBasicDetails,
    getTaskExtendedDetails,
    addComment, 
    updateTaskField, 
    updateTaskFields,
    updateTaskTags,
    updateTaskSubtasks,
    uploadAudioComment,
    updateAudioTranscription,
    generateTaskShareLink
} from "@/lib/actions/task-details";
import { getWorkspaceMembers } from "@/lib/actions/tasks";
import { mapStatusToLabel, STATUS_TO_LABEL, ORDERED_STATUSES, TASK_CONFIG, TASK_STATUS, TaskStatus } from "@/lib/config/tasks";
import {
    Dialog,
    DialogHeader,
    DialogPortal,
    DialogOverlay,
    DialogTitle,
} from "@/components/ui/dialog";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
    Maximize2,
    Minimize2,
    MoreVertical,
    ChevronRight,
    Play,
    MessageSquare,
    User,
    Plus,
    Send,
    Pencil,
    Copy,
    Paperclip,
    UploadCloud,
    FileImage,
    FileText,
    Trash2,
    Mic,
    Check,
    ChevronDown,
    X,
    Monitor,
    Loader2,
    Share2,
    Globe,
    Lock,
    Square,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { AudioMessageBubble } from "@/components/tasks/AudioMessageBubble";
import { AttachmentCard } from "@/components/tasks/AttachmentCard";
import { Editor } from "@/components/ui/editor";
import { TaskMembersPicker } from "@/components/tasks/pickers/TaskMembersPicker";
import { addTaskMember, removeTaskMember } from "@/lib/actions/task-members";
import { TaskDatePicker } from "@/components/tasks/pickers/TaskDatePicker";
import { TaskImageLightbox } from "@/components/tasks/TaskImageLightbox";
import { CreateTaskFromAudioModal } from "@/components/tasks/CreateTaskFromAudioModal";
import { ConfirmModal } from "@/components/modals/confirm-modal";
import { toast } from "sonner";
import { createBrowserClient } from "@/lib/supabase/client";

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------

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
    type: "created" | "commented" | "updated" | "file_shared" | "audio" | "origin";
    user: string;
    message?: string;
    timestamp: string;
    file?: {
        name: string;
        type: "image" | "pdf" | "other";
        size: string;
    };
    attachedFiles?: Array<{
        name: string;
        type: "image" | "pdf" | "other";
        size: string;
    }>;
    audio?: {
        url?: string;
        duration?: number;
        transcription?: string;
    };
    origin?: {
        source: "whatsapp" | "web";
        content?: string;
    };
}

interface FileAttachment {
    id: string;
    name: string;
    type: "image" | "pdf" | "other";
    size: string;
    url?: string;
}

interface TaskDetailModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    mode?: "create" | "edit" | "view";
    onTaskCreated?: () => void;
    onTaskUpdated?: () => void;
    onTaskUpdatedOptimistic?: (taskId: string, updates: Partial<{
        title?: string;
        status?: string;
        dueDate?: string;
        priority?: string;
        assignees?: Array<{ name: string; avatar?: string; id?: string }>;
    }>) => void;
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
        workspaceId?: string | null;
        contextMessage?: {
            type: "audio" | "text";
            content: string;
            timestamp: string;
        };
        subTasks: SubTask[];
        activities: Activity[];
        attachments?: FileAttachment[];
    };
    initialDueDate?: string;
}

// ------------------------------------------------------------------
// Recording Visualizer Component
// ------------------------------------------------------------------

const RecordingVisualizer = ({ stream }: { stream: MediaStream }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationRef = useRef<number | undefined>(undefined);
    const analyserRef = useRef<AnalyserNode | undefined>(undefined);
    const sourceRef = useRef<MediaStreamAudioSourceNode | undefined>(undefined);

    useEffect(() => {
        if (!stream || !canvasRef.current) return;

        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const analyser = audioContext.createAnalyser();
        const source = audioContext.createMediaStreamSource(stream);

        analyser.fftSize = 256;
        source.connect(analyser);

        analyserRef.current = analyser;
        sourceRef.current = source;

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");

        const draw = () => {
            if (!ctx) return;
            animationRef.current = requestAnimationFrame(draw);

            analyser.getByteFrequencyData(dataArray);
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const bars = 32;
            const barGap = 2;
            const totalGap = (bars - 1) * barGap;
            const barWidth = (canvas.width - totalGap) / bars;
            
            let x = 0;
            const step = Math.floor(bufferLength / bars);

            for (let i = 0; i < bars; i++) {
                let sum = 0;
                for (let j = 0; j < step; j++) {
                    sum += dataArray[i * step + j];
                }
                const value = sum / step;
                const percent = value / 255;
                const height = Math.max(2, percent * (canvas.height * 0.8)); 
                ctx.fillStyle = percent > 0.4 ? "#ef4444" : "#fca5a5";
                const y = (canvas.height - height) / 2; 
                ctx.beginPath();
                ctx.roundRect(x, y, barWidth, height, 2);
                ctx.fill();
                x += barWidth + barGap;
            }
        };

        draw();

        return () => {
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
            if (sourceRef.current) sourceRef.current.disconnect();
            if (analyserRef.current) analyserRef.current.disconnect();
            if (audioContext.state !== "closed") audioContext.close();
        };
    }, [stream]);

    return <canvas ref={canvasRef} width={240} height={32} className="w-full h-full max-w-[240px]" />;
};

// ------------------------------------------------------------------
// Audio Recorder Display Component (Isolated Timer for Performance)
// ------------------------------------------------------------------

interface AudioRecorderDisplayProps {
    stream: MediaStream | null;
    onCancel: () => void;
    onStop: (duration: number) => void;
}

const AudioRecorderDisplay = memo(({ stream, onCancel, onStop }: AudioRecorderDisplayProps) => {
    const [recordingTime, setRecordingTime] = useState(0);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        interval = setInterval(() => {
            setRecordingTime(t => t + 1);
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const handleStop = () => {
        onStop(recordingTime);
    };

    return (
        <div className="flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="flex-1 flex items-center gap-3 px-4 py-2 bg-red-50 border border-red-200 rounded-md h-14">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse shrink-0" />
                <div className="flex-1 flex items-center justify-center gap-4">
                    <div className="flex-1 h-8 flex items-center justify-center">
                        {stream && <RecordingVisualizer stream={stream} />}
                    </div>
                    <span className="text-sm font-mono text-red-700 min-w-[50px] text-right">
                        {formatTime(recordingTime)}
                    </span>
                </div>
            </div>
            <Button
                variant="ghost"
                size="icon"
                className="text-red-500"
                onClick={onCancel}
                title="Cancelar gravação"
            >
                <Trash2 className="w-4 h-4" />
            </Button>
            <Button
                size="icon"
                className="bg-green-600 hover:bg-green-700"
                onClick={handleStop}
                title="Finalizar gravação"
            >
                <Check className="w-4 h-4" />
            </Button>
        </div>
    );
});

AudioRecorderDisplay.displayName = "AudioRecorderDisplay";

// Feature flag
const ENABLE_AUDIO_TO_TASK = false;
const COMMENTS_PAGE_SIZE = 50;

const formatActivityTimestamp = (iso: string) =>
    new Date(iso).toLocaleString("pt-BR", {
        dateStyle: "short",
        timeStyle: "medium",
    });

const mapCommentToActivityBase = (
    comment: any,
    currentUserId: string | null,
    currentUserName: string
): Activity => {
    const isCurrentUser = currentUserId && comment?.user?.id === currentUserId;
    const displayUser =
        isCurrentUser
            ? "Você"
            : comment?.user?.full_name || comment?.user?.email || currentUserName || "Sem nome";

    return {
        id: comment.id,
        type: comment.type === "comment" ? "commented" :
              comment.type === "file" ? "file_shared" :
              comment.type === "log" ? "updated" :
              comment.type === "audio" ? "audio" : "commented",
        user: displayUser,
        message: comment.type === "audio" ? undefined : comment.content,
        timestamp: formatActivityTimestamp(comment.created_at),
        attachedFiles: comment.metadata?.attachedFiles,
        audio: (comment.metadata?.audio_url || comment.metadata?.url) ? {
            url: comment.metadata.audio_url || comment.metadata.url,
            duration: comment.metadata.duration,
            transcription: comment.metadata.transcription,
        } : undefined,
    };
};

export function TaskDetailModal({ 
    open, 
    onOpenChange, 
    mode = "edit", 
    task, 
    initialDueDate,
    onTaskCreated,
    onTaskUpdated,
    onTaskUpdatedOptimistic,
}: TaskDetailModalProps) {
    const isCreateMode = mode === "create";
    const isViewMode = mode === "view";
    
    // State - Inicializar vazios para evitar flash de conteúdo antigo
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [status, setStatus] = useState<TaskStatus>("todo");
    const [dueDate, setDueDate] = useState(initialDueDate || "");
    const [assignee, setAssignee] = useState<{ id: string; name: string; avatar?: string } | null>(null);
    const [subTasks, setSubTasks] = useState<SubTask[]>([]);
    const [newSubTask, setNewSubTask] = useState("");
    const [attachments, setAttachments] = useState<FileAttachment[]>([]);
    const [activities, setActivities] = useState<Activity[]>([]);
    const [comment, setComment] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [pendingAttachments, setPendingAttachments] = useState<FileAttachment[]>([]);
    const optimisticIdRef = useRef<string | null>(null); // Ref para rastrear ID do comentário otimista
    const activitiesScrollRef = useRef<HTMLDivElement>(null); // Ref para o container de scroll do histórico
    
    const [pendingFiles, setPendingFiles] = useState<File[]>([]); // Guardar File objects originais
    const [isEditingDescription, setIsEditingDescription] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
    const descriptionRef = useRef<HTMLDivElement>(null);
    const [showExpandButton, setShowExpandButton] = useState(false);
    const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [currentUserName, setCurrentUserName] = useState<string>("Você");
    const [isMaximized, setIsMaximized] = useState(false);
    const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
    const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const recordingTimeRef = useRef<number>(0);
    const finalDurationRef = useRef<number>(0); // Armazena duração final passada pelo AudioRecorderDisplay
    const mimeTypeRef = useRef<string>("audio/webm");
    const [createTaskModalOpen, setCreateTaskModalOpen] = useState(false);
    const [selectedAudioForTask, setSelectedAudioForTask] = useState<{ url: string; duration: number } | null>(null);
    const [transcribingActivityId, setTranscribingActivityId] = useState<string | null>(null);
    const [availableUsers, setAvailableUsers] = useState<Array<{ id: string; name: string; avatar?: string }>>([]);
    // Usuário atual para padronizar exibição de comentários
    useEffect(() => {
        const supabase = createBrowserClient();
        supabase.auth.getUser().then(({ data }) => {
            const user = data.user;
            if (user) {
                setCurrentUserId(user.id);
                const name =
                    (user.user_metadata as any)?.full_name ||
                    user.email ||
                    "Você";
                setCurrentUserName(name);
            }
        });
    }, []);

    const mapCommentToActivity = useCallback(
        (comment: any) => mapCommentToActivityBase(comment, currentUserId, currentUserName),
        [currentUserId, currentUserName]
    );
    // REGRA CRÍTICA: Se há um task?.id e não é create mode, SEMPRE começar em loading
    // Isso garante que o componente nasça em estado de carregamento, evitando flash de conteúdo vazio
    // Não importa se task tem outros dados - sempre precisamos buscar do backend
    const [isLoadingDetails, setIsLoadingDetails] = useState(() => {
        // Se não é create mode e há um ID, SEMPRE começar em loading
        if (!isCreateMode && task?.id) {
            return true;
        }
        return false;
    });
    // CRÍTICO: currentTaskId deve começar como null, não como task?.id
    // Isso força a verificação de dados carregados a funcionar corretamente
    // Só será definido quando os dados do backend forem carregados
    const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
    // Estado de "pronto" - só fica true quando os dados básicos do backend foram carregados
    // Isso garante que o formulário nunca seja renderizado antes dos dados básicos estarem prontos
    const [isDataReady, setIsDataReady] = useState(false);
    // Estados para carregamento progressivo de seções específicas
    const [isLoadingAttachments, setIsLoadingAttachments] = useState(false);
    const [isLoadingComments, setIsLoadingComments] = useState(false);
    const [hasMoreComments, setHasMoreComments] = useState(false);
    const [commentsOffset, setCommentsOffset] = useState(0);
    // NÃO inicializar com dados do task prop - sempre começar vazio para forçar loading
    const [localMembers, setLocalMembers] = useState<Array<{ id: string; name: string; avatar?: string }>>([]);
    const [tags, setTags] = useState<string[]>([]);
    const { uploadToStorage } = useFileUpload();
    const taskCache = useTaskCache(); // Hook de cache - deve ser chamado antes de usar taskCache
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [shareLinkType, setShareLinkType] = useState<"public" | "private">("public");
    const [shareLink, setShareLink] = useState<string>("");
    const [isGeneratingLink, setIsGeneratingLink] = useState(false);
    const [attachmentToDelete, setAttachmentToDelete] = useState<string | null>(null);

    // Derived - memoizado para melhor performance
    const imageAttachments = useMemo(() => 
        attachments
            .filter(att => att.type === "image")
            .map(att => ({ id: att.id, url: att.url || "", name: att.name })),
        [attachments]
    );
    
    // Helper para invalidar cache e notificar atualização (definido antes dos handlers que o usam)
    const invalidateCacheAndNotify = useCallback((
        taskId: string | null,
        optimisticUpdates?: Partial<{
            title?: string;
            status?: string;
            dueDate?: string;
            priority?: string;
            assignees?: Array<{ name: string; avatar?: string; id?: string }>;
        }>
    ) => {
        // ✅ OPTIMISTIC UI: Atualizar estado local primeiro
        if (taskId && optimisticUpdates && onTaskUpdatedOptimistic) {
            onTaskUpdatedOptimistic(taskId, optimisticUpdates);
        }
        // Invalidar cache
        if (taskId) {
            taskCache.invalidate(taskId);
        }
        // Notificar atualização (pode fazer refetch se necessário)
        onTaskUpdated?.();
    }, [taskCache, onTaskUpdated, onTaskUpdatedOptimistic]);
    
    // Memoizar handlers para evitar re-renders desnecessários
    const handleAttachmentDeleteClick = useCallback((id: string) => {
        setAttachmentToDelete(id);
    }, []);
    
    const confirmAttachmentDelete = useCallback(async () => {
        if (!attachmentToDelete) return;
        
        const id = attachmentToDelete;
        setAttachmentToDelete(null);
        
        try {
            if (currentTaskId) {
                await deleteAttachment(id);
                invalidateCacheAndNotify(currentTaskId);
            }
            setAttachments(prev => prev.filter(f => f.id !== id));
            toast.success("Arquivo excluído com sucesso");
        } catch (error) {
            console.error("Erro ao excluir arquivo:", error);
            toast.error("Erro ao excluir arquivo");
        }
    }, [attachmentToDelete, currentTaskId, invalidateCacheAndNotify]);
    
    const handleImagePreview = useCallback((index: number) => {
        setLightboxIndex(index);
    }, []);

    // Handler para gerar link de compartilhamento
    const handleGenerateShareLink = useCallback(async () => {
        if (!currentTaskId) return;
        
        setIsGeneratingLink(true);
        try {
            const result = await generateTaskShareLink(currentTaskId, shareLinkType);
            
            if (result.success && result.shareLink) {
                setShareLink(result.shareLink);
                // Copiar automaticamente para a área de transferência
                await navigator.clipboard.writeText(result.shareLink);
                toast.success(
                    shareLinkType === "public" 
                        ? "Link público gerado e copiado!" 
                        : "Link privado gerado e copiado!"
                );
            } else {
                toast.error(result.error || "Erro ao gerar link");
            }
        } catch (error) {
            console.error("Erro ao gerar link:", error);
            toast.error("Erro ao gerar link de compartilhamento");
        } finally {
            setIsGeneratingLink(false);
        }
    }, [currentTaskId, shareLinkType]);
    
    // Handler para visualizar transcrição (definido antes de renderedActivities que o usa)
    const handleViewTranscriptionRef = useRef<((activityId: string, audioUrl: string) => Promise<void>) | null>(null);
    
    const handleViewTranscription = useCallback(async (activityId: string, audioUrl: string) => {
        const activity = activities.find(a => a.id === activityId);
        if (activity?.audio?.transcription) {
            return;
        }
        
        setTranscribingActivityId(activityId);
        try {
            const response = await fetch(audioUrl);
            const blob = await response.blob();
            
            const formData = new FormData();
            formData.append("audio", blob, "audio.webm");

            const transcribeResponse = await fetch("/api/audio/transcribe", {
                method: "POST",
                body: formData,
            });

            if (!transcribeResponse.ok) {
                const error = await transcribeResponse.json();
                throw new Error(error.error || "Erro ao transcrever áudio");
            }

            const transcribeData = await transcribeResponse.json();
            const transcribedText = transcribeData.transcription || "";

            // Atualizar localmente
            setActivities(prev => prev.map(act => 
                act.id === activityId 
                    ? {
                        ...act,
                        audio: {
                            ...act.audio,
                            transcription: transcribedText
                        }
                    }
                    : act
            ));

            // Salvar transcrição no backend se tiver currentTaskId
            if (currentTaskId && !isCreateMode) {
                try {
                    const result = await updateAudioTranscription(activityId, transcribedText);
                    if (!result.success) {
                        console.error("Erro ao salvar transcrição:", result.error);
                    }
                } catch (error) {
                    console.error("Erro ao salvar transcrição no backend:", error);
                }
            }
        } catch (error) {
            console.error("Erro ao transcrever áudio:", error);
            toast.error("Erro ao transcrever áudio");
        } finally {
            setTranscribingActivityId(null);
        }
    }, [activities, currentTaskId, isCreateMode]);
    
    // Atualizar ref quando handleViewTranscription mudar
    handleViewTranscriptionRef.current = handleViewTranscription;
    
    // Memoizar lista de atividades renderizadas para melhor performance
    const renderedActivities = useMemo(() => {
        return activities.map((act: Activity) => (
            <div key={act.id} className="flex gap-3 text-sm relative group">
                <div className="flex-shrink-0 relative z-10 bg-gray-50 pt-2">
                    <div className="w-2 h-2 rounded-full bg-gray-300 ring-4 ring-gray-50" />
                </div>
                
                <div className="flex-1 pb-2">
                    {act.type === "origin" && act.origin && (
                        <div className="flex items-start gap-2">
                            <div className={cn(
                                "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                                act.origin.source === "whatsapp" ? "bg-green-100" : "bg-blue-100"
                            )}>
                                {act.origin.source === "whatsapp" ? (
                                    <MessageSquare className="w-4 h-4 text-green-600" />
                                ) : (
                                    <Monitor className="w-4 h-4 text-blue-600" />
                                )}
                            </div>
                            <div className="flex-1">
                                <p className="text-gray-700 mb-1">
                                    <span className="font-medium text-gray-900">Tarefa criada via </span>
                                    <span className="font-semibold text-gray-900">
                                        {act.origin.source === "whatsapp" ? "WhatsApp" : "App Web"}
                                    </span>
                                </p>
                                {act.origin.content && (
                                    <div className="bg-white p-2.5 rounded-lg border border-gray-200 mt-1.5 shadow-sm text-gray-600">
                                        "{act.origin.content}"
                                    </div>
                                )}
                                <p className="text-[10px] text-gray-400 mt-1">{act.timestamp}</p>
                            </div>
                        </div>
                    )}
                    
                    {act.type !== "origin" && (
                        <>
                            <p className="text-gray-700">
                                <span className="font-medium text-gray-900">{act.user}</span>{" "}
                                {act.type === "created" && "criou a tarefa"}
                                {act.type === "commented" && "comentou"}
                                {act.type === "updated" && "atualizou a tarefa"}
                                {act.type === "file_shared" && "enviou um arquivo"}
                                {act.type === "audio" && "enviou um áudio"}
                            </p>

                            {act.type === "audio" && (
                                <div className="mt-2 space-y-2">
                                    <div className="max-w-[240px]">
                                        <AudioMessageBubble 
                                            duration={act.audio?.duration || 0} 
                                            isOwnMessage={act.user === "Você"} 
                                            audioUrl={act.audio?.url} 
                                        />
                                    </div>
                                    {act.audio?.url && (
                                        <div className="space-y-2">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-xs text-gray-500 hover:text-gray-700"
                                                onClick={() => handleViewTranscriptionRef.current?.(act.id, act.audio!.url!)}
                                                disabled={transcribingActivityId === act.id}
                                            >
                                                {transcribingActivityId === act.id ? (
                                                    <>
                                                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                                        Transcrevendo...
                                                    </>
                                                ) : (
                                                    <>
                                                        <FileText className="w-3 h-3 mr-1" />
                                                        {act.audio?.transcription ? "Ver transcrição" : "Gerar transcrição"}
                                                    </>
                                                )}
                                            </Button>
                                            {act.audio?.transcription && (
                                                <div className="mt-2 p-3 border rounded-md bg-gray-50">
                                                    <p className="text-xs text-gray-600 whitespace-pre-wrap">
                                                        {act.audio.transcription}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {act.message && act.type !== "updated" && (
                                <div className="bg-white p-2.5 rounded-lg border border-gray-200 mt-1.5 shadow-sm text-gray-600">
                                    {act.message}
                                </div>
                            )}
                            
                            {act.attachedFiles && act.attachedFiles.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-2">
                                    {act.attachedFiles.map((f, idx) => (
                                        <div key={idx} className="p-2 bg-white rounded-md border border-gray-200 flex items-center gap-2 w-fit pr-4 hover:bg-gray-50 cursor-pointer transition-colors">
                                            {f.type === "image" ? <FileImage className="w-4 h-4 text-blue-500" /> : <FileText className="w-4 h-4 text-red-500" />}
                                            <div className="flex flex-col">
                                                <span className="text-xs font-medium">{f.name}</span>
                                                <span className="text-[10px] text-gray-400">{f.size}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {act.file && !act.attachedFiles && (
                                <div className="mt-2 p-2 bg-white rounded-md border border-gray-200 flex items-center gap-2 w-fit pr-4 hover:bg-gray-50 cursor-pointer transition-colors">
                                    {act.file.type === "image" ? <FileImage className="w-4 h-4 text-blue-500" /> : <FileText className="w-4 h-4 text-red-500" />}
                                    <div className="flex flex-col">
                                        <span className="text-xs font-medium">{act.file.name}</span>
                                        <span className="text-[10px] text-gray-400">{act.file.size}</span>
                                    </div>
                                </div>
                            )}

                            {(act.type as Activity["type"]) !== "origin" && (
                                <p className="text-[10px] text-gray-400 mt-1">{act.timestamp}</p>
                            )}
                        </>
                    )}
                </div>
            </div>
        ));
    }, [activities, transcribingActivityId]);
    
    // REGRA CRÍTICA: Determinar se deve mostrar skeleton
    // Com carregamento progressivo, mostramos skeleton apenas quando dados básicos não estão prontos
    // Dados básicos prontos = isDataReady === true
    // Removida dependência de task?.id para evitar flash branco quando task ainda não está disponível
    const shouldShowSkeleton = open && !isCreateMode && !isDataReady;
    
    // Determinar quais seções ainda estão carregando
    const showAttachmentsSkeleton = isLoadingAttachments;
    const showCommentsSkeleton = isLoadingComments;

    // Scroll automático para o final do histórico quando atividades mudarem ou modal abrir
    const activitiesLength = activities.length;
    useEffect(() => {
        if (!open) return;
        if (!activitiesScrollRef.current) return;
        if (activitiesLength === 0) return;
        
        // Usar requestAnimationFrame para garantir que o DOM foi atualizado após render
        requestAnimationFrame(() => {
            if (activitiesScrollRef.current) {
                activitiesScrollRef.current.scrollTop = activitiesScrollRef.current.scrollHeight;
            }
        });
    }, [activitiesLength, open]);

    // Limpar estados quando task.id mudar ou modal fechar
    // Este useEffect deve rodar ANTES de qualquer renderização do formulário
    useEffect(() => {
        if (!open) {
            // Limpar tudo quando modal fecha
            setTitle("");
            setDescription("");
            setStatus("todo");
            setDueDate("");
            setTags([]);
            setSubTasks([]);
            setLocalMembers([]);
            setAttachments([]);
            setActivities([]);
            setCurrentTaskId(null);
            setIsLoadingDetails(false);
            setIsLoadingAttachments(false);
            setIsLoadingComments(false);
            setIsDataReady(false);
            return;
        }

        if (task?.id && !isCreateMode) {
            // Se a tarefa mudou OU ainda não temos currentTaskId, limpar estados e ativar loading
            // Isso garante que na primeira abertura do modal, sempre começamos em loading
            if (currentTaskId !== task.id || currentTaskId === null) {
                // Limpar TODOS os estados para evitar flash de conteúdo antigo
                setTitle("");
                setDescription("");
                setStatus("todo");
                setDueDate("");
                setTags([]);
                setSubTasks([]);
                setLocalMembers([]);
                setAttachments([]);
                setActivities([]);
                // NÃO definir currentTaskId aqui - será definido quando os dados forem carregados
                // setCurrentTaskId(task.id); // Removido - será definido após carregar dados
                // FORÇAR loading para true - dados do backend ainda não foram carregados
                setIsLoadingDetails(true);
                setIsLoadingAttachments(false);
                setIsLoadingComments(false);
                setIsDataReady(false);
            }
        } else if (open && isCreateMode) {
            // Modo create - não precisa de loading
            setIsLoadingDetails(false);
        }
    }, [open, task?.id ?? null, isCreateMode, currentTaskId]);

    // Load task details when modal opens - CARREGAMENTO PROGRESSIVO
    useEffect(() => {
        let active = true;

        if (open && !isCreateMode && task?.id) {
            // Reset estados de paginação
            setCommentsOffset(0);
            setHasMoreComments(false);

            const loadBasicData = async () => {
                try {
                    // Verificar cache primeiro
                    const cachedBasic = taskCache.getBasicData(task.id);
                    
                    if (cachedBasic) {
                        // Dados do cache - atualizar imediatamente
                        if (!active) return;
                        
                        setCurrentTaskId(cachedBasic.id);
                        setTitle(cachedBasic.title || "");
                        setDescription(cachedBasic.description || "");
                        setStatus(cachedBasic.status || "todo");
                        setDueDate(cachedBasic.due_date ? new Date(cachedBasic.due_date).toISOString().split("T")[0] : "");
                        
                        // Usar assignees do cache (já inclui task_members)
                        if ((cachedBasic as any).assignees && Array.isArray((cachedBasic as any).assignees)) {
                            setLocalMembers((cachedBasic as any).assignees.map((a: any) => ({
                                id: a.id,
                                name: a.name,
                                avatar: a.avatar,
                            })));
                        } else if (cachedBasic.assignee) {
                            // Fallback para assignee antigo (compatibilidade)
                            setLocalMembers([{
                                id: cachedBasic.assignee.id,
                                name: cachedBasic.assignee.full_name || cachedBasic.assignee.email || "Sem nome",
                                avatar: cachedBasic.assignee.avatar_url || undefined,
                            }]);
                        } else {
                            setLocalMembers([]);
                        }
                        
                        if (cachedBasic.origin_context?.tags) {
                            setTags(cachedBasic.origin_context.tags);
                        }
                        
                        setIsDataReady(true);
                        setIsLoadingDetails(false);
                        
                        // Carregar membros em background (não está no cache)
                        getWorkspaceMembers(task.workspaceId || null).then(members => {
                            if (active) {
                                setAvailableUsers(
                                    members.map((m: any) => ({
                                        id: m.id,
                                        name: m.full_name || m.email || "Sem nome",
                                        avatar: m.avatar_url || undefined,
                                    }))
                                );
                            }
                        });
                        
                        return; // Dados do cache, não precisa buscar do backend
                    }
                    
                    // FASE 1: Carregar dados básicos do backend (rápido)
                    const [basicDetails, members] = await Promise.all([
                        getTaskBasicDetails(task.id),
                        getWorkspaceMembers(task.workspaceId || null)
                    ]);
                    
                    if (!active) return;

                    if (basicDetails && active) {
                        // Verificar se ainda é a mesma tarefa antes de atualizar
                        if (basicDetails.id !== task.id) {
                            return;
                        }
                        
                        // Armazenar no cache
                        taskCache.setBasicData(task.id, basicDetails);
                        
                        // Atualizar dados básicos imediatamente
                        setCurrentTaskId(basicDetails.id);
                        setTitle(basicDetails.title || "");
                        setDescription(basicDetails.description || "");
                        setStatus(basicDetails.status || "todo");
                        setDueDate(basicDetails.due_date ? new Date(basicDetails.due_date).toISOString().split("T")[0] : "");
                        
                        // Usar assignees dos detalhes (já inclui task_members)
                        if ((basicDetails as any).assignees && Array.isArray((basicDetails as any).assignees)) {
                            setLocalMembers((basicDetails as any).assignees.map((a: any) => ({
                                id: a.id,
                                name: a.name,
                                avatar: a.avatar,
                            })));
                        } else if (basicDetails.assignee) {
                            // Fallback para assignee antigo (compatibilidade)
                            setLocalMembers([{
                                id: basicDetails.assignee.id,
                                name: basicDetails.assignee.full_name || basicDetails.assignee.email || "Sem nome",
                                avatar: basicDetails.assignee.avatar_url || undefined,
                            }]);
                        } else {
                            setLocalMembers([]);
                        }
                        
                        if (basicDetails.origin_context?.tags) {
                            setTags(basicDetails.origin_context.tags);
                        }

                        setAvailableUsers(
                            members.map((m: any) => ({
                                id: m.id,
                                name: m.full_name || m.email || "Sem nome",
                                avatar: m.avatar_url || undefined,
                            }))
                        );
                        
                        // Marcar dados básicos como prontos - formulário pode ser mostrado agora
                        setIsDataReady(true);
                        setIsLoadingDetails(false);
                    }
                } catch (error) {
                    if (active) {
                        console.error("Erro ao carregar dados básicos da tarefa:", error);
                        toast.error("Erro ao carregar detalhes da tarefa");
                        setIsLoadingDetails(false);
                        setIsDataReady(false);
                    }
                }
            };

            const loadExtendedData = async () => {
                try {
                    // Verificar cache primeiro
                    const cachedExtended = taskCache.getExtendedData(task.id);
                    
                    if (cachedExtended) {
                        // Dados do cache - atualizar imediatamente
                        if (!active) return;
                        
                        // Verificar se ainda é a mesma tarefa (mas não bloquear se currentTaskId ainda não foi definido)
                        if (currentTaskId !== null && currentTaskId !== task.id) {
                            return;
                        }
                        
                        // Atualizar anexos
                        const mappedAttachments: FileAttachment[] = cachedExtended.attachments.map((att) => ({
                            id: att.id,
                            name: att.file_name,
                            type: (att.file_type || "other") as "image" | "pdf" | "other",
                            size: att.file_size ? `${(att.file_size / 1024 / 1024).toFixed(1)} MB` : "0 MB",
                            url: att.file_url,
                        }));
                        setAttachments(mappedAttachments);
                        setIsLoadingAttachments(false);
                        
                        // Atualizar comentários
                        const mappedActivities: Activity[] = cachedExtended.comments.map(mapCommentToActivity);
                        setActivities(mappedActivities);
                        setIsLoadingComments(false);
                        
                        // Verificar se há mais comentários para carregar
                        setHasMoreComments(cachedExtended.comments.length >= COMMENTS_PAGE_SIZE);
                        setCommentsOffset(0); // Resetar offset quando usar cache
                        
                        // Atualizar subtarefas
                        if (cachedExtended.subtasks && Array.isArray(cachedExtended.subtasks)) {
                            setSubTasks(cachedExtended.subtasks);
                        }
                        
                        return; // Dados do cache, não precisa buscar do backend
                    }
                    
                    // FASE 2: Carregar dados estendidos do backend (anexos, comentários, subtarefas)
                    setIsLoadingAttachments(true);
                    setIsLoadingComments(true);
                    
                    const extendedDetails = await getTaskExtendedDetails(task.id, COMMENTS_PAGE_SIZE, 0);
                    
                    if (!active) return;

                    if (extendedDetails) {
                        // Verificar se ainda é a mesma tarefa (mas não bloquear se currentTaskId ainda não foi definido)
                        // Se currentTaskId ainda não foi definido, significa que estamos carregando pela primeira vez
                        if (currentTaskId !== null && currentTaskId !== task.id) {
                            setIsLoadingAttachments(false);
                            setIsLoadingComments(false);
                            return;
                        }
                        
                        // Armazenar no cache
                        taskCache.setExtendedData(task.id, extendedDetails);
                        
                        // Atualizar anexos
                        const mappedAttachments: FileAttachment[] = (extendedDetails.attachments || []).map((att) => ({
                            id: att.id,
                            name: att.file_name,
                            type: (att.file_type || "other") as "image" | "pdf" | "other",
                            size: att.file_size ? `${(att.file_size / 1024 / 1024).toFixed(1)} MB` : "0 MB",
                            url: att.file_url,
                        }));
                        setAttachments(mappedAttachments);
                        setIsLoadingAttachments(false);
                        
                        // Atualizar comentários
                        const mappedActivities: Activity[] = (extendedDetails.comments || []).map(mapCommentToActivity);
                        setActivities(mappedActivities);
                        setIsLoadingComments(false);
                        
                        // Verificar se há mais comentários para carregar
                        setHasMoreComments((extendedDetails.comments || []).length >= COMMENTS_PAGE_SIZE);
                        setCommentsOffset(0); // Resetar offset quando carregar dados iniciais
                        
                        // Atualizar subtarefas
                        if (extendedDetails.subtasks && Array.isArray(extendedDetails.subtasks)) {
                            setSubTasks(extendedDetails.subtasks);
                        }
                    } else {
                        // Se extendedDetails é null/undefined, não há dados para carregar
                        setAttachments([]);
                        setActivities([]);
                        setIsLoadingAttachments(false);
                        setIsLoadingComments(false);
                        setHasMoreComments(false);
                        setCommentsOffset(0);
                    }
                } catch (error) {
                    if (active) {
                        console.error("Erro ao carregar dados estendidos da tarefa:", error);
                        setIsLoadingAttachments(false);
                        setIsLoadingComments(false);
                    }
                }
            };
            
            // Carregar dados básicos primeiro, depois estendidos
            loadBasicData().then(() => {
                if (active) {
                    loadExtendedData();
                }
            });
        } else if (open && isCreateMode) {
            setTitle("");
            setDescription("");
            setStatus("todo");
            setDueDate(initialDueDate || "");
            setSubTasks([]);
            setAttachments([]);
            setActivities([]);
            setTags([]);
            setCurrentTaskId(null);
            setLocalMembers([]);
            
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
            active = false;
        };
    }, [open, isCreateMode, task?.id ?? null, initialDueDate]);


    // Audio recording timer removed - now handled by AudioRecorderDisplay component

    // Função para carregar mais comentários
    const loadMoreComments = useCallback(async () => {
        if (!currentTaskId || !hasMoreComments || isLoadingComments) return;
        
        setIsLoadingComments(true);
        try {
            const newOffset = commentsOffset + COMMENTS_PAGE_SIZE;
            const extendedDetails = await getTaskExtendedDetails(currentTaskId, COMMENTS_PAGE_SIZE, newOffset);
            
            if (extendedDetails && extendedDetails.comments.length > 0) {
                const mappedActivities: Activity[] = extendedDetails.comments.map(mapCommentToActivity);
                
                setActivities(prev => [...prev, ...mappedActivities]);
                setCommentsOffset(newOffset);
                setHasMoreComments(extendedDetails.comments.length >= COMMENTS_PAGE_SIZE);
            } else {
                setHasMoreComments(false);
            }
        } catch (error) {
            console.error("Erro ao carregar mais comentários:", error);
            toast.error("Erro ao carregar mais comentários");
        } finally {
            setIsLoadingComments(false);
        }
    }, [currentTaskId, hasMoreComments, isLoadingComments, commentsOffset]);

    // Função helper para recarregar atividades do banco
    const reloadActivities = useCallback(async (taskId: string) => {
        try {
            const extendedDetails = await getTaskExtendedDetails(taskId, COMMENTS_PAGE_SIZE, 0);
            if (extendedDetails) {
                const mappedActivities: Activity[] = (extendedDetails.comments || []).map(mapCommentToActivity);
                // Substituir completamente o estado base
                // Filtrar qualquer comentário otimista pendente antes de atualizar
                const optimisticIdToFilter = optimisticIdRef.current;
                const filteredActivities = optimisticIdToFilter 
                    ? mappedActivities.filter(act => act.id !== optimisticIdToFilter)
                    : mappedActivities;
                
                // Atualizar estado base - o useOptimistic automaticamente atualizará
                setActivities(filteredActivities);
                // Limpar ref do otimista após atualizar o estado
                optimisticIdRef.current = null;
                setHasMoreComments((extendedDetails.comments || []).length >= COMMENTS_PAGE_SIZE);
                setCommentsOffset(0);
            }
        } catch (error) {
            console.error("Erro ao recarregar atividades:", error);
        }
    }, []);

    // Handlers
    const handleStatusChange = async (newStatus: string) => {
        if (status === newStatus) return;
        const oldStatus = status; // Guardar valor antigo para rollback
        const oldLabel = STATUS_TO_LABEL[status];
        const newLabel = STATUS_TO_LABEL[newStatus as TaskStatus];
        
        // ✅ OPTIMISTIC UI: Atualizar estado ANTES da chamada ao servidor
        setStatus(newStatus as TaskStatus);
        
        if (currentTaskId && !isCreateMode) {
            // ✅ Atualizar TaskRowMinify imediatamente via optimistic update
            onTaskUpdatedOptimistic?.(currentTaskId, { status: newLabel });
            
            try {
                const result = await updateTaskField(currentTaskId, "status", newStatus);
                if (result.success) {
                    invalidateCacheAndNotify(currentTaskId, { status: newLabel });
                    // Recarregar atividades do banco para garantir que o log foi persistido
                    await reloadActivities(currentTaskId);
                    toast.success(`Status alterado para ${newLabel}`);
                } else {
                    // ✅ REVERTER se falhar
                    setStatus(oldStatus);
                    onTaskUpdatedOptimistic?.(currentTaskId, { status: oldLabel });
                    toast.error(result.error || "Erro ao alterar status");
                }
            } catch (error) {
                // ✅ REVERTER em caso de exceção
                console.error("Erro ao alterar status:", error);
                setStatus(oldStatus);
                onTaskUpdatedOptimistic?.(currentTaskId, { status: oldLabel });
                toast.error("Erro ao alterar status");
            }
        } else {
            toast.success(`Status alterado para ${newLabel}`);
        }
    };

    const handleAddSubTask = async () => {
        if (!newSubTask.trim()) return;
        const newItem: SubTask = {
            id: `st-${Date.now()}`,
            title: newSubTask,
            completed: false
        };
        
        const updatedSubTasks = [...subTasks, newItem];
        setSubTasks(updatedSubTasks);
        setNewSubTask("");
        
        if (currentTaskId && !isCreateMode) {
            try {
                // Salvar valor antigo para o log
                const oldSubtasks = subTasks;
                const result = await updateTaskSubtasks(currentTaskId, updatedSubTasks);
                if (result.success) {
                    invalidateCacheAndNotify(currentTaskId);
                    // Criar log manual para subtarefas (updateTaskSubtasks não cria log diretamente)
                    await addComment(
                        currentTaskId,
                        `adicionou a sub-tarefa: "${newItem.title}"`,
                        {
                            field: "subtasks",
                            action: "subtask_added",
                            subtask_title: newItem.title
                        },
                        "log"
                    );
                    // Recarregar atividades do banco
                    await reloadActivities(currentTaskId);
                } else {
                    toast.error(result.error || "Erro ao salvar sub-tarefa");
                    // Reverter se falhar
                    setSubTasks(oldSubtasks);
                }
            } catch (error) {
                console.error("Erro ao salvar sub-tarefa:", error);
                toast.error("Erro ao salvar sub-tarefa");
                // Reverter se falhar
                setSubTasks(subTasks);
            }
        } else {
            // Modo create - apenas adicionar localmente
            setActivities(prev => [{
                id: `act-${Date.now()}`,
                type: "updated",
                user: "Você",
                message: `adicionou a sub-tarefa: "${newItem.title}"`,
                timestamp: "Agora mesmo"
            }, ...prev]);
        }
    };

    const handleToggleSubTask = async (id: string) => {
        const task = subTasks.find(t => t.id === id);
        if (!task) return;
        
        const newCompleted = !task.completed;
        const oldSubtasks = subTasks;
        const updated = subTasks.map(t => t.id === id ? { ...t, completed: newCompleted } : t);
        setSubTasks(updated);
        
        if (currentTaskId && !isCreateMode) {
            try {
                const result = await updateTaskSubtasks(currentTaskId, updated);
                if (result.success) {
                    invalidateCacheAndNotify(currentTaskId);
                    // Criar log manual para subtarefas
                    await addComment(
                        currentTaskId,
                        `${newCompleted ? "concluiu" : "reabriu"} a sub-tarefa: "${task.title}"`,
                        {
                            field: "subtasks",
                            action: newCompleted ? "subtask_completed" : "subtask_reopened",
                            subtask_title: task.title
                        },
                        "log"
                    );
                    // Recarregar atividades do banco
                    await reloadActivities(currentTaskId);
                } else {
                    toast.error(result.error || "Erro ao salvar sub-tarefa");
                    // Reverter se falhar
                    setSubTasks(oldSubtasks);
                }
            } catch (error) {
                console.error("Erro ao salvar sub-tarefa:", error);
                toast.error("Erro ao salvar sub-tarefa");
                // Reverter se falhar
                setSubTasks(oldSubtasks);
            }
        } else {
            setActivities(prev => [{
                id: `act-${Date.now()}`,
                type: "updated",
                user: "Você",
                message: `${newCompleted ? "concluiu" : "reabriu"} a sub-tarefa: "${task.title}"`,
                timestamp: "Agora mesmo"
            }, ...prev]);
        }
    };

    const handleSendComment = async () => {
        if (!comment.trim() && pendingAttachments.length === 0) return;
        if (!currentTaskId && !isCreateMode) return;
        if (isSubmitting) return; // Prevenir múltiplos envios

        const commentText = comment.trim() || (pendingAttachments.length > 0 ? "Anexo compartilhado" : "");
        const attachedFiles = pendingAttachments.map(f => ({
            name: f.name,
            type: f.type,
            size: f.size
        }));

        if (currentTaskId && !isCreateMode) {
            setIsSubmitting(true);
            
            // Adicionar comentário otimista no estado base (order ASC: adicionamos ao final)
            const optimisticId = `optimistic-${Date.now()}`;
            optimisticIdRef.current = optimisticId;
            const optimisticDisplayUser = currentUserId ? "Você" : currentUserName;
            const optimisticActivity: Activity = {
                id: optimisticId,
                type: pendingAttachments.length > 0 ? "file_shared" : "commented",
                user: optimisticDisplayUser,
                message: commentText,
                timestamp: formatActivityTimestamp(new Date().toISOString()),
                attachedFiles: attachedFiles.length > 0 ? attachedFiles : undefined,
            };
            setActivities(prev => [...prev, optimisticActivity]);

            // Toast otimista - aparece imediatamente sincronizado com optimistic UI
            toast.success(pendingAttachments.length > 0 ? "Comentário com anexos enviado" : "Comentário enviado");

            try {
                // Primeiro, fazer upload dos arquivos se houver
                const uploadedFileUrls: string[] = [];
                if (pendingFiles.length > 0) {
                    for (const file of pendingFiles) {
                        try {
                            const uploadResult = await uploadToStorage(file, "task-files");
                            if (uploadResult.success && uploadResult.url) {
                                // Salvar anexo na tabela task_attachments
                                const saveResult = await saveAttachment({
                                    taskId: currentTaskId,
                                    fileUrl: uploadResult.url,
                                    fileName: file.name,
                                    fileType: file.type,
                                    fileSize: file.size,
                                    filePath: uploadResult.path,
                                });
                                
                                if (saveResult.success) {
                                    uploadedFileUrls.push(uploadResult.url);
                                } else {
                                    console.error("Erro ao salvar anexo:", saveResult.error);
                                }
                            } else {
                                console.error("Erro ao fazer upload:", uploadResult.error);
                                toast.error(`Erro ao fazer upload de ${file.name}`);
                            }
                        } catch (error) {
                            console.error(`Erro ao processar arquivo ${file.name}:`, error);
                            toast.error(`Erro ao processar ${file.name}`);
                        }
                    }
                }

                // Salvar comentário com metadata dos anexos
                const commentType = pendingAttachments.length > 0 ? "file" : "comment";
                const result = await addComment(
                    currentTaskId, 
                    commentText,
                    {
                        attachedFiles: attachedFiles.length > 0 ? attachedFiles : undefined
                    },
                    commentType as any
                );
                
                if (!result.success) {
                    // Em caso de erro, mostrar toast de erro (substitui o toast otimista)
                    toast.error(result.error || "Erro ao criar comentário");
                    // Remover comentário otimista antes de recarregar
                    const optimisticIdToRemove = optimisticIdRef.current;
                    if (optimisticIdToRemove) {
                        setActivities(prev => prev.filter(act => act.id !== optimisticIdToRemove));
                        optimisticIdRef.current = null;
                    }
                    await reloadActivities(currentTaskId);
                    return;
                }

                // Buscar comentários reais e substituir estado em uma única atualização (sem gap)
                const extendedDetails = await getTaskExtendedDetails(currentTaskId, COMMENTS_PAGE_SIZE, 0);
                if (extendedDetails) {
                    const mappedActivities: Activity[] = (extendedDetails.comments || []).map(mapCommentToActivity);
                    setActivities(mappedActivities);
                    setHasMoreComments((extendedDetails.comments || []).length >= COMMENTS_PAGE_SIZE);
                    setCommentsOffset(0);
                    optimisticIdRef.current = null;
                } else {
                    // fallback: remover otimista se não conseguir recarregar
                    const optimisticIdToRemove = optimisticIdRef.current;
                    if (optimisticIdToRemove) {
                        setActivities(prev => prev.filter(act => act.id !== optimisticIdToRemove));
                        optimisticIdRef.current = null;
                    }
                }
                
                // Atualizar anexos também
                const taskDetails = await getTaskDetails(currentTaskId);
                if (taskDetails) {
                    const mappedAttachments: FileAttachment[] = taskDetails.attachments.map((att) => ({
                        id: att.id,
                        name: att.file_name,
                        type: (att.file_type || "other") as "image" | "pdf" | "other",
                        size: att.file_size ? `${(att.file_size / 1024 / 1024).toFixed(1)} MB` : "0 MB",
                        url: att.file_url,
                    }));
                    setAttachments(mappedAttachments);
                }

                // Só limpar input se sucesso (toast já foi mostrado otimista)
                setComment("");
                setPendingAttachments([]);
                setPendingFiles([]); // Limpar File objects também
                invalidateCacheAndNotify(currentTaskId);
            } catch (error) {
                console.error("Erro ao criar comentário:", error);
                toast.error("Erro ao criar comentário");
                // Remover comentário otimista em caso de erro
                const optimisticIdToRemove = optimisticIdRef.current;
                if (optimisticIdToRemove) {
                    setActivities(prev => prev.filter(act => act.id !== optimisticIdToRemove));
                    optimisticIdRef.current = null;
                }
                await reloadActivities(currentTaskId);
            } finally {
                setIsSubmitting(false);
            }
        } else {
            // Modo create - apenas adicionar localmente
            if (pendingAttachments.length > 0) {
                setAttachments(prev => [...prev, ...pendingAttachments]);
            }

            setActivities(prev => [{
                id: `act-${Date.now()}`,
                type: pendingAttachments.length > 0 ? "file_shared" : "commented",
                user: "Você",
                message: commentText,
                attachedFiles: attachedFiles.length > 0 ? attachedFiles : undefined,
                timestamp: "Agora mesmo"
            }, ...prev]);

            setComment("");
            setPendingAttachments([]);
            setPendingFiles([]); // Limpar File objects também
        }
    };

    const handleCommentFileUpload = (files: File[]) => {
        const newAttachments: FileAttachment[] = files.map(file => {
            const isImage = file.type.startsWith("image/");
            const isPdf = file.type === "application/pdf";
            return {
                id: `p-${Date.now()}-${file.name}`,
                name: file.name,
                type: isImage ? "image" : isPdf ? "pdf" : "other",
                size: `${(file.size / 1024).toFixed(0)} KB`,
                url: isImage ? URL.createObjectURL(file) : undefined
            };
        });
        setPendingAttachments(prev => [...prev, ...newAttachments]);
        setPendingFiles(prev => [...prev, ...files]); // Guardar File objects originais
    };

    const handleMainFileUpload = async (files: File[]) => {
        if (!currentTaskId && !isCreateMode) {
            toast.error("Crie a tarefa primeiro");
            return;
        }

        for (const file of files) {
            const isImage = file.type.startsWith("image/");
            const isPdf = file.type === "application/pdf";
            const type = isImage ? "image" : isPdf ? "pdf" : "other";
            
            try {
                if (currentTaskId) {
                    const result = await uploadToStorage(file, "task-files");
                    if (result.success && result.url) {
                        await saveAttachment({
                            taskId: currentTaskId,
                            fileUrl: result.url,
                            fileName: file.name,
                            fileType: file.type,
                            fileSize: file.size,
                        });
                        
                        const newFile: FileAttachment = {
                            id: `f-${Date.now()}`,
                            name: file.name,
                            type,
                            size: `${(file.size / 1024).toFixed(0)} KB`,
                            url: result.url
                        };
                        
                        setAttachments(prev => [...prev, newFile]);
                    }
                }
            } catch (error) {
                console.error("Erro ao fazer upload:", error);
                toast.error("Erro ao fazer upload do arquivo");
            }
        }
        
        // Recarregar atividades do banco para garantir que logs de upload foram criados
        if (currentTaskId) {
            await reloadActivities(currentTaskId);
            // Recarregar anexos também
            const taskDetails = await getTaskDetails(currentTaskId);
            if (taskDetails) {
                const mappedAttachments: FileAttachment[] = taskDetails.attachments.map((att) => ({
                    id: att.id,
                    name: att.file_name,
                    type: (att.file_type || "other") as "image" | "pdf" | "other",
                    size: att.file_size ? `${(att.file_size / 1024 / 1024).toFixed(1)} MB` : "0 MB",
                    url: att.file_url,
                }));
                setAttachments(mappedAttachments);
            }
        }
        
        toast.success(`${files.length} arquivo(s) adicionado(s)`);
        invalidateCacheAndNotify(currentTaskId);
    };

    const { getRootProps, getInputProps, isDragActive, open: openFileUpload } = useDropzone({
        onDrop: handleMainFileUpload,
        noClick: false
    });

    const { getRootProps: getCommentRootProps, getInputProps: getCommentInputProps, open: openCommentUpload } = useDropzone({
        onDrop: handleCommentFileUpload,
        noClick: true,
        noKeyboard: true
    });

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            audioChunksRef.current = [];
            recordingTimeRef.current = 0;
            
            const mimeType = MediaRecorder.isTypeSupported('audio/webm') 
                ? 'audio/webm' 
                : MediaRecorder.isTypeSupported('audio/mp4') 
                ? 'audio/mp4' 
                : 'audio/ogg';
            
            mimeTypeRef.current = mimeType;
            
            const recorder = new MediaRecorder(stream, { mimeType });
            
            recorder.ondataavailable = (e) => {
                if (e.data && e.data.size > 0) {
                    audioChunksRef.current.push(e.data);
                }
            };
            
            recorder.onstop = async () => {
                if (audioChunksRef.current.length > 0) {
                    const blob = new Blob(audioChunksRef.current, { type: mimeTypeRef.current });
                    const url = URL.createObjectURL(blob);
                    const finalDuration = finalDurationRef.current || recordingTimeRef.current || 1;
                    
                    if (currentTaskId && !isCreateMode) {
                        try {
                            const formData = new FormData();
                            formData.append("audio", blob, "audio.webm");
                            formData.append("duration", finalDuration.toString());
                            
                            const result = await uploadAudioComment(currentTaskId, formData);
                            if (result.success && result.data) {
                                // Recarregar atividades do banco para garantir que está salvo
                                await reloadActivities(currentTaskId);
                                
                                toast.success(`Áudio enviado (${finalDuration}s)`);
                                invalidateCacheAndNotify(currentTaskId);
                            } else {
                                toast.error(result.error || "Erro ao enviar áudio");
                            }
                        } catch (error) {
                            console.error("Erro ao enviar áudio:", error);
                            toast.error("Erro ao enviar áudio");
                        }
                    } else {
                        // Modo create - apenas adicionar localmente
                        setActivities(prev => [{
                            id: `act-${Date.now()}`,
                            type: "audio",
                            user: "Você",
                            timestamp: "Agora mesmo",
                            audio: { duration: finalDuration, url }
                        }, ...prev]);
                        toast.success(`Áudio enviado (${finalDuration}s)`);
                    }
                }
                
                stream.getTracks().forEach(track => track.stop());
                setMediaStream(null);
                setMediaRecorder(null);
                recordingTimeRef.current = 0;
                finalDurationRef.current = 0;
                audioChunksRef.current = [];
            };
            
            recorder.onerror = (e) => {
                console.error("Erro no MediaRecorder:", e);
                toast.error("Erro ao gravar áudio");
            };
            
            recorder.start(100);
            
            setMediaRecorder(recorder);
            setMediaStream(stream);
            setIsRecording(true);
            finalDurationRef.current = 0;
        } catch (error) {
            console.error("Erro ao acessar microfone:", error);
            toast.error("Permissão de microfone necessária para gravar.");
        }
    };

    const handleStopRecording = (duration: number) => {
        if (mediaRecorder && mediaRecorder.state !== "inactive") {
            finalDurationRef.current = duration;
            recordingTimeRef.current = duration;
            mediaRecorder.stop();
        }
        setIsRecording(false);
    };

    const handleCancelRecording = () => {
        if (mediaRecorder && mediaRecorder.state !== "inactive") {
            mediaRecorder.onstop = null;
            mediaRecorder.stop();
        }
        
        if (mediaStream) {
            mediaStream.getTracks().forEach(track => track.stop());
            setMediaStream(null);
        }
        
        setMediaRecorder(null);
        setIsRecording(false);
        finalDurationRef.current = 0;
        recordingTimeRef.current = 0;
        audioChunksRef.current = [];
    };

    // formatTime removido - agora está no AudioRecorderDisplay

    // Constante para limite de caracteres na descrição
    const MAX_DESCRIPTION_LENGTH = 3000;

    // Função auxiliar para extrair texto puro do HTML (strip tags)
    const stripHtmlTags = (html: string): string => {
        if (!html) return "";
        const tmp = document.createElement("DIV");
        tmp.innerHTML = html;
        return tmp.textContent || tmp.innerText || "";
    };

    // Contar caracteres do texto puro (sem HTML)
    const getDescriptionCharCount = useMemo(() => {
        return stripHtmlTags(description).length;
    }, [description]);

    const isDescriptionOverLimit = getDescriptionCharCount > MAX_DESCRIPTION_LENGTH;

    // Detectar se o conteúdo excede 160px de altura (para mostrar botão "Ver mais")
    useEffect(() => {
        if (!isEditingDescription && descriptionRef.current) {
            const element = descriptionRef.current;
            // Resetar altura para medir o tamanho real
            element.style.maxHeight = "none";
            const height = element.scrollHeight;
            element.style.maxHeight = "";
            
            // Se altura real > 160px (40 * 4px = 160px), mostrar botão
            setShowExpandButton(height > 160);
        } else {
            setShowExpandButton(false);
        }
    }, [description, isEditingDescription]);

    // Handler memoizado para salvar descrição
    const handleSaveDescription = useCallback(async () => {
        setIsDescriptionExpanded(false);
        setIsEditingDescription(false);
        if (currentTaskId && !isCreateMode) {
            const oldDescription = description; // Guardar para rollback
            try {
                const result = await updateTaskField(currentTaskId, "description", description);
                if (result.success) {
                    invalidateCacheAndNotify(currentTaskId);
                    await reloadActivities(currentTaskId);
                } else {
                    // ✅ REVERTER se falhar
                    setDescription(oldDescription);
                    toast.error(result.error || "Erro ao salvar descrição");
                }
            } catch (error) {
                // ✅ REVERTER em caso de exceção
                console.error("Erro ao salvar descrição:", error);
                setDescription(oldDescription);
                toast.error("Erro ao salvar descrição");
            }
        }
    }, [currentTaskId, isCreateMode, description, invalidateCacheAndNotify, reloadActivities]);

    const handleMembersChange = async (memberIds: string[]) => {
        if (!currentTaskId || isCreateMode) return;
        
        const oldMembers = [...localMembers];
        const oldMemberIds = oldMembers.map(m => m.id);
        
        // Determinar membros adicionados e removidos
        const added = memberIds.filter(id => !oldMemberIds.includes(id));
        const removed = oldMemberIds.filter(id => !memberIds.includes(id));

        // Construir array de membros atualizado para optimistic UI
        const newMembers = memberIds.map(id => {
            const member = availableUsers.find(u => u.id === id);
            return member ? { id: member.id, name: member.name, avatar: member.avatar } : null;
        }).filter(Boolean) as Array<{ id: string; name: string; avatar?: string }>;
        
        // Atualizar UI imediatamente
        setLocalMembers(newMembers);
        
        // ✅ Atualizar TaskRowMinify imediatamente via optimistic update
        onTaskUpdatedOptimistic?.(currentTaskId, { assignees: newMembers });
        
        try {
            // Adicionar novos membros
            const addPromises = added.map(userId => addTaskMember(currentTaskId, userId));
            // Remover membros
            const removePromises = removed.map(userId => removeTaskMember(currentTaskId, userId));

            const results = await Promise.all([...addPromises, ...removePromises]);
            const hasError = results.some(r => !r.success);
            
            if (hasError) {
                // ✅ REVERTER se falhar
                setLocalMembers(oldMembers);
                onTaskUpdatedOptimistic?.(currentTaskId, { assignees: oldMembers });
                toast.error("Erro ao atualizar membros");
            } else {
                invalidateCacheAndNotify(currentTaskId, { assignees: newMembers });
                // Recarregar apenas atividades (não precisa recarregar dados básicos)
                await reloadActivities(currentTaskId);
                const changeCount = added.length + removed.length;
                toast.success(changeCount === 1 ? "Membro atualizado" : `${changeCount} membros atualizados`);
            }
        } catch (error) {
            // ✅ REVERTER em caso de exceção
            console.error("Erro ao atualizar membros:", error);
            setLocalMembers(oldMembers);
            onTaskUpdatedOptimistic?.(currentTaskId, { assignees: oldMembers });
            toast.error("Erro ao atualizar membros");
        }
    };

    // Helper para converter string YYYY-MM-DD para Date no timezone local
    // Isso evita o problema de timezone onde new Date("YYYY-MM-DD") interpreta como UTC
    const parseLocalDate = (dateString: string): Date => {
        const [year, month, day] = dateString.split('-').map(Number);
        return new Date(year, month - 1, day);
    };

    const handleDueDateChange = async (date: Date | null) => {
        const dateString = date ? date.toISOString().split("T")[0] : "";
        const oldDate = dueDate;
        setDueDate(dateString);
        
        if (currentTaskId && !isCreateMode) {
            // ✅ Atualizar TaskRowMinify imediatamente via optimistic update
            const optimisticDueDate = date ? date.toISOString() : undefined;
            onTaskUpdatedOptimistic?.(currentTaskId, { dueDate: optimisticDueDate });
            
            try {
                const result = await updateTaskField(
                    currentTaskId,
                    "due_date",
                    date ? date.toISOString() : null
                );
                if (result.success) {
                    invalidateCacheAndNotify(currentTaskId, { dueDate: optimisticDueDate });
                    // Recarregar atividades do banco para garantir que o log foi persistido
                    await reloadActivities(currentTaskId);
                    
                    const dateFormatted = date ? date.toLocaleDateString("pt-BR") : "removida";
                    toast.success(date ? `Data de entrega atualizada para ${dateFormatted}` : "Data de entrega removida");
                } else {
                    toast.error(result.error || "Erro ao atualizar data de entrega");
                    // ✅ REVERTER se falhar
                    setDueDate(oldDate);
                    onTaskUpdatedOptimistic?.(currentTaskId, { dueDate: oldDate || undefined });
                }
            } catch (error) {
                console.error("Erro ao atualizar data de entrega:", error);
                toast.error("Erro ao atualizar data de entrega");
                // ✅ REVERTER se falhar
                setDueDate(oldDate);
                onTaskUpdatedOptimistic?.(currentTaskId, { dueDate: oldDate || undefined });
            }
        } else {
            // Modo create - apenas atualizar localmente
            if (date) {
                const dateFormatted = date.toLocaleDateString("pt-BR");
                setActivities(prev => [{
                    id: `act-${Date.now()}`,
                    type: "updated",
                    user: "Você",
                    message: `definiu a data de entrega para ${dateFormatted}`,
                    timestamp: "Agora mesmo"
                }, ...prev]);
            }
        }
    };

    return (
        <>
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
                    <DialogTitle className="sr-only">
                        {isCreateMode ? "Criar Nova Tarefa" : `Detalhes da Tarefa: ${task?.title || ""}`}
                    </DialogTitle>
                    
                    {/* Header */}
                    <div className="px-6 py-4 border-b border-gray-100 shrink-0 bg-white">
                        <div className="flex items-center justify-between">
                            {!isCreateMode && task?.breadcrumbs && (
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    {task.breadcrumbs.map((crumb, i) => (
                                        <div key={i} className="flex items-center gap-2">
                                            <span>{crumb}</span>
                                            {i < task.breadcrumbs.length - 1 && <ChevronRight className="w-4 h-4 text-gray-400" />}
                                        </div>
                                    ))}
                                </div>
                            )}
                            {isCreateMode && (
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <span>Nova Tarefa</span>
                                </div>
                            )}

                            <div className="flex items-center gap-2 ml-auto">
                                {!isCreateMode && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => setIsShareModalOpen(true)}
                                        title="Compartilhar tarefa"
                                    >
                                        <Share2 className="h-4 w-4" />
                                    </Button>
                                )}
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => setIsMaximized(!isMaximized)}
                                >
                                    {isMaximized ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
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
                    </div>

                    {/* Main Grid */}
                    <div className="flex-1 grid md:grid-cols-[1.5fr_1fr] overflow-hidden bg-white">
                        
                        {/* LEFT COLUMN: Editor */}
                        <div className="border-r border-gray-100 p-6 overflow-y-auto custom-scrollbar flex flex-col">
                            {shouldShowSkeleton ? (
                                // Skeleton Loading
                                <div className="space-y-6 animate-pulse">
                                    {/* Title Skeleton */}
                                    <div className="h-12 bg-gray-200 rounded w-3/4" />
                                    
                                    {/* Properties Skeleton */}
                                    <div className="grid grid-cols-3 gap-6">
                                        <div className="space-y-2">
                                            <div className="h-3 bg-gray-200 rounded w-16" />
                                            <div className="h-8 bg-gray-200 rounded w-24" />
                                        </div>
                                        <div className="space-y-2">
                                            <div className="h-3 bg-gray-200 rounded w-20" />
                                            <div className="h-8 bg-gray-200 rounded w-32" />
                                        </div>
                                        <div className="space-y-2">
                                            <div className="h-3 bg-gray-200 rounded w-16" />
                                            <div className="h-8 bg-gray-200 rounded w-28" />
                                        </div>
                                    </div>
                                    
                                    {/* Description Skeleton */}
                                    <div className="space-y-2">
                                        <div className="h-3 bg-gray-200 rounded w-24" />
                                        <div className="h-32 bg-gray-100 rounded" />
                                    </div>
                                    
                                    {/* Attachments Skeleton */}
                                    <div className="space-y-2">
                                        <div className="h-3 bg-gray-200 rounded w-20" />
                                        <div className="h-32 bg-gray-100 rounded border-2 border-dashed border-gray-200" />
                                    </div>
                                    
                                    {/* Subtasks Skeleton */}
                                    <div className="space-y-2">
                                        <div className="h-3 bg-gray-200 rounded w-24" />
                                        <div className="space-y-2">
                                            <div className="h-10 bg-gray-100 rounded" />
                                            <div className="h-10 bg-gray-100 rounded" />
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <>
                            {/* Title */}
                            <div className="group relative mb-6">
                                {isViewMode ? (
                                    <h1 className="text-4xl font-bold">{title}</h1>
                                ) : (
                                    <Input
                                        value={title}
                                        onChange={(e) => {
                                            const newTitle = e.target.value;
                                            setTitle(newTitle);
                                            if (currentTaskId && !isCreateMode) {
                                                // ✅ Atualizar TaskRowMinify imediatamente via optimistic update
                                                onTaskUpdatedOptimistic?.(currentTaskId, { title: newTitle });
                                                // Salvar no backend em background
                                                updateTaskField(currentTaskId, "title", newTitle).catch((error) => {
                                                    console.error("Erro ao salvar título:", error);
                                                    // Reverter em caso de erro
                                                    onTaskUpdatedOptimistic?.(currentTaskId, { title: task?.title || "" });
                                                });
                                            }
                                        }}
                                        className="text-4xl font-bold border-0 p-0 pr-8 focus-visible:ring-0 shadow-none hover:underline decoration-gray-300 decoration-dashed underline-offset-4 bg-transparent h-auto"
                                    />
                                )}
                            </div>

                            {/* Properties */}
                            <div className="grid grid-cols-3 gap-6 mb-8 items-start">
                                {/* Status */}
                                <div className="flex flex-col gap-1">
                                    <label className="text-[10px] uppercase text-gray-400 font-bold tracking-wider">Status</label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <button className="flex items-center gap-2 text-sm hover:bg-gray-100 p-1.5 -ml-1.5 rounded transition-colors w-fit">
                                                <Badge 
                                                    variant="secondary" 
                                                    className={cn("pointer-events-none font-normal px-2 py-0.5", TASK_CONFIG[status]?.lightColor)}
                                                >
                                                    {mapStatusToLabel(status)}
                                                </Badge>
                                                <ChevronDown className="h-3 w-3 text-gray-400" />
                                            </button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-48 p-1" align="start">
                                            <div className="flex flex-col gap-0.5">
                                                {ORDERED_STATUSES.map((s) => (
                                                    <button
                                                        key={s}
                                                        className={cn(
                                                            "text-left px-2 py-1.5 text-sm rounded hover:bg-gray-100 transition-colors flex items-center justify-between",
                                                            status === s && "bg-gray-50 font-medium"
                                                        )}
                                                        onClick={() => handleStatusChange(s)}
                                                    >
                                                        <span>{STATUS_TO_LABEL[s]}</span>
                                                        {status === s && <Check className="h-3 w-3 text-green-600" />}
                                                    </button>
                                                ))}
                                            </div>
                                        </PopoverContent>
                                    </Popover>
                                </div>

                                {/* Assignee */}
                                <div className="flex flex-col gap-1">
                                    <label className="text-[10px] uppercase text-gray-400 font-bold tracking-wider">Responsável</label>
                                    <TaskMembersPicker
                                        memberIds={localMembers.map(m => m.id)}
                                        onChange={handleMembersChange}
                                        members={availableUsers}
                                        workspaceId={task?.workspaceId || undefined}
                                    />
                                </div>

                                {/* Due Date */}
                                <div className="flex flex-col gap-1">
                                    <label className="text-[10px] uppercase text-gray-400 font-bold tracking-wider">Entrega</label>
                                    <TaskDatePicker
                                        date={dueDate ? parseLocalDate(dueDate) : null}
                                        onSelect={handleDueDateChange}
                                        align="start"
                                        isCompleted={status === TASK_STATUS.DONE}
                                    />
                                </div>
                            </div>

                            {/* Description */}
                            <div className="mb-8 group/desc">
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-xs font-medium text-gray-500 uppercase block">Descrição</label>
                                    {!isEditingDescription && (
                                        <Button variant="ghost" size="sm" className="h-6 text-xs opacity-0 group-hover/desc:opacity-100" onClick={() => {
                                            setIsDescriptionExpanded(false);
                                            setIsEditingDescription(true);
                                        }}>
                                            <Pencil className="w-3 h-3 mr-1" /> Editar
                                        </Button>
                                    )}
                                </div>
                                {isEditingDescription ? (
                                    <div className="border rounded-md p-1">
                                        <Editor 
                                            value={description} 
                                            onChange={setDescription}
                                            placeholder="Adicione uma descrição..."
                                        />
                                        <div className="flex items-center justify-between mt-2 p-2">
                                            <div className="flex flex-col">
                                                <span className={cn(
                                                    "text-xs",
                                                    isDescriptionOverLimit ? "text-red-500" : "text-gray-400"
                                                )}>
                                                    {getDescriptionCharCount}/{MAX_DESCRIPTION_LENGTH}
                                                </span>
                                                {isDescriptionOverLimit && (
                                                    <span className="text-xs text-red-500 mt-0.5">
                                                        Limite de caracteres excedido.
                                                    </span>
                                                )}
                                            </div>
                                            <Button 
                                                size="sm" 
                                                onClick={handleSaveDescription}
                                                disabled={isDescriptionOverLimit}
                                            >
                                                Concluir
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="relative">
                                        <div 
                                            ref={descriptionRef}
                                            className={cn(
                                                "p-3 rounded-md hover:bg-gray-50 cursor-pointer transition-all prose prose-sm max-w-none text-gray-700 border border-transparent hover:border-gray-200 outline-none focus:outline-none focus-visible:outline-none active:outline-none",
                                                !isDescriptionExpanded && showExpandButton && "max-h-40 overflow-hidden"
                                            )}
                                            onClick={() => {
                                                setIsDescriptionExpanded(false);
                                                setIsEditingDescription(true);
                                            }}
                                            onMouseDown={(e) => e.preventDefault()}
                                            tabIndex={-1}
                                            dangerouslySetInnerHTML={{ __html: description || "<p class='text-gray-400'>Clique para adicionar uma descrição...</p>" }}
                                        />
                                        {!isDescriptionExpanded && showExpandButton && (
                                            <>
                                                <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-white to-transparent pointer-events-none" />
                                                <div className="flex justify-center mt-2">
                                                    <Button 
                                                        variant="ghost" 
                                                        size="sm"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setIsDescriptionExpanded(true);
                                                        }}
                                                    >
                                                        Ver mais
                                                    </Button>
                                                </div>
                                            </>
                                        )}
                                        {isDescriptionExpanded && showExpandButton && (
                                            <div className="flex justify-center mt-2">
                                                <Button 
                                                    variant="ghost" 
                                                    size="sm"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setIsDescriptionExpanded(false);
                                                    }}
                                                >
                                                    Ver menos
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Attachments Dropzone */}
                            <div className="mb-8">
                                <label className="text-xs font-medium text-gray-500 uppercase mb-2 block">Arquivos</label>
                                <div 
                                    {...getRootProps()}
                                    className={cn(
                                        "border-dashed border-2 rounded-md p-6 mb-4 cursor-pointer group transition-colors",
                                        isDragActive ? "border-green-500 bg-green-50" : "border-gray-200 hover:border-green-400"
                                    )}
                                >
                                    <input {...getInputProps()} />
                                    <div className="flex flex-col items-center justify-center gap-2 text-gray-400 group-hover:text-green-600">
                                        <UploadCloud className="w-8 h-8" />
                                        <p className="text-sm">Arraste arquivos ou clique para fazer upload</p>
                                    </div>
                                </div>
                                
                                {showAttachmentsSkeleton ? (
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 animate-pulse">
                                        {[1, 2, 3].map((i) => (
                                            <div key={i} className="h-24 bg-gray-100 rounded-lg border border-gray-200" />
                                        ))}
                                    </div>
                                ) : attachments.length > 0 ? (
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                        {attachments.map(att => {
                                            const imageIndex = att.type === "image" 
                                                ? imageAttachments.findIndex(img => img.id === att.id)
                                                : -1;
                                            return (
                                                <AttachmentCard
                                                    key={att.id}
                                                    file={att}
                                                    onDelete={handleAttachmentDeleteClick}
                                                    onPreview={imageIndex >= 0 ? () => handleImagePreview(imageIndex) : undefined}
                                                />
                                            );
                                        })}
                                    </div>
                                ) : null}
                            </div>

                            {/* Subtasks */}
                            <div>
                                <label className="text-xs font-medium text-gray-500 uppercase mb-3 block">Sub-tarefas</label>
                                <div className="space-y-2 mb-3">
                                    {subTasks.map(st => (
                                        <div key={st.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-gray-50 group">
                                            <Checkbox checked={st.completed} onCheckedChange={() => handleToggleSubTask(st.id)} />
                                            <span className={cn("flex-1 text-sm", st.completed && "line-through text-gray-400")}>{st.title}</span>
                                            <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={async () => {
                                                const oldSubtasks = subTasks; // ✅ Guardar valor antigo para rollback
                                                const updated = subTasks.filter(t => t.id !== st.id);
                                                // ✅ OPTIMISTIC UI: Atualizar estado ANTES da chamada ao servidor
                                                setSubTasks(updated);
                                                if (currentTaskId && !isCreateMode) {
                                                    try {
                                                        const result = await updateTaskSubtasks(currentTaskId, updated);
                                                        if (result.success) {
                                                            invalidateCacheAndNotify(currentTaskId);
                                                            // Criar log manual para subtarefas
                                                            await addComment(
                                                                currentTaskId,
                                                                `removeu a sub-tarefa: "${st.title}"`,
                                                                {
                                                                    field: "subtasks",
                                                                    action: "subtask_removed",
                                                                    subtask_title: st.title
                                                                },
                                                                "log"
                                                            );
                                                            // Recarregar atividades do banco
                                                            await reloadActivities(currentTaskId);
                                                        } else {
                                                            // ✅ REVERTER se falhar
                                                            setSubTasks(oldSubtasks);
                                                            toast.error(result.error || "Erro ao remover sub-tarefa");
                                                        }
                                                    } catch (error) {
                                                        // ✅ REVERTER em caso de exceção
                                                        console.error("Erro ao remover sub-tarefa:", error);
                                                        setSubTasks(oldSubtasks);
                                                        toast.error("Erro ao remover sub-tarefa");
                                                    }
                                                }
                                            }}>
                                                <X className="w-3 h-3" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex gap-2">
                                    <Input 
                                        value={newSubTask} 
                                        onChange={(e) => setNewSubTask(e.target.value)} 
                                        onKeyDown={(e) => e.key === "Enter" && handleAddSubTask()}
                                        placeholder="Adicionar item..." 
                                        className="flex-1"
                                    />
                                    <Button onClick={handleAddSubTask} size="icon" variant="outline" className="h-10 w-10">
                                        <Plus className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                                </>
                            )}

                        </div>

                        {/* RIGHT COLUMN: Context & Timeline */}
                        <div className="bg-gray-50 p-6 flex flex-col overflow-hidden h-full">
                            {shouldShowSkeleton ? (
                                // Timeline Skeleton
                                <div className="space-y-4 animate-pulse">
                                    <div className="h-4 bg-gray-200 rounded w-32 mb-4" />
                                    <div className="space-y-4">
                                        {[1, 2, 3].map((i) => (
                                            <div key={i} className="flex gap-3">
                                                <div className="w-2 h-2 rounded-full bg-gray-200 mt-2 shrink-0" />
                                                <div className="flex-1 space-y-2">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-24 h-4 bg-gray-200 rounded" />
                                                        <div className="w-16 h-3 bg-gray-200 rounded" />
                                                    </div>
                                                    <div className="w-full h-10 bg-gray-100 rounded-lg" />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <>
                            {/* Origin Card */}
                            {task?.contextMessage && (
                                <>
                                    <h3 className="text-sm font-semibold text-gray-700 mb-4">Contexto Original</h3>
                                    <div className="mb-6 bg-white rounded-lg border border-gray-200 p-4 shadow-sm flex items-start gap-3">
                                        <div className={cn(
                                            "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                                            task.contextMessage.type === "audio" ? "bg-green-100" : "bg-blue-100"
                                        )}>
                                            {task.contextMessage.type === "audio" ? (
                                                <Play className="w-5 h-5 text-green-600" />
                                            ) : (
                                                <MessageSquare className="w-5 h-5 text-blue-600" />
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-xs text-gray-500 mb-1 font-medium">
                                                Criada via {task.contextMessage.type === "audio" ? "WhatsApp" : "App Web"}
                                            </p>
                                            <p className="text-sm text-gray-700 mb-1">"{task.contextMessage.content}"</p>
                                            <p className="text-xs text-gray-400">{task.contextMessage.timestamp}</p>
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* Timeline */}
                            <div className="flex-1 flex flex-col min-h-0">
                                <h4 className="text-xs font-medium text-gray-500 uppercase mb-3">Histórico</h4>
                                
                                <div 
                                    ref={activitiesScrollRef}
                                    className="flex-1 overflow-y-auto mb-4 relative pr-2 custom-scrollbar"
                                >
                                    <div className="absolute left-[7px] top-0 bottom-0 w-px bg-gray-200" />

                                    <div className="space-y-4 relative pl-1">
                                        {showCommentsSkeleton ? (
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
                                        ) : activities.length === 0 ? (
                                            <p className="text-sm text-gray-400 text-center py-4">Nenhuma atividade</p>
                                        ) : (
                                            renderedActivities
                                        )}
                                    </div>
                                    
                                    {hasMoreComments && (
                                        <div className="flex justify-center pb-4">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={loadMoreComments}
                                                disabled={isLoadingComments}
                                            >
                                                {isLoadingComments ? (
                                                    <>
                                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                        Carregando...
                                                    </>
                                                ) : (
                                                    "Carregar mais"
                                                )}
                                            </Button>
                                        </div>
                                    )}
                                </div>
                                
                                {/* Input Area */}
                                <div className="pt-4 border-t border-gray-200 bg-gray-50">
                                    {pendingAttachments.length > 0 && (
                                        <div className="flex gap-2 mb-2 overflow-x-auto pb-2">
                                            {pendingAttachments.map((file) => (
                                                <div key={file.id} className="relative group bg-white border border-gray-200 rounded-md p-2 w-24 h-20 flex flex-col items-center justify-center shrink-0">
                                                    <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button 
                                                            className="bg-red-500 text-white rounded-full p-0.5"
                                                            onClick={() => {
                                                                setPendingAttachments(prev => prev.filter(f => f.id !== file.id));
                                                                setPendingFiles(prev => prev.filter((_, i) => pendingAttachments.findIndex(pf => pf.id === file.id) !== i));
                                                            }}
                                                        >
                                                            <X className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                    {file.type === "image" ? (
                                                        <FileImage className="w-8 h-8 text-blue-500 mb-1" />
                                                    ) : (
                                                        <FileText className="w-8 h-8 text-red-500 mb-1" />
                                                    )}
                                                    <span className="text-[10px] text-gray-600 truncate w-full text-center">{file.name}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    
                                    {isRecording ? (
                                        <AudioRecorderDisplay
                                            stream={mediaStream}
                                            onCancel={handleCancelRecording}
                                            onStop={handleStopRecording}
                                        />
                                    ) : (
                                        <div className="relative">
                                            <input {...getCommentInputProps()} />
                                            <Input
                                                value={comment}
                                                onChange={(e) => setComment(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === "Enter" && !e.shiftKey && !isSubmitting) {
                                                        e.preventDefault();
                                                        handleSendComment();
                                                    }
                                                }}
                                                placeholder="Adicionar comentário..."
                                                className="pr-32 bg-white shadow-sm"
                                                disabled={isSubmitting}
                                            />
                                            <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-gray-400 hover:text-green-600"
                                                    onClick={openCommentUpload}
                                                    title="Anexar arquivo"
                                                >
                                                    <Paperclip className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-gray-400 hover:text-red-500"
                                                    onClick={startRecording}
                                                    title="Enviar áudio"
                                                >
                                                    <Mic className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    size="icon"
                                                    className="h-8 w-8 bg-green-600 hover:bg-green-700"
                                                    onClick={handleSendComment}
                                                    disabled={isSubmitting || (!comment.trim() && pendingAttachments.length === 0)}
                                                    title="Enviar comentário"
                                                >
                                                    <Send className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                                </>
                            )}
                        </div>
                    </div>
                    </DialogPrimitive.Content>
                </DialogPortal>
            </Dialog>
            
            {/* Modal de Confirmação de Exclusão de Arquivo */}
            <ConfirmModal
                open={!!attachmentToDelete}
                onOpenChange={(open) => !open && setAttachmentToDelete(null)}
                title="Excluir Arquivo?"
                description="Esta ação não pode ser desfeita. O arquivo será permanentemente removido."
                confirmText="Sim, excluir"
                cancelText="Cancelar"
                variant="destructive"
                onConfirm={confirmAttachmentDelete}
            />

            {/* Lightbox de Preview de Imagens */}
            {lightboxIndex !== null && imageAttachments.length > 0 && (
                <TaskImageLightbox
                    images={imageAttachments}
                    initialIndex={lightboxIndex}
                    isOpen={lightboxIndex !== null}
                    onClose={() => setLightboxIndex(null)}
                />
            )}

            {/* Modal de Compartilhamento */}
            <Dialog open={isShareModalOpen} onOpenChange={(open) => {
                setIsShareModalOpen(open);
                if (!open) {
                    setShareLink("");
                }
            }}>
                <DialogPortal>
                    <DialogOverlay className="bg-black/50" />
                    <DialogPrimitive.Content className="fixed z-50 bg-background p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
                        <DialogTitle className="text-lg font-semibold mb-4">
                            Compartilhar Tarefa
                        </DialogTitle>
                        
                        <div className="space-y-4">
                            {/* Seleção de Tipo */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">
                                    Tipo de Link
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setShareLinkType("private")}
                                        className={cn(
                                            "p-4 border-2 rounded-lg transition-all text-left",
                                            shareLinkType === "private"
                                                ? "border-green-500 bg-green-50"
                                                : "border-gray-200 hover:border-gray-300"
                                        )}
                                    >
                                        <div className="flex items-center gap-2 mb-1">
                                            <Lock className={cn(
                                                "w-4 h-4",
                                                shareLinkType === "private" ? "text-green-600" : "text-gray-400"
                                            )} />
                                            <span className={cn(
                                                "font-medium text-sm",
                                                shareLinkType === "private" ? "text-green-900" : "text-gray-700"
                                            )}>
                                                Privado
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-500">
                                            Apenas membros do workspace
                                        </p>
                                    </button>
                                    
                                    <button
                                        type="button"
                                        onClick={() => setShareLinkType("public")}
                                        className={cn(
                                            "p-4 border-2 rounded-lg transition-all text-left",
                                            shareLinkType === "public"
                                                ? "border-green-500 bg-green-50"
                                                : "border-gray-200 hover:border-gray-300"
                                        )}
                                    >
                                        <div className="flex items-center gap-2 mb-1">
                                            <Globe className={cn(
                                                "w-4 h-4",
                                                shareLinkType === "public" ? "text-green-600" : "text-gray-400"
                                            )} />
                                            <span className={cn(
                                                "font-medium text-sm",
                                                shareLinkType === "public" ? "text-green-900" : "text-gray-700"
                                            )}>
                                                Público
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-500">
                                            Qualquer pessoa com o link
                                        </p>
                                    </button>
                                </div>
                            </div>

                            {/* Link Gerado */}
                            {shareLink && (
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">
                                        Link de Compartilhamento
                                    </label>
                                    <div className="flex gap-2">
                                        <Input
                                            value={shareLink}
                                            readOnly
                                            className="flex-1 font-mono text-xs"
                                        />
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            onClick={() => {
                                                navigator.clipboard.writeText(shareLink);
                                                toast.success("Link copiado!");
                                            }}
                                        >
                                            <Copy className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* Botões */}
                            <div className="flex justify-end gap-2 pt-2">
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setIsShareModalOpen(false);
                                        setShareLink("");
                                    }}
                                >
                                    Fechar
                                </Button>
                                <Button
                                    onClick={handleGenerateShareLink}
                                    disabled={isGeneratingLink}
                                    className="bg-green-600 hover:bg-green-700"
                                >
                                    {isGeneratingLink ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Gerando...
                                        </>
                                    ) : (
                                        <>
                                            <Share2 className="w-4 h-4 mr-2" />
                                            Gerar Link
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </DialogPrimitive.Content>
                </DialogPortal>
            </Dialog>
        </>
        );
}
