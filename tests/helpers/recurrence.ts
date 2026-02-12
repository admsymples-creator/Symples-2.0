import { Page, expect } from "@playwright/test";

export function todayKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Navega para a weekly view pessoal */
export async function goToWeeklyView(page: Page) {
  await page.goto("/");
  // Aguarda o card do dia de hoje estar visível
  await page.waitForSelector('[data-day-column]', { timeout: 10000 });
}

/** Cria uma tarefa recorrente diária via UI (QuickTaskAdd no dia atual) */
export async function createDailyRecurringTask(page: Page, title: string) {
  // Abre o input de criação rápida no card de hoje
  const todayColumn = page.locator('[data-day-column]').filter({ has: page.locator('[data-today="true"]') }).first();
  await todayColumn.getByPlaceholder(/tarefa|task/i).click();
  await todayColumn.getByPlaceholder(/tarefa|task/i).fill(title);

  // Seleciona recorrência diária via picker (ajuste o seletor conforme UI real)
  // TODO: ajustar se o fluxo de criação com recorrência for diferente
  await page.keyboard.press("Enter");
}

/** Conta tasks (reais + virtuais) com determinado título no card de hoje */
export async function countTasksOnToday(page: Page, title: string): Promise<number> {
  const todayColumn = page.locator('[data-day-column]').filter({ has: page.locator('[data-today="true"]') }).first();
  return await todayColumn.getByText(title).count();
}

/** Verifica se uma task é virtual (opacidade reduzida) */
export async function isVirtualTask(page: Page, title: string): Promise<boolean> {
  const task = page.locator('[data-day-column]').getByText(title).first();
  const row = task.locator("xpath=ancestor::div[contains(@class,'opacity-50')]");
  return (await row.count()) > 0;
}
