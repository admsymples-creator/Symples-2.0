-- ============================================
-- MIGRATION: Adicionar Novos Campos (v2.1)
-- Execute este script APÓS executar o schema completo
-- ============================================

-- 1. ADICIONAR CAMPO WHATSAPP EM PROFILES
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'whatsapp'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN whatsapp TEXT;
        RAISE NOTICE 'Campo whatsapp adicionado em profiles';
    ELSE
        RAISE NOTICE 'Campo whatsapp já existe em profiles';
    END IF;
END $$;

-- 2. ADICIONAR CAMPOS DE TRIAL/SUBSCRIPTION EM WORKSPACES
DO $$
BEGIN
    -- Adicionar trial_ends_at
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'workspaces' 
        AND column_name = 'trial_ends_at'
    ) THEN
        ALTER TABLE public.workspaces 
        ADD COLUMN trial_ends_at TIMESTAMPTZ DEFAULT (now() + interval '15 days');
        RAISE NOTICE 'Campo trial_ends_at adicionado em workspaces';
    ELSE
        RAISE NOTICE 'Campo trial_ends_at já existe em workspaces';
    END IF;

    -- Adicionar subscription_status
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'workspaces' 
        AND column_name = 'subscription_status'
    ) THEN
        ALTER TABLE public.workspaces 
        ADD COLUMN subscription_status TEXT DEFAULT 'trial';
        RAISE NOTICE 'Campo subscription_status adicionado em workspaces';
    ELSE
        RAISE NOTICE 'Campo subscription_status já existe em workspaces';
    END IF;

    -- Adicionar subscription_id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'workspaces' 
        AND column_name = 'subscription_id'
    ) THEN
        ALTER TABLE public.workspaces 
        ADD COLUMN subscription_id TEXT;
        RAISE NOTICE 'Campo subscription_id adicionado em workspaces';
    ELSE
        RAISE NOTICE 'Campo subscription_id já existe em workspaces';
    END IF;
END $$;

-- 3. ADICIONAR CHECK CONSTRAINT EM subscription_status
DO $$
BEGIN
    -- Remover constraint antiga se existir
    ALTER TABLE public.workspaces 
    DROP CONSTRAINT IF EXISTS workspaces_subscription_status_check;

    -- Adicionar nova constraint
    ALTER TABLE public.workspaces 
    ADD CONSTRAINT workspaces_subscription_status_check 
    CHECK (subscription_status IN ('trial', 'active', 'cancelled', 'expired', 'past_due'));
    
    RAISE NOTICE 'Constraint subscription_status adicionada';
END $$;

-- 4. ATUALIZAR STATUS DE TAREFAS (Adicionar 'review' como opção válida)
DO $$
BEGIN
    -- Remover constraint antiga se existir
    ALTER TABLE public.tasks 
    DROP CONSTRAINT IF EXISTS tasks_status_check;

    -- Adicionar nova constraint com 'review'
    ALTER TABLE public.tasks 
    ADD CONSTRAINT tasks_status_check 
    CHECK (status IN ('todo', 'in_progress', 'review', 'done', 'archived'));
    
    RAISE NOTICE 'Constraint tasks.status atualizada (adicionado review)';
END $$;

-- 5. INICIALIZAR TRIAL PARA WORKSPACES EXISTENTES SEM TRIAL
DO $$
BEGIN
    UPDATE public.workspaces
    SET 
        trial_ends_at = (created_at + interval '15 days'),
        subscription_status = 'trial'
    WHERE subscription_status IS NULL 
       OR (trial_ends_at IS NULL AND subscription_status = 'trial');
    
    RAISE NOTICE 'Trials inicializados para workspaces existentes';
END $$;

-- 6. CRIAR ÍNDICES ADICIONAIS
CREATE INDEX IF NOT EXISTS idx_workspaces_trial_ends_at 
    ON public.workspaces(trial_ends_at) 
    WHERE subscription_status = 'trial';

CREATE INDEX IF NOT EXISTS idx_workspaces_subscription_status 
    ON public.workspaces(subscription_status);

CREATE INDEX IF NOT EXISTS idx_tasks_status 
    ON public.tasks(status) 
    WHERE status IS NOT NULL;

-- 7. ATUALIZAR FUNÇÃO handle_new_user para incluir whatsapp
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, avatar_url, whatsapp)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
        NEW.raw_user_meta_data->>'avatar_url',
        NEW.raw_user_meta_data->>'whatsapp'
    )
    ON CONFLICT (id) DO UPDATE
    SET 
        email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
        avatar_url = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url),
        whatsapp = COALESCE(EXCLUDED.whatsapp, profiles.whatsapp);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. CRIAR FUNÇÕES AUXILIARES PARA TRIAL/SUBSCRIPTION
CREATE OR REPLACE FUNCTION public.is_trial_active(workspace_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.workspaces
        WHERE id = workspace_uuid
        AND subscription_status = 'trial'
        AND trial_ends_at > NOW()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.has_active_subscription(workspace_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.workspaces
        WHERE id = workspace_uuid
        AND (
            subscription_status = 'active'
            OR (subscription_status = 'trial' AND trial_ends_at > NOW())
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- MIGRATION CONCLUÍDA
-- ============================================

SELECT 'Migration concluída com sucesso! ✅' as resultado;

