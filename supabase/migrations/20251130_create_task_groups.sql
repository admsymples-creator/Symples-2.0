-- Create task_groups table
CREATE TABLE IF NOT EXISTS public.task_groups (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    color TEXT,
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for task_groups
CREATE INDEX IF NOT EXISTS idx_task_groups_workspace_id ON public.task_groups(workspace_id);

-- Add group_id to tasks table
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES public.task_groups(id) ON DELETE SET NULL;

-- Add index for group_id in tasks
CREATE INDEX IF NOT EXISTS idx_tasks_group_id ON public.tasks(group_id);

-- Enable RLS on task_groups
ALTER TABLE public.task_groups ENABLE ROW LEVEL SECURITY;

-- RLS Policies for task_groups (similar to workspaces/tasks)
CREATE POLICY "Users can view task_groups of their workspaces" 
ON public.task_groups FOR SELECT 
USING (
    workspace_id IN (
        SELECT workspace_id FROM public.workspace_members 
        WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can insert task_groups in their workspaces" 
ON public.task_groups FOR INSERT 
WITH CHECK (
    workspace_id IN (
        SELECT workspace_id FROM public.workspace_members 
        WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can update task_groups in their workspaces" 
ON public.task_groups FOR UPDATE 
USING (
    workspace_id IN (
        SELECT workspace_id FROM public.workspace_members 
        WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can delete task_groups in their workspaces" 
ON public.task_groups FOR DELETE 
USING (
    workspace_id IN (
        SELECT workspace_id FROM public.workspace_members 
        WHERE user_id = auth.uid()
    )
);


