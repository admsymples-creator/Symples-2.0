# Configuração de Deploy - Branches e Ambientes

## Estrutura de Branches

- **`develop`**: Branch de desenvolvimento (dev)
  - Deploy automático para ambiente Preview na Vercel
  - Usado para testar features antes de ir para produção
  
- **`master`**: Branch de produção (prod)
  - Deploy automático para ambiente Production na Vercel
  - URL: https://app.symples.org

## Configuração na Vercel

### 1. Configurar Branch de Produção

1. Acesse: https://vercel.com/symples-s-projects/symples-2-0/settings/git
2. Em **Production Branch**, selecione: `master`
3. Salve as alterações

### 2. Configurar Preview Branches

1. Na mesma página de configurações Git
2. Em **Preview Branches**, certifique-se de que `develop` está incluído
3. Todas as outras branches também gerarão previews automaticamente

### 3. Variáveis de Ambiente

As variáveis de ambiente já estão configuradas para ambos os ambientes:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SITE_URL`

## Fluxo de Trabalho

1. **Desenvolvimento**: Trabalhe na branch `develop`
   ```bash
   git checkout develop
   git pull origin develop
   # Faça suas alterações
   git add .
   git commit -m "feat: nova feature"
   git push origin develop
   ```
   - Isso gerará um deploy Preview automaticamente

2. **Produção**: Quando estiver pronto, faça merge para `master`
   ```bash
   git checkout master
   git pull origin master
   git merge develop
   git push origin master
   ```
   - Isso gerará um deploy Production automaticamente

## URLs

- **Produção**: https://app.symples.org (branch `master`)
- **Preview**: URLs geradas automaticamente para cada commit em `develop` ou PRs


