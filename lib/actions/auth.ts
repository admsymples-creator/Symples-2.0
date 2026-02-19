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
 * URL base do app para redirects de auth (callback, OAuth, etc).
 * Em produção na Vercel usa VERCEL_URL se NEXT_PUBLIC_SITE_URL não estiver definida.
 */
function getBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return 'http://localhost:3000'
}

/**
 * Faz login com email e senha
 * @param formData - FormData contendo 'email', 'password' e opcionalmente 'inviteToken'
 * @returns Objeto com success e message
 */
export async function loginWithPassword(formData: FormData) {
  try {
    const email = formData.get('email')?.toString().trim()
    const password = formData.get('password')?.toString()
    const inviteToken = formData.get('inviteToken')?.toString()
    const trialDaysParam = formData.get('trialDays')?.toString()
    const trialPlanParam = formData.get('trialPlan')?.toString()

    if (!email) {
      return {
        success: false,
        message: 'Email é obrigatório',
      }
    }

    if (!password) {
      return {
        success: false,
        message: 'Senha é obrigatória',
      }
    }

    if (!isValidEmail(email)) {
      return {
        success: false,
        message: 'Email inválido. Por favor, insira um email válido.',
      }
    }

    const supabase = await createServerClient()
    const baseUrl = getBaseUrl()
    let redirectTo = `${baseUrl}/auth/callback`
    if (inviteToken) {
      redirectTo += `?invite=${inviteToken}`
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      console.error('Erro ao fazer login:', error)
      return {
        success: false,
        message: error.message || 'Email ou senha incorretos',
      }
    }

    if (data.user) {
      // Redirecionar após login bem-sucedido
      redirect(redirectTo)
    }

    return {
      success: true,
      message: 'Login realizado com sucesso!',
    }
  } catch (error) {
    // O redirect lança um erro "NEXT_REDIRECT" que não deve ser capturado
    if (error instanceof Error && error.message === 'NEXT_REDIRECT') {
      throw error
    }
    if (typeof error === 'object' && error !== null && 'digest' in error && (error as any).digest?.startsWith('NEXT_REDIRECT')) {
      throw error
    }

    console.error('Erro inesperado ao fazer login:', error)
    return {
      success: false,
      message: 'Erro inesperado ao processar login',
    }
  }
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
    const inviteToken = formData.get('inviteToken')?.toString()
    const trialDaysParam = formData.get('trialDays')?.toString()
    const trialPlanParam = formData.get('trialPlan')?.toString()

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
    const baseUrl = getBaseUrl()
    let emailRedirectTo = `${baseUrl}/auth/callback`
    const redirectParams = new URLSearchParams()
    if (inviteToken) {
      redirectParams.set('invite', inviteToken)
    }
    const trialDaysValue = trialDaysParam ? Number(trialDaysParam) : null
    if (trialDaysValue && [15, 30, 60].includes(trialDaysValue)) {
      redirectParams.set('trial_days', String(trialDaysValue))
    }
    if (trialPlanParam && ['pro', 'business'].includes(trialPlanParam)) {
      redirectParams.set('trial_plan', trialPlanParam)
    }
    if (redirectParams.size > 0) {
      emailRedirectTo += `?${redirectParams.toString()}`
    }

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
    const baseUrl = getBaseUrl()
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
 * Cria conta com email e senha
 * @param formData - FormData contendo 'email', 'password', 'fullName' (opcional) e opcionalmente 'inviteToken'
 * @returns Objeto com success e message
 */
export async function signupWithPassword(formData: FormData) {
  try {
    const email = formData.get('email')?.toString().trim()
    const password = formData.get('password')?.toString()
    const fullName = formData.get('fullName')?.toString().trim()
    const inviteToken = formData.get('inviteToken')?.toString()
    const trialDaysParam = formData.get('trialDays')?.toString()
    const trialPlanParam = formData.get('trialPlan')?.toString()

    if (!email) {
      return {
        success: false,
        message: 'Email é obrigatório',
      }
    }

    if (!password) {
      return {
        success: false,
        message: 'Senha é obrigatória',
      }
    }

    if (password.length < 6) {
      return {
        success: false,
        message: 'A senha deve ter pelo menos 6 caracteres',
      }
    }

    if (!isValidEmail(email)) {
      return {
        success: false,
        message: 'Email inválido. Por favor, insira um email válido.',
      }
    }

    const supabase = await createServerClient()
    const baseUrl = getBaseUrl()
    
    let emailRedirectTo = `${baseUrl}/auth/callback`
    const redirectParams = new URLSearchParams()
    if (inviteToken) {
      redirectParams.set('invite', inviteToken)
    }
    const trialDaysValue = trialDaysParam ? Number(trialDaysParam) : null
    if (trialDaysValue && [15, 30, 60].includes(trialDaysValue)) {
      redirectParams.set('trial_days', String(trialDaysValue))
    }
    if (trialPlanParam && ['pro', 'business'].includes(trialPlanParam)) {
      redirectParams.set('trial_plan', trialPlanParam)
    }
    if (redirectParams.size > 0) {
      emailRedirectTo += `?${redirectParams.toString()}`
    }

    // Preparar metadata com nome se fornecido
    const metadata: Record<string, string> = {}
    if (fullName) {
      metadata.full_name = fullName
    }
    if (trialDaysValue && [15, 30, 60].includes(trialDaysValue)) {
      metadata.trial_days = String(trialDaysValue)
    }
    if (trialPlanParam && ['pro', 'business'].includes(trialPlanParam)) {
      metadata.trial_plan = trialPlanParam
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo,
        data: metadata,
      },
    })

    if (error) {
      console.error('Erro ao criar conta:', error)
      return {
        success: false,
        message: error.message || 'Erro ao criar conta',
      }
    }

    // Se o email precisa ser confirmado, mostrar mensagem
    if (data.user && !data.session) {
      return {
        success: true,
        message: 'Conta criada! Verifique seu email para confirmar sua conta.',
      }
    }

    // Se já tem sessão, redirecionar
    if (data.session) {
      redirect(emailRedirectTo)
    }

    return {
      success: true,
      message: 'Conta criada com sucesso!',
    }
  } catch (error) {
    // O redirect lança um erro "NEXT_REDIRECT" que não deve ser capturado
    if (error instanceof Error && error.message === 'NEXT_REDIRECT') {
      throw error
    }
    if (typeof error === 'object' && error !== null && 'digest' in error && (error as any).digest?.startsWith('NEXT_REDIRECT')) {
      throw error
    }

    console.error('Erro inesperado ao criar conta:', error)
    return {
      success: false,
      message: 'Erro inesperado ao processar criação de conta',
    }
  }
}

/**
 * Envia email de reset de senha
 * @param formData - FormData contendo o campo 'email'
 * @returns Objeto com success e message
 */
export async function resetPassword(formData: FormData) {
  try {
    const email = formData.get('email')?.toString().trim()

    if (!email) {
      return {
        success: false,
        message: 'Email é obrigatório',
      }
    }

    if (!isValidEmail(email)) {
      return {
        success: false,
        message: 'Email inválido. Por favor, insira um email válido.',
      }
    }

    const supabase = await createServerClient()
    const baseUrl = getBaseUrl()
    const redirectTo = `${baseUrl}/auth/callback?type=recovery`

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    })

    if (error) {
      console.error('Erro ao enviar email de reset:', error)
      return {
        success: false,
        message: error.message || 'Erro ao enviar email de reset de senha',
      }
    }

    return {
      success: true,
      message: 'Email de reset de senha enviado! Verifique sua caixa de entrada.',
    }
  } catch (error) {
    console.error('Erro inesperado ao resetar senha:', error)
    return {
      success: false,
      message: 'Erro inesperado ao processar reset de senha',
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
    const inviteToken = formData.get('inviteToken')?.toString()
    const trialDaysParam = formData.get('trialDays')?.toString()
    const trialPlanParam = formData.get('trialPlan')?.toString();

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
    const baseUrl = getBaseUrl();
    
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
export async function signInWithGoogle(inviteToken?: string, trialDays?: number, trialPlan?: 'pro' | 'business') {
  try {
    const supabase = await createServerClient()

    // Obter a URL base do ambiente
    const baseUrl = getBaseUrl()
    let redirectTo = `${baseUrl}/auth/callback`
    const redirectParams = new URLSearchParams()
    if (inviteToken) {
      redirectParams.set('invite', inviteToken)
    }
    if (trialDays && [15, 30, 60].includes(trialDays)) {
      redirectParams.set('trial_days', String(trialDays))
    }
    if (trialPlan && ['pro', 'business'].includes(trialPlan)) {
      redirectParams.set('trial_plan', trialPlan)
    }
    if (redirectParams.size > 0) {
      redirectTo += `?${redirectParams.toString()}`
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

    return { success: true }
  } catch (error) {
    console.error('Erro inesperado ao fazer logout:', error)
    return {
      success: false,
      message: 'Erro inesperado ao fazer logout',
    }
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

