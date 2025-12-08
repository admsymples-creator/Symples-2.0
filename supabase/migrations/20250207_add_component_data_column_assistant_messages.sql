-- Garantir coluna component_data na tabela assistant_messages
ALTER TABLE public.assistant_messages
ADD COLUMN IF NOT EXISTS component_data JSONB;

