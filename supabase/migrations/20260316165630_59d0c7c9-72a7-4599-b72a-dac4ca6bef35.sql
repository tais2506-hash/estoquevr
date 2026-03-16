
-- Create requisicoes table
CREATE TABLE public.requisicoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  obra_id UUID NOT NULL REFERENCES public.obras(id),
  insumo_id UUID NOT NULL REFERENCES public.insumos(id),
  quantity NUMERIC NOT NULL,
  local_aplicacao TEXT NOT NULL DEFAULT '',
  location_id UUID REFERENCES public.locations(id),
  responsavel TEXT NOT NULL,
  solicitante_nome TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovada', 'rejeitada')),
  motivo_rejeicao TEXT,
  date DATE NOT NULL,
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  kit_id UUID REFERENCES public.kits(id)
);

-- Enable RLS
ALTER TABLE public.requisicoes ENABLE ROW LEVEL SECURITY;

-- Authenticated can read all requisicoes
CREATE POLICY "Authenticated can read requisicoes"
  ON public.requisicoes FOR SELECT TO authenticated
  USING (true);

-- Authenticated can insert own requisicoes
CREATE POLICY "Authenticated can insert requisicoes"
  ON public.requisicoes FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Authenticated can update requisicoes (for approval)
CREATE POLICY "Authenticated can update requisicoes"
  ON public.requisicoes FOR UPDATE TO authenticated
  USING (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.requisicoes;
