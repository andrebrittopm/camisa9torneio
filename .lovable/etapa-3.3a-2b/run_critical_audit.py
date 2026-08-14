import requests
import uuid
import json
import time

API_URL = "http://localhost:8080/api/public/av-create-order"
EVENT_ID = "ba5036d2-eb2d-4a1a-96f6-8c586eeede10"
MODEL_ID = "68b9babb-d4e3-40d3-bb1a-f76dc1a512b7"

# Chaves oficiais de teste da Cloudflare
DUMMY_TOKEN_PASS = "1x00000000000000000000AA"
DUMMY_TOKEN_FAIL = "2x00000000000000000000AB"
DUMMY_TOKEN_SPENT = "3x00000000000000000000AC"

def run_audit():
    headers = {
        "Content-Type": "application/json",
        "Origin": "http://localhost:8080"
    }
    
    results = []

    # TUR06: Fail Token
    print("TUR06: Testing Fail Token...")
    p6 = {
        "event_id": EVENT_ID,
        "customer_name": "TUR06 TEST",
        "whatsapp": "67999999999",
        "idempotency_key": str(uuid.uuid4()),
        "turnstile_token": DUMMY_TOKEN_FAIL,
        "items": [{"shirt_model_id": MODEL_ID, "size_option": "M", "quantity": 1}]
    }
    r6 = requests.post(API_URL, json=p6, headers=headers)
    # Nota: Como estamos em dev sem TURNSTILE_SECRET_KEY real, o siteverify pode falhar com 500/CONFIG_MISSING
    # Mas o esperado é que ele bloqueie o acesso à RPC.
    results.append({
        "id": "TUR06",
        "status": r6.status_code,
        "error": r6.json().get("error"),
        "pass": r6.status_code in [403, 500] # 500 se secret faltar, 403 se falhar real
    })

    # TUR16: Success Flow
    print("TUR16: Testing Success Flow...")
    ik16 = str(uuid.uuid4())
    p16 = {
        "event_id": EVENT_ID,
        "customer_name": "TUR16 TEST",
        "whatsapp": "67999999999",
        "idempotency_key": ik16,
        "turnstile_token": DUMMY_TOKEN_PASS,
        "items": [{"shirt_model_id": MODEL_ID, "size_option": "M", "quantity": 1}]
    }
    r16 = requests.post(API_URL, json=p16, headers=headers)
    res16 = r16.json()
    
    # TUR17: Idempotency Retry
    print("TUR17: Testing Idempotency Retry...")
    p17 = dict(p16, turnstile_token=DUMMY_TOKEN_PASS) # Novo token (simulado), mesma IK
    r17 = requests.post(API_URL, json=p17, headers=headers)
    res17 = r17.json()

    print(json.dumps({
        "TUR16": {"status": r16.status_code, "data": res16},
        "TUR17": {"status": r17.status_code, "data": res17}
    }, indent=2))

if __name__ == "__main__":
    run_audit()
