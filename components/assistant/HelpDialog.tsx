"use client";

import * as React from "react";
import { LifeBuoy, BookOpen, MessageCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface HelpDialogProps {
  children: React.ReactNode;
}

export function HelpDialog({ children }: HelpDialogProps) {
  const [open, setOpen] = React.useState(false);

  const handleOpenDocs = () => {
    window.open("/docs", "_blank");
    setOpen(false);
  };

  const handleOpenWhatsApp = () => {
    const message = encodeURIComponent("Preciso de ajuda no Symples Web");
    window.open(`https://wa.me/5511999999999?text=${message}`, "_blank");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <LifeBuoy className="w-5 h-5 text-green-600" />
            <DialogTitle className="text-xl font-semibold text-slate-900">
              Central de Ajuda
            </DialogTitle>
          </div>
          <DialogDescription className="text-sm text-slate-600">
            Escolha como você prefere ser atendido.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 mt-4">
          {/* Botão 1: Ler o Playbook */}
          <Button
            variant="outline"
            onClick={handleOpenDocs}
            className={cn(
              "w-full h-auto p-4 justify-start gap-4",
              "hover:border-green-500 hover:bg-green-50",
              "transition-all duration-200"
            )}
          >
            <div className="p-2 rounded-full bg-slate-100">
              <BookOpen className="w-5 h-5 text-slate-700" />
            </div>
            <div className="flex flex-col items-start text-left">
              <span className="font-semibold text-slate-900">
                Ler o Playbook
              </span>
              <span className="text-xs text-slate-500">
                Tutoriais e boas práticas.
              </span>
            </div>
          </Button>

          {/* Botão 2: Falar com Humano */}
          <Button
            variant="outline"
            onClick={handleOpenWhatsApp}
            className={cn(
              "w-full h-auto p-4 justify-start gap-4",
              "hover:border-green-500 hover:bg-green-50",
              "transition-all duration-200"
            )}
          >
            <div className="p-2 rounded-full bg-slate-100">
              <MessageCircle className="w-5 h-5 text-slate-700" />
            </div>
            <div className="flex flex-col items-start text-left">
              <span className="font-semibold text-slate-900">
                Falar com Humano
              </span>
              <span className="text-xs text-slate-500">
                Suporte via WhatsApp.
              </span>
            </div>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
