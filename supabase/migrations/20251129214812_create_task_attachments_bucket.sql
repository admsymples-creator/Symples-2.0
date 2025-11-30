-- MIGRATION: Configuração do Bucket task-attachments
-- Data: 29/11/2025

-- 1. Criar Bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('task-attachments', 'task-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Policies para task-attachments

-- Leitura: Permitir acesso público aos anexos (para facilitar visualização via URL)
-- Alternativa: Apenas autenticados, mas requer signed URLs. Vamos usar public por enquanto.
CREATE POLICY "Task Attachments Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'task-attachments');

-- Upload: Usuários autenticados podem fazer upload
CREATE POLICY "Authenticated users can upload task attachments"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'task-attachments' 
    AND auth.role() = 'authenticated'
);

-- Update: Usuário pode atualizar seus próprios arquivos
CREATE POLICY "Users can update own task attachments"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'task-attachments' 
    AND auth.role() = 'authenticated'
    AND owner = auth.uid()
);

-- Delete: Usuário pode deletar seus próprios arquivos
CREATE POLICY "Users can delete own task attachments"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'task-attachments' 
    AND auth.role() = 'authenticated'
    AND owner = auth.uid()
);


