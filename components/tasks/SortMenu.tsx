"use client";

import { useState, useEffect } from "react";
import { useSearchParams, usePathname, useRouter } from "next/navigation";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
    onPersistSortOrder?: () => Promise<void>;
}

const sortOptions: { value: SortOption; label: string }[] = [
    { value: "position", label: "Nada aplicado" },
    { value: "status", label: "Status" },
    { value: "priority", label: "Prioridade" },
    { value: "assignee", label: "Responsável" },
    { value: "title", label: "Título (A-Z)" },
];

export function SortMenu({ className, onPersistSortOrder }: SortMenuProps) {
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const router = useRouter();

    // Estado Real (URL)
    const currentSort = (searchParams.get("sort") as SortOption) || "position";

    // Estado Local (Seleção Visual)
    const [localSort, setLocalSort] = useState<SortOption>(currentSort);
    const [isOpen, setIsOpen] = useState(false);

    // Sincronizar
    useEffect(() => {
        const urlSort = (searchParams.get("sort") as SortOption) || "position";
        setLocalSort(urlSort);
    }, [searchParams]);

    const hasActiveSort = currentSort !== "position";
    const hasPendingChange = localSort !== currentSort;

    const handleApply = async () => {
        const params = new URLSearchParams(searchParams.toString());

        if (localSort === "position") {
            params.delete("sort");
        } else {
            params.set("sort", localSort);
        }

        const newUrl = params.toString()
            ? `${pathname}?${params.toString()}`
            : pathname;

        router.push(newUrl);
        setIsOpen(false);

        if (onPersistSortOrder && localSort !== "position") {
            setTimeout(async () => {
                await onPersistSortOrder();
            }, 200);
        }
    };


    const getCurrentLabel = () => {
        const option = sortOptions.find(opt => opt.value === currentSort);
        return option?.label || "Ordenar";
    };

    return (
        <div className="flex items-center gap-1">
            <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="outline"
                        size="sm"
                        className={cn(
                            "h-9 px-3 border-dashed transition-all",
                            hasActiveSort
                                ? "bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                                : "text-gray-600 border-gray-300 hover:bg-gray-50",
                            className
                        )}
                    >
                        <div className="flex items-center gap-2">
                            <ArrowUpDown className={cn("w-4 h-4", hasActiveSort ? "text-green-600" : "text-gray-500")} />
                            <span>Ordenar</span>
                            {hasActiveSort && (
                                <>
                                    <div className="mx-2 h-4 w-[1px] bg-green-200" />
                                    <Badge
                                        variant="secondary"
                                        className="h-5 px-1.5 text-[10px] font-medium bg-white text-green-700 hover:bg-white"
                                    >
                                        {getCurrentLabel()}
                                    </Badge>
                                </>
                            )}
                        </div>
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
                                value={localSort} 
                                onValueChange={(val) => setLocalSort(val as SortOption)}
                            >
                                {sortOptions.map((option) => (
                                    <DropdownMenuRadioItem
                                        key={option.value}
                                        value={option.value}
                                        onSelect={(e) => e.preventDefault()} // Impede fechar ao clicar
                                        className="cursor-pointer"
                                    >
                                        {option.label}
                                    </DropdownMenuRadioItem>
                                ))}
                            </DropdownMenuRadioGroup>
                        </div>
                    </div>

                    <DropdownMenuSeparator className="flex-shrink-0" />

                    <div className="flex-shrink-0 bg-popover border-t p-2 flex items-center justify-end gap-2">
                        <Button
                            onClick={handleApply}
                            size="sm"
                            disabled={!hasPendingChange}
                            className={cn(
                                "h-8 px-4 text-sm font-medium transition-all",
                                hasPendingChange
                                    ? "bg-[#22C55E] hover:bg-[#16a34a] text-white shadow-sm"
                                    : "bg-gray-100 text-gray-400 cursor-not-allowed"
                            )}
                        >
                            {hasActiveSort && !hasPendingChange ? "Aplicado" : "Aplicar"}
                        </Button>
                    </div>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}