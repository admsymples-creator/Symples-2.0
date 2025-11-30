"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ListFilter, Layers, Calendar, Flag, LayoutGrid, LayoutList } from "lucide-react";

export type ViewOption = "group" | "status" | "date" | "priority";

interface ViewOptionsProps {
  viewOption: ViewOption;
  onViewChange: (view: ViewOption) => void;
}

export function ViewOptions({ viewOption, onViewChange }: ViewOptionsProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          className="h-9 px-3 rounded-lg border-solid border-gray-200 bg-white hover:bg-gray-50 text-sm font-medium text-gray-700 shadow-sm"
        >
          <LayoutList className="w-4 h-4 mr-2 text-gray-500" />
          Agrupar por
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Agrupar tarefas por</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup value={viewOption} onValueChange={(v) => onViewChange(v as ViewOption)}>
          <DropdownMenuRadioItem value="group" className="cursor-pointer">
            <Layers className="w-4 h-4 mr-2 text-gray-500" />
            Personalizado
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="status" className="cursor-pointer">
            <LayoutGrid className="w-4 h-4 mr-2 text-gray-500" />
            Status
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="date" className="cursor-pointer">
            <Calendar className="w-4 h-4 mr-2 text-gray-500" />
            Data
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="priority" className="cursor-pointer">
            <Flag className="w-4 h-4 mr-2 text-gray-500" />
            Prioridade
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

