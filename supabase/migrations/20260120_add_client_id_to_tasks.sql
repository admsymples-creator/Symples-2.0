-- Adicionar coluna client_id na tabela tasks
-- Data: 2026-01-20

-- 1. Adicionar coluna com FK
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL;

-- 2. Criar índice para performance de joins
CREATE INDEX IF NOT EXISTS idx_tasks_client_id ON public.tasks(client_id);

-- 3. Atualizar função handle_updated_at para garantir que updated_at mude quando client_id mudar
-- (O trigger existente já cobre isso, pois dispara em UPDATE genérico)
