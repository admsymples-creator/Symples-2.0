import {
  Heading,
  Link,
  Section,
  Text,
  Button,
  Hr,
} from "@react-email/components";
import * as React from "react";
import { EmailLayout, BRAND } from "./email-layout";

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

  const baseUrl = inviteLink ? new URL(inviteLink).origin : "https://symples.com";
  const previewText = `Você foi convidado para participar do workspace ${workspaceName}`;

  return (
    <EmailLayout baseUrl={baseUrl} previewText={previewText}>
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
    </EmailLayout>
  );
}

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
  backgroundColor: BRAND.primaryColor,
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
