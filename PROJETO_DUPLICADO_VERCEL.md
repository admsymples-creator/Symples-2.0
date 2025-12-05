# ⚠️ Projeto Duplicado na Vercel

## Situação

Existem **2 projetos** na Vercel conectados ao mesmo repositório:

1. **`symples-2-0`** ✅ (PROJETO PRINCIPAL - PRODUÇÃO)
   - ID: `prj_hp1NVMzrYWIQjtarpQ9dXeF9JFDu`
   - URL: https://app.symples.org
   - Criado: 28 Nov 2025
   - **Este é o projeto correto e está em uso**

2. **`symples-v2`** ⚠️ (PROJETO DUPLICADO)
   - ID: `prj_R4RvUBc934J5MEzjo7ApoG0el8yP`
   - URL: https://symples-v2-symples-s-projects.vercel.app
   - Criado: 29 Nov 2025
   - **Este projeto foi criado acidentalmente e pode ser removido**

## Problemas Potenciais

O projeto duplicado `symples-v2` pode causar:

1. **Confusão ao fazer deploy**: Se o `.vercel/project.json` estiver linkado ao projeto errado, o deploy vai para o lugar errado
2. **Consumo desnecessário de recursos**: Deploys automáticos podem estar rodando em ambos os projetos
3. **Variáveis de ambiente duplicadas**: Pode haver configurações conflitantes
4. **Custos**: Se estiver em um plano pago, pode estar consumindo recursos desnecessariamente

## Solução Recomendada

### Opção 1: Remover o Projeto Duplicado (Recomendado)

1. Acesse: https://vercel.com/symples-s-projects/symples-v2/settings
2. Role até o final da página
3. Clique em **"Delete Project"**
4. Confirme a exclusão

### Opção 2: Desativar Deploys Automáticos

Se preferir manter o projeto mas desativar deploys:

1. Acesse: https://vercel.com/symples-s-projects/symples-v2/settings/git
2. Desconecte o repositório GitHub
3. Isso impedirá deploys automáticos

## Configuração Atual

O arquivo `.vercel/project.json` está configurado para o projeto **`symples-2-0`** (correto).

**⚠️ IMPORTANTE**: Sempre verifique que o `.vercel/project.json` aponta para `symples-2-0` antes de fazer deploy:

```json
{
  "projectId": "prj_hp1NVMzrYWIQjtarpQ9dXeF9JFDu",
  "orgId": "team_6mrIlrdN2DkwSuDAz9X52Zk9",
  "projectName": "symples-2-0"
}
```

## Verificação

Para verificar qual projeto está linkado localmente:

```bash
cat .vercel/project.json
```

Para linkar ao projeto correto:

```bash
vercel link --project symples-2-0 --yes
```





