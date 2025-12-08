import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDateDisplay(dateString: string | Date | null | undefined): string {
  if (!dateString) return ""

  const date = new Date(dateString)

  // Força leitura em UTC para evitar deslocamentos locais (ex.: GMT-3)
  return new Intl.DateTimeFormat("pt-BR", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(date)
}
