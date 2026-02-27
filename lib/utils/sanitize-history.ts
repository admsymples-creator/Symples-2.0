export interface MessageForHistory {
  role: string;
  content: string;
  isThinking?: boolean;
  isContextDivider?: boolean;
  componentData?: Record<string, unknown> | null;
}

/**
 * Sanitiza o histórico de mensagens antes de enviar à API da IA.
 * - Corta a partir do último divisor de contexto (se houver)
 * - Remove mensagens de "thinking" e de sistema
 * - Injeta contexto de componentes quando content está vazio
 * - Limita às últimas `limit` mensagens
 */
export function sanitizeHistory(
  messages: MessageForHistory[],
  limit = 15
): Array<{ role: string; content: string }> {
  // 1. Encontrar o índice do último divisor de contexto
  let contextCutoffIndex = -1;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].isContextDivider === true) {
      contextCutoffIndex = i;
      break;
    }
  }

  // 2. Filtrar mensagens após o divisor (ou todas se não houver divisor)
  const messagesAfterDivider =
    contextCutoffIndex >= 0 ? messages.slice(contextCutoffIndex + 1) : messages;

  // 3. Aplicar filtros e transformações
  return messagesAfterDivider
    .filter((msg) => {
      if (msg.isThinking === true) return false;
      if (msg.role === "system" && !msg.isContextDivider) return false;
      return true;
    })
    .map((msg) => {
      if (!msg.content && msg.componentData) {
        const componentType = (msg.componentData as Record<string, unknown>).type ?? "unknown";
        const componentDataInner =
          (msg.componentData as Record<string, unknown>).data ?? {};
        return {
          role: msg.role,
          content: `[Sistema: Exibi um componente do tipo ${componentType} com os dados: ${JSON.stringify(componentDataInner)}]`,
        };
      }
      return { role: msg.role, content: msg.content || "" };
    })
    .filter((msg) => msg.content.trim().length > 0)
    .slice(-limit);
}
