"use client";

import { useState, useEffect } from "react";
import { Play, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AudioMessageBubbleProps {
    duration?: number; // em segundos
    isOwnMessage?: boolean; // se é mensagem do próprio usuário
    audioUrl?: string; // URL do áudio (opcional, para reprodução real)
}

export function AudioMessageBubble({ 
    duration = 14, 
    isOwnMessage = false,
    audioUrl 
}: AudioMessageBubbleProps) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

    // Formatar tempo (MM:SS)
    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, "0")}`;
    };

    // Validar se a URL é "tocável"
    const isPlayableUrl = (url?: string) => {
        return url && (url.startsWith("http") || url.startsWith("blob:")); // Aceita HTTP e Blob URLs
    };

    // Inicializar elemento de áudio se houver URL válida
    useEffect(() => {
        if (isPlayableUrl(audioUrl)) {
            let audio: HTMLAudioElement | null = null;
            let checkAudio: NodeJS.Timeout | null = null;
            
            try {
                audio = new Audio(audioUrl);
                
                const handleTimeUpdate = () => {
                    if (audio) {
                        setCurrentTime(audio.currentTime);
                    }
                };
                
                const handleEnded = () => {
                    setIsPlaying(false);
                    setCurrentTime(0);
                };
                
                const handleError = () => {
                    // Silenciosamente usar simulação visual se o blob não estiver disponível
                    // Isso é comum quando blob URLs são revogados ou não estão mais acessíveis
                    setAudioElement(null);
                    setIsPlaying(false);
                };
                
                const handleLoadedData = () => {
                    if (audio && audio.readyState >= 2) {
                        setAudioElement(audio);
                    }
                };
                
                audio.addEventListener("timeupdate", handleTimeUpdate);
                audio.addEventListener("ended", handleEnded);
                audio.addEventListener("error", handleError);
                audio.addEventListener("loadeddata", handleLoadedData);
                audio.addEventListener("canplay", handleLoadedData);
                
                // Tentar carregar o áudio de forma assíncrona
                audio.load().catch(() => {
                    // Se falhar ao carregar, usar simulação
                    setAudioElement(null);
                });
                
                // Verificar se o áudio está disponível após um pequeno delay
                checkAudio = setTimeout(() => {
                    if (audio) {
                        if (audio.readyState >= 2) {
                            setAudioElement(audio);
                        } else if (audio.error) {
                            // Áudio não está disponível, usar simulação
                            setAudioElement(null);
                        }
                    }
                }, 200);
                
            } catch (error) {
                // Se houver erro ao criar o elemento de áudio, usar simulação
                setAudioElement(null);
            }
            
            return () => {
                if (checkAudio) {
                    clearTimeout(checkAudio);
                }
                if (audio) {
                    audio.pause();
                    audio.removeEventListener("timeupdate", () => {});
                    audio.removeEventListener("ended", () => {});
                    audio.removeEventListener("error", () => {});
                    audio.removeEventListener("loadeddata", () => {});
                    audio.removeEventListener("canplay", () => {});
                    audio.src = '';
                }
            };
        } else {
            setAudioElement(null);
        }
    }, [audioUrl]);

    useEffect(() => {
        let interval: NodeJS.Timeout | null = null;
        // Se estiver tocando e (não tiver elemento de áudio OU tiver elemento tocando)
        // A lógica aqui é: se tem elemento, ele controla o tempo. Se não tem (simulação), o intervalo controla.
        if (isPlaying && !audioElement) {
            // Simulação sem áudio real
            interval = setInterval(() => {
                setCurrentTime((prev) => {
                    if (prev >= duration) {
                        setIsPlaying(false);
                        return 0;
                    }
                    return prev + 0.1;
                });
            }, 100);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isPlaying, audioElement, duration]);

    const handlePlayPause = () => {
        console.log("handlePlayPause chamado. audioElement:", !!audioElement, "isPlaying:", isPlaying, "audioUrl:", audioUrl);
        
        if (audioElement) {
            // Tentar tocar áudio real
            if (isPlaying) {
                console.log("Pausando áudio");
                audioElement.pause();
                setIsPlaying(false);
            } else {
                console.log("Tentando tocar áudio. Estado do elemento:", {
                    readyState: audioElement.readyState,
                    duration: audioElement.duration,
                    src: audioElement.src
                });
                
                const playPromise = audioElement.play();
                if (playPromise !== undefined) {
                    playPromise
                        .then(() => {
                            console.log("Áudio começou a tocar com sucesso");
                            setIsPlaying(true);
                        })
                        .catch((error) => {
                            console.error("Erro ao reproduzir áudio:", error);
                            // Fallback para simulação visual se falhar (ex: NotSupportedError)
                            setAudioElement(null);
                            setIsPlaying(true);
                        });
                }
            }
        } else {
            console.log("Sem audioElement, usando simulação visual");
            // Simulação visual apenas
            if (isPlaying) {
                setIsPlaying(false);
            } else {
                setIsPlaying(true);
                if (currentTime >= duration) {
                    setCurrentTime(0);
                }
            }
        }
    };

    // Calcular progresso (0 a 1)
    const progress = duration > 0 ? Math.min(currentTime / duration, 1) : 0;

    // Alturas das barras do waveform (simulado)
    const waveformHeights = [40, 60, 45, 70, 50, 65, 55, 75, 50, 60, 45, 70];

    return (
        <div
            className={cn(
                "flex items-center gap-3 p-3 min-w-[200px] rounded-2xl",
                isOwnMessage ? "bg-green-50" : "bg-gray-100"
            )}
        >
            {/* Botão Play/Pause */}
            <Button
                type="button"
                variant="ghost"
                size="icon"
                className={cn(
                    "h-10 w-10 rounded-full flex-shrink-0",
                    isOwnMessage
                        ? "bg-green-600 hover:bg-green-700 text-white"
                        : "bg-gray-700 hover:bg-gray-800 text-white"
                )}
                onClick={handlePlayPause}
            >
                {isPlaying ? (
                    <Pause className="h-5 w-5" />
                ) : (
                    <Play className="h-5 w-5 ml-0.5" />
                )}
            </Button>

            {/* Visualização Waveform */}
            <div className="flex-1 flex items-center gap-1.5 h-8">
                {waveformHeights.map((height, index) => {
                    const baseHeight = height;
                    const animatedHeight = isPlaying
                        ? baseHeight * (0.5 + Math.sin((index + currentTime * 2) * 0.5) * 0.5)
                        : baseHeight;
                    const isPast = progress > index / waveformHeights.length;
                    
                    return (
                        <div
                            key={index}
                            className={cn(
                                "w-1 rounded-full transition-all duration-150",
                                isOwnMessage ? "bg-green-600" : "bg-gray-600"
                            )}
                            style={{
                                height: `${Math.max(animatedHeight, 20)}%`,
                                opacity: isPast ? 1 : 0.4,
                            }}
                        />
                    );
                })}
            </div>

            {/* Duração */}
            <span
                className={cn(
                    "text-xs font-medium min-w-[35px] text-right",
                    isOwnMessage ? "text-green-700" : "text-gray-700"
                )}
            >
                {formatTime(isPlaying ? currentTime : duration)}
            </span>
        </div>
    );
}
