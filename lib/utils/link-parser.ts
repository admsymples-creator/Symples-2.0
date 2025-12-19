/**
 * Detecta e extrai URLs e links markdown de um texto
 * Retorna um array de segmentos do texto (texto normal ou links)
 */

export interface TextSegment {
    type: 'text' | 'url' | 'markdown-link';
    content: string;
    url?: string;
    text?: string; // Para markdown links: o texto do link
}

/**
 * Regex para detectar URLs
 * Suporta: http://, https://, www.
 */
const URL_REGEX = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;

/**
 * Regex para detectar links markdown [texto](url)
 */
const MARKDOWN_LINK_REGEX = /\[([^\]]+)\]\(([^)]+)\)/g;

/**
 * Parseia um texto e retorna segmentos com links detectados
 * Prioriza links markdown sobre URLs simples
 */
export function parseLinks(text: string): TextSegment[] {
    if (!text) return [{ type: 'text', content: text }];

    const segments: TextSegment[] = [];
    let lastIndex = 0;
    const markdownMatches: Array<{ start: number; end: number; text: string; url: string }> = [];
    const urlMatches: Array<{ start: number; end: number; url: string }> = [];

    // Primeiro, encontrar todos os links markdown
    let markdownMatch;
    while ((markdownMatch = MARKDOWN_LINK_REGEX.exec(text)) !== null) {
        markdownMatches.push({
            start: markdownMatch.index,
            end: markdownMatch.index + markdownMatch[0].length,
            text: markdownMatch[1],
            url: markdownMatch[2],
        });
    }

    // Depois, encontrar todas as URLs (mas ignorar as que estão dentro de markdown links)
    let urlMatch;
    URL_REGEX.lastIndex = 0; // Reset regex
    while ((urlMatch = URL_REGEX.exec(text)) !== null) {
        const urlStart = urlMatch.index;
        const urlEnd = urlMatch.index + urlMatch[0].length;
        
        // Verificar se esta URL está dentro de um link markdown
        const isInsideMarkdown = markdownMatches.some(
            md => urlStart >= md.start && urlEnd <= md.end
        );
        
        if (!isInsideMarkdown) {
            urlMatches.push({
                start: urlStart,
                end: urlEnd,
                url: urlMatch[0],
            });
        }
    }

    // Combinar e ordenar todos os matches por posição
    const allMatches = [
        ...markdownMatches.map(m => ({ ...m, type: 'markdown' as const })),
        ...urlMatches.map(m => ({ ...m, type: 'url' as const })),
    ].sort((a, b) => a.start - b.start);

    // Construir segmentos
    for (const match of allMatches) {
        // Adicionar texto antes do match
        if (match.start > lastIndex) {
            const textBefore = text.substring(lastIndex, match.start);
            if (textBefore) {
                segments.push({ type: 'text', content: textBefore });
            }
        }

        // Adicionar o match
        if (match.type === 'markdown') {
            const mdMatch = match as typeof match & { text: string; url: string };
            segments.push({
                type: 'markdown-link',
                content: mdMatch.text,
                url: mdMatch.url,
                text: mdMatch.text,
            });
        } else {
            const urlMatch = match as typeof match & { url: string };
            // Normalizar URL (adicionar https:// se começar com www.)
            let normalizedUrl = urlMatch.url;
            if (normalizedUrl.startsWith('www.')) {
                normalizedUrl = 'https://' + normalizedUrl;
            }
            segments.push({
                type: 'url',
                content: urlMatch.url,
                url: normalizedUrl,
            });
        }

        lastIndex = match.end;
    }

    // Adicionar texto restante
    if (lastIndex < text.length) {
        const textAfter = text.substring(lastIndex);
        if (textAfter) {
            segments.push({ type: 'text', content: textAfter });
        }
    }

    // Se não encontrou nenhum link, retornar texto completo
    if (segments.length === 0) {
        return [{ type: 'text', content: text }];
    }

    return segments;
}

