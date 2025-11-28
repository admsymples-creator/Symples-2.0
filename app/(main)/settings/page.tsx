"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Wifi, Upload, UserPlus, Trash2, CreditCard, CheckCircle2, Copy, Minimize2, Maximize2, Monitor } from "lucide-react";
import { useUI } from "@/components/providers/UIProvider";

// Mock Data for Members
const INITIAL_MEMBERS = [
  {
    id: 1,
    name: "Julio Silva",
    email: "julio@example.com",
    role: "Owner",
    avatarUrl: null,
  },
  {
    id: 2,
    name: "Ana Costa",
    email: "ana@example.com",
    role: "Admin",
    avatarUrl: null,
  },
  {
    id: 3,
    name: "Roberto Santos",
    email: "roberto@example.com",
    role: "Member",
    avatarUrl: null,
  },
];

// Mock Data for Billing History
const BILLING_HISTORY = [
  { date: "01 Nov 2025", amount: "R$ 97,00", status: "Pago" },
  { date: "01 Out 2025", amount: "R$ 97,00", status: "Pago" },
  { date: "01 Set 2025", amount: "R$ 97,00", status: "Pago" },
];

export default function SettingsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const activeTab = searchParams.get("tab") || "general";

  // General Settings State
  const [workspaceName, setWorkspaceName] = useState("Minha Empresa Criativa");
  const [slug, setSlug] = useState("minha-empresa");
  const [isSaving, setIsSaving] = useState(false);
  const { scale, setScale } = useUI();

  // Members State
  const [members, setMembers] = useState(INITIAL_MEMBERS);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [newMember, setNewMember] = useState({ name: "", email: "", role: "Member" });

  const handleSaveSettings = () => {
    setIsSaving(true);
    // Simulating API call
    setTimeout(() => {
      setIsSaving(false);
      alert("Configurações salvas com sucesso!");
    }, 1000);
  };

  const handleRemoveMember = (id: number) => {
    if (confirm("Tem certeza que deseja remover este membro?")) {
      setMembers(members.filter((m) => m.id !== id));
    }
  };

  const handleInviteMember = () => {
    if (!newMember.name || !newMember.email) return;
    
    const newId = Math.max(...members.map(m => m.id), 0) + 1;
    setMembers([
      ...members,
      {
        id: newId,
        name: newMember.name,
        email: newMember.email,
        role: newMember.role,
        avatarUrl: null,
      }
    ]);
    setNewMember({ name: "", email: "", role: "Member" });
    setIsInviteOpen(false);
  };

  return (
    <div className="container max-w-5xl py-10 mx-auto">
      <div className="flex flex-col gap-2 mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Configurações do Workspace</h1>
        <p className="text-muted-foreground">
          Gerencie as preferências gerais, membros da equipe e faturamento.
        </p>
      </div>

      <Tabs 
        value={activeTab} 
        onValueChange={(val) => router.push(`/settings?tab=${val}`)} 
        className="w-full space-y-6"
      >
        {/* Navigation Tabs */}
        <TabsList className="grid w-full grid-cols-3 md:w-[400px]">
          <TabsTrigger value="general">Geral</TabsTrigger>
          <TabsTrigger value="members">Membros</TabsTrigger>
          <TabsTrigger value="billing">Faturamento</TabsTrigger>
        </TabsList>

        {/* A. ABA GERAL (WORKSPACE) */}
        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Identidade do Workspace</CardTitle>
              <CardDescription>
                Personalize como seu workspace aparece para os outros.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Avatar Upload */}
              <div className="flex items-center gap-6">
                <div className="h-20 w-20 bg-gray-100 rounded-lg flex items-center justify-center border border-dashed border-gray-300 text-gray-400">
                  <Upload className="h-8 w-8" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Logo do Workspace</h3>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">Alterar Logo</Button>
                    <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600 hover:bg-red-50">Remover</Button>
                  </div>
                  <p className="text-[0.8rem] text-muted-foreground">Recomendado: 400x400px, .PNG ou .JPG</p>
                </div>
              </div>

              <Separator />

              {/* Form Fields */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="workspace-name">Nome do Workspace</Label>
                  <Input 
                    id="workspace-name" 
                    value={workspaceName}
                    onChange={(e) => setWorkspaceName(e.target.value)}
                    placeholder="Ex: Acme Corp" 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slug">URL do Workspace (Slug)</Label>
                  <div className="flex shadow-sm rounded-md">
                    <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-input bg-muted text-muted-foreground text-sm">
                      app.symples.com/
                    </span>
                    <Input 
                      id="slug" 
                      value={slug}
                      onChange={(e) => setSlug(e.target.value)}
                      className="rounded-l-none" 
                    />
                  </div>
                </div>
              </div>
            </CardContent>
              <CardFooter className="border-t px-6 py-4 bg-gray-50/50 flex justify-end">
              <Button onClick={handleSaveSettings} disabled={isSaving}>
                {isSaving ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </CardFooter>
          </Card>

          {/* Appearance Settings */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                 <div className="p-2 bg-blue-100 rounded-full">
                    <Monitor className="h-5 w-5 text-blue-600" />
                 </div>
                 <div>
                    <CardTitle>Aparência</CardTitle>
                    <CardDescription>Personalize a densidade e tamanho da interface.</CardDescription>
                 </div>
              </div>
            </CardHeader>
            <CardContent>
               <div className="space-y-4">
                  <div className="space-y-3">
                     <Label>Escala da Interface</Label>
                     <div className="grid grid-cols-3 gap-4 max-w-md">
                        <button
                           onClick={() => setScale(0.875)}
                           className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all ${
                              scale === 0.875 
                                 ? "border-green-500 bg-green-50/50 text-green-700" 
                                 : "border-gray-200 hover:border-gray-300 text-gray-600 hover:bg-gray-50"
                           }`}
                        >
                           <Minimize2 className="w-6 h-6" />
                           <span className="text-sm font-medium">Compacto</span>
                        </button>

                        <button
                           onClick={() => setScale(1)}
                           className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all ${
                              scale === 1 
                                 ? "border-green-500 bg-green-50/50 text-green-700" 
                                 : "border-gray-200 hover:border-gray-300 text-gray-600 hover:bg-gray-50"
                           }`}
                        >
                           <span className="text-xl font-bold leading-none">A</span>
                           <span className="text-sm font-medium">Padrão</span>
                        </button>

                        <button
                           onClick={() => setScale(1.125)}
                           className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all ${
                              scale === 1.125 
                                 ? "border-green-500 bg-green-50/50 text-green-700" 
                                 : "border-gray-200 hover:border-gray-300 text-gray-600 hover:bg-gray-50"
                           }`}
                        >
                           <Maximize2 className="w-6 h-6" />
                           <span className="text-sm font-medium">Expandido</span>
                        </button>
                     </div>
                     <p className="text-xs text-muted-foreground pt-1">
                        Ajusta o tamanho de fontes, botões e espaçamentos em todo o sistema.
                     </p>
                  </div>
               </div>
            </CardContent>
          </Card>

          {/* WhatsApp Integration */}
          <Card className="border-green-100 overflow-hidden">
            <div className="h-2 bg-green-500 w-full"></div>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <div className="p-2 bg-green-100 rounded-full">
                    <Wifi className="h-5 w-5 text-green-600" />
                  </div>
                  Integração WhatsApp
                </CardTitle>
                <Badge variant="outline" className="border-green-200 text-green-700 bg-green-50">
                  <span className="h-2 w-2 rounded-full bg-green-500 mr-1 animate-pulse"></span>
                  Conectado
                </Badge>
              </div>
              <CardDescription>
                Conecte seu número para receber notificações e interagir com o bot.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-slate-950 text-slate-50 p-4 rounded-md font-mono text-sm flex items-center justify-between">
                <span>#START-8392-XKFJ-2910</span>
                <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white hover:bg-slate-800">
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Envie o código acima para o nosso número oficial para vincular este workspace.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* B. ABA MEMBROS (GESTÃO DE TIME) */}
        <TabsContent value="members" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">Membros do Time</h2>
            
            <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <UserPlus className="h-4 w-4" />
                  Convidar Pessoas
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Convidar novo membro</DialogTitle>
                  <DialogDescription>
                    Envie um convite por email para adicionar alguém ao seu time.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Nome Completo</Label>
                    <Input 
                      id="name" 
                      value={newMember.name}
                      onChange={(e) => setNewMember({...newMember, name: e.target.value})}
                      placeholder="Ex: João Silva" 
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input 
                      id="email" 
                      type="email"
                      value={newMember.email}
                      onChange={(e) => setNewMember({...newMember, email: e.target.value})}
                      placeholder="joao@empresa.com" 
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="role">Função</Label>
                    <Select 
                      value={newMember.role} 
                      onValueChange={(val) => setNewMember({...newMember, role: val})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma função" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Admin">Admin</SelectItem>
                        <SelectItem value="Member">Member</SelectItem>
                        <SelectItem value="Viewer">Viewer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsInviteOpen(false)}>Cancelar</Button>
                  <Button onClick={handleInviteMember}>Enviar Convite</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase bg-gray-50/50 border-b">
                  <tr>
                    <th className="px-6 py-4 font-medium">Usuário</th>
                    <th className="px-6 py-4 font-medium">Função</th>
                    <th className="px-6 py-4 font-medium text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {members.map((member) => (
                    <tr key={member.id} className="bg-white hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm">
                            {member.name.split(" ").map((n) => n[0]).join("").substring(0, 2)}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{member.name}</div>
                            <div className="text-muted-foreground text-xs">{member.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={member.role === "Owner" ? "default" : member.role === "Admin" ? "secondary" : "outline"}>
                          {member.role}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-muted-foreground hover:text-red-600 hover:bg-red-50" 
                          disabled={member.role === "Owner"}
                          onClick={() => handleRemoveMember(member.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* C. ABA FATURAMENTO (BILLING) */}
        <TabsContent value="billing" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Card do Plano */}
            <Card className="md:col-span-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Plano Atual</CardTitle>
                  <Badge className="bg-green-600 hover:bg-green-700">Plano Pro</Badge>
                </div>
                <CardDescription>
                  Ciclo de faturamento mensal. Próxima cobrança em 01 Dez 2025.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-end gap-2">
                  <span className="text-4xl font-bold">R$ 97</span>
                  <span className="text-muted-foreground mb-1">/mês</span>
                </div>

                {/* Barra de Progresso Customizada */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">Uso de Tarefas</span>
                    <span className="text-muted-foreground">450 / ilimitado</span>
                  </div>
                  <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-primary w-[25%] rounded-full"></div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Você está usando 25% da capacidade visual do dashboard (exemplo).
                  </p>
                </div>

                <div className="flex gap-3 pt-2">
                   <Button variant="outline">Gerenciar Assinatura</Button>
                   <Button variant="ghost">Ver Planos</Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Histórico */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Faturas Recentes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {BILLING_HISTORY.map((invoice, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-md transition-colors border-b last:border-0 border-gray-100">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-gray-100 rounded-full text-gray-500">
                        <CreditCard className="h-4 w-4" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-medium text-sm">{invoice.date}</span>
                        <span className="text-xs text-muted-foreground">Cartão final 4242</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-medium text-sm">{invoice.amount}</span>
                      <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        {invoice.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
