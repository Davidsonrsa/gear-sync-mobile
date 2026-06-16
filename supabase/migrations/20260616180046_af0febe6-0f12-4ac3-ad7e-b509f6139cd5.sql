
-- 1. ENUM de papéis
CREATE TYPE public.app_role AS ENUM ('admin', 'colaborador');

-- 2. PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. USER_ROLES
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 4. has_role helper (SECURITY DEFINER, sem recursão)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- 5. EQUIPAMENTOS
CREATE TABLE public.equipamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item INTEGER,
  cl TEXT,
  numero TEXT NOT NULL,
  cartao_ticket TEXT,
  identificacao TEXT,
  afericao_taco TEXT,
  placa TEXT,
  ano TEXT,
  localizacao TEXT,
  operador_contato TEXT,
  telefone TEXT,
  cnh TEXT,
  data_ultima_revisao DATE,
  u_revisao NUMERIC,
  h_revisao NUMERIC,
  data_horimetro_atual DATE,
  horimetro_atual NUMERIC,
  proxima_revisao_horimetro NUMERIC,
  hr_rodado NUMERIC,
  observacoes TEXT,
  status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.equipamentos TO authenticated;
GRANT ALL ON public.equipamentos TO service_role;
ALTER TABLE public.equipamentos ENABLE ROW LEVEL SECURITY;

-- 6. FOTOS
CREATE TABLE public.equipamento_fotos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipamento_id UUID NOT NULL REFERENCES public.equipamentos(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  caption TEXT,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.equipamento_fotos TO authenticated;
GRANT ALL ON public.equipamento_fotos TO service_role;
ALTER TABLE public.equipamento_fotos ENABLE ROW LEVEL SECURITY;

-- 7. POLICIES profiles
CREATE POLICY "profiles_select_self_or_admin" ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "profiles_insert_self" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_update_self_or_admin" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- 8. POLICIES user_roles
CREATE POLICY "user_roles_select_self_or_admin" ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- 9. POLICIES equipamentos
CREATE POLICY "equip_select_auth" ON public.equipamentos
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "equip_insert_admin" ON public.equipamentos
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "equip_update_auth" ON public.equipamentos
  FOR UPDATE TO authenticated USING (true);
CREATE POLICY "equip_delete_admin" ON public.equipamentos
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 10. TRIGGER: limita campos que colaborador pode alterar
CREATE OR REPLACE FUNCTION public.equipamentos_enforce_field_perms()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin') THEN
    NEW.updated_at := now();
    NEW.updated_by := auth.uid();
    RETURN NEW;
  END IF;

  -- Colaborador: só pode mudar horimetro_atual, data_horimetro_atual e observacoes
  IF NEW.item              IS DISTINCT FROM OLD.item             OR
     NEW.cl                IS DISTINCT FROM OLD.cl               OR
     NEW.numero            IS DISTINCT FROM OLD.numero           OR
     NEW.cartao_ticket     IS DISTINCT FROM OLD.cartao_ticket    OR
     NEW.identificacao     IS DISTINCT FROM OLD.identificacao    OR
     NEW.afericao_taco     IS DISTINCT FROM OLD.afericao_taco    OR
     NEW.placa             IS DISTINCT FROM OLD.placa            OR
     NEW.ano               IS DISTINCT FROM OLD.ano              OR
     NEW.localizacao       IS DISTINCT FROM OLD.localizacao      OR
     NEW.operador_contato  IS DISTINCT FROM OLD.operador_contato OR
     NEW.telefone          IS DISTINCT FROM OLD.telefone         OR
     NEW.cnh               IS DISTINCT FROM OLD.cnh              OR
     NEW.data_ultima_revisao IS DISTINCT FROM OLD.data_ultima_revisao OR
     NEW.u_revisao         IS DISTINCT FROM OLD.u_revisao        OR
     NEW.h_revisao         IS DISTINCT FROM OLD.h_revisao        OR
     NEW.proxima_revisao_horimetro IS DISTINCT FROM OLD.proxima_revisao_horimetro OR
     NEW.hr_rodado         IS DISTINCT FROM OLD.hr_rodado        OR
     NEW.status            IS DISTINCT FROM OLD.status
  THEN
    RAISE EXCEPTION 'Colaborador só pode alterar horímetro atual, data e observações';
  END IF;

  NEW.updated_at := now();
  NEW.updated_by := auth.uid();
  RETURN NEW;
END;
$$;

CREATE TRIGGER equipamentos_field_perms
BEFORE UPDATE ON public.equipamentos
FOR EACH ROW EXECUTE FUNCTION public.equipamentos_enforce_field_perms();

-- 11. POLICIES fotos
CREATE POLICY "fotos_select_auth" ON public.equipamento_fotos
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "fotos_insert_auth" ON public.equipamento_fotos
  FOR INSERT TO authenticated
  WITH CHECK (uploaded_by = auth.uid());
CREATE POLICY "fotos_delete_owner_or_admin" ON public.equipamento_fotos
  FOR DELETE TO authenticated
  USING (uploaded_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- 12. Trigger: cria profile automaticamente ao cadastrar usuário
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email,
    NEW.raw_user_meta_data->>'phone'
  );
  -- Papel padrão: colaborador
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'colaborador');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 13. updated_at trigger para profiles
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END; $$;

CREATE TRIGGER profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
