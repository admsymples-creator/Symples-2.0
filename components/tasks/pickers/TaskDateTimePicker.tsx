"use client";

import React, { useState, useEffect } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, Clock, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface TaskDateTimePickerProps {
    date: Date | null;
    onSelect: (date: Date | null) => void;
    trigger?: React.ReactElement;
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

export function TaskDateTimePicker({
    date,
    onSelect,
    trigger,
    align = "end",
    side = "left",
}: TaskDateTimePickerProps) {
    const [isMounted, setIsMounted] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState<Date | null>(date);
    const [hour, setHour] = useState<number>(date ? date.getHours() : 9);
    const [minute, setMinute] = useState<number>(date ? date.getMinutes() : 0);

    // Garantir que renderiza apenas no cliente para evitar problemas de hidratação
    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Sincronizar estado interno quando date externo muda
    useEffect(() => {
        setSelectedDate(date);
        if (date) {
            setHour(date.getHours());
            setMinute(date.getMinutes());
        }
    }, [date]);

    const handleDateSelect = (newDate: Date | undefined) => {
        if (!newDate) {
            setSelectedDate(null);
            // Também limpar no componente pai
            onSelect(null);
            return;
        }

        // Preservar hora e minuto ao selecionar nova data
        // Se não há data selecionada ainda, usar hora padrão (9:00)
        const currentHour = selectedDate ? hour : 9;
        const currentMinute = selectedDate ? minute : 0;
        const dateWithTime = new Date(newDate);
        dateWithTime.setHours(currentHour, currentMinute, 0, 0);
        setSelectedDate(dateWithTime);
        
        // Atualizar hora/minuto se não havia data antes
        if (!selectedDate) {
            setHour(9);
            setMinute(0);
        }
        
        // Atualizar imediatamente no componente pai quando selecionar data
        // Isso garante que a data esteja disponível mesmo se o usuário não clicar em "Confirmar"
        onSelect(dateWithTime);
    };

    const handleTimeChange = (newHour: number, newMinute: number) => {
        setHour(newHour);
        setMinute(newMinute);
        
        if (selectedDate) {
            const newDate = new Date(selectedDate);
            newDate.setHours(newHour, newMinute, 0, 0);
            setSelectedDate(newDate);
            // Atualizar imediatamente no componente pai quando mudar hora
            onSelect(newDate);
        } else {
            // Se não há data selecionada, criar uma nova com a data atual
            const today = new Date();
            today.setHours(newHour, newMinute, 0, 0);
            setSelectedDate(today);
            onSelect(today);
        }
    };

    const handleConfirm = () => {
        onSelect(selectedDate);
        setIsOpen(false);
    };

    const handleQuickSelect = (quickDate: Date) => {
        // Preservar hora e minuto ao usar atalho
        quickDate.setHours(hour, minute, 0, 0);
        setSelectedDate(quickDate);
        onSelect(quickDate);
        setIsOpen(false);
    };

    const handleClear = () => {
        setSelectedDate(null);
        setHour(9);
        setMinute(0);
        onSelect(null);
        setIsOpen(false);
    };

    // Gerar opções de hora (0-23)
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const minutes = [0, 15, 30, 45];

    // Se não houver children, usar o trigger padrão
    const defaultTrigger = (
        <button
            type="button"
            className={cn(
                "p-1 rounded hover:bg-gray-100 transition-colors flex items-center gap-1",
                date && "text-green-600"
            )}
        >
            {date ? (
                <span className="text-xs text-green-600 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {format(date, "d MMM, HH:mm", { locale: ptBR })}
                </span>
            ) : (
                <CalendarIcon className="size-4 text-gray-400" />
            )}
        </button>
    );

    const triggerElement = React.isValidElement(trigger) ? trigger : defaultTrigger;

    // Renderizar apenas o trigger no servidor para evitar problemas de hidratação
    if (!isMounted) {
        return <>{triggerElement}</>;
    }

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
                        selected={selectedDate || undefined}
                        onSelect={handleDateSelect}
                        locale={ptBR}
                        className="rounded-md border-0"
                    />
                    
                    {/* Time Picker */}
                    <div className="border-t border-gray-200 pt-3">
                        <div className="text-xs font-medium text-gray-700 mb-2 px-2">Hora</div>
                        <div className="flex gap-2 px-2">
                            {/* Hour Selector */}
                            <div className="flex-1">
                                <div className="text-[10px] text-gray-500 mb-1">Hora</div>
                                <div className="flex gap-1">
                                    <select
                                        value={hour}
                                        onChange={(e) => handleTimeChange(parseInt(e.target.value), minute)}
                                        className="flex-1 text-xs border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                    >
                                        {hours.map((h) => (
                                            <option key={h} value={h}>
                                                {String(h).padStart(2, '0')}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            
                            {/* Minute Selector */}
                            <div className="flex-1">
                                <div className="text-[10px] text-gray-500 mb-1">Minuto</div>
                                <div className="flex gap-1">
                                    <select
                                        value={minute}
                                        onChange={(e) => handleTimeChange(hour, parseInt(e.target.value))}
                                        className="flex-1 text-xs border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                    >
                                        {minutes.map((m) => (
                                            <option key={m} value={m}>
                                                {String(m).padStart(2, '0')}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    {/* Botões de ação */}
                    <div className="border-t border-gray-200 pt-2 flex gap-2">
                        {selectedDate && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-xs h-7 flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={handleClear}
                            >
                                <X className="size-3 mr-1" />
                                Remover
                            </Button>
                        )}
                        <Button
                            variant="default"
                            size="sm"
                            className="text-xs h-7 flex-1 bg-green-600 hover:bg-green-700"
                            onClick={handleConfirm}
                        >
                            Confirmar
                        </Button>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}

