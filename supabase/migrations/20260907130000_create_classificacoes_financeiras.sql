CREATE TABLE IF NOT EXISTS public.classificacoes_financeiras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.classificacoes_financeiras ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage classificacoes financeiras"
  ON public.classificacoes_financeiras
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
