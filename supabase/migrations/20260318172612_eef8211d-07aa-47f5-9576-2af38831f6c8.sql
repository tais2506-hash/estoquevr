
-- Allow users with cadastro.kits permission to manage kits
CREATE POLICY "Users with permission can insert kits"
ON public.kits FOR INSERT TO authenticated
WITH CHECK (public.user_has_permission(auth.uid(), 'cadastro.kits'));

CREATE POLICY "Users with permission can update kits"
ON public.kits FOR UPDATE TO authenticated
USING (public.user_has_permission(auth.uid(), 'cadastro.kits'))
WITH CHECK (public.user_has_permission(auth.uid(), 'cadastro.kits'));

CREATE POLICY "Users with permission can delete kits"
ON public.kits FOR DELETE TO authenticated
USING (public.user_has_permission(auth.uid(), 'cadastro.kits'));

-- Allow users with cadastro.kits permission to manage kit_items
CREATE POLICY "Users with permission can insert kit_items"
ON public.kit_items FOR INSERT TO authenticated
WITH CHECK (public.user_has_permission(auth.uid(), 'cadastro.kits'));

CREATE POLICY "Users with permission can update kit_items"
ON public.kit_items FOR UPDATE TO authenticated
USING (public.user_has_permission(auth.uid(), 'cadastro.kits'))
WITH CHECK (public.user_has_permission(auth.uid(), 'cadastro.kits'));

CREATE POLICY "Users with permission can delete kit_items"
ON public.kit_items FOR DELETE TO authenticated
USING (public.user_has_permission(auth.uid(), 'cadastro.kits'));
