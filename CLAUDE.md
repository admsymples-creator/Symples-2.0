# 🧠 SG Brand — Project Rules & Context

> Leia este arquivo antes de qualquer implementação.
> Para padrões detalhados, consulte os arquivos em `.cursor/rules/`.

---

## 🏢 Contexto

**Empresa:** SG Brand | Infoproducts & Aplicações customizadas  
**Abordagem:** AI-first development — entrega rápida com qualidade de produção

---

## ⚙️ Stack

| Camada | Tecnologia |
|---|---|
| Framework | Next.js (App Router) |
| Linguagem | TypeScript (strict mode) |
| Estilo | Tailwind CSS |
| Banco | Supabase (PostgreSQL + Auth) |
| Deploy | Vercel |
| Package manager | pnpm |

---

## 🖥️ Comandos Essenciais

```bash
pnpm dev          # servidor local
pnpm build        # build de produção
pnpm lint         # checar erros de lint
pnpm type-check   # checar tipos TypeScript
pnpm db:types     # gerar tipos do Supabase
                  # (supabase gen types typescript --local > types/supabase.ts)
```

> Sempre rode `pnpm type-check` e `pnpm lint` antes de considerar uma task concluída.

---

## 📁 Estrutura de Pastas

```
/
├── app/                  # App Router
│   ├── (auth)/           # Rotas autenticadas
│   ├── (public)/         # Rotas públicas
│   ├── api/              # Route handlers
│   └── layout.tsx
├── components/
│   ├── ui/               # Componentes base reutilizáveis
│   └── [feature]/        # Componentes por feature
├── lib/
│   ├── supabase/         # Clients e helpers
│   ├── utils/            # Funções utilitárias
│   └── validations/      # Schemas Zod
├── hooks/                # Custom hooks
├── types/                # Tipos globais (inclui supabase.ts gerado)
└── constants/
```

---

## 📐 Convenções Rápidas

- **Componentes:** PascalCase → `UserCard.tsx`
- **Utilitários:** kebab-case → `format-date.ts`
- **Hooks:** prefixo `use` → `useAuthUser.ts`
- **Constantes:** UPPER_SNAKE_CASE
- **Tabelas Supabase:** snake_case plural → `user_profiles`
- **Commits:** `feat:` `fix:` `refactor:` `docs:` (em português)

---

## 🗄️ Supabase — Regras Críticas

- **Server components/actions:** `createServerClient`
- **Client components:** `createBrowserClient`
- **Nunca** expor `service_role` no client-side
- **Sempre** usar RLS em todas as tabelas
- **Sempre** tratar o erro retornado: `if (error) throw new Error(error.message)`

---

## 🚫 Proibições

- Não implementar além do escopo solicitado
- Não instalar libs sem confirmar com o dev
- Não refatorar código fora da task atual
- Não usar `var`, `any`, CSS separado, `console.log` em produção
- Não usar `default export` em componentes (exceto pages/layouts)
- Não commitar `.env`

---

## 📋 Fluxo por Sessão

1. Ler este arquivo
2. Ler o PRD Global do projeto
3. Verificar ROADMAP (fase atual)
4. Executar tasks da sessão
5. Rodar `lint` + `type-check`
6. Atualizar CHANGELOG

---

## 📦 Libs Aprovadas

`shadcn/ui` · `zod` · `react-hook-form` · `clsx` · `tailwind-merge` · `lucide-react` · `date-fns` · `sonner`

> **Componentes UI:** sempre usar shadcn/ui como base. Nunca criar componentes base do zero se o shadcn já oferece equivalente.  
> Qualquer lib fora desta lista → confirmar com o dev antes.

---

*SG Brand — Fevereiro 2026*
