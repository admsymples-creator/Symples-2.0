"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Mail, Phone, User, Edit, Trash2, Loader2, ArrowUpDown, ArrowUp, ArrowDown, Search, Users, Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ConfirmModal } from "@/components/modals/confirm-modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { createClient } from "@/lib/actions/finance";
import { deleteClient, updateClient } from "@/lib/actions/clients";

export interface ClientRow {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  created_at?: string | null;
  totalReceived?: number;
  totalReceivable?: number;
  totalOverdue?: number;
}

interface ClientsPageClientProps {
  workspaceId: string;
  workspaceSlug: string;
  initialClients: ClientRow[];
}

type SortField = "name" | "email" | "phone" | "totalReceived" | "totalReceivable" | "totalOverdue";
type SortOrder = "asc" | "desc" | null;

export function ClientsPageClient({ workspaceId, workspaceSlug, initialClients }: ClientsPageClientProps) {
  const router = useRouter();
  const [clients, setClients] = useState<ClientRow[]>(initialClients);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientRow | null>(null);
  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const [clientToDelete, setClientToDelete] = useState<ClientRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const openCreate = () => {
    setEditingClient(null);
    setForm({ name: "", email: "", phone: "" });
    setDialogOpen(true);
  };

  const openEdit = (client: ClientRow) => {
    setEditingClient(client);
    setForm({
      name: client.name || "",
      email: client.email || "",
      phone: client.phone || "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Informe o nome do cliente.");
      return;
    }

    setIsSaving(true);
    try {
      if (editingClient) {
        const result = await updateClient(editingClient.id, {
          name: form.name.trim(),
          email: form.email.trim() || null,
          phone: form.phone.trim() || null,
        });

        if (result.success) {
          setClients((prev) =>
            prev.map((client) =>
              client.id === editingClient.id
                ? { ...client, name: form.name.trim(), email: form.email.trim() || null, phone: form.phone.trim() || null }
                : client
            )
          );
          toast.success("Cliente atualizado!");
          setDialogOpen(false);
        } else {
          toast.error(result.error || "Erro ao atualizar cliente");
        }
      } else {
        const result = await createClient({
          workspaceId,
          name: form.name.trim(),
          email: form.email.trim() || null,
          phone: form.phone.trim() || null,
        });

        if (result.success && result.client) {
          setClients((prev) => [
            {
              id: result.client.id,
              name: result.client.name,
              email: form.email.trim() || null,
              phone: form.phone.trim() || null,
            },
            ...prev,
          ]);
          toast.success("Cliente criado!");
          setDialogOpen(false);
        } else {
          toast.error(result.error || "Erro ao criar cliente");
        }
      }
    } catch (error) {
      console.error("Erro ao salvar cliente:", error);
      toast.error("Erro inesperado ao salvar cliente");
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!clientToDelete) return;
    setIsDeleting(true);
    try {
      const result = await deleteClient(clientToDelete.id);
      if (result.success) {
        setClients((prev) => prev.filter((client) => client.id !== clientToDelete.id));
        toast.success("Cliente removido");
      } else {
        toast.error(result.error || "Erro ao remover cliente");
      }
    } catch (error) {
      console.error("Erro ao remover cliente:", error);
      toast.error("Erro inesperado ao remover cliente");
    } finally {
      setIsDeleting(false);
      setClientToDelete(null);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Ciclar: asc -> desc -> null
      if (sortOrder === "asc") {
        setSortOrder("desc");
      } else if (sortOrder === "desc") {
        setSortOrder(null);
        setSortField(null);
      }
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const getFilteredClients = () => {
    if (!searchQuery.trim()) return clients;

    const query = searchQuery.toLowerCase().trim();
    return clients.filter((client) => {
      return (
        client.name.toLowerCase().includes(query) ||
        client.email?.toLowerCase().includes(query) ||
        client.phone?.toLowerCase().includes(query)
      );
    });
  };

  const getSortedClients = () => {
    const filtered = getFilteredClients();
    
    if (!sortField || !sortOrder) return filtered;

    return [...filtered].sort((a, b) => {
      let aValue: any = a[sortField];
      let bValue: any = b[sortField];

      // Tratar valores undefined/null
      if (aValue === undefined || aValue === null) aValue = sortField === "name" ? "" : 0;
      if (bValue === undefined || bValue === null) bValue = sortField === "name" ? "" : 0;

      // Ordenação
      if (sortField === "name" || sortField === "email" || sortField === "phone") {
        // Ordenação alfabética
        const comparison = String(aValue).localeCompare(String(bValue));
        return sortOrder === "asc" ? comparison : -comparison;
      } else {
        // Ordenação numérica
        return sortOrder === "asc" ? Number(aValue) - Number(bValue) : Number(bValue) - Number(aValue);
      }
    });
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-3.5 w-3.5 ml-1 text-gray-400" />;
    }
    if (sortOrder === "asc") {
      return <ArrowUp className="h-3.5 w-3.5 ml-1 text-gray-700" />;
    }
    return <ArrowDown className="h-3.5 w-3.5 ml-1 text-gray-700" />;
  };

  const sortedClients = getSortedClients();

  const handleExportCSV = () => {
    const csvData = [
      ["Cliente", "Email", "Telefone", "Total Recebido", "A Receber", "Em Atraso"],
      ...sortedClients.map((client) => [
        client.name,
        client.email || "",
        client.phone || "",
        (client.totalReceived || 0).toFixed(2),
        (client.totalReceivable || 0).toFixed(2),
        (client.totalOverdue || 0).toFixed(2),
      ]),
    ];

    const csvContent =
      "data:text/csv;charset=utf-8," +
      csvData.map((row) => row.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `clientes_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Lista exportada com sucesso!");
  };

  return (
    <div className="min-h-screen bg-white pb-20">
      <div className="bg-white border-b border-gray-200 px-6 py-3 sticky top-0 z-10">
        <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
            <p className="text-sm text-gray-500">Cadastro e organizacao dos clientes do financeiro.</p>
          </div>
        </div>
      </div>

      <div className="border-b border-gray-200 bg-white px-6">
        <div className="max-w-[1600px] mx-auto py-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-4">
              <Button onClick={openCreate} className="bg-[#050815] hover:bg-slate-800 text-white">
                <Plus className="h-4 w-4 mr-2" />
                Novo cliente
              </Button>
              {clients.length > 0 && (
                <Button
                  variant="outline"
                  onClick={handleExportCSV}
                  className="text-gray-700"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Exportar CSV
                </Button>
              )}
              <span className="text-sm text-muted-foreground">
                {sortedClients.length} {sortedClients.length === 1 ? "cliente" : "clientes"}
                {searchQuery && ` (${clients.length} total)`}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {!isSearchOpen ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-gray-500 hover:text-gray-900"
                  onClick={() => setIsSearchOpen(true)}
                >
                  <Search className="w-4 h-4" />
                </Button>
              ) : (
                <div className="relative flex items-center">
                  <Search className="absolute left-3 w-4 h-4 text-gray-400 pointer-events-none" />
                  <Input
                    placeholder="Buscar clientes..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onBlur={() => {
                      if (!searchQuery) {
                        setIsSearchOpen(false);
                      }
                    }}
                    autoFocus
                    className="pl-9 w-[240px] h-9 bg-white rounded-lg border-gray-200"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="w-full bg-white px-6">
        <div className="max-w-[1600px] mx-auto">
          <div className="py-3 space-y-6">
            <Card className="border-none shadow-sm">
              <CardContent className="px-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-100">
                      <tr>
                        <th className="px-4 py-3 font-medium">
                          <button
                            onClick={() => handleSort("name")}
                            className="flex items-center hover:text-gray-700 transition-colors"
                          >
                            Cliente
                            <SortIcon field="name" />
                          </button>
                        </th>
                        <th className="px-4 py-3 font-medium">
                          <button
                            onClick={() => handleSort("email")}
                            className="flex items-center hover:text-gray-700 transition-colors"
                          >
                            Email
                            <SortIcon field="email" />
                          </button>
                        </th>
                        <th className="px-4 py-3 font-medium">
                          <button
                            onClick={() => handleSort("phone")}
                            className="flex items-center hover:text-gray-700 transition-colors"
                          >
                            Telefone
                            <SortIcon field="phone" />
                          </button>
                        </th>
                        <th className="px-4 py-3 font-medium text-right">
                          <button
                            onClick={() => handleSort("totalReceived")}
                            className="flex items-center justify-end w-full hover:text-gray-700 transition-colors"
                          >
                            Total Recebido
                            <SortIcon field="totalReceived" />
                          </button>
                        </th>
                        <th className="px-4 py-3 font-medium text-right">
                          <button
                            onClick={() => handleSort("totalReceivable")}
                            className="flex items-center justify-end w-full hover:text-gray-700 transition-colors"
                          >
                            A Receber
                            <SortIcon field="totalReceivable" />
                          </button>
                        </th>
                        <th className="px-4 py-3 font-medium text-right">
                          <button
                            onClick={() => handleSort("totalOverdue")}
                            className="flex items-center justify-end w-full hover:text-gray-700 transition-colors"
                          >
                            Em Atraso
                            <SortIcon field="totalOverdue" />
                          </button>
                        </th>
                        <th className="px-4 py-3 font-medium text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {sortedClients.length === 0 && !searchQuery && (
                        <tr>
                          <td colSpan={7} className="px-6 py-20">
                            <EmptyState
                              icon={Users}
                              title="Nenhum cliente cadastrado"
                              description="Comece adicionando seu primeiro cliente para gerenciar o financeiro."
                              actionLabel="Novo cliente"
                              onClick={openCreate}
                            />
                          </td>
                        </tr>
                      )}
                      {sortedClients.length === 0 && searchQuery && (
                        <tr>
                          <td colSpan={7} className="px-6 py-20">
                            <EmptyState
                              icon={Search}
                              title="Nenhum resultado encontrado"
                              description={`Não encontramos clientes com "${searchQuery}". Tente outro termo.`}
                            />
                          </td>
                        </tr>
                      )}
                      {sortedClients.map((client) => (
                        <tr 
                          key={client.id} 
                          className="hover:bg-gray-50/50 transition-colors cursor-pointer h-[52px]"
                          onClick={(e) => {
                            // Evitar navegação se o clique foi nos botões de ação
                            if ((e.target as HTMLElement).closest('button')) return;
                            router.push(`/${workspaceSlug}/clients/${client.id}`);
                          }}
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700">
                                <User className="h-3.5 w-3.5" />
                              </div>
                              <div className="font-medium text-gray-900">{client.name}</div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {client.email || "-"}
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {client.phone || "-"}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className={`font-medium ${(client.totalReceived || 0) > 0 ? "text-green-600" : "text-gray-400"}`}>
                              {new Intl.NumberFormat("pt-BR", {
                                style: "currency",
                                currency: "BRL",
                              }).format(client.totalReceived || 0)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className={`font-medium ${(client.totalReceivable || 0) > 0 ? "text-blue-600" : "text-gray-400"}`}>
                              {new Intl.NumberFormat("pt-BR", {
                                style: "currency",
                                currency: "BRL",
                              }).format(client.totalReceivable || 0)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className={`font-medium ${(client.totalOverdue || 0) > 0 ? "text-red-600" : "text-gray-400"}`}>
                              {new Intl.NumberFormat("pt-BR", {
                                style: "currency",
                                currency: "BRL",
                              }).format(client.totalOverdue || 0)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="inline-flex items-center gap-2">
                              <Button variant="ghost" size="icon" onClick={() => openEdit(client)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                onClick={() => setClientToDelete(client)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingClient ? "Editar cliente" : "Novo cliente"}</DialogTitle>
            <DialogDescription>
              Preencha os dados principais para sincronizar com o financeiro.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="client-name">Nome</Label>
              <Input
                id="client-name"
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Ex: Agencia Central"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="client-email">Email</Label>
              <Input
                id="client-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="contato@email.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="client-phone">Telefone</Label>
              <Input
                id="client-phone"
                value={form.phone}
                onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                placeholder="(11) 99999-9999"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Salvar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmModal
        open={!!clientToDelete}
        onOpenChange={(open) => !open && setClientToDelete(null)}
        title="Remover cliente"
        description={`Tem certeza que deseja remover "${clientToDelete?.name}"? Esta acao nao pode ser desfeita.`}
        confirmText="Remover"
        isLoading={isDeleting}
        onConfirm={confirmDelete}
        variant="destructive"
      />
    </div>
  );
}
