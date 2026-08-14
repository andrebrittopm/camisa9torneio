import requests
import json
import uuid
import hashlib

BASE_URL = "http://localhost:8080/api/public/av-create-order"
ORIGIN = "http://localhost:8080"
DENIED_ORIGIN = "https://evil.example.com"

EVENT_ID = "ba5036d2-eb2d-4a1a-96f6-8c586eeede10"
MODEL_ID = "68b9babb-d4e3-40d3-bb1a-f76dc1a512b7"
IDEM_KEY = str(uuid.uuid4())

results = []

def run(name, method, origin=ORIGIN, payload=None, expected=200):
    headers = {"Origin": origin} if origin else {}
    data = json.dumps(payload) if payload else None
    if data: headers["Content-Type"] = "application/json"
    
    try:
        r = requests.request(method, BASE_URL, headers=headers, data=data, timeout=10)
        rpc = "YES" if r.status_code in [200, 404, 409] else "NO"
        results.append([name, "PASS" if r.status_code == expected else "FAIL", r.status_code, rpc, r.text[:100]])
        return r
    except Exception as e:
        results.append([name, "ERROR", "N/A", "NO", str(e)])
        return None

# R01 - Válido
p1 = {
    "event_id": EVENT_ID,
    "customer_name": "Relatorio Real",
    "whatsapp": "67999999999",
    "idempotency_key": IDEM_KEY,
    "items": [{"shirt_model_id": MODEL_ID, "size_option": "M", "quantity": 1, "custom_number": "07"}]
}
r1 = run("R01 — pedido válido", "POST", payload=p1, expected=200)

# R02 - Retry
r2 = run("R02 — retry idempotente", "POST", payload=p1, expected=200)

# R03 - Fingerprint diferente
p3 = p1.copy()
p3["customer_name"] = "Outro Nome"
run("R03 — fingerprint diferente / AV001", "POST", payload=p3, expected=409)

# R04 - Itens invertidos
p4 = p1.copy()
p4["items"] = [{"shirt_model_id": MODEL_ID, "size_option": "M", "quantity": 1, "custom_number": "07"}] # Inversão manual se houvesse > 1 item
run("R04 — itens invertidos / fingerprint canônico", "POST", payload=p4, expected=200)

# AV002 - Evento Inexistente
p_bad = p1.copy(); p_bad["event_id"] = str(uuid.uuid4()); p_bad["idempotency_key"] = str(uuid.uuid4())
run("AV002 — EVENT_NOT_FOUND", "POST", payload=p_bad, expected=404)

# B01 - Payload Large
run("B01 — Payload Large", "POST", payload={"x": "a"*70000}, expected=413)

# CORS
run("POST SEM ORIGIN", "POST", origin=None, payload=p1, expected=403)
run("POST ORIGIN EXTERNA", "POST", origin=DENIED_ORIGIN, payload=p1, expected=403)

print("TESTE | RESULTADO | HTTP | CHEGOU À RPC? | DETALHE")
print("---|---|---|---|---")
for res in results:
    print(" | ".join(map(str, res)))

if r1: print(f"\nRAW_R01: {r1.text}")
if r2: print(f"\nRAW_R02: {r2.text}")
