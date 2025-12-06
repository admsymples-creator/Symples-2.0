'use server'

import { createServerClient } from "@/lib/supabase/server";
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

/**
 * Valida se o email é válido usando regex
 * @param email - Email a ser validado
 * @returns true se válido, false caso contrário
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email.trim())
}

/**
 * Inicia o fluxo de login com Magic Link (email) a partir de FormData
 * @param formData - FormData contendo o campo 'email'
 * @returns Objeto com success e message
 */
export async function loginWithEmail(formData: FormData) {
  try {
    // Extrair email do FormData
    const email = formData.get('email')?.toString().trim()

    // Validar se o email foi fornecido
    if (!email) {
      return {
        success: false,
        message: 'Email é obrigatório',
      }
    }

    // Validar formato do email
    if (!isValidEmail(email)) {
      return {
        success: false,
        message: 'Email inválido. Por favor, insira um email válido.',
      }
    }

    // Instanciar cliente Supabase Server
    const supabase = await createServerClient()

    // Configurar URL de redirecionamento dinamicamente
    // Captura a URL base usando NEXT_PUBLIC_SITE_URL ou fallback para localhost
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    const emailRedirectTo = `${baseUrl}/auth/callback`

    // Chamar signInWithOtp do Supabase
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo,
      },
    })

    if (error) {
      console.error('Erro ao enviar Magic Link:', error)
      return {
        success: false,
        message: error.message || 'Erro ao enviar email de autenticação',
      }
    }

    return {
      success: true,
      message: 'Email de autenticação enviado! Verifique sua caixa de entrada.',
    }
  } catch (error) {
    console.error('Erro inesperado ao fazer login:', error)
    return {
      success: false,
      message: 'Erro inesperado ao processar login',
    }
  }
}

/**
 * Inicia o fluxo de login com Magic Link (email)
 * @param email - Email do usuário
 * @returns Objeto com success e message
 * @deprecated Use loginWithEmail(formData) ao invés desta função
 */
export async function signInWithEmail(email: string) {
  try {
    const supabase = await createServerClient()

    // Obter a URL base do ambiente
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    const redirectTo = `${baseUrl}/auth/callback`

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectTo,
      },
    })

    if (error) {
      console.error('Erro ao enviar Magic Link:', error)
      return {
        success: false,
        message: error.message || 'Erro ao enviar email de autenticação',
      }
    }

    return {
      success: true,
      message: 'Email de autenticação enviado! Verifique sua caixa de entrada.',
    }
  } catch (error) {
    console.error('Erro inesperado ao fazer login:', error)
    return {
      success: false,
      message: 'Erro inesperado ao processar login',
    }
  }
}

/**
 * Inicia o fluxo de signup com Magic Link (email)
 * Funciona igual ao login, mas pode incluir token de convite
 */
export async function signupWithEmail(formData: FormData) {
  try {
    const email = formData.get('email')?.toString().trim();
    const inviteToken = formData.get('inviteToken')?.toString();

    if (!email) {
      return {
        success: false,
        message: 'Email é obrigatório',
      };
    }

    if (!isValidEmail(email)) {
      return {
        success: false,
        message: 'Email inválido. Por favor, insira um email válido.',
      };
    }

    const supabase = await createServerClient();
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    
    // ✅ CORREÇÃO 3: Magic Link Stripping - Persistência Híbrida
    // Tentamos incluir na URL primeiro (melhor para OAuth e quando funciona)
    // O cookie já foi salvo na página /invite/[token], então temos fallback
    let emailRedirectTo = `${baseUrl}/auth/callback`;
    if (inviteToken) {
      emailRedirectTo += `?invite=${inviteToken}`;
      // Nota: Se o provedor de email remover o parâmetro, o callback
      // vai usar o cookie como fallback (já foi salvo na página de invite)
    }

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo,
      },
    });

    if (error) {
      console.error('Erro ao enviar Magic Link para signup:', error);
      return {
        success: false,
        message: error.message || 'Erro ao enviar email de autenticação',
      };
    }

    return {
      success: true,
      message: 'Email de autenticação enviado! Verifique sua caixa de entrada.',
    };
  } catch (error) {
    console.error('Erro inesperado ao criar conta:', error);
    return {
      success: false,
      message: 'Erro inesperado ao processar criação de conta',
    };
  }
}

/**
 * Inicia o fluxo de login com Google OAuth
 * @param inviteToken - Token de convite opcional para incluir no callback
 * @returns Objeto com success e message
 */
export async function signInWithGoogle(inviteToken?: string) {
  try {
    const supabase = await createServerClient()

    // Obter a URL base do ambiente
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    let redirectTo = `${baseUrl}/auth/callback`;
    if (inviteToken) {
      redirectTo += `?invite=${inviteToken}`;
    }

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    })

    if (error) {
      console.error('Erro ao iniciar OAuth Google:', error)
      return {
        success: false,
        message: error.message || 'Erro ao iniciar autenticação com Google',
      }
    }

    // Redirecionar para a URL de OAuth
    if (data.url) {
      redirect(data.url)
    }

    return {
      success: true,
      message: 'Redirecionando para Google...',
    }
  } catch (error) {
    // O redirect lança um erro "NEXT_REDIRECT" que não deve ser capturado
    if (error instanceof Error && error.message === 'NEXT_REDIRECT') {
      throw error
    }

    // Em dev, o erro pode ter outra estrutura ou digest
    if (typeof error === 'object' && error !== null && 'digest' in error && (error as any).digest?.startsWith('NEXT_REDIRECT')) {
      throw error
    }
    
    console.error('Erro inesperado ao fazer login com Google:', error)
    return {
      success: false,
      message: 'Erro inesperado ao processar login',
    }
  }
}

/**
 * Faz logout do usuário
 */
export async function signOut() {
  try {
    const supabase = await createServerClient()

    const { error } = await supabase.auth.signOut()

    if (error) {
      console.error('Erro ao fazer logout:', error)
      return {
        success: false,
        message: error.message || 'Erro ao fazer logout',
      }
    }

    // Revalidar todas as rotas
    revalidatePath('/', 'layout')

    // Redirecionar para login
    redirect('/login')
  } catch (error) {
    console.error('Erro inesperado ao fazer logout:', error)
    redirect('/login')
  }
}

/**
 * Verifica se o usuário está autenticado
 * @returns Objeto com user e error
 */
export async function getCurrentUser() {
  try {
    const supabase = await createServerClient()

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error) {
      return {
        user: null,
        error,
      }
    }

    return {
      user,
      error: null,
    }
  } catch (error) {
    console.error('Erro ao obter usuário atual:', error)
    return {
      user: null,
      error: error as Error,
    }
  }
}

