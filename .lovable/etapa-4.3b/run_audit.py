import asyncio
import json
import os
import hashlib
from pathlib import Path
from playwright.async_api import async_playwright

# Configuração de teste (Não deve ser exposta no log final)
os.environ["AV_ORDER_ACCESS_SECRET"] = "TEST_SECRET_AT_LEAST_32_CHARS_LONG_FOR_HMAC_SHA256"

async def run_test_scenario(page, name, order_id, token, submission_id, file_content=None, file_name="test.jpg", file_type="image/jpeg"):
    print(f"--- {name} ---")
    
    # Injetar script de fetch no contexto da página
    result = await page.evaluate(f"""
        async () => {{
            const formData = new FormData();
            if ({'true' if file_content else 'false'}) {{
                const blob = new Blob([{json.dumps(file_content or "")}], {{ type: '{file_type}' }});
                formData.append('file', blob, '{file_name}');
            }}

            try {{
                const res = await fetch('/api/public/av-payment-receipt', {{
                    method: 'POST',
                    headers: {{
                        'x-av-order-id': '{order_id}',
                        'x-av-receipt-token': '{token}',
                        'x-av-submission-id': '{submission_id}'
                    }},
                    body: formData
                }});
                const data = await res.json();
                return {{ status: res.status, data }};
            }} catch (e) {{
                return {{ error: e.message }};
            }}
        }}
    """)
    return result

async def main():
    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1280, "height": 1800})
        page = await context.new_page()

        # Abrir página local para garantir origin
        await page.goto("http://localhost:8080")

        # REC08: Token Inválido
        res08 = await run_test_scenario(page, "REC08: Token Inválido", 
            "00000000-0000-0000-0000-000000000000", "invalid_token", "00000000-0000-0000-0000-000000000000")
        print(f"Status: {res08.get('status')}, Error: {res08.get('data', {}).get('error')}")
        
        # REC15: Vazio (sem arquivo)
        res15 = await run_test_scenario(page, "REC15: Payload Vazio", 
            "00000000-0000-0000-0000-000000000000", "dummy", "00000000-0000-0000-0000-000000000000")
        # Nota: REC15 deve falhar na autenticação primeiro se o token for dummy, mas aqui testamos a resposta do handler
        
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
