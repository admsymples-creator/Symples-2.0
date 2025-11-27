"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm() {
    const [email, setEmail] = useState("");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        console.log("Login disparado", { email });
    };

    const handleGoogleLogin = () => {
        console.log("Google login disparado");
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
                            Bem-vindo de volta
                        </h1>
                        <p className="text-gray-500">
                            Entre com seu e-mail corporativo.
                        </p>
                    </div>

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
                                className="h-11 rounded-lg"
                            />
                        </div>

                        <Button
                            type="submit"
                            className="w-full h-11 bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg"
                        >
                            Enviar Link de Acesso
                        </Button>
                    </form>

                    {/* Social Login */}
                    <Button
                        variant="outline"
                        className="w-full h-11 rounded-lg border-gray-300 hover:bg-gray-50"
                        onClick={handleGoogleLogin}
                    >
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
                        Entrar com Google
                    </Button>

                    {/* Footer */}
                    <div className="text-center text-sm text-gray-500">
                        Não tem conta?{" "}
                        <button
                            type="button"
                            className="text-green-600 hover:text-green-700 font-medium"
                            onClick={() => console.log("Cadastrar disparado")}
                        >
                            Cadastre-se
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
