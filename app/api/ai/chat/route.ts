import { NextRequest, NextResponse } from 'next/server';
import { createServerActionClient } from '@/lib/supabase/server';

// Função auxiliar para formatar data no timezone local (evita problema de UTC)
function formatDateLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

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
      conversationHistory = [], // Histórico de mensagens anteriores
      tasksData = null, // Dados de tarefas quando necessário
      workspaceMembers = null // Membros do workspace para detecção de responsáveis
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
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      );
    }

    // Construir contexto do sistema
    let systemContext = `Você é o Assistente Symples, um assistente inteligente para gestão de empresas.
Você ajuda usuários a gerenciar tarefas, finanças e organização do trabalho.

INSTRUÇÕES:
- Seja conciso e objetivo
- Use português brasileiro
- Quando o usuário pedir para criar uma tarefa (por texto ou áudio), responda de forma clara mencionando que vai criar a tarefa
- Seja proativo e sugira ações quando apropriado
- Mantenha um tom profissional mas amigável
- IMPORTANTE: Se o usuário pedir para criar uma tarefa, sempre mencione explicitamente "criar tarefa" ou "criar uma tarefa" na sua resposta`;

    // Adicionar dados de tarefas ao contexto se disponíveis
    if (tasksData && Array.isArray(tasksData) && tasksData.length > 0) {
      const tasksSummary = tasksData.map((task: any) => 
        `- ${task.title} (${task.status})${task.dueDate ? ` - Vencimento: ${new Date(task.dueDate).toLocaleDateString('pt-BR')}` : ''}${task.assignee ? ` - Responsável: ${task.assignee}` : ''}${task.group ? ` - Grupo: ${task.group}` : ''}`
      ).join('\n');
      
      systemContext += `\n\nTAREFAS ATUAIS DO WORKSPACE:\n${tasksSummary}\n\nUse essas informações para responder perguntas sobre resumos, pautas, tarefas atrasadas, etc. Analise os dados reais e forneça informações precisas.`;
    }

    // Construir histórico de mensagens para contexto (últimas 10 para não exceder tokens)
    const historyMessages = conversationHistory
      .slice(-10) // Últimas 10 mensagens
      .filter((msg: any) => msg.role !== 'system' && msg.content) // Filtrar mensagens vazias e system
      .map((msg: any) => ({
        role: msg.role === 'user' ? 'user' as const : 'assistant' as const,
        content: msg.content || msg.text || ''
      }));

    // Construir array de mensagens para OpenAI
    const messages = [
      {
        role: 'system' as const,
        content: systemContext
      },
      ...historyMessages,
      {
        role: 'user' as const,
        content: message
      }
    ];

    // Chamar OpenAI GPT
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', // Modelo mais barato e rápido
        messages: messages,
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Erro na API OpenAI:', errorData);
      return NextResponse.json(
        { error: 'Erro ao processar mensagem', details: errorData },
        { status: response.status }
      );
    }

    const data = await response.json();
    const assistantMessage = data.choices[0]?.message?.content || 'Desculpe, não consegui processar sua mensagem.';

    // Detectar intenções especiais (criação de tarefa, etc.) - versão melhorada e mais flexível
    const lowerMessage = message.toLowerCase().trim();
    const lowerAssistantMessage = assistantMessage.toLowerCase();
    
    // Palavras-chave de ação (mais flexível)
    const actionKeywords = ['criar', 'nova', 'adicionar', 'fazer', 'preciso', 'quero', 'vou criar', 'cria', 'crie', 'cadastrar', 'registrar', 'anotar', 'lembrar'];
    // Palavras-chave de objeto
    const objectKeywords = ['tarefa', 'task', 'atividade', 'item', 'coisa para fazer', 'lembrete', 'nota'];
    
    // Palavras-chave que indicam que NÃO é criação de tarefa (perguntas, suporte, etc.)
    const nonTaskKeywords = ['suporte', 'ajuda', 'help', 'como', 'dúvida', 'pergunta', 'explicar', 'entender', 'resumo', 'listar', 'mostrar', 'ver', 'consultar'];
    const isNonTaskRequest = nonTaskKeywords.some(keyword => lowerMessage.includes(keyword));
    
    // Verificar se contém palavras de ação
    const hasAction = actionKeywords.some(keyword => lowerMessage.includes(keyword));
    // Verificar se contém palavras de objeto
    const hasObject = objectKeywords.some(keyword => lowerMessage.includes(keyword));
    
    // Verificar se a resposta da IA menciona criação de tarefa (fallback)
    const aiMentionsTaskCreation = (lowerAssistantMessage.includes('criar') || lowerAssistantMessage.includes('criar tarefa')) && 
                                   (lowerAssistantMessage.includes('tarefa') || lowerAssistantMessage.includes('task') || lowerAssistantMessage.includes('atividade'));
    
    // Detecção mais flexível e permissiva:
    // 1. Ação + objeto (padrão completo)
    // 2. Ação com mensagem curta e direta (assumindo criação de tarefa)
    // 3. IA menciona criação de tarefa na resposta
    // 4. Mensagem contém "preciso" ou "quero" + algo (muito comum em áudio)
    // MAS não é criação de tarefa se contém palavras de não-tarefa
    const isShortDirectRequest = lowerMessage.length < 150 && 
                                  (lowerMessage.includes('preciso') || lowerMessage.includes('quero') || lowerMessage.includes('fazer'));
    
    const isTaskCreation = !isNonTaskRequest && (
      (hasAction && hasObject) || 
      (hasAction && lowerMessage.length < 100 && !lowerMessage.includes('?')) ||
      (hasAction && aiMentionsTaskCreation) ||
      (isShortDirectRequest && !lowerMessage.includes('?') && hasObject)
    );

    // Extrair informações estruturadas usando IA se for criação de tarefa
    let taskInfo = null;
    let hasMultipleTasks = false;
    let needsUserConfirmation = false;
    
    if (isTaskCreation) {
      try {
        // Chamar IA para extrair informações estruturadas
        const extractResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content: `Você é um assistente que extrai informações de mensagens para criar tarefas.

Data atual: ${new Date().toLocaleDateString('pt-BR')} (${new Date().toISOString().split('T')[0]})
Dia da semana atual: ${['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'][new Date().getDay()]}

${workspaceMembers && Array.isArray(workspaceMembers) && workspaceMembers.length > 0 ? `MEMBROS DISPONÍVEIS DO WORKSPACE (para identificar responsáveis):
${workspaceMembers.map((m: any) => `- ID: ${m.id}, Nome: ${m.name || m.full_name || 'Sem nome'}, Email: ${m.email || 'N/A'}`).join('\n')}

IMPORTANTE: Se a mensagem mencionar um nome de pessoa, tente identificar qual membro corresponde e retorne o assigneeId correspondente. Use correspondência parcial de nomes (ex: "João" corresponde a "João Silva").` : ''}

Analise a mensagem do usuário e extraia:
1. Título da tarefa (curto, máximo 100 caracteres) - CRIE um título descritivo se não houver
2. Descrição completa (texto completo da mensagem/transcrição, preservando TODOS os detalhes)
3. Descrição resumida (resumo de 1-2 linhas, máximo 200 caracteres)
4. Data de vencimento (se mencionada, calcule e retorne em formato ISO 8601)
   REGRAS DE CÁLCULO DE DATAS (CRÍTICO - SEGUIR EXATAMENTE):
   - "sexta-feira que vem" ou "próxima sexta" = PRÓXIMA sexta-feira (se hoje é sexta, será daqui 7 dias)
   - "sexta que vem" = PRÓXIMA sexta-feira (sempre a próxima, nunca hoje)
   - "próxima semana" = segunda-feira da próxima semana
   - "semana que vem" = segunda-feira da próxima semana
   - "dia 15" = dia 15 do mês atual (se já passou, do próximo mês)
   - "15/01" ou "15-01" = 15 de janeiro do ano atual
   - "hoje" = data atual
   - "amanhã" = data atual + 1 dia
   - "depois de amanhã" = data atual + 2 dias
   - IMPORTANTE: "que vem" ou "próxima" sempre significa a PRÓXIMA ocorrência, nunca hoje
5. Responsável (assigneeId) - se mencionar nome de pessoa, identifique o membro correspondente
6. Se há múltiplas tarefas (lista de compras, vários itens separados por vírgula, quebra de linha, etc.)
7. Se precisa confirmar com o usuário (múltiplas tarefas ou ambiguidade)

IMPORTANTE:
- SEMPRE crie um título descritivo, mesmo que o usuário não tenha fornecido explicitamente
- Para datas relativas, CALCULE a data correta baseada na data atual fornecida
- "sexta-feira que vem" = se hoje é sexta, será daqui 7 dias (próxima sexta)
- Se detectar múltiplas tarefas (ex: "lista de compras: pão, leite, ovos"), marque hasMultipleTasks como true
- Se houver múltiplas tarefas, extraia a lista em multipleTasksList
- Se houver ambiguidade ou múltiplas tarefas, marque needsUserConfirmation como true
- Se identificar um responsável na mensagem, retorne o assigneeId correspondente
- Ao extrair datas para o campo dueDate, use o formato ISO 8601. IMPORTANTE: Se o usuário não especificar um horário, defina a hora sempre como T12:00:00 (Meio-dia) para evitar conflitos de fuso horário. Exemplo: "2023-10-25T12:00:00".

Responda APENAS com JSON válido no formato:
{
  "title": "título descritivo da tarefa",
  "descriptionFull": "descrição completa com todos os detalhes da mensagem",
  "descriptionShort": "resumo curto de 1-2 linhas",
  "dueDate": "2024-01-15T12:00:00" ou null (formato ISO 8601),
  "assigneeId": "uuid-do-membro" ou null,
  "hasMultipleTasks": true/false,
  "needsUserConfirmation": true/false,
  "multipleTasksList": ["tarefa 1", "tarefa 2"] ou null
}`
              },
              {
                role: 'user',
                content: `Extraia informações da seguinte mensagem para criar uma tarefa:\n\n${message}`
              }
            ],
            temperature: 0.3,
            max_tokens: 500,
            response_format: { type: 'json_object' },
          }),
        });

        if (extractResponse.ok) {
          const extractData = await extractResponse.json();
          const extractedContent = extractData.choices?.[0]?.message?.content || '{}';
          
          try {
            const extracted = JSON.parse(extractedContent);

            // Calcular data se for relativa
            let dueDateISO: string | null = extracted.dueDate || null;
            if (extracted.dueDate && !extracted.dueDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
              // Se não estiver no formato ISO, tentar parsear
              const parsedDate = new Date(extracted.dueDate);
              if (!isNaN(parsedDate.getTime())) {
                // Usar formatação local ao invés de toISOString para evitar problemas de timezone
                dueDateISO = formatDateLocal(parsedDate);
              } else {
                dueDateISO = null;
              }
            } else if (extracted.dueDate && extracted.dueDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
              // Se já está no formato correto, validar que não há problema de timezone
              // Criar data no timezone local para garantir
              const [year, month, day] = extracted.dueDate.split('-').map(Number);
              const localDate = new Date(year, month - 1, day);
              dueDateISO = formatDateLocal(localDate);
            }

            // Função auxiliar para calcular datas relativas em português
            const calculateRelativeDate = (dateText: string): string | null => {
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const dayOfWeek = today.getDay(); // 0 = domingo, 6 = sábado
              
              const text = dateText.toLowerCase();
              
              // Dias da semana
              const weekDays: { [key: string]: number } = {
                'domingo': 0, 'segunda': 1, 'terça': 2, 'quarta': 3,
                'quinta': 4, 'sexta': 5, 'sábado': 6
              };
              
              // Próxima sexta-feira - SEMPRE a próxima, nunca hoje
              if ((text.includes('sexta') || text.includes('sexta-feira')) && 
                  (text.includes('que vem') || text.includes('próxima') || text.includes('próximo'))) {
                const targetDay = 5; // Sexta
                let daysToAdd = targetDay - dayOfWeek;
                // Se hoje é sexta (dayOfWeek === 5), daysToAdd será 0, então adiciona 7 dias
                // Se hoje é sábado (dayOfWeek === 6), daysToAdd será -1, então adiciona 6 dias
                // Se hoje é domingo a quinta, daysToAdd será positivo, então adiciona normalmente
                if (daysToAdd <= 0) {
                  daysToAdd += 7; // Sempre a próxima ocorrência
                }
                const targetDate = new Date(today);
                targetDate.setDate(today.getDate() + daysToAdd);
                return formatDateLocal(targetDate);
              }
              
              // Detectar outros dias da semana com "que vem" ou "próxima"
              for (const [dayName, dayNum] of Object.entries(weekDays)) {
                if (text.includes(dayName) && 
                    (text.includes('que vem') || text.includes('próxima') || text.includes('próximo'))) {
                  let daysToAdd = dayNum - dayOfWeek;
                  if (daysToAdd <= 0) {
                    daysToAdd += 7; // Sempre a próxima ocorrência
                  }
                  const targetDate = new Date(today);
                  targetDate.setDate(today.getDate() + daysToAdd);
                  return formatDateLocal(targetDate);
                }
              }
              
              // Próxima semana
              if (text.includes('próxima semana') || text.includes('semana que vem')) {
                const targetDate = new Date(today);
                targetDate.setDate(today.getDate() + 7);
                return formatDateLocal(targetDate);
              }
              
              // Amanhã
              if (text.includes('amanhã')) {
                const targetDate = new Date(today);
                targetDate.setDate(today.getDate() + 1);
                return formatDateLocal(targetDate);
              }
              
              // Depois de amanhã
              if (text.includes('depois de amanhã')) {
                const targetDate = new Date(today);
                targetDate.setDate(today.getDate() + 2);
                return formatDateLocal(targetDate);
              }
              
              // Hoje
              if (text.includes('hoje')) {
                return formatDateLocal(today);
              }
              
              // Dia específico do mês (ex: "dia 15")
              const dayMatch = text.match(/dia\s+(\d+)/);
              if (dayMatch) {
                const day = parseInt(dayMatch[1]);
                const targetDate = new Date(today.getFullYear(), today.getMonth(), day);
                if (targetDate < today) {
                  targetDate.setMonth(targetDate.getMonth() + 1);
                }
                return formatDateLocal(targetDate);
              }
              
              return null;
            };
            
            // Processar data relativa em português se a IA não retornou
            if (!dueDateISO) {
              const dateMatch = lowerMessage.match(/(?:até|para|pra|no|em|até|até\s+a)\s+(.+?)(?:\s|$|,|\.)/i);
              if (dateMatch) {
                const calculatedDate = calculateRelativeDate(dateMatch[1]);
                if (calculatedDate) {
                  dueDateISO = calculatedDate;
                }
              }
            }
            
            hasMultipleTasks = extracted.hasMultipleTasks || false;
            needsUserConfirmation = extracted.needsUserConfirmation || false;
            
            // Validar assigneeId se fornecido pela IA
            let assigneeId: string | null = null;
            if (extracted.assigneeId && workspaceMembers && Array.isArray(workspaceMembers)) {
              // Verificar se o assigneeId corresponde a um membro válido
              const memberExists = workspaceMembers.some((m: any) => m.id === extracted.assigneeId);
              if (memberExists) {
                assigneeId = extracted.assigneeId;
              } else {
                // Tentar fazer match por nome se o ID não corresponder
                const lowerMessage = message.toLowerCase();
                const matchedMember = workspaceMembers.find((m: any) => {
                  const memberName = (m.name || m.full_name || '').toLowerCase();
                  return memberName && lowerMessage.includes(memberName);
                });
                if (matchedMember) {
                  assigneeId = matchedMember.id;
                }
              }
            }
            
            taskInfo = {
              title: extracted.title || 'Nova tarefa',
              description: extracted.descriptionFull || message, // Descrição completa
              descriptionShort: extracted.descriptionShort || '', // Descrição resumida
              dueDate: dueDateISO,
              assigneeId: assigneeId,
              priority: 'medium' as const,
              status: 'todo' as const,
              hasMultipleTasks: hasMultipleTasks,
              needsUserConfirmation: needsUserConfirmation,
              multipleTasksList: extracted.multipleTasksList || null,
            };
          } catch (parseError) {
            console.error('Erro ao parsear extração:', parseError);
            // Fallback para extração simples
            taskInfo = {
              title: message.length > 100 ? message.substring(0, 100) : message,
              description: message,
              descriptionShort: message.length > 200 ? message.substring(0, 200) + '...' : message,
              dueDate: null,
              assigneeId: null,
              priority: 'medium' as const,
              status: 'todo' as const,
            };
          }
        } else {
          // Fallback se a extração falhar
          taskInfo = {
            title: message.length > 100 ? message.substring(0, 100) : message,
            description: message,
            descriptionShort: message.length > 200 ? message.substring(0, 200) + '...' : message,
            dueDate: null,
            assigneeId: null,
            priority: 'medium' as const,
            status: 'todo' as const,
          };
        }
      } catch (error) {
        console.error('Erro ao extrair informações da tarefa:', error);
        // Fallback
        taskInfo = {
          title: message.length > 100 ? message.substring(0, 100) : message,
          description: message,
          descriptionShort: message.length > 200 ? message.substring(0, 200) + '...' : message,
          dueDate: null,
          assigneeId: null,
          priority: 'medium' as const,
          status: 'todo' as const,
        };
      }
    }

    return NextResponse.json({
      message: assistantMessage,
      isTaskCreation: isTaskCreation,
      taskInfo: taskInfo,
      hasMultipleTasks: hasMultipleTasks,
      needsUserConfirmation: needsUserConfirmation,
    });

  } catch (error) {
    console.error('Erro ao processar chat:', error);
    return NextResponse.json(
      {
        error: 'Erro interno ao processar mensagem',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    );
  }
}

