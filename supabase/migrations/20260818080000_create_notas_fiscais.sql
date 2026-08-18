-- ============================================================
-- CONTROLE DE NOTAS FISCAIS
-- ============================================================
-- Admin:
--   acesso completo automaticamente
--
-- Colaborador:
--   sem acesso por padrão
--   acesso somente mediante autorização
-- ============================================================

BEGIN;

-- ============================================================
-- 1. TABELA DE NOTAS FISCAIS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.notas_fiscais (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    identificacao TEXT,

    data DATE,

    nf TEXT NOT NULL,

    fornecedor TEXT,

    observacao TEXT,

    equipamento_id UUID,

    valor NUMERIC(14,2),

    venc01 DATE,
    venc02 DATE,
    venc03 DATE,
    venc04 DATE,
    venc05 DATE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    created_by UUID DEFAULT auth.uid()
);

-- ============================================================
-- 2. RELACIONAMENTO COM EQUIPAMENTOS
-- ============================================================

ALTER TABLE public.notas_fiscais
DROP CONSTRAINT IF EXISTS notas_fiscais_equipamento_id_fkey;

ALTER TABLE public.notas_fiscais
ADD CONSTRAINT notas_fiscais_equipamento_id_fkey
FOREIGN KEY (equipamento_id)
REFERENCES public.equipamentos(id)
ON DELETE SET NULL;

-- ============================================================
-- 3. TABELA DE PERMISSÕES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.notas_fiscais_permissoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL,

    visualizar BOOLEAN NOT NULL DEFAULT TRUE,

    gerenciar BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    created_by UUID DEFAULT auth.uid(),

    CONSTRAINT notas_fiscais_permissoes_user_unique
        UNIQUE (user_id)
);

-- ============================================================
-- 4. RELACIONAMENTO COM USUÁRIO
-- ============================================================

ALTER TABLE public.notas_fiscais_permissoes
DROP CONSTRAINT IF EXISTS notas_fiscais_permissoes_user_id_fkey;

ALTER TABLE public.notas_fiscais_permissoes
ADD CONSTRAINT notas_fiscais_permissoes_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES auth.users(id)
ON DELETE CASCADE;

-- ============================================================
-- 5. ÍNDICES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_notas_fiscais_nf
ON public.notas_fiscais(nf);

CREATE INDEX IF NOT EXISTS idx_notas_fiscais_fornecedor
ON public.notas_fiscais(fornecedor);

CREATE INDEX IF NOT EXISTS idx_notas_fiscais_data
ON public.notas_fiscais(data);

CREATE INDEX IF NOT EXISTS idx_notas_fiscais_equipamento
ON public.notas_fiscais(equipamento_id);

CREATE INDEX IF NOT EXISTS idx_notas_fiscais_venc01
ON public.notas_fiscais(venc01);

CREATE INDEX IF NOT EXISTS idx_notas_fiscais_created_by
ON public.notas_fiscais(created_by);

CREATE INDEX IF NOT EXISTS idx_notas_fiscais_permissoes_user
ON public.notas_fiscais_permissoes(user_id);

-- ============================================================
-- 6. FUNÇÃO: PODE VISUALIZAR NOTAS FISCAIS
-- ============================================================

CREATE OR REPLACE FUNCTION public.can_view_notas_fiscais()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, private
AS $$
    SELECT
        private.has_role(auth.uid(), 'admin'::public.app_role)

        OR EXISTS (
            SELECT 1
            FROM public.notas_fiscais_permissoes p
            WHERE p.user_id = auth.uid()
              AND p.visualizar = TRUE
        );
$$;

-- ============================================================
-- 7. FUNÇÃO: PODE GERENCIAR NOTAS FISCAIS
-- ============================================================

CREATE OR REPLACE FUNCTION public.can_manage_notas_fiscais()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, private
AS $$
    SELECT
        private.has_role(auth.uid(), 'admin'::public.app_role)

        OR EXISTS (
            SELECT 1
            FROM public.notas_fiscais_permissoes p
            WHERE p.user_id = auth.uid()
              AND p.gerenciar = TRUE
        );
$$;

-- ============================================================
-- 8. RLS - NOTAS FISCAIS
-- ============================================================

ALTER TABLE public.notas_fiscais ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notas_fiscais_select_authorized"
ON public.notas_fiscais;

CREATE POLICY "notas_fiscais_select_authorized"
ON public.notas_fiscais
FOR SELECT
TO authenticated
USING (
    public.can_view_notas_fiscais()
);

DROP POLICY IF EXISTS "notas_fiscais_insert_authorized"
ON public.notas_fiscais;

CREATE POLICY "notas_fiscais_insert_authorized"
ON public.notas_fiscais
FOR INSERT
TO authenticated
WITH CHECK (
    public.can_manage_notas_fiscais()
);

DROP POLICY IF EXISTS "notas_fiscais_update_authorized"
ON public.notas_fiscais;

CREATE POLICY "notas_fiscais_update_authorized"
ON public.notas_fiscais
FOR UPDATE
TO authenticated
USING (
    public.can_manage_notas_fiscais()
)
WITH CHECK (
    public.can_manage_notas_fiscais()
);

DROP POLICY IF EXISTS "notas_fiscais_delete_authorized"
ON public.notas_fiscais;

CREATE POLICY "notas_fiscais_delete_authorized"
ON public.notas_fiscais
FOR DELETE
TO authenticated
USING (
    private.has_role(auth.uid(), 'admin'::public.app_role)
);

-- ============================================================
-- 9. RLS - PERMISSÕES
-- ============================================================

ALTER TABLE public.notas_fiscais_permissoes
ENABLE ROW LEVEL SECURITY;

-- Administradores podem visualizar todas as permissões.

DROP POLICY IF EXISTS "notas_fiscais_permissoes_admin_select"
ON public.notas_fiscais_permissoes;

CREATE POLICY "notas_fiscais_permissoes_admin_select"
ON public.notas_fiscais_permissoes
FOR SELECT
TO authenticated
USING (
    private.has_role(auth.uid(), 'admin'::public.app_role)
);

-- Administradores podem criar permissões.

DROP POLICY IF EXISTS "notas_fiscais_permissoes_admin_insert"
ON public.notas_fiscais_permissoes;

CREATE POLICY "notas_fiscais_permissoes_admin_insert"
ON public.notas_fiscais_permissoes
FOR INSERT
TO authenticated
WITH CHECK (
    private.has_role(auth.uid(), 'admin'::public.app_role)
);

-- Administradores podem alterar permissões.

DROP POLICY IF EXISTS "notas_fiscais_permissoes_admin_update"
ON public.notas_fiscais_permissoes;

CREATE POLICY "notas_fiscais_permissoes_admin_update"
ON public.notas_fiscais_permissoes
FOR UPDATE
TO authenticated
USING (
    private.has_role(auth.uid(), 'admin'::public.app_role)
)
WITH CHECK (
    private.has_role(auth.uid(), 'admin'::public.app_role)
);

-- Administradores podem remover permissões.

DROP POLICY IF EXISTS "notas_fiscais_permissoes_admin_delete"
ON public.notas_fiscais_permissoes;

CREATE POLICY "notas_fiscais_permissoes_admin_delete"
ON public.notas_fiscais_permissoes
FOR DELETE
TO authenticated
USING (
    private.has_role(auth.uid(), 'admin'::public.app_role)
);

-- ============================================================
-- 10. TRIGGER updated_at - NOTAS
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_notas_fiscais_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notas_fiscais_updated_at
ON public.notas_fiscais;

CREATE TRIGGER trg_notas_fiscais_updated_at
BEFORE UPDATE ON public.notas_fiscais
FOR EACH ROW
EXECUTE FUNCTION public.update_notas_fiscais_updated_at();

-- ============================================================
-- 11. TRIGGER updated_at - PERMISSÕES
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_notas_fiscais_permissoes_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notas_fiscais_permissoes_updated_at
ON public.notas_fiscais_permissoes;

CREATE TRIGGER trg_notas_fiscais_permissoes_updated_at
BEFORE UPDATE ON public.notas_fiscais_permissoes
FOR EACH ROW
EXECUTE FUNCTION public.update_notas_fiscais_permissoes_updated_at();

COMMIT;
