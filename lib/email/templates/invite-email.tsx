import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
  Button,
  Hr,
  Img,
} from "@react-email/components";
import * as React from "react";

interface InviteEmailProps {
  workspaceName: string;
  inviterName: string | null;
  inviteLink: string;
  role: string;
  isNewUser?: boolean;
}

export function InviteEmail({
  workspaceName,
  inviterName,
  inviteLink,
  role,
  isNewUser = false,
}: InviteEmailProps) {
  const roleLabels: Record<string, string> = {
    admin: "Administrador",
    member: "Membro",
    viewer: "Visualizador",
  };

  // Extrair URL base do inviteLink para construir URL do logo
  const baseUrl = inviteLink ? new URL(inviteLink).origin : 'https://symples.com';
  const logoUrl = `${baseUrl}/logo-black.svg`;

  return (
    <Html>
      <Head />
      <Preview>
        Você foi convidado para participar do workspace {workspaceName}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={logo}>
            <Img
              src={logoUrl}
              alt="Symples"
              width="120"
              height="36"
              style={logoImage}
            />
          </Section>
          
          <Heading style={heading}>
            Você foi convidado! 🎉
          </Heading>
          
          <Text style={paragraph}>
            {inviterName ? (
              <>
                <strong>{inviterName}</strong> convidou você para participar do workspace{" "}
                <strong>{workspaceName}</strong>.
              </>
            ) : (
              <>
                Você foi convidado para participar do workspace{" "}
                <strong>{workspaceName}</strong>.
              </>
            )}
          </Text>

          <Text style={paragraph}>
            Sua função será: <strong>{roleLabels[role] || role}</strong>
          </Text>

          {isNewUser && (
            <Text style={paragraph}>
              Como você ainda não tem uma conta no Symples, você precisará criar uma conta para aceitar este convite.
            </Text>
          )}

          <Section style={buttonContainer}>
            <Button style={button} href={inviteLink}>
              {isNewUser ? "Criar Conta e Aceitar" : "Aceitar Convite"}
            </Button>
          </Section>

          <Hr style={hr} />

          <Text style={footer}>
            Ou copie e cole este link no seu navegador:
            <br />
            <Link href={inviteLink} style={link}>
              {inviteLink}
            </Link>
          </Text>

          <Text style={footer}>
            Se você não esperava este convite, pode ignorar este email.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

// Estilos inline para compatibilidade com clientes de email
const main = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "40px 20px",
  marginBottom: "64px",
  borderRadius: "8px",
  maxWidth: "600px",
};

const logo = {
  textAlign: "center" as const,
  marginBottom: "32px",
};

const logoImage = {
  margin: "0 auto",
  display: "block",
  maxWidth: "120px",
  height: "auto",
};

const heading = {
  fontSize: "24px",
  fontWeight: "600",
  color: "#111827",
  textAlign: "center" as const,
  marginBottom: "24px",
  marginTop: "0",
};

const paragraph = {
  fontSize: "16px",
  lineHeight: "24px",
  color: "#374151",
  marginBottom: "16px",
  textAlign: "left" as const,
};

const buttonContainer = {
  textAlign: "center" as const,
  margin: "32px 0",
};

const button = {
  backgroundColor: "#10b981",
  borderRadius: "6px",
  color: "#ffffff",
  fontSize: "16px",
  fontWeight: "600",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  padding: "12px 32px",
};

const hr = {
  borderColor: "#e5e7eb",
  margin: "32px 0",
};

const footer = {
  fontSize: "14px",
  lineHeight: "20px",
  color: "#6b7280",
  textAlign: "center" as const,
  marginTop: "16px",
};

const link = {
  color: "#4f46e5",
  textDecoration: "underline",
  wordBreak: "break-all" as const,
};

