"use client";

import { Calendar, List, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type CalendarViewType = "dayGridMonth" | "timeGridWeek" | "listDay";

interface CalendarViewMenuProps {
  currentView: CalendarViewType;
  onViewChange: (view: CalendarViewType) => void;
}

const viewOptions: { value: CalendarViewType; label: string; icon: React.ReactNode }[] = [
  { value: "dayGridMonth", label: "Mês", icon: <Calendar className="w-4 h-4" /> },
  { value: "timeGridWeek", label: "Semana", icon: <LayoutGrid className="w-4 h-4" /> },
  { value: "listDay", label: "Lista", icon: <List className="w-4 h-4" /> },
];

export function CalendarViewMenu({ currentView, onViewChange }: CalendarViewMenuProps) {
  const currentOption = viewOptions.find(opt => opt.value === currentView);
  const hasActiveView = currentView !== "dayGridMonth";

  return (
    <div className="flex items-center gap-1">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon" 
            title={currentOption?.label ? `Visualização (${currentOption.label})` : "Visualização"}
            className={cn(
              "h-9 w-9 transition-all flex items-center justify-center",
              hasActiveView 
                ? "text-green-700 hover:text-green-800 hover:bg-green-50" 
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
            )}
          >
            {currentOption?.icon && (
              <span className={cn(hasActiveView ? "text-green-600" : "text-gray-500")}>
                {currentOption.icon}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent className="w-48" align="start">
          <DropdownMenuLabel className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            VISUALIZAÇÃO
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          <DropdownMenuRadioGroup value={currentView} onValueChange={(val) => onViewChange(val as CalendarViewType)}>
            {viewOptions.map((option) => (
              <DropdownMenuRadioItem key={option.value} value={option.value} className="cursor-pointer">
                <div className="flex items-center gap-2">
                  {option.icon}
                  <span>{option.label}</span>
                </div>
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}







