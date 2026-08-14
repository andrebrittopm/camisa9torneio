/**
 * ETAPA 4.3B — BUCKET PRIVADO PARA COMPROVANTES
 */
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'av-payment-receipts',
  'av-payment-receipts',
  false,
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/png', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- RLS no Storage (Restritivo)
-- Garantir que anon e authenticated NÃO tenham acesso a este bucket
-- O Lovable Sandbox pode ter policies globais, aqui explicitamos a proibição
-- se as policies forem avaliadas por bucket.

DO $$
BEGIN
    -- Removemos qualquer policy de insert/select para anon/auth se existirem especificamente para este bucket
    DELETE FROM storage.policies WHERE bucket_id = 'av-payment-receipts';
    
    -- Nota: O acesso será via service_role que ignora RLS.
END $$;
