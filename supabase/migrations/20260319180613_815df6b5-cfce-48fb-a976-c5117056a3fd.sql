
-- Table for FVM configurable questions (global)
CREATE TABLE public.fvm_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  text text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.fvm_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage fvm_questions" ON public.fvm_questions FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated can read fvm_questions" ON public.fvm_questions FOR SELECT TO authenticated USING (true);

-- Table for FVM answers (one row per question per FVM)
CREATE TABLE public.fvm_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fvm_id uuid NOT NULL REFERENCES public.fvms(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.fvm_questions(id),
  conforme boolean NOT NULL DEFAULT true,
  observacao text DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.fvm_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can insert fvm_answers" ON public.fvm_answers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can read fvm_answers" ON public.fvm_answers FOR SELECT TO authenticated USING (true);

-- Table for non-conformities (NCs)
CREATE TABLE public.nao_conformidades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fvm_id uuid NOT NULL REFERENCES public.fvms(id) ON DELETE CASCADE,
  fvm_answer_id uuid REFERENCES public.fvm_answers(id),
  obra_id uuid NOT NULL REFERENCES public.obras(id),
  insumo_id uuid REFERENCES public.insumos(id),
  description text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'aberta',
  resolution text,
  resolved_at timestamp with time zone,
  resolved_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.nao_conformidades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can insert nao_conformidades" ON public.nao_conformidades FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can read nao_conformidades" ON public.nao_conformidades FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can update nao_conformidades" ON public.nao_conformidades FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
