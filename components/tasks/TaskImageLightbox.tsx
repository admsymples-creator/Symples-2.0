"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Download, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

interface TaskImageLightboxProps {
  images: Array<{
    id: string;
    url: string;
    name: string;
  }>;
  initialIndex: number;
  isOpen: boolean;
  onClose: () => void;
}

export function TaskImageLightbox({
  images,
  initialIndex,
  isOpen,
  onClose,
}: TaskImageLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  // Resetar index quando abrir novamente com outra imagem inicial
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex);
    }
  }, [isOpen, initialIndex]);

  // Navegação por teclado
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        handlePrev();
      } else if (e.key === "ArrowRight") {
        handleNext();
      } else if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, currentIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const currentImage = images[currentIndex];

  if (!currentImage) return null;

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AnimatePresence>
        {isOpen && (
          <Dialog.Portal forceMount>
            {/* Backdrop Blur Animado */}
            <Dialog.Overlay asChild>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-sm"
              />
            </Dialog.Overlay>

            {/* Conteúdo */}
            <Dialog.Content asChild>
              <div className="fixed inset-0 z-[10000] flex items-center justify-center outline-none">
                <Dialog.Title className="sr-only">{currentImage.name}</Dialog.Title>

                {/* Header: Nome e Fechar */}
                <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-10 bg-gradient-to-b from-black/50 to-transparent">
                  <span className="text-white/90 text-sm font-medium truncate max-w-md">
                    {currentImage.name}
                  </span>

                  <div className="flex items-center gap-2">
                    {/* Botão Download */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-white/70 hover:text-white hover:bg-white/10 rounded-full h-10 w-10"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(currentImage.url, "_blank");
                      }}
                      title="Baixar imagem"
                    >
                      <Download className="w-5 h-5" />
                    </Button>

                    {/* Botão Fechar */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-white/70 hover:text-white hover:bg-white/10 rounded-full h-10 w-10"
                      onClick={onClose}
                    >
                      <X className="w-6 h-6" />
                    </Button>
                  </div>
                </div>

                {/* Botão Anterior */}
                {images.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute left-4 text-white/70 hover:text-white hover:bg-white/10 rounded-full h-12 w-12 z-10 hidden md:flex"
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePrev();
                    }}
                  >
                    <ChevronLeft className="w-8 h-8" />
                  </Button>
                )}

                {/* Área da Imagem com Animação */}
                <div className="w-full h-full flex items-center justify-center p-4 md:p-12 cursor-default" onClick={onClose}>
                  <motion.div
                    key={currentIndex}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="relative max-w-full max-h-full"
                    onClick={(e) => e.stopPropagation()} // Evitar fechar ao clicar na imagem
                  >
                    <img
                      src={currentImage.url}
                      alt={currentImage.name}
                      className="max-w-full max-h-[85vh] object-contain rounded-md shadow-2xl select-none"
                      draggable={false}
                    />

                    {/* Contador Mobile/Desktop discreto */}
                    {images.length > 1 && (
                      <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-white/50 text-xs font-medium px-2 py-1 rounded-full bg-black/20 backdrop-blur-md border border-white/10">
                        {currentIndex + 1} / {images.length}
                      </div>
                    )}
                  </motion.div>
                </div>

                {/* Botão Próximo */}
                {images.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-4 text-white/70 hover:text-white hover:bg-white/10 rounded-full h-12 w-12 z-10 hidden md:flex"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleNext();
                    }}
                  >
                    <ChevronRight className="w-8 h-8" />
                  </Button>
                )}
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}

