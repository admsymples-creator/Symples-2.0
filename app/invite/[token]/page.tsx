import { getInviteDetails, acceptInvite } from "@/lib/actions/members";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, AlertCircle, ArrowRight, Building2 } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerActionClient } from "@/lib/supabase/server";

interface InvitePageProps {
  params: Promise<{
    token: string;
  }>;
}

export default async function InvitePage({ params }: InvitePageProps) {
  // ✅ CORREÇÃO: Next.js 15+ requer await para params (são Promises)
  const { token } = await params;
  const inviteId = token;
  
  // ✅ NOTA: O cookie 'pending_invite' é criado automaticamente pelo middleware
  // quando o usuário acessa /invite/[token]. Isso permite que o token sobreviva
  // a redirects OAuth e Magic Link sem depender de localStorage ou parâmetros de URL.
  
  const supabase = await createServerActionClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Tentar buscar detalhes do convite
  // Nota: Se o usuário não estiver logado, getInviteDetails falhará devido ao RLS.
  // Se o email do usuário não bater com o convite, também falhará.
  const invite = await getInviteDetails(inviteId);
  
  // Se o convite foi encontrado e já foi aceito
  if (invite && invite.status === 'accepted') {
     return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
           <Card className="w-full max-w-md text-center">
              <CardHeader>
                 <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                    <CheckCircle2 className="h-6 w-6 text-green-600" />
                 </div>
                 <CardTitle>Convite já aceito</CardTitle>
                 <CardDescription>
                    Você já é membro deste workspace.
                 </CardDescription>
              </CardHeader>
              <CardFooter className="justify-center">
                 <Link href="/home">
                    <Button>Ir para Dashboard</Button>
                 </Link>
              </CardFooter>
           </Card>
        </div>
     );
  }

  // Action de aceite para ser chamada pelo formulário
  async function handleAccept() {
    "use server";
    await acceptInvite(inviteId);
    redirect("/home");
  }

  // Caso 1: Usuário NÃO logado
  if (!user) {
    // Se o convite foi encontrado, mostrar detalhes e opção de signup/login
    if (invite) {
      const workspaceName = (invite as any).workspaces ? ((invite as any).workspaces as any).name : "um Workspace";
      const inviterName = (invite as any).invited_by_profile ? ((invite as any).invited_by_profile as any).full_name : "Alguém";
      
      return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-2xl font-bold text-green-600">
                {workspaceName.substring(0, 2).toUpperCase()}
              </div>
              <CardTitle>Convite para {workspaceName}</CardTitle>
              <CardDescription>
                <strong>{inviterName}</strong> convidou você para participar como <strong>{invite.role}</strong>.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-sm text-muted-foreground">
                Para aceitar este convite, você precisa criar uma conta ou fazer login.
              </p>
            </CardContent>
            <CardFooter className="flex-col gap-3">
              <Link href={`/signup?invite=${inviteId}`} className="w-full">
                <Button className="w-full text-lg py-6 bg-green-600 hover:bg-green-700">
                  Criar Conta e Aceitar
                </Button>
              </Link>
              <Link href={`/login?next=/invite/${inviteId}`} className="w-full">
                <Button variant="outline" className="w-full">
                  Já tenho conta - Entrar
                </Button>
              </Link>
            </CardFooter>
          </Card>
        </div>
      );
    }
    
    // Se não encontrou o convite, mostrar mensagem genérica
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
               <Building2 className="h-6 w-6 text-blue-600" />
            </div>
            <CardTitle>Convite para Workspace</CardTitle>
            <CardDescription>
              Você recebeu um convite para colaborar no Symples.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
             <p className="text-sm text-muted-foreground">
                Para visualizar os detalhes e aceitar o convite, você precisa fazer login.
             </p>
          </CardContent>
          <CardFooter>
            <Link href={`/login?next=/invite/${inviteId}`} className="w-full">
              <Button className="w-full group">
                Entrar para Aceitar
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Caso 2: Usuário logado, mas convite não encontrado (RLS bloqueou ou inválido)
  // Provavelmente o email do usuário não bate com o do convite
  if (!invite) {
     return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
           <Card className="w-full max-w-md border-red-100">
              <CardHeader className="text-center">
                 <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                    <AlertCircle className="h-6 w-6 text-red-600" />
                 </div>
                 <CardTitle className="text-red-900">Acesso não autorizado</CardTitle>
                 <CardDescription>
                    Não encontramos este convite ou ele não pertence à sua conta atual.
                 </CardDescription>
              </CardHeader>
              <CardContent className="text-center space-y-4">
                 <div className="rounded-md bg-slate-50 p-3 text-sm">
                    <p className="text-slate-500 mb-1">Logado como:</p>
                    <p className="font-medium text-slate-900">{user.email}</p>
                 </div>
                 <p className="text-sm text-muted-foreground">
                    Verifique se você está logado com o mesmo email que recebeu o convite.
                 </p>
              </CardContent>
              <CardFooter className="flex-col gap-2">
                 <form action={async () => {
                    "use server";
                    const supabase = await createServerActionClient();
                    await supabase.auth.signOut();
                    redirect(`/login?next=/invite/${inviteId}`);
                 }} className="w-full">
                    <Button variant="outline" className="w-full">
                       Trocar de conta
                    </Button>
                 </form>
                 <Link href="/home" className="text-sm text-muted-foreground hover:underline">
                    Voltar para Home
                 </Link>
              </CardFooter>
           </Card>
        </div>
     );
  }

  // Caso 3: Usuário logado e convite válido encontrado
  // ✅ SEGURANÇA: Verificar se o email do usuário bate com o do convite ANTES de mostrar botão de aceitar
  if (user && invite) {
    // Verificar se o email do usuário logado bate com o do convite
    const emailMatches = invite.email.toLowerCase() === user.email?.toLowerCase();
    
    if (!emailMatches) {
      // Email não bate - mostrar UI de erro com opção de trocar conta
      const workspaceName = (invite as any).workspaces ? ((invite as any).workspaces as any).name : "um Workspace";
      return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
          <Card className="w-full max-w-md border-red-100">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
              <CardTitle className="text-red-900">Email não corresponde</CardTitle>
              <CardDescription>
                Este convite foi enviado para outro email.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <div className="rounded-md bg-slate-50 p-3 text-sm space-y-2">
                <div>
                  <p className="text-slate-500 mb-1">Convite enviado para:</p>
                  <p className="font-medium text-slate-900">{invite.email}</p>
                </div>
                <div className="border-t border-slate-200 pt-2 mt-2">
                  <p className="text-slate-500 mb-1">Você está logado como:</p>
                  <p className="font-medium text-slate-900">{user.email}</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Para aceitar este convite, você precisa fazer login com o email <strong>{invite.email}</strong>.
              </p>
            </CardContent>
            <CardFooter className="flex-col gap-2">
              <form action={async () => {
                "use server";
                const supabase = await createServerActionClient();
                await supabase.auth.signOut();
                redirect(`/login?next=/invite/${inviteId}`);
              }} className="w-full">
                <Button variant="outline" className="w-full">
                  Trocar de conta
                </Button>
              </form>
              <Link href="/home" className="text-sm text-muted-foreground hover:underline">
                Voltar para Home
              </Link>
            </CardFooter>
          </Card>
        </div>
      );
    }

    // Email bate - verificar se já é membro
    const { data: existingMember } = await supabase
      .from("workspace_members")
      .select("user_id")
      .eq("workspace_id", (invite as any).workspace_id)
      .eq("user_id", user.id)
      .single();

    // Se já é membro, mostrar que já foi aceito
    if (existingMember) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
          <Card className="w-full max-w-md text-center">
            <CardHeader>
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
              <CardTitle>Você já é membro</CardTitle>
              <CardDescription>
                Você já faz parte deste workspace.
              </CardDescription>
            </CardHeader>
            <CardFooter className="justify-center">
              <Link href="/home">
                <Button>Ir para Dashboard</Button>
              </Link>
            </CardFooter>
          </Card>
        </div>
      );
    }
  }

  // Caso 4: Usuário logado, email bate, não é membro - mostrar convite para aceitar
  const workspaceName = (invite as any).workspaces ? ((invite as any).workspaces as any).name : "um Workspace";
  const inviterName = (invite as any).invited_by_profile ? ((invite as any).invited_by_profile as any).full_name : "Alguém";

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
           <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-2xl font-bold text-green-600">
              {workspaceName.substring(0, 2).toUpperCase()}
           </div>
          <CardTitle>Convite para {workspaceName}</CardTitle>
          <CardDescription>
            <strong>{inviterName}</strong> convidou você para participar como <strong>{invite.role}</strong>.
          </CardDescription>
        </CardHeader>
        <CardContent>
           <div className="rounded-md bg-green-50 p-4 border border-green-100">
              <div className="flex items-center gap-3">
                 <div className="h-10 w-10 rounded-full bg-white flex items-center justify-center text-green-600 font-bold text-sm border border-green-100">
                    {user?.email?.substring(0, 2).toUpperCase()}
                 </div>
                 <div className="overflow-hidden">
                    <p className="text-xs text-green-600 font-medium uppercase tracking-wider">Aceitar como</p>
                    <p className="text-sm font-semibold text-green-900 truncate">{user?.email}</p>
                 </div>
              </div>
           </div>
        </CardContent>
        <CardFooter className="flex-col gap-3">
          <form action={handleAccept} className="w-full">
            <Button type="submit" className="w-full text-lg py-6 bg-green-600 hover:bg-green-700">
              Aceitar e Entrar
            </Button>
          </form>
          <Button variant="ghost" className="text-muted-foreground" asChild>
             <Link href="/home">Agora não</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

