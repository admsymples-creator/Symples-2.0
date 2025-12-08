#!/bin/bash
# Script helper para iniciar o servidor de desenvolvimento com Node.js correto

# Carregar nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Usar Node.js 20
nvm use default

# Verificar versão
echo "Usando Node.js $(node --version)"
echo "Iniciando servidor de desenvolvimento..."
echo ""

# Iniciar Next.js
npm run dev
