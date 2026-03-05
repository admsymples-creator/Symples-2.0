-- ============================================
-- MIGRATION: Índice GIN em metadata->>'workspace_id'
-- ============================================
-- Bug 6: filtro por workspace_id nas notificações era feito em JS após buscar tudo do banco.
-- Índice GIN em jsonb_path_ops acelera operações como @> e ->> em JSONB.

CREATE INDEX IF NOT EXISTS idx_notifications_metadata_workspace
  ON public.notifications
  USING GIN (metadata jsonb_path_ops);
