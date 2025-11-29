"use client";

import React, { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface TaskDatePickerProps {
    date: Date | null;
    onSelect: (date: Date | null) => void;
    trigger?: React.ReactElement; // Trigger customizado - deve ser um único elemento React válido
    align?: "start" | "center" | "end";
    side?: "top" | "bottom" | "left" | "right";
}

// Funções utilitárias para atalhos
const getToday = (): Date => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
};

const getTomorrow = (): Date => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow;
};

const getNextWeek = (): Date => {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    nextWeek.setHours(0, 0, 0, 0);
    return nextWeek;
};

export function TaskDatePicker({
    date,
    onSelect,
    trigger,
    align = "end",
    side = "left",
}: TaskDatePickerProps) {
    const [isOpen, setIsOpen] = useState(false);

    const handleSelect = (selectedDate: Date | undefined) => {
        onSelect(selectedDate || null);
        setIsOpen(false);
    };

    const handleQuickSelect = (quickDate: Date) => {
        onSelect(quickDate);
        setIsOpen(false);
    };

    const handleClear = () => {
        onSelect(null);
        setIsOpen(false);
    };

    // Se não houver children, usar o trigger padrão
    const defaultTrigger = (
        <button
            type="button"
            className={cn(
                "p-1 rounded hover:bg-gray-100 transition-colors",
                date && "text-green-600"
            )}
        >
            {date ? (
                <span className="text-xs text-green-600">
                    {format(date, "d MMM", { locale: ptBR })}
                </span>
            ) : (
                <CalendarIcon className="size-4 text-gray-400" />
            )}
        </button>
    );

    // Garantir que sempre temos um único elemento válido ANTES de renderizar
    const triggerElement = React.isValidElement(trigger) ? trigger : defaultTrigger;

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                {triggerElement}
            </PopoverTrigger>
            <PopoverContent className="p-0 w-auto rounded-xl" align={align} side={side}>
                <div className="p-4 space-y-3">
                    {/* Atalhos Rápidos */}
                    <div className="flex gap-2 px-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs h-7 flex-1"
                            onClick={() => handleQuickSelect(getToday())}
                        >
                            Hoje
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs h-7 flex-1"
                            onClick={() => handleQuickSelect(getTomorrow())}
                        >
                            Amanhã
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs h-7 flex-1"
                            onClick={() => handleQuickSelect(getNextWeek())}
                        >
                            Próxima Semana
                        </Button>
                    </div>
                    <div className="border-t border-gray-200" />
                    {/* Calendar */}
                    <Calendar
                        mode="single"
                        selected={date || undefined}
                        onSelect={handleSelect}
                        locale={ptBR}
                        className="rounded-md border-0"
                    />
                    {/* Botão para limpar */}
                    {date && (
                        <>
                            <div className="border-t border-gray-200" />
                            <div className="px-2 pb-1">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-xs h-7 w-full text-red-600 hover:text-red-700 hover:bg-red-50 transition-colors duration-200"
                                    onClick={handleClear}
                                >
                                    <X className="size-3 mr-1" />
                                    Remover data
                                </Button>
                            </div>
                        </>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
}

