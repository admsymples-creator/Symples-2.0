import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const apiKey = process.env.OPENAI_API_KEY;
        
        if (!apiKey) {
            return NextResponse.json(
                { error: 'OPENAI_API_KEY não configurada' },
                { status: 500 }
            );
        }

        const { text } = await request.json();

        if (!text || typeof text !== 'string') {
            return NextResponse.json(
                { error: 'Texto não fornecido' },
                { status: 400 }
            );
        }

        // Chamar OpenAI GPT para extrair título e data
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
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
                        content: `Você é um assistente que extrai informações de transcrições de áudio para criar tarefas.
Analise o texto e extraia:
1. Um título curto e descritivo para a tarefa (máximo 60 caracteres)
2. Uma data de entrega, se mencionada no texto (formato ISO: YYYY-MM-DD)

Responda APENAS com um JSON válido no formato:
{
  "title": "título da tarefa",
  "dueDate": "2024-01-15" ou null
}

Se não houver data mencionada, use null para dueDate.`
                    },
                    {
                        role: 'user',
                        content: `Extraia o título e data de entrega da seguinte transcrição:\n\n${text}`
                    }
                ],
                temperature: 0.3,
                max_tokens: 150,
                response_format: { type: 'json_object' },
            }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('Erro na API OpenAI:', errorData);
            return NextResponse.json(
                { error: 'Erro ao extrair informações', details: errorData },
                { status: response.status }
            );
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || '{}';
        
        let extractedInfo;
        try {
            extractedInfo = JSON.parse(content);
        } catch (parseError) {
            console.error('Erro ao parsear JSON:', parseError);
            // Fallback: gerar título padrão
            extractedInfo = {
                title: 'Tarefa de áudio',
                dueDate: null,
            };
        }

        // Validar e formatar data se existir
        let dueDateISO: string | null = null;
        if (extractedInfo.dueDate) {
            try {
                const date = new Date(extractedInfo.dueDate);
                if (!isNaN(date.getTime())) {
                    dueDateISO = date.toISOString().split('T')[0]; // YYYY-MM-DD
                }
            } catch (dateError) {
                console.error('Erro ao processar data:', dateError);
            }
        }

        return NextResponse.json({
            title: extractedInfo.title || 'Tarefa de áudio',
            dueDate: dueDateISO,
        });

    } catch (error) {
        console.error('Erro ao processar extração:', error);
        return NextResponse.json(
            { error: 'Erro interno ao processar extração', details: error instanceof Error ? error.message : 'Erro desconhecido' },
            { status: 500 }
        );
    }
}






