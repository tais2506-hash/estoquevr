
CREATE TYPE public.tipo_laudo AS ENUM ('global', 'por_lote', 'nao_controlado');

ALTER TABLE public.insumos ADD COLUMN tipo_laudo public.tipo_laudo NOT NULL DEFAULT 'nao_controlado';

CREATE TABLE public.laudos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  insumo_id uuid NOT NULL REFERENCES public.insumos(id) ON DELETE CASCADE,
  file_url text NOT NULL,
  file_name text NOT NULL,
  validade date,
  lote text,
  nota_fiscal text,
  fvm_id uuid REFERENCES public.fvms(id),
  obra_id uuid REFERENCES public.obras(id),
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.laudos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read laudos" ON public.laudos
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can insert laudos" ON public.laudos
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Admins can manage laudos" ON public.laudos
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated can delete own laudos" ON public.laudos
  FOR DELETE TO authenticated USING (auth.uid() = created_by);

INSERT INTO storage.buckets (id, name, public) VALUES ('laudos', 'laudos', true);

CREATE POLICY "Authenticated can upload laudos" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'laudos');

CREATE POLICY "Anyone can read laudos" ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'laudos');

CREATE POLICY "Admins can delete laudos files" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'laudos' AND has_role(auth.uid(), 'admin'::app_role));
