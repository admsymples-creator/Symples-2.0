"use client";

import React, { useState, useEffect } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import { Avatar } from "../Avatar";
import { User } from "lucide-react";
import { cn } from "@/lib/utils";
import { getWorkspaceMembers } from "@/lib/actions/tasks";

interface Member {
    id: string;
    name: string;
    avatar?: string;
}

interface TaskAssigneePickerProps {
    assigneeId: string | null;
    onSelect: (assigneeId: string | null) => void;
    workspaceId?: string | null;
    members?: Member[]; // Opcional: se não fornecido, busca automaticamente
    trigger?: React.ReactElement; // Trigger customizado - deve ser um único elemento React válido
    align?: "start" | "center" | "end";
    side?: "top" | "bottom" | "left" | "right";
}

export function TaskAssigneePicker({
    assigneeId,
    onSelect,
    workspaceId = null,
    members: providedMembers,
    trigger,
    align = "start",
    side = "bottom",
}: TaskAssigneePickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [members, setMembers] = useState<Member[]>(providedMembers || []);
    const [isLoading, setIsLoading] = useState(!providedMembers);

    // Buscar membros se não foram fornecidos
    useEffect(() => {
        if (providedMembers) {
            setMembers(providedMembers);
            return;
        }

        const loadMembers = async () => {
            setIsLoading(true);
            try {
                const workspaceMembers = await getWorkspaceMembers(workspaceId);
                const mappedMembers: Member[] = workspaceMembers.map((m: any) => ({
                    id: m.id,
                    name: m.full_name || m.email || "Usuário",
                    avatar: m.avatar_url || undefined,
                }));
                setMembers(mappedMembers);
            } catch (error) {
                console.error("Erro ao carregar membros:", error);
            } finally {
                setIsLoading(false);
            }
        };

        loadMembers();
    }, [workspaceId, providedMembers]);

    const selectedMember = members.find((m) => m.id === assigneeId);

    const handleSelect = (memberId: string | null) => {
        onSelect(memberId);
        setIsOpen(false);
    };

    // Trigger padrão se não houver children
    const defaultTrigger = (
        <button
            type="button"
            className={cn(
                "p-1 rounded hover:bg-gray-100 transition-colors",
                assigneeId && "text-green-600"
            )}
        >
            {selectedMember ? (
                <Avatar
                    name={selectedMember.name}
                    avatar={selectedMember.avatar}
                    size="sm"
                    className="size-6"
                />
            ) : (
                <div className="size-6 rounded-full border border-dashed border-gray-300 flex items-center justify-center hover:border-gray-400 transition-colors">
                    <User className="size-3 text-gray-400" />
                </div>
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
            <PopoverContent className="p-0 w-64 rounded-xl" align={align} side={side}>
                <Command>
                    <CommandInput placeholder="Buscar membro..." />
                    <CommandList>
                        {isLoading ? (
                            <div className="py-6 text-center text-sm text-gray-500">
                                Carregando...
                            </div>
                        ) : (
                            <>
                                <CommandEmpty>Nenhum membro encontrado.</CommandEmpty>
                                <CommandGroup>
                                    <CommandItem
                                        onSelect={() => handleSelect(null)}
                                        className={cn(
                                            "flex items-center gap-2",
                                            !assigneeId && "bg-green-50"
                                        )}
                                    >
                                        <div className="size-6 rounded-full border border-dashed border-gray-300 flex items-center justify-center">
                                            <User className="size-3 text-gray-400" />
                                        </div>
                                        <span>Sem responsável</span>
                                    </CommandItem>
                                    {members.map((member) => (
                                        <CommandItem
                                            key={member.id}
                                            onSelect={() =>
                                                handleSelect(
                                                    assigneeId === member.id ? null : member.id
                                                )
                                            }
                                            className={cn(
                                                "flex items-center gap-2",
                                                assigneeId === member.id && "bg-green-50"
                                            )}
                                        >
                                            <Avatar
                                                name={member.name}
                                                avatar={member.avatar}
                                                size="sm"
                                                className="size-6"
                                            />
                                            <span>{member.name}</span>
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            </>
                        )}
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}

