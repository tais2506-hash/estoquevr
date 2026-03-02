-- Add 'arquivada' to obra_status enum
ALTER TYPE public.obra_status ADD VALUE IF NOT EXISTS 'arquivada';