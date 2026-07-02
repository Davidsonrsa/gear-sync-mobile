
DROP POLICY IF EXISTS mh_update_owner_or_admin ON public.manutencao_historico;
DROP POLICY IF EXISTS mh_delete_owner_or_admin ON public.manutencao_historico;
CREATE POLICY mh_update_any_auth ON public.manutencao_historico FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY mh_delete_any_auth ON public.manutencao_historico FOR DELETE TO authenticated USING (true);
