"use client";

import { useState } from "react";
import Image from "next/image";
import { Building2, Check, CheckCircle2, Copy, Loader2, MessageCircle, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { createWorkspace } from "@/lib/actions/onboarding";
import { useRouter } from "next/navigation";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

type Step = 1 | 2 | 3;

export function OnboardingWizard() {
    const [currentStep, setCurrentStep] = useState<Step>(1);
    const [companyName, setCompanyName] = useState("");
    const [segment, setSegment] = useState("");
    const [isConnecting, setIsConnecting] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    
    // Novos estados
    const [magicCode, setMagicCode] = useState("");
    const [isCreating, setIsCreating] = useState(false);
    const router = useRouter();

    const steps = [
        { number: 1, label: "Sua Empresa", icon: Building2 },
        { number: 2, label: "Conexão WhatsApp", icon: Smartphone },
        { number: 3, label: "Tudo Pronto", icon: CheckCircle2 },
    ];

    const handleStep1Continue = async () => {
        if (companyName && segment) {
            setIsCreating(true);
            try {
                const formData = new FormData();
                formData.append("name", companyName);
                formData.append("segment", segment);

                const result = await createWorkspace(formData);

                if (result.success && result.magicCode) {
                    setMagicCode(result.magicCode);
                    setCurrentStep(2);
                } else {
                    alert(result.error || "Erro ao criar workspace");
                }
            } catch (error) {
                console.error(error);
                alert("Erro inesperado ao criar workspace");
            } finally {
                setIsCreating(false);
            }
        }
    };

    const handleCopyCode = () => {
        navigator.clipboard.writeText(magicCode);
    };

    const handleWhatsAppOpen = () => {
        window.open(`https://wa.me/?text=${encodeURIComponent(magicCode)}`, "_blank");
    };

    const handleMessageSent = () => {
        setIsConnecting(true);
        // Simulate connection
        setTimeout(() => {
            setIsConnecting(false);
            setIsConnected(true);
            setCurrentStep(3);
        }, 2000);
    };

    const handleSkip = () => {
        setCurrentStep(3);
    };

    return (
        <div className="min-h-screen w-full grid lg:grid-cols-[400px_1fr]">
            {/* Left Sidebar - Stepper */}
            <div className="bg-slate-900 text-white p-12 flex flex-col justify-between">
                <div>
                    {/* Logo */}
                    <div className="mb-16">
                        <Image
                            src="/logo.avif"
                            alt="Symples"
                            width={150}
                            height={45}
                            priority
                        />
                    </div>

                    {/* Vertical Stepper */}
                    <div className="space-y-8">
                        {steps.map((step) => {
                            const Icon = step.icon;
                            const isActive = currentStep === step.number;
                            const isCompleted = currentStep > step.number;
                            const isFuture = currentStep < step.number;

                            return (
                                <div
                                    key={step.number}
                                    className={`flex items-start gap-4 ${currentStep >= step.number
                                            ? "border-l-4 border-green-500 pl-4"
                                            : "pl-5"
                                        }`}
                                >
                                    <div className="flex-shrink-0">
                                        <Icon
                                            className={`w-6 h-6 ${isCompleted
                                                    ? "text-green-500 opacity-70"
                                                    : isActive
                                                        ? "text-green-500"
                                                        : "text-slate-600"
                                                }`}
                                        />
                                    </div>
                                    <div>
                                        <p
                                            className={`font-semibold ${isActive
                                                    ? "text-white"
                                                    : isCompleted
                                                        ? "text-slate-400"
                                                        : "text-slate-600"
                                                }`}
                                        >
                                            {step.label}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Footer */}
                <div className="text-slate-400 text-sm">
                    <p>Precisa de ajuda?</p>
                    <p className="text-green-500 font-medium cursor-pointer hover:text-green-400">
                        Falar com suporte
                    </p>
                </div>
            </div>

            {/* Right Content Area */}
            <div className="bg-white p-8 lg:p-12 flex flex-col justify-center items-start">
                <div className="w-full max-w-[480px] space-y-6">
                    {/* Step 1: Workspace */}
                    {currentStep === 1 && (
                        <>
                            <div className="space-y-2 text-left">
                                <h1 className="text-3xl font-semibold text-gray-900">
                                    Crie seu espaço de trabalho
                                </h1>
                                <p className="text-slate-500">
                                    Dê um nome para sua operação.
                                </p>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="company" className="text-gray-700">
                                        Nome da Empresa
                                    </Label>
                                    <Input
                                        id="company"
                                        type="text"
                                        placeholder="Ex: Agência V4"
                                        value={companyName}
                                        onChange={(e) => setCompanyName(e.target.value)}
                                        className="h-11 rounded-lg"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="segment" className="text-gray-700">
                                        Qual seu segmento?
                                    </Label>
                                    <Select value={segment} onValueChange={setSegment}>
                                        <SelectTrigger className="h-11 rounded-lg">
                                            <SelectValue placeholder="Selecione..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="marketing">Marketing</SelectItem>
                                            <SelectItem value="consultoria">Consultoria</SelectItem>
                                            <SelectItem value="tecnologia">Tecnologia</SelectItem>
                                            <SelectItem value="outro">Outro</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <Button
                                    onClick={handleStep1Continue}
                                    disabled={!companyName || !segment || isCreating}
                                    className={`w-full h-11 text-white font-medium rounded-lg transition-all ${!companyName || !segment || isCreating
                                            ? "bg-green-600 opacity-50 cursor-not-allowed"
                                            : "bg-green-500 hover:bg-green-700 opacity-100"
                                        }`}
                                >
                                    {isCreating ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Criando workspace...
                                        </>
                                    ) : (
                                        "Continuar"
                                    )}
                                </Button>
                            </div>
                        </>
                    )}

                    {/* Step 2: WhatsApp Connection */}
                    {currentStep === 2 && (
                        <>
                            <div className="space-y-2 text-left">
                                <h1 className="text-3xl font-semibold text-gray-900">
                                    Conecte seu WhatsApp
                                </h1>
                                <p className="text-slate-500">
                                    Envie o código abaixo para ativar seu assistente.
                                </p>
                            </div>

                            {/* Magic Code Card */}
                            <Card className="bg-slate-100 border-dashed border-2 border-slate-300 rounded-xl p-6">
                                <div className="flex items-center justify-between">
                                    <code className="text-2xl font-mono font-bold text-gray-900">
                                        {magicCode}
                                    </code>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleCopyCode}
                                        className="rounded-lg border-slate-400 hover:bg-slate-200"
                                    >
                                        <Copy className="w-4 h-4 mr-2" />
                                        Copiar
                                    </Button>
                                </div>
                            </Card>

                            {/* Actions */}
                            <div className="space-y-3">
                                <Button
                                    onClick={handleWhatsAppOpen}
                                    className="w-full h-11 bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg"
                                >
                                    <MessageCircle className="w-4 h-4 mr-2" />
                                    Abrir WhatsApp Web
                                </Button>

                                <Button
                                    variant="outline"
                                    onClick={handleMessageSent}
                                    disabled={isConnecting}
                                    className="w-full h-11 rounded-lg border-gray-300 hover:bg-gray-50"
                                >
                                    {isConnecting ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Aguardando mensagem...
                                        </>
                                    ) : (
                                        "Já enviei a mensagem"
                                    )}
                                </Button>

                                <button
                                    onClick={handleSkip}
                                    className="w-full text-xs text-slate-400 hover:text-slate-600 mt-4"
                                >
                                    Pular conexão por enquanto
                                </button>
                            </div>
                        </>
                    )}

                    {/* Step 3: Success */}
                    {currentStep === 3 && (
                        <>
                            <div className="space-y-6 text-center w-full">
                                <div className="flex justify-center">
                                    <div className="w-24 h-24 rounded-full bg-green-50 flex items-center justify-center">
                                        <Check className="w-12 h-12 text-green-500" />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <h1 className="text-3xl font-semibold text-gray-900">
                                        {isConnected ? "Conectado com sucesso!" : "Tudo pronto!"}
                                    </h1>
                                    <p className="text-slate-500">
                                        {isConnected
                                            ? "Seu assistente WhatsApp está ativo."
                                            : "Você pode conectar o WhatsApp depois."}
                                    </p>
                                </div>

                                <Button
                                    onClick={() => router.push("/home")}
                                    className="w-full h-11 bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg"
                                >
                                    Ir para o Dashboard
                                </Button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
