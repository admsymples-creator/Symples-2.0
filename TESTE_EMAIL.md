# 🧪 Como Testar o Envio de Email

Existem duas formas de testar o envio de email sem passar pelo fluxo completo de convite:

## Método 1: Rota de API (Recomendado - Via Browser)

A forma mais fácil de testar é usando a rota de API que criamos.

### Como usar:

1. **Inicie o servidor de desenvolvimento:**
   ```bash
   npm run dev
   ```

2. **Acesse no navegador ou use curl:**
   
   **Via Browser (GET):**
   ```
   http://localhost:3000/api/test-email?email=seu-email@exemplo.com
   ```
   
   **Via Terminal (GET):**
   ```bash
   curl "http://localhost:3000/api/test-email?email=seu-email@exemplo.com"
   ```
   
   **Via Terminal (POST com JSON):**
   ```bash
   curl -X POST http://localhost:3000/api/test-email \
     -H "Content-Type: application/json" \
     -d '{"email": "seu-email@exemplo.com"}'
   ```

3. **Resposta de sucesso:**
   ```json
   {
     "success": true,
     "message": "Email de teste enviado com sucesso!",
     "emailId": "re_xxxxx",
     "to": "seu-email@exemplo.com",
     "note": "Verifique sua caixa de entrada (e pasta de spam) em alguns instantes."
   }
   ```

### Parâmetros opcionais (apenas no POST):

Você pode personalizar o email de teste enviando um JSON:

```bash
curl -X POST http://localhost:3000/api/test-email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "seu-email@exemplo.com",
    "workspaceName": "Meu Workspace",
    "inviterName": "João Silva",
    "role": "admin"
  }'
```

---

## Método 2: Script JavaScript (Via Terminal)

Use este método se quiser testar diretamente via linha de comando, sem precisar iniciar o servidor.

### Pré-requisitos:

- Node.js instalado
- Arquivo `.env.local` configurado com `RESEND_API_KEY`

### Como usar:

1. **Execute o script com o email de destino:**
   ```bash
   node scripts/test-email.js seu-email@exemplo.com
   ```

2. **Ou configure a variável `TEST_EMAIL` no `.env.local`:**
   ```bash
   TEST_EMAIL=seu-email@exemplo.com
   ```
   
   E depois execute:
   ```bash
   node scripts/test-email.js
   ```

### Exemplo de saída:

```
🧪 Testando envio de email via Resend...

📋 Configuração:
   Para: seu-email@exemplo.com
   De: Symples <onboarding@resend.dev>
   API Key: ✅ Configurada

📤 Enviando email de teste...

✅ Email enviado com sucesso!
   Email ID: re_xxxxx

📧 Verifique sua caixa de entrada (e pasta de spam) em alguns instantes.

💡 Dica: Você também pode verificar o envio no dashboard do Resend:
   https://resend.com/emails
```

---

## O que será testado?

O teste envia um email usando:
- ✅ O mesmo sistema de envio usado no fluxo de convites
- ✅ O template React de email (no método da API)
- ✅ A configuração do Resend do seu `.env.local`
- ✅ Validação de formato de email
- ✅ Tratamento de erros

**Nota:** O script JavaScript envia um HTML simples, enquanto a rota de API usa o template completo de convite.

---

## Troubleshooting

### Erro: "RESEND_API_KEY não está configurada"

**Solução:**
1. Verifique se o arquivo `.env.local` existe na raiz do projeto
2. Adicione a linha: `RESEND_API_KEY=re_xxxxxxxxxxxxx`
3. Reinicie o servidor (se usando a rota de API)

### Erro: "Email inválido"

**Solução:**
- Verifique se o email está no formato correto: `usuario@dominio.com`
- Remova espaços antes ou depois do email

### Email não chegou

**Solução:**
1. Verifique a pasta de spam
2. Acesse o dashboard do Resend: https://resend.com/emails
3. Verifique os logs do console do servidor para erros
4. Confirme se a API key está ativa no Resend

### Erro ao executar o script

**Solução:**
- Certifique-se de estar na raiz do projeto
- Verifique se Node.js está instalado: `node --version`
- Verifique se o arquivo `scripts/test-email.js` existe

---

## Próximos Passos

Depois de confirmar que o email está funcionando:

1. ✅ Teste o fluxo completo de convite na interface
2. ✅ Verifique o template de email no dashboard do Resend
3. ✅ Teste com diferentes tipos de email (Gmail, Outlook, etc.)
4. ✅ Configure um domínio customizado (opcional)

---

## Referências

- [Documentação do Resend](https://resend.com/docs)
- [Dashboard do Resend](https://resend.com/emails)
- [Troubleshooting de Email](./TROUBLESHOOTING_EMAIL.md)


