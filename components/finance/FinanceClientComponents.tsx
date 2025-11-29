"use client";

import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PlusCircle, Calendar } from "lucide-react";
import { CreateTransactionModal } from "@/components/finance/CreateTransactionModal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function NewTransactionButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        className="bg-green-600 hover:bg-green-700 text-white shadow-sm h-10"
        onClick={() => setIsOpen(true)}
      >
        <PlusCircle className="w-4 h-4 mr-2" />
        <span className="hidden sm:inline">Nova Transação</span>
        <span className="sm:hidden">Novo</span>
      </Button>

      <CreateTransactionModal open={isOpen} onOpenChange={setIsOpen} />
    </>
  );
}

export function MonthSelector() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Default to current month/year if not present
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  
  const monthParam = searchParams.get("month");
  const yearParam = searchParams.get("year");

  const selectedValue = monthParam && yearParam 
    ? `${monthParam}-${yearParam}` 
    : `${currentMonth}-${currentYear}`;

  const handleValueChange = (value: string) => {
    const [month, year] = value.split("-");
    const params = new URLSearchParams(searchParams);
    params.set("month", month);
    params.set("year", year);
    router.push(`?${params.toString()}`);
  };

  return (
    <Select value={selectedValue} onValueChange={handleValueChange}>
      <SelectTrigger className="w-[180px] bg-white">
        <SelectValue placeholder="Selecione o mês" />
      </SelectTrigger>
      <SelectContent>
        {/* Gerar opções dinamicamente seria ideal, mas vou colocar hardcoded + lógica básica por agora conforme o mock anterior */}
        <SelectItem value="10-2025">Outubro 2025</SelectItem>
        <SelectItem value="11-2025">Novembro 2025</SelectItem>
        <SelectItem value="12-2025">Dezembro 2025</SelectItem>
        <SelectItem value="1-2026">Janeiro 2026</SelectItem>
      </SelectContent>
    </Select>
  );
}



