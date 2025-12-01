"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { verifyShareToken } from "@/lib/actions/task-details";
import { TaskDetailModal } from "@/components/tasks/TaskDetailModal";
import { Loader2 } from "lucide-react";

export default function ShareTaskPage() {
    const params = useParams();
    const shareToken = params?.token as string;
    const [taskData, setTaskData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isPublic, setIsPublic] = useState(false);

    useEffect(() => {
        const loadSharedTask = async () => {
            if (!shareToken) {
                setError("Token de compartilhamento inválido");
                setIsLoading(false);
                return;
            }

            try {
                // Verificar token e buscar tarefa
                const result = await verifyShareToken(shareToken);
                
                if (!result.success || !result.task) {
                    setError(result.error || "Link de compartilhamento inválido ou expirado");
                    setIsLoading(false);
                    return;
                }

                const details = result.task;
                setIsPublic(result.isPublic || false);

                // Mapear dados para o formato esperado pelo TaskDetailModal
                setTaskData({
                    id: details.id,
                    title: details.title,
                    description: details.description || "",
                    status: details.status,
                    assignee: details.assignee ? {
                        name: details.assignee.full_name || details.assignee.email || "Sem nome",
                        avatar: details.assignee.avatar_url || undefined,
                    } : undefined,
                    dueDate: details.due_date || undefined,
                    tags: details.tags || [],
                    breadcrumbs: ["Tarefas", "Compartilhada"],
                    workspaceId: details.workspace_id,
                    subTasks: details.subtasks || [],
                    activities: details.comments.map((comment) => ({
                        id: comment.id,
                        type: comment.type === "comment" ? "commented" : 
                              comment.type === "file" ? "file_shared" :
                              comment.type === "log" ? "updated" : 
                              comment.type === "audio" ? "audio" : "commented",
                        user: comment.user.full_name || comment.user.email || "Sem nome",
                        message: comment.type === "audio" ? undefined : comment.content,
                        timestamp: new Date(comment.created_at).toLocaleString("pt-BR"),
                        attachedFiles: comment.metadata?.attachedFiles,
                        audio: (comment.metadata?.audio_url || comment.metadata?.url) ? {
                            url: comment.metadata.audio_url || comment.metadata.url,
                            duration: comment.metadata.duration,
                            transcription: comment.metadata.transcription,
                        } : undefined,
                    })) || [],
                    attachments: details.attachments.map((att) => ({
                        id: att.id,
                        name: att.file_name,
                        type: (att.file_type || "other") as "image" | "pdf" | "other",
                        size: att.file_size ? `${(att.file_size / 1024 / 1024).toFixed(1)} MB` : "0 MB",
                        url: att.file_url,
                    })) || [],
                });

                setIsLoading(false);
            } catch (err) {
                console.error("Erro ao carregar tarefa compartilhada:", err);
                setError("Erro ao carregar tarefa compartilhada");
                setIsLoading(false);
            }
        };

        loadSharedTask();
    }, [shareToken]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-gray-400" />
                    <p className="text-gray-500">Carregando tarefa compartilhada...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center max-w-md mx-auto p-6">
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Erro</h1>
                    <p className="text-gray-600">{error}</p>
                </div>
            </div>
        );
    }

    if (!taskData) {
        return null;
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <TaskDetailModal
                key={taskData?.id || shareToken}
                open={true}
                onOpenChange={() => {}}
                mode={isPublic ? "view" : "edit"} // Modo view para público (sem edição)
                task={taskData}
            />
        </div>
    );
}

