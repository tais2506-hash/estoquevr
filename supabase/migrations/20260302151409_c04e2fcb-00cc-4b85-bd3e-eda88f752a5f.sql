
-- ============================================================
-- ENUMS
-- ============================================================
CREATE TYPE public.app_role AS ENUM ('admin', 'almoxarifado');
CREATE TYPE public.obra_status AS ENUM ('ativa', 'concluida', 'pausada');
CREATE TYPE public.fvm_status AS ENUM ('pendente', 'aprovada', 'reprovada');
CREATE TYPE public.movimentacao_type AS ENUM ('entrada', 'saida', 'transferencia_entrada', 'transferencia_saida', 'devolucao', 'ajuste_inventario');

-- ============================================================
-- PROFILES (linked to auth.users)
-- ============================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- USER ROLES (separate table - security best practice)
-- ============================================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'almoxarifado',
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- SECURITY DEFINER FUNCTION for role checks
-- ============================================================
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- ============================================================
-- OBRAS
-- ============================================================
CREATE TABLE public.obras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  address TEXT NOT NULL DEFAULT '',
  status obra_status NOT NULL DEFAULT 'ativa',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.obras ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- INSUMOS
-- ============================================================
CREATE TABLE public.insumos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  unit TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.insumos ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- FORNECEDORES
-- ============================================================
CREATE TABLE public.fornecedores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  cnpj TEXT NOT NULL UNIQUE,
  contact TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.fornecedores ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- ESTOQUE (saldo por obra+insumo)
-- ============================================================
CREATE TABLE public.estoque (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id UUID NOT NULL REFERENCES public.obras(id),
  insumo_id UUID NOT NULL REFERENCES public.insumos(id),
  quantity NUMERIC NOT NULL DEFAULT 0,
  average_unit_cost NUMERIC NOT NULL DEFAULT 0,
  total_value NUMERIC NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(obra_id, insumo_id)
);
ALTER TABLE public.estoque ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- ENTRADAS
-- ============================================================
CREATE TABLE public.entradas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id UUID NOT NULL REFERENCES public.obras(id),
  insumo_id UUID NOT NULL REFERENCES public.insumos(id),
  nota_fiscal TEXT NOT NULL,
  fornecedor_id UUID NOT NULL REFERENCES public.fornecedores(id),
  quantity NUMERIC NOT NULL,
  unit_value NUMERIC NOT NULL,
  total_value NUMERIC NOT NULL,
  date DATE NOT NULL,
  fvm_id UUID,
  avaliacao_id UUID,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.entradas ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- SAIDAS
-- ============================================================
CREATE TABLE public.saidas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id UUID NOT NULL REFERENCES public.obras(id),
  insumo_id UUID NOT NULL REFERENCES public.insumos(id),
  quantity NUMERIC NOT NULL,
  date DATE NOT NULL,
  local_aplicacao TEXT NOT NULL,
  responsavel TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  edited_at TIMESTAMPTZ,
  edit_reason TEXT
);
ALTER TABLE public.saidas ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- TRANSFERENCIAS
-- ============================================================
CREATE TABLE public.transferencias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_origem_id UUID NOT NULL REFERENCES public.obras(id),
  obra_destino_id UUID NOT NULL REFERENCES public.obras(id),
  insumo_id UUID NOT NULL REFERENCES public.insumos(id),
  quantity NUMERIC NOT NULL,
  date DATE NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.transferencias ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- DEVOLUCOES
-- ============================================================
CREATE TABLE public.devolucoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id UUID NOT NULL REFERENCES public.obras(id),
  entrada_id UUID NOT NULL REFERENCES public.entradas(id),
  insumo_id UUID NOT NULL REFERENCES public.insumos(id),
  fornecedor_id UUID NOT NULL REFERENCES public.fornecedores(id),
  quantity NUMERIC NOT NULL,
  motivo TEXT NOT NULL,
  date DATE NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.devolucoes ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- FVM (Ficha de Verificação de Material)
-- ============================================================
CREATE TABLE public.fvms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id UUID NOT NULL REFERENCES public.obras(id),
  nota_fiscal TEXT NOT NULL,
  fornecedor_id UUID NOT NULL REFERENCES public.fornecedores(id),
  date DATE NOT NULL,
  quantidade_conferida BOOLEAN NOT NULL DEFAULT false,
  qualidade_material BOOLEAN NOT NULL DEFAULT false,
  documentacao_ok BOOLEAN NOT NULL DEFAULT false,
  observacoes TEXT DEFAULT '',
  status fvm_status NOT NULL DEFAULT 'pendente',
  user_id UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.fvms ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- AVALIACOES DE FORNECEDOR
-- ============================================================
CREATE TABLE public.avaliacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id UUID NOT NULL REFERENCES public.obras(id),
  fornecedor_id UUID NOT NULL REFERENCES public.fornecedores(id),
  nota_fiscal TEXT NOT NULL,
  pontualidade INTEGER NOT NULL CHECK (pontualidade BETWEEN 1 AND 5),
  qualidade INTEGER NOT NULL CHECK (qualidade BETWEEN 1 AND 5),
  atendimento INTEGER NOT NULL CHECK (atendimento BETWEEN 1 AND 5),
  documentacao INTEGER NOT NULL CHECK (documentacao BETWEEN 1 AND 5),
  observacoes TEXT DEFAULT '',
  date DATE NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.avaliacoes ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- INVENTARIOS
-- ============================================================
CREATE TABLE public.inventarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id UUID NOT NULL REFERENCES public.obras(id),
  insumo_id UUID NOT NULL REFERENCES public.insumos(id),
  quantidade_sistema NUMERIC NOT NULL,
  quantidade_fisica NUMERIC NOT NULL,
  diferenca NUMERIC NOT NULL,
  justificativa TEXT NOT NULL,
  date DATE NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.inventarios ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- MOVIMENTACOES (histórico geral)
-- ============================================================
CREATE TABLE public.movimentacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id UUID NOT NULL REFERENCES public.obras(id),
  insumo_id UUID NOT NULL REFERENCES public.insumos(id),
  type movimentacao_type NOT NULL,
  quantity NUMERIC NOT NULL,
  date DATE NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  reference_id UUID,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.movimentacoes ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- CONFIGURACOES DO SISTEMA
-- ============================================================
CREATE TABLE public.configuracoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  system_name TEXT NOT NULL DEFAULT 'Valor Real - Controle de Estoque',
  logo_url TEXT,
  primary_color TEXT NOT NULL DEFAULT '#1a5276',
  dark_mode BOOLEAN NOT NULL DEFAULT false,
  currency TEXT NOT NULL DEFAULT 'BRL',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);
ALTER TABLE public.configuracoes ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- AUDIT LOG (imutável)
-- ============================================================
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  user_name TEXT,
  user_role TEXT,
  action TEXT NOT NULL,
  table_name TEXT,
  record_id UUID,
  obra_id UUID REFERENCES public.obras(id),
  old_value JSONB,
  new_value JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- STORAGE BUCKET for logos
-- ============================================================
INSERT INTO storage.buckets (id, name, public) VALUES ('logos', 'logos', true);

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- Profiles: users see their own, admins see all
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- User roles: admins manage, users view own
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all roles" ON public.user_roles
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Obras, Insumos, Fornecedores: all authenticated can read, admins can write
CREATE POLICY "Authenticated can read obras" ON public.obras
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage obras" ON public.obras
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated can read insumos" ON public.insumos
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage insumos" ON public.insumos
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated can read fornecedores" ON public.fornecedores
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage fornecedores" ON public.fornecedores
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Estoque: all authenticated can read, system manages writes
CREATE POLICY "Authenticated can read estoque" ON public.estoque
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can manage estoque" ON public.estoque
  FOR ALL TO authenticated USING (true);

-- Operational tables: all authenticated can read and insert
CREATE POLICY "Authenticated can read entradas" ON public.entradas
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert entradas" ON public.entradas
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage entradas" ON public.entradas
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated can read saidas" ON public.saidas
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert saidas" ON public.saidas
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage saidas" ON public.saidas
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated can read transferencias" ON public.transferencias
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert transferencias" ON public.transferencias
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated can read devolucoes" ON public.devolucoes
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert devolucoes" ON public.devolucoes
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated can read fvms" ON public.fvms
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert fvms" ON public.fvms
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated can read avaliacoes" ON public.avaliacoes
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert avaliacoes" ON public.avaliacoes
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated can read inventarios" ON public.inventarios
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert inventarios" ON public.inventarios
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated can read movimentacoes" ON public.movimentacoes
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert movimentacoes" ON public.movimentacoes
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Configuracoes: all can read, admins can write
CREATE POLICY "Authenticated can read configuracoes" ON public.configuracoes
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage configuracoes" ON public.configuracoes
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Audit logs: only admins can read, system inserts
CREATE POLICY "Admins can read audit logs" ON public.audit_logs
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated can insert audit logs" ON public.audit_logs
  FOR INSERT TO authenticated WITH CHECK (true);

-- Storage policies for logos bucket
CREATE POLICY "Public can view logos" ON storage.objects
  FOR SELECT USING (bucket_id = 'logos');
CREATE POLICY "Admins can upload logos" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'logos' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update logos" ON storage.objects
  FOR UPDATE USING (bucket_id = 'logos' AND public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_obras_updated_at BEFORE UPDATE ON public.obras
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_insumos_updated_at BEFORE UPDATE ON public.insumos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_fornecedores_updated_at BEFORE UPDATE ON public.fornecedores
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_estoque_updated_at BEFORE UPDATE ON public.estoque
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Auto-create profile + default role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', NEW.email));
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'almoxarifado');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Insert default config row
INSERT INTO public.configuracoes (system_name) VALUES ('Valor Real - Controle de Estoque');
