"use client";

import { memo } from "react";
import { MessageSquare, Monitor, FileImage, FileText, Pencil, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AudioMessageBubble } from "@/components/tasks/AudioMessageBubble";
import { LinkifyText } from "@/components/ui/linkify-text";
import { cn } from "@/lib/utils";

export interface ActivityItemData {
    id: string;
    type: "created" | "commented" | "updated" | "file_shared" | "audio" | "origin";
    user: string;
    message?: string;
    timestamp: string;
    file?: { name: string; type: "image" | "pdf" | "other"; size: string };
    attachedFiles?: Array<{ name: string; type: "image" | "pdf" | "other"; size: string }>;
    audio?: { url?: string; duration?: number; transcription?: string };
    origin?: { source: "whatsapp" | "web"; content?: string };
    isCurrentUser?: boolean;
    edited?: boolean;
    deleted?: boolean;
}

interface TaskDetailActivityItemProps {
    activity: ActivityItemData;
    isEditing: boolean;
    editingText: string;
    transcribingActivityId: string | null;
    isUpdatingComment: boolean;
    isDeletingComment: string | null;
    onViewTranscription: (activityId: string, audioUrl: string) => void;
    onEditComment: (id: string, text: string) => void;
    onDeleteComment: (id: string) => void;
    onSaveEditComment: () => void;
    onCancelEditComment: () => void;
    onEditingTextChange: (value: string) => void;
}

function TaskDetailActivityItemComponent({
    activity: act,
    isEditing,
    editingText,
    transcribingActivityId,
    isUpdatingComment,
    isDeletingComment,
    onViewTranscription,
    onEditComment,
    onDeleteComment,
    onSaveEditComment,
    onCancelEditComment,
    onEditingTextChange,
}: TaskDetailActivityItemProps) {
    return (
        <div className="flex gap-3 text-sm relative group">
            <div className="flex-shrink-0 relative z-10 bg-gray-50 pt-2">
                <div className="w-2 h-2 rounded-full bg-gray-300 ring-4 ring-gray-50" />
            </div>

            <div className="flex-1 pb-2">
                {act.type === "origin" && act.origin && (
                    <div className="flex items-start gap-2">
                        <div
                            className={cn(
                                "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                                act.origin.source === "whatsapp" ? "bg-green-100" : "bg-blue-100"
                            )}
                        >
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
                                    &quot;{act.origin.content}&quot;
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
                                            onClick={() => onViewTranscription(act.id, act.audio!.url!)}
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
                            <div className="bg-white p-2.5 rounded-lg border border-gray-200 mt-1.5 shadow-sm text-gray-600 relative group/comment">
                                {isEditing ? (
                                    <div className="space-y-2">
                                        <Textarea
                                            value={editingText}
                                            onChange={(e) => onEditingTextChange(e.target.value)}
                                            className="min-h-[60px] resize-none"
                                            autoFocus
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter" && e.ctrlKey) {
                                                    e.preventDefault();
                                                    onSaveEditComment();
                                                } else if (e.key === "Escape") {
                                                    onCancelEditComment();
                                                }
                                            }}
                                        />
                                        <div className="flex gap-2 justify-end">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={onCancelEditComment}
                                                disabled={isUpdatingComment}
                                            >
                                                Cancelar
                                            </Button>
                                            <Button
                                                size="sm"
                                                onClick={onSaveEditComment}
                                                disabled={isUpdatingComment || !editingText.trim()}
                                            >
                                                {isUpdatingComment ? (
                                                    <>
                                                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                                        Salvando...
                                                    </>
                                                ) : (
                                                    "Salvar"
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <p className={cn(act.deleted && "italic text-gray-400")}>
                                            <LinkifyText text={act.message || ""} />
                                        </p>
                                        {(act.edited || act.deleted) && (
                                            <div className="flex items-center gap-2 mt-1">
                                                {act.edited && (
                                                    <span className="text-[10px] text-gray-400">Editado</span>
                                                )}
                                                {act.deleted && (
                                                    <span className="text-[10px] text-gray-400">Removido</span>
                                                )}
                                            </div>
                                        )}
                                        {act.isCurrentUser && !act.deleted && act.type === "commented" && (
                                            <>
                                                <div
                                                    className={cn(
                                                        "absolute right-0 top-0 bottom-0 w-20 pointer-events-none opacity-0 group-hover/comment:opacity-100 transition-opacity duration-200",
                                                        "bg-gradient-to-l from-white via-white via-60% to-transparent"
                                                    )}
                                                />
                                                <div className="absolute top-2 right-2 opacity-0 group-hover/comment:opacity-100 transition-opacity flex gap-1 z-10">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-6 w-6 text-gray-400 hover:text-gray-600"
                                                        onClick={() => onEditComment(act.id, act.message || "")}
                                                        title="Editar comentário"
                                                    >
                                                        <Pencil className="w-3 h-3" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-6 w-6 text-gray-400 hover:text-red-600"
                                                        onClick={() => onDeleteComment(act.id)}
                                                        disabled={isDeletingComment === act.id}
                                                        title="Excluir comentário"
                                                    >
                                                        {isDeletingComment === act.id ? (
                                                            <Loader2 className="w-3 h-3 animate-spin" />
                                                        ) : (
                                                            <Trash2 className="w-3 h-3" />
                                                        )}
                                                    </Button>
                                                </div>
                                            </>
                                        )}
                                    </>
                                )}
                            </div>
                        )}

                        {act.attachedFiles && act.attachedFiles.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-2">
                                {act.attachedFiles.map((f, idx) => (
                                    <div
                                        key={idx}
                                        className="p-2 bg-white rounded-md border border-gray-200 flex items-center gap-2 w-fit pr-4 hover:bg-gray-50 cursor-pointer transition-colors"
                                    >
                                        {f.type === "image" ? (
                                            <FileImage className="w-4 h-4 text-blue-500" />
                                        ) : (
                                            <FileText className="w-4 h-4 text-red-500" />
                                        )}
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
                                {act.file.type === "image" ? (
                                    <FileImage className="w-4 h-4 text-blue-500" />
                                ) : (
                                    <FileText className="w-4 h-4 text-red-500" />
                                )}
                                <div className="flex flex-col">
                                    <span className="text-xs font-medium">{act.file.name}</span>
                                    <span className="text-[10px] text-gray-400">{act.file.size}</span>
                                </div>
                            </div>
                        )}

                        <p className="text-[10px] text-gray-400 mt-1">{act.timestamp}</p>
                    </>
                )}
            </div>
        </div>
    );
}

export const TaskDetailActivityItem = memo(TaskDetailActivityItemComponent);
