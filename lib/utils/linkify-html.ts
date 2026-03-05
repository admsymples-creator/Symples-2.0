/**
 * Processa HTML e converte URLs em links clicáveis azuis
 * Preserva todo o resto do HTML (tags, formatação, etc.)
 */

const URL_REGEX = /(https?:\/\/[^\s<>"']+|www\.[^\s<>"']+)/gi;
const MARKDOWN_LINK_REGEX = /\[([^\]]+)\]\(([^)]+)\)/g;

/**
 * Converte URLs em HTML para tags <a> azuis
 * Preserva todo o resto do HTML
 * Também garante que links existentes fiquem azuis
 */
export function linkifyHtml(html: string): string {
    if (!html) return html;

    // Primeiro, garantir que todos os links <a> existentes tenham a cor azul
    let processed = html.replace(/<a\s+([^>]*)>/gi, (match: string, attributes: string) => {
        // Verificar se já tem class ou style
        const hasClass = /class\s*=/i.test(attributes);
        const hasStyle = /style\s*=/i.test(attributes);
        
        let newAttributes = attributes;
        
        // Adicionar ou atualizar class
        if (hasClass) {
            newAttributes = newAttributes.replace(/class\s*=\s*["']([^"']*)["']/i, (m: string, classes: string) => {
                if (!classes.includes('text-blue-600')) {
                    return `class="${classes} text-blue-600 hover:text-blue-800 hover:underline"`;
                }
                return m;
            });
        } else {
            newAttributes += ' class="text-blue-600 hover:text-blue-800 hover:underline"';
        }
        
        // Adicionar ou atualizar style para garantir cor azul
        if (hasStyle) {
            newAttributes = newAttributes.replace(/style\s*=\s*["']([^"']*)["']/i, (m: string, styles: string) => {
                if (!styles.includes('color:')) {
                    return `style="${styles}; color: #2563eb !important;"`;
                } else if (!styles.includes('#2563eb') && !styles.includes('rgb(37, 99, 235)')) {
                    return `style="${styles.replace(/color\s*:\s*[^;]+/gi, 'color: #2563eb !important')}"`;
                }
                return m;
            });
        } else {
            newAttributes += ' style="color: #2563eb !important;"';
        }
        
        // Garantir target e rel
        if (!/target\s*=/i.test(newAttributes)) {
            newAttributes += ' target="_blank"';
        }
        if (!/rel\s*=/i.test(newAttributes)) {
            newAttributes += ' rel="noopener noreferrer"';
        }
        
        return `<a ${newAttributes}>`;
    });

    // Processar links markdown [texto](url)
    processed = processed.replace(MARKDOWN_LINK_REGEX, (match: string, text: string, url: string) => {
        return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 hover:underline" style="color: #2563eb !important;">${text}</a>`;
    });

    // Processar URLs simples (mas não dentro de tags <a> existentes ou dentro de atributos HTML)
    const parts: string[] = [];
    let lastIndex = 0;
    let match;

    // Reset regex
    URL_REGEX.lastIndex = 0;

    while ((match = URL_REGEX.exec(processed)) !== null) {
        const url = match[0];
        const matchIndex = match.index;

        // Adicionar texto antes do match
        if (matchIndex > lastIndex) {
            parts.push(processed.substring(lastIndex, matchIndex));
        }

        // Verificar se está dentro de uma tag HTML ou atributo
        const before = processed.substring(0, matchIndex);
        
        // Verificar se está dentro de uma tag <a> existente
        const openATags = (before.match(/<a\s[^>]*>/gi) || []).length;
        const closeATags = (before.match(/<\/a>/gi) || []).length;
        
        // Verificar se está dentro de qualquer tag HTML (atributo)
        const lastOpenTag = before.lastIndexOf('<');
        const lastCloseTag = before.lastIndexOf('>');
        const isInsideTag = lastOpenTag > lastCloseTag;

        // Se está dentro de uma tag <a> ou dentro de qualquer tag HTML, não processar
        if (openATags > closeATags || isInsideTag) {
            parts.push(url);
        } else {
            // Normalizar URL
            let normalizedUrl = url;
            if (normalizedUrl.startsWith('www.')) {
                normalizedUrl = 'https://' + normalizedUrl;
            }

            parts.push(`<a href="${normalizedUrl}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 hover:underline" style="color: #2563eb !important;">${url}</a>`);
        }

        lastIndex = URL_REGEX.lastIndex;
    }

    // Adicionar texto restante
    if (lastIndex < processed.length) {
        parts.push(processed.substring(lastIndex));
    }

    return parts.length > 0 ? parts.join('') : processed;
}

