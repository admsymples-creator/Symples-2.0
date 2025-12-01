-- Criar função para garantir estrutura correta de subtasks
CREATE OR REPLACE FUNCTION validate_subtasks_structure()
RETURNS TRIGGER AS $$
BEGIN
    -- Se subtasks for null, define como array vazio
    IF NEW.subtasks IS NULL THEN
        NEW.subtasks := '[]'::jsonb;
    END IF;
    
    -- Se não for um array json, lança erro (opcional, mas recomendado)
    IF jsonb_typeof(NEW.subtasks) != 'array' THEN
        RAISE EXCEPTION 'subtasks must be a JSON array';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para validação (opcional, se quiser forçar integridade)
DROP TRIGGER IF EXISTS ensure_subtasks_structure ON public.tasks;
CREATE TRIGGER ensure_subtasks_structure
BEFORE INSERT OR UPDATE ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION validate_subtasks_structure();

