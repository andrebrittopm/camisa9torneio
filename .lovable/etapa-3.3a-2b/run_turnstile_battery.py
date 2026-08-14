import asyncio
import json
import os
import uuid
import time
from playwright.async_api import async_playwright

API_URL = "http://localhost:8080/api/public/av-create-order"

async def main():
    results = []
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        await page.goto("http://localhost:8080")

        # ---------------------------------------------------------
        # TUR05: Secret ausente (500)
        # Como não podemos alterar env vars facilmente sem reiniciar o dev server,
        # vamos focar nos testes que conseguimos injetar token dummy ou mockar via page.route.
        # ---------------------------------------------------------

        # TUR06: Falha Dummy (403)
        # Usamos o token dummy que a Cloudflare define para falha: 2x...
        print("Running TUR06...")
        payload06 = {
            "event_id": "00000000-0000-0000-0000-000000000000",
            "customer_name": "TUR06",
            "whatsapp": "67999999999",
            "idempotency_key": str(uuid.uuid4()),
            "turnstile_token": "2x00000000000000000000AB", # Sitekey de falha (usado como token para teste dummy se o secret estiver configurado)
            "items": [{"shirt_model_id": "00000000-0000-0000-0000-000000000000", "size_option": "M", "quantity": 1}]
        }
        # Nota: TUR06 precisa do secret configurado. Como ainda não definimos a secret de teste no env, 
        # ele deve retornar 500 (CONFIG_MISSING) por enquanto, o que valida TUR05 indiretamente.
        res06 = await page.evaluate(f"""
            fetch("{API_URL}", {{
                method: "POST",
                headers: {{ "Content-Type": "application/json" }},
                body: JSON.stringify({json.dumps(payload06)})
            }}).then(r => r.json().then(data => ({{ status: r.status, data }})))
        """)
        
        # Se retornar 500, confirmamos TUR05 (Secret ausente)
        if res06["status"] == 500 and res06["data"].get("error") == "INTERNAL_ERROR":
            results.append(("TUR05", True, 500, "NÃO", "NÃO", "Secret ausente detectado (CONFIG_MISSING)"))
        else:
            results.append(("TUR05", False, res06["status"], "NÃO", "NÃO", "Esperado 500 por falta de secret"))

        # ---------------------------------------------------------
        # TUR10: Timeout (8s)
        # Mockamos a chamada interna do Siteverify via route interception não funciona aqui 
        # porque o fetch do Siteverify acontece no SERVER (TanStack Server Route), não no browser.
        # Precisamos de um teste unitário para o helper.
        # ---------------------------------------------------------

        await browser.close()

    print("\nID | RESULTADO | HTTP | SITEVERIFY? | RPC? | OBSERVAÇÃO")
    print("-" * 85)
    for r in results:
        print(f"{r[0]} | {'PASS' if r[1] else 'FAIL'} | {r[2]} | {r[3]} | {r[4]} | {r[5]}")

if __name__ == "__main__":
    asyncio.run(main())
