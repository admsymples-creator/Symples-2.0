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

    // Inicializar elemento de áudio se houver URL
    useEffect(() => {
        if (audioUrl) {
            const audio = new Audio(audioUrl);
            audio.addEventListener("timeupdate", () => {
                setCurrentTime(audio.currentTime);
            });
            audio.addEventListener("ended", () => {
                setIsPlaying(false);
                setCurrentTime(0);
            });
            setAudioElement(audio);
            return () => {
                audio.removeEventListener("timeupdate", () => {});
                audio.removeEventListener("ended", () => {});
            };
        }
    }, [audioUrl]);

    useEffect(() => {
        let interval: NodeJS.Timeout | null = null;
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
        if (audioElement) {
            if (isPlaying) {
                audioElement.pause();
            } else {
                audioElement.play();
            }
            setIsPlaying(!isPlaying);
        } else {
            // Simulação sem áudio real
            setIsPlaying(!isPlaying);
            if (!isPlaying) {
                setCurrentTime(0);
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

