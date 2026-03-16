-- Allow admins to update movimentacoes (for soft-delete)
CREATE POLICY "Admins can update movimentacoes"
ON public.movimentacoes FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Allow admins to delete inventarios
CREATE POLICY "Admins can delete inventarios"
ON public.inventarios FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));