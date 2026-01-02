"use client";

import { useState } from "react";
import { Pencil, Trash2, MoreHorizontal, Palette, Eraser, ArrowUp, ArrowDown, ArrowUpToLine, ArrowDownToLine, ArrowUpDown, CheckCircle, Plus } from "lucide-react";
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
    tasks?: Array<{ id: string | number; completed?: boolean }>;
    onRename?: (groupId: string, newTitle: string) => void;
    onColorChange?: (groupId: string, color: string) => void;
    onDelete?: (groupId: string) => void;
    onClear?: (groupId: string, type?: "all" | "completed") => void;
    onReorder?: (groupId: string, direction: "up" | "down" | "top" | "bottom") => void;
    onAddTask?: () => void;
    canMoveUp?: boolean;
    canMoveDown?: boolean;
    canMoveToTop?: boolean;
    canMoveToBottom?: boolean;
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
    tasks = [],
    onRename,
    onColorChange,
    onDelete,
    onClear,
    onReorder,
    onAddTask,
    canMoveUp = true,
    canMoveDown = true,
    canMoveToTop = false,
    canMoveToBottom = false,
    className,
}: GroupActionMenuProps) {
    const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
    const [newTitle, setNewTitle] = useState(groupTitle);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isClearing, setIsClearing] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isClearModalOpen, setIsClearModalOpen] = useState(false);
    const [clearType, setClearType] = useState<"all" | "completed" | undefined>(undefined);
    
    // Calcular quantidade de tarefas que serão afetadas
    const getTasksToClearCount = (type?: "all" | "completed"): number => {
        if (type === "completed") {
            return tasks.filter(t => t.completed === true).length;
        }
        return tasks.length;
    };

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

        onRename?.(groupId, newTitle.trim());
        setIsRenameDialogOpen(false);
    };

    // Handler para mudar cor
    const handleColorChange = (color: string) => {
        // Salvar no localStorage
        const groupColors = JSON.parse(
            localStorage.getItem("taskGroupColors") || "{}"
        );
        groupColors[groupId] = color;
        localStorage.setItem("taskGroupColors", JSON.stringify(groupColors));

        onColorChange?.(groupId, color);
    };

    // Handler para excluir
    const confirmDelete = async () => {
        setIsDeleting(true);
        try {
            onDelete?.(groupId);
        } catch (error) {
            toast.error("Erro ao excluir grupo");
            console.error(error);
        } finally {
            setIsDeleting(false);
            setIsDeleteModalOpen(false);
        }
    };

    const confirmClear = async () => {
        setIsClearing(true);
        try {
            onClear?.(groupId, clearType);
        } catch (error) {
            toast.error("Erro ao limpar tarefas");
            console.error(error);
        } finally {
            setIsClearing(false);
            setIsClearModalOpen(false);
            setClearType(undefined);
        }
    };

    const handleClearClick = (type?: "all" | "completed") => {
        setClearType(type);
        setIsClearModalOpen(true);
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

    // Debug: verificar se onReorder está definido
    if (process.env.NODE_ENV === 'development' && onReorder) {
    }

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
                    {/* Adicionar tarefa */}
                    {onAddTask && (
                        <DropdownMenuItem
                            onClick={(e) => {
                                e.stopPropagation();
                                onAddTask();
                            }}
                            className="text-xs"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Adicionar tarefa
                        </DropdownMenuItem>
                    )}

                    {onAddTask && (onRename || onColorChange || onReorder || onClear || onDelete) && (
                        <DropdownMenuSeparator />
                    )}

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

                    {/* Sub-menu: Ordenar Grupo */}
                    {onReorder && (
                        <>
                            {(onRename || onColorChange) && <DropdownMenuSeparator />}
                            <DropdownMenuSub>
                                <DropdownMenuSubTrigger className="text-xs">
                                    <ArrowUpDown className="w-4 h-4 mr-2" />
                                    Ordenar
                                </DropdownMenuSubTrigger>
                                <DropdownMenuSubContent className="w-48">
                                    <DropdownMenuItem
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onReorder(groupId, "top");
                                        }}
                                        className="text-xs"
                                        disabled={!canMoveToTop}
                                    >
                                        <ArrowUpToLine className="w-4 h-4 mr-2" />
                                        Mover para o topo
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onReorder(groupId, "up");
                                        }}
                                        className="text-xs"
                                        disabled={!canMoveUp}
                                    >
                                        <ArrowUp className="w-4 h-4 mr-2" />
                                        Mover para cima
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onReorder(groupId, "down");
                                        }}
                                        className="text-xs"
                                        disabled={!canMoveDown}
                                    >
                                        <ArrowDown className="w-4 h-4 mr-2" />
                                        Mover para baixo
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onReorder(groupId, "bottom");
                                        }}
                                        className="text-xs"
                                        disabled={!canMoveToBottom}
                                    >
                                        <ArrowDownToLine className="w-4 h-4 mr-2" />
                                        Mover para o final
                                    </DropdownMenuItem>
                                </DropdownMenuSubContent>
                            </DropdownMenuSub>
                        </>
                    )}

                    {/* Sub-menu: Limpar Tarefas */}
                    {onClear && (
                        <>
                            {(onRename || onColorChange || onReorder) && <DropdownMenuSeparator />}
                            <DropdownMenuSub>
                                <DropdownMenuSubTrigger className="text-xs">
                                    <Eraser className="w-4 h-4 mr-2" />
                                    Limpar
                                </DropdownMenuSubTrigger>
                                <DropdownMenuSubContent className="w-48">
                                    <DropdownMenuItem
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleClearClick("all");
                                        }}
                                        className="text-xs"
                                        disabled={isClearing}
                                    >
                                        Todas as Tarefas
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleClearClick("completed");
                                        }}
                                        className="text-xs"
                                        disabled={isClearing}
                                    >
                                        Somente concluídas
                                    </DropdownMenuItem>
                                </DropdownMenuSubContent>
                            </DropdownMenuSub>
                        </>
                    )}

                    {(onRename || onColorChange || onReorder || onClear) && <DropdownMenuSeparator />}

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

            {/* Modal de Confirmação de Limpeza */}
            <ConfirmModal
                open={isClearModalOpen}
                onOpenChange={setIsClearModalOpen}
                title={clearType === "completed" ? "Limpar Tarefas Concluídas?" : "Limpar Todas as Tarefas?"}
                description={(() => {
                    const count = getTasksToClearCount(clearType);
                    if (clearType === "completed") {
                        return `Isso irá arquivar ${count} tarefa${count !== 1 ? 's' : ''} concluída${count !== 1 ? 's' : ''} deste grupo. Esta ação não pode ser desfeita.`;
                    }
                    return `Isso irá arquivar ${count} tarefa${count !== 1 ? 's' : ''} deste grupo. Esta ação não pode ser desfeita.`;
                })()}
                confirmText={clearType === "completed" ? "Limpar Concluídas" : "Limpar Tudo"}
                isLoading={isClearing}
                onConfirm={confirmClear}
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
