
-- Add user_name column to movimentacoes for displaying who performed the action
ALTER TABLE public.movimentacoes ADD COLUMN user_name text NOT NULL DEFAULT '';
