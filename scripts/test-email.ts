/**
 * Script para testar o envio de email via Resend
 * 
 * Uso:
 *   npx tsx scripts/test-email.ts seu-email@exemplo.com
 * 
 * Ou configure as variáveis abaixo e execute:
 *   npx tsx scripts/test-email.ts
 */

import { config } from "dotenv";
import { resolve } from "path";

// Carregar variáveis de ambiente do .env.local
config({ path: resolve(process.cwd(), ".env.local") });

import { sendInviteEmail } from "../lib/email/send-invite";

async function testEmail() {
  // Obter email de destino dos argumentos da linha de comando
  const emailToTest = process.argv[2] || process.env.TEST_EMAIL || "";

  if (!emailToTest) {
    console.error("❌ Por favor, forneça um email de destino:");
    console.log("");
    console.log("Uso:");
    console.log("  npx tsx scripts/test-email.ts seu-email@exemplo.com");
    console.log("");
    console.log("Ou configure a variável TEST_EMAIL no .env.local:");
    console.log("  TEST_EMAIL=seu-email@exemplo.com");
    process.exit(1);
  }

  // Validar formato do email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(emailToTest)) {
    console.error(`❌ Email inválido: ${emailToTest}`);
    process.exit(1);
  }

  console.log("🧪 Testando envio de email...\n");

  // Verificar se RESEND_API_KEY está configurada
  if (!process.env.RESEND_API_KEY) {
    console.error("❌ RESEND_API_KEY não está configurada no .env.local");
    console.log("");
    console.log("Adicione no .env.local:");
    console.log("  RESEND_API_KEY=re_xxxxxxxxxxxxx");
    process.exit(1);
  }

  console.log("📋 Configuração:");
  console.log(`   Para: ${emailToTest}`);
  console.log(`   From: ${process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev"}`);
  console.log(`   From Name: ${process.env.RESEND_FROM_NAME || "Symples"}`);
  console.log(`   API Key: ${process.env.RESEND_API_KEY ? "✅ Configurada" : "❌ Não configurada"}`);
  console.log("");

  try {
    // Dados de teste
    const testData = {
      to: emailToTest,
      workspaceName: "Workspace de Teste",
      inviterName: "Equipe Symples",
      inviteLink: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/invite/test-123`,
      role: "member" as const,
      isNewUser: true,
    };

    console.log("📤 Enviando email de teste...\n");

    const result = await sendInviteEmail(testData);

    if (result.success) {
      console.log("✅ Email enviado com sucesso!");
      console.log(`   Email ID: ${result.id}`);
      console.log("");
      console.log("📧 Verifique sua caixa de entrada (e spam) em alguns instantes.");
      console.log("");
      console.log("💡 Dica: Você também pode verificar o envio no dashboard do Resend:");
      console.log("   https://resend.com/emails");
    } else {
      console.error("❌ Falha ao enviar email");
      if (result.error) {
        console.error(`   Erro: ${result.error}`);
      }
      process.exit(1);
    }
  } catch (error: any) {
    console.error("❌ Erro ao testar envio de email:");
    console.error("");
    console.error(error.message || error);
    if (error.stack) {
      console.error("");
      console.error("Stack trace:");
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Executar o teste
testEmail();








