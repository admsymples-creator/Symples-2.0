export type FinanceCategoryOption = {
  value: string;
  label: string;
};

const uniqueByValue = (items: FinanceCategoryOption[]) => {
  const seen = new Set<string>();
  const result: FinanceCategoryOption[] = [];

  for (const item of items) {
    if (seen.has(item.value)) continue;
    seen.add(item.value);
    result.push(item);
  }

  return result;
};

const LEGACY_CATEGORIES: FinanceCategoryOption[] = [
  { value: "Geral", label: "Geral" },
  { value: "marketing", label: "Marketing" },
  { value: "services", label: "Serviços" },
  { value: "software", label: "Software" },
  { value: "infrastructure", label: "Infraestrutura" },
  { value: "salary", label: "Salários" },
  { value: "personal", label: "Pessoal" },
  { value: "other", label: "Outros" },
];

const DIGITAL_INCOME_CATEGORIES: FinanceCategoryOption[] = [
  { value: "sales", label: "Vendas" },
  { value: "subscriptions", label: "Assinaturas" },
  { value: "affiliates", label: "Afiliados" },
  { value: "ads", label: "Publicidade/Adsense" },
  { value: "sponsorships", label: "Patrocínios" },
  { value: "launches", label: "Lançamentos" },
  { value: "consulting", label: "Consultoria" },
  { value: "royalties", label: "Royalties" },
  { value: "services", label: "Serviços" },
  { value: "other", label: "Outros" },
];

const DIGITAL_EXPENSE_CATEGORIES: FinanceCategoryOption[] = [
  { value: "traffic", label: "Tráfego pago" },
  { value: "marketing", label: "Marketing" },
  { value: "tools", label: "Ferramentas" },
  { value: "software", label: "Software" },
  { value: "platforms", label: "Plataformas" },
  { value: "services", label: "Serviços" },
  { value: "freelancers", label: "Freelancers" },
  { value: "salary", label: "Equipe/Salários" },
  { value: "infrastructure", label: "Infraestrutura" },
  { value: "taxes", label: "Impostos e taxas" },
  { value: "education", label: "Educação" },
  { value: "operational", label: "Operacional" },
  { value: "personal", label: "Pessoal" },
  { value: "Geral", label: "Geral" },
  { value: "other", label: "Outros" },
];

export const INCOME_CATEGORIES = uniqueByValue([
  ...DIGITAL_INCOME_CATEGORIES,
  ...LEGACY_CATEGORIES,
]);

export const EXPENSE_CATEGORIES = uniqueByValue([
  ...DIGITAL_EXPENSE_CATEGORIES,
  ...LEGACY_CATEGORIES,
]);

export const DEFAULT_INCOME_CATEGORY = "other";
export const DEFAULT_EXPENSE_CATEGORY = "Geral";
