import { createServerActionClient } from "@/lib/supabase/server";
import { PricingTable } from "@/components/billing/PricingTable";
import { getCurrentSubscription } from "@/lib/actions/billing";
import { redirect } from "next/navigation";

export default async function BillingPage() {
  const supabase = await createServerActionClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Buscar workspace ativo do usuário (primeiro workspace)
  const { data: memberData } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id)
    .limit(1)
    .single();

  let currentPlan: 'starter' | 'pro' | 'business' | null = null;
  
  if (memberData) {
    const subscription = await getCurrentSubscription(memberData.workspace_id);
    currentPlan = subscription?.plan || null;
  }

  return (
    <div className="min-h-screen bg-white pb-20">
      <div className="w-full bg-white">
        <div className="max-w-[1600px] mx-auto px-6">
          <div className="py-3">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Escolha seu Plano
          </h1>
          <p className="text-gray-600">
            Selecione o plano ideal para suas necessidades. Todos os planos incluem acesso completo durante o trial.
          </p>
        </div>

        {/* Oferta Founder's Club (Opcional) */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-6 mb-8 text-white">
          <h2 className="text-xl font-bold mb-2">🎉 Oferta Founder's Club</h2>
          <p className="text-blue-100 mb-4">
            Garanta o Symples Pro vitalício pelo preço de lançamento. Apenas para os primeiros 90 dias!
          </p>
          <ul className="list-disc list-inside space-y-1 text-sm text-blue-100">
            <li>Trava de Preço Vitalícia (R$ 69 para sempre)</li>
            <li>Acesso ao Conselho de Produto (voto em features)</li>
            <li>Playbook de Produtividade exclusivo</li>
          </ul>
        </div>

        <PricingTable currentPlan={currentPlan} />
          </div>
        </div>
      </div>
    </div>
  );
}
