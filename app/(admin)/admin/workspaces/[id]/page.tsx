import { getAdminWorkspaceDetail } from "@/lib/actions/admin";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WorkspaceDetailHeader } from "@/components/admin/workspace-detail/WorkspaceDetailHeader";
import { WorkspaceMembersTab } from "@/components/admin/workspace-detail/WorkspaceMembersTab";
import { WorkspaceSubscriptionCard } from "@/components/admin/workspace-detail/WorkspaceSubscriptionCard";

export default async function AdminWorkspaceDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const { workspace, members } = await getAdminWorkspaceDetail(id);

    const owner = workspace.owner as {
        id: string
        full_name: string | null
        email: string
        avatar_url: string | null
    } | null;

    const typedMembers = members as Array<{
        user_id: string
        role: string | null
        joined_at: string | null
        profile: {
            id: string
            full_name: string | null
            email: string | null
            avatar_url: string | null
        } | null
    }>;

    return (
        <div className="space-y-6">
            <WorkspaceDetailHeader
                workspace={{
                    id: workspace.id,
                    name: workspace.name,
                    slug: workspace.slug || "",
                    plan: workspace.plan,
                    subscription_status: workspace.subscription_status,
                    owner,
                }}
            />

            <Tabs defaultValue="members">
                <TabsList>
                    <TabsTrigger value="members">
                        Membros ({members.length})
                    </TabsTrigger>
                    <TabsTrigger value="subscription">
                        Assinatura
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="members" className="mt-4">
                    <WorkspaceMembersTab
                        workspaceId={workspace.id}
                        members={typedMembers}
                        ownerId={workspace.owner_id}
                    />
                </TabsContent>

                <TabsContent value="subscription" className="mt-4">
                    <WorkspaceSubscriptionCard
                        workspaceId={workspace.id}
                        plan={workspace.plan}
                        subscriptionStatus={workspace.subscription_status}
                        trialEndsAt={workspace.trial_ends_at}
                        memberLimit={workspace.member_limit}
                    />
                </TabsContent>
            </Tabs>
        </div>
    );
}
