import { SignupForm } from "@/components/landing/SignupForm";
import { createServerActionClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string }>;
}) {
  // ✅ CORREÇÃO: Next.js 15+ requer await para searchParams (são Promises)
  const resolvedSearchParams = await searchParams;
  const inviteToken = resolvedSearchParams.invite;
  
  // Se houver token de convite, verificar se o usuário já está logado
  // Se estiver, redirecionar para a página de aceite do convite
  if (inviteToken) {
    const supabase = await createServerActionClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      // Usuário já está logado, redirecionar para a página de aceite
      redirect(`/invite/${inviteToken}`);
    }
  }
  
  return <SignupForm inviteToken={inviteToken} />;
}

