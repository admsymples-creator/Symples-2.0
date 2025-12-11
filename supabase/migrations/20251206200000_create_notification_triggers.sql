-- ============================================
-- MIGRATION: Triggers para Notificações Automáticas
-- ============================================
-- Esta migration cria funções e triggers para gerar notificações
-- automaticamente quando eventos ocorrem no sistema

-- ============================================
-- 1. FUNÇÃO AUXILIAR: Criar Notificação
-- ============================================
-- Função genérica para criar notificações de forma segura
-- IMPORTANTE: Parâmetros com DEFAULT devem estar no final
CREATE OR REPLACE FUNCTION public.create_notification(
    p_recipient_id UUID,
    p_resource_type TEXT,
    p_title TEXT,
    p_triggering_user_id UUID DEFAULT NULL,
    p_category TEXT DEFAULT 'operational',
    p_resource_id UUID DEFAULT NULL,
    p_content TEXT DEFAULT NULL,
    p_action_url TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS UUID AS $$
DECLARE
    v_notification_id UUID;
BEGIN
    INSERT INTO public.notifications (
        recipient_id,
        triggering_user_id,
        category,
        resource_type,
        resource_id,
        title,
        content,
        action_url,
        metadata
    ) VALUES (
        p_recipient_id,
        p_triggering_user_id,
        p_category,
        p_resource_type,
        p_resource_id,
        p_title,
        p_content,
        p_action_url,
        p_metadata
    )
    RETURNING id INTO v_notification_id;
    
    RETURN v_notification_id;
EXCEPTION
    WHEN OTHERS THEN
        -- Log do erro mas não falhar o trigger
        RAISE WARNING 'Erro ao criar notificação: %', SQLERRM;
        RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 2. TRIGGER: Comentários em Tarefas
-- ============================================
-- Notifica o criador da tarefa e o responsável quando alguém comenta
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
    
    -- Determinar tipo de arquivo se for anexo
    v_file_type := NULL;
    IF NEW.type = 'file' OR (NEW.metadata::text LIKE '%file%' OR NEW.metadata::text LIKE '%audio%') THEN
        -- Verificar se é áudio (prioridade)
        IF NEW.metadata::text LIKE '%audio%' OR NEW.content ILIKE '%áudio%' OR NEW.content ILIKE '%audio%' THEN
            v_file_type := 'audio';
        ELSIF NEW.metadata::text LIKE '%image%' OR NEW.content ILIKE '%imagem%' OR NEW.content ILIKE '%image%' THEN
            v_file_type := 'image';
        ELSIF NEW.metadata::text LIKE '%pdf%' OR NEW.content ILIKE '%pdf%' THEN
            v_file_type := 'pdf';
        ELSE
            v_file_type := 'document';
        END IF;
    END IF;
    
    -- Construir metadata
    v_metadata := jsonb_build_object(
        'actor_name', v_commenter_name,
        'file_type', v_file_type,
        'task_title', v_task_title
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

-- Criar trigger
DROP TRIGGER IF EXISTS trigger_notify_task_comment ON public.task_comments;
CREATE TRIGGER trigger_notify_task_comment
    AFTER INSERT ON public.task_comments
    FOR EACH ROW
    WHEN (NEW.type IN ('comment', 'file', 'audio'))
    EXECUTE FUNCTION public.notify_task_comment();

-- ============================================
-- 3. TRIGGER: Anexos de Arquivos
-- ============================================
-- Notifica quando um arquivo é anexado a uma tarefa
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
    
    -- Construir metadata (prioridade para áudio - roxo)
    v_metadata := jsonb_build_object(
        'actor_name', v_uploader_name,
        'file_type', v_file_type,
        'task_title', v_task_title,
        'file_name', NEW.file_name
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
            p_action_url := '/tasks?task=' || NEW.task_id,
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
            p_action_url := '/tasks?task=' || NEW.task_id,
            p_metadata := v_metadata
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar trigger
DROP TRIGGER IF EXISTS trigger_notify_task_attachment ON public.task_attachments;
CREATE TRIGGER trigger_notify_task_attachment
    AFTER INSERT ON public.task_attachments
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_task_attachment();

-- ============================================
-- 4. TRIGGER: Atribuição de Tarefas
-- ============================================
-- Notifica quando uma tarefa é atribuída a alguém
CREATE OR REPLACE FUNCTION public.notify_task_assignment()
RETURNS TRIGGER AS $$
DECLARE
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
    
    -- Buscar nome de quem atribuiu (usuário atual da sessão)
    -- Como não temos acesso direto ao auth.uid() no trigger, vamos usar o updated_at
    -- Na prática, a server action deve passar isso, mas por enquanto vamos usar o criador
    SELECT COALESCE(full_name, email, 'Alguém')
    INTO v_assigner_name
    FROM public.profiles
    WHERE id = NEW.created_by;
    
    v_task_title := COALESCE(NEW.title, 'Tarefa');
    
    -- Construir metadata
    v_metadata := jsonb_build_object(
        'actor_name', v_assigner_name,
        'task_title', v_task_title
    );
    
    -- Notificar o novo responsável (se diferente de quem atribuiu)
    IF NEW.assignee_id != NEW.created_by THEN
        PERFORM public.create_notification(
            p_recipient_id := NEW.assignee_id,
            p_resource_type := 'task',
            p_title := v_assigner_name || ' atribuiu a tarefa "' || v_task_title || '" para você',
            p_triggering_user_id := NEW.created_by,
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

-- Criar trigger
DROP TRIGGER IF EXISTS trigger_notify_task_assignment ON public.tasks;
CREATE TRIGGER trigger_notify_task_assignment
    AFTER UPDATE OF assignee_id ON public.tasks
    FOR EACH ROW
    WHEN (NEW.assignee_id IS DISTINCT FROM OLD.assignee_id AND NEW.assignee_id IS NOT NULL)
    EXECUTE FUNCTION public.notify_task_assignment();

-- ============================================
-- 5. TRIGGER: Convites de Workspace
-- ============================================
-- Notifica quando um convite é criado (notificação interna além do email)
CREATE OR REPLACE FUNCTION public.notify_workspace_invite()
RETURNS TRIGGER AS $$
DECLARE
    v_inviter_name TEXT;
    v_workspace_name TEXT;
    v_workspace_slug TEXT;
    v_user_id UUID;
    v_metadata JSONB;
BEGIN
    -- Buscar nome de quem convidou
    SELECT COALESCE(full_name, email, 'Alguém')
    INTO v_inviter_name
    FROM public.profiles
    WHERE id = NEW.invited_by;
    
    -- Buscar dados do workspace
    SELECT w.name, w.slug
    INTO v_workspace_name, v_workspace_slug
    FROM public.workspaces w
    WHERE w.id = NEW.workspace_id;
    
    IF NOT FOUND THEN
        RETURN NEW;
    END IF;
    
    -- Buscar ID do usuário pelo email (se já existe conta)
    SELECT id INTO v_user_id
    FROM public.profiles
    WHERE email = NEW.email;
    
    -- Se o usuário não existe ainda, não podemos criar notificação
    -- (ele receberá o email e quando criar conta, pode ver o convite)
    IF v_user_id IS NULL THEN
        RETURN NEW;
    END IF;
    
    -- Construir metadata
    v_metadata := jsonb_build_object(
        'actor_name', v_inviter_name,
        'workspace_name', v_workspace_name,
        'role', NEW.role
    );
    
    -- Notificar o usuário convidado
    PERFORM public.create_notification(
        p_recipient_id := v_user_id,
        p_resource_type := 'member',
        p_title := v_inviter_name || ' convidou você para ' || v_workspace_name,
        p_triggering_user_id := NEW.invited_by,
        p_category := 'admin',
        p_resource_id := NEW.id,
        p_content := 'Você foi convidado como ' || NEW.role,
        p_action_url := '/settings?invite=' || NEW.id,
        p_metadata := v_metadata
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar trigger
DROP TRIGGER IF EXISTS trigger_notify_workspace_invite ON public.workspace_invites;
CREATE TRIGGER trigger_notify_workspace_invite
    AFTER INSERT ON public.workspace_invites
    FOR EACH ROW
    WHEN (NEW.status = 'pending')
    EXECUTE FUNCTION public.notify_workspace_invite();

-- ============================================
-- 6. FUNÇÃO: Verificar Tarefas Atrasadas (para Job/Cron)
-- ============================================
-- Esta função pode ser chamada por um job/cron para notificar sobre tarefas atrasadas
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
            p_action_url := '/tasks?task=' || v_task.id,
            p_metadata := v_metadata
        );
        
        v_count := v_count + 1;
    END LOOP;
    
    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- NOTAS IMPORTANTES
-- ============================================
-- 1. Os triggers usam SECURITY DEFINER para ter permissão de criar notificações
-- 2. As funções tratam erros graciosamente para não quebrar as operações principais
-- 3. A função check_overdue_tasks() deve ser chamada por um cron job (ex: pg_cron)
--    Exemplo de agendamento (executar no Supabase SQL Editor):
--    SELECT cron.schedule('check-overdue-tasks', '0 9 * * *', 'SELECT public.check_overdue_tasks();');
--    (Isso executa todo dia às 9h)
-- 4. Os triggers evitam notificar o próprio autor da ação
-- 5. Para tarefas atrasadas, evita notificar múltiplas vezes no mesmo dia

