#!/usr/bin/env python3
"""
VERSÃO ALTERNATIVA usando browser-use (requer API key)
Este é um exemplo de como usar browser-use para testes automatizados.
Para a versão principal sem API key, use test_finance_page.py
"""

import asyncio
import os
from dotenv import load_dotenv
from browser_use import Browser, Agent
from browser_use.llm import ChatBrowserUse

# Carregar variáveis de ambiente
load_dotenv()

async def main():
    """Versão usando browser-use com LLM"""
    
    # Verificar se API key está configurada
    api_key = os.getenv("BROWSER_USE_API_KEY")
    if not api_key:
        print("❌ Erro: BROWSER_USE_API_KEY não encontrada no .env")
        print("   Configure sua API key do Browser Use Cloud")
        return
    
    # Solicitar credenciais
    email = input("\n📧 Email para login: ").strip()
    password = input("🔑 Senha (opcional - sistema usa Magic Link): ").strip()
    
    # Configurar LLM
    llm = ChatBrowserUse(api_key=api_key)
    
    # Inicializar browser
    browser = Browser(headless=False)
    
    localhost_url = os.getenv('LOCALHOST_URL', 'http://localhost:3000')
    
    # Criar tarefa para o agente
    task = f"""
    Acesse {localhost_url}/login
    Faça login com email: {email}
    Depois, navegue para {localhost_url}/finance
    Teste a página Financeiro procurando por:
    - Elementos quebrados ou ausentes
    - Erros JavaScript no console
    - Problemas de layout
    - Botões que não funcionam
    - Abas que não carregam conteúdo
    - Métricas financeiras não exibidas
    Documente todos os problemas encontrados.
    """
    
    # Criar agente
    agent = Agent(task=task, llm=llm, browser=browser)
    
    try:
        # Executar tarefa
        print("\n🚀 Iniciando teste com browser-use...")
        history = await agent.run()
        
        # Exibir histórico
        print("\n📋 Histórico de ações:")
        for step in history:
            print(f"  - {step}")
            
    except Exception as e:
        print(f"\n❌ Erro durante execução: {str(e)}")
        import traceback
        traceback.print_exc()
    finally:
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())

