
-- Tabela de categorias de insumos
CREATE TABLE public.insumo_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.insumo_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read insumo_categories" ON public.insumo_categories
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage insumo_categories" ON public.insumo_categories
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Tabela de unidades de medida
CREATE TABLE public.insumo_units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  abbreviation text NOT NULL UNIQUE,
  name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.insumo_units ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read insumo_units" ON public.insumo_units
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage insumo_units" ON public.insumo_units
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Tabela de tipos de local
CREATE TABLE public.location_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.location_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read location_types" ON public.location_types
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage location_types" ON public.location_types
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Seed: categorias padrão
INSERT INTO public.insumo_categories (name, sort_order) VALUES
  ('Aço', 1), ('Cimento e Argamassa', 2), ('Madeira', 3), ('Elétrica', 4),
  ('Hidráulica', 5), ('Pintura', 6), ('Revestimento', 7), ('Impermeabilização', 8),
  ('Esquadrias', 9), ('Ferragens', 10), ('EPI', 11), ('Limpeza', 12), ('Diversos', 13);

-- Seed: unidades padrão
INSERT INTO public.insumo_units (abbreviation, name, sort_order) VALUES
  ('UN', 'Unidade', 1), ('KG', 'Quilograma', 2), ('M', 'Metro', 3),
  ('M²', 'Metro Quadrado', 4), ('M³', 'Metro Cúbico', 5), ('L', 'Litro', 6),
  ('SC', 'Saco', 7), ('CX', 'Caixa', 8), ('PC', 'Peça', 9), ('RL', 'Rolo', 10),
  ('GL', 'Galão', 11), ('TB', 'Tubo', 12), ('BR', 'Barra', 13), ('FD', 'Fardo', 14),
  ('VB', 'Verba', 15), ('TON', 'Tonelada', 16), ('PAR', 'Par', 17), ('JG', 'Jogo', 18),
  ('MIL', 'Milheiro', 19), ('KIT', 'Kit', 20);

-- Seed: tipos de local padrão
INSERT INTO public.location_types (name, sort_order) VALUES
  ('Torre', 1), ('Pavimento', 2), ('Unidade', 3), ('Ambiente', 4);
