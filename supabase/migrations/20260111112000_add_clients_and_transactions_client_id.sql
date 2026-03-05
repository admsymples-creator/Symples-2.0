-- Add clients table and link transactions to clients
CREATE TABLE IF NOT EXISTS public.clients (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(workspace_id, name)
);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_clients_workspace_id ON public.clients(workspace_id);

DROP POLICY IF EXISTS "Workspace members can view clients" ON public.clients;
CREATE POLICY "Workspace members can view clients"
    ON public.clients FOR SELECT
    USING (is_workspace_member(workspace_id));

DROP POLICY IF EXISTS "Members can create clients" ON public.clients;
CREATE POLICY "Members can create clients"
    ON public.clients FOR INSERT
    WITH CHECK (is_workspace_member(workspace_id));

DROP POLICY IF EXISTS "Members can update clients" ON public.clients;
CREATE POLICY "Members can update clients"
    ON public.clients FOR UPDATE
    USING (is_workspace_member(workspace_id))
    WITH CHECK (is_workspace_member(workspace_id));

DROP POLICY IF EXISTS "Admins or creators can delete clients" ON public.clients;
CREATE POLICY "Admins or creators can delete clients"
    ON public.clients FOR DELETE
    USING (
        is_workspace_admin(workspace_id)
        OR created_by = auth.uid()
    );

DROP TRIGGER IF EXISTS set_updated_at_clients ON public.clients;
CREATE TRIGGER set_updated_at_clients
    BEFORE UPDATE ON public.clients
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.transactions
    ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL;

ALTER TABLE public.transactions
    ADD COLUMN IF NOT EXISTS related_task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_client_id ON public.transactions(client_id);
CREATE INDEX IF NOT EXISTS idx_transactions_related_task_id ON public.transactions(related_task_id);
