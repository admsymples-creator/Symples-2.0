-- Add account_plan to profiles for user-level plans (Agency)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS account_plan TEXT;

ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_account_plan_check;

ALTER TABLE public.profiles
ADD CONSTRAINT profiles_account_plan_check
CHECK (account_plan IN ('agency'));

CREATE INDEX IF NOT EXISTS idx_profiles_account_plan
  ON public.profiles(account_plan);
