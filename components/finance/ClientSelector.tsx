"use client";

import React, { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
} from "@/components/ui/command";
import { Building2, Plus, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { getClients } from "@/lib/actions/clients";
import { createClient } from "@/lib/actions/finance";

interface Client {
    id: string;
    name: string;
}

interface ClientSelectorProps {
    clientId: string | null;
    onSelect: (clientId: string | null) => void;
    workspaceId?: string | null;
    trigger?: React.ReactElement;
    align?: "start" | "center" | "end";
    side?: "top" | "bottom" | "left" | "right";
    disabled?: boolean;
    triggerClassName?: string;
}

export function ClientSelector({
    clientId,
    onSelect,
    workspaceId = null,
    trigger,
    align = "start",
    side = "bottom",
    disabled = false,
    triggerClassName
}: ClientSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [clients, setClients] = useState<Client[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [hasLoaded, setHasLoaded] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [isCreating, setIsCreating] = useState(false);

    const handleOpenChange = async (open: boolean) => {
        console.log("[ClientSelector] handleOpenChange:", { open, hasLoaded, workspaceId });
        setIsOpen(open);
        
        if (open && !hasLoaded && workspaceId) {
            console.log("[ClientSelector] Iniciando carregamento de clientes...");
            setIsLoading(true);
            try {
                const data = await getClients(workspaceId);
                console.log("[ClientSelector] Clientes carregados:", data);
                setClients(data.map(c => ({ id: c.id, name: c.name })));
                setHasLoaded(true);
            } catch (error) {
                console.error("[ClientSelector] Erro ao carregar clientes:", error);
            } finally {
                setIsLoading(false);
            }
        } else {
            console.log("[ClientSelector] Não carregando clientes. Motivo:", {
                isAlreadyLoaded: hasLoaded,
                noWorkspaceId: !workspaceId,
                notOpening: !open
            });
        }
    };

    const handleSelect = (id: string | null) => {
        onSelect(id);
        setIsOpen(false);
    };

    const handleCreateClient = async () => {
        if (!searchTerm || !workspaceId) return;
        
        setIsCreating(true);
        try {
            const result = await createClient({
                workspaceId,
                name: searchTerm
            });
            
            if (result.success && result.client) {
                const newClient = { id: result.client.id, name: result.client.name };
                setClients([...clients, newClient]);
                onSelect(newClient.id);
                setIsOpen(false);
                setSearchTerm("");
            }
        } catch (error) {
            console.error("Erro ao criar cliente:", error);
        } finally {
            setIsCreating(false);
        }
    };

    const selectedClient = clients.find(c => c.id === clientId);

    // Trigger padrão
    const defaultTrigger = (
        <button
            type="button"
            disabled={disabled}
            className={cn(
                "flex items-center gap-2 text-sm transition-colors min-h-[24px]",
                // Estilos base
                !triggerClassName && "px-2 py-1 rounded-md",
                !triggerClassName && (clientId 
                    ? "text-gray-700 bg-gray-100 hover:bg-gray-200" 
                    : "text-gray-500 hover:bg-gray-100"),
                disabled && "opacity-50 cursor-not-allowed",
                // Classe personalizada
                triggerClassName
            )}
        >
            <span className="truncate">
                {selectedClient ? selectedClient.name : "Selecionar Cliente"}
            </span>
        </button>
    );

    const triggerElement = React.isValidElement(trigger) ? trigger : defaultTrigger;

    const filteredClients = clients.filter(client => 
        client.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const showCreateOption = searchTerm && !filteredClients.some(c => c.name.toLowerCase() === searchTerm.toLowerCase());

    return (
        <Popover open={isOpen} onOpenChange={handleOpenChange}>
            <PopoverTrigger asChild>
                {triggerElement}
            </PopoverTrigger>
            <PopoverContent className="p-0 w-[200px]" align={align} side={side}>
                <Command>
                    <CommandInput 
                        placeholder="Buscar cliente..." 
                        value={searchTerm}
                        onValueChange={setSearchTerm}
                    />
                    <CommandList>
                        {isLoading ? (
                            <div className="py-6 text-center text-sm text-gray-500">
                                Carregando...
                            </div>
                        ) : (
                            <>
                                <CommandEmpty className="py-2 text-center text-sm text-gray-500">
                                    {!showCreateOption ? "Nenhum cliente encontrado." : null}
                                </CommandEmpty>
                                
                                <CommandGroup>
                                    <CommandItem
                                        onSelect={() => handleSelect(null)}
                                        className="text-gray-500"
                                    >
                                        <div className="mr-2 flex h-4 w-4 items-center justify-center">
                                            {!clientId && <Check className="h-4 w-4 opacity-100" />}
                                        </div>
                                        Sem cliente
                                    </CommandItem>
                                    {filteredClients.map((client) => (
                                        <CommandItem
                                            key={client.id}
                                            onSelect={() => handleSelect(client.id)}
                                        >
                                            <div className="mr-2 flex h-4 w-4 items-center justify-center">
                                                {clientId === client.id && <Check className="h-4 w-4 opacity-100" />}
                                            </div>
                                            {client.name}
                                        </CommandItem>
                                    ))}
                                </CommandGroup>

                                {showCreateOption && !isLoading && (
                                    <>
                                        <CommandSeparator />
                                        <CommandGroup>
                                            <CommandItem
                                                onSelect={handleCreateClient}
                                                className="cursor-pointer text-green-600 font-medium"
                                            >
                                                <Plus className="mr-2 h-4 w-4" />
                                                Criar "{searchTerm}"
                                            </CommandItem>
                                        </CommandGroup>
                                    </>
                                )}
                            </>
                        )}
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
