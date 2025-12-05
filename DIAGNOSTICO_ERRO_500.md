# 🔍 Diagnóstico do Erro 500 ao Convidar Membros

## ✅ Correções Aplicadas

1. ✅ Substituído `.single()` por `.maybeSingle()` em todas as queries que podem não retornar resultado
2. ✅ Adicionado tratamento de erro para código `PGRST116` (registro não encontrado)
3. ✅ Melhorado tratamento de erros nas queries do workspace e perfil

## 🔍 Como Diagnosticar o Erro 500

### Passo 1: Verificar Logs do Servidor

O erro 500 está ocorrendo, mas precisamos ver os logs detalhados para identificar a causa exata.

**No terminal onde o servidor está rodando (`npm run dev`), você deve ver:**

```
❌ Erro crítico em inviteMember: { ... }
```

Ou alguma mensagem de erro específica que nos dirá o que está acontecendo.

### Passo 2: Verificar o Console do Navegador

No console do navegador (F12 → Console), você pode ver:
- A mensagem de erro retornada
- O status 500
- Detalhes do erro

### Passo 3: Verificar Possíveis Causas

#### 1. **Problema com a query do workspace**
- Se o workspace não existe ou há problema de RLS
- **Sintoma**: Erro ao buscar dados do workspace

#### 2. **Problema ao criar o convite**
- Se há constraint violado ou problema de RLS
- **Sintoma**: Erro ao criar convite no banco

#### 3. **Problema com o envio de email**
- Se há erro ao renderizar o template ou enviar via Resend
- **Sintoma**: Erro ao processar envio de email

#### 4. **Problema de permissão RLS**
- Se as políticas RLS estão bloqueando a operação
- **Sintoma**: Erro de permissão nas queries

## 🔧 Ações para Resolver

### 1. Adicionar Try-Catch Geral

Envolva a função inteira em um try-catch para capturar todos os erros:

```typescript
export async function inviteMember(...) {
  try {
    // ... código existente ...
  } catch (error: any) {
    console.error("❌ Erro crítico em inviteMember:", {
      message: error.message,
      stack: error.stack,
      workspaceId,
      email,
      role,
    });
    throw error;
  }
}
```

### 2. Verificar Logs Detalhados

Procure no terminal por:
- `Erro ao verificar permissões`
- `Erro ao buscar dados do workspace`
- `Erro ao criar convite`
- `Erro ao processar envio de email`

### 3. Testar Passo a Passo

1. **Teste com usuário que já existe:**
   - Deve adicionar diretamente ao workspace
   - Não deve criar convite

2. **Teste com usuário novo:**
   - Deve criar convite pendente
   - Deve tentar enviar email

3. **Teste com workspace inválido:**
   - Deve retornar erro específico

## 📝 Informações Necessárias

Para resolver o problema, preciso que você me envie:

1. **Logs do terminal do servidor** quando ocorre o erro 500
2. **Mensagem de erro completa** do console do navegador
3. **Email que você está tentando convidar**
4. **Se o usuário já existe no sistema ou não**

## 🚀 Próximos Passos

1. Tente enviar um convite novamente
2. Copie TODOS os logs do terminal
3. Copie a mensagem de erro do navegador
4. Envie essas informações para que eu possa identificar o problema exato

