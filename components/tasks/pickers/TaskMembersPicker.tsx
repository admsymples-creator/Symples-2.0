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
} from "@/components/ui/command";
import { Avatar, AvatarGroup } from "../Avatar";
import { User, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { getWorkspaceMembers } from "@/lib/actions/tasks";

interface Member {
    id: string;
    name: string;
    avatar?: string;
}

interface TaskMembersPickerProps {
    memberIds: string[]; // Array de IDs dos membros selecionados
    onChange: (memberIds: string[]) => void; // Handler chamado quando membros mudam
    workspaceId?: string | null;
    members?: Member[]; // Opcional: se não fornecido, busca quando usuário abre o picker
    trigger?: React.ReactElement; // Trigger customizado
    align?: "start" | "center" | "end";
    side?: "top" | "bottom" | "left" | "right";
    maxAvatars?: number; // Número máximo de avatares a mostrar no grupo (padrão: 3)
}

/**
 * Componente para seleção de múltiplos membros de uma tarefa
 * Permite toggle: clicar adiciona/remove o membro
 */
export function TaskMembersPicker({
    memberIds = [],
    onChange,
    workspaceId = null,
    members: providedMembers,
    trigger,
    align = "start",
    side = "bottom",
    maxAvatars = 3,
}: TaskMembersPickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [members, setMembers] = useState<Member[]>(providedMembers || []);
    const [isLoading, setIsLoading] = useState(false);
    const [hasLoadedMembers, setHasLoadedMembers] = useState(!!providedMembers && providedMembers.length > 0);

    // Buscar membros APENAS quando o usuário abre o picker
    const handleOpenChange = async (open: boolean) => {
        setIsOpen(open);
        
        if (open && !hasLoadedMembers && (!providedMembers || providedMembers.length === 0)) {
            setIsLoading(true);
            try {
                const workspaceMembers = await getWorkspaceMembers(workspaceId);
                
                const mappedMembers: Member[] = workspaceMembers.map((m: any) => ({
                    id: m.id,
                    name: m.full_name || m.email || "Usuário",
                    avatar: m.avatar_url || undefined,
                }));
                setMembers(mappedMembers);
                setHasLoadedMembers(true);
            } catch (error) {
                console.error("Erro ao carregar membros:", error);
            } finally {
                setIsLoading(false);
            }
        } else if (providedMembers && providedMembers.length > 0) {
            setMembers(providedMembers);
            setHasLoadedMembers(true);
        }
    };

    /**
     * Handler de toggle - adiciona ou remove membro da lista
     */
    const handleToggleMember = (memberId: string) => {
        const isSelected = memberIds.includes(memberId);
        const newMemberIds = isSelected
            ? memberIds.filter((id) => id !== memberId)
            : [...memberIds, memberId];
        
        onChange(newMemberIds);
    };

    // Obter membros selecionados com dados completos
    const selectedMembers = members.filter((m) => memberIds.includes(m.id));

    // Trigger padrão se não houver children
    const defaultTrigger = (
        <button
            type="button"
            className={cn(
                "transition-all flex items-center justify-center",
                memberIds.length > 0 ? "hover:opacity-80" : ""
            )}
        >
            {selectedMembers.length > 0 ? (
                <AvatarGroup users={selectedMembers} max={maxAvatars} size="sm" />
            ) : (
                <div className="size-6 rounded-full border border-dashed border-gray-300 flex items-center justify-center hover:border-gray-400 transition-colors">
                    <User className="size-3 text-gray-400" />
                </div>
            )}
        </button>
    );

    // Garantir que sempre temos um único elemento válido
    const triggerElement = React.isValidElement(trigger) ? trigger : defaultTrigger;

    return (
        <Popover open={isOpen} onOpenChange={handleOpenChange}>
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
                                        onSelect={() => onChange([])}
                                        className={cn(
                                            "flex items-center gap-2",
                                            memberIds.length === 0 && "bg-green-50"
                                        )}
                                    >
                                        <div className="size-6 rounded-full border border-dashed border-gray-300 flex items-center justify-center">
                                            <User className="size-3 text-gray-400" />
                                        </div>
                                        <span>Sem membros</span>
                                        {memberIds.length === 0 && (
                                            <Check className="ml-auto size-4 text-green-600" />
                                        )}
                                    </CommandItem>
                                    {members.map((member) => {
                                        const isSelected = memberIds.includes(member.id);
                                        return (
                                            <CommandItem
                                                key={member.id}
                                                onSelect={() => handleToggleMember(member.id)}
                                                className={cn(
                                                    "flex items-center gap-2",
                                                    isSelected && "bg-green-50"
                                                )}
                                            >
                                                <Avatar
                                                    name={member.name}
                                                    avatar={member.avatar}
                                                    size="sm"
                                                    className="size-6"
                                                />
                                                <span>{member.name}</span>
                                                {isSelected && (
                                                    <Check className="ml-auto size-4 text-green-600" />
                                                )}
                                            </CommandItem>
                                        );
                                    })}
                                </CommandGroup>
                            </>
                        )}
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}

