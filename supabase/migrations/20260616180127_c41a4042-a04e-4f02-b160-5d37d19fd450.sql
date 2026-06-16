
-- Fix search_path
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END; $$;

-- Revoga EXECUTE público das funções SECURITY DEFINER (só policies/triggers chamam)
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.equipamentos_enforce_field_perms() FROM PUBLIC, anon, authenticated;

-- Storage policies para bucket equipamento-fotos (privado)
CREATE POLICY "fotos_read_auth" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'equipamento-fotos');

CREATE POLICY "fotos_insert_auth" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'equipamento-fotos' AND owner = auth.uid());

CREATE POLICY "fotos_delete_owner_or_admin" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'equipamento-fotos'
    AND (owner = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  );
