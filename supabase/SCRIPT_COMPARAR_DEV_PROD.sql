-- ============================================
-- SCRIPT DE COMPARAÇÃO - DEV vs PROD
-- Execute este script em ambos os ambientes e compare os resultados
-- ============================================

-- 1. RESUMO GERAL
SELECT 
    'RESUMO GERAL' as categoria,
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE') as total_tabelas,
    (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public') as total_policies,
    (SELECT COUNT(*) FROM information_schema.triggers WHERE trigger_schema = 'public') as total_triggers,
    (SELECT COUNT(*) FROM information_schema.routines WHERE routine_schema = 'public' AND routine_type = 'FUNCTION') as total_funcoes,
    (SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public') as total_indices;

-- 2. LISTA DE TABELAS
SELECT 
    'TABELAS' as categoria,
    table_name as nome,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name AND table_schema = 'public') as colunas
FROM information_schema.tables t
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- 3. RLS STATUS
SELECT 
    'RLS STATUS' as categoria,
    tablename as nome,
    CASE WHEN rowsecurity THEN 'HABILITADO' ELSE 'DESABILITADO' END as status
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;

-- 4. POLICIES RLS
SELECT 
    'POLICIES' as categoria,
    tablename as tabela,
    policyname as policy,
    cmd as operacao
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 5. TRIGGERS
SELECT 
    'TRIGGERS' as categoria,
    event_object_table as tabela,
    trigger_name as trigger
FROM information_schema.triggers 
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- 6. FUNÇÕES
SELECT 
    'FUNÇÕES' as categoria,
    routine_name as nome
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_type = 'FUNCTION'
ORDER BY routine_name;

-- 7. ÍNDICES
SELECT 
    'ÍNDICES' as categoria,
    tablename as tabela,
    indexname as indice
FROM pg_indexes 
WHERE schemaname = 'public' 
ORDER BY tablename, indexname;

-- 8. EXTENSÕES
SELECT 
    'EXTENSÕES' as categoria,
    extname as nome,
    extversion as versao
FROM pg_extension
ORDER BY extname;

-- 9. ESTRUTURA DAS TABELAS (Detalhado)
-- Descomente se quiser ver estrutura completa de cada tabela:
/*
SELECT 
    'ESTRUTURA TABELAS' as categoria,
    table_name as tabela,
    column_name as coluna,
    data_type as tipo,
    is_nullable as nullable,
    column_default as default_value
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;
*/

