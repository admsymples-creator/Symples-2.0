-- ============================================
-- Adicionar tabelas de Planejamento Financeiro
-- ============================================

-- BUDGETS (Orçamentos por Categoria)
CREATE TABLE IF NOT EXISTS public.budgets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
    category TEXT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
    year INTEGER NOT NULL,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(workspace_id, category, month, year)
);

-- FINANCIAL_GOALS (Metas Financeiras)
CREATE TABLE IF NOT EXISTS public.financial_goals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    target_amount DECIMAL(10, 2) NOT NULL,
    current_amount DECIMAL(10, 2) DEFAULT 0 NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('savings', 'spending_limit')),
    deadline DATE,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para otimização
CREATE INDEX IF NOT EXISTS idx_budgets_workspace_month_year 
ON public.budgets(workspace_id, year, month);

CREATE INDEX IF NOT EXISTS idx_budgets_category 
ON public.budgets(workspace_id, category);

CREATE INDEX IF NOT EXISTS idx_financial_goals_workspace 
ON public.financial_goals(workspace_id, status);

CREATE INDEX IF NOT EXISTS idx_financial_goals_deadline 
ON public.financial_goals(workspace_id, deadline) 
WHERE status = 'active';

-- RLS Policies
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_goals ENABLE ROW LEVEL SECURITY;

-- Policy: Membros do workspace podem ver orçamentos
CREATE POLICY "budgets_select_policy" ON public.budgets
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.workspace_members
            WHERE workspace_members.workspace_id = budgets.workspace_id
            AND workspace_members.user_id = auth.uid()
        )
    );

-- Policy: Admins e owners podem criar/editar orçamentos
CREATE POLICY "budgets_insert_policy" ON public.budgets
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.workspace_members
            WHERE workspace_members.workspace_id = budgets.workspace_id
            AND workspace_members.user_id = auth.uid()
            AND workspace_members.role IN ('owner', 'admin')
        )
    );

CREATE POLICY "budgets_update_policy" ON public.budgets
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.workspace_members
            WHERE workspace_members.workspace_id = budgets.workspace_id
            AND workspace_members.user_id = auth.uid()
            AND workspace_members.role IN ('owner', 'admin')
        )
    );

CREATE POLICY "budgets_delete_policy" ON public.budgets
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.workspace_members
            WHERE workspace_members.workspace_id = budgets.workspace_id
            AND workspace_members.user_id = auth.uid()
            AND workspace_members.role IN ('owner', 'admin')
        )
    );

-- Policy: Membros do workspace podem ver metas
CREATE POLICY "financial_goals_select_policy" ON public.financial_goals
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.workspace_members
            WHERE workspace_members.workspace_id = financial_goals.workspace_id
            AND workspace_members.user_id = auth.uid()
        )
    );

-- Policy: Admins e owners podem criar/editar metas
CREATE POLICY "financial_goals_insert_policy" ON public.financial_goals
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.workspace_members
            WHERE workspace_members.workspace_id = financial_goals.workspace_id
            AND workspace_members.user_id = auth.uid()
            AND workspace_members.role IN ('owner', 'admin')
        )
    );

CREATE POLICY "financial_goals_update_policy" ON public.financial_goals
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.workspace_members
            WHERE workspace_members.workspace_id = financial_goals.workspace_id
            AND workspace_members.user_id = auth.uid()
            AND workspace_members.role IN ('owner', 'admin')
        )
    );

CREATE POLICY "financial_goals_delete_policy" ON public.financial_goals
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.workspace_members
            WHERE workspace_members.workspace_id = financial_goals.workspace_id
            AND workspace_members.user_id = auth.uid()
            AND workspace_members.role IN ('owner', 'admin')
        )
    );

-- Comentários para documentação
COMMENT ON TABLE public.budgets IS 'Orçamentos mensais por categoria para controle de gastos';
COMMENT ON TABLE public.financial_goals IS 'Metas financeiras (economia ou limite de gasto)';

