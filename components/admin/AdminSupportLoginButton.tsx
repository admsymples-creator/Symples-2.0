"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { createSupportLoginLink } from "@/lib/actions/admin";

const SUPPORT_SESSION_MINUTES = 15;

interface AdminSupportLoginButtonProps {
    userId: string;
    userEmail?: string | null;
}

export function AdminSupportLoginButton({ userId, userEmail }: AdminSupportLoginButtonProps) {
    const [open, setOpen] = useState(false);
    const [reason, setReason] = useState("");
    const [supportLink, setSupportLink] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    const handleConfirm = () => {
        const trimmedReason = reason.trim();
        if (!trimmedReason) {
            toast.error("Informe o motivo do acesso.");
            return;
        }

        const popup = window.open("", "_blank");
        if (!popup) {
            toast.error("Popup bloqueado. Permita popups para abrir o acesso.");
            return;
        }

        startTransition(async () => {
            try {
                const result = await createSupportLoginLink({
                    userId,
                    reason: trimmedReason,
                });

                if (!result?.url) {
                    popup.close();
                    const message = (result as any)?.message || "Nao foi possivel gerar o acesso.";
                    toast.error(message);
                    return;
                }

                setSupportLink(result.url);
                try {
                    popup.location.href = result.url;
                } catch (error) {
                    toast.error("Nao foi possivel abrir automaticamente. Use o link manual.");
                    return;
                }
                toast.success("Acesso aberto em nova aba.");
                setReason("");
                setSupportLink(null);
                setOpen(false);
            } catch (error) {
                popup.close();
                toast.error("Falha ao abrir acesso.");
            }
        });
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                    Acessar
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Acessar conta para suporte</DialogTitle>
                    <DialogDescription>
                        Isso abre a conta do cliente em uma nova aba e mantem sua sessao de admin ativa.
                        O acesso fica registrado no log de auditoria e expira em {SUPPORT_SESSION_MINUTES} minutos.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-2">
                    <Label htmlFor={`support-reason-${userId}`}>Motivo do acesso</Label>
                    <Textarea
                        id={`support-reason-${userId}`}
                        placeholder="Ex.: Cliente solicitou ajuda para configurar integracao."
                        value={reason}
                        onChange={(event) => setReason(event.target.value)}
                        rows={3}
                    />
                </div>
                {supportLink ? (
                    <div className="text-xs text-gray-500 break-all bg-gray-50 border border-gray-200 rounded-md px-3 py-2">
                        {supportLink}
                    </div>
                ) : null}
                <DialogFooter>
                    <Button variant="ghost" onClick={() => setOpen(false)} disabled={isPending}>
                        Cancelar
                    </Button>
                    {supportLink ? (
                        <Button
                            variant="outline"
                            onClick={() => window.open(supportLink, "_blank")}
                            disabled={isPending}
                        >
                            Abrir manualmente
                        </Button>
                    ) : null}
                    <Button onClick={handleConfirm} disabled={isPending}>
                        {isPending ? "Gerando..." : "Confirmar acesso"}
                    </Button>
                </DialogFooter>
                {userEmail ? (
                    <p className="text-xs text-muted-foreground">
                        Cliente: {userEmail}
                    </p>
                ) : null}
            </DialogContent>
        </Dialog>
    );
}
