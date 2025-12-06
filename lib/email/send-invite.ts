import { Resend } from "resend";
import { render } from "@react-email/render";
import { InviteEmail } from "./templates/invite-email";

// Inicializar o cliente Resend
const resend = new Resend(process.env.RESEND_API_KEY);

interface SendInviteParams {
  to: string;
  workspaceName: string;
  inviterName: string | null;
  inviteLink: string;
  role: "admin" | "member" | "viewer";
  isNewUser?: boolean; // Indica se o usuário precisa criar conta
}

/**
 * Envia um email de convite usando o Resend
 * @param params - Parâmetros do convite
 * @returns Promise com resultado do envio
 */
export async function sendInviteEmail(params: SendInviteParams) {
  const { to, workspaceName, inviterName, inviteLink, role, isNewUser = false } = params;

  // Validar se a API key está configurada
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    const warning = "⚠️ RESEND_API_KEY não configurada. Email não será enviado.";
    console.warn(warning);
    
    // Em desenvolvimento, apenas loga o link
    if (process.env.NODE_ENV === "development") {
      console.log("📧 [DEV] Email de convite simulado:");
      console.log(`   Para: ${to}`);
      console.log(`   Workspace: ${workspaceName}`);
      console.log(`   Link: ${inviteLink}`);
      console.log(`   Role: ${role}`);
    }
    
    return { 
      success: false, 
      id: "dev-simulation",
      error: "RESEND_API_KEY não configurada"
    };
  }

  // Validar formato do email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(to)) {
    const errorMsg = `Email inválido: ${to}`;
    console.error("❌", errorMsg);
    throw new Error(errorMsg);
  }

  try {
    console.log("📤 Tentando enviar email de convite:", {
      to,
      workspaceName,
      fromEmail: process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev",
    });

    // Renderizar o template React para HTML
    const emailHtml = await render(
      InviteEmail({
        workspaceName,
        inviterName,
        inviteLink,
        role,
        isNewUser,
      })
    );

    // Enviar email via Resend
    const fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
    const fromName = process.env.RESEND_FROM_NAME || "Symples";

    const emailPayload = {
      from: `${fromName} <${fromEmail}>`,
      to: [to],
      subject: `Você foi convidado para ${workspaceName}`,
      html: emailHtml,
    };

    console.log("📨 Payload do email (sem HTML):", {
      from: emailPayload.from,
      to: emailPayload.to,
      subject: emailPayload.subject,
      htmlLength: emailHtml.length,
    });

    const { data, error } = await resend.emails.send(emailPayload);

    if (error) {
      console.error("❌ Erro ao enviar email via Resend:", {
        error,
        message: error.message,
        name: error.name,
        to,
        from: emailPayload.from,
      });
      throw new Error(`Falha ao enviar email: ${error.message || JSON.stringify(error)}`);
    }

    console.log("✅ Email enviado com sucesso:", {
      emailId: data?.id,
      to,
      workspaceName,
    });

    return {
      success: true,
      id: data?.id || "unknown",
    };
  } catch (error: any) {
    const errorMessage = error.message || "Erro desconhecido ao enviar email de convite";
    console.error("❌ Erro ao processar envio de email:", {
      message: errorMessage,
      stack: error.stack,
      to,
      workspaceName,
    });
    throw new Error(errorMessage);
  }
}

