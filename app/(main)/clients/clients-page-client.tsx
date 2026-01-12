"use client";

import { useState } from "react";
import { Plus, Mail, Phone, User, Edit, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ConfirmModal } from "@/components/modals/confirm-modal";
import { createClient } from "@/lib/actions/finance";
import { deleteClient, updateClient } from "@/lib/actions/clients";

export interface ClientRow {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  created_at?: string | null;
}

interface ClientsPageClientProps {
  workspaceId: string;
  initialClients: ClientRow[];
}

export function ClientsPageClient({ workspaceId, initialClients }: ClientsPageClientProps) {
  const [clients, setClients] = useState<ClientRow[]>(initialClients);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientRow | null>(null);
  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const [clientToDelete, setClientToDelete] = useState<ClientRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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
                    <thead className="text-xs text-muted-foreground uppercase bg-gray-50/50 border-b">
                      <tr>
                        <th className="px-6 py-4 font-medium">Cliente</th>
                        <th className="px-6 py-4 font-medium">Email</th>
                        <th className="px-6 py-4 font-medium">Telefone</th>
                        <th className="px-6 py-4 font-medium text-right">Acoes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {clients.length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-6 py-10 text-center text-muted-foreground">
                            Nenhum cliente cadastrado ainda.
                          </td>
                        </tr>
                      )}
                      {clients.map((client) => (
                        <tr key={client.id} className="bg-white hover:bg-gray-50/50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700">
                                <User className="h-4 w-4" />
                              </div>
                              <div>
                                <div className="font-medium text-gray-900">{client.name}</div>
                                <div className="text-xs text-muted-foreground">Cliente ativo</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2 text-gray-600">
                              <Mail className="h-4 w-4 text-gray-400" />
                              <span>{client.email || "-"}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2 text-gray-600">
                              <Phone className="h-4 w-4 text-gray-400" />
                              <span>{client.phone || "-"}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
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
