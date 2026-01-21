import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { getClientDetails } from "@/lib/actions/clients";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  ArrowLeft, 
  Mail, 
  Phone, 
  Calendar, 
  DollarSign, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  FileText,
  TrendingUp,
  Building2
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Separator } from "@/components/ui/separator";
import { ClientDetailsClient } from "./client-details-client";

// Componente para formatar moeda
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

export default async function ClientDetailsPage({ 
  params 
}: { 
  params: { workspaceSlug: string; clientId: string } 
}) {
  const { workspaceSlug, clientId } = await params;
  const data = await getClientDetails(clientId);

  if (!data) {
    notFound();
  }

  const { client, finance, tasks } = data;

  // Calcular iniciais para Avatar
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  return (
    <div className="flex flex-col h-full bg-gray-50/50">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-10">
          <div className="flex items-center gap-4 mb-4">
            <Link 
              href={`/${workspaceSlug}/clients`}
              className="text-gray-500 hover:text-gray-800 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12 border border-gray-100">
                <AvatarImage src={`https://avatar.vercel.sh/${client.name}.png`} />
                <AvatarFallback className="bg-primary/10 text-primary font-medium">
                  {getInitials(client.name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{client.name}</h1>
                <div className="flex items-center gap-3 text-sm text-gray-500">
                  {client.email && (
                    <div className="flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5" />
                      <span>{client.email}</span>
                    </div>
                  )}
                  {client.phone && (
                    <div className="flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5" />
                      <span>{client.phone}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="ml-auto flex gap-2">
              <Button variant="outline" size="sm">
                Editar
              </Button>
              <ClientDetailsClient clientId={clientId} workspaceId={client.workspace_id} />
            </div>
          </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <Card className="shadow-sm border-gray-100 bg-white">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Recebido</p>
                <p className="text-2xl font-bold text-green-600 mt-1">{formatCurrency(finance.totalIncome)}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-green-50 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-gray-100 bg-white">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">A Receber</p>
                <p className="text-2xl font-bold text-yellow-600 mt-1">{formatCurrency(finance.totalPending)}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-yellow-50 flex items-center justify-center">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-gray-100 bg-white">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Em Atraso</p>
                <p className="text-2xl font-bold text-red-600 mt-1">{formatCurrency(finance.totalOverdue)}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-red-50 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <Tabs defaultValue="tasks" className="flex-1 flex flex-col">
          <div className="px-6 py-4 bg-white border-b border-gray-200">
            <TabsList variant="default">
              <TabsTrigger value="tasks" variant="default">
                Tarefas e Projetos
              </TabsTrigger>
              <TabsTrigger value="finance" variant="default">
                Histórico Financeiro
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-auto bg-gray-50 p-6">
            <TabsContent value="tasks" className="mt-0 h-full">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-800">Tarefas Recentes</h3>
                  <Badge variant="outline" className="bg-white">
                    {tasks.length} tarefas encontradas
                  </Badge>
                </div>

                {tasks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-gray-200 rounded-xl bg-white/50">
                    <FileText className="w-10 h-10 text-gray-300 mb-2" />
                    <p className="text-gray-500 font-medium">Nenhuma tarefa encontrada</p>
                    <p className="text-sm text-gray-400">Este cliente ainda não possui tarefas vinculadas.</p>
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {tasks.map((task: any) => (
                      <Card key={task.id} className="hover:shadow-md transition-shadow border-gray-100">
                        <CardContent className="p-4 flex items-center gap-4">
                          <div className={`
                            w-2 h-2 rounded-full flex-shrink-0
                            ${task.status === 'done' ? 'bg-green-500' : 
                              task.status === 'in_progress' ? 'bg-blue-500' : 
                              'bg-gray-300'}
                          `} />
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-gray-900 truncate">{task.title}</h4>
                            <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                              {task.due_date && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {format(new Date(task.due_date), "dd 'de' MMM, yyyy", { locale: ptBR })}
                                </span>
                              )}
                              {task.priority && (
                                <Badge variant="secondary" className="text-[10px] px-1.5 h-5 capitalize">
                                  {task.priority === 'urgent' ? 'Urgente' : 
                                   task.priority === 'high' ? 'Alta' : 
                                   task.priority === 'medium' ? 'Média' : 'Baixa'}
                                </Badge>
                              )}
                              {task.tags && task.tags.length > 0 && (
                                <div className="flex gap-1">
                                  {task.tags.map((tag: string) => (
                                    <Badge key={tag} variant="outline" className="text-[10px] px-1.5 h-5">
                                      {tag}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            {/* Placeholder para status financeiro da tarefa se implementarmos no futuro */}
                            <span className="text-xs text-gray-400">
                              {task.status === 'done' ? 'Concluída' : 'Em andamento'}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="finance" className="mt-0 h-full">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-normal text-gray-800">Transações</h3>
                  <Badge variant="outline" className="bg-white">
                    {finance.transactions.length} registros
                  </Badge>
                </div>

                {finance.transactions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-gray-200 rounded-xl bg-white/50">
                    <DollarSign className="w-10 h-10 text-gray-300 mb-2" />
                    <p className="text-gray-500 font-medium">Nenhuma transação encontrada</p>
                    <p className="text-sm text-gray-400">Não há registros financeiros para este cliente.</p>
                  </div>
                ) : (
                  <Card className="border-gray-100 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-100">
                          <tr>
                            <th className="px-4 py-3">Data</th>
                            <th className="px-4 py-3">Descrição</th>
                            <th className="px-4 py-3">Categoria</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3 text-right">Valor</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {finance.transactions.map((t: any) => (
                            <tr key={t.id} className="hover:bg-gray-50/50 transition-colors h-[52px]">
                              <td className="px-4 py-3 text-gray-600">
                                {format(new Date(t.due_date || t.created_at), "dd/MM/yyyy")}
                              </td>
                              <td className="px-4 py-3 font-medium text-gray-900">{t.description}</td>
                              <td className="px-4 py-3 text-gray-500">
                                <Badge variant="outline" className="font-normal text-xs">
                                  {t.category}
                                </Badge>
                              </td>
                              <td className="px-4 py-3">
                                <Badge 
                                  className={`
                                    font-normal text-xs capitalize
                                    ${t.status === 'paid' ? 'bg-green-100 text-green-700 hover:bg-green-200 border-green-200' : 
                                      t.status === 'pending' ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200 border-yellow-200' : 
                                      'bg-gray-100 text-gray-700'}
                                  `}
                                  variant="outline"
                                >
                                  {t.status === 'paid' ? 'Pago' : t.status === 'pending' ? 'Pendente' : t.status}
                                </Badge>
                              </td>
                              <td className={`px-4 py-3 text-right font-medium ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                                {t.type === 'income' ? '+' : '-'}{formatCurrency(Number(t.amount))}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                )}
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
