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

        // Receber o blob de áudio do FormData
        const formData = await request.formData();
        const audioFile = formData.get('audio') as File;

        if (!audioFile) {
            return NextResponse.json(
                { error: 'Arquivo de áudio não fornecido' },
                { status: 400 }
            );
        }

        // Converter File para formato aceito pela OpenAI
        const audioBlob = new Blob([audioFile], { type: audioFile.type });
        const audioFormData = new FormData();
        audioFormData.append('file', audioBlob, audioFile.name);
        audioFormData.append('model', 'whisper-1');
        audioFormData.append('language', 'pt'); // Português

        // Chamar OpenAI Whisper API
        const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
            },
            body: audioFormData,
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('Erro na API OpenAI:', errorData);
            return NextResponse.json(
                { error: 'Erro ao transcrever áudio', details: errorData },
                { status: response.status }
            );
        }

        const data = await response.json();
        
        return NextResponse.json({
            transcription: data.text || '',
        });

    } catch (error) {
        console.error('Erro ao processar transcrição:', error);
        return NextResponse.json(
            { error: 'Erro interno ao processar transcrição', details: error instanceof Error ? error.message : 'Erro desconhecido' },
            { status: 500 }
        );
    }
}






