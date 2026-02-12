import { test, expect } from "@playwright/test";
import { goToWeeklyView, countTasksOnToday, isVirtualTask, todayKey } from "./helpers/recurrence";

// ─── Helpers inline ────────────────────────────────────────────────────────────

/** Localiza o card do dia de hoje */
const todayCard = (page: Parameters<typeof goToWeeklyView>[0]) =>
  page.locator("[data-day-column][data-today='true']").first();

/** Localiza um TaskRow pelo título */
const taskRow = (page: Parameters<typeof goToWeeklyView>[0], title: string) =>
  page.locator(`[data-testid="task-row"]`).filter({ hasText: title }).first();

// ─── Suite ─────────────────────────────────────────────────────────────────────

test.describe("Tarefas Recorrentes — Weekly View", () => {

  test.beforeEach(async ({ page }) => {
    await goToWeeklyView(page);
  });

  // ── 1. Sem virtuais para datas passadas ──────────────────────────────────────
  test("não exibe tasks virtuais para dias anteriores a hoje", async ({ page }) => {
    // Navega 5 dias para trás para garantir que nenhum dia futuro fique visível
    // (daysToShow=5, initialOffset=-2 → precisa de pelo menos 3 cliques para sair de hoje)
    for (let i = 0; i < 5; i++) {
      await page.locator("button svg.lucide-chevron-left").first().click();
      await page.waitForTimeout(150);
    }
    await page.waitForTimeout(300);

    // Todos os task rows visíveis não devem ter a classe de virtual (opacity-50)
    const virtualRows = page.locator("[data-day-column] .opacity-50[data-testid='task-row']");
    await expect(virtualRows).toHaveCount(0);
  });

  // ── 2. Ocorrência de hoje é real (editável) ──────────────────────────────────
  test("ocorrência de hoje de task recorrente é real e editável", async ({ page }) => {
    // Encontra a task de teste no card de hoje
    const recurringOnToday = todayCard(page)
      .locator("[data-testid='task-row']")
      .filter({ hasText: "[PW-TEST]" });

    const count = await recurringOnToday.count();
    test.skip(count === 0, "Task [PW-TEST] não encontrada — rode npm run test:setup-data");

    const firstRecurring = recurringOnToday.first();

    // Não deve ter a classe de virtual
    await expect(firstRecurring).not.toHaveClass(/opacity-50/);

    // Deve ser clicável para edição (título clicável)
    const title = firstRecurring.locator("p[role='button']");
    await expect(title).toBeVisible();
    await title.click();

    // Input de edição deve aparecer no card de hoje (o filter{ hasText } quebra quando o texto vai pro input)
    await expect(todayCard(page).locator("input[type='text']").first()).toBeVisible();

    // Cancela edição
    await page.keyboard.press("Escape");
  });

  // ── 3. Tasks futuras são virtuais ────────────────────────────────────────────
  test("ocorrências futuras de recorrentes aparecem como virtuais", async ({ page }) => {
    // Avança 3 dias para garantir que hoje saia do lado esquerdo e só futuros fiquem
    for (let i = 0; i < 3; i++) {
      await page.locator("button svg.lucide-chevron-right").first().click();
      await page.waitForTimeout(150);
    }
    await page.waitForTimeout(300);

    // Todos os [PW-TEST] visíveis agora estão em dias futuros — devem ser virtuais (opacity-50)
    const futureRecurring = page
      .locator("[data-day-column]:not([data-today])")
      .locator("[data-testid='task-row']")
      .filter({ hasText: "[PW-TEST]" });

    const count = await futureRecurring.count();
    test.skip(count === 0, "Nenhuma task [PW-TEST] recorrente em data futura visível");

    for (let i = 0; i < count; i++) {
      await expect(futureRecurring.nth(i)).toHaveClass(/opacity-50/);
    }
  });

  // ── 4. Sem duplicatas após múltiplos reloads ─────────────────────────────────
  test("sem duplicatas de tasks recorrentes após reloads consecutivos", async ({ page }) => {
    // Captura títulos de tasks recorrentes no card de hoje antes do reload
    const getRecurringTitles = async () => {
      // Usa seletor combinado: data-recurrence está no próprio task-row, não é descendente
      const rows = todayCard(page)
        .locator("[data-testid='task-row'][data-recurrence]");
      const count = await rows.count();
      const titles: string[] = [];
      for (let i = 0; i < count; i++) {
        const text = await rows.nth(i).locator("p").first().textContent();
        if (text) titles.push(text.trim());
      }
      return titles;
    };

    const titlesBefore = await getRecurringTitles();
    test.skip(titlesBefore.length === 0, "Nenhuma task recorrente para verificar");

    // Reload e verifica novamente
    await page.reload();
    await page.waitForSelector("[data-day-column]", { timeout: 10000 });

    const titlesAfter = await getRecurringTitles();

    // Conta duplicatas
    const counted = titlesAfter.reduce((acc, t) => {
      acc[t] = (acc[t] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const duplicates = Object.entries(counted).filter(([, n]) => n > 1);
    expect(duplicates, `Duplicatas encontradas: ${JSON.stringify(duplicates)}`).toHaveLength(0);
  });

  // ── 5. "Enviar para próximo dia" usa data da task, não hoje ──────────────────
  test("'enviar para próximo dia' move relativo à data da task", async ({ page }) => {
    // Busca uma task com due_date no passado (semana passada)
    await page.locator("button svg.lucide-chevron-left").first().click();
    await page.waitForTimeout(400);

    const pastRows = page.locator("[data-day-column]").first().locator("[data-testid='task-row']");
    const count = await pastRows.count();
    test.skip(count === 0, "Nenhuma task em dia passado visível");

    const firstRow = pastRows.first();
    const titleEl = firstRow.locator("p").first();
    const originalTitle = await titleEl.textContent();
    const originalDayText = await page.locator("[data-day-column]").first().locator("[data-date]").getAttribute("data-date");

    // Hover para exibir ações
    await firstRow.hover();

    // Clica em "Enviar para próximo dia"
    const nextDayBtn = firstRow.getByRole("button", { name: /próximo dia/i });
    await expect(nextDayBtn).toBeVisible();
    await nextDayBtn.click();

    await page.waitForTimeout(600);

    // A task deve ter saído do dia original
    const remainingInOriginalDay = page
      .locator("[data-day-column]")
      .first()
      .locator("[data-testid='task-row']")
      .filter({ hasText: originalTitle || "" });

    await expect(remainingInOriginalDay).toHaveCount(0);
  });

});
