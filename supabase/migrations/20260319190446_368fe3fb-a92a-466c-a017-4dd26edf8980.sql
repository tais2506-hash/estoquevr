
-- Junction table: which fabricantes make which insumos
CREATE TABLE public.insumo_fabricantes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  insumo_id uuid NOT NULL REFERENCES public.insumos(id) ON DELETE CASCADE,
  fabricante_id uuid NOT NULL REFERENCES public.fabricantes(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(insumo_id, fabricante_id)
);

ALTER TABLE public.insumo_fabricantes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read insumo_fabricantes" ON public.insumo_fabricantes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage insumo_fabricantes" ON public.insumo_fabricantes FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated can insert insumo_fabricantes" ON public.insumo_fabricantes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can delete insumo_fabricantes" ON public.insumo_fabricantes FOR DELETE TO authenticated USING (true);
