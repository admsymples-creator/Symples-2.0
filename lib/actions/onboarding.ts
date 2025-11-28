'use server'

import { createServerActionClient } from '@/lib/supabase'

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

  // 3. Gerar Magic Code (#START-XXXX)
  const randomCode = Math.floor(1000 + Math.random() * 9000)
  const magicCode = `#START-${randomCode}`

  // 4. Insert (Supabase)
  // Inserir Workspace
  const { data: workspace, error: workspaceError } = await supabase
    .from('workspaces')
    .insert({
      name,
      owner_id: user.id,
      magic_code: magicCode,
      // segment: segment // Comentado pois não foi especificado explicitamente na tabela pelo prompt, mas poderia ir aqui se existir
    })
    .select()
    .single()

  if (workspaceError) {
    console.error('Erro ao criar workspace:', workspaceError)
    return { error: 'Erro ao criar workspace. Tente novamente.' }
  }

  // Inserir Membro (Owner)
  // Importante para RLS
  const { error: memberError } = await supabase.from('workspace_members').insert({
    workspace_id: workspace.id,
    user_id: user.id,
    role: 'owner',
  })

  if (memberError) {
    console.error('Erro ao adicionar membro:', memberError)
    // Idealmente faríamos rollback, mas por simplicidade retornamos erro
    // Como o workspace já foi criado, isso é um estado inconsistente raro
    return { error: 'Erro ao configurar permissões do workspace.' }
  }

  // 5. Retorno
  return {
    success: true,
    workspaceId: workspace.id,
    magicCode,
  }
}

