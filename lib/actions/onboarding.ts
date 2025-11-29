'use server'

import { createServerActionClient } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'

export async function createWorkspace(formData: FormData) {
  const supabase = await createServerActionClient()

  // 1. Autenticação
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Usuário não autenticado' }
  }

  // 2. Dados do formulário
  const name = formData.get('name') as string
  const segment = formData.get('segment') as string // Se a tabela tiver coluna segment, podemos usar

  if (!name) {
    return { error: 'Nome da empresa é obrigatório' }
  }

  // 3. Gerar Magic Code (#START-XXXX) e Slug
  const randomCode = Math.floor(1000 + Math.random() * 9000)
  const magicCode = `#START-${randomCode}`
  
  // Gerar slug a partir do nome
  const slug = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^a-z0-9]+/g, '-') // Substitui não-alphanumérico por hífen
    .replace(/^-+|-+$/g, '') // Remove hífens do início/fim
    + '-' + randomCode // Sufixo para unicidade

  // 4. Insert (Supabase)
  // Inserir Workspace
  const { data: workspace, error: workspaceError } = await supabase
    .from('workspaces')
    .insert({
      name,
      owner_id: user.id,
      magic_code: magicCode,
      slug,
      // segment: segment 
    })
    .select()
    .single()

  if (workspaceError) {
    console.error('Erro ao criar workspace:', workspaceError)
    if (workspaceError.code === '42501') {
      return { error: 'Erro de permissão: RLS policies não configuradas no Supabase. Execute o script SQL fornecido.' }
    }
    return { error: `Erro (${workspaceError.code}): ${workspaceError.message}` }
  }

  // Tentar garantir que o membro foi adicionado (caso a trigger falhe ou demore)
  // Usamos upsert com ignoreDuplicates para não falhar se a trigger já tiver funcionado
  const { error: memberError } = await supabase
    .from('workspace_members')
    .upsert(
      {
        workspace_id: workspace.id,
        user_id: user.id,
        role: 'owner',
      },
      { onConflict: 'workspace_id, user_id', ignoreDuplicates: true }
    )

  if (memberError) {
    console.error('Erro ao garantir membro:', memberError)
    // Não retornamos erro aqui para não travar o fluxo, já que o workspace foi criado
  }

  // Revalidar o layout principal para atualizar a lista de workspaces
  revalidatePath('/', 'layout')

  // 5. Retorno
  return {
    success: true,
    workspaceId: workspace.id,
    magicCode,
  }
}

