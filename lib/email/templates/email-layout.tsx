import {
  Body,
  Container,
  Head,
  Html,
  Link,
  Preview,
  Section,
  Img,
} from "@react-email/components";
import * as React from "react";

export const BRAND = {
  primaryColor: "#10b981",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
  logoAlt: "Symples",
} as const;

export interface EmailLayoutProps {
  /** Conteúdo principal do e-mail */
  children: React.ReactNode;
  /** Texto de pré-visualização (preview) no cliente de e-mail */
  previewText?: string;
  /** URL base (origin) para logo e links; se não informado, usa do inviteLink ou fallback */
  baseUrl?: string;
}

const main = {
  backgroundColor: "#f6f9fc",
  fontFamily: BRAND.fontFamily,
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "40px 20px",
  marginBottom: "64px",
  borderRadius: "8px",
  maxWidth: "600px",
};

const logoSection = {
  textAlign: "center" as const,
  marginBottom: "32px",
};

const logoImage = {
  margin: "0 auto",
  display: "block",
  maxWidth: "120px",
  height: "auto",
};

const footerSection = {
  marginTop: "32px",
  paddingTop: "24px",
  borderTop: "1px solid #e5e7eb",
};

const footerText = {
  fontSize: "12px",
  lineHeight: "18px",
  color: "#6b7280",
  textAlign: "center" as const,
  margin: "0",
};

/**
 * Layout base reutilizável para e-mails: logo no topo, conteúdo no meio, rodapé padrão.
 * Novos templates devem usar este componente para manter branding e estilos consistentes.
 */
export function EmailLayout({
  children,
  previewText,
  baseUrl = "https://symples.com",
}: EmailLayoutProps) {
  const logoUrl = `${baseUrl}/logo-black.svg`;

  return (
    <Html>
      <Head />
      {previewText ? <Preview>{previewText}</Preview> : null}
      <Body style={main}>
        <Container style={container}>
          <Section style={logoSection}>
            <Link href={baseUrl} style={{ textDecoration: "none" }}>
              <Img
                src={logoUrl}
                alt={BRAND.logoAlt}
                width={120}
                height={36}
                style={logoImage}
              />
            </Link>
          </Section>

          {children}

          <Section style={footerSection}>
            <p style={footerText}>
              Se você não esperava este e-mail, pode ignorá-lo com segurança.
            </p>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
