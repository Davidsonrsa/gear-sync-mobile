
-- 1. Remover políticas públicas em cotacao_respostas
DROP POLICY IF EXISTS "Acesso total cotacao_respostas" ON public.cotacao_respostas;
DROP POLICY IF EXISTS "Permitir todas as operações em cotacao_respostas" ON public.cotacao_respostas;

-- 2. Escopar SELECT das tabelas filhas de cotações
DROP POLICY IF EXISTS cotacao_itens_select_auth ON public.cotacao_itens;
CREATE POLICY cotacao_itens_select_auth ON public.cotacao_itens FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.cotacoes c WHERE c.id = cotacao_itens.cotacao_id AND (c.solicitante_id = auth.uid() OR private.has_role(auth.uid(), 'admin'::public.app_role))));

DROP POLICY IF EXISTS cotacao_fornecedores_select_auth ON public.cotacao_fornecedores;
CREATE POLICY cotacao_fornecedores_select_auth ON public.cotacao_fornecedores FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.cotacoes c WHERE c.id = cotacao_fornecedores.cotacao_id AND (c.solicitante_id = auth.uid() OR private.has_role(auth.uid(), 'admin'::public.app_role))));

DROP POLICY IF EXISTS cotacao_respostas_select_auth ON public.cotacao_respostas;
CREATE POLICY cotacao_respostas_select_auth ON public.cotacao_respostas FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.cotacoes c WHERE c.id = cotacao_respostas.cotacao_id AND (c.solicitante_id = auth.uid() OR private.has_role(auth.uid(), 'admin'::public.app_role))));

DROP POLICY IF EXISTS cotacao_aprovacoes_select_auth ON public.cotacao_aprovacoes;
CREATE POLICY cotacao_aprovacoes_select_auth ON public.cotacao_aprovacoes FOR SELECT TO authenticated
USING (usuario_id = auth.uid() OR EXISTS (SELECT 1 FROM public.cotacoes c WHERE c.id = cotacao_aprovacoes.cotacao_id AND (c.solicitante_id = auth.uid() OR private.has_role(auth.uid(), 'admin'::public.app_role))));

DROP POLICY IF EXISTS cotacao_historico_select_auth ON public.cotacao_historico;
CREATE POLICY cotacao_historico_select_auth ON public.cotacao_historico FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.cotacoes c WHERE c.id = cotacao_historico.cotacao_id AND (c.solicitante_id = auth.uid() OR private.has_role(auth.uid(), 'admin'::public.app_role))));

-- 3. Ativar RLS em manutencao_pendencias
GRANT SELECT, INSERT, UPDATE, DELETE ON public.manutencao_pendencias TO authenticated;
GRANT ALL ON public.manutencao_pendencias TO service_role;
REVOKE ALL ON public.manutencao_pendencias FROM anon;
ALTER TABLE public.manutencao_pendencias ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS manutencao_pendencias_select_auth ON public.manutencao_pendencias;
CREATE POLICY manutencao_pendencias_select_auth ON public.manutencao_pendencias FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS manutencao_pendencias_insert_auth ON public.manutencao_pendencias;
CREATE POLICY manutencao_pendencias_insert_auth ON public.manutencao_pendencias FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS manutencao_pendencias_update_auth ON public.manutencao_pendencias;
CREATE POLICY manutencao_pendencias_update_auth ON public.manutencao_pendencias FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS manutencao_pendencias_delete_auth ON public.manutencao_pendencias;
CREATE POLICY manutencao_pendencias_delete_auth ON public.manutencao_pendencias FOR DELETE TO authenticated USING (true);

-- 4. Views com security_invoker
ALTER VIEW public.seguros_alerta SET (security_invoker = on);
ALTER VIEW public.tacografos_vencimentos SET (security_invoker = on);

-- 5. search_path fixo nas funções de trigger
ALTER FUNCTION public.update_notas_fiscais_updated_at() SET search_path = public;
ALTER FUNCTION public.update_notas_fiscais_permissoes_updated_at() SET search_path = public;
