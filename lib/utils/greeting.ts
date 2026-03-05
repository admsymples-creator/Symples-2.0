/**
 * Gera uma saudação dinâmica baseada no horário do dia
 * @param userName Nome completo do usuário (opcional)
 * @returns Objeto com a saudação e o primeiro nome do usuário
 */
export function getGreeting(userName?: string | null): { greeting: string; name: string } {
  const hour = new Date().getHours();
  let greeting = "";
  
  if (hour >= 5 && hour < 12) {
    greeting = "Bom dia";
  } else if (hour >= 12 && hour < 18) {
    greeting = "Boa tarde";
  } else {
    greeting = "Boa noite";
  }
  
  // Extrair primeiro nome do usuário ou usar "Usuário" como fallback
  const firstName = userName?.split(" ")[0]?.trim() || "Usuário";
  return { greeting, name: firstName };
}

