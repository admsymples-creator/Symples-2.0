-- Allow transactions without due_date (no default)
ALTER TABLE public.transactions
ALTER COLUMN due_date DROP DEFAULT;
