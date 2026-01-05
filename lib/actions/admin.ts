"use server"

import { createServerClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { redirect } from "next/navigation";

// Email hardcoded ou via ENV para segurança imediata
const ADMIN_EMAILS_ENV = (process.env.ADMIN_EMAILS || "").split(",").filter(Boolean);
const ADMIN_EMAILS_HARDCODED = [
    "julio.mew@gmail.com", // Developer fallback
    "adm.symples@gmail.com" // SuperAdmin account
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
    return data;
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

export async function updateWorkspacePlan(workspaceId: string, plan: 'starter' | 'pro' | 'business') {
    await checkAdminAccess();
    const adminDb = await createServiceRoleClient();

    const { error } = await adminDb
        .from('workspaces')
        .update({ plan })
        .eq('id', workspaceId);

    if (error) throw error;
    return { success: true };
}
