import { NextRequest, NextResponse } from 'next/server';
import { createServerActionClient } from '@/lib/supabase/server';

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB (limite da Whisper API)

export async function POST(request: NextRequest) {
    try {
        const apiKey = process.env.OPENAI_API_KEY;

        if (!apiKey) {
            return NextResponse.json(
                { error: 'OPENAI_API_KEY não configurada' },
                { status: 500 }
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

        const formData = await request.formData();
        const audioFile = formData.get('audio') as File;
        const workspaceId = formData.get('workspaceId') as string | null;

        if (!audioFile) {
            return NextResponse.json(
                { error: 'Arquivo de áudio não fornecido' },
                { status: 400 }
            );
        }

        // Validar tamanho do arquivo (limite da Whisper API: 25 MB)
        if (audioFile.size > MAX_FILE_SIZE_BYTES) {
            return NextResponse.json(
                { error: 'Arquivo de áudio muito grande. O limite é 25 MB.' },
                { status: 400 }
            );
        }

        // Verificar acesso do workspace se workspaceId fornecido
        if (workspaceId) {
            const { checkWorkspaceAccess } = await import('@/lib/utils/subscription');
            const accessCheck = await checkWorkspaceAccess(workspaceId);

            if (!accessCheck.allowed) {
                return NextResponse.json(
                    {
                        error: accessCheck.reason || 'Seu trial expirou. Escolha um plano para continuar.',
                        upgradeRequired: true
                    },
                    { status: 403 }
                );
            }
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
            console.error('Erro na API OpenAI Whisper:', errorData);
            return NextResponse.json(
                { error: 'Erro ao transcrever áudio' },
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
            { error: 'Erro interno ao processar transcrição' },
            { status: 500 }
        );
    }
}
