import { NextRequest, NextResponse } from 'next/server';
import { createServerActionClient } from '@/lib/supabase/server';

// Ferramenta de criação de tarefa para function calling
const CREATE_TASK_TOOL = {
  type: "function" as const,
  function: {
    name: "create_task",
    description:
      "Criar uma tarefa quando o usuário pedir EXPLICITAMENTE criar, adicionar ou registrar uma tarefa. NÃO usar para: consultas, resumos, listagens, análises, perguntas ou dúvidas.",
    parameters: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description: "Título curto da tarefa (máx 100 chars)",
        },
        description: {
          type: "string",
          description: "Descrição completa da tarefa com todos os detalhes",
        },
        dueDate: {
          type: "string",
          description:
            "Data no formato ISO 8601 com hora T12:00:00 (ex: 2024-01-15T12:00:00) ou null se não especificada",
        },
        assigneeId: {
          type: "string",
          description: "UUID do membro responsável ou null se não especificado",
        },
        priority: {
          type: "string",
          enum: ["low", "medium", "high", "urgent"],
          description: "Prioridade da tarefa",
        },
      },
      required: ["title"],
    },
  },
};

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'OPENAI_API_KEY não configurada' },
        { status: 500 }
      );
    }

    const {
      message,
      workspaceId,
      conversationHistory = [],
      tasksData = null,
      workspaceMembers = null,
    } = await request.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Mensagem não fornecida' },
        { status: 400 }
      );
    }

    // Verificar autenticação
    const supabase = await createServerActionClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    // Gatekeeper de subscription
    if (workspaceId) {
      const { checkWorkspaceAccess } = await import("@/lib/utils/subscription");
      const accessCheck = await checkWorkspaceAccess(workspaceId);

      if (!accessCheck.allowed) {
        return NextResponse.json(
          {
            error:
              accessCheck.reason ||
              'Seu trial expirou. Escolha um plano para continuar usando o assistente IA.',
            upgradeRequired: true,
          },
          { status: 403 }
        );
      }
    }

    // Construir system prompt enriquecido
    const now = new Date();
    const dateStr = now.toLocaleDateString('pt-BR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const membersList =
      workspaceMembers && Array.isArray(workspaceMembers) && workspaceMembers.length > 0
        ? `\nMembros do workspace (id | nome | email):\n${workspaceMembers
            .map(
              (m: { id: string; name?: string; full_name?: string; email?: string }) =>
                `- ${m.id} | ${m.name || m.full_name || 'Sem nome'} | ${m.email || ''}`
            )
            .join('\n')}`
        : '';

    const tasksSummary =
      tasksData && Array.isArray(tasksData) && tasksData.length > 0
        ? `\n\nTarefas atuais do workspace:\n${tasksData
            .map(
              (t: { title: string; status: string; dueDate?: string; assignee?: string }) =>
                `- ${t.title} (${t.status})${t.dueDate ? ` — vence ${new Date(t.dueDate).toLocaleDateString('pt-BR')}` : ''}${t.assignee ? ` — resp: ${t.assignee}` : ''}`
            )
            .join('\n')}`
        : '';

    const systemPrompt = `Você é o Assistente Symples para gestão de tarefas da empresa.
Responda sempre em português brasileiro. Seja conciso e profissional.

Use a ferramenta create_task APENAS quando o usuário pedir EXPLICITAMENTE criar, adicionar ou registrar uma tarefa.
NÃO use create_task para: perguntas, resumos, listagens, análises ou dúvidas.

Para datas relativas, use a data atual: ${dateStr} (UTC-3, Brasília).${membersList}${tasksSummary}`;

    // Sanitizar histórico (últimas 15 mensagens de texto/áudio, sem thinking/system)
    const historyMessages = (
      conversationHistory as Array<{ role: string; content: string }>
    )
      .filter((msg) => msg.role !== 'system' && msg.content?.trim())
      .slice(-15)
      .map((msg) => ({
        role: msg.role === 'user' ? ('user' as const) : ('assistant' as const),
        content: msg.content,
      }));

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      ...historyMessages,
      { role: 'user' as const, content: message },
    ];

    // Chamar OpenAI com function calling
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
        tools: [CREATE_TASK_TOOL],
        tool_choice: 'auto',
        temperature: 0.3,
        max_tokens: 600,
      }),
    });

    if (!response.ok) {
      await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: 'Erro ao processar mensagem' },
        { status: response.status }
      );
    }

    const data = await response.json();
    const choice = data.choices[0];

    // A IA decidiu criar uma tarefa via function calling
    if (choice.finish_reason === 'tool_calls') {
      const toolCall = choice.message.tool_calls?.[0];
      let taskArgs: Record<string, unknown> = {};
      try {
        taskArgs = JSON.parse(toolCall?.function?.arguments ?? '{}');
      } catch {
        // fallback vazio se parse falhar
      }

      return NextResponse.json({
        message:
          choice.message.content ||
          'Preparei a tarefa para você. Confirme os detalhes abaixo:',
        isTaskCreation: true,
        taskInfo: {
          title: (taskArgs.title as string) || 'Nova tarefa',
          description: (taskArgs.description as string) || '',
          dueDate: (taskArgs.dueDate as string) || null,
          assigneeId: (taskArgs.assigneeId as string) || null,
          priority:
            (taskArgs.priority as 'low' | 'medium' | 'high' | 'urgent') || 'medium',
          status: 'todo' as const,
        },
      });
    }

    // Resposta de chat normal
    return NextResponse.json({
      message:
        choice.message.content || 'Desculpe, não consegui processar sua mensagem.',
      isTaskCreation: false,
      taskInfo: null,
    });
  } catch (error) {
    console.error('Erro ao processar chat:', error);
    return NextResponse.json(
      { error: 'Erro interno ao processar mensagem' },
      { status: 500 }
    );
  }
}
