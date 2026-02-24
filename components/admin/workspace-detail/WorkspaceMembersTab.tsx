"use client"

import { useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { removeWorkspaceMember } from "@/lib/actions/admin"
import { Loader2, UserMinus } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface Member {
  user_id: string
  role: string | null
  joined_at: string | null
  profile: {
    id: string
    full_name: string | null
    email: string | null
    avatar_url: string | null
  } | null
}

interface WorkspaceMembersTabProps {
  workspaceId: string
  members: Member[]
  ownerId: string | null
}

const roleLabels: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Membro",
  viewer: "Visualizador",
}

function WorkspaceMembersTab({
  workspaceId,
  members,
  ownerId,
}: WorkspaceMembersTabProps) {
  const router = useRouter()
  const [removingId, setRemovingId] = useState<string | null>(null)

  const handleRemove = async (userId: string) => {
    setRemovingId(userId)
    try {
      await removeWorkspaceMember(workspaceId, userId)
      toast.success("Membro removido")
      router.refresh()
    } catch {
      toast.error("Erro ao remover membro")
    } finally {
      setRemovingId(null)
    }
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Membro</TableHead>
            <TableHead>Cargo</TableHead>
            <TableHead className="text-right">Acoes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map((member) => {
            const isOwner = member.user_id === ownerId
            return (
              <TableRow key={member.user_id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage
                        src={member.profile?.avatar_url || ""}
                      />
                      <AvatarFallback className="text-xs">
                        {member.profile?.full_name?.[0] || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium text-sm">
                        {member.profile?.full_name || "Sem nome"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {member.profile?.email}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs">
                    {roleLabels[member.role || "member"] || member.role || "member"}
                  </Badge>
                  {isOwner && (
                    <Badge className="ml-1 bg-amber-100 text-amber-700 border-amber-200 text-[10px]" variant="outline">
                      DONO
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {!isOwner && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={() => handleRemove(member.user_id)}
                      disabled={removingId === member.user_id}
                    >
                      {removingId === member.user_id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <UserMinus className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            )
          })}
          {members.length === 0 && (
            <TableRow>
              <TableCell colSpan={3} className="h-16 text-center text-muted-foreground">
                Nenhum membro encontrado.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}

export { WorkspaceMembersTab }
