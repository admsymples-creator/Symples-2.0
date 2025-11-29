-- ============================================
-- CONFIGURAÇÃO DO SUPABASE STORAGE
-- ============================================
-- Este script configura o bucket "attachments" para armazenar anexos de tarefas
-- Execute este script no SQL Editor do Supabase Dashboard

-- 1. Criar o bucket "attachments" (se não existir)
-- Nota: A criação de buckets via SQL não é suportada diretamente
-- Você precisa criar o bucket manualmente no Dashboard do Supabase:
-- Storage > Create Bucket > Nome: "attachments" > Public: true

-- 2. Configurar políticas RLS para o bucket
-- Permitir leitura pública (para arquivos públicos)
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'attachments');

-- Permitir upload apenas para usuários autenticados
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'attachments' 
    AND auth.role() = 'authenticated'
);

-- Permitir que usuários autenticados deletem seus próprios arquivos
CREATE POLICY "Users can delete own files"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'attachments' 
    AND auth.role() = 'authenticated'
    -- Opcional: verificar se o usuário é o dono do arquivo
    -- AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Permitir que usuários autenticados atualizem seus próprios arquivos
CREATE POLICY "Users can update own files"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'attachments' 
    AND auth.role() = 'authenticated'
);

-- ============================================
-- INSTRUÇÕES MANUAIS:
-- ============================================
-- 1. Acesse o Supabase Dashboard
-- 2. Vá em Storage > Buckets
-- 3. Clique em "New bucket"
-- 4. Configure:
--    - Name: attachments
--    - Public bucket: ✅ (marcado)
--    - File size limit: (opcional, recomendado: 10MB ou 50MB)
--    - Allowed MIME types: (opcional, deixe vazio para permitir todos)
-- 5. Clique em "Create bucket"
-- 6. Execute as políticas RLS acima no SQL Editor

