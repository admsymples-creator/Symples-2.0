-- ============================================
-- SCRIPT DE VALIDAÇÃO - SUPABASE PROD
-- Execute este script para verificar se tudo está configurado corretamente
-- ============================================

-- 1. Verificar tabelas criadas
SELECT 
    'Tabelas criadas' as verificação,
    COUNT(*) as total,
    string_agg(table_name, ', ' ORDER BY table_name) as tabelas
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE';

-- 2. Listar todas as tabelas
SELECT 
    'Lista de tabelas' as verificação,
    table_name,
    (SELECT COUNT(*) 
     FROM information_schema.columns 
     WHERE table_name = t.table_name 
     AND table_schema = 'public') as colunas
FROM information_schema.tables t
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- 3. Verificar RLS habilitado
SELECT 
    'RLS habilitado' as verificação,
    tablename,
    CASE WHEN rowsecurity THEN '✅ SIM' ELSE '❌ NÃO' END as rls_status
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;

-- 4. Contar policies RLS
SELECT 
    'Policies RLS' as verificação,
    tablename,
    COUNT(*) as total_policies,
    string_agg(policyname, ', ' ORDER BY policyname) as policies
FROM pg_policies 
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

-- 5. Verificar triggers criados
SELECT 
    'Triggers' as verificação,
    event_object_table as tabela,
    trigger_name,
    event_manipulation as evento
FROM information_schema.triggers 
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- 6. Verificar funções criadas
SELECT 
    'Funções' as verificação,
    routine_name as nome_funcao,
    routine_type as tipo
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_type = 'FUNCTION'
ORDER BY routine_name;

-- 7. Verificar extensões habilitadas
SELECT 
    'Extensões' as verificação,
    extname as extensão,
    extversion as versão
FROM pg_extension
ORDER BY extname;

-- 8. Verificar índices criados
SELECT 
    'Índices' as verificação,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'public' 
ORDER BY tablename, indexname;

-- 9. Resumo final
SELECT 
    'RESUMO FINAL' as seção,
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE') as total_tabelas,
    (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public') as total_policies,
    (SELECT COUNT(*) FROM information_schema.triggers WHERE trigger_schema = 'public') as total_triggers,
    (SELECT COUNT(*) FROM information_schema.routines WHERE routine_schema = 'public' AND routine_type = 'FUNCTION') as total_funcoes,
    (SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public') as total_indices;

-- 10. Verificar se há dados nas tabelas (opcional - só se quiser ver estatísticas)
-- Descomente se quiser ver contagens de registros:
/*
SELECT 
    'Contagem de registros' as verificação,
    'profiles' as tabela,
    COUNT(*) as total
FROM profiles
UNION ALL
SELECT 
    'Contagem de registros',
    'workspaces',
    COUNT(*)
FROM workspaces
UNION ALL
SELECT 
    'Contagem de registros',
    'workspace_members',
    COUNT(*)
FROM workspace_members
UNION ALL
SELECT 
    'Contagem de registros',
    'tasks',
    COUNT(*)
FROM tasks
UNION ALL
SELECT 
    'Contagem de registros',
    'transactions',
    COUNT(*)
FROM transactions;
*/

