/**
 * Wrapper para envio de e-mail com retry e backoff exponencial.
 * Reduz perda de e-mails em falhas temporárias (timeout, 5xx).
 */

const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_INITIAL_BACKOFF_MS = 1000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Códigos ou mensagens que indicam que vale a pena tentar de novo */
function isRetryableError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();
  if (lower.includes("timeout") || lower.includes("etimedout") || lower.includes("econnreset")) {
    return true;
  }
  if (lower.includes("429") || lower.includes("rate limit")) {
    return true;
  }
  if (lower.includes("500") || lower.includes("502") || lower.includes("503") || lower.includes("504")) {
    return true;
  }
  return false;
}

export interface SendWithRetryOptions {
  maxRetries?: number;
  initialBackoffMs?: number;
  onRetry?: (attempt: number, error: unknown) => void;
}

/**
 * Executa uma função de envio de e-mail com retry e backoff exponencial.
 * Só faz retry em erros considerados temporários (timeout, 5xx, 429).
 */
export async function sendWithRetry<T>(
  sendFn: () => Promise<T>,
  options: SendWithRetryOptions = {}
): Promise<T> {
  const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
  const initialBackoffMs = options.initialBackoffMs ?? DEFAULT_INITIAL_BACKOFF_MS;

  let lastError: unknown;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await sendFn();
    } catch (error) {
      lastError = error;
      const isLast = attempt === maxRetries;
      if (isLast || !isRetryableError(error)) {
        throw error;
      }
      options.onRetry?.(attempt, error);
      const delayMs = initialBackoffMs * Math.pow(2, attempt - 1);
      await sleep(delayMs);
    }
  }
  throw lastError;
}
