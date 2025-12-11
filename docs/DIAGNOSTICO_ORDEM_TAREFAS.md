# 🔍 Diagnóstico: Problemas no Salvamento da Ordem das Tarefas

## 📋 Resumo Executivo

Este documento lista todas as possíveis causas que podem estar impedindo o salvamento da ordem das tarefas no banco de dados, com foco em problemas de RLS, triggers, constraints e lógica de atualização.

---

## 🎯 1. PROBLEMAS DE RLS (Row Level Security)

### 1.1. Política de UPDATE muito restritiva

**Localização:** `supabase/schema.sql` linhas 468-482

```sql
CREATE POLICY "Members can update workspace tasks"
    ON public.tasks FOR UPDATE
    USING (
        (workspace_id IS NOT NULL AND is_workspace_member(workspace_id))
        OR
        (workspace_id IS NULL AND is_personal = true AND created_by = auth.uid())
        OR
        assignee_id = auth.uid()
    )
    WITH CHECK (
        (workspace_id IS NOT NULL AND is_workspace_member(workspace_id))
        OR
        (workspace_id IS NULL AND is_personal = true AND created_by = auth.uid())
    );
```

**Possíveis Problemas:**
- ✅ **USING clause:** Verifica se o usuário PODE atualizar a linha existente
- ⚠️ **WITH CHECK clause:** Verifica se os NOVOS valores são válidos
- ❌ **PROBLEMA CRÍTICO:** Se `workspace_id` mudar durante o UPDATE, a política pode falhar
- ❌ **PROBLEMA:** Se `is_workspace_member()` retornar `false` no momento do UPDATE, a operação será bloqueada

**Como verificar:**
```sql
-- Verificar se o usuário é membro do workspace
SELECT is_workspace_member('workspace-id-aqui');
```

### 1.2. Função `is_workspace_member()` com problemas

**Localização:** `supabase/schema.sql` linhas 272-282

```sql
CREATE OR REPLACE FUNCTION public.is_workspace_member(workspace_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.workspace_members
        WHERE workspace_id = workspace_uuid
        AND user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Possíveis Problemas:**
- ❌ **Cache de RLS:** A função pode estar sendo avaliada com dados em cache
- ❌ **Timing:** Se o usuário acabou de ser adicionado ao workspace, pode haver delay
- ❌ **Workspace_id NULL:** Se a tarefa não tem `workspace_id`, a função não será chamada corretamente

**Como verificar:**
```sql
-- Testar a função diretamente
SELECT is_workspace_member('workspace-id-aqui');
SELECT auth.uid(); -- Verificar se o usuário está autenticado
```

### 1.3. Múltiplas políticas RLS conflitantes

**Localização:** `supabase/migrations/20240320108000_rls_policies.sql`

**Problema:** Pode haver políticas duplicadas ou conflitantes que bloqueiam o UPDATE.

**Como verificar:**
```sql
-- Listar todas as políticas RLS na tabela tasks
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'tasks' AND cmd = 'UPDATE';
```

---

## 🔧 2. PROBLEMAS DE TRIGGERS

### 2.1. Trigger `set_updated_at_tasks` interferindo

**Localização:** `supabase/schema.sql` linhas 208-212

```sql
CREATE TRIGGER set_updated_at_tasks
    BEFORE UPDATE ON public.tasks
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
```

**Possíveis Problemas:**
- ✅ O trigger apenas atualiza `updated_at`, não deveria bloquear
- ⚠️ **PROBLEMA POTENCIAL:** Se a função `handle_updated_at()` tiver algum erro, o UPDATE pode falhar silenciosamente

**Como verificar:**
```sql
-- Verificar se o trigger existe e está ativo
SELECT 
    trigger_name,
    event_manipulation,
    action_statement,
    action_timing
FROM information_schema.triggers
WHERE event_object_table = 'tasks';
```

### 2.2. Trigger de validação de subtasks

**Localização:** `supabase/migrations/20251201_validate_subtasks.sql`

**Problema:** Se houver um trigger que valida `subtasks` e falhar, pode bloquear o UPDATE.

**Como verificar:**
```sql
-- Verificar todos os triggers na tabela tasks
SELECT * FROM pg_trigger WHERE tgrelid = 'public.tasks'::regclass;
```

---

## 📊 3. PROBLEMAS DE SCHEMA E CONSTRAINTS

### 3.1. Campo `position` pode ser NULL

**Localização:** `types/database.types.ts` linha 79

```typescript
position: number | null
```

**Problema:**
- Se `position` for `NULL`, a ordenação pode não funcionar corretamente
- O valor padrão é `0`, mas se houver tarefas com `position = NULL`, pode causar problemas

**Como verificar:**
```sql
-- Verificar tarefas com position NULL
SELECT id, title, position, workspace_id 
FROM public.tasks 
WHERE position IS NULL;

-- Verificar se há constraint NOT NULL
SELECT 
    column_name,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'tasks' AND column_name = 'position';
```

### 3.2. Índice em `position` pode estar causando problemas

**Localização:** `supabase/migrations/20240320100000_add_position_to_tasks.sql` linha 18

```sql
CREATE INDEX IF NOT EXISTS idx_tasks_position ON public.tasks(position) WHERE position IS NOT NULL;
```

**Problema:**
- O índice é parcial (WHERE position IS NOT NULL), o que é bom
- Mas se houver muitos valores NULL, pode afetar performance

**Como verificar:**
```sql
-- Verificar estatísticas do índice
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'tasks' AND indexname LIKE '%position%';
```

### 3.3. Tipo de dados `DOUBLE PRECISION` pode ter problemas de precisão

**Localização:** `supabase/schema.sql` linha 60

```sql
position DOUBLE PRECISION DEFAULT 0,
```

**Problema:**
- `DOUBLE PRECISION` pode ter problemas de precisão em operações matemáticas
- Se muitas tarefas tiverem posições muito próximas, pode haver conflitos

**Como verificar:**
```sql
-- Verificar se há posições duplicadas ou muito próximas
SELECT position, COUNT(*) 
FROM public.tasks 
WHERE workspace_id = 'workspace-id-aqui'
GROUP BY position 
HAVING COUNT(*) > 1;
```

---

## 🔄 4. PROBLEMAS NA LÓGICA DE ATUALIZAÇÃO

### 4.1. Função `updateTaskPosition` não está retornando erro

**Localização:** `lib/actions/tasks.ts` linhas 424-462

**Possíveis Problemas:**
- ❌ **Silent failure:** Se o UPDATE não afetar nenhuma linha, retorna `{ success: false }` mas pode não estar logando
- ❌ **RLS bloqueando silenciosamente:** Se RLS bloquear, `data` será `null` mas o erro pode não ser claro
- ❌ **Workspace_id não correspondente:** Se o `workspace_id` da tarefa não corresponder ao esperado, RLS pode bloquear

**Como verificar no código:**
```typescript
// A função já verifica se data é null:
if (!data) {
    return { success: false, error: "Nenhuma linha atualizada (verifique RLS ou workspace_id)" };
}
```

### 4.2. Otimistic UI pode estar mascarando o problema

**Problema:** Se o frontend atualiza a UI antes de confirmar o salvamento, o usuário pode não perceber que a ordem não foi salva.

**Como verificar:**
- Verificar logs do servidor após arrastar uma tarefa
- Verificar se há erros no console do navegador
- Verificar se a requisição está sendo feita corretamente

---

## 🔐 5. PROBLEMAS DE PERMISSÃO E AUTENTICAÇÃO

### 5.1. Usuário não autenticado no momento do UPDATE

**Problema:** Se `auth.uid()` retornar `NULL` durante o UPDATE, todas as políticas RLS falharão.

**Como verificar:**
```sql
-- Verificar se o usuário está autenticado
SELECT auth.uid();
```

### 5.2. Workspace_id da tarefa não corresponde ao esperado

**Problema:** Se a tarefa foi movida para outro workspace ou se o `workspace_id` está incorreto, RLS pode bloquear.

**Como verificar:**
```sql
-- Verificar workspace_id de uma tarefa específica
SELECT id, title, workspace_id, position 
FROM public.tasks 
WHERE id = 'task-id-aqui';
```

---

## 🧪 6. CHECKLIST DE DIAGNÓSTICO

### 6.1. Verificações no Banco de Dados

```sql
-- 1. Verificar se RLS está habilitado
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'tasks';

-- 2. Listar todas as políticas RLS de UPDATE
SELECT policyname, qual, with_check
FROM pg_policies
WHERE tablename = 'tasks' AND cmd = 'UPDATE';

-- 3. Verificar se o usuário é membro do workspace
SELECT is_workspace_member('workspace-id-aqui');

-- 4. Verificar tarefas com position NULL ou 0
SELECT COUNT(*) 
FROM public.tasks 
WHERE position IS NULL OR position = 0;

-- 5. Verificar se há posições duplicadas
SELECT position, COUNT(*) as count
FROM public.tasks
WHERE workspace_id = 'workspace-id-aqui'
GROUP BY position
HAVING COUNT(*) > 1;

-- 6. Testar UPDATE manual (substituir valores)
UPDATE public.tasks
SET position = 999.5
WHERE id = 'task-id-aqui'
RETURNING id, position;
```

### 6.2. Verificações no Código

1. ✅ Verificar se `updateTaskPosition` está sendo chamada corretamente
2. ✅ Verificar se os parâmetros estão sendo passados corretamente
3. ✅ Verificar logs do servidor após arrastar uma tarefa
4. ✅ Verificar se há erros no console do navegador
5. ✅ Verificar se a resposta do servidor indica sucesso ou falha

### 6.3. Verificações de Rede

1. ✅ Verificar se a requisição HTTP está sendo enviada
2. ✅ Verificar o status code da resposta (200, 400, 403, 500)
3. ✅ Verificar o corpo da resposta para mensagens de erro
4. ✅ Verificar se há timeouts ou erros de rede

---

## 🛠️ 7. SOLUÇÕES PROPOSTAS

### 7.1. Adicionar logs detalhados na função `updateTaskPosition`

```typescript
export async function updateTaskPosition(params: UpdateTaskPositionParams) {
    try {
        const supabase = await createServerActionClient();
        const { data: { user } } = await supabase.auth.getUser();
        
        // LOG: Verificar autenticação
        if (!user) {
            console.error("[updateTaskPosition] Usuário não autenticado");
            return { success: false, error: "Usuário não autenticado" };
        }
        
        // LOG: Verificar se a tarefa existe e obter workspace_id
        const { data: currentTask } = await supabase
            .from("tasks")
            .select("id, workspace_id, position")
            .eq("id", params.taskId)
            .single();
        
        if (!currentTask) {
            console.error("[updateTaskPosition] Tarefa não encontrada:", params.taskId);
            return { success: false, error: "Tarefa não encontrada" };
        }
        
        console.log("[updateTaskPosition] Tarefa atual:", currentTask);
        console.log("[updateTaskPosition] Usuário:", user.id);
        console.log("[updateTaskPosition] Novo position:", params.newPosition);
        
        // Preparar objeto de update
        const updates: any = { position: params.newPosition };
        // ... resto do código
```

### 7.2. Criar função SQL para testar UPDATE diretamente

```sql
-- Função para testar UPDATE de position
CREATE OR REPLACE FUNCTION test_update_task_position(
    p_task_id UUID,
    p_new_position DOUBLE PRECISION
)
RETURNS TABLE(
    success BOOLEAN,
    error_message TEXT,
    old_position DOUBLE PRECISION,
    new_position DOUBLE PRECISION
) AS $$
DECLARE
    v_old_position DOUBLE PRECISION;
    v_workspace_id UUID;
    v_is_member BOOLEAN;
BEGIN
    -- Verificar se a tarefa existe
    SELECT position, workspace_id INTO v_old_position, v_workspace_id
    FROM public.tasks
    WHERE id = p_task_id;
    
    IF v_old_position IS NULL THEN
        RETURN QUERY SELECT false, 'Tarefa não encontrada'::TEXT, NULL::DOUBLE PRECISION, NULL::DOUBLE PRECISION;
        RETURN;
    END IF;
    
    -- Verificar se o usuário é membro do workspace
    IF v_workspace_id IS NOT NULL THEN
        SELECT is_workspace_member(v_workspace_id) INTO v_is_member;
        IF NOT v_is_member THEN
            RETURN QUERY SELECT false, 'Usuário não é membro do workspace'::TEXT, v_old_position, NULL::DOUBLE PRECISION;
            RETURN;
        END IF;
    END IF;
    
    -- Tentar fazer o UPDATE
    UPDATE public.tasks
    SET position = p_new_position
    WHERE id = p_task_id;
    
    -- Verificar se foi atualizado
    IF FOUND THEN
        RETURN QUERY SELECT true, NULL::TEXT, v_old_position, p_new_position;
    ELSE
        RETURN QUERY SELECT false, 'UPDATE não afetou nenhuma linha (RLS bloqueou?)'::TEXT, v_old_position, NULL::DOUBLE PRECISION;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 7.3. Adicionar política RLS mais permissiva para UPDATE de position

```sql
-- Política específica para atualizar apenas position
CREATE POLICY "Members can update task position"
    ON public.tasks FOR UPDATE
    USING (
        (workspace_id IS NOT NULL AND is_workspace_member(workspace_id))
        OR
        (workspace_id IS NULL AND is_personal = true AND created_by = auth.uid())
        OR
        assignee_id = auth.uid()
    )
    WITH CHECK (
        -- Permitir UPDATE se apenas position mudou
        (OLD.position IS DISTINCT FROM NEW.position)
        AND
        (
            (workspace_id IS NOT NULL AND is_workspace_member(workspace_id))
            OR
            (workspace_id IS NULL AND is_personal = true AND created_by = auth.uid())
        )
    );
```

---

## 📝 8. PRÓXIMOS PASSOS

1. ✅ Executar verificações do checklist 6.1 no banco de dados
2. ✅ Adicionar logs detalhados na função `updateTaskPosition`
3. ✅ Testar UPDATE manual no banco de dados
4. ✅ Verificar logs do servidor durante um arraste de tarefa
5. ✅ Se necessário, criar política RLS mais específica para position
6. ✅ Verificar se há conflitos de políticas RLS múltiplas

---

## 🔗 Referências

- Schema principal: `supabase/schema.sql`
- Função de atualização: `lib/actions/tasks.ts` (linhas 424-462)
- Políticas RLS: `supabase/schema.sql` (linhas 468-482)
- Funções auxiliares: `supabase/schema.sql` (linhas 272-296)


