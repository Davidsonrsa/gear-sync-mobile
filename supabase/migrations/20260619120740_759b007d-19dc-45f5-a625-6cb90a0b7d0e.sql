
CREATE TABLE public.manutencao_historico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipamento_id uuid NOT NULL REFERENCES public.equipamentos(id) ON DELETE CASCADE,
  data date NOT NULL DEFAULT CURRENT_DATE,
  horimetro numeric,
  tipo_revisao text,
  executante text,
  observacoes text,
  itens jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.manutencao_historico TO authenticated;
GRANT ALL ON public.manutencao_historico TO service_role;

ALTER TABLE public.manutencao_historico ENABLE ROW LEVEL SECURITY;

CREATE POLICY mh_select_auth ON public.manutencao_historico
  FOR SELECT TO authenticated USING (true);

CREATE POLICY mh_insert_auth ON public.manutencao_historico
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY mh_update_owner_or_admin ON public.manutencao_historico
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY mh_delete_owner_or_admin ON public.manutencao_historico
  FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_mh_equip_data ON public.manutencao_historico(equipamento_id, data DESC);

CREATE TRIGGER trg_mh_set_updated_at
  BEFORE UPDATE ON public.manutencao_historico
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
