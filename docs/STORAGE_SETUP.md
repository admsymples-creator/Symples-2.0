# Configuração do Supabase Storage

## Problema: "Bucket not found"

Se você está recebendo o erro `Bucket not found`, significa que o bucket `attachments` ainda não foi criado no Supabase Storage.

## Solução: Criar o Bucket

### Opção 1: Via Dashboard do Supabase (Recomendado)

1. Acesse o [Supabase Dashboard](https://app.supabase.com)
2. Selecione seu projeto
3. Vá em **Storage** no menu lateral
4. Clique em **New bucket** ou **Create bucket**
5. Configure o bucket:
   - **Name**: `attachments`
   - **Public bucket**: ✅ **Marcado** (importante para URLs públicas)
   - **File size limit**: (opcional) Recomendado: 10MB ou 50MB
   - **Allowed MIME types**: (opcional) Deixe vazio para permitir todos os tipos
6. Clique em **Create bucket**

### Opção 2: Via SQL (Apenas políticas RLS)

Após criar o bucket manualmente, execute as políticas RLS do arquivo `supabase/storage_setup.sql`:

```sql
-- Permitir leitura pública
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'attachments');

-- Permitir upload para usuários autenticados
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'attachments' 
    AND auth.role() = 'authenticated'
);

-- Permitir deleção para usuários autenticados
CREATE POLICY "Users can delete own files"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'attachments' 
    AND auth.role() = 'authenticated'
);
```

## Verificação

Após criar o bucket, teste o upload de um arquivo:

1. Abra uma tarefa no modal
2. Arraste um arquivo para a área de upload
3. O arquivo deve ser enviado com sucesso

## Troubleshooting

### Erro: "Bucket not found"

Este erro pode ter várias causas:

#### 1. Verificar se o bucket existe
1. Acesse o Supabase Dashboard
2. Vá em **Storage** > **Buckets**
3. Verifique se existe um bucket chamado exatamente `attachments`
4. Se não existir, crie seguindo os passos acima

#### 2. Verificar projeto correto
- ✅ Certifique-se de estar usando as credenciais do projeto correto
- ✅ Verifique as variáveis de ambiente `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- ✅ Se tiver múltiplos projetos (dev/prod), confira qual está configurado

#### 3. Verificar permissões
- ✅ O bucket deve estar acessível (pode ser público ou privado com RLS configurado)
- ✅ Verifique se as políticas RLS foram criadas (veja `supabase/storage_setup.sql`)

#### 4. Teste manual no Dashboard
1. Vá em **Storage** > **Buckets** > **attachments**
2. Tente fazer upload manual de um arquivo
3. Se funcionar no Dashboard mas não no código, pode ser problema de credenciais

#### 5. Verificar console do navegador
- Abra o DevTools (F12)
- Vá na aba **Console**
- Procure por erros relacionados ao Supabase
- Verifique se as variáveis de ambiente estão carregadas corretamente

### Erro: "Permission denied"
- ✅ Verifique se as políticas RLS foram criadas corretamente
- ✅ Verifique se o bucket está marcado como público (se necessário)

### Erro: "File too large"
- ✅ Ajuste o limite de tamanho no bucket
- ✅ Ou valide o tamanho do arquivo antes do upload no frontend

## Estrutura de Pastas (Opcional)

Por padrão, os arquivos são salvos na raiz do bucket. Se quiser organizar por tarefa:

```
attachments/
  ├── task-{taskId}/
  │   ├── {timestamp}-{random}-{filename}
  │   └── ...
  └── ...
```

Para implementar isso, modifique o `useFileUpload` para incluir o `taskId` no path.

