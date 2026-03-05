#!/usr/bin/env python3
"""
Script de teste automatizado para a página Financeiro usando Playwright.
Este script acessa o localhost, faz login e testa a página Financeiro para encontrar falhas.

Melhorias:
- Salva/carrega cookies para não precisar logar toda vez
- Testes mais robustos com timeouts adequados
- Testa criação de transação completa
- Melhor tratamento de navegação durante OAuth
"""

import asyncio
import sys
from pathlib import Path
from playwright.async_api import async_playwright, Page, Browser, BrowserContext
import json
from datetime import datetime
from typing import List, Dict, Optional

# Configurações
LOCALHOST_URL = "http://localhost:3000"
LOGIN_URL = f"{LOCALHOST_URL}/login"
FINANCE_URL = f"{LOCALHOST_URL}/finance"
STORAGE_STATE_PATH = Path("playwright_session.json")

# Lista de problemas encontrados
issues_found: List[Dict] = []


def log_issue(severity: str, component: str, description: str, details: str = ""):
    """Registra um problema encontrado"""
    issue = {
        "severity": severity,
        "component": component,
        "description": description,
        "details": details,
        "timestamp": datetime.now().isoformat()
    }
    issues_found.append(issue)
    print(f"\n❌ [{severity.upper()}] {component}: {description}")
    if details:
        print(f"   Detalhes: {details}")


async def save_session(context: BrowserContext):
    """Salva o estado da sessão (cookies)"""
    try:
        storage_state = await context.storage_state()
        with open(STORAGE_STATE_PATH, 'w') as f:
            json.dump(storage_state, f, indent=2)
        print(f"✅ Sessão salva em {STORAGE_STATE_PATH}")
    except Exception as e:
        print(f"⚠️  Erro ao salvar sessão: {str(e)}")


async def load_session(context: BrowserContext) -> bool:
    """Carrega sessão salva (se existir)"""
    if STORAGE_STATE_PATH.exists():
        try:
            with open(STORAGE_STATE_PATH, 'r') as f:
                storage_state = json.load(f)
                await context.add_cookies(storage_state.get('cookies', []))
            print(f"✅ Sessão carregada de {STORAGE_STATE_PATH}")
            return True
        except Exception as e:
            print(f"⚠️  Erro ao carregar sessão: {str(e)}")
            return False
    return False


async def check_if_authenticated(page: Page) -> bool:
    """Verifica se está autenticado sem tentar navegar"""
    try:
        # Tentar ler cookies diretamente
        cookies = await page.context.cookies()
        # Verificar se há cookies de sessão do Supabase
        has_session = any('sb-' in cookie.get('name', '') for cookie in cookies)
        return has_session
    except:
        return False


async def wait_for_login_complete(page: Page, timeout: int = 120) -> bool:
    """Aguarda o login completar verificando a URL atual"""
    print("   ⏳ Aguardando login completar...")
    
    start_time = asyncio.get_event_loop().time()
    last_url = ""
    
    while (asyncio.get_event_loop().time() - start_time) < timeout:
        try:
            current_url = page.url
            
            # Se a URL mudou, printar
            if current_url != last_url:
                if "accounts.google.com" in current_url:
                    print("   🔐 Processando autenticação Google...")
                elif "/auth/callback" in current_url:
                    print("   ⏳ Redirecionando após autenticação...")
                elif "/home" in current_url or "/finance" in current_url:
                    print("   ✅ Login completo! Redirecionado para aplicação.")
                    await asyncio.sleep(2)  # Aguardar página carregar
                    return True
                elif "/login" in current_url:
                    # Ainda na página de login
                    pass
                
                last_url = current_url
            
            await asyncio.sleep(1)
            
        except Exception as e:
            # Ignorar erros durante navegação
            await asyncio.sleep(1)
            continue
    
    # Timeout - verificar se conseguiu autenticar de outra forma
    return await check_if_authenticated(page)


async def test_login(page: Page, email: str, password: str) -> bool:
    """Tenta fazer login no sistema"""
    print("\n🔐 Tentando fazer login...")
    
    try:
        await page.goto(LOGIN_URL, wait_until="domcontentloaded", timeout=15000)
        await asyncio.sleep(2)
        
        # Verificar se a página de login carregou
        page_content = await page.content()
        if "email" not in page_content.lower() and "e-mail" not in page_content.lower():
            log_issue("MEDIUM", "Login", "Página de login pode não ter carregado corretamente")
        
        # Como o sistema usa Magic Link, vamos tentar encontrar o campo de email
        try:
            email_input = await page.query_selector('input[type="email"]')
            if email_input:
                await email_input.fill(email)
                await asyncio.sleep(1)
                
                submit_button = await page.query_selector('button[type="submit"]')
                if submit_button:
                    await submit_button.click()
                    await asyncio.sleep(2)
                    
                    page_content = await page.content()
                    if "enviado" in page_content.lower() or "check your email" in page_content.lower():
                        print("✅ Magic Link solicitado com sucesso")
                        log_issue("INFO", "Login", 
                                "Sistema usa Magic Link - login completo requer acesso ao email",
                                "Este é o comportamento esperado do sistema")
                        return True
                    
        except Exception as e:
            log_issue("HIGH", "Login", f"Erro ao tentar fazer login: {str(e)}")
            return False
            
    except Exception as e:
        log_issue("CRITICAL", "Login", f"Erro ao acessar página de login: {str(e)}")
        return False
    
    return False


async def test_finance_page_structure(page: Page):
    """Testa a estrutura básica da página Financeiro"""
    print("\n📊 Testando estrutura da página Financeiro...")
    
    try:
        # Tentar navegar para finance, permitindo redirecionamentos
        try:
            await page.goto(FINANCE_URL, wait_until="domcontentloaded", timeout=20000)
            await asyncio.sleep(3)  # Aguardar carregamento completo
        except Exception as nav_error:
            await asyncio.sleep(2)
        
        page_content = await page.content()
        page_url = page.url
        
        # Verificar se há redirecionamento para login (não autenticado)
        if "login" in page_url.lower():
            log_issue("HIGH", "Autenticação", 
                     "Redirecionado para login - necessário autenticação prévia")
            return False
        
        # Verificar se está na página correta
        if "finance" not in page_url.lower():
            if "home" in page_url.lower():
                log_issue("MEDIUM", "Navegação", 
                         f"Redirecionado para /home ao tentar acessar /finance. URL atual: {page_url}")
                print("   ⚠️  Tentando acessar /finance novamente...")
                try:
                    await page.goto(FINANCE_URL, wait_until="domcontentloaded", timeout=15000)
                    await asyncio.sleep(3)
                    page_url = page.url
                    page_content = await page.content()
                    
                    if "finance" not in page_url.lower():
                        log_issue("HIGH", "Navegação", 
                                 f"Não foi possível acessar /finance. URL atual: {page_url}")
                        return False
                except Exception as e:
                    log_issue("HIGH", "Navegação", 
                             f"Erro ao tentar acessar /finance novamente: {str(e)}")
                    return False
            else:
                log_issue("HIGH", "Navegação", 
                         f"Página não está na rota esperada. URL atual: {page_url}")
                return False
        
        # Verificar elementos essenciais
        essential_elements = [
            ("Financeiro", "Título da página"),
            ("Visão Geral", "Aba Visão Geral"),
            ("Recorrentes", "Aba Recorrentes"),
            ("Planejamento", "Aba Planejamento"),
        ]
        
        for element, description in essential_elements:
            if element.lower() not in page_content.lower():
                log_issue("HIGH", "Estrutura", 
                         f"Elemento '{description}' não encontrado na página")
        
        return True
        
    except Exception as e:
        log_issue("CRITICAL", "Estrutura", 
                 f"Erro ao testar estrutura da página: {str(e)}")
        return False


async def test_finance_tabs(page: Page):
    """Testa as abas da página Financeiro"""
    print("\n📑 Testando abas da página...")
    
    try:
        tabs = [
            ("overview", "Visão Geral"),
            ("recurring", "Recorrentes"),
            ("planning", "Planejamento")
        ]
        
        for tab_value, tab_name in tabs:
            try:
                # Tentar encontrar e clicar na aba
                tab_selector = f'button[role="tab"][value="{tab_value}"], [data-value="{tab_value}"]'
                tab_element = await page.query_selector(tab_selector)
                
                if tab_element:
                    await tab_element.click()
                    await asyncio.sleep(3)  # Aguardar carregamento do conteúdo
                    
                    new_content = await page.content()
                    if tab_name.lower() not in new_content.lower():
                        log_issue("MEDIUM", f"Aba {tab_name}", 
                                 f"Conteúdo da aba '{tab_name}' pode não ter carregado")
                else:
                    # Tentar método alternativo - procurar por texto
                    all_buttons = await page.query_selector_all('button')
                    found = False
                    for button in all_buttons:
                        text = await button.inner_text()
                        if tab_name.lower() in text.lower():
                            await button.click()
                            await asyncio.sleep(3)
                            found = True
                            break
                    
                    if not found:
                        log_issue("HIGH", f"Aba {tab_name}", 
                                 f"Aba '{tab_name}' não encontrada")
                        
            except Exception as e:
                log_issue("MEDIUM", f"Aba {tab_name}", 
                         f"Erro ao testar aba '{tab_name}': {str(e)}")
        
    except Exception as e:
        log_issue("HIGH", "Abas", f"Erro ao testar abas: {str(e)}")


async def test_finance_cards_and_metrics(page: Page):
    """Testa os cards e métricas da página"""
    print("\n📈 Testando cards e métricas...")
    
    try:
        page_content = await page.content()
        
        # Verificar métricas esperadas
        expected_metrics = [
            "saldo",
            "receita",
            "despesa",
            "saúde financeira"
        ]
        
        for metric in expected_metrics:
            if metric.lower() not in page_content.lower():
                log_issue("MEDIUM", "Métricas", 
                         f"Métrica '{metric}' não encontrada na página")
        
        # Verificar cards principais
        card_indicators = [
            ("Entradas", "Card de Entradas"),
            ("Saídas", "Card de Saídas"),
            ("Categoria", "Card de Categorias"),
        ]
        
        for indicator, description in card_indicators:
            if indicator.lower() not in page_content.lower():
                log_issue("MEDIUM", "Cards", 
                         f"Card '{description}' pode não estar visível")
        
    except Exception as e:
        log_issue("MEDIUM", "Cards/Métricas", 
                 f"Erro ao testar cards e métricas: {str(e)}")


async def test_create_transaction(page: Page):
    """Testa criação de transação de forma completa"""
    print("\n💰 Testando criação de transação...")
    
    try:
        # Voltar para aba Visão Geral se necessário
        await page.goto(FINANCE_URL, wait_until="domcontentloaded", timeout=15000)
        await asyncio.sleep(2)
        
        # Encontrar botão de nova transação
        new_transaction_buttons = await page.query_selector_all('button')
        found_button = None
        
        for button in new_transaction_buttons:
            try:
                text = await button.inner_text()
                # Procurar por botão que tenha texto relacionado a nova transação
                if any(keyword in text.lower() for keyword in ["nova", "transação", "adicionar", "+"]):
                    # Verificar se é visível
                    is_visible = await button.is_visible()
                    if is_visible:
                        found_button = button
                        print(f"   📍 Botão encontrado: '{text.strip()}'")
                        break
            except:
                continue
        
        if not found_button:
            log_issue("HIGH", "Transação", "Botão de nova transação não encontrado")
            return False
        
        # Clicar no botão
        try:
            await found_button.click()
            await asyncio.sleep(2)  # Aguardar modal abrir
        except Exception as e:
            log_issue("HIGH", "Transação", f"Erro ao clicar no botão: {str(e)}")
            return False
        
        # Verificar se modal abriu
        modal = await page.query_selector('[role="dialog"]')
        if not modal:
            # Tentar outros seletores
            modal = await page.query_selector('[data-state="open"]')
            if not modal:
                modal = await page.query_selector('.modal, [class*="Dialog"]')
        
        if not modal:
            log_issue("HIGH", "Transação", "Modal de nova transação não abriu após clicar no botão")
            return False
        
        print("   ✅ Modal aberto")
        
        # Aguardar modal carregar completamente
        await asyncio.sleep(2)
        
        # Preencher campos do formulário
        try:
            # 1. Tipo (Receita/Despesa) - pode ser tabs ou select
            type_tabs = await page.query_selector_all('button[role="tab"]')
            if type_tabs and len(type_tabs) >= 2:
                # Clicar em "Receita" (income)
                for tab in type_tabs:
                    text = await tab.inner_text()
                    if "receita" in text.lower() or "income" in text.lower():
                        await tab.click()
                        await asyncio.sleep(0.5)
                        break
            
            # 2. Descrição
            description_inputs = await page.query_selector_all('input[type="text"], input:not([type])')
            for inp in description_inputs:
                placeholder = await inp.get_attribute('placeholder') or ""
                label = await inp.get_attribute('aria-label') or ""
                if any(keyword in (placeholder + label).lower() for keyword in ["descrição", "description", "nome"]):
                    await inp.fill("Teste Automatizado - Receita")
                    print("   ✅ Descrição preenchida")
                    await asyncio.sleep(0.5)
                    break
            
            # 3. Valor (amount)
            amount_inputs = await page.query_selector_all('input[type="text"], input:not([type])')
            for inp in amount_inputs:
                placeholder = await inp.get_attribute('placeholder') or ""
                # Valores monetários geralmente têm placeholder com R$ ou currency
                if "r$" in placeholder.lower() or "valor" in placeholder.lower():
                    await inp.click()
                    await inp.fill("100,00")
                    print("   ✅ Valor preenchido")
                    await asyncio.sleep(0.5)
                    break
            
            # 4. Categoria (pode ser select ou input)
            category_selects = await page.query_selector_all('select, [role="combobox"]')
            if category_selects:
                try:
                    await category_selects[0].click()
                    await asyncio.sleep(0.5)
                    # Tentar selecionar primeira opção
                    options = await page.query_selector_all('[role="option"]')
                    if options:
                        await options[0].click()
                        await asyncio.sleep(0.5)
                        print("   ✅ Categoria selecionada")
                except:
                    pass
            
            # 5. Status (pode ser checkbox ou select)
            status_selects = await page.query_selector_all('select, [role="combobox"]')
            if len(status_selects) > 1:
                try:
                    await status_selects[1].click()
                    await asyncio.sleep(0.5)
                    options = await page.query_selector_all('[role="option"]')
                    if options:
                        await options[0].click()
                        await asyncio.sleep(0.5)
                except:
                    pass
            
            # 6. Procurar botão de submit
            await asyncio.sleep(1)
            submit_buttons = await page.query_selector_all('button[type="submit"], button')
            for btn in submit_buttons:
                text = await btn.inner_text()
                if any(keyword in text.lower() for keyword in ["criar", "adicionar", "salvar", "confirmar", "create", "save"]):
                    is_disabled = await btn.get_attribute('disabled')
                    if not is_disabled:
                        print(f"   💾 Tentando submeter formulário (botão: '{text.strip()}')...")
                        await btn.click()
                        await asyncio.sleep(3)  # Aguardar processamento
                        
                        # Verificar se modal fechou (indicando sucesso)
                        modal_after = await page.query_selector('[role="dialog"]')
                        if not modal_after:
                            print("   ✅ Transação criada com sucesso (modal fechou)")
                            return True
                        else:
                            # Verificar se há mensagem de erro
                            page_content = await page.content()
                            if "erro" in page_content.lower() or "error" in page_content.lower():
                                log_issue("HIGH", "Transação", "Erro ao criar transação (verificar mensagem no modal)")
                            else:
                                print("   ⚠️  Modal não fechou, mas pode estar processando...")
                                await asyncio.sleep(2)
                        break
            
            # Se chegou aqui e não submeteu, fechar modal
            close_buttons = await page.query_selector_all('button[aria-label*="close"], button[aria-label*="fechar"], button[aria-label*="Close"]')
            if close_buttons:
                await close_buttons[0].click()
                await asyncio.sleep(1)
            
            log_issue("MEDIUM", "Transação", "Formulário preenchido mas não foi possível submeter")
            return False
            
        except Exception as e:
            log_issue("HIGH", "Transação", f"Erro ao preencher formulário: {str(e)}")
            # Fechar modal em caso de erro
            try:
                close_buttons = await page.query_selector_all('button[aria-label*="close"], button[aria-label*="fechar"]')
                if close_buttons:
                    await close_buttons[0].click()
                    await asyncio.sleep(1)
            except:
                pass
            return False
        
    except Exception as e:
        log_issue("HIGH", "Transação", f"Erro geral ao testar criação de transação: {str(e)}")
        return False


async def test_finance_interactions(page: Page):
    """Testa interações na página (botões, formulários, etc)"""
    print("\n🖱️ Testando interações...")
    
    try:
        # Testar seletor de mês
        try:
            month_selectors = await page.query_selector_all('select, [role="combobox"]')
            if len(month_selectors) == 0:
                log_issue("LOW", "Interações", 
                         "Seletor de mês não encontrado")
        except Exception as e:
            log_issue("LOW", "Interações", 
                     f"Erro ao testar seletor de mês: {str(e)}")
        
        # Testar criação de transação (função separada e mais robusta)
        await test_create_transaction(page)
        
    except Exception as e:
        log_issue("MEDIUM", "Interações", 
                 f"Erro geral ao testar interações: {str(e)}")


async def test_responsive_and_ui(page: Page):
    """Testa aspectos de UI e responsividade"""
    print("\n📱 Testando UI e responsividade...")
    
    try:
        # Verificar console por erros JavaScript
        console_messages = []
        
        def handle_console(msg):
            console_messages.append({
                "type": msg.type,
                "text": msg.text
            })
        
        page.on("console", handle_console)
        
        # Recarregar página para capturar erros
        await page.reload(wait_until="networkidle", timeout=20000)
        await asyncio.sleep(3)
        
        # Verificar erros no console (apenas erros críticos)
        errors = [msg for msg in console_messages if msg["type"] == "error"]
        for error in errors:
            error_text = error['text'].lower()
            # Filtrar erros comuns que não são críticos
            if not any(skip in error_text for skip in ['favicon', 'sourcemap', 'extension']):
                if "failed" in error_text or "uncaught" in error_text:
                    log_issue("HIGH", "JavaScript", 
                             f"Erro JavaScript encontrado: {error['text'][:100]}")
        
        # Verificar se há elementos quebrados (imagens não carregadas, etc)
        images = await page.query_selector_all('img')
        broken_images = 0
        for img in images:
            try:
                natural_width = await img.evaluate('el => el.naturalWidth')
                if natural_width == 0:
                    broken_images += 1
            except:
                pass
        
        if broken_images > 0:
            log_issue("LOW", "UI", 
                     f"{broken_images} imagem(ns) possivelmente quebrada(s)")
        
    except Exception as e:
        log_issue("LOW", "UI/Responsividade", 
                 f"Erro ao testar UI: {str(e)}")


async def test_accessibility(page: Page):
    """Testa aspectos básicos de acessibilidade"""
    print("\n♿ Testando acessibilidade básica...")
    
    try:
        # Verificar se elementos interativos têm labels adequados
        buttons = await page.query_selector_all('button')
        buttons_without_text = 0
        button_details = []
        
        for button in buttons[:20]:  # Limitar para não ser muito lento
            try:
                text = await button.inner_text()
                aria_label = await button.get_attribute('aria-label')
                title = await button.get_attribute('title')
                
                if not text.strip() and not aria_label and not title:
                    buttons_without_text += 1
                    # Tentar identificar o botão
                    classes = await button.get_attribute('class') or ""
                    if buttons_without_text <= 3:  # Guardar apenas os 3 primeiros
                        button_details.append(classes[:50] if classes else "sem classe")
            except:
                pass
        
        if buttons_without_text > 0:
            log_issue("LOW", "Acessibilidade", 
                     f"{buttons_without_text} botão(ões) sem texto ou aria-label",
                     f"Primeiros: {', '.join(button_details)}")
        
        # Verificar se há headings apropriados
        headings = await page.query_selector_all('h1, h2, h3')
        if len(headings) == 0:
            log_issue("MEDIUM", "Acessibilidade", 
                     "Nenhum heading encontrado na página")
        
    except Exception as e:
        log_issue("LOW", "Acessibilidade", 
                 f"Erro ao testar acessibilidade: {str(e)}")


async def generate_report():
    """Gera relatório final dos problemas encontrados"""
    print("\n" + "="*60)
    print("📋 RELATÓRIO DE TESTES - PÁGINA FINANCEIRO")
    print("="*60)
    
    if not issues_found:
        print("\n✅ Nenhum problema crítico encontrado!")
        print("   A página parece estar funcionando corretamente.")
        return
    
    # Agrupar por severidade
    by_severity = {}
    for issue in issues_found:
        severity = issue["severity"]
        if severity not in by_severity:
            by_severity[severity] = []
        by_severity[severity].append(issue)
    
    # Imprimir por ordem de severidade
    severity_order = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"]
    
    for severity in severity_order:
        if severity in by_severity:
            print(f"\n{severity} ({len(by_severity[severity])} problema(s)):")
            print("-" * 60)
            for issue in by_severity[severity]:
                print(f"  • [{issue['component']}] {issue['description']}")
                if issue['details']:
                    print(f"    {issue['details']}")
    
    # Salvar relatório em JSON
    report_file = f"finance_test_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    with open(report_file, 'w', encoding='utf-8') as f:
        json.dump({
            "timestamp": datetime.now().isoformat(),
            "total_issues": len(issues_found),
            "issues": issues_found,
            "summary": {
                severity: len(by_severity.get(severity, [])) 
                for severity in severity_order
            }
        }, f, indent=2, ensure_ascii=False)
    
    print(f"\n💾 Relatório completo salvo em: {report_file}")
    
    # Resumo final
    critical_count = len(by_severity.get("CRITICAL", []))
    high_count = len(by_severity.get("HIGH", []))
    
    if critical_count > 0 or high_count > 0:
        print(f"\n⚠️  ATENÇÃO: {critical_count} problema(s) crítico(s) e {high_count} problema(s) de alta prioridade encontrado(s)!")
    else:
        print(f"\n✅ Nenhum problema crítico ou de alta prioridade encontrado.")


async def main():
    """Função principal"""
    print("🚀 Iniciando testes automatizados da página Financeiro")
    print("="*60)
    
    # Inicializar Playwright PRIMEIRO (antes de solicitar credenciais)
    async with async_playwright() as p:
        # Abrir browser ANTES de pedir credenciais
        print("\n🌐 Abrindo navegador...")
        
        # Tentar carregar sessão salva
        browser = await p.chromium.launch(headless=False)
        context = await browser.new_context()
        session_loaded = await load_session(context)
        
        page = await context.new_page()
        
        try:
            # Se não tem sessão salva, fazer login
            if not session_loaded:
                # Abrir página de login primeiro para permitir login manual
                print("\n🔐 Você pode fazer login manualmente no navegador que abriu...")
                await page.goto(LOGIN_URL, wait_until="domcontentloaded", timeout=15000)
                await asyncio.sleep(1)
                
                print("\n" + "="*60)
                print("OPÇÕES:")
                print("  1. Pressione Enter para aguardar login MANUAL (recomendado)")
                print("  2. Digite 'auto' para tentar login automático (requer email)")
                print("="*60)
                
                opcao = input("\n👉 Escolha uma opção (Enter para login manual, 'auto' para automático): ").strip().lower()
                
                if opcao == 'auto':
                    # Login automático
                    email = input("📧 Email para login: ").strip()
                    password = input("🔑 Senha (ou Enter - sistema usa Magic Link): ").strip() or ""
                    
                    if email:
                        await test_login(page, email, password)
                        await asyncio.sleep(2)
                    else:
                        print("\n⏭️  Email não fornecido, aguardando login manual...")
                        input("\n✅ Após fazer login no navegador, pressione Enter para continuar...")
                else:
                    # Login manual - aguardar usuário fazer login
                    print("\n📝 Por favor, faça login no navegador que está aberto...")
                    print("   Após fazer login, pressione Enter aqui para continuar os testes.")
                    input("\n✅ Após fazer login, pressione Enter para continuar...")
                
                # Aguardar login completar (verificando URL)
                await wait_for_login_complete(page, timeout=120)
                
                # Salvar sessão após login
                await save_session(context)
            else:
                print("✅ Usando sessão salva - pulando login")
                # Verificar se sessão ainda é válida
                try:
                    await page.goto(FINANCE_URL, wait_until="domcontentloaded", timeout=15000)
                    await asyncio.sleep(2)
                    current_url = page.url
                    if "login" in current_url.lower():
                        print("⚠️  Sessão expirada, será necessário fazer login novamente")
                        session_loaded = False
                except:
                    pass
            
            # Teste 2: Estrutura da página
            page_loaded = await test_finance_page_structure(page)
            
            if page_loaded:
                # Teste 3: Abas
                await test_finance_tabs(page)
                
                # Teste 4: Cards e métricas
                await test_finance_cards_and_metrics(page)
                
                # Teste 5: Interações (inclui criação de transação)
                await test_finance_interactions(page)
                
                # Teste 6: UI e responsividade
                await test_responsive_and_ui(page)
                
                # Teste 7: Acessibilidade básica
                await test_accessibility(page)
                
                # Salvar sessão novamente (atualizada)
                await save_session(context)
            else:
                print("\n⚠️  Página não carregou completamente. Alguns testes foram pulados.")
                log_issue("HIGH", "Geral", 
                         "Página Financeiro não acessível - pode requerer autenticação")
            
        except KeyboardInterrupt:
            print("\n\n⚠️  Teste interrompido pelo usuário")
            # Salvar sessão antes de sair
            try:
                await save_session(context)
            except:
                pass
        except Exception as e:
            log_issue("CRITICAL", "Sistema", 
                     f"Erro crítico durante os testes: {str(e)}")
            import traceback
            traceback.print_exc()
        finally:
            # Gerar relatório
            await generate_report()
            
            # Fechar browser
            try:
                await browser.close()
            except:
                pass
            
            print("\n✅ Testes concluídos!")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n\n👋 Teste cancelado pelo usuário")
        sys.exit(0)
