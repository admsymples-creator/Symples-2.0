"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { updateWorkspaceSubscription } from "@/lib/actions/admin"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface WorkspaceSubscriptionCardProps {
  workspaceId: string
  plan: string | null
  subscriptionStatus: string | null
  trialEndsAt: string | null
  memberLimit: number | null
}

function WorkspaceSubscriptionCard({
  workspaceId,
  plan: initialPlan,
  subscriptionStatus: initialStatus,
  trialEndsAt: initialTrialEnds,
  memberLimit: initialMemberLimit,
}: WorkspaceSubscriptionCardProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [plan, setPlan] = useState(initialPlan || "starter")
  const [status, setStatus] = useState(initialStatus || "active")
  const [trialEndsAt, setTrialEndsAt] = useState(
    initialTrialEnds ? initialTrialEnds.split("T")[0] : ""
  )
  const [memberLimit, setMemberLimit] = useState(
    initialMemberLimit?.toString() || "1"
  )

  const handleSave = async () => {
    setIsLoading(true)
    try {
      await updateWorkspaceSubscription(workspaceId, {
        plan: plan as "starter" | "pro" | "business" | "agency",
        subscription_status: status as "trialing" | "active" | "past_due" | "canceled",
        trial_ends_at: trialEndsAt ? new Date(trialEndsAt).toISOString() : null,
        member_limit: Number(memberLimit) || 1,
      })
      toast.success("Assinatura atualizada")
      router.refresh()
    } catch {
      toast.error("Erro ao atualizar assinatura")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="border-none shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">Assinatura</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Plano</Label>
            <Select value={plan} onValueChange={setPlan}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="starter">Pessoal</SelectItem>
                <SelectItem value="pro">Pro</SelectItem>
                <SelectItem value="business">Business</SelectItem>
                <SelectItem value="agency">Agency</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Ativo</SelectItem>
                <SelectItem value="trialing">Trial</SelectItem>
                <SelectItem value="past_due">Inadimplente</SelectItem>
                <SelectItem value="canceled">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Trial expira em</Label>
            <Input
              type="date"
              value={trialEndsAt}
              onChange={(e) => setTrialEndsAt(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Limite de membros</Label>
            <Input
              type="number"
              min={1}
              max={999}
              value={memberLimit}
              onChange={(e) => setMemberLimit(e.target.value)}
            />
          </div>
        </div>

        <Button onClick={handleSave} disabled={isLoading} className="w-full sm:w-auto">
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Salvar alteracoes
        </Button>
      </CardContent>
    </Card>
  )
}

export { WorkspaceSubscriptionCard }
