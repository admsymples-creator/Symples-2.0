-- ============================================
-- MIGRATION: Adicionar dias da semana para recorrÃªncia
-- ============================================

ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS recurrence_days INTEGER[];

COMMENT ON COLUMN public.tasks.recurrence_days IS 'Dias da semana para recorrÃªncia semanal/custom (0=Domingo..6=SÃ¡bado)';
