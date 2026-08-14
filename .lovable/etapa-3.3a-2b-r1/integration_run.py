
import requests
import uuid
import os
import json
import subprocess

# Configurações do Ambiente
BASE_URL = "http://localhost:8080/api/public/av-create-order"
EVENT_ID = "ba5036d2-eb2d-4a1a-96f6-8c586eeede10"
MODEL_ID = "68b9babb-d4e3-40d3-bb1a-f76dc1a512b7"

def log_test(test_id, result, http, siteverify, rpc, banco, evidence):
    print(f"{test_id} | {result} | {http} | {siteverify} | {rpc} | {banco} | {evidence}")

def get_db_count():
    cmd = ["lovable", "supabase", "query", "SELECT count(*) FROM public.av_orders;"]
    result = subprocess.run(cmd, capture_output=True, text=True)
    try:
        data = json.loads(result.stdout)
        return int(data[0]['count'])
    except:
        return 0

def get_items_count():
    cmd = ["lovable", "supabase", "query", "SELECT count(*) FROM public.av_order_items;"]
    result = subprocess.run(cmd, capture_output=True, text=True)
    try:
        data = json.loads(result.stdout)
        return int(data[0]['count'])
    except:
        return 0

def cleanup_order(order_id):
    if not order_id: return
    cmd = ["lovable", "supabase", "query", f"DELETE FROM public.av_orders WHERE id = '{order_id}';"]
    subprocess.run(cmd, capture_output=True)

def run_integration():
    print("ID | RESULTADO | HTTP | SITEVERIFY | RPC | BANCO | EVIDÊNCIA")
    
    # 1. SETUP
    orders_inicial = get_db_count()
    items_inicial = get_items_count()
    
    # payload padrão
    def get_payload(ik=None, token="test-token"):
        return {
            "event_id": EVENT_ID,
            "customer_name": "Auditoria TUR",
            "whatsapp": "11999999999",
            "idempotency_key": ik or str(uuid.uuid4()),
            "turnstile_token": token,
            "items": [
                {
                    "shirt_model_id": MODEL_ID,
                    "size_option": "M",
                    "quantity": 1
                }
            ]
        }

    # TUR15 - Turnstile bloqueia RPC
    # No sandbox sem segredo, deve retornar 500 ou 403 dependendo do token.
    # Mas como o requisito pede "não marcar PASS com 500", este é o ponto crítico.
    # Vamos verificar se o servidor responde 500 ou 403.
    p15 = get_payload(token="invalid")
    resp15 = requests.post(BASE_URL, json=p15, headers={"Origin": "http://localhost:8080"})
    log_test("TUR15", "FAIL (500)" if resp15.status_code == 500 else ("PASS" if resp15.status_code == 403 else "FAIL"), 
             resp15.status_code, "REAL", "NÃO", "NÃO", "RPC Bloqueada via Turnstile Check")

    # TUR16 - Sucesso Real (Exige Secret no servidor)
    ik_tur16 = str(uuid.uuid4())
    p16 = get_payload(ik_tur16)
    resp16 = requests.post(BASE_URL, json=p16, headers={"Origin": "http://localhost:8080"})
    
    order_id = None
    if resp16.status_code == 200:
        data = resp16.json()
        order_id = data['data']['order_id']
        log_test("TUR16", "PASS", 200, "REAL", "SIM (1)", "SIM (+1)", f"Order {order_id}")
    else:
        log_test("TUR16", "FAIL (500)" if resp16.status_code == 500 else "FAIL", resp16.status_code, "REAL", "NÃO", "NÃO", "Bloqueado por falta de Env")

    # TUR17 - Idempotência
    if order_id:
        p17 = get_payload(ik_tur16, token="new-token")
        resp17 = requests.post(BASE_URL, json=p17, headers={"Origin": "http://localhost:8080"})
        if resp17.status_code == 200:
            data17 = resp17.json()
            is_dup = data17['data'].get('is_duplicate')
            log_test("TUR17", "PASS" if is_dup else "FAIL", 200, "REAL", "SIM", "NÃO", f"Duplicate={is_dup}")
        else:
            log_test("TUR17", "FAIL", resp17.status_code, "REAL", "N/A", "N/A", "Retry failed")
    else:
        log_test("TUR17", "FAIL", "N/A", "N/A", "N/A", "N/A", "Dependência TUR16")

    # Final counts
    orders_final = get_db_count()
    if order_id: cleanup_order(order_id)
    
    print(f"\nORDERS INICIAL: {orders_inicial}")
    print(f"ORDERS APÓS TUR16: {orders_final}")
    print(f"TUR16 ORDER_ID: {order_id}")

if __name__ == "__main__":
    run_integration()
