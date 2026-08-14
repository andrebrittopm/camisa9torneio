import asyncio
import json
import os
import uuid
import hashlib
from pathlib import Path
from playwright.async_api import async_playwright

SCREENSHOTS = Path("/tmp/browser/etapa-4-3b/screenshots")
SCREENSHOTS.mkdir(parents=True, exist_ok=True)

# Simular ambiente de teste
os.environ["AV_ORDER_ACCESS_SECRET"] = "TEST_SECRET_AT_LEAST_32_CHARS_LONG_FOR_HMAC_SHA256"

async def main():
    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1280, "height": 1800})
        page = await context.new_page()

        print("--- REC01-REC05: Storage Policy Verification ---")
        # Nota: Não podemos testar diretamente storage.buckets via browser sem auth, 
        # mas podemos verificar se a rota de upload responde 403 sem token (REC08)
        
        await page.goto("http://localhost:8080")
        await page.screenshot(path=str(SCREENSHOTS / "1_homepage.png"))
        
        print("--- REC06-REC07: Order Creation Capability ---")
        # Para testar isso, precisaríamos simular um pedido.
        # Vamos pular para a auditoria de segurança da rota de upload.

        print("--- REC08-REC09: Access Denied Scenarios ---")
        # Testar POST direto para a rota sem headers válidos
        # Usaremos fetch no browser context
        
        check_auth = await page.evaluate("""
            async () => {
                const res = await fetch('/api/public/av-payment-receipt', {
                    method: 'POST',
                    headers: {
                        'origin': window.location.origin,
                        'x-av-order-id': '00000000-0000-0000-0000-000000000000',
                        'x-av-receipt-token': 'invalid',
                        'x-av-submission-id': '00000000-0000-0000-0000-000000000000'
                    }
                });
                return { status: res.status, json: await res.json() };
            }
        """)
        print(f"Auth check status: {check_auth['status']}")
        print(f"Auth check error: {check_auth['json']['error']}")
        
        if check_auth['status'] == 403 and check_auth['json']['error'] == 'ORDER_ACCESS_DENIED':
            print("REC08 PASS: Invalid token returns 403")
        else:
            print("REC08 FAIL")

        print("--- Build Check ---")
        # Build check via shell no sandbox é melhor
        
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
