
-- Create ordens_compra table
CREATE TABLE public.ordens_compra (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  obra_id UUID NOT NULL REFERENCES public.obras(id),
  numero_oc TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'aberta',
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create oc_items table
CREATE TABLE public.oc_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  oc_id UUID NOT NULL REFERENCES public.ordens_compra(id) ON DELETE CASCADE,
  insumo_id UUID NOT NULL REFERENCES public.insumos(id),
  quantity NUMERIC NOT NULL,
  quantity_delivered NUMERIC NOT NULL DEFAULT 0,
  unit_value NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ordens_compra ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oc_items ENABLE ROW LEVEL SECURITY;

-- RLS for ordens_compra
CREATE POLICY "Authenticated can read ordens_compra" ON public.ordens_compra
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can insert ordens_compra" ON public.ordens_compra
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated can update ordens_compra" ON public.ordens_compra
FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Admins can delete ordens_compra" ON public.ordens_compra
FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- RLS for oc_items
CREATE POLICY "Authenticated can read oc_items" ON public.oc_items
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can insert oc_items" ON public.oc_items
FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated can update oc_items" ON public.oc_items
FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated can delete oc_items" ON public.oc_items
FOR DELETE TO authenticated USING (true);

-- Add oc_item_id to entradas (optional link)
ALTER TABLE public.entradas ADD COLUMN oc_item_id UUID REFERENCES public.oc_items(id);

-- Add permission
INSERT INTO public.available_permissions (id, label, category, sort_order)
VALUES ('oc.gerenciar', 'Gerenciar ordens de compra', 'Estoque', 25);

-- Updated_at trigger
CREATE TRIGGER update_ordens_compra_updated_at BEFORE UPDATE ON public.ordens_compra
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
