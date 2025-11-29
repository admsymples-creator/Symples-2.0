-- ============================================
-- MIGRATION: Adicionar campo whatsapp em profiles (PROD)
-- Execute este script no banco PROD para adicionar o campo whatsapp
-- ============================================

-- ADICIONAR CAMPO WHATSAPP EM PROFILES
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'whatsapp'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN whatsapp TEXT;
        RAISE NOTICE '✅ Campo whatsapp adicionado em profiles';
    ELSE
        RAISE NOTICE '⚠️ Campo whatsapp já existe em profiles';
    END IF;
END $$;

-- ATUALIZAR FUNÇÃO handle_new_user para incluir whatsapp
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

-- ============================================
-- MIGRATION CONCLUÍDA
-- ============================================

SELECT '✅ Campo whatsapp adicionado em profiles!' as resultado;

