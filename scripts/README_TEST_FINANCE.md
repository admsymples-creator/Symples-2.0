# Script de Teste Automatizado - Página Financeiro

Este script usa a biblioteca **Playwright** para testar automaticamente a página Financeiro do sistema.

> **Nota**: O script foi criado usando Playwright diretamente, que é a biblioteca base do browser-use e mais adequada para testes automatizados sem necessidade de API keys.

## Pré-requisitos

1. Python 3.8 ou superior
2. Node.js e Next.js rodando localmente na porta 3000

## Instalação

```bash
# Instalar dependências Python
pip install -r requirements_test.txt

# Instalar browsers do Playwright (necessário)
playwright install
```

### Versão Alternativa com browser-use (opcional)

Se você preferir usar `browser-use` com LLM (requer API key):

```bash
# Instalar browser-use
pip install browser-use python-dotenv

# Configurar API key no arquivo .env
echo "BROWSER_USE_API_KEY=sua-api-key-aqui" >> .env

# Executar versão alternativa
python scripts/test_finance_page_browser_use.py
```

## Uso

```bash
# Executar o script
python scripts/test_finance_page.py
```

O script irá:
1. Solicitar email e senha (opcional - o sistema usa Magic Link)
2. Acessar `http://localhost:3000/login`
3. Tentar fazer login (se credenciais fornecidas)
4. Navegar para `/finance`
5. Testar vários aspectos da página:
   - Estrutura e elementos essenciais
   - Funcionamento das abas (Visão Geral, Recorrentes, Planejamento)
   - Cards e métricas financeiras
   - Interações (botões, formulários)
   - UI e responsividade
   - Acessibilidade básica

## Notas Importantes

- O sistema usa **Magic Link** para autenticação, então o login completo requer acesso ao email
- O script tenta fazer login, mas para testes completos você precisará estar autenticado
- O script gera um relatório JSON com todos os problemas encontrados
- Problemas são classificados por severidade: CRITICAL, HIGH, MEDIUM, LOW, INFO

## Relatório

Após a execução, um arquivo JSON será gerado com o relatório completo:
- `finance_test_report_YYYYMMDD_HHMMSS.json`

O relatório inclui:
- Lista de todos os problemas encontrados
- Severidade de cada problema
- Componente afetado
- Descrição e detalhes
- Resumo por severidade

