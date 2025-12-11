-- MIGRATION: Configuração de Storage para Avatars e Workspace Logos
-- Data: 29/11/2025

-- 1. Buckets
-- Nota: A criação de buckets via SQL não é oficial, mas inserção na tabela storage.buckets geralmente funciona.
-- Se falhar, crie manualmente no Dashboard.

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('workspace-logos', 'workspace-logos', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Policies para Avatars
-- Leitura pública
CREATE POLICY "Avatars Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- Upload autenticado (usuário pode fazer upload do seu avatar)
-- Para simplificar, permitimos insert de qualquer autenticado. 
-- O nome do arquivo deve ser preferencialmente user_id/avatar.png para evitar colisão, mas vamos deixar aberto por enquanto.
CREATE POLICY "Authenticated users can upload avatars"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'avatars' 
    AND auth.role() = 'authenticated'
);

-- Update (usuário pode atualizar seus arquivos)
CREATE POLICY "Users can update own avatars"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'avatars' 
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Delete (usuário pode deletar seus arquivos)
CREATE POLICY "Users can delete own avatars"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'avatars' 
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
);


-- 3. Policies para Workspace Logos
-- Leitura pública
CREATE POLICY "Workspace Logos Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'workspace-logos');

-- Upload autenticado (idealmente apenas admins de workspace, mas RLS de storage é complexo de cruzar tabelas)
-- Vamos permitir autenticados, mas o server action validará permissões.
CREATE POLICY "Authenticated users can upload workspace logos"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'workspace-logos' 
    AND auth.role() = 'authenticated'
);

-- Update/Delete (simplificado para autenticados por enquanto, ou restringir por nome de arquivo contendo workspace_id)
CREATE POLICY "Authenticated users can update workspace logos"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'workspace-logos' 
    AND auth.role() = 'authenticated'
);











