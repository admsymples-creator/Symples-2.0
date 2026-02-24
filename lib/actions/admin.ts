"use server"

import { createServerClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { redirect } from "next/navigation";
import { getPlanLimits } from "@/lib/utils/subscription-helpers";
import type { AdminTableParams, PaginatedResult, AdminUserRow, AdminWorkspaceRow, AdminAuditLogRow } from "@/types/admin";

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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const workspacesByOwner = new Map<string, Array<Record<string, any>>>();
    (workspaces || []).forEach((ws) => {
        if (!ws?.owner_id) return;
        const list = workspacesByOwner.get(ws.owner_id) || [];
        list.push(ws);
        workspacesByOwner.set(ws.owner_id, list);
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const membershipsByUser = new Map<string, Array<Record<string, any>>>();
    (memberships || []).forEach((member) => {
        if (!member?.user_id) return;
        const list = membershipsByUser.get(member.user_id) || [];
        list.push(member);
        membershipsByUser.set(member.user_id, list);
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pickPrimaryWorkspace = (list: Array<Record<string, any>>) => {
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
        console.error("[updateUserPlan] Erro inesperado:", error);
        return { success: false, error: error?.message || "Erro inesperado ao atualizar plano." };
    }
}

// ---------------------------------------------------------------------------
// Paginated server actions
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const pickPrimaryWorkspace = (list: Array<Record<string, any>>) => {
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

export async function getAdminUsersPaginated(params: AdminTableParams = {}): Promise<PaginatedResult<AdminUserRow>> {
    await checkAdminAccess();
    const adminDb = await createServiceRoleClient();

    const page = Math.max(1, params.page || 1);
    const pageSize = Math.min(50, Math.max(1, params.pageSize || 20));
    const sort = params.sort || "created_at";
    const ascending = params.order === "asc";
    const offset = (page - 1) * pageSize;

    let query = adminDb.from("profiles").select("*", { count: "exact" });

    if (params.q) {
        query = query.or(`full_name.ilike.%${params.q}%,email.ilike.%${params.q}%`);
    }

    const allowedSortFields = ["created_at", "full_name", "email"];
    const sortField = allowedSortFields.includes(sort) ? sort : "created_at";

    const { data, error, count } = await query
        .order(sortField, { ascending })
        .range(offset, offset + pageSize - 1);

    if (error) throw new Error(error.message);

    const total = count || 0;
    const profiles = data || [];

    if (profiles.length === 0) {
        return { data: [], total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
    }

    // Enrich with workspace data (same logic as getAdminUsers)
    const userIds = profiles.map((u) => u.id).filter(Boolean);

    const [
        { data: workspaces },
        { data: memberships },
    ] = await Promise.all([
        adminDb.from("workspaces")
            .select("id, name, slug, owner_id, plan, subscription_status, trial_ends_at, member_limit, created_at")
            .in("owner_id", userIds),
        adminDb.from("workspace_members")
            .select("user_id, role, workspace_id")
            .in("user_id", userIds),
    ]);

    const workspaceIds = (workspaces || []).map((ws) => ws.id).filter(Boolean);
    const { data: workspaceMembers } = workspaceIds.length > 0
        ? await adminDb.from("workspace_members").select("workspace_id").in("workspace_id", workspaceIds)
        : { data: [] as Array<{ workspace_id: string }> };

    const memberCountByWorkspace = new Map<string, number>();
    (workspaceMembers || []).forEach((m) => {
        if (!m?.workspace_id) return;
        memberCountByWorkspace.set(m.workspace_id, (memberCountByWorkspace.get(m.workspace_id) || 0) + 1);
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const workspacesByOwner = new Map<string, Array<Record<string, any>>>();
    (workspaces || []).forEach((ws) => {
        if (!ws?.owner_id) return;
        const list = workspacesByOwner.get(ws.owner_id) || [];
        list.push(ws);
        workspacesByOwner.set(ws.owner_id, list);
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const membershipsByUser = new Map<string, Array<Record<string, any>>>();
    (memberships || []).forEach((m) => {
        if (!m?.user_id) return;
        const list = membershipsByUser.get(m.user_id) || [];
        list.push(m);
        membershipsByUser.set(m.user_id, list);
    });

    let enriched: AdminUserRow[] = profiles.map((user) => {
        const owned = workspacesByOwner.get(user.id) || [];
        const primaryWorkspace = pickPrimaryWorkspace(owned);
        const userMemberships = membershipsByUser.get(user.id) || [];
        const primaryMembership = primaryWorkspace
            ? userMemberships.find((m) => m.workspace_id === primaryWorkspace.id)
            : userMemberships[0];
        return {
            id: user.id,
            full_name: user.full_name,
            email: user.email,
            avatar_url: user.avatar_url,
            whatsapp: user.whatsapp,
            created_at: user.created_at,
            account_plan: user.account_plan,
            primaryWorkspace: primaryWorkspace ? {
                id: primaryWorkspace.id,
                name: primaryWorkspace.name,
                slug: primaryWorkspace.slug,
                plan: primaryWorkspace.plan,
                subscription_status: primaryWorkspace.subscription_status,
                trial_ends_at: primaryWorkspace.trial_ends_at,
                member_limit: primaryWorkspace.member_limit,
            } : null,
            primaryMembership: primaryMembership ? {
                role: primaryMembership.role,
                workspace_id: primaryMembership.workspace_id,
            } : null,
            primaryWorkspaceMemberCount: primaryWorkspace
                ? memberCountByWorkspace.get(primaryWorkspace.id) || 0
                : 0,
        };
    });

    // Client-side filters for plan/status (applied after enrichment)
    if (params.plan) {
        enriched = enriched.filter((u) => {
            const effectivePlan = u.account_plan || u.primaryWorkspace?.plan;
            return effectivePlan === params.plan;
        });
    }
    if (params.status) {
        enriched = enriched.filter((u) => {
            return u.primaryWorkspace?.subscription_status === params.status;
        });
    }

    return {
        data: enriched,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
    };
}

export async function getAdminWorkspacesPaginated(params: AdminTableParams = {}): Promise<PaginatedResult<AdminWorkspaceRow>> {
    await checkAdminAccess();
    const adminDb = await createServiceRoleClient();

    const page = Math.max(1, params.page || 1);
    const pageSize = Math.min(50, Math.max(1, params.pageSize || 20));
    const sort = params.sort || "created_at";
    const ascending = params.order === "asc";
    const offset = (page - 1) * pageSize;

    let query = adminDb.from("workspaces").select(`
        *,
        owner:profiles!owner_id(full_name, email),
        members:workspace_members(count)
    `, { count: "exact" });

    if (params.q) {
        query = query.ilike("name", `%${params.q}%`);
    }

    if (params.plan) {
        query = query.eq("plan", params.plan as "starter" | "pro" | "business" | "agency");
    }

    const allowedSortFields = ["created_at", "name", "plan"];
    const sortField = allowedSortFields.includes(sort) ? sort : "created_at";

    const { data, error, count } = await query
        .order(sortField, { ascending })
        .range(offset, offset + pageSize - 1);

    if (error) throw new Error(error.message);

    return {
        data: (data || []) as unknown as AdminWorkspaceRow[],
        total: count || 0,
        page,
        pageSize,
        totalPages: Math.ceil((count || 0) / pageSize),
    };
}

// ---------------------------------------------------------------------------
// Dashboard chart data actions
// ---------------------------------------------------------------------------

export async function getNewUsersTimeSeries(days: number = 30) {
    await checkAdminAccess();
    const adminDb = await createServiceRoleClient();

    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await adminDb
        .from("profiles")
        .select("created_at")
        .gte("created_at", since)
        .order("created_at", { ascending: true });

    if (error) throw new Error(error.message);

    const countsByDay = new Map<string, number>();
    // Pre-fill all days
    for (let i = days - 1; i >= 0; i--) {
        const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
        const key = d.toISOString().split("T")[0];
        countsByDay.set(key, 0);
    }

    (data || []).forEach((row) => {
        if (!row.created_at) return;
        const key = new Date(row.created_at).toISOString().split("T")[0];
        countsByDay.set(key, (countsByDay.get(key) || 0) + 1);
    });

    return Array.from(countsByDay.entries()).map(([date, count]) => ({
        date,
        users: count,
    }));
}

export async function getPlanDistribution() {
    await checkAdminAccess();
    const adminDb = await createServiceRoleClient();

    const { data, error } = await adminDb
        .from("workspaces")
        .select("plan");

    if (error) throw new Error(error.message);

    const counts: Record<string, number> = { starter: 0, pro: 0, business: 0, agency: 0 };
    (data || []).forEach((ws) => {
        const plan = ws.plan || "starter";
        counts[plan] = (counts[plan] || 0) + 1;
    });

    const planLabels: Record<string, string> = {
        starter: "Pessoal",
        pro: "Pro",
        business: "Business",
        agency: "Agency",
    };

    return Object.entries(counts).map(([plan, count]) => ({
        plan: planLabels[plan] || plan,
        value: count,
    }));
}

export async function getTrialStats() {
    await checkAdminAccess();
    const adminDb = await createServiceRoleClient();

    const { data, error } = await adminDb
        .from("workspaces")
        .select("subscription_status, trial_ends_at");

    if (error) throw new Error(error.message);

    const now = new Date();
    let active = 0;
    let expired = 0;
    let converted = 0;
    let other = 0;

    (data || []).forEach((ws) => {
        const status = ws.subscription_status;
        if (status === "trialing") {
            const endsAt = ws.trial_ends_at ? new Date(ws.trial_ends_at) : null;
            if (endsAt && endsAt < now) {
                expired++;
            } else {
                active++;
            }
        } else if (status === "active") {
            converted++;
        } else {
            other++;
        }
    });

    return [
        { status: "Trial Ativo", value: active },
        { status: "Trial Expirado", value: expired },
        { status: "Convertido", value: converted },
        { status: "Outro", value: other },
    ];
}

// ---------------------------------------------------------------------------
// Audit log actions
// ---------------------------------------------------------------------------

export async function getAdminAuditLogs(params: AdminTableParams = {}): Promise<PaginatedResult<AdminAuditLogRow>> {
    await checkAdminAccess();
    const adminDb = await createServiceRoleClient();

    const page = Math.max(1, params.page || 1);
    const pageSize = Math.min(50, Math.max(1, params.pageSize || 20));
    const offset = (page - 1) * pageSize;

    let query = adminDb.from("audit_logs").select(`
        id,
        action,
        user_id,
        details,
        created_at
    `, { count: "exact" });

    if (params.q) {
        query = query.ilike("action", `%${params.q}%`);
    }

    const { data, error, count } = await query
        .order("created_at", { ascending: false })
        .range(offset, offset + pageSize - 1);

    if (error) throw new Error(error.message);

    // Enrich with admin profiles
    const logs = data || [];
    const adminIds = [...new Set(logs.map((l) => l.user_id).filter(Boolean))] as string[];

    const profileMap = new Map<string, { full_name: string | null; email: string }>();
    if (adminIds.length > 0) {
        const { data: profiles } = await adminDb
            .from("profiles")
            .select("id, full_name, email")
            .in("id", adminIds);
        (profiles || []).forEach((p) => {
            profileMap.set(p.id, { full_name: p.full_name, email: p.email || "" });
        });
    }

    const enriched: AdminAuditLogRow[] = logs.map((log) => ({
        id: log.id,
        action: log.action,
        user_id: log.user_id,
        details: log.details as Record<string, unknown> | null,
        created_at: log.created_at,
        admin_profile: log.user_id ? profileMap.get(log.user_id) || null : null,
    }));

    return {
        data: enriched,
        total: count || 0,
        page,
        pageSize,
        totalPages: Math.ceil((count || 0) / pageSize),
    };
}

// ---------------------------------------------------------------------------
// Workspace detail actions
// ---------------------------------------------------------------------------

export async function getAdminWorkspaceDetail(workspaceId: string) {
    await checkAdminAccess();
    const adminDb = await createServiceRoleClient();

    const { data: workspace, error } = await adminDb
        .from("workspaces")
        .select(`
            *,
            owner:profiles!owner_id(id, full_name, email, avatar_url)
        `)
        .eq("id", workspaceId)
        .single();

    if (error) throw new Error(error.message);

    const { data: members } = await adminDb
        .from("workspace_members")
        .select(`
            user_id,
            role,
            joined_at,
            profile:profiles!user_id(id, full_name, email, avatar_url)
        `)
        .eq("workspace_id", workspaceId)
        .order("joined_at", { ascending: true });

    return {
        workspace,
        members: members || [],
    };
}

export async function updateWorkspaceSubscription(
    workspaceId: string,
    updates: {
        plan?: "starter" | "pro" | "business" | "agency"
        subscription_status?: "trialing" | "active" | "past_due" | "canceled"
        trial_ends_at?: string | null
        member_limit?: number
    }
) {
    await checkAdminAccess();
    const adminDb = await createServiceRoleClient();

    const { error } = await adminDb
        .from("workspaces")
        .update(updates)
        .eq("id", workspaceId);

    if (error) throw new Error(error.message);
    return { success: true };
}

export async function removeWorkspaceMember(workspaceId: string, userId: string) {
    await checkAdminAccess();
    const adminDb = await createServiceRoleClient();

    const { error } = await adminDb
        .from("workspace_members")
        .delete()
        .eq("workspace_id", workspaceId)
        .eq("user_id", userId);

    if (error) throw new Error(error.message);
    return { success: true };
}

// ---------------------------------------------------------------------------
// Bulk actions
// ---------------------------------------------------------------------------

export async function bulkUpdateWorkspacePlan(
    workspaceIds: string[],
    plan: "starter" | "pro" | "business" | "agency"
) {
    await checkAdminAccess();
    const adminDb = await createServiceRoleClient();

    const memberLimit = getPlanLimits(plan, null);
    const { error } = await adminDb
        .from("workspaces")
        .update({ plan, member_limit: memberLimit })
        .in("id", workspaceIds);

    if (error) throw new Error(error.message);
    return { success: true, count: workspaceIds.length };
}

// ---------------------------------------------------------------------------
// Export actions (no pagination limit)
// ---------------------------------------------------------------------------

export async function exportAdminUsers() {
    await checkAdminAccess();
    const adminDb = await createServiceRoleClient();

    const { data, error } = await adminDb
        .from("profiles")
        .select("id, full_name, email, whatsapp, created_at, account_plan")
        .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return data || [];
}

export async function exportAdminWorkspaces() {
    await checkAdminAccess();
    const adminDb = await createServiceRoleClient();

    const { data, error } = await adminDb
        .from("workspaces")
        .select(`
            id, name, slug, plan, subscription_status, trial_ends_at, member_limit, created_at,
            owner:profiles!owner_id(full_name, email),
            members:workspace_members(count)
        `)
        .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return data || [];
}
