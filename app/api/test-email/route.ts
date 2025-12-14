/**
 * Rota de API para testar o envio de email via Resend
 * 
 * Uso:
 *   GET /api/test-email?email=seu-email@exemplo.com
 * 
 * Ou POST com body JSON:
 *   POST /api/test-email
 *   {
 *     "email": "seu-email@exemplo.com"
 *   }
 */

import { NextRequest, NextResponse } from "next/server";
import { sendInviteEmail } from "@/lib/email/send-invite";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const email = searchParams.get("email");

    if (!email) {
      return NextResponse.json(
        {
          success: false,
          error: "Parâmetro 'email' é obrigatório. Use: /api/test-email?email=seu-email@exemplo.com",
        },
        { status: 400 }
      );
    }

    // Validar formato do email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        {
          success: false,
          error: `Email inválido: ${email}`,
        },
        { status: 400 }
      );
    }

    // Verificar se RESEND_API_KEY está configurada
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json(
        {
          success: false,
          error: "RESEND_API_KEY não está configurada no .env.local",
        },
        { status: 500 }
      );
    }

    // Dados de teste
    const testData = {
      to: email,
      workspaceName: "Workspace de Teste",
      inviterName: "Equipe Symples",
      inviteLink: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/invite/test-email-123`,
      role: "member" as const,
      isNewUser: true,
    };

    const result = await sendInviteEmail(testData);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: "Email de teste enviado com sucesso!",
        emailId: result.id,
        to: email,
        note: "Verifique sua caixa de entrada (e pasta de spam) em alguns instantes.",
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error || "Falha ao enviar email",
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("Erro ao testar envio de email:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Erro desconhecido ao testar envio de email",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = body.email;

    if (!email) {
      return NextResponse.json(
        {
          success: false,
          error: "Campo 'email' é obrigatório no body da requisição",
        },
        { status: 400 }
      );
    }

    // Validar formato do email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        {
          success: false,
          error: `Email inválido: ${email}`,
        },
        { status: 400 }
      );
    }

    // Verificar se RESEND_API_KEY está configurada
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json(
        {
          success: false,
          error: "RESEND_API_KEY não está configurada no .env.local",
        },
        { status: 500 }
      );
    }

    // Dados de teste
    const testData = {
      to: email,
      workspaceName: body.workspaceName || "Workspace de Teste",
      inviterName: body.inviterName || "Equipe Symples",
      inviteLink:
        body.inviteLink ||
        `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/invite/test-email-123`,
      role: (body.role || "member") as "admin" | "member" | "viewer",
      isNewUser: body.isNewUser !== undefined ? body.isNewUser : true,
    };

    const result = await sendInviteEmail(testData);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: "Email de teste enviado com sucesso!",
        emailId: result.id,
        to: email,
        note: "Verifique sua caixa de entrada (e pasta de spam) em alguns instantes.",
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error || "Falha ao enviar email",
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("Erro ao testar envio de email:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Erro desconhecido ao testar envio de email",
      },
      { status: 500 }
    );
  }
}







