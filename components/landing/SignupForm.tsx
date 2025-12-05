"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signupWithEmail, signInWithGoogle } from "@/lib/actions/auth";
import { Loader2, Mail, AlertCircle, Building2 } from "lucide-react";
import { getInviteDetails } from "@/lib/actions/members";

interface SignupFormProps {
  inviteToken?: string;
}

export function SignupForm({ inviteToken }: SignupFormProps) {
    const [email, setEmail] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isGoogleLoading, setIsGoogleLoading] = useState(false);
    const [inviteInfo, setInviteInfo] = useState<{ workspaceName?: string; email?: string } | null>(null);

    // Salvar token de convite para usar após signup
    useEffect(() => {
        if (inviteToken) {
            // Salvar token no localStorage para backup (caso o callback falhe)
            localStorage.setItem("pending_invite_token", inviteToken);
        }
    }, [inviteToken]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            const formData = new FormData();
            formData.append("email", email);
            if (inviteToken) {
                formData.append("inviteToken", inviteToken);
            }

            const result = await signupWithEmail(formData);

            if (result.success) {
                setIsSuccess(true);
            } else {
                setError(result.message || "Ocorreu um erro ao criar sua conta.");
            }
        } catch (err) {
            setError("Erro inesperado. Tente novamente.");
        } finally {
            if (!isSuccess) {
                setIsLoading(false);
            }
        }
    };

    const handleGoogleSignup = async () => {
        setIsGoogleLoading(true);
        try {
            // Salvar token antes de redirecionar
            if (inviteToken) {
                localStorage.setItem("pending_invite_token", inviteToken);
            }
            await signInWithGoogle(inviteToken);
        } catch (error) {
            console.error("Erro no signup com Google:", error);
            setIsGoogleLoading(false);
        }
    };

    return (
        <div className="h-screen w-full grid lg:grid-cols-2">
            {/* Left Side - Brand (Desktop Only) */}
            <div className="hidden lg:flex bg-slate-900 flex-col items-center justify-center p-12 relative">
                <div className="flex flex-col items-center justify-center flex-1">
                    <Image
                        src="/logo.avif"
                        alt="Symples"
                        width={200}
                        height={60}
                        priority
                    />
                </div>

                <div className="absolute bottom-16 text-center px-8">
                    <p className="text-slate-400 text-lg italic opacity-60">
                        "O sistema operacional do seu negócio."
                    </p>
                </div>
            </div>

            {/* Right Side - Form */}
            <div className="bg-white flex flex-col items-center justify-center p-8 lg:p-12">
                <div className="w-full max-w-[400px] space-y-6">
                    {/* Mobile Logo */}
                    <div className="flex lg:hidden items-center mb-8">
                        <Image
                            src="/logo.avif"
                            alt="Symples"
                            width={150}
                            height={45}
                            priority
                        />
                    </div>

                    {/* Header */}
                    <div className="space-y-2 text-left">
                        <h1 className="text-3xl font-semibold text-gray-900">
                            {inviteInfo?.workspaceName ? (
                                <>Você foi convidado!</>
                            ) : (
                                <>Criar conta</>
                            )}
                        </h1>
                        <p className="text-gray-500">
                            {inviteInfo?.workspaceName ? (
                                <>Crie sua conta para se juntar ao workspace <strong>{inviteInfo.workspaceName}</strong></>
                            ) : (
                                <>Crie sua conta com seu e-mail corporativo.</>
                            )}
                        </p>
                    </div>

                    {isSuccess ? (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-6 flex flex-col items-center text-center space-y-4 animate-in fade-in slide-in-from-bottom-4">
                            <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
                                <Mail className="h-6 w-6 text-green-600" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="font-semibold text-green-900">Verifique seu e-mail</h3>
                                <p className="text-sm text-green-700">
                                    Enviamos um link mágico para <strong>{email}</strong>.
                                    Clique nele para criar sua conta e aceitar o convite automaticamente.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Form */}
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="email" className="text-gray-700">
                                        E-mail profissional
                                    </Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="seu@email.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        disabled={isLoading || !!inviteInfo?.email}
                                        className={`h-11 rounded-lg ${error ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                                    />
                                    {error && (
                                        <div className="flex items-center gap-2 text-sm text-red-600 animate-in slide-in-from-top-1">
                                            <AlertCircle className="h-4 w-4" />
                                            <span>{error}</span>
                                        </div>
                                    )}
                                </div>

                                <Button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full h-11 bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Enviando...
                                        </>
                                    ) : (
                                        "Criar Conta"
                                    )}
                                </Button>
                            </form>

                            {/* Social Login */}
                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <span className="w-full border-t border-gray-200" />
                                </div>
                                <div className="relative flex justify-center text-xs uppercase">
                                    <span className="bg-white px-2 text-gray-500">Ou continue com</span>
                                </div>
                            </div>

                            <Button
                                variant="outline"
                                className="w-full h-11 rounded-lg border-gray-300 hover:bg-gray-50"
                                onClick={handleGoogleSignup}
                                disabled={isLoading || isGoogleLoading}
                            >
                                {isGoogleLoading ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <div className="flex items-center">
                                        <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                                            <path
                                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                                fill="#4285F4"
                                            />
                                            <path
                                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                                fill="#34A853"
                                            />
                                            <path
                                                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                                fill="#FBBC05"
                                            />
                                            <path
                                                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                                fill="#EA4335"
                                            />
                                        </svg>
                                        Criar conta com Google
                                    </div>
                                )}
                            </Button>

                            {/* Link para login se já tem conta */}
                            <div className="text-center text-sm text-gray-500">
                                Já tem uma conta?{" "}
                                <a href="/login" className="text-green-600 hover:underline font-medium">
                                    Entrar
                                </a>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

