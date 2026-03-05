"use client";

import * as React from "react";
import { Check, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

// ------------------------------------------------------------------
// Recording Visualizer Component
// ------------------------------------------------------------------

const RecordingVisualizer = ({ stream }: { stream: MediaStream }) => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const animationRef = React.useRef<number | undefined>(undefined);
  const analyserRef = React.useRef<AnalyserNode | undefined>(undefined);
  const sourceRef = React.useRef<MediaStreamAudioSourceNode | undefined>(undefined);

  React.useEffect(() => {
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
        (ctx as any).roundRect(x, y, barWidth, height, 2);
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
  maxDuration?: number;
}

export const AudioRecorderDisplay = React.memo(({ stream, onCancel, onStop, maxDuration = 120 }: AudioRecorderDisplayProps) => {
  const [recordingTime, setRecordingTime] = React.useState(0);

  React.useEffect(() => {
    let interval: NodeJS.Timeout;
    interval = setInterval(() => {
      setRecordingTime(t => {
        const newTime = t + 1;
        // Parar automaticamente ao atingir o limite
        if (newTime >= maxDuration) {
          clearInterval(interval);
          onStop(maxDuration);
          return maxDuration;
        }
        return newTime;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [maxDuration, onStop]);

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
          <span className="text-sm font-mono text-red-700 min-w-[80px] text-right">
            {formatTime(recordingTime)} / {formatTime(maxDuration)}
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

