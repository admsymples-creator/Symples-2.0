"use client";

import { useState } from "react";
import { Pencil, Trash2, MoreHorizontal, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface GroupActionMenuProps {
    groupId: string;
    groupTitle: string;
    currentColor?: string;
    onRename?: (newTitle: string) => void;
    onColorChange?: (color: string) => void;
    onDelete?: () => void;
    className?: string;
}

// Cores disponíveis para grupos
const GROUP_COLORS = [
    { name: "Vermelho", value: "red", class: "bg-red-500" },
    { name: "Azul", value: "blue", class: "bg-blue-500" },
    { name: "Verde", value: "green", class: "bg-green-500" },
    { name: "Amarelo", value: "yellow", class: "bg-yellow-500" },
    { name: "Roxo", value: "purple", class: "bg-purple-500" },
    { name: "Rosa", value: "pink", class: "bg-pink-500" },
    { name: "Laranja", value: "orange", class: "bg-orange-500" },
    { name: "Cinza", value: "slate", class: "bg-slate-500" },
    { name: "Ciano", value: "cyan", class: "bg-cyan-500" },
    { name: "Índigo", value: "indigo", class: "bg-indigo-500" },
];

import { ConfirmModal } from "@/components/modals/confirm-modal";

export function GroupActionMenu({
    groupId,
    groupTitle,
    currentColor,
    onRename,
    onColorChange,
    onDelete,
    className,
}: GroupActionMenuProps) {
    const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
    const [newTitle, setNewTitle] = useState(groupTitle);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    // Handler para renomear
    const handleRename = () => {
        setIsRenameDialogOpen(true);
        setNewTitle(groupTitle);
    };

    const handleRenameSubmit = () => {
        if (!newTitle.trim()) {
            toast.error("O nome do grupo não pode estar vazio");
            return;
        }

        if (newTitle.trim() === groupTitle) {
            setIsRenameDialogOpen(false);
            return;
        }

        onRename?.(newTitle.trim());
        setIsRenameDialogOpen(false);
        toast.success("Grupo renomeado com sucesso");
    };

    // Handler para mudar cor
    const handleColorChange = (color: string) => {
        // Salvar no localStorage
        const groupColors = JSON.parse(
            localStorage.getItem("taskGroupColors") || "{}"
        );
        groupColors[groupId] = color;
        localStorage.setItem("taskGroupColors", JSON.stringify(groupColors));

        onColorChange?.(color);
        toast.success("Cor do grupo atualizada");
    };

    // Handler para excluir
    const confirmDelete = async () => {
        setIsDeleting(true);
        try {
            onDelete?.();
            toast.success("Grupo excluído com sucesso");
        } catch (error) {
            toast.error("Erro ao excluir grupo");
            console.error(error);
        } finally {
            setIsDeleting(false);
            setIsDeleteModalOpen(false);
        }
    };

    const handleDeleteClick = () => {
        setIsDeleteModalOpen(true);
    };

    // Obter cor atual do localStorage se não fornecida
    const getCurrentColor = (): string | undefined => {
        if (currentColor) return currentColor;
        
        try {
            const groupColors = JSON.parse(
                localStorage.getItem("taskGroupColors") || "{}"
            );
            return groupColors[groupId];
        } catch {
            return undefined;
        }
    };

    const actualCurrentColor = getCurrentColor();

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                            "h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity",
                            className
                        )}
                        onClick={(e) => {
                            e.stopPropagation();
                        }}
                        disabled={isDeleting}
                    >
                        <MoreHorizontal className="w-4 h-4 text-gray-500" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48">
                    {/* Renomear */}
                    {onRename && (
                        <DropdownMenuItem
                            onClick={(e) => {
                                e.stopPropagation();
                                handleRename();
                            }}
                            className="text-xs"
                        >
                            <Pencil className="w-4 h-4 mr-2" />
                            Renomear
                        </DropdownMenuItem>
                    )}

                    {/* Sub-menu: Cor do Grupo */}
                    {onColorChange && (
                        <DropdownMenuSub>
                            <DropdownMenuSubTrigger className="text-xs">
                                <Palette className="w-4 h-4 mr-2" />
                                Cor do Grupo
                            </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent className="w-48">
                                <div className="grid grid-cols-5 gap-2 p-2">
                                    {GROUP_COLORS.map((color) => (
                                        <button
                                            key={color.value}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleColorChange(color.value);
                                            }}
                                            className={cn(
                                                "w-6 h-6 rounded-full border-2 transition-all hover:scale-110",
                                                color.class,
                                                actualCurrentColor === color.value
                                                    ? "border-gray-900 ring-2 ring-gray-300"
                                                    : "border-gray-200"
                                            )}
                                            title={color.name}
                                        />
                                    ))}
                                </div>
                            </DropdownMenuSubContent>
                        </DropdownMenuSub>
                    )}

                    <DropdownMenuSeparator />

                    {/* Excluir Grupo */}
                    {onDelete && (
                        <DropdownMenuItem
                            onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteClick();
                            }}
                            className="text-xs text-red-600 focus:bg-red-50 focus:text-red-600"
                            disabled={isDeleting}
                        >
                            <Trash2 className="w-4 h-4 mr-2" />
                            {isDeleting ? "Excluindo..." : "Excluir Grupo"}
                        </DropdownMenuItem>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>

            {/* Modal de Confirmação de Exclusão */}
            <ConfirmModal
                open={isDeleteModalOpen}
                onOpenChange={setIsDeleteModalOpen}
                title="Excluir Grupo?"
                description="Esta ação não pode ser desfeita. As tarefas dentro serão movidas para o Backlog ou excluídas."
                confirmText="Excluir Grupo"
                isLoading={isDeleting}
                onConfirm={confirmDelete}
            />

            {/* Dialog de Renomear */}
            <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Renomear Grupo</DialogTitle>
                        <DialogDescription>
                            Digite o novo nome para o grupo "{groupTitle}".
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Input
                            value={newTitle}
                            onChange={(e) => setNewTitle(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    handleRenameSubmit();
                                } else if (e.key === "Escape") {
                                    setIsRenameDialogOpen(false);
                                }
                            }}
                            placeholder="Nome do grupo"
                            autoFocus
                        />
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setIsRenameDialogOpen(false)}
                        >
                            Cancelar
                        </Button>
                        <Button onClick={handleRenameSubmit}>
                            Salvar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
