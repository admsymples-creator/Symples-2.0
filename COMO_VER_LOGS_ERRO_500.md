# 📋 Como Ver os Logs do Erro 500

## O que Fazer Quando Ver o Erro 500

Quando você vê o erro **500 Internal Server Error** ao tentar enviar um convite, siga estes passos para coletar as informações necessárias:

### 1. 📺 Ver os Logs do Terminal do Servidor

O terminal onde você rodou `npm run dev` deve mostrar os erros. Procure por:

```
❌ Erro crítico em inviteMember: { ... }
```

Ou mensagens de erro como:
- `Erro ao verificar permissões`
- `Erro ao buscar dados do workspace`
- `Erro ao criar convite`
- `Erro ao adicionar membro existente`

### 2. 🌐 Ver o Console do Navegador

1. Abra o DevTools (pressione `F12` ou `Ctrl+Shift+I`)
2. Vá na aba **Console**
3. Procure por mensagens de erro em vermelho
4. Copie a mensagem completa

### 3. 🔍 Ver a Aba Network (Rede)

1. No DevTools, vá na aba **Network** (Rede)
2. Tente enviar o convite novamente
3. Procure pela requisição que falhou (geralmente será vermelha com status 500)
4. Clique nela e veja:
   - **Headers**: Informações da requisição
   - **Response**: Mensagem de erro retornada pelo servidor
   - **Preview**: Visualização da resposta

### 4. 📝 Informações para Coletar

Quando o erro ocorrer, copie e me envie:

1. **Logs completos do terminal** - Tudo que apareceu após você clicar em "Enviar Convite"
2. **Mensagem de erro do console do navegador**
3. **Response da aba Network** - O que o servidor retornou
4. **Email que você está tentando convidar**
5. **Se o usuário já existe ou não**

### 5. 🚀 Teste Novamente

1. Limpe o console do navegador (clique no ícone de limpar)
2. Tente enviar o convite novamente
3. Imediatamente após o erro, copie:
   - Todos os logs do terminal
   - Todas as mensagens do console
   - O Response da requisição falha na aba Network

## 💡 Dica

Se o erro não aparecer no terminal, pode ser que o servidor esteja rodando em outro terminal ou em background. Verifique todas as janelas de terminal abertas.

## 📸 Exemplo

Se você vir algo assim no terminal:

```
❌ Erro crítico em inviteMember: {
  message: "Erro ao criar convite",
  code: "23505",
  ...
}
```

Copie **tudo** dessa mensagem e me envie. Isso me ajudará a identificar exatamente qual é o problema.


