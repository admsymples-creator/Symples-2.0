-- ============================================
-- MIGRATION: Corrigir detecção de tipo de arquivo em comentários
-- ============================================
-- Bug 10: notify_task_comment() usava `NEW.metadata::text LIKE '%audio%'`
-- que pode causar falsos positivos (ex: nome de tarefa contendo "audio").
-- Correção: usar NEW.metadata->>'file_type' (campo estruturado).
--
-- Também corrigido: workspace_id ausente no metadata das notificações de comentário.

CREATE OR REPLACE FUNCTION public.notify_task_comment()
RETURNS TRIGGER AS $$
DECLARE
    v_task RECORD;
    v_commenter_name TEXT;
    v_task_title TEXT;
    v_comment_preview TEXT;
    v_file_type TEXT;
    v_metadata JSONB;
BEGIN
    -- Buscar dados da tarefa
    SELECT t.title, t.created_by, t.assignee_id, t.workspace_id
    INTO v_task
    FROM public.tasks t
    WHERE t.id = NEW.task_id;

    IF NOT FOUND THEN
        RETURN NEW;
    END IF;

    -- Buscar nome do comentarista
    SELECT COALESCE(full_name, email, 'Alguém')
    INTO v_commenter_name
    FROM public.profiles
    WHERE id = NEW.user_id;

    v_task_title := COALESCE(v_task.title, 'Tarefa');
    v_comment_preview := LEFT(NEW.content, 100);

    -- Determinar tipo de arquivo usando o campo estruturado metadata->>'file_type'
    -- (em vez de text matching frágil sobre o JSON serializado)
    v_file_type := NEW.metadata->>'file_type';

    -- Construir metadata incluindo workspace_id
    v_metadata := jsonb_build_object(
        'actor_name', v_commenter_name,
        'file_type', v_file_type,
        'task_title', v_task_title,
        'workspace_id', v_task.workspace_id
    );

    -- Não notificar o próprio autor do comentário
    -- Notificar criador da tarefa (se diferente do comentarista)
    IF v_task.created_by IS NOT NULL AND v_task.created_by != NEW.user_id THEN
        PERFORM public.create_notification(
            p_recipient_id := v_task.created_by,
            p_resource_type := 'task',
            p_title := v_commenter_name || ' comentou em ' || v_task_title,
            p_triggering_user_id := NEW.user_id,
            p_category := 'operational',
            p_resource_id := NEW.task_id,
            p_content := v_comment_preview,
            p_action_url := '/tasks?task=' || NEW.task_id,
            p_metadata := v_metadata
        );
    END IF;

    -- Notificar responsável (se diferente do comentarista e do criador)
    IF v_task.assignee_id IS NOT NULL
       AND v_task.assignee_id != NEW.user_id
       AND v_task.assignee_id != v_task.created_by THEN
        PERFORM public.create_notification(
            p_recipient_id := v_task.assignee_id,
            p_resource_type := 'task',
            p_title := v_commenter_name || ' comentou em ' || v_task_title,
            p_triggering_user_id := NEW.user_id,
            p_category := 'operational',
            p_resource_id := NEW.task_id,
            p_content := v_comment_preview,
            p_action_url := '/tasks?task=' || NEW.task_id,
            p_metadata := v_metadata
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recriar trigger (mesma condição WHEN)
DROP TRIGGER IF EXISTS trigger_notify_task_comment ON public.task_comments;
CREATE TRIGGER trigger_notify_task_comment
    AFTER INSERT ON public.task_comments
    FOR EACH ROW
    WHEN (NEW.type IN ('comment', 'file', 'audio'))
    EXECUTE FUNCTION public.notify_task_comment();
