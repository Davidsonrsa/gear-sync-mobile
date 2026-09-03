DO $$
DECLARE
  tabela text;
  politica record;
BEGIN
  FOREACH tabela IN ARRAY ARRAY['medicoes_diarias', 'custos', 'cotacoes', 'notas_fiscais'] LOOP
    IF to_regclass('public.' || tabela) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tabela);

      FOR politica IN
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'public' AND tablename = tabela
      LOOP
        EXECUTE format('DROP POLICY %I ON public.%I', politica.policyname, tabela);
      END LOOP;

      EXECUTE format('CREATE POLICY %I_admin_select ON public.%I FOR SELECT TO authenticated USING (private.has_role(auth.uid(), ''admin''::public.app_role))', tabela, tabela);
      EXECUTE format('CREATE POLICY %I_admin_insert ON public.%I FOR INSERT TO authenticated WITH CHECK (private.has_role(auth.uid(), ''admin''::public.app_role))', tabela, tabela);
      EXECUTE format('CREATE POLICY %I_admin_update ON public.%I FOR UPDATE TO authenticated USING (private.has_role(auth.uid(), ''admin''::public.app_role)) WITH CHECK (private.has_role(auth.uid(), ''admin''::public.app_role))', tabela, tabela);
      EXECUTE format('CREATE POLICY %I_admin_delete ON public.%I FOR DELETE TO authenticated USING (private.has_role(auth.uid(), ''admin''::public.app_role))', tabela, tabela);
    END IF;
  END LOOP;
END $$;