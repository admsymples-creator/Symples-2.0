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
        .select('id, name, slug, owner_id, plan, subscription_status, created_at')
        .in('owner_id', userIds);

    const workspacesByOwner = new Map<string, Array<any>>();
    (workspaces || []).forEach((ws) => {
        if (!ws?.owner_id) return;
        const list = workspacesByOwner.get(ws.owner_id) || [];
        list.push(ws);
        workspacesByOwner.set(ws.owner_id, list);
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
        return {
            ...user,
            primaryWorkspace,
        };
    });
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
