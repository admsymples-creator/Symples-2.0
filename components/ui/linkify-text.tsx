"use client";

import { parseLinks, TextSegment } from "@/lib/utils/link-parser";
import { cn } from "@/lib/utils";

interface LinkifyTextProps {
    text: string;
    className?: string;
    linkClassName?: string;
}

/**
 * Componente que renderiza texto com links clicáveis
 * Detecta automaticamente URLs e links markdown
 */
export function LinkifyText({ text, className, linkClassName }: LinkifyTextProps) {
    if (!text) return null;

    const segments = parseLinks(text);

    return (
        <span className={className}>
            {segments.map((segment, index) => {
                if (segment.type === 'text') {
                    return <span key={index}>{segment.content}</span>;
                }

                if (segment.type === 'url' || segment.type === 'markdown-link') {
                    const url = segment.url || segment.content;
                    const displayText = segment.type === 'markdown-link' ? segment.text || segment.content : segment.content;

                    return (
                        <a
                            key={index}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={cn(
                                "text-blue-600 hover:text-blue-800 hover:underline",
                                linkClassName
                            )}
                            onClick={(e) => e.stopPropagation()}
                        >
                            {displayText}
                        </a>
                    );
                }

                return <span key={index}>{segment.content}</span>;
            })}
        </span>
    );
}

