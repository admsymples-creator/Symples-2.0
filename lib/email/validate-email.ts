/**
 * Validação robusta de endereço de e-mail.
 * Regras: comprimento, formato local@domínio, caracteres inválidos.
 */

const MAX_EMAIL_LENGTH = 254;
const LOCAL_MAX_LENGTH = 64;
const DOMAIN_MAX_LENGTH = 253;

// Formato: local@domain (simplificado RFC 5322)
// Local: permite letras, números, ., -, _, +
// Domain: permite letras, números, hífen; TLD mínimo 2 caracteres
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;

export interface ValidateEmailResult {
  valid: boolean;
  error?: string;
}

/**
 * Valida um endereço de e-mail.
 * Retorna { valid: true } ou { valid: false, error: "mensagem" }.
 */
export function validateEmail(email: unknown): ValidateEmailResult {
  if (email == null) {
    return { valid: false, error: "E-mail não informado" };
  }

  const str = typeof email === "string" ? email.trim() : String(email).trim();
  if (str.length === 0) {
    return { valid: false, error: "E-mail vazio" };
  }

  if (str.length > MAX_EMAIL_LENGTH) {
    return { valid: false, error: `E-mail excede ${MAX_EMAIL_LENGTH} caracteres` };
  }

  const atIndex = str.indexOf("@");
  if (atIndex === -1) {
    return { valid: false, error: "E-mail deve conter @" };
  }

  const local = str.slice(0, atIndex);
  const domain = str.slice(atIndex + 1);

  if (local.length > LOCAL_MAX_LENGTH) {
    return { valid: false, error: "Parte local do e-mail muito longa" };
  }
  if (domain.length > DOMAIN_MAX_LENGTH) {
    return { valid: false, error: "Domínio do e-mail muito longo" };
  }

  if (!EMAIL_REGEX.test(str)) {
    return { valid: false, error: "Formato de e-mail inválido" };
  }

  // Rejeitar domínios que são apenas IP ou inválidos comuns
  if (domain.startsWith(".") || domain.endsWith(".") || domain.includes("..")) {
    return { valid: false, error: "Domínio inválido" };
  }

  return { valid: true };
}
