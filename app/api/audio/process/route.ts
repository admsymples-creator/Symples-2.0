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

const buildSystemPrompt = (workspaceMembers: any[], now: Date) => {
  const dateStr = now.toISOString().split("T")[0];
  const membersList =
    workspaceMembers && Array.isArray(workspaceMembers) && workspaceMembers.length > 0
      ? `\nMembros disponíveis (id - nome - email):\n${workspaceMembers
          .map(
            (m) =>
              `- ${m.id} | ${m.name || m.full_name || "Sem nome"} | ${m.email || "sem email"}`
          )
          .join("\n")}`
      : "";

  return `Você é o Assistente Symples. Converta transcrições de áudio em respostas úteis e, quando fizer sentido, extraia dados de tarefas.

Regras:
- Responda em português brasileiro, tom profissional e conciso.
- Quando detectar intenção de tarefa, sempre devolva um objeto JSON estruturado.
- Se não houver intenção clara de tarefa, devolva apenas uma resposta de texto amigável.

Formato de saída (sempre JSON):
{
  "message": "resposta de texto para o usuário",
  "task": {
    "title": "título curto",
    "description": "descrição completa",
    "descriptionFull": "sinônimo aceitável de descrição completa",
    "descriptionShort": "resumo curto",
    "dueDate": "YYYY-MM-DDTHH:mm:ss em ISO 8601 ou null",
    "assigneeId": "uuid do membro ou null",
    "priority": "low|medium|high|urgent",
    "status": "todo|in_progress|done"
  } | null
}

Regra crítica para datas:
- Ao extrair datas para o campo dueDate, use o formato ISO 8601. IMPORTANTE: Se o usuário não especificar um horário, defina a hora sempre como T12:00:00 (Meio-dia) para evitar conflitos de fuso horário. Exemplo: "2023-10-25T12:00:00".

Contexto atual:
- Data de hoje: ${dateStr}
${membersList}
`;
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
      response_format: { type: "json_object" },
      messages: messagesForModel,
    });

    const rawContent = completion.choices[0]?.message?.content || "";

    let aiMessage = "Não consegui gerar uma resposta no momento.";
    let task: TaskExtraction | null = null;

    try {
      const parsed = JSON.parse(rawContent);
      aiMessage = ensureString(parsed.message) || aiMessage;
      task = parsed.task || null;
    } catch (parseError) {
      console.warn("Falha ao parsear JSON da IA, usando texto bruto.", parseError);
      aiMessage = rawContent || aiMessage;
      task = null;
    }

    // Montar componentData para o front se houver task
    const componentData = task
      ? {
          type: "task_confirmation",
          data: {
            title: task.title || "Nova tarefa",
            description: task.description || task.descriptionFull || transcription,
            dueDate: task.dueDate || null,
            assigneeId: task.assigneeId || null,
            priority: task.priority || "medium",
            status: task.status || "todo",
            workspaceId: workspaceId || undefined,
          },
        }
      : null;

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
