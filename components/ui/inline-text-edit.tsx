"use client";

import React, { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

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
                    "h-6 py-0 px-1 bg-white border border-gray-200 focus-visible:ring-2 focus-visible:ring-gray-100 focus-visible:border-gray-300 transition-all shadow-sm text-sm",
                    inputClassName
                )}
                placeholder={placeholder}
                onClick={(e) => e.stopPropagation()} // Impedir clique de propagar para a linha
            />
        );
    }

    return (
        <span
            onClick={(e) => {
                if (!disabled) {
                    e.stopPropagation(); // Impedir clique de abrir modal
                    setIsEditing(true);
                }
            }}
            className={cn(
                "cursor-text truncate rounded px-1 -ml-1 border border-transparent hover:border-gray-200 hover:bg-gray-50 transition-all duration-200",
                disabled && "cursor-default hover:border-transparent hover:bg-transparent",
                className
            )}
            title={tempValue}
        >
            {tempValue || placeholder}
        </span>
    );
}

