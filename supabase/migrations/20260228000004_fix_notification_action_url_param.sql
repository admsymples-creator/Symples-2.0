-- ============================================
-- MIGRATION: Corrigir parâmetro action_url em notificações (?task= → ?taskId=)
-- ============================================
-- Bug: Todos os triggers geravam action_url com ?task=UUID
-- mas o tasks-page-client.tsx lê searchParams.get("taskId").
-- A página /tasks/page.tsx também foi corrigida no código para
-- fazer o mapping, mas as novas notificações devem usar ?taskId= diretamente.
--
-- Também atualiza notificações históricas no banco.

-- ============================================
-- 1. Atualizar notificações históricas
-- ============================================
UPDATE public.notifications
SET action_url = REGEXP_REPLACE(action_url, '\?task=', '?taskId=')
WHERE action_url LIKE '%?task=%'
  AND action_url NOT LIKE '%?taskId=%';

-- ============================================
-- 2. Recriar notify_task_comment() com ?taskId=
-- ============================================
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
            p_action_url := '/tasks?taskId=' || NEW.task_id,
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
            p_action_url := '/tasks?taskId=' || NEW.task_id,
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

-- ============================================
-- 3. Recriar notify_task_attachment() com ?taskId=
-- ============================================
CREATE OR REPLACE FUNCTION public.notify_task_attachment()
RETURNS TRIGGER AS $$
DECLARE
    v_task RECORD;
    v_uploader_name TEXT;
    v_task_title TEXT;
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

    -- Buscar nome do uploader
    SELECT COALESCE(full_name, email, 'Alguém')
    INTO v_uploader_name
    FROM public.profiles
    WHERE id = NEW.uploader_id;

    v_task_title := COALESCE(v_task.title, 'Tarefa');

    -- Determinar tipo de arquivo
    v_file_type := 'other';
    IF NEW.file_type IS NOT NULL THEN
        IF NEW.file_type ILIKE '%audio%' OR NEW.file_type ILIKE '%ogg%' OR NEW.file_type ILIKE '%wav%' OR NEW.file_type ILIKE '%mp3%' THEN
            v_file_type := 'audio';
        ELSIF NEW.file_type ILIKE '%image%' OR NEW.file_type ILIKE '%jpg%' OR NEW.file_type ILIKE '%png%' OR NEW.file_type ILIKE '%gif%' THEN
            v_file_type := 'image';
        ELSIF NEW.file_type ILIKE '%pdf%' THEN
            v_file_type := 'pdf';
        ELSE
            v_file_type := 'document';
        END IF;
    END IF;

    -- Construir metadata
    v_metadata := jsonb_build_object(
        'actor_name', v_uploader_name,
        'file_type', v_file_type,
        'task_title', v_task_title,
        'file_name', NEW.file_name,
        'workspace_id', v_task.workspace_id
    );

    IF v_file_type = 'audio' THEN
        v_metadata := v_metadata || jsonb_build_object(
            'color', 'text-purple-600',
            'bg', 'bg-purple-50'
        );
    END IF;

    -- Não notificar o próprio uploader
    -- Notificar criador da tarefa (se diferente do uploader)
    IF v_task.created_by IS NOT NULL AND v_task.created_by != NEW.uploader_id THEN
        PERFORM public.create_notification(
            p_recipient_id := v_task.created_by,
            p_resource_type := 'attachment',
            p_title := v_uploader_name || ' anexou um arquivo em ' || v_task_title,
            p_triggering_user_id := NEW.uploader_id,
            p_category := 'operational',
            p_resource_id := NEW.id,
            p_content := NEW.file_name,
            p_action_url := '/tasks?taskId=' || NEW.task_id,
            p_metadata := v_metadata
        );
    END IF;

    -- Notificar responsável (se diferente do uploader e do criador)
    IF v_task.assignee_id IS NOT NULL
       AND v_task.assignee_id != NEW.uploader_id
       AND v_task.assignee_id != v_task.created_by THEN
        PERFORM public.create_notification(
            p_recipient_id := v_task.assignee_id,
            p_resource_type := 'attachment',
            p_title := v_uploader_name || ' anexou um arquivo em ' || v_task_title,
            p_triggering_user_id := NEW.uploader_id,
            p_category := 'operational',
            p_resource_id := NEW.id,
            p_content := NEW.file_name,
            p_action_url := '/tasks?taskId=' || NEW.task_id,
            p_metadata := v_metadata
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recriar trigger
DROP TRIGGER IF EXISTS trigger_notify_task_attachment ON public.task_attachments;
CREATE TRIGGER trigger_notify_task_attachment
    AFTER INSERT ON public.task_attachments
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_task_attachment();

-- ============================================
-- 4. Recriar notify_task_assignment() com ?taskId=
-- ============================================
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
        'task_title', v_task_title,
        'workspace_id', NEW.workspace_id
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
            p_action_url := '/tasks?taskId=' || NEW.id,
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

-- ============================================
-- 5. Recriar check_overdue_tasks() com ?taskId=
-- ============================================
CREATE OR REPLACE FUNCTION public.check_overdue_tasks()
RETURNS INTEGER AS $$
DECLARE
    v_task RECORD;
    v_count INTEGER := 0;
    v_metadata JSONB;
BEGIN
    -- Buscar tarefas atrasadas (due_date < hoje e status não é 'done' ou 'archived')
    FOR v_task IN
        SELECT t.id, t.title, t.assignee_id, t.created_by, t.due_date
        FROM public.tasks t
        WHERE t.due_date < NOW()
          AND t.status NOT IN ('done', 'archived')
          AND t.assignee_id IS NOT NULL
          -- Não notificar se já notificamos hoje (evitar spam)
          AND NOT EXISTS (
              SELECT 1 FROM public.notifications n
              WHERE n.recipient_id = t.assignee_id
                AND n.resource_type = 'task'
                AND n.resource_id = t.id
                AND n.category = 'system'
                AND n.title LIKE '%atrasada%'
                AND n.created_at > NOW() - INTERVAL '1 day'
          )
    LOOP
        v_metadata := jsonb_build_object(
            'task_title', v_task.title,
            'days_overdue', EXTRACT(DAY FROM NOW() - v_task.due_date)::INTEGER
        );

        -- Notificar o responsável
        PERFORM public.create_notification(
            p_recipient_id := v_task.assignee_id,
            p_resource_type := 'task',
            p_title := 'Tarefa "' || v_task.title || '" está atrasada',
            p_triggering_user_id := NULL,
            p_category := 'system',
            p_resource_id := v_task.id,
            p_content := 'A tarefa está atrasada há ' ||
                        EXTRACT(DAY FROM NOW() - v_task.due_date)::INTEGER ||
                        ' dia(s)',
            p_action_url := '/tasks?taskId=' || v_task.id,
            p_metadata := v_metadata
        );

        v_count := v_count + 1;
    END LOOP;

    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
