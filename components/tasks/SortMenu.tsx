"use client";

import { useState, useEffect } from "react";
import { useSearchParams, usePathname, useRouter } from "next/navigation";
import { ArrowUpDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
    DropdownMenuLabel,
    DropdownMenuRadioGroup, // Importado RadioGroup
    DropdownMenuRadioItem,  // Importado RadioItem (Círculo)
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export type SortOption = "status" | "priority" | "assignee" | "title" | "position";

interface SortMenuProps {
    className?: string;
    /** Valor controlado pelo pai: UI atualiza na hora, URL em segundo plano */
    sortBy?: SortOption;
    onSortChange?: (value: SortOption) => void;
    onPersistSortOrder?: () => Promise<void>;
}

const sortOptions: { value: SortOption; label: string }[] = [
    { value: "position", label: "Nada aplicado" },
    { value: "status", label: "Status" },
    { value: "priority", label: "Prioridade" },
    { value: "assignee", label: "Responsável" },
    { value: "title", label: "Título (A-Z)" },
];

export function SortMenu({ className, sortBy: controlledSort, onSortChange, onPersistSortOrder }: SortMenuProps) {
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const router = useRouter();

    const currentSort = (controlledSort ?? (searchParams.get("sort") as SortOption) ?? "position") as SortOption;

    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        setIsOpen(false);
    }, [searchParams, controlledSort]);

    const hasActiveSort = currentSort !== "position";
    const handleClear = () => {
        if (onSortChange) {
            onSortChange("position");
            setIsOpen(false);
            return;
        }
        const params = new URLSearchParams(searchParams.toString());
        params.delete("sort");
        const newUrl = params.toString()
            ? `${pathname}?${params.toString()}`
            : pathname;
        router.push(newUrl);
        setIsOpen(false);
    };

    const handleSortChange = (value: SortOption) => {
        if (onSortChange) {
            onSortChange(value);
            setIsOpen(false);
            return;
        }
        const params = new URLSearchParams(searchParams.toString());
        if (value === "position") {
            params.delete("sort");
        } else {
            params.set("sort", value);
        }
        const newUrl = params.toString()
            ? `${pathname}?${params.toString()}`
            : pathname;
        router.push(newUrl);
        setIsOpen(false);
    };

    const getCurrentLabel = () => {
        const option = sortOptions.find(opt => opt.value === currentSort);
        return option?.label || "Ordenar";
    };

    return (
        <div className="flex items-center gap-1">
            {hasActiveSort && (
                <div className="flex items-center gap-1 rounded-full border border-green-200 bg-green-50 px-2 py-1 text-xs font-medium text-green-700">
                    <span>{getCurrentLabel()}</span>
                    <button
                        type="button"
                        onClick={handleClear}
                        className="ml-1 rounded-full p-0.5 text-green-600 hover:text-green-800 hover:bg-green-100"
                        title="Limpar ordenacao"
                    >
                        <X className="h-3 w-3" />
                    </button>
                </div>
            )}
            <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        title={hasActiveSort ? `Ordenar (${getCurrentLabel()})` : "Ordenar"}
                        className={cn(
                            "h-9 w-9 transition-all flex items-center justify-center",
                            hasActiveSort
                                ? "text-green-700 hover:text-green-800 hover:bg-green-50"
                                : "text-gray-600 hover:text-gray-900 hover:bg-gray-50",
                            className
                        )}
                    >
                        <ArrowUpDown className={cn("w-4 h-4", hasActiveSort ? "text-green-600" : "text-gray-500")} />
                    </Button>
                </DropdownMenuTrigger>
                
                <DropdownMenuContent
                    align="end"
                    className="w-56 p-0 flex flex-col max-h-[400px]"
                    onCloseAutoFocus={(e) => e.preventDefault()}
                >
                    <DropdownMenuLabel className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        ORDENAR POR
                    </DropdownMenuLabel>
                    
                    <DropdownMenuSeparator />

                    <div className="flex-1 overflow-y-auto min-h-0">
                        <div className="p-1">
                            {/* MUDANÇA AQUI: Usando RadioGroup para garantir o círculo (Dot)
                               O 'value' controla qual bolinha está preenchida
                               O 'onValueChange' atualiza apenas o estado local (sem aplicar)
                            */}
                            <DropdownMenuRadioGroup 
                                value={currentSort} 
                                onValueChange={(val) => handleSortChange(val as SortOption)}
                            >
                                {sortOptions.map((option) => (
                                    <DropdownMenuRadioItem
                                        key={option.value}
                                        value={option.value}
                                        className="cursor-pointer"
                                    >
                                        {option.label}
                                    </DropdownMenuRadioItem>
                                ))}
                            </DropdownMenuRadioGroup>
                        </div>
                    </div>

                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}
