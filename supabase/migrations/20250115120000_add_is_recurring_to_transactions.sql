-- Adicionar campo is_recurring na tabela transactions
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT false NOT NULL;

-- Criar índice para otimizar queries de burn rate (despesas recorrentes)
CREATE INDEX IF NOT EXISTS idx_transactions_is_recurring 
ON public.transactions(workspace_id, is_recurring) 
WHERE is_recurring = true;

-- Comentário para documentação
COMMENT ON COLUMN public.transactions.is_recurring IS 'Indica se a transação é recorrente (mensal)';

