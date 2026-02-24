"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ArrowLeft, Copy } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

interface WorkspaceDetailHeaderProps {
  workspace: {
    id: string
    name: string
    slug: string
    plan: string | null
    subscription_status: string | null
    owner: {
      id: string
      full_name: string | null
      email: string
      avatar_url: string | null
    } | null
  }
}

const planBadgeColors: Record<string, string> = {
  pro: "bg-blue-100 text-blue-700 border-blue-200",
  business: "bg-purple-100 text-purple-700 border-purple-200",
  agency: "bg-emerald-100 text-emerald-700 border-emerald-200",
  starter: "bg-gray-100 text-gray-700 border-gray-200",
}

const planLabels: Record<string, string> = {
  starter: "Pessoal",
  pro: "Pro",
  business: "Business",
  agency: "Agency",
}

function WorkspaceDetailHeader({ workspace }: WorkspaceDetailHeaderProps) {
  const plan = workspace.plan || "starter"
  const status = workspace.subscription_status

  return (
    <div className="space-y-4">
      <Link
        href="/admin/workspaces"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar
      </Link>

      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold tracking-tight">
              {workspace.name}
            </h2>
            <Badge
              variant="outline"
              className={planBadgeColors[plan] || planBadgeColors.starter}
            >
              {planLabels[plan] || plan}
            </Badge>
            {(status === "trialing" || status === "trial") && (
              <Badge className="bg-orange-100 text-orange-700 border-orange-200" variant="outline">
                TRIAL
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="font-mono">{workspace.slug}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => {
                navigator.clipboard.writeText(workspace.id)
                toast.success("ID copiado")
              }}
            >
              <Copy className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {workspace.owner && (
          <div className="flex items-center gap-3 bg-muted/50 rounded-lg px-4 py-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={workspace.owner.avatar_url || ""} />
              <AvatarFallback className="text-xs">
                {workspace.owner.full_name?.[0] || "?"}
              </AvatarFallback>
            </Avatar>
            <div className="text-sm">
              <div className="font-medium">
                {workspace.owner.full_name || "Sem nome"}
              </div>
              <div className="text-xs text-muted-foreground">
                {workspace.owner.email}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export { WorkspaceDetailHeader }
