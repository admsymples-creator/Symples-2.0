-- ============================================
-- MIGRATION: Corrigir trigger de atribuição de tarefas
-- ============================================
-- Bug 5: trigger_notify_task_assignment usava NEW.created_by como "quem atribuiu",
-- mas o criador original da tarefa pode ser diferente do usuário que fez a atribuição.
-- Solução: adicionar coluna updated_by; server action popula; trigger usa COALESCE.

-- 1. Adicionar coluna updated_by à tabela tasks
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2. Recriar a função do trigger com a lógica correta
CREATE OR REPLACE FUNCTION public.notify_task_assignment()
RETURNS TRIGGER AS $$
DECLARE
    v_assigner_id UUID;
    v_assigner_name TEXT;
    v_task_title TEXT;
    v_metadata JSONB;
BEGIN
    -- Só notificar se assignee_id mudou de NULL para um valor, ou mudou de um valor para outro
    IF NEW.assignee_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- Se não mudou, não notificar
    IF OLD.assignee_id = NEW.assignee_id THEN
        RETURN NEW;
    END IF;

    -- Usar updated_by (quem realmente fez a atribuição) com fallback para created_by
    v_assigner_id := COALESCE(NEW.updated_by, NEW.created_by);

    -- Buscar nome de quem atribuiu
    SELECT COALESCE(full_name, email, 'Alguém')
    INTO v_assigner_name
    FROM public.profiles
    WHERE id = v_assigner_id;

    v_task_title := COALESCE(NEW.title, 'Tarefa');

    -- Construir metadata
    v_metadata := jsonb_build_object(
        'actor_name', v_assigner_name,
        'task_title', v_task_title
    );

    -- Notificar o novo responsável (se diferente de quem atribuiu)
    IF NEW.assignee_id != v_assigner_id THEN
        PERFORM public.create_notification(
            p_recipient_id := NEW.assignee_id,
            p_resource_type := 'task',
            p_title := v_assigner_name || ' atribuiu a tarefa "' || v_task_title || '" para você',
            p_triggering_user_id := v_assigner_id,
            p_category := 'operational',
            p_resource_id := NEW.id,
            p_content := COALESCE(NEW.description, ''),
            p_action_url := '/tasks?task=' || NEW.id,
            p_metadata := v_metadata
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recriar trigger (sem alteração na condição WHEN)
DROP TRIGGER IF EXISTS trigger_notify_task_assignment ON public.tasks;
CREATE TRIGGER trigger_notify_task_assignment
    AFTER UPDATE OF assignee_id ON public.tasks
    FOR EACH ROW
    WHEN (NEW.assignee_id IS DISTINCT FROM OLD.assignee_id AND NEW.assignee_id IS NOT NULL)
    EXECUTE FUNCTION public.notify_task_assignment();
