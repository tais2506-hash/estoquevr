
-- 1. Create fabricantes table
CREATE TABLE public.fabricantes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

ALTER TABLE public.fabricantes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage fabricantes" ON public.fabricantes FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated can read fabricantes" ON public.fabricantes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert fabricantes" ON public.fabricantes FOR INSERT TO authenticated WITH CHECK (true);

-- 2. Replace fornecedor_id with fabricante_id on laudos
ALTER TABLE public.laudos DROP COLUMN IF EXISTS fornecedor_id;
ALTER TABLE public.laudos ADD COLUMN fabricante_id uuid REFERENCES public.fabricantes(id);
