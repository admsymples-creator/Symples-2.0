# 🔧 Troubleshooting: Emails Não Estão Chegando

## Checklist de Diagnóstico

### 1. Verificar Configuração Básica

#### Verificar se `RESEND_API_KEY` está configurada:

**Localmente (`.env.local`):**
```bash
# Verifique se existe o arquivo .env.local
cat .env.local | grep RESEND
```

**Deve conter:**
```bash
RESEND_API_KEY=re_xxxxxxxxxxxxx
RESEND_FROM_EMAIL=noreply@seudominio.com  # Opcional
RESEND_FROM_NAME=Symples                    # Opcional
```

#### No Vercel (Produção):
1. Vá em **Settings → Environment Variables**
2. Verifique se `RESEND_API_KEY` está configurada
3. Certifique-se de que está ativa para o ambiente correto (Production/Preview/Development)

### 2. Verificar Logs do Console

Quando você enviar um convite, verifique os logs no console:

**Logs esperados:**
```
📧 Iniciando envio de email de convite: { ... }
📤 Tentando enviar email de convite: { ... }
📨 Payload do email (sem HTML): { ... }
✅ Email enviado com sucesso: { ... }
```

**Se ver isso, a API key não está configurada:**
```
⚠️ RESEND_API_KEY não configurada. Email não será enviado.
📧 [DEV] Email de convite simulado: { ... }
```

**Se ver erro:**
```
❌ Erro ao enviar email via Resend: { ... }
```

### 3. Verificar Conta Resend

1. Acesse https://resend.com/api-keys
2. Verifique se a API key está ativa
3. Verifique os logs de emails enviados no dashboard do Resend
4. Veja se há erros ou bounces

### 4. Verificar Email do Destinatário

- ✅ Email está correto e válido?
- ✅ Não está na pasta de spam?
- ✅ Verifique se o email do remetente está correto

### 5. Verificar Domínio (Se usando email customizado)

Se você configurou `RESEND_FROM_EMAIL` com um domínio customizado:

1. Acesse https://resend.com/domains
2. Verifique se o domínio está verificado
3. Verifique se os registros DNS estão corretos
4. Emails de domínios não verificados são bloqueados

### 6. Testar Envio Manual

Crie um script de teste (`test-email.js`):

```javascript
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

async function testEmail() {
  try {
    const { data, error } = await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: 'seu-email@exemplo.com',
      subject: 'Teste de Email',
      html: '<p>Este é um teste</p>',
    });

    if (error) {
      console.error('Erro:', error);
    } else {
      console.log('Email enviado:', data);
    }
  } catch (err) {
    console.error('Erro:', err);
  }
}

testEmail();
```

Execute:
```bash
node test-email.js
```

## Problemas Comuns

### Problema 1: API Key não configurada

**Sintoma:**
- Logs mostram: `⚠️ RESEND_API_KEY não configurada`
- Em desenvolvimento, o link aparece mas email não é enviado

**Solução:**
1. Obtenha a API key em https://resend.com/api-keys
2. Adicione no `.env.local`: `RESEND_API_KEY=re_xxxxx`
3. Reinicie o servidor de desenvolvimento

### Problema 2: Email vai para spam

**Sintoma:**
- Email não aparece na caixa de entrada
- Aparece na pasta de spam

**Solução:**
1. Use um domínio verificado no Resend
2. Configure SPF e DKIM no DNS
3. Verifique a reputação do domínio

### Problema 3: Erro "Invalid API key"

**Sintoma:**
- Logs mostram erro de autenticação
- Email não é enviado

**Solução:**
1. Verifique se a API key está correta
2. Verifique se a API key está ativa no dashboard do Resend
3. Gere uma nova API key se necessário

### Problema 4: Erro "Domain not verified"

**Sintoma:**
- Usando email customizado (ex: `noreply@meudominio.com`)
- Erro ao enviar

**Solução:**
1. Verifique o domínio em https://resend.com/domains
2. Complete a verificação do domínio
3. Ou use o email padrão: `onboarding@resend.dev`

## Passos para Configurar

### Passo 1: Criar Conta no Resend
1. Acesse https://resend.com
2. Crie uma conta (plano free: 100 emails/dia)
3. Verifique seu email

### Passo 2: Obter API Key
1. Vá em **API Keys** no dashboard
2. Clique em **Create API Key**
3. Copie a chave (ela só aparece uma vez!)

### Passo 3: Configurar Variáveis de Ambiente

**Localmente (`.env.local`):**
```bash
RESEND_API_KEY=re_xxxxxxxxxxxxx
RESEND_FROM_EMAIL=onboarding@resend.dev
RESEND_FROM_NAME=Symples
```

**No Vercel:**
1. Settings → Environment Variables
2. Adicione `RESEND_API_KEY`
3. Adicione outras variáveis opcionais
4. Marque para Production/Preview/Development conforme necessário

### Passo 4: Reiniciar Servidor

```bash
# Parar o servidor (Ctrl+C)
# Iniciar novamente
npm run dev
```

## Verificação Rápida

Execute este comando para verificar se a API key está configurada:

```bash
# No terminal, dentro do projeto
node -e "console.log('RESEND_API_KEY:', process.env.RESEND_API_KEY ? '✅ Configurada' : '❌ Não configurada')"
```

Ou verifique nos logs quando enviar um convite - você verá se a key está configurada ou não.

## Próximos Passos

1. ✅ Verificar se `RESEND_API_KEY` está no `.env.local`
2. ✅ Verificar logs do console ao enviar convite
3. ✅ Verificar dashboard do Resend para ver se emails estão sendo enviados
4. ✅ Verificar pasta de spam do destinatário
5. ✅ Testar com email do próprio Resend (`onboarding@resend.dev`)

## Suporte

Se ainda tiver problemas:
1. Verifique os logs detalhados no console
2. Verifique o dashboard do Resend em https://resend.com/emails
3. Verifique os logs de erro retornados pelo Resend
4. Entre em contato com o suporte do Resend se necessário


