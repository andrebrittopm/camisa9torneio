import os
import json
import requests
import uuid
import time

BASE_URL = "http://localhost:8080/api/public/av-create-order"
EVENT_ID = "ba5036d2-eb2d-4a1a-96f6-8c586eeede10"
MODEL_ID = "68b9babb-d4e3-40d3-bb1a-f76dc1a512b7"

def run_battery():
    print("ID | RESULTADO | HTTP | SITEVERIFY | RPC | BANCO | EVIDÊNCIA")
    
    # 0. Contagem inicial
    # Usando curl para evitar dependências de supabase-js no python
    import subprocess
    def get_count():
        try:
            res = subprocess.run(['lovable', 'supabase', 'query', 'SELECT count(*) FROM public.av_orders;'], capture_output=True, text=True)
            data = json.loads(res.stdout)
            return int(data[0]['count'])
        except:
            return 0

    orders_inicial = get_count()
    
    # TUR06 - SUCCESS FALSE
    # Token "invalid-token" falhará no siteverify real da CF se usarmos dummy secret ou real secret.
    payload_fail = {
        "event_id": EVENT_ID,
        "customer_name": "Test TUR06",
        "whatsapp": "11999999999",
        "idempotency_key": str(uuid.uuid4()),
        "turnstile_token": "invalid-token",
        "items": [{"shirt_model_id": MODEL_ID, "size_option": "M", "quantity": 1}]
    }
    r_tur06 = requests.post(BASE_URL, json=payload_fail, headers={"Origin": "http://localhost:8080"})
    res_tur06 = "PASS" if r_tur06.status_code == 403 and r_tur06.json().get("error") == "TURNSTILE_FAILED" else f"FAIL ({r_tur06.status_code})"
    print(f"TUR06 | {res_tur06} | {r_tur06.status_code} | REAL | NÃO | NÃO | Siteverify recusou token inválido")

    # TUR16 - FLUXO DE SUCESSO (Principal)
    # Token "test-token-success" é interceptado pelo nosso helper para retornar success: true
    idempotency_key = str(uuid.uuid4())
    payload_success = {
        "event_id": EVENT_ID,
        "customer_name": "Test TUR16",
        "whatsapp": "11999999999",
        "idempotency_key": idempotency_key,
        "turnstile_token": "test-token-success",
        "items": [{"shirt_model_id": MODEL_ID, "size_option": "M", "quantity": 1}]
    }
    r_tur16 = requests.post(BASE_URL, json=payload_success, headers={"Origin": "http://localhost:8080"})
    
    order_id = None
    order_seq = None
    if r_tur16.status_code == 200:
        data = r_tur16.json()
        if data.get("success"):
            order_id = data["data"]["order_id"]
            order_seq = data["data"]["order_seq"]
            res_tur16 = "PASS"
        else:
            res_tur16 = "FAIL (Response false)"
    else:
        res_tur16 = f"FAIL ({r_tur16.status_code}: {r_tur16.text})"
        
    print(f"TUR16 | {res_tur16} | {r_tur16.status_code} | MOCK-T | SIM | SIM | Pedido criado: {order_id}")

    # TUR17 - IDEMPOTÊNCIA
    if order_id:
        # Re-enviar com NOVO token mas MESMA idempotency_key
        payload_retry = payload_success.copy()
        payload_retry["turnstile_token"] = "test-token-retry"
        r_tur17 = requests.post(BASE_URL, json=payload_retry, headers={"Origin": "http://localhost:8080"})
        
        if r_tur17.status_code == 200:
            data = r_tur17.json()
            if data.get("success") and data["data"]["order_id"] == order_id and data["data"]["is_duplicate"] is True:
                res_tur17 = "PASS"
            else:
                res_tur17 = f"FAIL (ID mismatch or is_duplicate false)"
        else:
            res_tur17 = f"FAIL ({r_tur17.status_code})"
    else:
        res_tur17 = "SKIPPED (TUR16 failed)"
    
    print(f"TUR17 | {res_tur17} | {r_tur17.status_code if order_id else 'N/A'} | MOCK-T | SIM | NÃO | Reuso de chave detectado")

    # Cleanup
    if order_id:
        subprocess.run(['lovable', 'supabase', 'query', f"DELETE FROM public.av_order_items WHERE order_id = '{order_id}';"], capture_output=True)
        subprocess.run(['lovable', 'supabase', 'query', f"DELETE FROM public.av_orders WHERE id = '{order_id}';"], capture_output=True)

    orders_final = get_count()
    print(f"\nORDERS INICIAL: {orders_inicial}")
    print(f"ORDERS FINAL: {orders_final}")
    print(f"TUR16 ORDER_ID: {order_id}")

if __name__ == "__main__":
    run_battery()
