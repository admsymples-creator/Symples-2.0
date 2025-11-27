# Symples v2

**O Hub de Soluções do Empreendedor Digital**

> "Gerir uma empresa tem que ser Symples."

Symples é o sistema operacional de pequenas empresas. Centralizamos **Tarefas** e **Financeiro** em uma interface web robusta, alimentada pela simplicidade de input do WhatsApp.

## 🚀 Stack Tecnológica

- **Next.js 15** - Framework React com App Router
- **TypeScript** - Tipagem estática
- **Supabase** - Backend como serviço (autenticação, banco de dados)
- **Tailwind CSS** - Estilização
- **shadcn/ui** - Componentes UI
- **n8n** - Automação e integração com WhatsApp
- **OpenAI** - Processamento de linguagem natural

## 📋 Pré-requisitos

- Node.js 18+ 
- npm, yarn, pnpm ou bun
- Conta no Supabase
- Conta no n8n (para integração WhatsApp)

## 🛠️ Instalação

1. Clone o repositório:
```bash
git clone https://github.com/seu-usuario/symples-v2.git
cd symples-v2
```

2. Instale as dependências:
```bash
npm install
# ou
yarn install
# ou
pnpm install
```

3. Configure as variáveis de ambiente:
```bash
cp .env.example .env.local
```

Edite `.env.local` com suas credenciais do Supabase:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Execute as migrações do banco de dados:
```bash
# Execute o schema.sql no Supabase SQL Editor
```

5. Inicie o servidor de desenvolvimento:
```bash
npm run dev
# ou
yarn dev
# ou
pnpm dev
```

Abra [http://localhost:3000](http://localhost:3000) no navegador.

## 📁 Estrutura do Projeto

```
symples-v2/
├── app/                    # App Router do Next.js
│   ├── (auth)/            # Rotas de autenticação
│   ├── (main)/            # Rotas principais (autenticadas)
│   ├── api/               # API Routes
│   └── design-lab/        # Páginas de design/experimentação
├── components/            # Componentes React
│   ├── home/              # Componentes da home
│   ├── tasks/             # Componentes de tarefas
│   ├── layout/            # Header, Sidebar
│   └── ui/                # Componentes shadcn/ui
├── lib/                   # Utilitários e configurações
├── supabase/             # Migrações e schema SQL
└── types/                # Tipos TypeScript
```

## 🎯 Funcionalidades

- ✅ Autenticação com Supabase
- ✅ Gestão de Tarefas e Projetos
- ✅ Dashboard Financeiro
- ✅ Integração WhatsApp (via n8n)
- ✅ Gestão de Time
- ✅ Onboarding inicial

## 📚 Documentação

Consulte os arquivos em `.context/` para mais detalhes:
- `prd.md` - Product Requirements Document
- `design_system.md` - Design System e padrões de UI

## 🚢 Deploy

O projeto pode ser deployado na [Vercel](https://vercel.com) facilmente:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/seu-usuario/symples-v2)

## 📝 Licença

Este projeto é privado e proprietário.
