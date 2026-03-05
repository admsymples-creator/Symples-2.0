-- ============================================
-- MIGRATION: Agendar cron job para tarefas atrasadas
-- ============================================
-- Bug 3: check_overdue_tasks() existe mas nunca era chamada.
-- Este migration registra o cron job via pg_cron (extensão nativa do Supabase).
--
-- Para reverter:
--   SELECT cron.unschedule('check-overdue-tasks');

SELECT cron.schedule(
  'check-overdue-tasks',
  '0 9 * * *',
  'SELECT public.check_overdue_tasks();'
);
