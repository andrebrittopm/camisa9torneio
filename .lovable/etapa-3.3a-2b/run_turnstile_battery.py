import asyncio
import json
import os
import uuid
from playwright.async_api import async_playwright

API_URL = "http://localhost:8080/api/public/av-create-order"

async def main():
    results = []
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        # Usamos uma página em branco e injetamos o fetch
        page = await browser.new_page()
        await page.goto("http://localhost:8080") # Ir para a mesma origem para evitar problemas de CORS em modo headless estrito

        # TUR01: Token ausente
        print("Running TUR01...")
        payload01 = {
            "event_id": "00000000-0000-0000-0000-000000000000",
            "customer_name": "TUR01",
            "whatsapp": "67999999999",
            "idempotency_key": str(uuid.uuid4()),
            "items": [{"shirt_model_id": "00000000-0000-0000-0000-000000000000", "size_option": "M", "quantity": 1}]
        }
        res01 = await page.evaluate(f"""
            fetch("{API_URL}", {{
                method: "POST",
                headers: {{ "Content-Type": "application/json" }},
                body: JSON.stringify({json.dumps(payload01)})
            }}).then(r => r.json().then(data => ({{ status: r.status, data }})))
        """)
        results.append(("TUR01", res01["status"] == 400 and res01["data"].get("error") == "INVALID_REQUEST", res01["status"], "NÃO", "NÃO", "Token ausente detectado"))

        # TUR02: turnstile_token numérico
        print("Running TUR02...")
        payload02 = dict(payload01, turnstile_token=12345, idempotency_key=str(uuid.uuid4()))
        res02 = await page.evaluate(f"""
            fetch("{API_URL}", {{
                method: "POST",
                headers: {{ "Content-Type": "application/json" }},
                body: JSON.stringify({json.dumps(payload02)})
            }}).then(r => r.json().then(data => ({{ status: r.status, data }})))
        """)
        results.append(("TUR02", res02["status"] == 400, res02["status"], "NÃO", "NÃO", "Token numérico rejeitado"))

        # TUR03: turnstile_token vazio
        print("Running TUR03...")
        payload03 = dict(payload01, turnstile_token="", idempotency_key=str(uuid.uuid4()))
        res03 = await page.evaluate(f"""
            fetch("{API_URL}", {{
                method: "POST",
                headers: {{ "Content-Type": "application/json" }},
                body: JSON.stringify({json.dumps(payload03)})
            }}).then(r => r.json().then(data => ({{ status: r.status, data }})))
        """)
        results.append(("TUR03", res03["status"] == 400, res03["status"], "NÃO", "NÃO", "Token vazio rejeitado"))

        # TUR04: turnstile_token longo
        print("Running TUR04...")
        payload04 = dict(payload01, turnstile_token="a" * 2049, idempotency_key=str(uuid.uuid4()))
        res04 = await page.evaluate(f"""
            fetch("{API_URL}", {{
                method: "POST",
                headers: {{ "Content-Type": "application/json" }},
                body: JSON.stringify({json.dumps(payload04)})
            }}).then(r => r.json().then(data => ({{ status: r.status, data }})))
        """)
        results.append(("TUR04", res04["status"] == 400, res04["status"], "NÃO", "NÃO", "Token > 2048 rejeitado"))

        await browser.close()

    print("\nID | RESULTADO | HTTP | SITEVERIFY? | RPC? | OBSERVAÇÃO")
    print("-" * 85)
    for r in results:
        print(f"{r[0]} | {'PASS' if r[1] else 'FAIL'} | {r[2]} | {r[3]} | {r[4]} | {r[5]}")

if __name__ == "__main__":
    asyncio.run(main())
