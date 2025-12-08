# 🔔 Guia de Configuração: Sistema de Notificações

Este documento explica como configurar e usar o sistema de notificações unificado do Symples.

## 📋 Pré-requisitos

1. Execute as migrações SQL na ordem:
   - `20251206195635_create_notifications_table.sql` (tabela base)
   - `20251206200000_create_notification_triggers.sql` (triggers automáticos)

## 🚀 Configuração Inicial

### 1. Executar Migrações no Supabase

1. Acesse o [Supabase Dashboard](https://app.supabase.com)
2. Vá em **SQL Editor**
3. Execute cada migração na ordem:
   - Primeiro: `supabase/migrations/20251206195635_create_notifications_table.sql`
   - Depois: `supabase/migrations/20251206200000_create_notification_triggers.sql`

### 2. Verificar Tabela e Triggers

Após executar as migrações, verifique:

```sql
-- Verificar se a tabela foi criada
SELECT * FROM public.notifications LIMIT 1;

-- Verificar se os triggers existem
SELECT trigger_name, event_object_table 
FROM information_schema.triggers 
WHERE trigger_schema = 'public' 
AND trigger_name LIKE 'trigger_notify%';
```

## ⚙️ Triggers Automáticos

O sistema possui 4 triggers que criam notificações automaticamente:

### 1. **Comentários em Tarefas** (`trigger_notify_task_comment`)
- **Quando**: Um comentário é criado em uma tarefa
- **Notifica**: Criador da tarefa e responsável (se diferentes do autor)
- **Tipo**: `operational`
- **Destaque**: Detecta automaticamente se é áudio (ícone roxo)

### 2. **Anexos de Arquivos** (`trigger_notify_task_attachment`)
- **Quando**: Um arquivo é anexado a uma tarefa
- **Notifica**: Criador da tarefa e responsável (se diferentes do uploader)
- **Tipo**: `operational`
- **Destaque**: Prioridade visual para áudios (roxo), imagens (azul), PDFs (vermelho)

### 3. **Atribuição de Tarefas** (`trigger_notify_task_assignment`)
- **Quando**: Uma tarefa é atribuída a alguém
- **Notifica**: O novo responsável
- **Tipo**: `operational`

### 4. **Convites de Workspace** (`trigger_notify_workspace_invite`)
- **Quando**: Um convite é criado
- **Notifica**: O usuário convidado (se já tiver conta)
- **Tipo**: `admin`
- **Nota**: Complementa o email de convite

## 📅 Configurar Cron Job para Tarefas Atrasadas

Para notificar sobre tarefas atrasadas, você precisa configurar um cron job no Supabase.

### Opção 1: Usando pg_cron (Recomendado)

1. **Habilitar extensão pg_cron** (se ainda não estiver habilitada):

```sql
-- Verificar se está habilitada
SELECT * FROM pg_extension WHERE extname = 'pg_cron';

-- Se não estiver, habilitar (requer permissões de superuser)
CREATE EXTENSION IF NOT EXISTS pg_cron;
```

2. **Agendar verificação diária** (executa todo dia às 9h):

```sql
SELECT cron.schedule(
    'check-overdue-tasks',           -- Nome do job
    '0 9 * * *',                     -- Cron expression: todo dia às 9h
    $$SELECT public.check_overdue_tasks()$$  -- Função a executar
);
```

3. **Verificar jobs agendados**:

```sql
SELECT * FROM cron.job WHERE jobname = 'check-overdue-tasks';
```

4. **Remover job** (se necessário):

```sql
SELECT cron.unschedule('check-overdue-tasks');
```

### Opção 2: Usando n8n ou outro serviço externo

Se não tiver acesso ao pg_cron, você pode criar um webhook/API route que chama a função:

```typescript
// app/api/cron/check-overdue-tasks/route.ts
import { createServerActionClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  // Verificar autenticação/secreto
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabase = await createServerActionClient();
  const { data, error } = await supabase.rpc("check_overdue_tasks");

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ 
    success: true, 
    notifications_created: data 
  });
}
```

Depois, agende no n8n ou similar para chamar esta rota diariamente.

## 🧪 Testar os Triggers

### Teste 1: Comentário em Tarefa

```sql
-- Criar um comentário de teste
INSERT INTO public.task_comments (task_id, user_id, content, type)
SELECT 
    t.id,
    p.id,
    'Este é um comentário de teste',
    'comment'
FROM public.tasks t
CROSS JOIN public.profiles p
WHERE t.id = 'ID_DA_TAREFA'
  AND p.id != t.created_by  -- Usuário diferente do criador
LIMIT 1;

-- Verificar se a notificação foi criada
SELECT * FROM public.notifications 
WHERE resource_type = 'task' 
ORDER BY created_at DESC 
LIMIT 1;
```

### Teste 2: Anexo de Arquivo

```sql
-- Criar um anexo de teste
INSERT INTO public.task_attachments (task_id, file_url, file_name, file_type, uploader_id)
SELECT 
    t.id,
    'https://example.com/test.pdf',
    'test.pdf',
    'application/pdf',
    p.id
FROM public.tasks t
CROSS JOIN public.profiles p
WHERE t.id = 'ID_DA_TAREFA'
  AND p.id != t.created_by
LIMIT 1;

-- Verificar notificação
SELECT * FROM public.notifications 
WHERE resource_type = 'attachment' 
ORDER BY created_at DESC 
LIMIT 1;
```

### Teste 3: Atribuição de Tarefa

```sql
-- Atribuir tarefa a alguém
UPDATE public.tasks
SET assignee_id = 'ID_DO_USUARIO'
WHERE id = 'ID_DA_TAREFA'
  AND assignee_id IS DISTINCT FROM 'ID_DO_USUARIO';

-- Verificar notificação
SELECT * FROM public.notifications 
WHERE resource_type = 'task' 
  AND title LIKE '%atribuiu%'
ORDER BY created_at DESC 
LIMIT 1;
```

## 📊 Monitoramento

### Verificar Notificações Criadas

```sql
-- Notificações por tipo
SELECT 
    category,
    resource_type,
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE read_at IS NULL) as unread
FROM public.notifications
GROUP BY category, resource_type;

-- Notificações recentes
SELECT 
    n.*,
    p.full_name as recipient_name
FROM public.notifications n
JOIN public.profiles p ON p.id = n.recipient_id
ORDER BY n.created_at DESC
LIMIT 20;
```

### Verificar Performance dos Triggers

```sql
-- Verificar se há erros nos logs
SELECT * FROM pg_stat_statements 
WHERE query LIKE '%create_notification%'
ORDER BY total_time DESC;
```

## 🔧 Troubleshooting

### Problema: Triggers não estão criando notificações

1. **Verificar se os triggers existem**:
```sql
SELECT * FROM information_schema.triggers 
WHERE trigger_name LIKE 'trigger_notify%';
```

2. **Verificar permissões da função**:
```sql
SELECT proname, prosecdef 
FROM pg_proc 
WHERE proname = 'create_notification';
-- prosecdef deve ser true (SECURITY DEFINER)
```

3. **Testar função manualmente**:
```sql
SELECT public.create_notification(
    'USER_ID'::uuid,
    'TRIGGERING_USER_ID'::uuid,
    'operational',
    'task',
    'TASK_ID'::uuid,
    'Teste',
    'Conteúdo de teste'
);
```

### Problema: Notificações duplicadas

Os triggers já evitam duplicatas ao:
- Não notificar o próprio autor da ação
- Verificar se já existe notificação recente (para tarefas atrasadas)

Se ainda houver duplicatas, verifique se há múltiplos triggers ou chamadas manuais.

## 🎯 Próximos Passos

1. ✅ Executar migrações no Supabase
2. ✅ Configurar cron job para tarefas atrasadas
3. ✅ Testar triggers manualmente
4. ✅ Monitorar criação de notificações em produção
5. (Opcional) Adicionar mais triggers para outros eventos (ex: mudança de status, conclusão de tarefa)

## 📝 Notas Importantes

- Os triggers usam `SECURITY DEFINER` para ter permissão de criar notificações
- As funções tratam erros graciosamente para não quebrar operações principais
- Notificações de sistema (tarefas atrasadas) evitam spam verificando se já notificou hoje
- O sistema de Realtime já está configurado - notificações aparecem automaticamente no popover

