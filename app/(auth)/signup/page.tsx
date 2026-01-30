import { SignupForm } from "@/components/landing/SignupForm";
import { createServerActionClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string; trial_days?: string; trial_plan?: string; email?: string }>;
}) {
  // ✅ CORREÇÃO: Next.js 15+ requer await para searchParams (são Promises)
  const resolvedSearchParams = await searchParams;
  const inviteToken = resolvedSearchParams.invite;
  const trialDaysParam = resolvedSearchParams.trial_days;
  const trialPlanParam = resolvedSearchParams.trial_plan;
  const prefillEmail = resolvedSearchParams.email;
  const trialDaysValue = trialDaysParam ? Number(trialDaysParam) : null;
  const trialDays = trialDaysValue && [15, 30, 60].includes(trialDaysValue) ? trialDaysValue : undefined;
  const trialPlan = trialPlanParam && ['pro', 'business'].includes(trialPlanParam) ? (trialPlanParam as 'pro' | 'business') : undefined;
  
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
  
  return <SignupForm inviteToken={inviteToken} trialDays={trialDays} trialPlan={trialPlan} prefillEmail={prefillEmail} />;
}

