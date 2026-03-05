/**
 * Script para testar o envio de email via Resend
 * 
 * Uso:
 *   node scripts/test-email.js seu-email@exemplo.com
 * 
 * Ou configure a variável TEST_EMAIL no .env.local e execute:
 *   node scripts/test-email.js
 */

// Carregar variáveis de ambiente do .env.local manualmente
const fs = require("fs");
const path = require("path");

function loadEnvFile() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf8");
    envContent.split("\n").forEach((line) => {
      const match = line.match(/^([^=:#]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim().replace(/^["']|["']$/g, "");
        if (key && value && !process.env[key]) {
          process.env[key] = value;
        }
      }
    });
  }
}

loadEnvFile();
const { Resend } = require("resend");

async function testEmail() {
  // Obter email de destino dos argumentos da linha de comando
  const emailToTest = process.argv[2] || process.env.TEST_EMAIL || "";

  if (!emailToTest) {
    console.error("❌ Por favor, forneça um email de destino:");
    console.log("");
    console.log("Uso:");
    console.log("  node scripts/test-email.js seu-email@exemplo.com");
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

  console.log("🧪 Testando envio de email via Resend...\n");

  // Verificar se RESEND_API_KEY está configurada
  if (!process.env.RESEND_API_KEY) {
    console.error("❌ RESEND_API_KEY não está configurada no .env.local");
    console.log("");
    console.log("Adicione no .env.local:");
    console.log("  RESEND_API_KEY=re_xxxxxxxxxxxxx");
    process.exit(1);
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
  const fromName = process.env.RESEND_FROM_NAME || "Symples";

  console.log("📋 Configuração:");
  console.log(`   Para: ${emailToTest}`);
  console.log(`   De: ${fromName} <${fromEmail}>`);
  console.log(`   API Key: ✅ Configurada`);
  console.log("");

  // HTML simples para teste
  const testHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Ubuntu, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #ffffff; border-radius: 8px; padding: 40px 20px; margin-bottom: 20px;">
          <h1 style="font-size: 24px; font-weight: 600; color: #111827; text-align: center; margin-bottom: 24px;">
            🧪 Email de Teste - Symples
          </h1>
          
          <p style="font-size: 16px; line-height: 24px; color: #374151; margin-bottom: 16px;">
            Olá!
          </p>
          
          <p style="font-size: 16px; line-height: 24px; color: #374151; margin-bottom: 16px;">
            Este é um email de teste do sistema de envio do Symples. Se você recebeu este email, significa que a configuração do Resend está funcionando corretamente! ✅
          </p>
          
          <div style="background-color: #f3f4f6; border-left: 4px solid #10b981; padding: 16px; margin: 24px 0; border-radius: 4px;">
            <p style="margin: 0; font-size: 14px; color: #374151;">
              <strong>Informações do teste:</strong><br>
              • Remetente: ${fromName} <${fromEmail}><br>
              • Destinatário: ${emailToTest}<br>
              • Data/Hora: ${new Date().toLocaleString("pt-BR")}
            </p>
          </div>
          
          <p style="font-size: 16px; line-height: 24px; color: #374151; margin-bottom: 16px;">
            Se você está vendo este email, o sistema de envio está configurado e funcionando! 🎉
          </p>
        </div>
        
        <div style="text-align: center; margin-top: 32px; padding-top: 32px; border-top: 1px solid #e5e7eb;">
          <p style="font-size: 14px; color: #6b7280; margin: 0;">
            Este é um email automático de teste do Symples.
          </p>
        </div>
      </body>
    </html>
  `;

  try {
    console.log("📤 Enviando email de teste...\n");

    const { data, error } = await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: [emailToTest],
      subject: "🧪 Teste de Email - Symples",
      html: testHtml,
    });

    if (error) {
      console.error("❌ Erro ao enviar email:");
      console.error("");
      console.error("Erro:", error);
      if (error.message) {
        console.error("Mensagem:", error.message);
      }
      process.exit(1);
    }

    console.log("✅ Email enviado com sucesso!");
    console.log(`   Email ID: ${data.id}`);
    console.log("");
    console.log("📧 Verifique sua caixa de entrada (e pasta de spam) em alguns instantes.");
    console.log("");
    console.log("💡 Dica: Você também pode verificar o envio no dashboard do Resend:");
    console.log("   https://resend.com/emails");
    console.log("");
  } catch (error) {
    console.error("❌ Erro ao testar envio de email:");
    console.error("");
    console.error(error);
    process.exit(1);
  }
}

// Executar o teste
testEmail().catch((error) => {
  console.error("❌ Erro inesperado:");
  console.error(error);
  process.exit(1);
});

