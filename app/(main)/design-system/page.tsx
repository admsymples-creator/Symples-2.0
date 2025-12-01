"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/ui/EmptyState";
import { TaskRow as TaskRowTasks } from "@/components/tasks/TaskRow";
import { TaskRow as TaskRowHome } from "@/components/home/TaskRow";
import { KanbanCard } from "@/components/tasks/KanbanCard";
import { TaskCard as TaskCardTasks } from "@/components/tasks/TaskCard";
import { TaskCard as TaskCardHome } from "@/components/home/TaskCard";
import { TaskSectionHeader } from "@/components/tasks/TaskSectionHeader";
import { Avatar, AvatarGroup } from "@/components/tasks/Avatar";
import { WorkspaceCard } from "@/components/home/WorkspaceCard";
import { Database } from "@/types/database.types";
import { Search, Filter, Plus, ChevronDown, MoreHorizontal, User, Calendar as CalendarIcon } from "lucide-react";

type TaskFromDB = Database["public"]["Tables"]["tasks"]["Row"];

export default function DesignSystemPage() {
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState<string>("all");

    // Mock data
    const taskRowTasksData = {
        id: "task-1",
        title: "Redesign do Site da Agência V4",
        completed: false,
        priority: "high" as const,
        status: "Execução",
        assignees: [
            { name: "Maria Silva", avatar: undefined },
            { name: "João Santos", avatar: undefined },
        ],
        dueDate: "2024-12-20",
        tags: ["Design", "Urgente"],
        hasUpdates: true,
    };

    const taskRowHomeData: TaskFromDB = {
        id: "task-2",
        title: "Revisar proposta comercial",
        description: null,
        status: "todo",
        priority: "medium",
        workspace_id: "workspace-123",
        is_personal: false,
        created_by: "user-1",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        assignee_id: null,
        due_date: "2024-12-18",
        position: 1,
        origin_context: null,
    };

    const categories = [
        { id: "all", label: "Todos", count: 0 },
        { id: "ui", label: "UI Components", count: 18 },
        { id: "tasks", label: "Task Components", count: 8 },
        { id: "home", label: "Home Components", count: 4 },
        { id: "layout", label: "Layout Components", count: 5 },
    ];

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-8 py-6">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h1 className="text-3xl font-bold mb-2">Design System</h1>
                            <p className="text-gray-600">Biblioteca completa de componentes do Symples</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <Input
                                    placeholder="Buscar componente..."
                                    className="pl-9 w-[300px]"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Categories */}
                    <div className="flex items-center gap-2 flex-wrap">
                        {categories.map((cat) => (
                            <Button
                                key={cat.id}
                                variant={selectedCategory === cat.id ? "default" : "outline"}
                                size="sm"
                                onClick={() => setSelectedCategory(cat.id)}
                            >
                                {cat.label}
                                {cat.count > 0 && (
                                    <Badge variant="secondary" className="ml-2">
                                        {cat.count}
                                    </Badge>
                                )}
                            </Button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-8 py-8 space-y-12">
                {/* UI COMPONENTS */}
                {(selectedCategory === "all" || selectedCategory === "ui") && (
                    <section>
                        <div className="mb-6">
                            <h2 className="text-2xl font-bold mb-2">UI Components</h2>
                            <p className="text-gray-600">Componentes base do sistema (Shadcn UI)</p>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Button */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Button</CardTitle>
                                    <CardDescription>components/ui/button.tsx</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex flex-wrap gap-2">
                                        <Button>Default</Button>
                                        <Button variant="secondary">Secondary</Button>
                                        <Button variant="destructive">Destructive</Button>
                                        <Button variant="outline">Outline</Button>
                                        <Button variant="ghost">Ghost</Button>
                                        <Button variant="link">Link</Button>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <Button size="sm">Small</Button>
                                        <Button size="default">Default</Button>
                                        <Button size="lg">Large</Button>
                                        <Button size="icon">
                                            <Plus className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Input */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Input</CardTitle>
                                    <CardDescription>components/ui/input.tsx</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <Input placeholder="Digite algo..." />
                                    <Input type="email" placeholder="email@exemplo.com" />
                                    <Input type="password" placeholder="Senha" />
                                    <Input disabled placeholder="Desabilitado" />
                                </CardContent>
                            </Card>

                            {/* Textarea */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Textarea</CardTitle>
                                    <CardDescription>components/ui/textarea.tsx</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <Textarea placeholder="Digite sua mensagem..." rows={4} />
                                </CardContent>
                            </Card>

                            {/* Checkbox */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Checkbox</CardTitle>
                                    <CardDescription>components/ui/checkbox.tsx</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <div className="flex items-center space-x-2">
                                        <Checkbox id="check1" />
                                        <Label htmlFor="check1">Item não marcado</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <Checkbox id="check2" defaultChecked />
                                        <Label htmlFor="check2">Item marcado</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <Checkbox id="check3" disabled />
                                        <Label htmlFor="check3" className="text-gray-400">Desabilitado</Label>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Badge */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Badge</CardTitle>
                                    <CardDescription>components/ui/badge.tsx</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex flex-wrap gap-2">
                                        <Badge>Default</Badge>
                                        <Badge variant="secondary">Secondary</Badge>
                                        <Badge variant="destructive">Destructive</Badge>
                                        <Badge variant="outline">Outline</Badge>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Select */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Select</CardTitle>
                                    <CardDescription>components/ui/select.tsx</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <Select>
                                        <SelectTrigger className="w-[200px]">
                                            <SelectValue placeholder="Selecione..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="option1">Opção 1</SelectItem>
                                            <SelectItem value="option2">Opção 2</SelectItem>
                                            <SelectItem value="option3">Opção 3</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </CardContent>
                            </Card>

                            {/* Tabs */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Tabs</CardTitle>
                                    <CardDescription>components/ui/tabs.tsx</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <Tabs defaultValue="tab1">
                                        <TabsList>
                                            <TabsTrigger value="tab1">Aba 1</TabsTrigger>
                                            <TabsTrigger value="tab2">Aba 2</TabsTrigger>
                                            <TabsTrigger value="tab3">Aba 3</TabsTrigger>
                                        </TabsList>
                                        <TabsContent value="tab1" className="mt-4">
                                            <p>Conteúdo da Aba 1</p>
                                        </TabsContent>
                                        <TabsContent value="tab2" className="mt-4">
                                            <p>Conteúdo da Aba 2</p>
                                        </TabsContent>
                                        <TabsContent value="tab3" className="mt-4">
                                            <p>Conteúdo da Aba 3</p>
                                        </TabsContent>
                                    </Tabs>
                                </CardContent>
                            </Card>

                            {/* Tooltip */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Tooltip</CardTitle>
                                    <CardDescription>components/ui/tooltip.tsx</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button variant="outline">Passe o mouse</Button>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p>Este é um tooltip</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                </CardContent>
                            </Card>

                            {/* Popover */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Popover</CardTitle>
                                    <CardDescription>components/ui/popover.tsx</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button variant="outline">Abrir Popover</Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-80">
                                            <div className="space-y-2">
                                                <h4 className="font-medium">Título do Popover</h4>
                                                <p className="text-sm text-gray-500">Conteúdo do popover aqui.</p>
                                            </div>
                                        </PopoverContent>
                                    </Popover>
                                </CardContent>
                            </Card>

                            {/* Calendar */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Calendar</CardTitle>
                                    <CardDescription>components/ui/calendar.tsx</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <Calendar mode="single" className="rounded-md border" />
                                </CardContent>
                            </Card>

                            {/* Dialog */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Dialog</CardTitle>
                                    <CardDescription>components/ui/dialog.tsx</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <Dialog>
                                        <DialogTrigger asChild>
                                            <Button>Abrir Dialog</Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                            <DialogHeader>
                                                <DialogTitle>Título do Dialog</DialogTitle>
                                                <DialogDescription>Descrição do dialog aqui.</DialogDescription>
                                            </DialogHeader>
                                            <p>Conteúdo do dialog...</p>
                                        </DialogContent>
                                    </Dialog>
                                </CardContent>
                            </Card>

                            {/* Dropdown Menu */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Dropdown Menu</CardTitle>
                                    <CardDescription>components/ui/dropdown-menu.tsx</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="outline">
                                                Menu <ChevronDown className="ml-2 h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent>
                                            <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem>Perfil</DropdownMenuItem>
                                            <DropdownMenuItem>Configurações</DropdownMenuItem>
                                            <DropdownMenuItem>Sair</DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </CardContent>
                            </Card>

                            {/* Separator */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Separator</CardTitle>
                                    <CardDescription>components/ui/separator.tsx</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div>
                                        <p className="text-sm">Acima</p>
                                        <Separator className="my-2" />
                                        <p className="text-sm">Abaixo</p>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Empty State */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Empty State</CardTitle>
                                    <CardDescription>components/ui/EmptyState.tsx</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <EmptyState
                                        icon={Filter}
                                        title="Nenhum item encontrado"
                                        description="Tente ajustar os filtros de busca"
                                    />
                                </CardContent>
                            </Card>
                        </div>
                    </section>
                )}

                {/* TASK COMPONENTS */}
                {(selectedCategory === "all" || selectedCategory === "tasks") && (
                    <section>
                        <div className="mb-6">
                            <h2 className="text-2xl font-bold mb-2">Task Components</h2>
                            <p className="text-gray-600">Componentes relacionados a tarefas</p>
                        </div>

                        <div className="space-y-8">
                            {/* TaskRow (tasks) */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>TaskRow (tasks) - Versão Completa</CardTitle>
                                    <CardDescription>components/tasks/TaskRow.tsx - Usado em /tasks (Lista)</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                                            <TaskRowTasks
                                                {...taskRowTasksData}
                                                onClick={() => {}}
                                                onToggleComplete={() => {}}
                                            />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* TaskRow (home) */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>TaskRow (home) - Versão Simples</CardTitle>
                                    <CardDescription>components/home/TaskRow.tsx - Usado em /home (Semana)</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                                            <TaskRowHome
                                                task={taskRowHomeData}
                                                onToggle={() => {}}
                                                onEdit={async () => {}}
                                                onDelete={() => {}}
                                            />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* KanbanCard */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>KanbanCard</CardTitle>
                                    <CardDescription>components/tasks/KanbanCard.tsx - Usado em /tasks (Kanban)</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                        <div className="w-[300px]">
                                            <KanbanCard
                                                id="task-3"
                                                title="Implementar sistema de notificações"
                                                completed={false}
                                                priority="urgent"
                                                assignees={[{ name: "Ana Costa", avatar: undefined }]}
                                                dueDate="2024-12-15"
                                                tags={["Backend", "Urgente"]}
                                                subtasksCount={5}
                                                commentsCount={3}
                                                onClick={() => {}}
                                            />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* TaskCard (tasks) */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>TaskCard (tasks) - Versão Completa</CardTitle>
                                    <CardDescription>components/tasks/TaskCard.tsx - Usado em /assistant</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                        <div className="w-[300px]">
                                            <TaskCardTasks
                                                id="task-4"
                                                title="Criar documentação da API"
                                                completed={false}
                                                priority="medium"
                                                assignees={[{ name: "Pedro Lima", avatar: undefined }]}
                                                dueDate="2024-12-25"
                                                tags={["Documentação"]}
                                                checklistTotal={8}
                                                checklistCompleted={3}
                                                attachmentsCount={2}
                                                commentsCount={5}
                                                onClick={() => {}}
                                            />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* TaskSectionHeader */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>TaskSectionHeader</CardTitle>
                                    <CardDescription>components/tasks/TaskSectionHeader.tsx - Cabeçalho unificado</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                        <TaskSectionHeader
                                            title="Backlog"
                                            count={12}
                                            actions={
                                                <Button variant="ghost" size="icon" className="h-7 w-7">
                                                    <MoreHorizontal className="w-4 h-4" />
                                                </Button>
                                            }
                                        />
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Avatar */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Avatar & AvatarGroup</CardTitle>
                                    <CardDescription>components/tasks/Avatar.tsx</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex items-center gap-4">
                                        <Avatar name="Maria Silva" size="sm" />
                                        <Avatar name="João Santos" size="md" />
                                        <Avatar name="Ana Costa" size="lg" />
                                    </div>
                                    <Separator />
                                    <div>
                                        <p className="text-sm text-gray-500 mb-2">AvatarGroup (máx 3)</p>
                                        <AvatarGroup
                                            users={[
                                                { name: "Maria Silva", avatar: undefined },
                                                { name: "João Santos", avatar: undefined },
                                                { name: "Ana Costa", avatar: undefined },
                                                { name: "Pedro Lima", avatar: undefined },
                                            ]}
                                            max={3}
                                            size="sm"
                                        />
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </section>
                )}

                {/* HOME COMPONENTS */}
                {(selectedCategory === "all" || selectedCategory === "home") && (
                    <section>
                        <div className="mb-6">
                            <h2 className="text-2xl font-bold mb-2">Home Components</h2>
                            <p className="text-gray-600">Componentes da página Home</p>
                        </div>

                        <div className="space-y-8">
                            {/* TaskCard (home) */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>TaskCard (home) - Versão Simples</CardTitle>
                                    <CardDescription>components/home/TaskCard.tsx</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 space-y-4">
                                        <div>
                                            <p className="text-xs text-gray-500 mb-2">Variante: Quick Add (Pessoal)</p>
                                            <div className="w-[300px]">
                                                <TaskCardHome
                                                    id="task-5"
                                                    title="Tarefa rápida pessoal"
                                                    status="todo"
                                                    isQuickAdd={true}
                                                />
                                            </div>
                                        </div>
                                        <Separator />
                                        <div>
                                            <p className="text-xs text-gray-500 mb-2">Variante: Workspace (Oficial)</p>
                                            <div className="w-[300px]">
                                                <TaskCardHome
                                                    id="task-6"
                                                    title="Tarefa de workspace oficial"
                                                    status="in_progress"
                                                    isQuickAdd={false}
                                                    workspaceColor="#10B981"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* WorkspaceCard */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>WorkspaceCard</CardTitle>
                                    <CardDescription>components/home/WorkspaceCard.tsx</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                        <div className="w-[300px]">
                                            <WorkspaceCard
                                                name="Agência V4"
                                                pendingCount={5}
                                                totalCount={15}
                                            />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </section>
                )}

                {/* Resumo Final */}
                <section>
                    <Card>
                        <CardHeader>
                            <CardTitle>Estatísticas do Design System</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="text-center p-4 bg-gray-50 rounded-lg">
                                    <div className="text-3xl font-bold text-green-600">18</div>
                                    <div className="text-sm text-gray-600 mt-1">UI Components</div>
                                </div>
                                <div className="text-center p-4 bg-gray-50 rounded-lg">
                                    <div className="text-3xl font-bold text-blue-600">8</div>
                                    <div className="text-sm text-gray-600 mt-1">Task Components</div>
                                </div>
                                <div className="text-center p-4 bg-gray-50 rounded-lg">
                                    <div className="text-3xl font-bold text-purple-600">4</div>
                                    <div className="text-sm text-gray-600 mt-1">Home Components</div>
                                </div>
                                <div className="text-center p-4 bg-gray-50 rounded-lg">
                                    <div className="text-3xl font-bold text-orange-600">30+</div>
                                    <div className="text-sm text-gray-600 mt-1">Total de Componentes</div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </section>
            </div>
        </div>
    );
}

