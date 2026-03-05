/**
 * Helper centralizado para logs de e-mail.
 * Padroniza formato e evita expor dados sensíveis (API keys, HTML completo).
 */

export type EmailLogEvent =
  | "send_start"
  | "send_success"
  | "send_error"
  | "send_retry"
  | "validation_fail"
  | "config_missing";

export interface EmailLogData {
  /** Tipo de e-mail (ex: invite, reset_password) */
  type?: string;
  /** Destinatário — em produção pode ser mascarado (ex: j***@domain.com) */
  to?: string;
  /** Tamanho do HTML em bytes (nunca o conteúdo) */
  htmlLength?: number;
  /** ID retornado pelo provider */
  emailId?: string;
  /** Mensagem de erro (sem stack em produção por padrão) */
  error?: string;
  /** Tentativa atual em caso de retry */
  attempt?: number;
  /** Máximo de tentativas */
  maxAttempts?: number;
  /** Outros dados seguros para log */
  [key: string]: unknown;
}

const isDev = process.env.NODE_ENV === "development";

function maskEmail(email: string): string {
  if (!email || !email.includes("@")) return "***";
  const [local, domain] = email.split("@");
  if (local.length <= 2) return `${local[0]}***@${domain}`;
  return `${local.slice(0, 2)}***@${domain}`;
}

/**
 * Registra um evento do fluxo de e-mail com formato padronizado.
 * Em produção não inclui destinatário completo nem stacks.
 */
export function logEmailEvent(event: EmailLogEvent, data: EmailLogData = {}): void {
  const payload: Record<string, unknown> = {
    event: `email_${event}`,
    timestamp: new Date().toISOString(),
    ...data,
  };

  if (payload.to && !isDev) {
    payload.to = maskEmail(String(payload.to));
  }

  const message = formatMessage(event, payload);
  const logLevel = event === "send_error" || event === "validation_fail" ? "error" : "info";

  if (logLevel === "error") {
    console.error(message, payload);
  } else {
    console.log(message, payload);
  }
}

function formatMessage(event: EmailLogEvent, data: EmailLogData): string {
  switch (event) {
    case "send_start":
      return "📤 Envio de e-mail iniciado";
    case "send_success":
      return "✅ E-mail enviado com sucesso";
    case "send_error":
      return "❌ Erro ao enviar e-mail";
    case "send_retry":
      return `🔄 Retentativa de envio (${data.attempt}/${data.maxAttempts})`;
    case "validation_fail":
      return "⚠️ Validação de e-mail falhou";
    case "config_missing":
      return "⚠️ Configuração de e-mail ausente";
    default:
      return "📧 Evento de e-mail";
  }
}
