CREATE TABLE IF NOT EXISTS public.classificacoes_financeiras (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.classificacoes_financeiras TO authenticated;
GRANT ALL ON public.classificacoes_financeiras TO service_role;

ALTER TABLE public.classificacoes_financeiras ENABLE ROW LEVEL SECURITY;

CREATE POLICY "classificacoes_select_auth" ON public.classificacoes_financeiras FOR SELECT TO authenticated USING (true);
CREATE POLICY "classificacoes_insert_auth" ON public.classificacoes_financeiras FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "classificacoes_update_auth" ON public.classificacoes_financeiras FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "classificacoes_delete_auth" ON public.classificacoes_financeiras FOR DELETE TO authenticated USING (true);

CREATE TRIGGER trg_classificacoes_updated_at
BEFORE UPDATE ON public.classificacoes_financeiras
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.contratos ADD COLUMN IF NOT EXISTS ativo boolean NOT NULL DEFAULT true;