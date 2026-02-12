/**
 * Cria (ou recria) o usuário de teste para os testes Playwright.
 * Uso: npx tsx scripts/create-test-user.ts
 *
 * Requer variáveis em .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const TEST_EMAIL = "test-playwright@symples.app";
const TEST_PASSWORD = "TestSymples2026!";

async function main() {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error("❌  NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não definidos.");
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Verifica se já existe
  const { data: existing } = await supabase.auth.admin.listUsers();
  const alreadyExists = existing?.users?.find((u) => u.email === TEST_EMAIL);

  if (alreadyExists) {
    // Atualiza a senha para garantir que está correta
    const { error } = await supabase.auth.admin.updateUserById(alreadyExists.id, {
      password: TEST_PASSWORD,
      email_confirm: true,
    });
    if (error) {
      console.error("❌  Erro ao atualizar usuário existente:", error.message);
      process.exit(1);
    }
    console.log("✅  Usuário de teste já existe — senha atualizada.");
  } else {
    // Cria novo
    const { data, error } = await supabase.auth.admin.createUser({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: "Playwright Test" },
    });
    if (error) {
      console.error("❌  Erro ao criar usuário:", error.message);
      process.exit(1);
    }
    console.log("✅  Usuário de teste criado:", data.user?.id);
  }

  // Exibe as credenciais para copiar no .env.test
  console.log("\n📋  Adicione ao .env.test:");
  console.log(`TEST_USER_EMAIL=${TEST_EMAIL}`);
  console.log(`TEST_USER_PASSWORD=${TEST_PASSWORD}`);
}

main();
