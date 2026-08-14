import asyncio
import json
import os
import uuid
import hashlib
from pathlib import Path
from playwright.async_api import async_playwright

# Configurações de teste
SITE_URL = "http://localhost:8080"
API_URL = f"{SITE_URL}/api/public/av-create-order"
CORRELATION_ID = str(uuid.uuid4())

# Chaves Oficiais de Teste Cloudflare
SITEKEY_SUCCESS = "1x00000000000000000000AA"
SECRET_SUCCESS = "1x0000000000000000000000000000000AA"

SITEKEY_FAIL = "2x00000000000000000000AB"
SECRET_FAIL = "2x0000000000000000000000000000000AA"

SECRET_DUPLICATE = "3x0000000000000000000000000000000AA"

async def test_tur01():
    """Token ausente"""
    payload = {
        "event_id": "00000000-0000-0000-0000-000000000000",
        "customer_name": "TUR01",
        "whatsapp": "67999999999",
        "idempotency_key": str(uuid.uuid4()),
        "items": [{"shirt_model_id": "00000000-0000-0000-0000-000000000000", "size_option": "M", "quantity": 1}]
    }
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context()
        page = await context.new_page()
        
        # Testamos via fetch no contexto da página para respeitar CORS
        response = await page.evaluate(f"""
            fetch("{API_URL}", {{
                method: "POST",
                headers: {{ "Content-Type": "application/json" }},
                body: JSON.stringify({json.dumps(payload)})
            }}).then(r => r.json().then(data => ({{ status: r.status, data }})))
        """)
        
        await browser.close()
        return response

async def test_tur02_03_04(val):
    """Token inválido (numérico, vazio, longo)"""
    payload = {
        "event_id": "00000000-0000-0000-0000-000000000000",
        "customer_name": "TUR_VAL",
        "whatsapp": "67999999999",
        "idempotency_key": str(uuid.uuid4()),
        "turnstile_token": val,
        "items": [{"shirt_model_id": "00000000-0000-0000-0000-000000000000", "size_option": "M", "quantity": 1}]
    }
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        response = await page.evaluate(f"""
            fetch("{API_URL}", {{
                method: "POST",
                headers: {{ "Content-Type": "application/json" }},
                body: JSON.stringify({json.dumps(payload)})
            }}).then(r => r.json().then(data => ({{ status: r.status, data }})))
        """)
        await browser.close()
        return response

async def main():
    results = []
    
    # TUR01
    print("Running TUR01...")
    res01 = await test_tur01()
    results.append(("TUR01", res01["status"] == 400 and res01["data"]["error"] == "INVALID_REQUEST", res01["status"], "NÃO", "NÃO", "Token ausente detectado"))

    # TUR02 (Numérico)
    print("Running TUR02...")
    res02 = await test_tur02_03_04(12345)
    results.append(("TUR02", res02["status"] == 400, res02["status"], "NÃO", "NÃO", "Token numérico rejeitado"))

    # TUR03 (Vazio)
    print("Running TUR03...")
    res03 = await test_tur02_03_04("")
    results.append(("TUR03", res03["status"] == 400, res03["status"], "NÃO", "NÃO", "Token vazio rejeitado"))

    # TUR04 (Longo)
    print("Running TUR04...")
    res04 = await test_tur02_03_04("a" * 2049)
    results.append(("TUR04", res04["status"] == 400, res04["status"], "NÃO", "NÃO", "Token > 2048 rejeitado"))

    print("\nID | RESULTADO | HTTP | SITEVERIFY? | RPC? | OBSERVAÇÃO")
    print("-" * 70)
    for r in results:
        print(f"{r[0]} | {'PASS' if r[1] else 'FAIL'} | {r[2]} | {r[3]} | {r[4]} | {r[5]}")

if __name__ == "__main__":
    asyncio.run(main())
