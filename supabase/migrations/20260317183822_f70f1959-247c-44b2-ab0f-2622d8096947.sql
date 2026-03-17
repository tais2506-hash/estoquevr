
-- Table for custom permission profiles (roles)
CREATE TABLE public.permission_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.permission_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage permission_profiles"
ON public.permission_profiles FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated can read permission_profiles"
ON public.permission_profiles FOR SELECT TO authenticated
USING (true);

-- Table linking permissions to profiles
CREATE TABLE public.profile_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.permission_profiles(id) ON DELETE CASCADE,
  permission text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(profile_id, permission)
);

ALTER TABLE public.profile_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage profile_permissions"
ON public.profile_permissions FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated can read profile_permissions"
ON public.profile_permissions FOR SELECT TO authenticated
USING (true);

-- Link users to permission profiles (add column to profiles table)
ALTER TABLE public.profiles ADD COLUMN permission_profile_id uuid REFERENCES public.permission_profiles(id) ON DELETE SET NULL;

-- Seed the available permissions list as a reference table
CREATE TABLE public.available_permissions (
  id text PRIMARY KEY,
  label text NOT NULL,
  category text NOT NULL,
  description text DEFAULT '',
  sort_order int NOT NULL DEFAULT 0
);

ALTER TABLE public.available_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read available_permissions"
ON public.available_permissions FOR SELECT TO authenticated
USING (true);

-- Seed all available permissions
INSERT INTO public.available_permissions (id, label, category, description, sort_order) VALUES
-- Estoque
('estoque.entrada.criar', 'Criar entrada de estoque', 'Estoque', 'Permite registrar entradas de materiais', 10),
('estoque.entrada.desfazer', 'Desfazer entrada', 'Estoque', 'Permite reverter uma entrada registrada', 11),
('estoque.saida.criar', 'Criar saída de estoque', 'Estoque', 'Permite registrar saídas de materiais', 20),
('estoque.saida.desfazer', 'Desfazer saída', 'Estoque', 'Permite reverter uma saída registrada', 21),
('estoque.transferencia.criar', 'Criar transferência', 'Estoque', 'Permite transferir materiais entre obras', 30),
('estoque.transferencia.desfazer', 'Desfazer transferência', 'Estoque', 'Permite reverter uma transferência', 31),
('estoque.inventario.criar', 'Realizar inventário', 'Estoque', 'Permite fazer conferência física do estoque', 40),
('estoque.inventario.desfazer', 'Desfazer ajuste de inventário', 'Estoque', 'Permite reverter ajuste de inventário', 41),
('estoque.zerar', 'Zerar estoque da obra', 'Estoque', 'Permite excluir todo o estoque de uma obra', 50),
-- Requisições
('requisicao.criar', 'Criar requisição de canteiro', 'Requisições', 'Permite solicitar materiais via requisição', 60),
('requisicao.aprovar', 'Aprovar/rejeitar requisições', 'Requisições', 'Permite aprovar ou rejeitar requisições pendentes', 61),
-- Cadastros
('cadastro.obras', 'Gerenciar obras', 'Cadastros', 'Permite criar, editar e arquivar obras', 70),
('cadastro.insumos', 'Gerenciar insumos', 'Cadastros', 'Permite criar e editar insumos', 71),
('cadastro.kits', 'Gerenciar kits', 'Cadastros', 'Permite criar e editar kits', 72),
('cadastro.locais', 'Gerenciar locais', 'Cadastros', 'Permite criar e editar locais (torres, pavimentos, etc.)', 73),
('cadastro.servicos', 'Gerenciar pacotes de serviço', 'Cadastros', 'Permite criar e editar pacotes de serviço', 74),
-- Dashboards & Relatórios
('dashboard.geral', 'Visualizar dashboard geral', 'Dashboards', 'Acesso ao dashboard consolidado', 80),
('dashboard.obra', 'Visualizar dashboard por obra', 'Dashboards', 'Acesso ao dashboard individual de cada obra', 81),
('dashboard.kits', 'Visualizar dashboard de kits', 'Dashboards', 'Acesso ao dashboard de kits', 82),
('relatorios.visualizar', 'Visualizar relatórios', 'Relatórios', 'Acesso aos relatórios do sistema', 90),
-- Administração
('admin.usuarios', 'Gerenciar usuários', 'Administração', 'Permite criar, editar e desativar usuários', 100),
('admin.perfis', 'Gerenciar perfis de permissão', 'Administração', 'Permite criar e editar perfis de permissão', 101);

-- Seed default profiles matching current roles
INSERT INTO public.permission_profiles (id, name, description) VALUES
('00000000-0000-0000-0000-000000000001', 'Administrador', 'Acesso total ao sistema'),
('00000000-0000-0000-0000-000000000002', 'Almoxarife', 'Operações de estoque e requisições'),
('00000000-0000-0000-0000-000000000003', 'Gestor de Obra', 'Visualização e requisições'),
('00000000-0000-0000-0000-000000000004', 'Visualizador', 'Apenas visualização');

-- Admin gets all permissions
INSERT INTO public.profile_permissions (profile_id, permission)
SELECT '00000000-0000-0000-0000-000000000001', id FROM public.available_permissions;

-- Almoxarife permissions
INSERT INTO public.profile_permissions (profile_id, permission) VALUES
('00000000-0000-0000-0000-000000000002', 'estoque.entrada.criar'),
('00000000-0000-0000-0000-000000000002', 'estoque.saida.criar'),
('00000000-0000-0000-0000-000000000002', 'estoque.transferencia.criar'),
('00000000-0000-0000-0000-000000000002', 'estoque.inventario.criar'),
('00000000-0000-0000-0000-000000000002', 'requisicao.criar'),
('00000000-0000-0000-0000-000000000002', 'requisicao.aprovar'),
('00000000-0000-0000-0000-000000000002', 'dashboard.obra');

-- Gestor permissions
INSERT INTO public.profile_permissions (profile_id, permission) VALUES
('00000000-0000-0000-0000-000000000003', 'requisicao.criar'),
('00000000-0000-0000-0000-000000000003', 'dashboard.geral'),
('00000000-0000-0000-0000-000000000003', 'dashboard.obra'),
('00000000-0000-0000-0000-000000000003', 'dashboard.kits'),
('00000000-0000-0000-0000-000000000003', 'relatorios.visualizar');

-- Visualizador permissions
INSERT INTO public.profile_permissions (profile_id, permission) VALUES
('00000000-0000-0000-0000-000000000004', 'dashboard.obra');

-- Function to check if user has a specific permission
CREATE OR REPLACE FUNCTION public.user_has_permission(_user_id uuid, _permission text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.profile_permissions pp ON pp.profile_id = p.permission_profile_id
    WHERE p.user_id = _user_id AND pp.permission = _permission
  )
  OR
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'admin'
  )
$$;

-- Trigger for updated_at
CREATE TRIGGER update_permission_profiles_updated_at
BEFORE UPDATE ON public.permission_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();
