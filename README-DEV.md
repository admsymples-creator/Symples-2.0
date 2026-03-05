# Guia de Desenvolvimento Local

## 🚀 Iniciar o Servidor

### Opção 1: Usando o script helper (Recomendado)
```bash
./dev.sh
```

### Opção 2: Manualmente
```bash
# Carregar nvm e usar Node.js 20
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm use default

# Iniciar servidor
npm run dev
```

### Opção 3: Em novos terminais
Se você abrir um novo terminal, o nvm já deve estar configurado automaticamente no `.bashrc`. Basta executar:
```bash
npm run dev
```

## 📋 Requisitos

- **Node.js**: >= 20.9.0 (atualmente usando v20.19.6 via nvm)
- **npm**: >= 10.8.2
- **Arquivo .env.local**: Configurado com as variáveis necessárias

## 🔧 Comandos Úteis

```bash
# Verificar versão do Node.js
node --version

# Verificar versão do npm
npm --version

# Carregar nvm manualmente (se necessário)
source ~/.bashrc

# Atualizar dependências
npm install

# Build de produção
npm run build
```

## 🌐 Acesso

O servidor de desenvolvimento estará disponível em:
- **URL**: http://localhost:3000
