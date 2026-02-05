# Como validar o sistema de e-mail

Guia para conferir se **validação**, **retry**, **logs** e **templates** estão funcionando.

---

## 1. Pré-requisitos

- **Node** e **npm** instalados
- Projeto com dependências instaladas (`npm install`)
- Opcional: `RESEND_API_KEY` no `.env.local` para envio real

---

## 2. Validação de e-mail (sem enviar)

A validação está em `lib/email/validate-email.ts`. Para testar **sem enviar e-mail**, chame a API com um e-mail inválido:

```bash
# Deve retornar 400 com mensagem de validação
curl "http://localhost:3000/api/test-email?email=invalido"
curl "http://localhost:3000/api/test-email?email=@dominio.com"
```

Respostas esperadas: `{ "success": false, "error": "..." }` (ex.: "E-mail deve conter @", "Formato de e-mail inválido").

Ou abra o app, vá em **Convidar membro** e tente:

- **E-mail inválido** (ex: `abc`, `sem@`, `@dominio.com`) → deve mostrar erro de validação (não envia).
- **E-mail válido** (ex: `voce@email.com`) → segue para envio (ou simulação em dev sem API key).

---

## 3. Teste local **sem** API key (simulação)

Com o servidor rodando e **sem** `RESEND_API_KEY` no `.env.local`:

1. Inicie o app: `npm run dev`
2. Faça login e abra um workspace onde você é admin
3. Vá em **Configurações** (ou onde está o convite) e convide um e-mail válido
4. **Esperado**: não quebra; no **terminal** do Next aparece algo como:
   - `email_config_missing` e em dev o log `[DEV] Email de convite simulado` com link/workspace
5. A notificação interna de convite pode ser criada normalmente (convite fica salvo; só o e-mail não é enviado)

Assim você valida: **validação de e-mail** + **comportamento sem API key** + **logs centralizados**.

---

## 4. Teste local **com** API key (envio real)

1. No `.env.local`:
   ```env
   RESEND_API_KEY=re_xxxxxxxxxxxxx
   RESEND_FROM_EMAIL=onboarding@resend.dev
   RESEND_FROM_NAME=Symples
   ```
2. Reinicie o servidor: `npm run dev`
3. **Opção A – Rota de teste**
   - No navegador ou com `curl`:
     ```bash
     curl "http://localhost:3000/api/test-email?email=SEU-EMAIL@exemplo.com"
     ```
   - Ou POST:
     ```bash
     curl -X POST http://localhost:3000/api/test-email \
       -H "Content-Type: application/json" \
       -d '{"email":"SEU-EMAIL@exemplo.com"}'
     ```
   - **Esperado**: resposta `success: true` e e-mail na caixa de entrada (ou spam)
4. **Opção B – Script**
   ```bash
   npx tsx scripts/test-email.ts SEU-EMAIL@exemplo.com
   ```
   - **Esperado**: mensagem de sucesso no terminal e e-mail recebido
5. **Opção C – Convite pela UI**
   - Convidar um membro com um e-mail real
   - **Esperado**: e-mail de convite recebido com layout (logo, botão “Aceitar Convite”, rodapé)

Assim você valida: **envio real**, **template (EmailLayout)** e **fluxo de convite**.

---

## 5. Logs centralizados

Durante os testes, no **terminal do Next** (onde roda `npm run dev`) devem aparecer logs no formato:

- `email_send_start` – início do envio
- `email_send_success` – sucesso (com `emailId` se Resend retornar)
- `email_send_error` – erro (mensagem sem stack em produção)
- `email_send_retry` – retentativa (apenas se houver falha temporária)
- `email_validation_fail` – e-mail rejeitado pela validação
- `email_config_missing` – falta de `RESEND_API_KEY`

Em **produção**, o destinatário deve aparecer mascarado (ex.: `jo***@dominio.com`) nesses logs.

---

## 6. Retry (backoff)

O retry só acontece quando o Resend falha com erro **temporário** (timeout, 429, 5xx). Para simular:

- Use um e-mail inválido que passe na validação mas seja rejeitado pelo Resend, ou
- Desligue a internet por alguns segundos e tente enviar (pode dar timeout e ver retry nos logs)

Em condições normais você não verá `email_send_retry`; ele existe para falhas de rede/serviço.

---

## 7. Template (layout base)

O e-mail de convite usa o **EmailLayout** (logo + conteúdo + rodapé). Ao receber o e-mail de teste, confira:

- Logo no topo
- Texto “Você foi convidado! 🎉” e nome do workspace
- Botão “Aceitar Convite” (ou “Criar Conta e Aceitar” se `isNewUser`)
- Rodapé: “Se você não esperava este e-mail…”

Se tudo isso aparecer, o **layout base** e o **invite-email** estão ok.

---

## 8. Checklist rápido

| Item                         | Como validar                                      | OK? |
|-----------------------------|---------------------------------------------------|-----|
| Validação de e-mail         | Convidar com e-mail inválido → erro antes de enviar | ☐   |
| Comportamento sem API key   | Dev sem `RESEND_API_KEY` → simulação no log       | ☐   |
| Envio real                  | GET/POST `/api/test-email?email=...` ou script    | ☐   |
| Logs (start/success/error)  | Ver terminal ao enviar                            | ☐   |
| Template (logo, botão, footer) | Abrir e-mail recebido no cliente                | ☐   |
| Convite pela UI             | Convidar membro e receber e-mail                  | ☐   |

---

## 9. Erros comuns

- **“RESEND_API_KEY não está configurada”**  
  Adicione no `.env.local` e reinicie o servidor. Em dev, sem a chave o envio é apenas simulado.

- **“Email inválido” / “Formato de e-mail inválido”**  
  A validação (`validateEmail`) rejeitou. Use um e-mail no formato `local@dominio.ext`.

- **E-mail não chega**  
  Verifique spam; confira no [dashboard do Resend](https://resend.com/emails) se o envio aparece e o status (entregue, bounce, etc.).

- **Rota `/api/test-email` retorna 404**  
  Confirme que o servidor está rodando e que a rota existe em `app/api/test-email/route.ts`.

Se quiser, na próxima etapa podemos adicionar um script que rode a validação de e-mail e a rota de teste automaticamente e imprima esse checklist.
