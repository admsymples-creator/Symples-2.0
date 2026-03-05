"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { signOut } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "support_session_expires_at";

function formatMinutes(minutes: number) {
    if (minutes <= 1) return "1 min";
    return `${minutes} min`;
}

export function SupportSessionBanner() {
    const [expiresAt, setExpiresAt] = useState<string | null>(null);
    const [now, setNow] = useState(() => Date.now());
    const hasSignedOutRef = useRef(false);

    useEffect(() => {
        const stored = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
        if (stored) {
            setExpiresAt(stored);
        }
    }, []);

    useEffect(() => {
        if (typeof window === "undefined") return;
        const params = new URLSearchParams(window.location.search);
        const support = params.get("support");
        const supportExpires = params.get("support_expires");
        if (support === "1" && supportExpires) {
            localStorage.setItem(STORAGE_KEY, supportExpires);
            setExpiresAt(supportExpires);

            params.delete("support");
            params.delete("support_expires");
            const nextUrl = params.toString()
                ? `${window.location.pathname}?${params.toString()}`
                : window.location.pathname;
            window.history.replaceState({}, "", nextUrl);
        }
    }, []);

    useEffect(() => {
        if (!expiresAt) return;
        const interval = setInterval(() => setNow(Date.now()), 30000);
        return () => clearInterval(interval);
    }, [expiresAt]);

    const expiresMs = useMemo(() => {
        if (!expiresAt) return null;
        const parsed = Date.parse(expiresAt);
        return Number.isNaN(parsed) ? null : parsed;
    }, [expiresAt]);
    const minutesRemaining = useMemo(() => {
        if (!expiresMs) return null;
        return Math.max(0, Math.ceil((expiresMs - now) / 60000));
    }, [expiresMs, now]);

    useEffect(() => {
        if (!expiresMs || hasSignedOutRef.current) return;
        if (Date.now() >= expiresMs) {
            hasSignedOutRef.current = true;
            localStorage.removeItem(STORAGE_KEY);
            signOut().finally(() => {
                window.location.href = "/login";
            });
        }
    }, [expiresMs]);

    const handleExitSupport = () => {
        if (hasSignedOutRef.current) return;
        hasSignedOutRef.current = true;
        localStorage.removeItem(STORAGE_KEY);
        signOut().finally(() => {
            window.location.href = "/login";
        });
    };

    if (!expiresMs || !minutesRemaining || minutesRemaining <= 0) {
        return null;
    }

    return (
        <div className="w-full border-b border-amber-200 bg-amber-50 text-amber-900">
            <div className="mx-auto flex w-full max-w-screen-2xl items-center justify-between px-4 py-2 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">Modo suporte ativo</span>
                    <span className="text-amber-700">
                        Expira em {formatMinutes(minutesRemaining)}
                    </span>
                </div>
                <Button size="sm" variant="outline" onClick={handleExitSupport}>
                    Sair do modo suporte
                </Button>
            </div>
        </div>
    );
}
