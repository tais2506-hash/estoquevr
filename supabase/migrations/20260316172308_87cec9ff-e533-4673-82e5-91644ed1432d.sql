
ALTER TABLE public.service_packages ALTER COLUMN obra_id DROP NOT NULL;
ALTER TABLE public.service_packages DROP CONSTRAINT service_packages_obra_id_fkey;
