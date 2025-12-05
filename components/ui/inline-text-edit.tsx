"use client";

import React, { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Pencil } from "lucide-react";

interface InlineTextEditProps {
    value: string;
    onSave: (newValue: string) => void;
    className?: string;
    inputClassName?: string;
    placeholder?: string;
    disabled?: boolean;
}

export function InlineTextEdit({
    value,
    onSave,
    className,
    inputClassName,
    placeholder = "Sem título",
    disabled = false,
}: InlineTextEditProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [tempValue, setTempValue] = useState(value);
    const inputRef = useRef<HTMLInputElement>(null);

    // Atualizar tempValue quando a prop value mudar externamente (apenas se não estiver editando)
    useEffect(() => {
        if (!isEditing) {
            setTempValue(value);
        }
    }, [value, isEditing]);

    // Auto-focus quando entrar em modo de edição
    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select(); // Selecionar todo o texto para edição rápida
        }
    }, [isEditing]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            e.preventDefault();
            handleSave();
        } else if (e.key === "Escape") {
            e.preventDefault();
            cancelEdit();
        }
    };

    const handleSave = () => {
        if (tempValue.trim() !== value) {
            onSave(tempValue.trim());
        }
        setIsEditing(false);
    };

    const cancelEdit = () => {
        setTempValue(value);
        setIsEditing(false);
    };

    if (isEditing && !disabled) {
        return (
            <Input
                ref={inputRef}
                value={tempValue}
                onChange={(e) => setTempValue(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={handleSave}
                className={cn(
                    "h-auto py-0 px-1 bg-transparent border-0 focus-visible:ring-0 transition-colors text-sm rounded-none",
                    "focus-visible:outline-none focus-visible:shadow-none focus-visible:border-0",
                    inputClassName
                )}
                placeholder={placeholder}
                onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                }}
                onMouseDown={(e) => {
                    e.stopPropagation();
                }}
            />
        );
    }

    return (
        <div className="flex items-center gap-1.5 group/title">
            <span
                data-inline-edit="true"
                onClick={(e) => {
                    if (!disabled) {
                        e.stopPropagation(); // Impedir clique de abrir modal
                        e.preventDefault();
                        setIsEditing(true);
                    }
                }}
                onMouseDown={(e) => {
                    if (!disabled) {
                        e.stopPropagation(); // Impedir também no mousedown
                        e.preventDefault();
                    }
                }}
                className={cn(
                    "cursor-text truncate",
                    disabled && "cursor-default",
                    className
                )}
                title={tempValue}
            >
                {tempValue || placeholder}
            </span>
            {!disabled && (
                <Pencil 
                    className="w-3 h-3 text-gray-400 opacity-0 group-hover/title:opacity-100 transition-opacity cursor-pointer flex-shrink-0"
                    onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        setIsEditing(true);
                    }}
                    onMouseDown={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                    }}
                />
            )}
        </div>
    );
}

