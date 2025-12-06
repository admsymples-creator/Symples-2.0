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
import { Upload, UserPlus, Trash2, CreditCard, CheckCircle2, Copy, Minimize2, Maximize2, Mail, X, Calendar, Phone, Monitor, Wifi, Loader2, MoreVertical, Edit, RotateCcw, Shield } from "lucide-react";
import { useUI } from "@/components/providers/UIScaleProvider";
import { updateProfile, Profile, Workspace, getWorkspaceById } from "@/lib/actions/user";
import { updateWorkspaceSettings } from "@/lib/actions/workspace-settings";
import { 
  inviteMember, 
  revokeInvite, 
  resendInvite,
  removeMember,
  updateMemberRole,
  Member, 
  Invite, 
  getWorkspaceMembers, 
  getPendingInvites,
  getCurrentUserRole
} from "@/lib/actions/members";
import { toast } from "sonner";
import { ConfirmModal } from "@/components/modals/confirm-modal";
import { Slider } from "@/components/ui/slider";
import { useWorkspace } from "@/components/providers/SidebarProvider";

// Mock Data for Billing History
const BILLING_HISTORY = [
  { date: "01 Nov 2025", amount: "R$ 97,00", status: "Pago" },
  { date: "01 Out 2025", amount: "R$ 97,00", status: "Pago" },
  { date: "01 Set 2025", amount: "R$ 97,00", status: "Pago" },
];

interface SettingsPageClientProps {
  user: Profile | null;
  workspace: Workspace | null;
  initialMembers: Member[];
  initialInvites: Invite[];
}

export function SettingsPageClient({ user, workspace: initialWorkspace, initialMembers, initialInvites }: SettingsPageClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const activeTab = searchParams.get("tab") || "general";
  const { activeWorkspaceId, isLoaded } = useWorkspace();

  // Workspace state - agora dinâmico baseado no contexto
  const [workspace, setWorkspace] = useState<Workspace | null>(initialWorkspace);
  const [isLoadingWorkspace, setIsLoadingWorkspace] = useState(false);

  // General Settings State
  const [workspaceName, setWorkspaceName] = useState(initialWorkspace?.name || "Minha Empresa");
  const [slug, setSlug] = useState(initialWorkspace?.slug || "minha-empresa");
  const [isSaving, setIsSaving] = useState(false);
  const { scale, setScale } = useUI();
  
  const [workspaceLogoFile, setWorkspaceLogoFile] = useState<File | null>(null);
  // Tipagem do workspace pode não ter logo_url ainda, então forçamos um cast ou usamos any por segurança
  const [workspaceLogoPreview, setWorkspaceLogoPreview] = useState<string | null>((initialWorkspace as any)?.logo_url || null);

  // Profile State
  const [profileName, setProfileName] = useState(user?.full_name || "");
  const [profileEmail, setProfileEmail] = useState(user?.email || "");
  const [jobTitle, setJobTitle] = useState(""); // Local state for job title
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user?.avatar_url || null);

  // Carregar workspace ativo quando o contexto mudar
  useEffect(() => {
    if (!isLoaded || !activeWorkspaceId) {
      return;
    }

    const loadActiveWorkspace = async () => {
      setIsLoadingWorkspace(true);
      try {
        const activeWorkspace = await getWorkspaceById(activeWorkspaceId);
        if (activeWorkspace) {
          setWorkspace(activeWorkspace);
          setWorkspaceName(activeWorkspace.name);
          setSlug(activeWorkspace.slug || "");
          setWorkspaceLogoPreview((activeWorkspace as any)?.logo_url || null);
          setWorkspaceLogoFile(null); // Limpar arquivo selecionado ao trocar workspace
          
          // Recarregar membros e convites do novo workspace
          const [members, invites] = await Promise.all([
            getWorkspaceMembers(activeWorkspaceId),
            getPendingInvites(activeWorkspaceId)
          ]);
          setMembers(members);
          setInvites(invites);
        }
      } catch (error) {
        console.error("Erro ao carregar workspace:", error);
        toast.error("Erro ao carregar dados do workspace");
      } finally {
        setIsLoadingWorkspace(false);
      }
    };

    loadActiveWorkspace();
  }, [activeWorkspaceId, isLoaded]);

  // Prevent hydration mismatch - mount Tabs only on client
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Update state if props change (para perfil do usuário)
  useEffect(() => {
    if (user) {
      setProfileName(user.full_name || "");
      setProfileEmail(user.email || "");
      setAvatarPreview(user.avatar_url || null);
    }
  }, [user]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleWorkspaceLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setWorkspaceLogoFile(file);
      setWorkspaceLogoPreview(URL.createObjectURL(file));
    }
  };

  // Prevent hydration mismatch - mount Tabs only on client
  const [isMounted, setIsMounted] = useState(false);

  // Members & Invites State
  const [members, setMembers] = useState<Member[]>(initialMembers);
  const [invites, setInvites] = useState<Invite[]>(initialInvites);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [newMember, setNewMember] = useState({ email: "", role: "member" });

  // Modal States
  const [inviteToRevoke, setInviteToRevoke] = useState<string | null>(null);
  const [isRevoking, setIsRevoking] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<string | null>(null);
  const [isRemovingMember, setIsRemovingMember] = useState(false);

  const handleSaveSettings = async () => {
    if (!workspace) return;
    setIsSaving(true);
    try {
        const formData = new FormData();
        formData.append("name", workspaceName);
        formData.append("slug", slug);
        
        if (workspaceLogoFile) {
            formData.append("logo", workspaceLogoFile);
        }

        await updateWorkspaceSettings(workspace.id, formData);
        
        toast.success("Configurações salvas!", {
            description: "As alterações do workspace já estão valendo.",
        });
        
        // Forçar refresh completo para atualizar a logo em outros componentes (Sidebar)
        router.refresh();
    } catch (error: any) {
        console.error(error);
        toast.error("Erro ao salvar configurações", { description: error.message });
    } finally {
        setIsSaving(false);
    }
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      const formData = new FormData();
      formData.append("full_name", profileName);
      formData.append("job_title", jobTitle);
      
      if (avatarFile) {
        formData.append("avatar", avatarFile);
      }
      
      await updateProfile(formData);
      toast.success("Perfil atualizado!", {
          description: "Suas informações foram salvas com sucesso."
      });
      
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error("Erro ao atualizar perfil.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveMember = (userId: string) => {
      setMemberToRemove(userId);
  };

  const confirmRemoveMember = async () => {
      if (!memberToRemove || !workspace) return;
      setIsRemovingMember(true);
      try {
          await removeMember(workspace.id, memberToRemove);
          setMembers(members.filter(m => m.user_id !== memberToRemove));
          toast.success("Membro removido", { 
              description: "O usuário perdeu acesso ao workspace." 
          });
          router.refresh();
      } catch (error: any) {
          toast.error("Erro ao remover membro", { description: error.message });
      } finally {
          setIsRemovingMember(false);
          setMemberToRemove(null);
      }
  }

  const handleInviteMember = async () => {
    if (!newMember.email || !workspace) return;
    
    setIsInviting(true);
    setInviteLink(null);

    try {
        const result = await inviteMember(workspace.id, newMember.email, newMember.role as "admin" | "member" | "viewer");
        
        // ✅ CORREÇÃO: Todos os convites agora são pendentes (fluxo unificado)
        // A função sempre retorna inviteLink quando bem-sucedida
        if (result.inviteLink) {
            // Se foi criado convite pendente
            setInviteLink(result.inviteLink);
            toast.success("Convite criado!", {
                description: "Copie o link para enviar ao usuário."
            });
            // Recarregar lista de convites pendentes
            if (workspace.id) {
                const updatedInvites = await getPendingInvites(workspace.id);
                setInvites(updatedInvites);
            }
        } else {
            // Convite foi criado mas sem link (em produção)
            toast.success("Convite enviado!", {
                description: "O email de convite foi enviado para o usuário."
            });
            // Recarregar lista de convites pendentes
            if (workspace.id) {
                const updatedInvites = await getPendingInvites(workspace.id);
                setInvites(updatedInvites);
            }
        }
        
        setNewMember({ email: "", role: "member" });
    } catch (error: any) {
        console.error("❌ Erro ao enviar convite no cliente:", error);
        toast.error("Erro ao enviar convite", { 
            description: error?.message || "Ocorreu um erro ao processar o convite. Verifique os logs para mais detalhes." 
        });
    } finally {
        setIsInviting(false);
    }
  };

  const handleRevokeInvite = (inviteId: string) => {
      setInviteToRevoke(inviteId);
  }

  const confirmRevokeInvite = async () => {
      if (!inviteToRevoke) return;
      setIsRevoking(true);
      try {
          await revokeInvite(inviteToRevoke);
          setInvites(invites.filter(i => i.id !== inviteToRevoke));
          toast.success("Convite cancelado", { description: "O link de acesso não funcionará mais." });
      } catch (error) {
          toast.error("Erro ao cancelar convite.");
      } finally {
          setIsRevoking(false);
          setInviteToRevoke(null);
      }
  }

  const getInitials = (name: string) => {
    return name
      ? name.split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase()
      : "US";
  };

  const getRoleLabel = (role: string): string => {
    const roleMap: Record<string, string> = {
      owner: "Proprietário",
      admin: "Administrador", 
      member: "Membro",
      viewer: "Visualizador"
    };
    return roleMap[role] || role;
  };

  // Renderizar apenas após montagem no cliente para evitar erro de hidratação
  if (!isMounted) {
    return (
      <div className="container max-w-5xl py-10 mx-auto">
        <div className="flex flex-col gap-2 mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Configurações do Workspace</h1>
          <p className="text-muted-foreground">
            Gerencie as preferências gerais, membros da equipe e faturamento.
          </p>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="text-muted-foreground">Carregando...</div>
        </div>
      </div>
    );
  }

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
        <TabsList className="grid w-full grid-cols-4 md:w-[500px]">
          <TabsTrigger value="general">Geral</TabsTrigger>
          <TabsTrigger value="members">Membros</TabsTrigger>
          <TabsTrigger value="billing">Faturamento</TabsTrigger>
          <TabsTrigger value="profile">Perfil</TabsTrigger>
        </TabsList>

        {/* A. ABA GERAL (WORKSPACE) */}
        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Identidade do Workspace
                {isLoadingWorkspace && (
                  <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                )}
              </CardTitle>
              <CardDescription>
                Personalize como seu workspace aparece para os outros.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Avatar Upload */}
              <div className="flex items-center gap-6">
                {workspaceLogoPreview ? (
                   <img 
                     src={workspaceLogoPreview} 
                     alt="Logo" 
                     className="h-20 w-20 rounded-lg object-cover border border-gray-200"
                   />
                ) : (
                    <div className="h-20 w-20 bg-gray-100 rounded-lg flex items-center justify-center border border-dashed border-gray-300 text-gray-400">
                    <Upload className="h-8 w-8" />
                    </div>
                )}
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Logo do Workspace</h3>
                  <div className="flex gap-2">
                    <Input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      id="workspace-logo-upload"
                      onChange={handleWorkspaceLogoChange}
                    />
                    <Button variant="outline" size="sm" onClick={() => document.getElementById('workspace-logo-upload')?.click()}>
                        Alterar Logo
                    </Button>
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
                    disabled={isLoadingWorkspace || !workspace}
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
                      disabled={isLoadingWorkspace || !workspace}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
              <CardFooter className="border-t px-6 py-4 bg-gray-50/50 flex justify-end">
              <Button onClick={handleSaveSettings} disabled={isSaving || isLoadingWorkspace || !workspace}>
                {isSaving ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </CardFooter>
          </Card>

          {/* Appearance Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Aparência</CardTitle>
              <CardDescription>Personalize a densidade e tamanho da interface.</CardDescription>
            </CardHeader>
            <CardContent>
               <div className="space-y-6">
                  <div className="space-y-4">
                     <div className="flex items-center justify-between">
                        <Label>Densidade da Interface</Label>
                        <span className="text-sm text-muted-foreground">
                           {scale === 0.85 ? "Mini" : scale === 0.925 ? "Compacto" : scale === 1 ? "Padrão" : "Expandido"}
                        </span>
                     </div>
                     
                     <div className="pt-2">
                        <Slider 
                           defaultValue={[[0.85, 0.925, 1, 1.125].indexOf(scale)]} 
                           max={3} 
                           step={1} 
                           value={[[0.85, 0.925, 1, 1.125].indexOf(scale)]}
                           onValueChange={(vals: number[]) => {
                              const levels: (0.85 | 0.925 | 1 | 1.125)[] = [0.85, 0.925, 1, 1.125];
                              setScale(levels[vals[0]]);
                           }}
                        />
                        <div className="flex justify-between mt-2">
                           <span className="text-xs text-gray-500">Mini</span>
                           <span className="text-xs text-gray-500">Compacto</span>
                           <span className="text-xs text-gray-500">Padrão</span>
                           <span className="text-xs text-gray-500">Expandido</span>
                        </div>
                     </div>

                     <p className="text-xs text-muted-foreground pt-1">
                        Ajusta o tamanho de fontes, botões e espaçamentos em todo o sistema.
                     </p>
                  </div>
               </div>
            </CardContent>
          </Card>

          {/* WhatsApp Integration */}
          <Card className="overflow-hidden">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
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
            <h2 className="text-lg font-medium flex items-center gap-2">
              Membros do Time
              {invites.length > 0 && (
                <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                  {invites.length} pendente{invites.length > 1 ? 's' : ''}
                </Badge>
              )}
            </h2>
            
            <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <UserPlus className="h-4 w-4" />
                  Convidar Pessoas
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Convidar novo membro</DialogTitle>
                  <DialogDescription>
                    Envie um convite por email para adicionar alguém ao seu time.
                  </DialogDescription>
                </DialogHeader>
                
                {!inviteLink ? (
                    <div className="grid gap-4 py-4">
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
                            <SelectItem value="admin">Administrador</SelectItem>
                            <SelectItem value="member">Membro</SelectItem>
                            <SelectItem value="viewer">Visualizador</SelectItem>
                        </SelectContent>
                        </Select>
                    </div>
                    </div>
                ) : (
                    <div className="py-4 space-y-4">
                        <div className="p-4 bg-green-50 border border-green-100 rounded-lg flex flex-col items-center text-center gap-2">
                            <CheckCircle2 className="h-8 w-8 text-green-600" />
                            <h3 className="font-medium text-green-900">Convite Criado!</h3>
                            <p className="text-sm text-green-700">
                                Em ambiente de desenvolvimento, use o link abaixo:
                            </p>
                        </div>
                        <div className="flex items-center gap-2 p-3 bg-slate-100 rounded-md border min-w-0">
                            <code className="text-xs flex-1 break-all min-w-0 pr-2">{inviteLink}</code>
                            <Button size="sm" variant="ghost" className="flex-shrink-0" onClick={() => {
                                navigator.clipboard.writeText(inviteLink);
                                toast.success("Link copiado!");
                            }}>
                                <Copy className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                )}

                <DialogFooter>
                  {inviteLink ? (
                      <Button onClick={async () => {
                          setInviteLink(null);
                          setIsInviteOpen(false);
                          // Recarregar lista de convites após fechar modal
                          if (workspace?.id) {
                              const updatedInvites = await getPendingInvites(workspace.id);
                              setInvites(updatedInvites);
                          }
                          router.refresh();
                      }}>Concluir</Button>
                  ) : (
                    <>
                        <Button variant="outline" onClick={() => setIsInviteOpen(false)}>Cancelar</Button>
                        <Button onClick={handleInviteMember} disabled={isInviting}>
                            {isInviting ? "Enviando..." : "Enviar Convite"}
                        </Button>
                    </>
                  )}
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
                  {members.length === 0 && (
                      <tr>
                          <td colSpan={3} className="px-6 py-8 text-center text-muted-foreground">
                              Nenhum membro encontrado além de você.
                          </td>
                      </tr>
                  )}
                  {members.map((member) => {
                    const name = member.profiles?.full_name || "Usuário";
                    const email = member.profiles?.email || "";
                    const initials = getInitials(name);
                    
                    return (
                        <tr key={member.user_id} className="bg-white hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm">
                                {initials}
                            </div>
                            <div>
                                <div className="font-medium text-gray-900">{name}</div>
                                <div className="text-muted-foreground text-xs">{email}</div>
                            </div>
                            </div>
                        </td>
                        <td className="px-6 py-4">
                            <Badge variant={member.role === "owner" ? "default" : member.role === "admin" ? "secondary" : "outline"}>
                            {getRoleLabel(member.role)}
                            </Badge>
                        </td>
                        <td className="px-6 py-4 text-right">
                            <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-muted-foreground hover:text-red-600 hover:bg-red-50" 
                            disabled={member.role === "owner" || member.user_id === user?.id} // Don't allow deleting self or owner
                            onClick={() => handleRemoveMember(member.user_id)}
                            >
                            <Trash2 className="h-4 w-4" />
                            </Button>
                        </td>
                        </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {invites.length > 0 && (
              <div className="space-y-4">
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Convites Pendentes</h3>
                  <Card>
                    <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-muted-foreground uppercase bg-gray-50/50 border-b">
                        <tr>
                            <th className="px-6 py-4 font-medium">Email</th>
                            <th className="px-6 py-4 font-medium">Função</th>
                            <th className="px-6 py-4 font-medium text-right">Ações</th>
                        </tr>
                        </thead>
                        <tbody className="divide-y">
                        {invites.map((invite) => (
                            <tr key={invite.id} className="bg-white hover:bg-gray-50/50 transition-colors">
                            <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                    <div className="h-8 w-8 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-700 font-bold text-xs">
                                        <Mail className="h-4 w-4" />
                                    </div>
                                    <span className="text-gray-700">{invite.email}</span>
                                </div>
                            </td>
                            <td className="px-6 py-4">
                                <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                                    {getRoleLabel(invite.role)} (Pendente)
                                </Badge>
                            </td>
                            <td className="px-6 py-4 text-right">
                                <Button 
                                variant="ghost" 
                                size="sm" 
                                className="text-red-500 hover:text-red-700 hover:bg-red-50 gap-1" 
                                onClick={() => handleRevokeInvite(invite.id)}
                                >
                                <X className="h-3 w-3" />
                                Revogar
                                </Button>
                            </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                    </div>
                </Card>
              </div>
          )}

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

        {/* D. ABA PERFIL (USER PROFILE) */}
        <TabsContent value="profile" className="space-y-6">
          {/* Personal Info */}
          <Card>
            <CardHeader>
              <CardTitle>Informações Pessoais</CardTitle>
              <CardDescription>
                Gerencie suas informações de identidade.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Avatar Upload */}
              <div className="flex items-center gap-6">
                {avatarPreview ? (
                  <img 
                    src={avatarPreview} 
                    alt={profileName} 
                    className="h-20 w-20 rounded-full object-cover border-2 border-white shadow-sm"
                  />
                ) : (
                  <div className="h-20 w-20 bg-indigo-100 rounded-full flex items-center justify-center border-2 border-white shadow-sm text-indigo-600 text-xl font-bold">
                    {getInitials(profileName)}
                  </div>
                )}
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Sua Foto</h3>
                  <div className="flex gap-2">
                    <Input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      id="avatar-upload"
                      onChange={handleAvatarChange}
                    />
                    <Button variant="outline" size="sm" onClick={() => document.getElementById('avatar-upload')?.click()}>
                      Carregar Nova
                    </Button>
                    <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600 hover:bg-red-50">Remover</Button>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="profile-name">Nome Completo</Label>
                  <Input 
                    id="profile-name" 
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    placeholder="Seu nome completo" 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="profile-email">Email</Label>
                  <Input 
                    id="profile-email" 
                    type="email"
                    value={profileEmail}
                    onChange={(e) => setProfileEmail(e.target.value)}
                    placeholder="seu@email.com"
                    disabled 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="profile-role">Cargo / Função</Label>
                  <Input 
                    id="profile-role" 
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    placeholder="Ex: Product Manager" 
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter className="border-t px-6 py-4 bg-gray-50/50 flex justify-end">
              <Button onClick={handleSaveProfile} disabled={isSaving}>
                {isSaving ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>

      <ConfirmModal 
        open={!!inviteToRevoke}
        onOpenChange={(open) => !open && setInviteToRevoke(null)}
        title="Revogar Convite"
        description="O usuário não poderá mais acessar o workspace usando este link. Tem certeza?"
        onConfirm={confirmRevokeInvite}
        isLoading={isRevoking}
      />
      
      <ConfirmModal 
        open={!!memberToRemove}
        onOpenChange={(open) => !open && setMemberToRemove(null)}
        title="Remover Membro"
        description="O usuário perderá acesso a todas as tarefas e dados deste workspace. Esta ação não pode ser desfeita."
        confirmText="Sim, remover membro"
        onConfirm={confirmRemoveMember}
        isLoading={isRemovingMember}
      />
    </div>
  );
}
