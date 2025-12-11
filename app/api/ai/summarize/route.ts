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

        // Chamar OpenAI GPT para gerar resumo
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
                        content: 'Você é um assistente que cria resumos concisos e objetivos de transcrições de áudio. O resumo deve destacar os pontos principais e ações a serem tomadas, se houver.'
                    },
                    {
                        role: 'user',
                        content: `Crie um resumo conciso e objetivo da seguinte transcrição de áudio:\n\n${text}`
                    }
                ],
                temperature: 0.3,
                max_tokens: 200,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('Erro na API OpenAI:', errorData);
            return NextResponse.json(
                { error: 'Erro ao gerar resumo', details: errorData },
                { status: response.status }
            );
        }

        const data = await response.json();
        const summary = data.choices?.[0]?.message?.content || '';

        return NextResponse.json({
            summary: summary.trim(),
        });

    } catch (error) {
        console.error('Erro ao processar resumo:', error);
        return NextResponse.json(
            { error: 'Erro interno ao processar resumo', details: error instanceof Error ? error.message : 'Erro desconhecido' },
            { status: 500 }
        );
    }
}










