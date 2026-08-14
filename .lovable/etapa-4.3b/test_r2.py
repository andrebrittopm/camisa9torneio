import asyncio
import json
import os
import hashlib
import uuid
from pathlib import Path
from playwright.async_api import async_playwright

async def run_test(page, name, order_id, token, submission_id, file_content, file_name="test.jpg", file_type="image/jpeg"):
    print(f"--- {name} ---")
    
    result = await page.evaluate(f"""
        async () => {{
            const formData = new FormData();
            const blob = new Blob([new Uint8Array({list(file_content)})], {{ type: '{file_type}' }});
            formData.append('file', blob, '{file_name}');

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

        await page.goto("http://localhost:8080")

        # REC31: Arquivo exatamente 10 MiB
        # Usando um cabeçalho JPEG válido para passar no sniffing
        size_10mib = 10 * 1024 * 1024
        file_10mib = bytearray([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46]) + bytearray([0] * (size_10mib - 10))
        
        # Para testar isso, precisamos de um order_id e token válidos ou um mock.
        # Como o handler valida o HMAC, precisamos de um token real gerado com o secret do env.
        # Mas para o teste REC31 especificamente, se ele passar do check de tamanho e bater no check de Auth, 
        # já prova que o tamanho não bloqueou.
        
        res31 = await run_test(page, "REC31: 10MiB File", "00000000-0000-0000-0000-000000000000", "invalid", str(uuid.uuid4()), file_10mib)
        print(f"REC31 Result: {res31.get('status')} - {res31.get('data', {}).get('error')}")
        # Se retornar 403 (ORDER_ACCESS_DENIED), significa que passou do check de tamanho (que retornaria 413).

        # REC32: Secret ausente antes da RPC
        # Testar o create-order sem o secret (simulado via header se o código permitisse, mas o código usa process.env)
        # Vamos apenas documentar o código real que prova isso.

        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
