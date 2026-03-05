-- Align subscription_status enum values to trialing/active/past_due/canceled
-- 1) Normalize legacy values
UPDATE public.workspaces
SET subscription_status = 'trialing'
WHERE subscription_status = 'trial';

UPDATE public.workspaces
SET subscription_status = 'canceled'
WHERE subscription_status IN ('cancelled', 'expired');

-- 2) Replace constraint
ALTER TABLE public.workspaces
DROP CONSTRAINT IF EXISTS workspaces_subscription_status_check;

ALTER TABLE public.workspaces
ADD CONSTRAINT workspaces_subscription_status_check
CHECK (subscription_status IN ('trialing', 'active', 'past_due', 'canceled'));

-- 3) Update default
ALTER TABLE public.workspaces
ALTER COLUMN subscription_status SET DEFAULT 'trialing';

-- 4) Recreate index for trialing
DROP INDEX IF EXISTS idx_workspaces_trial_ends_at;
CREATE INDEX IF NOT EXISTS idx_workspaces_trial_ends_at
  ON public.workspaces(trial_ends_at)
  WHERE subscription_status = 'trialing';
