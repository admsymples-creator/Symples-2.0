# 🔄 SINCRONIZAR DEV E PROD - Guia Completo

## 🎯 OBJETIVO

Garantir que os bancos de dados **DEV** e **PROD** tenham exatamente as mesmas tabelas, estrutura e configurações.

---

## ✅ PROCESSO DE SINCRONIZAÇÃO

### Opção 1: Executar o Schema.sql em Ambos (Recomendado)

#### Para DEV:
1. Acesse: https://app.supabase.com
2. Selecione projeto **DEV/PREVIEW**
3. **SQL Editor** → **New Query**
4. Copie TODO o conteúdo de `supabase/schema.sql`
5. Cole e execute
6. Verifique se todas as tabelas foram criadas

#### Para PROD:
1. Acesse: https://app.supabase.com
2. Selecione projeto **PRODUCTION**
3. **SQL Editor** → **New Query**
4. Copie TODO o conteúdo de `supabase/schema.sql` (MESMO ARQUIVO)
5. Cole e execute
6. Verifique se todas as tabelas foram criadas

---

### Opção 2: Script de Validação Comparativa

Execute o script `supabase/SCRIPT_COMPARAR_DEV_PROD.sql` em ambos os ambientes e compare os resultados.

---

## 📋 CHECKLIST DE SINCRONIZAÇÃO

### Tabelas (Devem ser idênticas)
- [ ] `profiles`
- [ ] `workspaces`
- [ ] `workspace_members`
- [ ] `tasks`
- [ ] `task_attachments`
- [ ] `task_comments`
- [ ] `transactions`
- [ ] `workspace_invites`
- [ ] `audit_logs`

### Configurações (Devem ser idênticas)
- [ ] RLS habilitado em todas as tabelas
- [ ] Mesmas policies RLS
- [ ] Mesmos triggers
- [ ] Mesmas funções
- [ ] Mesmos índices
- [ ] Mesmas extensões

---

## 🔍 SCRIPT DE VALIDAÇÃO

Execute `supabase/SCRIPT_COMPARAR_DEV_PROD.sql` em ambos os ambientes e compare:

**Dev:** Copie os resultados e salve em um arquivo  
**Prod:** Copie os resultados e salve em outro arquivo  
**Compare:** Os valores devem ser idênticos

---

## 🚨 PROCESSO DE MUDANÇAS

Quando precisar fazer uma mudança no schema:

### 1. Fazer mudança no `schema.sql`
Edite o arquivo `supabase/schema.sql` localmente.

### 2. Executar em DEV primeiro
- Teste a mudança no DEV
- Valide que funciona

### 3. Executar em PROD
- Após validar em DEV, execute no PROD
- Use o mesmo `schema.sql`

### 4. Documentar
Se a mudança for significativa, considere criar uma migration em `supabase/migrations/`

---

## 🔧 AUTOMATIZAÇÃO (Futuro)

Para automatizar isso no futuro, você pode:

1. **Usar Supabase CLI:**
   ```bash
   # Linkar ambos os projetos
   supabase link --project-ref dev-ref
   supabase db push
   
   supabase link --project-ref prod-ref
   supabase db push
   ```

2. **Criar migrações organizadas:**
   - Cada mudança vira uma migration
   - Executa migrations em ordem nos dois ambientes

---

## 📝 NOTAS IMPORTANTES

- ⚠️ **Sempre execute o schema.sql em DEV primeiro** para testar
- ⚠️ **Nunca faça mudanças diretas no PROD** sem testar em DEV
- ⚠️ **Use o mesmo arquivo `schema.sql`** para ambos os ambientes
- ✅ **Valide sempre** após executar mudanças

---

## 🎯 PRÓXIMOS PASSOS

1. Execute o `schema.sql` em DEV (se ainda não fez)
2. Execute o `schema.sql` em PROD (já feito ✅)
3. Execute o script de comparação em ambos
4. Compare os resultados
5. Se houver diferenças, ajuste o que estiver diferente

---

**Status:** Pronto para sincronização

