"use client";

import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, FileText, Calendar } from "lucide-react";
import { toast } from "sonner";
import { TaskDatePicker } from "./pickers/TaskDatePicker";
import { createTask } from "@/lib/actions/tasks";

interface CreateTaskFromAudioModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    audioUrl: string;
    audioDuration: number;
    onTaskCreated?: () => void;
}

export function CreateTaskFromAudioModal({
    open,
    onOpenChange,
    audioUrl,
    audioDuration,
    onTaskCreated,
}: CreateTaskFromAudioModalProps) {
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [transcription, setTranscription] = useState("");
    const [summary, setSummary] = useState("");
    const [extractedTitle, setExtractedTitle] = useState("");
    const [extractedDate, setExtractedDate] = useState<string | null>(null);
    
    const [title, setTitle] = useState("");
    const [dueDate, setDueDate] = useState<string | null>(null);
    const [description, setDescription] = useState("");
    const [isCreating, setIsCreating] = useState(false);

    // Processar áudio quando modal abrir
    useEffect(() => {
        if (open && audioUrl) {
            processAudio();
        } else {
            // Resetar estados quando fechar
            setTranscription("");
            setSummary("");
            setExtractedTitle("");
            setExtractedDate(null);
            setTitle("");
            setDueDate(null);
            setDescription("");
        }
    }, [open, audioUrl]);

    const processAudio = async () => {
        try {
            setIsTranscribing(true);
            toast.info("Transcrevendo áudio...");

            // 1. Buscar o blob do áudio pela URL
            const response = await fetch(audioUrl);
            const blob = await response.blob();
            
            // 2. Transcrever
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
            const transcribedText = transcribeData.transcription;

            if (!transcribedText) {
                throw new Error("Transcrição vazia");
            }

            setTranscription(transcribedText);
            toast.success("Transcrição concluída");

            // 3. Processar resumo e extração em paralelo
            setIsProcessing(true);
            toast.info("Gerando resumo e extraindo informações...");

            const [summaryResponse, extractResponse] = await Promise.all([
                fetch("/api/ai/summarize", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ text: transcribedText }),
                }),
                fetch("/api/ai/extract-task-info", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ text: transcribedText }),
                }),
            ]);

            if (summaryResponse.ok) {
                const summaryData = await summaryResponse.json();
                setSummary(summaryData.summary || "");
            } else {
                console.warn("Erro ao gerar resumo, continuando sem resumo");
            }

            if (extractResponse.ok) {
                const extractData = await extractResponse.json();
                setExtractedTitle(extractData.title || "Tarefa de áudio");
                setExtractedDate(extractData.dueDate || null);
                
                // Preencher campos
                setTitle(extractData.title || "Tarefa de áudio");
                setDueDate(extractData.dueDate || null);
            } else {
                console.warn("Erro ao extrair informações, usando valores padrão");
                setExtractedTitle("Tarefa de áudio");
                setTitle("Tarefa de áudio");
            }

            // 4. Montar descrição
            const descriptionHtml = `
                <h3>Transcrição Completa</h3>
                <p>${transcribedText.replace(/\n/g, "<br>")}</p>
                ${summary ? `<h3>Resumo</h3><p>${summary}</p>` : ""}
            `;
            setDescription(descriptionHtml);

            toast.success("Processamento concluído");
        } catch (error) {
            console.error("Erro ao processar áudio:", error);
            toast.error(
                error instanceof Error 
                    ? error.message 
                    : "Erro ao processar áudio. Você pode criar a tarefa manualmente."
            );
            // Permitir criar tarefa mesmo com erro
            setTitle("Tarefa de áudio");
        } finally {
            setIsTranscribing(false);
            setIsProcessing(false);
        }
    };

    const handleCreateTask = async () => {
        if (!title.trim()) {
            toast.error("Título é obrigatório");
            return;
        }

        setIsCreating(true);
        try {
            const result = await createTask({
                title: title.trim(),
                description: description || transcription || "",
                due_date: dueDate || undefined,
                origin_context: {
                    type: "audio",
                    audioUrl: audioUrl,
                    duration: audioDuration,
                },
            });

            if (result.success) {
                toast.success("Tarefa criada com sucesso!");
                onOpenChange(false);
                onTaskCreated?.();
            } else {
                toast.error(result.error || "Erro ao criar tarefa");
            }
        } catch (error) {
            console.error("Erro ao criar tarefa:", error);
            toast.error("Erro ao criar tarefa");
        } finally {
            setIsCreating(false);
        }
    };

    const isLoading = isTranscribing || isProcessing;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Criar Tarefa a partir de Áudio</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Loading State */}
                    {isLoading && (
                        <div className="flex flex-col items-center justify-center py-8 space-y-4">
                            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                            <p className="text-sm text-gray-600">
                                {isTranscribing 
                                    ? "Transcrevendo áudio..." 
                                    : "Processando informações..."}
                            </p>
                        </div>
                    )}

                    {/* Form */}
                    {!isLoading && (
                        <>
                            {/* Título */}
                            <div className="space-y-2">
                                <Label htmlFor="title">Título *</Label>
                                <Input
                                    id="title"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="Título da tarefa"
                                />
                            </div>

                            {/* Data */}
                            <div className="space-y-2">
                                <Label>Data de Entrega</Label>
                                <TaskDatePicker
                                    date={dueDate ? new Date(dueDate) : null}
                                    onSelect={(date) => {
                                        setDueDate(date?.toISOString() || null);
                                    }}
                                    align="start"
                                />
                            </div>

                            {/* Descrição (readonly preview) */}
                            {description && (
                                <div className="space-y-2">
                                    <Label>Descrição</Label>
                                    <div 
                                        className="min-h-[200px] p-4 border rounded-md bg-gray-50 prose prose-sm max-w-none"
                                        dangerouslySetInnerHTML={{ __html: description }}
                                    />
                                </div>
                            )}

                            {/* Transcrição completa (collapsible) */}
                            {transcription && (
                                <div className="space-y-2">
                                    <details className="border rounded-md">
                                        <summary className="p-3 cursor-pointer font-medium text-sm flex items-center gap-2">
                                            <FileText className="w-4 h-4" />
                                            Ver transcrição completa
                                        </summary>
                                        <div className="p-4 pt-0 text-sm text-gray-700 whitespace-pre-wrap">
                                            {transcription}
                                        </div>
                                    </details>
                                </div>
                            )}
                        </>
                    )}
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={isLoading || isCreating}
                    >
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleCreateTask}
                        disabled={isLoading || isCreating || !title.trim()}
                    >
                        {isCreating ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Criando...
                            </>
                        ) : (
                            "Criar Tarefa"
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}





