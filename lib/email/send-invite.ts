import { Resend } from "resend";
import { render } from "@react-email/render";
import { InviteEmail } from "./templates/invite-email";
import { logEmailEvent } from "./logger";
import { validateEmail } from "./validate-email";
import { sendWithRetry } from "./send-with-retry";

const resend = new Resend(process.env.RESEND_API_KEY);

interface SendInviteParams {
  to: string;
  workspaceName: string;
  inviterName: string | null;
  inviteLink: string;
  role: "admin" | "member" | "viewer";
  isNewUser?: boolean;
}

/**
 * Envia um email de convite usando o Resend, com validação robusta,
 * retry com backoff exponencial e logs centralizados.
 */
export async function sendInviteEmail(params: SendInviteParams) {
  const { to, workspaceName, inviterName, inviteLink, role, isNewUser = false } = params;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    logEmailEvent("config_missing", {
      type: "invite",
      to,
      error: "RESEND_API_KEY não configurada",
    });
    if (process.env.NODE_ENV === "development") {
      console.log("📧 [DEV] Email de convite simulado:", { to, workspaceName, inviteLink, role });
      return {
        success: false,
        id: "dev-simulation",
        error: "RESEND_API_KEY não configurada",
      };
    }
    throw new Error(
      "RESEND_API_KEY não está configurada. Configure a variável de ambiente RESEND_API_KEY no Vercel para enviar convites por email."
    );
  }

  const validation = validateEmail(to);
  if (!validation.valid) {
    logEmailEvent("validation_fail", { type: "invite", to, error: validation.error });
    throw new Error(validation.error ?? "Email inválido");
  }

  const fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
  const fromName = process.env.RESEND_FROM_NAME || "Symples";

  logEmailEvent("send_start", {
    type: "invite",
    to,
    workspaceName,
    fromEmail,
  });

  try {
    const emailHtml = await render(
      InviteEmail({
        workspaceName,
        inviterName,
        inviteLink,
        role,
        isNewUser,
      })
    );

    const payload = {
      from: `${fromName} <${fromEmail}>`,
      to: [to],
      subject: `Você foi convidado para ${workspaceName}`,
      html: emailHtml,
    };

    const result = await sendWithRetry(
      async () => {
        const res = await resend.emails.send(payload);
        if (res.error) {
          throw new Error(res.error.message ?? JSON.stringify(res.error));
        }
        return res;
      },
      {
        maxRetries: 3,
        initialBackoffMs: 1000,
        onRetry: (attempt, error) => {
          logEmailEvent("send_retry", {
            type: "invite",
            to,
            attempt,
            maxAttempts: 3,
            error: error instanceof Error ? error.message : String(error),
          });
        },
      }
    );

    logEmailEvent("send_success", {
      type: "invite",
      to,
      emailId: result.data?.id,
      workspaceName,
      htmlLength: emailHtml.length,
    });

    return {
      success: true,
      id: result.data?.id ?? "unknown",
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logEmailEvent("send_error", {
      type: "invite",
      to,
      error: message,
    });
    throw new Error(message);
  }
}
