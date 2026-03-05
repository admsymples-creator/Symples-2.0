-- Auditoria de Tags vs Clientes
-- Data: 2026-01-20
-- Objetivo: Encontrar tags que são nomes de clientes, indicando vínculo manual

WITH split_tags AS (
    SELECT 
        id as task_id, 
        title as task_title, 
        workspace_id,
        unnest(tags) as tag_name 
    FROM 
        public.tasks
    WHERE 
        tags IS NOT NULL
)
SELECT 
    st.tag_name,
    c.id as client_id,
    c.name as client_name,
    count(st.task_id) as usage_count
FROM 
    split_tags st
JOIN 
    public.clients c ON st.workspace_id = c.workspace_id 
    AND lower(trim(st.tag_name)) = lower(trim(c.name))
GROUP BY 
    st.tag_name, c.id, c.name
ORDER BY 
    usage_count DESC;
