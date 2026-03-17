CREATE POLICY "Admins can delete estoque"
ON public.estoque
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));