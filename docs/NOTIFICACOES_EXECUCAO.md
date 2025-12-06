# 🚀 Guia de Execução: Sistema de Notificações

Este guia mostra passo a passo como ativar o sistema de notificações em produção.

## ✅ Passo 1: Desativar Dados Mock

**Status:** ✅ **CONCLUÍDO** - Dados mock já foram desativados no `Header.tsx`

O componente agora está configurado para usar dados reais do banco:
```tsx
<NotificationsPopover userRole={user?.role} useMockData={false} />
```

---

## 📋 Passo 2: Executar Migrações SQL no Supabase

### 2.1. Acessar o Supabase Dashboard

1. Acesse: https://app.supabase.com
2. Selecione seu projeto
3. Vá em **SQL Editor** (menu lateral)

### 2.2. Executar Migração 1: Tabela de Notificações

1. Clique em **New Query**
2. Abra o arquivo: `supabase/migrations/20251206195635_create_notifications_table.sql`
3. Copie todo o conteúdo do arquivo
4. Cole no SQL Editor
5. Clique em **Run** (ou pressione `Ctrl+Enter`)
6. Verifique se aparece: **Success. No rows returned**

### 2.3. Executar Migração 2: Triggers Automáticos

1. Crie uma nova query
2. Abra o arquivo: `supabase/migrations/20251206200000_create_notification_triggers.sql`
3. Copie todo o conteúdo do arquivo
4. Cole no SQL Editor
5. Clique em **Run**
6. Verifique se aparece: **Success. No rows returned**

### 2.4. Verificar se Funcionou

Execute estas queries para verificar:

```sql
-- Verificar se a tabela foi criada
SELECT * FROM public.notifications LIMIT 1;

-- Verificar se os triggers existem
SELECT trigger_name, event_object_table 
FROM information_schema.triggers 
WHERE trigger_schema = 'public' 
AND trigger_name LIKE 'trigger_notify%';

-- Deve retornar 4 triggers:
-- - trigger_notify_task_comment
-- - trigger_notify_task_attachment
-- - trigger_notify_task_assignment
-- - trigger_notify_workspace_invite
```

### 2.5. Testar os Triggers

Crie uma notificação de teste manualmente:

```sql
-- Substitua 'SEU_USER_ID' pelo ID do seu usuário
INSERT INTO public.notifications (
    recipient_id,
    resource_type,
    title,
    category,
    content
) VALUES (
    'SEU_USER_ID'::uuid,
    'task',
    'Notificação de teste',
    'operational',
    'Esta é uma notificação de teste para verificar se está funcionando!'
);

-- Verificar se foi criada
SELECT * FROM public.notifications 
WHERE title = 'Notificação de teste';
```

---

## ⏰ Passo 3: Configurar Cron Job para Tarefas Atrasadas (Opcional)

### Opção A: Usando pg_cron (Recomendado - se disponível)

1. **Verificar se pg_cron está habilitado:**

```sql
SELECT * FROM pg_extension WHERE extname = 'pg_cron';
```

2. **Se não estiver habilitado, habilitar (requer permissões de superuser):**

```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;
```

3. **Agendar verificação diária (executa todo dia às 9h):**

```sql
SELECT cron.schedule(
    'check-overdue-tasks',           -- Nome do job
    '0 9 * * *',                     -- Cron expression: todo dia às 9h
    $$SELECT public.check_overdue_tasks()$$  -- Função a executar
);
```

4. **Verificar se foi agendado:**

```sql
SELECT * FROM cron.job WHERE jobname = 'check-overdue-tasks';
```

5. **Testar manualmente (opcional):**

```sql
SELECT public.check_overdue_tasks();
-- Retorna o número de notificações criadas
```

### Opção B: Usando n8n ou Serviço Externo

Se não tiver acesso ao pg_cron, você pode criar uma API route e agendar no n8n:

1. **Criar API Route** (`app/api/cron/check-overdue-tasks/route.ts`):

```typescript
import { createServerActionClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  // Verificar autenticação/secreto
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = await createServerActionClient();
    const { data, error } = await supabase.rpc("check_overdue_tasks");

    if (error) {
      console.error("Error checking overdue tasks:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      notifications_created: data 
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json({ 
      error: "Internal server error" 
    }, { status: 500 });
  }
}
```

2. **Adicionar variável de ambiente:**

No arquivo `.env.local`:
```
CRON_SECRET=seu_secreto_super_seguro_aqui
```

3. **Agendar no n8n ou similar:**

- URL: `https://seu-dominio.com/api/cron/check-overdue-tasks`
- Método: GET
- Headers: `Authorization: Bearer seu_secreto_super_seguro_aqui`
- Frequência: Diariamente às 9h

---

## 🧪 Passo 4: Testar o Sistema Completo

### 4.1. Teste de Comentário

1. Crie uma tarefa
2. Comente nela (como outro usuário ou em outra aba)
3. Verifique se a notificação aparece no popover

### 4.2. Teste de Anexo

1. Anexe um arquivo a uma tarefa
2. Verifique se a notificação aparece
3. Teste com áudio (deve aparecer com ícone roxo)

### 4.3. Teste de Atribuição

1. Atribua uma tarefa a alguém
2. Verifique se a notificação aparece para o responsável

### 4.4. Teste de Convite

1. Crie um convite de workspace
2. Verifique se a notificação aparece (se o usuário já tiver conta)

---

## 📊 Monitoramento

### Ver Notificações Criadas

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

---

## 🔧 Troubleshooting

### Problema: Notificações não aparecem

1. **Verificar se a tabela existe:**
```sql
SELECT * FROM information_schema.tables 
WHERE table_name = 'notifications';
```

2. **Verificar se os triggers existem:**
```sql
SELECT * FROM information_schema.triggers 
WHERE trigger_name LIKE 'trigger_notify%';
```

3. **Testar função manualmente:**
```sql
SELECT public.create_notification(
    'SEU_USER_ID'::uuid,
    'task',
    'Teste',
    NULL,
    'operational',
    NULL,
    'Conteúdo de teste'
);
```

### Problema: Triggers não estão criando notificações

1. **Verificar permissões:**
```sql
SELECT proname, prosecdef 
FROM pg_proc 
WHERE proname = 'create_notification';
-- prosecdef deve ser true (SECURITY DEFINER)
```

2. **Verificar logs do Supabase:**
   - Vá em **Logs** → **Postgres Logs**
   - Procure por erros relacionados a `create_notification`

### Problema: Cron job não está executando

1. **Verificar se está agendado:**
```sql
SELECT * FROM cron.job WHERE jobname = 'check-overdue-tasks';
```

2. **Verificar histórico de execuções:**
```sql
SELECT * FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'check-overdue-tasks')
ORDER BY start_time DESC
LIMIT 10;
```

---

## ✅ Checklist Final

- [ ] Migração 1 executada (tabela notifications)
- [ ] Migração 2 executada (triggers)
- [ ] Triggers verificados (4 triggers criados)
- [ ] Teste manual de notificação funcionou
- [ ] Dados mock desativados no código
- [ ] Cron job configurado (opcional)
- [ ] Testes de comentário, anexo e atribuição funcionando

---

## 📝 Notas Importantes

- Os triggers usam `SECURITY DEFINER` para ter permissão de criar notificações
- As funções tratam erros graciosamente para não quebrar operações principais
- Notificações de sistema (tarefas atrasadas) evitam spam verificando se já notificou hoje
- O sistema de Realtime já está configurado - notificações aparecem automaticamente no popover

