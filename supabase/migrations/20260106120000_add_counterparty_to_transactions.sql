-- Add counterparty_name to transactions for client/supplier tracking
ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS counterparty_name TEXT;
