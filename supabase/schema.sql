-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- PROFILES (Users)
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- WORKSPACES
CREATE TABLE public.workspaces (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- TASKS
CREATE TABLE public.tasks (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'todo', -- todo, in_progress, done
    priority TEXT DEFAULT 'medium', -- low, medium, high
    assignee_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    due_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1. Convites para Workspaces (Gestão de Time)
CREATE TABLE public.workspace_invites (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT DEFAULT 'editor', -- viewer, member, owner (mapped from PRD roles)
    status TEXT DEFAULT 'pending', -- pending, accepted, expired
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabela Financeira (Transações)
CREATE TABLE public.transactions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    related_task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL, -- Integração Hub
    description TEXT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    type TEXT CHECK (type IN ('income', 'expense')),
    category TEXT DEFAULT 'Geral',
    status TEXT DEFAULT 'pending', -- paid, pending, scheduled
    due_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Logs de Auditoria (Segurança Empresarial)
CREATE TABLE public.audit_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id),
    action TEXT NOT NULL, -- ex: 'deleted_task', 'invited_member'
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies (Segurança)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Basic RLS Policies (Placeholder - needs refinement based on auth logic)
-- Profiles: Users can view/edit their own profile
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Workspaces: Members can view (simplified for now, usually requires a join with members table which isn't explicitly defined but implied by invites/owner)
-- For now, assuming owner access
CREATE POLICY "Owners can view their workspaces" ON public.workspaces FOR SELECT USING (auth.uid() = owner_id);

-- Tasks: Users in the workspace can view tasks
-- (Requires a helper function or join to check membership, skipping complex logic for initial scaffold)
