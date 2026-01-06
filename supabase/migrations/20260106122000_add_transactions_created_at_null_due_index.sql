-- Optimize queries for transactions without due_date
CREATE INDEX IF NOT EXISTS idx_transactions_workspace_created_at_null_due
  ON public.transactions(workspace_id, created_at)
  WHERE due_date IS NULL;
