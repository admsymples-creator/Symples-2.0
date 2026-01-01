import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDateDisplay(dateString: string | Date | null | undefined): string {
  if (!dateString) return ""

  const date = new Date(dateString)

  // Usar timezone local (padrão) para exibir datas corretamente
  return new Intl.DateTimeFormat("pt-BR", {
    day: "numeric",
    month: "short",
  }).format(date)
}
