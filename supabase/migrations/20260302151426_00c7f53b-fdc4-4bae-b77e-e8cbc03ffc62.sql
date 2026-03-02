
-- Fix overly permissive estoque policy - replace ALL with specific operations
DROP POLICY "Authenticated can manage estoque" ON public.estoque;

CREATE POLICY "Authenticated can insert estoque" ON public.estoque
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated can update estoque" ON public.estoque
  FOR UPDATE TO authenticated USING (true);

-- Fix audit_logs insert policy - restrict to authenticated user
DROP POLICY "Authenticated can insert audit logs" ON public.audit_logs;

CREATE POLICY "System can insert audit logs" ON public.audit_logs
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
