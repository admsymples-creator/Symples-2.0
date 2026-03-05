/**
 * Cria dados de teste para os testes Playwright.
 * Uso: npm run test:setup-data
 *
 * Cria (ou verifica) uma tarefa recorrente diária para o usuário de teste.
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const TEST_EMAIL = process.env.TEST_USER_EMAIL || "test-playwright@symples.app";

async function main() {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Busca o ID do usuário de teste
  const { data: users } = await supabase.auth.admin.listUsers();
  const testUser = users?.users?.find((u) => u.email === TEST_EMAIL);
  if (!testUser) {
    console.error(`❌  Usuário ${TEST_EMAIL} não encontrado. Rode npm run test:setup-user primeiro.`);
    process.exit(1);
  }

  const userId = testUser.id;
  const today = new Date();
  today.setHours(12, 0, 0, 0); // meio-dia para evitar timezone edge cases

  // Verifica se já existe tarefa recorrente de teste
  const { data: existing } = await supabase
    .from("tasks")
    .select("id, title")
    .eq("created_by", userId)
    .eq("is_personal", true)
    .not("recurrence_type", "is", null)
    .is("recurrence_parent_id", null)
    .ilike("title", "%[PW-TEST]%")
    .limit(1);

  if (existing && existing.length > 0) {
    console.log(`✅  Tarefa recorrente de teste já existe: "${existing[0].title}"`);
    return;
  }

  // Cria tarefa recorrente diária com título identificável
  const { data, error } = await supabase.from("tasks").insert({
    title: "[PW-TEST] Tarefa recorrente diária",
    status: "todo",
    priority: "medium",
    is_personal: true,
    workspace_id: null,
    created_by: userId,
    assignee_id: userId,
    due_date: today.toISOString(),
    recurrence_type: "daily",
    recurrence_interval: 1,
  }).select().single();

  if (error) {
    console.error("❌  Erro ao criar tarefa de teste:", error.message);
    process.exit(1);
  }

  console.log(`✅  Tarefa recorrente de teste criada: ${data.id}`);
  console.log(`    Título: "${data.title}"`);
  console.log(`    Due date: ${data.due_date}`);
}

main();
