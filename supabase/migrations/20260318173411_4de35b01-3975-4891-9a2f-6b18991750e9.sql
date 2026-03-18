
-- Drop permission-based policies on kits
DROP POLICY IF EXISTS "Users with permission can insert kits" ON public.kits;
DROP POLICY IF EXISTS "Users with permission can update kits" ON public.kits;
DROP POLICY IF EXISTS "Users with permission can delete kits" ON public.kits;
DROP POLICY IF EXISTS "Users with permission can insert kit_items" ON public.kit_items;
DROP POLICY IF EXISTS "Users with permission can update kit_items" ON public.kit_items;
DROP POLICY IF EXISTS "Users with permission can delete kit_items" ON public.kit_items;

-- Allow all authenticated users to manage kits
CREATE POLICY "Authenticated can insert kits"
ON public.kits FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated can update kits"
ON public.kits FOR UPDATE TO authenticated
USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated can delete kits"
ON public.kits FOR DELETE TO authenticated
USING (true);

-- Allow all authenticated users to manage kit_items
CREATE POLICY "Authenticated can insert kit_items"
ON public.kit_items FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated can update kit_items"
ON public.kit_items FOR UPDATE TO authenticated
USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated can delete kit_items"
ON public.kit_items FOR DELETE TO authenticated
USING (true);
