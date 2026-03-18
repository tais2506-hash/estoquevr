
-- Empréstimos entre obras
CREATE TABLE public.emprestimos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  obra_solicitante_id UUID NOT NULL REFERENCES public.obras(id),
  obra_emprestadora_id UUID NOT NULL REFERENCES public.obras(id),
  insumo_id UUID NOT NULL REFERENCES public.insumos(id),
  quantity NUMERIC NOT NULL,
  date DATE NOT NULL,
  data_prevista_devolucao DATE NOT NULL,
  data_devolucao DATE,
  status TEXT NOT NULL DEFAULT 'pendente',
  solicitante_user_id UUID NOT NULL,
  aprovador_user_id UUID,
  solicitante_nome TEXT NOT NULL DEFAULT '',
  aprovador_nome TEXT,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.emprestimos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read emprestimos" ON public.emprestimos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert emprestimos" ON public.emprestimos FOR INSERT TO authenticated WITH CHECK (auth.uid() = solicitante_user_id);
CREATE POLICY "Authenticated can update emprestimos" ON public.emprestimos FOR UPDATE TO authenticated USING (true);
