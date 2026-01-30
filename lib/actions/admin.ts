"use server"

import { createServerClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { redirect } from "next/navigation";
import { getPlanLimits } from "@/lib/utils/subscription-helpers";

// Email hardcoded ou via ENV para segurança imediata
const ADMIN_EMAILS_ENV = (process.env.ADMIN_EMAILS || "").split(",").filter(Boolean);
const ADMIN_EMAILS_HARDCODED = [
    "julio.mew@gmail.com", // Developer fallback
    "adm.symples@gmail.com", // SuperAdmin account
    "adm.brandify@gmail.com",
    "brasaofernando@gmail.com"
];
const SUPPORT_SESSION_MINUTES = 15;
const TRIAL_INVITE_DAYS = new Set([15, 30, 60]);
const TRIAL_INVITE_PLANS = new Set(['pro', 'business']);

async function checkAdminAccess() {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    const userEmail = user?.email || "";
    const isAdmin = ADMIN_EMAILS_ENV.includes(userEmail) || ADMIN_EMAILS_HARDCODED.includes(userEmail);

    if (!user || !isAdmin) {
        redirect("/home");
    }

    return user;
}

/**
 * Verifica se o usuário atual é um administrador (sem redirecionar)
 * Útil para verificar permissões em componentes
 */
export async function isUserAdmin(): Promise<boolean> {
    try {
        const supabase = await createServerClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user?.email) {
            return false;
        }

        const userEmail = user.email;
        return ADMIN_EMAILS_ENV.includes(userEmail) || ADMIN_EMAILS_HARDCODED.includes(userEmail);
    } catch (error) {
        console.error('[isUserAdmin] Erro ao verificar se usuário é admin:', error);
        return false;
    }
}

export async function getAdminDashboardStats() {
    await checkAdminAccess();
    const adminDb = await createServiceRoleClient();

    // Parallel fetch for speed
    const [
        { count: usersCount },
        { count: workspacesCount },
        { count: newUsersCount }
    ] = await Promise.all([
        adminDb.from('profiles').select('*', { count: 'exact', head: true }),
        adminDb.from('workspaces').select('*', { count: 'exact', head: true }),
        adminDb.from('profiles')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    ]);

    // Recent Activity (Users)
    const { data: recentUsers } = await adminDb
        .from('profiles')
        .select('id, full_name, email, avatar_url, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

    return {
        stats: {
            users: usersCount || 0,
            workspaces: workspacesCount || 0,
            newUsers24h: newUsersCount || 0,
        },
        recentUsers: recentUsers || []
    };
}

export async function getAdminUsers(search?: string) {
    await checkAdminAccess();
    const adminDb = await createServiceRoleClient();

    let query = adminDb.from('profiles').select('*');

    if (search) {
        query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const { data, error } = await query.order('created_at', { ascending: false }).limit(50);

    if (error) throw error;

    if (!data || data.length === 0) return [];

    const userIds = data.map((user) => user.id).filter(Boolean);
    const { data: workspaces } = await adminDb
        .from('workspaces')
        .select('id, name, slug, owner_id, plan, subscription_status, trial_ends_at, member_limit, created_at')
        .in('owner_id', userIds);

    const workspaceIds = (workspaces || []).map((ws) => ws.id).filter(Boolean);
    const { data: workspaceMembers } = workspaceIds.length > 0
        ? await adminDb
            .from('workspace_members')
            .select('workspace_id')
            .in('workspace_id', workspaceIds)
        : { data: [] as Array<{ workspace_id: string }> };

    const memberCountByWorkspace = new Map<string, number>();
    (workspaceMembers || []).forEach((member) => {
        if (!member?.workspace_id) return;
        memberCountByWorkspace.set(
            member.workspace_id,
            (memberCountByWorkspace.get(member.workspace_id) || 0) + 1
        );
    });

    const { data: memberships } = await adminDb
        .from('workspace_members')
        .select('user_id, role, workspace_id')
        .in('user_id', userIds);

    const workspacesByOwner = new Map<string, Array<any>>();
    (workspaces || []).forEach((ws) => {
        if (!ws?.owner_id) return;
        const list = workspacesByOwner.get(ws.owner_id) || [];
        list.push(ws);
        workspacesByOwner.set(ws.owner_id, list);
    });

    const membershipsByUser = new Map<string, Array<any>>();
    (memberships || []).forEach((member) => {
        if (!member?.user_id) return;
        const list = membershipsByUser.get(member.user_id) || [];
        list.push(member);
        membershipsByUser.set(member.user_id, list);
    });

    const pickPrimaryWorkspace = (list: Array<any>) => {
        if (!list || list.length === 0) return null;
        const personal = list.find((ws) => {
            const name = (ws.name || "").trim().toLowerCase();
            const slug = (ws.slug || "").trim().toLowerCase();
            return name === "pessoal" || slug.startsWith("pessoal-");
        });
        if (personal) return personal;
        return [...list].sort((a, b) => {
            const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
            const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
            return aTime - bTime;
        })[0];
    };

    return data.map((user) => {
        const owned = workspacesByOwner.get(user.id) || [];
        const primaryWorkspace = pickPrimaryWorkspace(owned);
        const userMemberships = membershipsByUser.get(user.id) || [];
        const primaryMembership = primaryWorkspace
            ? userMemberships.find((member) => member.workspace_id === primaryWorkspace.id)
            : userMemberships[0];
        return {
            ...user,
            primaryWorkspace,
            primaryMembership,
            primaryWorkspaceMemberCount: primaryWorkspace
                ? memberCountByWorkspace.get(primaryWorkspace.id) || 0
                : 0,
        };
    });
}

export async function createSupportLoginLink(params: { userId: string; reason: string }) {
    const adminUser = await checkAdminAccess();
    const userId = params?.userId?.toString().trim();
    const reason = params?.reason?.toString().trim();

    if (!userId || !reason) {
        return { url: null, error: "missing_params", message: "Parametros invalidos" };
    }

    const adminDb = await createServiceRoleClient();
    const { data: profile, error: profileError } = await adminDb
        .from("profiles")
        .select("email")
        .eq("id", userId)
        .single();

    if (profileError || !profile?.email) {
        console.error("[createSupportLoginLink] Email nao encontrado:", profileError);
        return { url: null, error: "missing_email", message: "Email nao encontrado" };
    }

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const expiresAt = new Date(Date.now() + SUPPORT_SESSION_MINUTES * 60 * 1000).toISOString();
    const nextPath = `/home?support=1&support_expires=${encodeURIComponent(expiresAt)}`;
    const redirectTo = `${baseUrl}/auth/callback?next=${encodeURIComponent(nextPath)}`;
    const { data: linkData, error: linkError } = await adminDb.auth.admin.generateLink({
        type: "magiclink",
        email: profile.email,
        options: {
            redirectTo,
        },
    });

    if (linkError || !linkData?.properties?.action_link) {
        console.error("[createSupportLoginLink] Erro ao gerar magic link:", linkError);
        return { url: null, error: "link_failed", message: linkError?.message || "Falha ao gerar link" };
    }

    await adminDb.from("audit_logs").insert({
        action: "support_login",
        user_id: adminUser.id,
        details: {
            target_user_id: userId,
            target_email: profile.email,
            reason,
            redirect_to: redirectTo,
            opened_in_new_tab: true,
            expires_at: expiresAt,
            requested_at: new Date().toISOString(),
        },
    });

    return { url: linkData.properties.action_link };
}

export async function createTrialInviteLink(params: { email: string; trialDays: number; trialPlan: 'pro' | 'business' }) {
    const adminUser = await checkAdminAccess();
    const email = params?.email?.toString().trim().toLowerCase();
    const trialDays = Number(params?.trialDays);
    const trialPlan = params?.trialPlan;

    if (!trialPlan || !TRIAL_INVITE_PLANS.has(trialPlan)) {
        return { success: false, error: 'invalid_trial_plan' };
    }

    if (!email || !email.includes("@")) {
        return { success: false, error: "invalid_email" };
    }

    if (!TRIAL_INVITE_DAYS.has(trialDays)) {
        return { success: false, error: "invalid_trial_days" };
    }

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const inviteLink = `${baseUrl}/signup?trial_days=${trialDays}&trial_plan=${trialPlan}&email=${encodeURIComponent(email)}&trial_source=admin`;

    await createServiceRoleClient()
        .then((adminDb) =>
            adminDb.from("audit_logs").insert({
                action: "trial_invite",
                user_id: adminUser.id,
                details: {
                    target_email: email,
                    trial_days: trialDays,
                    trial_plan: trialPlan,
                    invite_link: inviteLink,
                    created_at: new Date().toISOString(),
                },
            })
        )
        .catch((error) => {
            console.error("[createTrialInviteLink] audit log error:", error);
        });

    return { success: true, inviteLink };
}

export async function getAdminWorkspaces(search?: string) {
    await checkAdminAccess();
    const adminDb = await createServiceRoleClient();

    // Join with owner profile manually or let the client handle it? 
    // Supabase join syntax:
    let query = adminDb.from('workspaces')
        .select(`
            *,
            owner:profiles!owner_id(full_name, email),
            members:workspace_members(count)
        `);

    if (search) {
        query = query.ilike('name', `%${search}%`);
    }

    const { data, error } = await query.order('created_at', { ascending: false }).limit(50);

    if (error) throw error;
    return data;
}

export async function updateWorkspacePlan(workspaceId: string, plan: 'starter' | 'pro' | 'business' | 'agency') {
    await checkAdminAccess();
    const adminDb = await createServiceRoleClient();

    const { error } = await adminDb
        .from('workspaces')
        .update({ plan })
        .eq('id', workspaceId);

    if (error) throw error;
    return { success: true };
}

export async function updateUserPlan(
    userId: string,
    plan: 'starter' | 'pro' | 'business' | 'agency'
): Promise<{ success: boolean; error?: string }> {
    try {
        await checkAdminAccess();
        const adminDb = await createServiceRoleClient();

        if (plan === "agency") {
            const { error: profileError } = await adminDb
                .from("profiles")
                .update({ account_plan: "agency" })
                .eq("id", userId);

            if (profileError) {
                console.error("[updateUserPlan] Erro ao atualizar plano do usuário:", profileError);
                return { success: false, error: profileError.message || "Erro ao atualizar plano do usuário." };
            }

            return { success: true };
        }

        const { error: clearProfileError } = await adminDb
            .from("profiles")
            .update({ account_plan: null })
            .eq("id", userId);

        if (clearProfileError) {
            console.error("[updateUserPlan] Erro ao limpar plano do usuário:", clearProfileError);
            return { success: false, error: clearProfileError.message || "Erro ao atualizar plano do usuário." };
        }

        const { data: workspaces, error } = await adminDb
            .from('workspaces')
            .select('id, name, slug, plan, subscription_status, created_at')
            .eq('owner_id', userId);

        if (error) {
            console.error("[updateUserPlan] Erro ao buscar workspaces:", error);
            return { success: false, error: error.message || "Erro ao buscar workspaces do usuário." };
        }

        if (!workspaces || workspaces.length === 0) {
            return { success: false, error: "Usuário não possui workspaces próprios." };
        }

        const personal = workspaces.find((ws) => {
            const name = (ws.name || "").trim().toLowerCase();
            const slug = (ws.slug || "").trim().toLowerCase();
            return name === "pessoal" || slug.startsWith("pessoal-");
        });

        const target = personal || [...workspaces].sort((a, b) => {
            const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
            const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
            return aTime - bTime;
        })[0];

        const memberLimit = getPlanLimits(plan, target.subscription_status || null);
        const { error: updateError } = await adminDb
            .from('workspaces')
            .update({ plan, member_limit: memberLimit })
            .eq('id', target.id);

        if (updateError) {
            console.error("[updateUserPlan] Erro ao atualizar plano:", updateError);
            return { success: false, error: updateError.message || "Erro ao atualizar plano." };
        }

        return { success: true };
    } catch (error: any) {
        console.error("[updateUserPlan] Erro inesperado:", error);
        return { success: false, error: error?.message || "Erro inesperado ao atualizar plano." };
    }
}
