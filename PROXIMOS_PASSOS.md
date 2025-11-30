# 🎯 PRÓXIMOS PASSOS - SYMPLES v2

## ✅ CONCLUÍDO

1. ✅ **Schema SQL Completo** (`supabase/schema.sql`)
   - Todas as tabelas criadas (profiles, workspaces, tasks, etc.)
   - RLS Policies implementadas
   - Triggers e funções auxiliares

2. ✅ **Tipos TypeScript** (`types/database.types.ts`)
   - Tipos completos baseados no schema
   - Type safety para todas as tabelas

3. ✅ **Cliente Supabase** (`lib/supabase.ts`)
   - Clientes separados para browser e server
   - Funções auxiliares configuradas

---

## 🔄 PRÓXIMOS PASSOS (Em Ordem)

### 1. **Executar o Schema no Supabase** ⚠️ CRÍTICO

**Ação:**
1. Acesse o [Supabase Dashboard](https://app.supabase.com)
2. Vá em **SQL Editor**
3. Copie o conteúdo de `supabase/schema.sql`
4. Execute o script completo
5. Verifique se todas as tabelas foram criadas na aba **Table Editor**

**Validação:**
- ✅ Todas as tabelas aparecem na lista
- ✅ RLS está habilitado (ícone de escudo)
- ✅ Teste criar um usuário e verificar se o trigger cria o profile automaticamente

---

### 2. **Melhorar Server Actions para Tasks** 🔧

**Arquivo:** `app/actions/tasks.ts`

**Implementar:**
- [ ] `createTask()` - ✅ Já existe, mas precisa de autenticação
- [ ] `updateTask()` - Atualizar tarefa
- [ ] `deleteTask()` - Deletar tarefa
- [ ] `getTasks()` - Listar tarefas (com filtros)
- [ ] `getTaskById()` - Buscar tarefa específica

**Melhorias necessárias:**
- Passar `created_by` automaticamente do usuário autenticado
- Validar permissões RLS
- Melhorar tratamento de erros

---

### 3. **Criar Server Actions para Workspaces** 📦

**Criar:** `app/actions/workspaces.ts`

**Implementar:**
- [ ] `createWorkspace()` - Criar workspace
- [ ] `getUserWorkspaces()` - Listar workspaces do usuário
- [ ] `getWorkspaceById()` - Buscar workspace
- [ ] `updateWorkspace()` - Atualizar workspace
- [ ] `generateMagicCode()` - Gerar código mágico para WhatsApp

---

### 4. **Criar Server Actions para Profiles** 👤

**Criar:** `app/actions/profiles.ts`

**Implementar:**
- [ ] `getCurrentProfile()` - Buscar perfil do usuário logado
- [ ] `updateProfile()` - Atualizar perfil
- [ ] `getProfileById()` - Buscar perfil por ID

---

### 5. **Atualizar Componentes para Usar Dados Reais** 🎨

**Páginas a atualizar:**
- [ ] `app/(main)/home/page.tsx` - Buscar tarefas reais do Supabase
- [ ] `app/(main)/tasks/page.tsx` - Integrar com Server Actions
- [ ] `components/home/TaskRow.tsx` - Usar dados reais

**Implementar:**
- Fetch de dados em Server Components
- Integração com Server Actions para mutações
- Loading states e error handling

---

### 6. **Configurar Autenticação Completa** 🔐

**Implementar:**
- [ ] Login funcional (usando Supabase Auth)
- [ ] Sign up funcional
- [ ] Middleware de autenticação para rotas protegidas
- [ ] Redirect automático se não autenticado

**Arquivos:**
- `app/(auth)/login/page.tsx`
- `middleware.ts` (criar)
- `app/(main)/layout.tsx` - Adicionar verificação de auth

---

### 7. **Melhorar Onboarding** 🚀

**Arquivo:** `app/(auth)/onboarding/page.tsx`

**Implementar:**
- [ ] Criar workspace no passo 2
- [ ] Gerar `magic_code` automaticamente
- [ ] Salvar no banco de dados
- [ ] Exibir link WhatsApp com o código

---

### 8. **Webhook n8n (Opcional - Fase 2)** 🔗

**Arquivo:** `app/api/webhooks/n8n/route.ts`

**Implementar:**
- [ ] Receber mensagens do n8n
- [ ] Processar e criar tarefas/transações
- [ ] Autenticação via header/secreto
- [ ] Validação de payload

---

## 📋 CHECKLIST DE CONFIGURAÇÃO

### Variáveis de Ambiente

Crie `.env.local` com:

```env
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_anon_key
```

### Dependências Necessárias

Se precisar de autenticação SSR no futuro:

```bash
npm install @supabase/ssr
```

---

## 🐛 DEPENDÊNCIAS IMPORTANTES

As próximas implementações dependem de:

1. **Schema executado no Supabase** - Sem isso, nada funcionará
2. **Autenticação configurada** - Necessária para RLS funcionar
3. **Server Actions com auth** - Para criar dados do usuário logado

---

## 🎯 ORDEM RECOMENDADA DE IMPLEMENTAÇÃO

1. ✅ **Executar schema no Supabase** (5 min)
2. **Configurar autenticação** (30 min)
3. **Melhorar Server Actions de Tasks** (1h)
4. **Atualizar componente Home para usar dados reais** (1h)
5. **Criar Server Actions de Workspaces** (30 min)
6. **Implementar onboarding completo** (1h)

**Tempo estimado total:** ~4 horas

---

## 💡 DICAS

- Use **Server Components** para buscar dados (mais rápido)
- Use **Server Actions** para mutações (inserir/atualizar/deletar)
- Sempre valide permissões no lado do servidor
- Use TypeScript types do `database.types.ts` para type safety
- Teste as RLS policies manualmente no Supabase antes de integrar

---

## 📚 RECURSOS ÚTEIS

- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- [Supabase RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Next.js Server Actions](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations)
- [Supabase Client Library](https://supabase.com/docs/reference/javascript/introduction)

---

**Última atualização:** Agora
**Status:** Pronto para começar implementação funcional




