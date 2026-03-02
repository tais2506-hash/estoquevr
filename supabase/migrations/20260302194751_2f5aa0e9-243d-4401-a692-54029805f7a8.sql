
-- 1. Evolução de Insumos: novos campos de controle
ALTER TABLE public.insumos
  ADD COLUMN IF NOT EXISTS controla_estoque boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS controla_consumo boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS controla_rastreabilidade boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS material_nao_estocavel boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS exige_servico_baixa boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS estoque_minimo numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;

-- 2. Kits de Insumos
CREATE TABLE public.kits (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz DEFAULT NULL
);

ALTER TABLE public.kits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read kits" ON public.kits FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage kits" ON public.kits FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.kit_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  kit_id uuid NOT NULL REFERENCES public.kits(id) ON DELETE CASCADE,
  insumo_id uuid NOT NULL REFERENCES public.insumos(id) ON DELETE RESTRICT,
  quantity numeric NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.kit_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read kit_items" ON public.kit_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage kit_items" ON public.kit_items FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 3. Pacotes de Serviço (EAP) - por obra
CREATE TABLE public.service_packages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  obra_id uuid NOT NULL REFERENCES public.obras(id) ON DELETE CASCADE,
  name text NOT NULL,
  eap_code text NOT NULL DEFAULT '',
  unit text NOT NULL DEFAULT 'un',
  status text NOT NULL DEFAULT 'ativo',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz DEFAULT NULL
);

ALTER TABLE public.service_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read service_packages" ON public.service_packages FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage service_packages" ON public.service_packages FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated can insert service_packages" ON public.service_packages FOR INSERT TO authenticated WITH CHECK (true);

-- 4. Locais (hierárquico, por obra)
CREATE TYPE public.location_type AS ENUM ('torre', 'pavimento', 'unidade', 'ambiente');

CREATE TABLE public.locations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  obra_id uuid NOT NULL REFERENCES public.obras(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES public.locations(id) ON DELETE CASCADE,
  name text NOT NULL,
  type public.location_type NOT NULL DEFAULT 'torre',
  status text NOT NULL DEFAULT 'ativo',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz DEFAULT NULL
);

ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read locations" ON public.locations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage locations" ON public.locations FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated can insert locations" ON public.locations FOR INSERT TO authenticated WITH CHECK (true);

-- 5. Evolução de Saídas: vínculo com EAP e Local
ALTER TABLE public.saidas
  ADD COLUMN IF NOT EXISTS service_package_id uuid REFERENCES public.service_packages(id),
  ADD COLUMN IF NOT EXISTS location_id uuid REFERENCES public.locations(id),
  ADD COLUMN IF NOT EXISTS quantidade_executada numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS kit_id uuid REFERENCES public.kits(id),
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;

-- 6. Soft delete em tabelas existentes
ALTER TABLE public.fornecedores ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
ALTER TABLE public.entradas ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
ALTER TABLE public.movimentacoes ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;

-- 7. Triggers de updated_at
CREATE TRIGGER update_kits_updated_at BEFORE UPDATE ON public.kits FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_service_packages_updated_at BEFORE UPDATE ON public.service_packages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_locations_updated_at BEFORE UPDATE ON public.locations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
