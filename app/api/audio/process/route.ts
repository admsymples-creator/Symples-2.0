import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createServerActionClient } from "@/lib/supabase/server";

type TaskExtraction = {
  title?: string;
  description?: string;
  descriptionFull?: string;
  descriptionShort?: string;
  dueDate?: string | null;
  assigneeId?: string | null;
  priority?: "low" | "medium" | "high" | "urgent";
  status?: "todo" | "in_progress" | "done";
};

type ProcessResponse = {
  transcription: string;
  message: string;
  componentData: any | null;
};

// Ferramenta de criação de tarefa (mesma definição do /api/ai/chat)
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

const buildSystemPrompt = (workspaceMembers: any[], now: Date) => {
  const dateStr = now.toLocaleDateString("pt-BR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const membersList =
    workspaceMembers && Array.isArray(workspaceMembers) && workspaceMembers.length > 0
      ? `\nMembros do workspace (id | nome | email):\n${workspaceMembers
          .map(
            (m) =>
              `- ${m.id} | ${m.name || m.full_name || "Sem nome"} | ${m.email || "sem email"}`
          )
          .join("\n")}`
      : "";

  return `Você é o Assistente Symples para gestão de tarefas da empresa.
Responda sempre em português brasileiro. Seja conciso e profissional.

Use a ferramenta create_task APENAS quando o usuário pedir EXPLICITAMENTE criar, adicionar ou registrar uma tarefa.
NÃO use create_task para: perguntas, resumos, listagens, análises ou dúvidas.

Para datas relativas, use a data atual: ${dateStr} (UTC-3, Brasília).${membersList}`;
};

const parseContext = (contextRaw: FormDataEntryValue | null) => {
  try {
    if (!contextRaw || typeof contextRaw !== "string") return { history: [], workspaceMembers: [] };
    const parsed = JSON.parse(contextRaw);
    return {
      history: parsed.history || parsed.messages || [],
      workspaceMembers: parsed.workspaceMembers || parsed.members || [],
    };
  } catch {
    return { history: [], workspaceMembers: [] };
  }
};

const ensureString = (value: any) => (typeof value === "string" ? value : value?.toString() || "");

export async function POST(request: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "OPENAI_API_KEY não configurada" }, { status: 500 });
  }

  try {
    const formData = await request.formData();
    const audioFile = formData.get("audio");
    const workspaceId = ensureString(formData.get("workspaceId")) || null;
    const { history, workspaceMembers } = parseContext(formData.get("context"));

    if (!(audioFile instanceof File)) {
      return NextResponse.json({ error: "Arquivo de áudio não fornecido" }, { status: 400 });
    }

    const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB (limite da Whisper API)
    if (audioFile.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: "Arquivo de áudio muito grande. O limite é 25 MB." },
        { status: 400 }
      );
    }

    const supabase = await createServerActionClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    // Verificar acesso do workspace (gatekeeper) - apenas se workspaceId fornecido
    if (workspaceId) {
      const { checkWorkspaceAccess } = await import("@/lib/utils/subscription");
      const accessCheck = await checkWorkspaceAccess(workspaceId);
      
      if (!accessCheck.allowed) {
        return NextResponse.json(
          { 
            error: accessCheck.reason || 'Seu trial expirou. Escolha um plano para continuar usando o assistente IA.',
            upgradeRequired: true
          },
          { status: 403 }
        );
      }
    }

    const openai = new OpenAI({ apiKey });

    // Step A: Transcrição
    const transcriptionResult = await openai.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
      language: "pt",
    });

    const transcription = ensureString((transcriptionResult as any)?.text).trim();

    if (!transcription) {
      return NextResponse.json(
        { error: "Falha ao transcrever áudio", details: "Transcrição vazia" },
        { status: 500 }
      );
    }

    // Step B: Inteligência
    const now = new Date();
    const messagesForModel = [
      {
        role: "system" as const,
        content: buildSystemPrompt(workspaceMembers, now),
      },
      ...history
        .filter((msg: any) => msg && msg.role && msg.content)
        .slice(-10)
        .map((msg: any) => ({
          role: msg.role === "assistant" ? ("assistant" as const) : ("user" as const),
          content: ensureString(msg.content),
        })),
      {
        role: "user" as const,
        content: `Transcrição do usuário: "${transcription}"`,
      },
    ];

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.2,
      messages: messagesForModel,
      tools: [CREATE_TASK_TOOL],
      tool_choice: "auto",
    });

    const choice = completion.choices[0];
    let aiMessage = "Não consegui gerar uma resposta no momento.";
    let componentData: ProcessResponse["componentData"] = null;

    if (choice.finish_reason === "tool_calls") {
      // A IA decidiu criar uma tarefa via function calling
      const toolCall = choice.message.tool_calls?.[0];
      let taskArgs: TaskExtraction = {};
      try {
        taskArgs = JSON.parse(toolCall?.function?.arguments ?? "{}");
      } catch {
        // fallback vazio
      }

      aiMessage =
        ensureString(choice.message.content) ||
        "Preparei a tarefa para você. Confirme os detalhes abaixo:";

      componentData = {
        type: "task_confirmation",
        data: {
          title: taskArgs.title || "Nova tarefa",
          description: taskArgs.description || taskArgs.descriptionFull || transcription,
          dueDate: taskArgs.dueDate || null,
          assigneeId: taskArgs.assigneeId || null,
          priority: taskArgs.priority || "medium",
          status: taskArgs.status || "todo",
          workspaceId: workspaceId || undefined,
        },
      };
    } else {
      // Resposta de chat normal
      aiMessage =
        ensureString(choice.message?.content) ||
        "Não consegui gerar uma resposta no momento.";
    }

    // Step C: Persistência (silenciosa em caso de falha)
    const insertMessage = async (payload: Record<string, any>) => {
      try {
        const {
          id: _id,
          created_at: _createdAt,
          updated_at: _updatedAt,
          user_id: _userId,
          role,
          ...clean
        } = payload;

        await supabase.from("assistant_messages").insert({
          ...clean,
          role: role || "user",
          user_id: user.id,
        });
      } catch (err) {
        console.error("[process audio] Falha ao salvar mensagem", err);
      }
    };

    await insertMessage({
      workspace_id: workspaceId,
      role: "user",
      content: transcription,
      type: "audio",
      audio_url: null,
      audio_transcription: transcription,
    });

    await insertMessage({
      workspace_id: workspaceId,
      role: "assistant",
      content: aiMessage,
      type: componentData ? "component" : "text",
      component_data: componentData,
    });

    const responsePayload: ProcessResponse = {
      transcription,
      message: aiMessage,
      componentData,
    };

    return NextResponse.json(responsePayload);
  } catch (error) {
    console.error("[process audio] Erro inesperado:", error);
    return NextResponse.json(
      { error: "Erro interno ao processar áudio" },
      { status: 500 }
    );
  }
}
