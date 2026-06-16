
DROP POLICY IF EXISTS "equip_update_auth" ON public.equipamentos;
CREATE POLICY "equip_update_auth" ON public.equipamentos
  FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);
