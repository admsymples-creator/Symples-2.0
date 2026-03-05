import { test as setup } from "@playwright/test";

const AUTH_FILE = "tests/.auth/user.json";

setup("autenticar usuário de teste", async ({ page }) => {
  const email = process.env.TEST_USER_EMAIL;
  const password = process.env.TEST_USER_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "Defina TEST_USER_EMAIL e TEST_USER_PASSWORD no .env.test antes de rodar os testes."
    );
  }

  // ── Login ──────────────────────────────────────────────────────────────────
  await page.goto("/login");
  await page.waitForSelector("#email", { timeout: 10000 });
  await page.fill("#email", email);
  await page.fill("#password", password);
  await page.getByRole("button", { name: /^entre$/i }).click();

  // Aguarda o app carregar (sidebar ou elemento principal da home)
  await page.waitForSelector('nav, [data-day-column], main', { timeout: 20000 });

  // ── Onboarding (só para usuário novo) ─────────────────────────────────────
  if (page.url().includes("/onboarding")) {
    // Step 1: empresa + segmento
    await page.waitForSelector("#company", { timeout: 8000 });
    await page.fill("#company", "Playwright Tests");
    await page.locator('[role="combobox"]').click();
    await page.getByRole("option", { name: /tecnologia/i }).click();
    await page.getByRole("button", { name: /próximo|continuar|avançar/i }).click();

    // Steps seguintes: pular/skip se houver
    for (let i = 0; i < 5; i++) {
      const skipBtn = page.getByRole("button", { name: /pular|skip/i });
      if (await skipBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await skipBtn.click();
      } else {
        break;
      }
    }

    // Aguarda chegar na home após onboarding
    await page.waitForURL(/\/(home|planner|tasks|.+-.+)/, { timeout: 20000 });
  }

  // Salva sessão autenticada
  await page.context().storageState({ path: AUTH_FILE });
});
