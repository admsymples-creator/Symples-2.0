"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { createTrialInviteLink } from "@/lib/actions/admin";

const TRIAL_DAYS_OPTIONS = [15, 30, 60] as const;
const TRIAL_PLAN_OPTIONS = [
    { value: 'pro', label: 'Pro' },
    { value: 'business', label: 'Business' },
] as const;

export function AdminTrialInviteCard() {
    const [email, setEmail] = useState("");
    const [trialDays, setTrialDays] = useState<number>(30);
    const [trialPlan, setTrialPlan] = useState<'pro' | 'business'>('pro');
    const [inviteLink, setInviteLink] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    const handleGenerate = () => {
        const trimmedEmail = email.trim();
        if (!trimmedEmail) {
            toast.error("Informe o email do owner.");
            return;
        }

        startTransition(async () => {
            const result = await createTrialInviteLink({
                email: trimmedEmail,
                trialDays,
                trialPlan,
            });

            if (!result.success || !result.inviteLink) {
                toast.error("Nao foi possivel gerar o convite.");
                return;
            }

            setInviteLink(result.inviteLink);
            toast.success("Convite gerado.");
        });
    };

    const handleCopy = async () => {
        if (!inviteLink) return;
        await navigator.clipboard.writeText(inviteLink);
        toast.success("Link copiado.");
    };

    return (
        <Card className="border border-gray-200 shadow-sm p-4">
            <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-2">
                    <div>
                        <div className="text-sm font-semibold text-gray-900">Convite de Trial (Owner)</div>
                        <div className="text-xs text-muted-foreground">
                            Gera um link para criar conta com trial de 15, 30 ou 60 dias.
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3">
                    <div className="space-y-1.5">
                        <Label htmlFor="trial-invite-email" className="text-xs text-gray-700">
                            Email do owner
                        </Label>
                        <Input
                            id="trial-invite-email"
                            type="email"
                            placeholder="owner@empresa.com"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            className="h-9"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-xs text-gray-700">Plano</Label>
                        <div className="flex items-center gap-2">
                            {TRIAL_PLAN_OPTIONS.map((plan) => (
                                <Button
                                    key={plan.value}
                                    type="button"
                                    size="sm"
                                    variant={trialPlan === plan.value ? 'default' : 'outline'}
                                    className="h-9"
                                    onClick={() => setTrialPlan(plan.value)}
                                >
                                    {plan.label}
                                </Button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-xs text-gray-700">Trial</Label>
                        <div className="flex items-center gap-2">
                            {TRIAL_DAYS_OPTIONS.map((days) => (
                                <Button
                                    key={days}
                                    type="button"
                                    size="sm"
                                    variant={trialDays === days ? "default" : "outline"}
                                    className="h-9"
                                    onClick={() => setTrialDays(days)}
                                >
                                    {days} dias
                                </Button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button onClick={handleGenerate} disabled={isPending}>
                        {isPending ? "Gerando..." : "Gerar link"}
                    </Button>
                    {inviteLink ? (
                        <Button variant="outline" onClick={handleCopy}>
                            Copiar link
                        </Button>
                    ) : null}
                </div>

                {inviteLink ? (
                    <div className="text-xs text-gray-500 break-all bg-gray-50 border border-gray-200 rounded-md px-3 py-2">
                        {inviteLink}
                    </div>
                ) : null}
            </div>
        </Card>
    );
}
