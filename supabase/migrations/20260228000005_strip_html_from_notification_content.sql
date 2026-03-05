-- ============================================
-- MIGRATION: Remover tags HTML do conteúdo de notificações
-- ============================================
-- Problema: triggers salvavam HTML do editor TipTap (ex: <p>, <br>) no campo content
-- das notificações, resultando em tags visíveis na UI.
-- Correção: usar regexp_replace para strip de HTML antes de salvar.

-- 1. Função helper reutilizável para strip de HTML
CREATE OR REPLACE FUNCTION public.strip_html_tags(html TEXT)
RETURNS TEXT AS $$
BEGIN
  IF html IS NULL OR html = '' THEN
    RETURN '';
  END IF;
  -- Substituir <br> e fechamento de bloco por espaço
  html := regexp_replace(html, '<br\s*/?>', ' ', 'gi');
  html := regexp_replace(html, '</(?:p|div|li|h[1-6])>', ' ', 'gi');
  -- Remover todas as tags restantes
  html := regexp_replace(html, '<[^>]*>', '', 'g');
  -- Decodificar entidades comuns
  html := replace(html, '&nbsp;', ' ');
  html := replace(html, '&amp;', '&');
  html := replace(html, '&lt;', '<');
  html := replace(html, '&gt;', '>');
  html := replace(html, '&quot;', '"');
  html := replace(html, '&#39;', '''');
  -- Colapsar espaços múltiplos
  html := regexp_replace(html, '\s+', ' ', 'g');
  RETURN trim(html);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 2. Atualizar notify_task_comment para strip de HTML
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
    SELECT t.title, t.created_by, t.assignee_id, t.workspace_id
    INTO v_task
    FROM public.tasks t
    WHERE t.id = NEW.task_id;

    IF NOT FOUND THEN
        RETURN NEW;
    END IF;

    SELECT COALESCE(full_name, email, 'Alguém')
    INTO v_commenter_name
    FROM public.profiles
    WHERE id = NEW.user_id;

    v_task_title := COALESCE(v_task.title, 'Tarefa');
    v_comment_preview := LEFT(public.strip_html_tags(NEW.content), 100);

    v_file_type := NEW.metadata->>'file_type';

    v_metadata := jsonb_build_object(
        'actor_name', v_commenter_name,
        'file_type', v_file_type,
        'task_title', v_task_title,
        'workspace_id', v_task.workspace_id
    );

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

-- 3. Atualizar notify_task_assignment para strip de HTML na description
CREATE OR REPLACE FUNCTION public.notify_task_assignment()
RETURNS TRIGGER AS $$
DECLARE
    v_assigner_id UUID;
    v_assigner_name TEXT;
    v_task_title TEXT;
    v_metadata JSONB;
BEGIN
    IF NEW.assignee_id IS NULL THEN
        RETURN NEW;
    END IF;

    IF OLD.assignee_id = NEW.assignee_id THEN
        RETURN NEW;
    END IF;

    v_assigner_id := COALESCE(NEW.updated_by, NEW.created_by);

    SELECT COALESCE(full_name, email, 'Alguém')
    INTO v_assigner_name
    FROM public.profiles
    WHERE id = v_assigner_id;

    v_task_title := COALESCE(NEW.title, 'Tarefa');

    v_metadata := jsonb_build_object(
        'actor_name', v_assigner_name,
        'task_title', v_task_title
    );

    IF NEW.assignee_id != v_assigner_id THEN
        PERFORM public.create_notification(
            p_recipient_id := NEW.assignee_id,
            p_resource_type := 'task',
            p_title := v_assigner_name || ' atribuiu a tarefa "' || v_task_title || '" para você',
            p_triggering_user_id := v_assigner_id,
            p_category := 'operational',
            p_resource_id := NEW.id,
            p_content := LEFT(public.strip_html_tags(COALESCE(NEW.description, '')), 200),
            p_action_url := '/tasks?task=' || NEW.id,
            p_metadata := v_metadata
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
