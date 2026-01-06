-- Allow plan = agency on workspaces
DO $$
DECLARE
  constraint_name text;
BEGIN
  SELECT conname INTO constraint_name
  FROM pg_constraint
  JOIN pg_class ON conrelid = pg_class.oid
  JOIN pg_namespace ON pg_namespace.oid = pg_class.relnamespace
  WHERE pg_namespace.nspname = 'public'
    AND pg_class.relname = 'workspaces'
    AND pg_constraint.contype = 'c'
    AND pg_get_constraintdef(pg_constraint.oid) ILIKE '%plan%';

  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.workspaces DROP CONSTRAINT %I', constraint_name);
  END IF;
END $$;

ALTER TABLE public.workspaces
ADD CONSTRAINT workspaces_plan_check
CHECK (plan IN ('starter', 'pro', 'business', 'agency'));
