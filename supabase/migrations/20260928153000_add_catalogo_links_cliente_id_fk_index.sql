-- Fix Supabase performance advisor: cover erp_catalogo_links_cliente_id_fkey.
CREATE INDEX IF NOT EXISTS erp_fk_catalogo_links_cliente_id_idx
  ON public.erp_catalogo_links (cliente_id);
