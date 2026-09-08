ALTER TABLE public.contratos
ADD COLUMN IF NOT EXISTS ativo boolean NOT NULL DEFAULT true;
