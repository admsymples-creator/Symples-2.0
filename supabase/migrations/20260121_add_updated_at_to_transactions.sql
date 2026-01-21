-- Adicionar campo updated_at à tabela transactions
-- Data: 2026-01-21

-- 1. Adicionar coluna updated_at se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'transactions' 
        AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE public.transactions 
        ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
        
        RAISE NOTICE 'Coluna updated_at adicionada à tabela transactions';
    ELSE
        RAISE NOTICE 'Coluna updated_at já existe na tabela transactions';
    END IF;
END $$;

-- 2. Criar ou recriar o trigger para atualizar updated_at
DROP TRIGGER IF EXISTS set_updated_at_transactions ON public.transactions;

CREATE TRIGGER set_updated_at_transactions
    BEFORE UPDATE ON public.transactions
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

RAISE NOTICE 'Trigger set_updated_at_transactions criado com sucesso';
